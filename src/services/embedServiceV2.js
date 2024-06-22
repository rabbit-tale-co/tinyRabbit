import { EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { getDominantColor } from '../utils/colorThief'
import { formatter } from '../utils/formatter'
import path from 'node:path'

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
 * Creates a universal embed with optional description, thumbnail, and main image.
 * @param {Object} options - The options for the embed.
 * @param {string} options.title - The title of the embed.
 * @param {Array} [options.fields] - The fields of the embed.
 * @param {string} options.color - The color of the embed.
 * @param {string} [options.thumbnailUrl] - The URL of the thumbnail image.
 * @param {string} [options.imagePath] - The path to the main image to attach.
 * @returns {Promise<{ embed: EmbedBuilder, attachment?: AttachmentBuilder }>} The generated embed and optional attachment.
 */
async function createUniversalEmbed({
	title,
	description = '',
	fields = [],
	color,
	thumbnailUrl,
	imagePath,
}) {
	const embed = new EmbedBuilder().setTitle(title).setColor(color)

	if (description) {
		embed.setDescription(description)
	}

	if (fields.length > 0) {
		embed.addFields(fields)
	}

	if (thumbnailUrl) {
		embed.setThumbnail(thumbnailUrl)
	}

	let attachment
	if (imagePath) {
		attachment = new AttachmentBuilder(imagePath)
		embed.setImage(`attachment://${path.basename(imagePath)}`)
	}

	return { embed, attachment }
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

	const fields = [
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
		},
	]

	// const embedOptions = {
	//    title: `${user.displayName}'s XP Information`,
	//    fields,
	//    color: dominantColor,
	//    thumbnailUrl: avatarUrl,
	// }

	return new EmbedBuilder()
		.setColor(dominantColor)
		.setTitle(`${user.displayName}'s XP Information`)
		.addFields(fields)
		.setThumbnail(avatarUrl)
}

/**
 * Creates a custom welcome message embed.
 * @param {Object} member - The member that joined.
 * @param {Object} embedConfig - The embed configuration.
 * @returns {Promise<{ embed: EmbedBuilder, attachment?: AttachmentBuilder }>} The generated embed and optional attachment.
 */
async function createWelcomeEmbed(member, embedConfig) {
	const guild = member.guild
	const user = member.user

	const avatarUrl = user
		.displayAvatarURL({ dynamic: true, size: 4096 })
		.replace('webp', 'png')
	const dominantColor = await getDominantColor(avatarUrl)

	const embed = new EmbedBuilder()
		.setTitle(
			embedConfig.title
				.replace('{server}', guild.name)
				.replace('{user}', user.username)
		)
		.setDescription(embedConfig.description)
		.setColor(dominantColor)
		.setThumbnail(avatarUrl)
		.addFields(embedConfig.fields)
		.setFooter({ text: embedConfig.footer })

	let attachment = null
	if (embedConfig.imagePath) {
		attachment = new AttachmentBuilder(embedConfig.imagePath)
		embed.setImage(embedConfig.imagePath)
	}

	return { embed, attachment }
}

export { createXpEmbed, createWelcomeEmbed }
