import { EmbedBuilder } from 'discord.js'

import { getDominantColor } from '../utils/colorThief'
import { formatter } from '../utils/formatter'

/**
 * Fetches the URL of a user's avatar, considering if they have a custom avatar in the guild.
 * @param {Object} guild - The guild object.
 * @param {Object} user - The user object.
 * @returns {Promise<string|null>} The URL of the user's avatar or null if an error occurs.
 */
async function getUserAvatar(guild, user) {
	if (!guild || !user) {
		console.error('Missing required parameters.')
		return null
	}

	try {
		const response = await fetch(
			`https://discord.com/api/guilds/${guild.id}/members/${user.id}`,
			{
				headers: {
					Authorization: `Bot ${process.env.BOT_TOKEN}`,
				},
			}
		)

		if (!response.ok) {
			throw new Error(`Failed to fetch member data: ${response.statusText}`)
		}

		const data = await response.json()
		let url = user
			.displayAvatarURL({ dynamic: true, size: 4096 })
			.replace('webp', 'png')

		if (data.avatar) {
			url = `https://cdn.discordapp.com/guilds/${guild.id}/users/${user.id}/avatars/${data.avatar}.png?size=4096`
		}

		return url
	} catch (error) {
		console.error(`Error fetching user avatar: ${error.message}`)
		return null
	}
}

/**
 * Creates an embed with XP information for a user.
 * @param {Object} guild - The guild object.
 * @param {Object} user - The user object.
 * @param {number} xp - The user's XP.
 * @param {number} level - The user's level.
 * @param {number} xpNeededForNextLevel - The XP needed for the next level.
 * @param {number|null} globalRank - The user's global rank.
 * @param {number|null} serverRank - The user's server rank.
 * @returns {Promise<EmbedBuilder>} The embed with the user's XP information.
 */
async function createXpEmbed(
	guild,
	user,
	xp,
	level,
	xpNeededForNextLevel,
	globalRank,
	serverRank
) {
	let avatarUrl = await getUserAvatar(guild, user)

	if (!avatarUrl) {
		avatarUrl = user
			.displayAvatarURL({ dynamic: true, size: 4096 })
			.replace('webp', 'png')
	}

	const dominantColor = await getDominantColor(avatarUrl)

	return new EmbedBuilder()
		.setThumbnail(avatarUrl)
		.setColor(dominantColor) // Set your preferred color
		.setTitle(`${user.displayName}'s XP Information`) // Set the title of the embed
		.addFields(
			{
				name: '⭐️ LV.',
				value: `\`\`\`${formatter.format(level)}\`\`\``,
				inline: true,
			},
			{
				name: '✨ XP',
				value: `\`\`\`${formatter.format(xp)}\`\`\``,
				inline: true,
			},
			{
				name: '🎯 XP for LV-UP',
				value: `\`\`\`${formatter.format(xpNeededForNextLevel)}\`\`\``,
				inline: true,
			},
			{
				name: '🌐 Global Ranking',
				value: `\`\`\`${
					globalRank !== null ? `#${formatter.format(globalRank)}` : 'idk man'
				}\`\`\``,
				inline: true,
			},
			{
				name: '🏠 Server Ranking',
				value: `\`\`\`${
					serverRank !== null ? `#${formatter.format(serverRank)}` : 'idk man'
				}\`\`\``,
				inline: true,
			}
		)
}

export { createXpEmbed }
