import { PermissionFlagsBits } from 'discord.js'
import { formatter } from '../utils/formatter.js'

import { calculateXpForNextLevel, updateUserXpAndLevel } from '../utils/xpUtils'

import { createXpEmbed } from '../services/embedServiceV2.js'
import { updateMemberRoles } from '../services/roleService'

import { addUserOrUpdate, getUser } from '../api/user'
import { getGlobalRank, getServerRank } from '../api/userRank'

/**
 * Handles the setxp command to set XP for a user.
 * @param {Object} interaction - The interaction object.
 */
async function handleSetXpCommand(interaction) {
	if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
		return await interaction.reply({
			content: 'You do not have permission to use this command.',
			ephemeral: true,
		})
	}

	await interaction.deferReply()

	const targetUser = interaction.options.getUser('user')
	const amount = interaction.options.getInteger('amount')
	const level = interaction.options.getInteger('level')

	try {
		let data = await getUser(interaction.guild.id, targetUser.id).catch(
			(error) => {
				console.error('Error fetching experience:', error)
				return null
			}
		)

		if (!data) data = { xp: 0, level: 0 }

		const originalData = { ...data }
		const updatedData = { ...data }

		if (level !== null) updatedData.level = level

		const finalData = updateUserXpAndLevel(
			updatedData,
			amount,
			true,
			originalData
		)
		await addUserOrUpdate(interaction.guild.id, targetUser.id, finalData)
		await updateMemberRoles(interaction.guild, targetUser.id, finalData)

		await interaction.editReply(
			`Successfully set ${amount} XP and ${
				level !== null ? `level ${level}` : 'unchanged level'
			} for user ${targetUser.tag}.`
		)
	} catch (error) {
		console.error('Error setting XP:', error)
		await interaction.editReply({
			content: 'There was an error setting XP for the user.',
			ephemeral: true,
		})
	}
}

/**
 * Handles the xp command to display XP for a user.
 * @param {Object} interaction - The interaction object.
 */
async function handleXpCommand(interaction) {
	await interaction.deferReply()
	const targetUser = interaction.options.getUser('user') || interaction.user
	const targetGuild = interaction.guild

	const data = await getUser(interaction.guild.id, targetUser.id).catch(
		(error) => {
			console.error('Error fetching points:', error)
			return null
		}
	)

	if (!data) return await interaction.editReply('This user has no XP data.')

	const userExperience = data.xp
	const userLevel = data.level
	const xpForNextLevel = calculateXpForNextLevel(userLevel)
	const xpNeededForNextLevel = xpForNextLevel - userExperience

	const globalRank = await getGlobalRank(targetUser.id)
	// fetch(`localhost:5000/api/user-rank?&${targetUser.id}`) //getGlobalRank(targetUser.id)
	const serverRank = await getServerRank(targetUser.id, targetGuild.id)
	// fetch(`localhost:5000/api/user-rank?&${targetUser.id}&${targetGuild.id}`) //getServerRank(targetUser.id, targetGuild.id)

	const xpEmbed = await createXpEmbed(
		targetGuild,
		targetUser,
		userExperience,
		userLevel,
		xpNeededForNextLevel,
		globalRank,
		serverRank
	)

	try {
		await interaction.editReply({
			content: `User ${targetUser.username} has ${formatter.format(
				userExperience
			)} XP and is level ${formatter.format(
				userLevel
			)}. They need ${formatter.format(
				xpNeededForNextLevel
			)} more XP to level up.`,
			embeds: [xpEmbed],
		})
	} catch (error) {
		console.error('Error generating image or editing reply:', error)
		await interaction.editReply(
			'An error occurred while generating the ranking image.'
		)
	}
}

export { handleXpCommand, handleSetXpCommand }
