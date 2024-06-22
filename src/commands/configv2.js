import { PermissionFlagsBits } from 'discord.js'
import { getServerConfig, setServerConfig } from '../api/config'

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

	const configName = interaction.options.getString('config')

	if (configName === 'messages') {
		await startMessageConfiguration(interaction)
	} else if (configName === 'roles') {
		await startRoleConfiguration(interaction)
	} else {
		await interaction.reply({
			content: 'Invalid configuration name.',
			ephemeral: true,
		})
	}
}

/**
 * Handles the getconfig command to get the current server configuration.
 * @param {Object} interaction - The interaction object.
 */
async function handleGetConfigCommand(interaction) {
	if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
		return await interaction.reply({
			content: 'You do not have permission to use this command.',
			ephemeral: true,
		})

	const serverId = interaction.guild.id
	const config = await getServerConfig(serverId)

	config
		? await interaction.reply(
				`Server Configuration:\n\`\`\`${JSON.stringify(config, null, 2)}\`\`\``
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

		if (line.startsWith('lvl:')) {
			const levelPartMatch = line.match(/lvl:\s*(\d+)/)
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
		} else if (line.startsWith('channel_id:')) {
			const channelIdMatch = line.match(/channel_id:\s*<#(\d+)>/)

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
		} else if (line.startsWith('join_role:')) {
			const roleMatch = line.match(/join_role:\s*<@&(\d+)>/)

			if (!roleMatch)
				return { success: false, message: 'Error: invalid role format' }

			const roleId = roleMatch[1]

			if (!roleId) {
				return {
					success: false,
					message: `Error processing join role: ${roleId}`,
				}
			}

			config.joinRoleId = roleId
			newRoleMappings[0] = roleId
			hasValidConfig = true
		} else if (line.startsWith('welcome_message:')) {
			const messageMatch = line.match(/welcome_message:\s*(.*)/)

			if (!messageMatch) {
				return {
					success: false,
					message: 'Error: invalid welcome message format',
				}
			}

			config.welcomeMessage = messageMatch[1].trim()
			hasValidConfig = true
		} else if (line.startsWith('leave_message:')) {
			const messageMatch = line.match(/leave_message:\s*(.*)/)

			if (!messageMatch) {
				return {
					success: false,
					message: 'Error: invalid leave message format',
				}
			}

			config.leaveMessage = messageMatch[1].trim()
			hasValidConfig = true
		} else {
			return { success: false, message: 'Error: invalid format' }
		}
	}

	return { success: hasValidConfig }
}

/**
 * Starts the role configuration process.
 * @param {Object} interaction - The interaction object.
 */
async function startRoleConfiguration(interaction) {
	await interaction.reply({
		content:
			'## Configuration started!\n\nPlease send reply following format:\n\n```\n- join_role: @role\n\n- lvl: {Number} role: @role\n- lvl: {Number} role: @role\n\n- channel_id: #channel\n```\n\n **Legend:**\n>>> - `join_role`: Role to assign to new members (will be lvl: 0 by default)\n- `lvl`: Level to assign the role\n- `role`: Role to assign at the specified level\n- `channel_id`: Channel for level-up notifications',
		//ephemeral: true,
	})

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
		}

		if (result.success) {
			hasValidConfig = true
			await message.react('✅')
		}

		isCollectorStopped = true
		collector.stop()
	})

	collector.on('end', async () => {
		if (!hasValidConfig)
			return await interaction.followUp('Configuration Cancelled.')

		config.roleMappings = newRoleMappings

		try {
			await setServerConfig(interaction, config)

			if (!isCollectorStopped) {
				isCollectorStopped = true

				await interaction.followUp({
					content: 'Server configuration updated successfully.',
					//ephemeral: true,
				})
			}
		} catch (error) {
			console.error('Error setting server config:', error)

			await interaction.followUp({
				content: 'There was an error saving the configuration.',
				//ephemeral: true,
			})
		}
	})
}

/**
 * Starts the message configuration process.
 * @param {Object} interaction - The interaction object.
 */
async function startMessageConfiguration(interaction) {
	return await interaction.reply({
		content: 'Sorry, but this command is currently unavailable.',
		ephemeral: true,
	})

	// await interaction.reply(
	// 	'## Configuration started!\n\nPlease enter the welcome and leave messages in the following format:\n\n```\n- welcome_message: Welcome to the server, {user}!\n- leave_message: Goodbye, {user}!\n```\n\n**Legend:**\n>>> - `welcome_message`: Message to send when a new member joins\n- `leave_message`: Message to send when a member leaves\n- `{user}`: Mention the user in the message'
	// )

	// const filter = (response) => response.author.id === interaction.user.id
	// const collector = interaction.channel.createMessageCollector({
	// 	filter,
	// 	time: 60000,
	// })

	// const config = {}
	// let hasValidConfig = false
	// let isCollectorStopped = false

	// collector.on('collect', async (message) => {
	// 	if (isCollectorStopped) return

	// 	const result = processMessageConfig(message.content, {}, [], config)

	// 	if (!result.success) {
	// 		await message.react('❌')
	// 		await interaction.followUp({
	// 			content: result.message || 'An unknown error occurred.',
	// 			ephemeral: true,
	// 		})
	// 		isCollectorStopped = true
	// 		collector.stop()
	// 		return
	// 	}

	// 	if (result.success) {
	// 		hasValidConfig = true
	// 		await message.react('✅')
	// 		isCollectorStopped = true
	// 		collector.stop()
	// 	}
	// })

	// collector.on('end', async () => {
	// 	if (!hasValidConfig)
	// 		return await interaction.followUp('No configurations were set.')

	// 	try {
	// 		await setServerConfig(interaction, config)

	// 		if (!isCollectorStopped) {
	// 			isCollectorStopped = true

	// 			await interaction.followUp({
	// 				content: 'Server configuration updated successfully.',
	// 				//ephemeral: true,
	// 			})
	// 		}
	// 	} catch (error) {
	// 		console.error('Error setting server config:', error)

	// 		await interaction.followUp({
	// 			content: 'There was an error saving the configuration.',
	// 			//ephemeral: true,
	// 		})
	// 	}
	// })
}

export { handleSetConfigCommand, handleGetConfigCommand }
