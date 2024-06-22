import { getServerConfig } from '../api/config'

/**
 * Update the member's roles based on their new level.
 * @param {Object} guild - The guild where the role update is happening.
 * @param {string} userId - The ID of the user whose roles are being updated.
 * @param {Object} userData - The user data including points, level, levelUp, and levelDown flags.
 */
async function updateMemberRoles(guild, userId, userData) {
	const config = await getServerConfig(guild.id)
	if (!config) {
		console.error(`No config found for guild ${guild.id}`)
		return
	}

	if (!config.roleMappings) {
		console.error(`No role mappings found in config for guild ${guild.id}`)
		return
	}

	const roleMappings = config.roleMappings
	let member

	try {
		member = await guild.members.fetch(userId)
	} catch (error) {
		console.error(
			`Error fetching member ${userId} in guild ${guild.id}:`,
			error
		)
		return
	}

	const hasRequiredRole = Object.values(roleMappings).some((roleId) =>
		member.roles.cache.has(roleId)
	)

	if (!hasRequiredRole) return

	const newRoleId = Object.keys(roleMappings)
		.reverse()
		.find((level) => userData.level >= level)

	if (!newRoleId) return

	const newRole = roleMappings[newRoleId]
	const newRoleObject = guild.roles.cache.get(newRole)

	if (!newRoleObject) {
		console.error(`Role with ID ${newRole} not found in guild ${guild.id}`)
		return
	}

	const currentRoles = member.roles.cache
	const hasNewRole = currentRoles.has(newRole)

	if (hasNewRole) return

	try {
		const rolesToRemove = Object.values(roleMappings)
		await member.roles.remove(rolesToRemove)

		if (newRole) await member.roles.add(newRole)
	} catch (error) {
		console.error(
			`Error updating roles for member ${userId} in guild ${guild.id}:`,
			error
		)
		return
	}

	if (
		(userData.levelUp || userData.levelDown) &&
		config.levelUpNotificationChannelId
	) {
		try {
			const channel = await guild.channels.fetch(
				config.levelUpNotificationChannelId
			)
			if (!channel) return

			//console.log(`Sending level-up message to channel ${config.levelUpNotificationChannelId} for user ${userId}`)
			const newRoleObject = guild.roles.cache.get(newRole)

			if (!newRoleObject) {
				console.error(`Role with ID ${newRole} not found in guild ${guild.id}`)
				return
			}

			await channel.send(
				`⭐️ <@${userId}>, you've ${
					userData.levelUp ? 'leveled up' : 'leveled down'
				} to level ${userData.level} and have been awarded the role \`${
					newRoleObject.name
				}\`! 🎉`
			)
		} catch (error) {
			console.error(
				`Error fetching or sending message to channel ${config.levelUpNotificationChannelId} in guild ${guild.id}:`,
				error
			)
		}
	}
}

export { updateMemberRoles }
