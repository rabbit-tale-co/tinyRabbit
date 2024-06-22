import { PermissionFlagsBits } from 'discord.js'

import { getServerConfig, setServerConfig } from '../api/config'

/**
 * Handles the getconfig command to get the current server configuration.
 * @param {Object} interaction - The interaction object.
 */
async function handleGetConfigCommand(interaction) {
	const serverId = interaction.guild.id
	const config = await getServerConfig(serverId)

	config
		? await interaction.reply(
				`Server Configuration:\n${JSON.stringify(config, null, 2)}`
			)
		: await interaction.reply('No configuration found for this server.')
}

/**
 * Processes the configuration message content and updates the role mappings and config object.
 * @param {string} content - The message content containing the configuration.
 * @param {Object} newRoleMappings - The object to store new role mappings.
 * @param {Array} configMessages - The array to store configuration messages.
 * @param {Object} config - The configuration object to update.
 * @returns {Object} The result of processing the configuration message.
 */
function processMessageConfig(
	content,
	newRoleMappings,
	configMessages,
	config
) {
	const lines = content.split('\n')
	let hasValidConfig = false

	for (let line of lines) {
		line = line.trim()
		if (line === '') continue

		if (line.startsWith('- lvl:')) {
			const levelPartMatch = line.match(/- lvl:\s*(\d+)/)
			const rolePartMatch = line.match(/role:\s*<@&(\d+)>/)

			if (!levelPartMatch || !rolePartMatch)
				return {
					success: false,
					message: 'Error: invalid role mapping format',
				}

			const level = levelPartMatch[1]
			const roleId = rolePartMatch[1]

			if (!level || !roleId)
				return {
					success: false,
					message: `Error processing role mapping: level ${level}, role ${roleId}`,
				}

			newRoleMappings[level] = roleId
			configMessages.push(`Level ${level} -> Role ${roleId}`)
			hasValidConfig = true
		} else if (line.startsWith('- channel_id:')) {
			const channelIdMatch = line.match(/- channel_id:\s*<#(\d+)>/)

			if (!channelIdMatch)
				return {
					success: false,
					message: 'Error: invalid channel ID format',
				}

			const channelId = channelIdMatch[1]

			if (!channelId)
				return {
					success: false,
					message: `Error processing channel ID: ${channelId}`,
				}

			config.levelUpNotificationChannelId = channelId
			hasValidConfig = true
		} else if (line.startsWith('- default_role:')) {
			const roleMatch = line.match(/- default_role:\s*<@&(\d+)>/)

			if (!roleMatch)
				return { success: false, message: 'Error: invalid role format' }

			const roleId = roleMatch[1]

			if (!roleId) {
				return {
					success: false,
					message: `Error processing default role: ${roleId}`,
				}
			}

			config.defaultRoleId = roleId
			hasValidConfig = true
		} else if (line.startsWith('- welcome_message:')) {
			const messageMatch = line.match(/- welcome_message:\s*(.*)/)

			if (!messageMatch) {
				return {
					success: false,
					message: 'Error: invalid welcome message format',
				}
			}

			config.welcomeMessage = messageMatch[1].trim()
			hasValidConfig = true
		} else if (line.startsWith('- leave_message:')) {
			const messageMatch = line.match(/- leave_message:\s*(.*)/)

			if (!messageMatch) {
				return {
					success: false,
					message: 'Error: invalid leave message format',
				}
			}

			config.leaveMessage = messageMatch[1].trim()
			hasValidConfig = true
		} else {
			return { success: false, message: 'Error: invalid line format' }
		}
	}

	return { success: hasValidConfig }
}

/**
 * Handles the setconfig command to set the server configuration.
 * @param {Object} interaction - The interaction object.
 */
async function handleSetConfigCommand(interaction) {
	if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
		return await interaction.reply({
			content: 'You do not have permission to use this command.',
			ephemeral: true,
		})

	const start = interaction.options.getString('start')

	if (start.toLowerCase() !== 'start')
		return await interaction.reply({
			content: 'Invalid command. Type "start" to begin configuration.',
			ephemeral: true,
		})

	await interaction.reply(
		'Configuration started. Please enter the levels and roles in the format + channel ID if needed. ```- lvl: 0 role: @role,\n- lvl: 5 role: @role,\n\n- channel_id: #channel```\n\nLegend: ✅ = Success, ❌ = Error.'
	)

	const filter = (response) => response.author.id === interaction.user.id
	const collector = interaction.channel.createMessageCollector({
		filter,
		time: 60000,
	})

	const newRoleMappings = {}
	const configMessages = []
	const config = {}

	let hasValidConfig = false
	let isCollectorStopped = false

	collector.on('collect', async (message) => {
		if (isCollectorStopped) return

		const result = processMessageConfig(
			message.content,
			newRoleMappings,
			configMessages,
			config
		)

		if (!result.success) {
			await message.react('❌')
			await interaction.followUp({
				content: result.message || 'An unknown error occurred.',
				ephemeral: true,
			})
			isCollectorStopped = true
			collector.stop()
			return
		}

		if (result.success) {
			hasValidConfig = true
			await message.react('✅')
			isCollectorStopped = true
			collector.stop()
		}
	})

	collector.on('end', async () => {
		if (!hasValidConfig)
			return await interaction.followUp('No configurations were set.')

		config.roleMappings = newRoleMappings

		try {
			await setServerConfig(interaction, config)

			if (!isCollectorStopped) {
				isCollectorStopped = true

				await interaction.followUp('Server configuration updated successfully.')
			}
		} catch (error) {
			console.error('Error setting server config:', error)

			await interaction.followUp('There was an error saving the configuration.')
		}
	})
}

export { handleSetConfigCommand, handleGetConfigCommand }
