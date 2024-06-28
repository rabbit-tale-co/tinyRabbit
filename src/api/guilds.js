async function getCustomInvite(guildId) {
	try {
		const response = await fetch(
			`https://discord.com/api/guilds/${guildId}/invites`,
			{
				headers: {
					Authorization: `Bot ${process.env.BOT_TOKEN}`,
				},
			},
		)

		if (!response.ok) {
			console.error(`Failed to fetch invites for guild ${guildId}`)
			return null
		}

		const invites = await response.json()
		return invites.length > 0 ? invites[0].code : null
	} catch (error) {
		console.error('Error fetching custom invites:', error)
		return null
	}
}

async function getBotGuilds() {
	try {
		const response = await fetch('https://discord.com/api/users/@me/guilds', {
			headers: {
				Authorization: `Bot ${process.env.BOT_TOKEN}`,
			},
		})

		if (!response.ok) {
			throw new Error('Failed to fetch guilds')
		}

		const guilds = await response.json()

		// Fetch detailed information for each guild
		const detailedGuilds = await Promise.all(
			guilds.map(async (guild) => {
				const guildResponse = await fetch(
					`https://discord.com/api/guilds/${guild.id}?with_counts=true`,
					{
						headers: {
							Authorization: `Bot ${process.env.BOT_TOKEN}`,
						},
					},
				)

				if (!guildResponse.ok) {
					console.error(`Failed to fetch details for guild ${guild.id}`)
					return guild
				}

				const guildDetails = await guildResponse.json()

				let inviteLink = ''
				if (guildDetails.features.includes('COMMUNITY')) {
					const inviteCode = await getCustomInvite(guild.id)
					inviteLink = inviteCode ? `https://discord.gg/${inviteCode}` : ''
				}

				return {
					...guild,
					memberCount: guildDetails.approximate_member_count,
					isVerified: guildDetails.features.includes('VERIFIED'),
					inviteLink: inviteLink,
				}
			}),
		)

		return detailedGuilds
	} catch (error) {
		console.error('Error fetching bot guilds:', error)
		throw error
	}
}

async function getGuildDetails(guildId) {
	const response = await fetch(
		`https://discord.com/api/guilds/${guildId}?with_counts=true`,
		{
			headers: {
				Authorization: `Bot ${process.env.BOT_TOKEN}`,
			},
		},
	)

	if (!response.ok) {
		throw new Error(`Failed to fetch guild details: ${response.statusText}`)
	}

	const guildDetails = await response.json()

	// Fetch channels to count categories, text channels, and voice channels
	const channelsResponse = await fetch(
		`https://discord.com/api/guilds/${guildId}/channels`,
		{
			headers: {
				Authorization: `Bot ${process.env.BOT_TOKEN}`,
			},
		},
	)

	if (!channelsResponse.ok) {
		throw new Error(`Failed to fetch channels: ${channelsResponse.statusText}`)
	}

	let channels = await channelsResponse.json()
	const categoryCount = channels.filter((channel) => channel.type === 4).length
	const textChannelCount = channels.filter(
		(channel) => channel.type === 0,
	).length
	const voiceChannelCount = channels.filter(
		(channel) => channel.type === 2,
	).length

	channels = channels.filter(
		(channel) => channel.type === 0 || channel.type === 2,
	)

	// Fetch roles
	const rolesResponse = await fetch(
		`https://discord.com/api/guilds/${guildId}/roles`,
		{
			headers: {
				Authorization: `Bot ${process.env.BOT_TOKEN}`,
			},
		},
	)

	if (!rolesResponse.ok) {
		throw new Error(`Failed to fetch roles: ${rolesResponse.statusText}`)
	}

	let roles = await rolesResponse.json()
	roles = roles.filter((role) => !role.managed && role.id !== guildId)

	return {
		guildDetails,
		categoryCount,
		textChannelCount,
		voiceChannelCount,
		roles,
		channels,
	}
}

async function checkBotMembership(guildId) {
	try {
		const response = await fetch(`https://discord.com/api/guilds/${guildId}`, {
			headers: {
				Authorization: `Bot ${process.env.BOT_TOKEN}`,
			},
		})

		if (response.status === 200) return true

		if (
			response.status === 401 ||
			response.status === 403 ||
			response.status === 404
		)
			return false

		console.error(`Unexpected status code: ${response.status}`)
		return false
	} catch (error) {
		console.error('Error checking bot membership:', error)
		return false
	}
}

export { getGuildDetails, checkBotMembership, getBotGuilds }
