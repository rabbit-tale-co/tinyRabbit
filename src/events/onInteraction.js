import {
	handleSetConfigCommand,
	handleGetConfigCommand,
} from '../commands/configv2'
import { handleXpCommand, handleSetXpCommand } from '../commands/xp'

import { setServerConfig } from '../api/config'

/**
 * Command handlers mapping.
 */
const commandHandlers = {
	setconfig: handleSetConfigCommand,
	getconfig: handleGetConfigCommand,
	xp: handleXpCommand,
	setxp: handleSetXpCommand,
}

/**
 * Handles interaction commands.
 * @param {Object} interaction - The interaction object.
 */
async function interactionHandler(interaction) {
	if (interaction.isCommand()) {
		const { commandName } = interaction
		const commandHandler = commandHandlers[commandName]

		if (!commandHandler)
			return await interaction.reply({
				content: 'Unknown command.',
				ephemeral: true,
			})

		await commandHandler(interaction)
	} else if (interaction.isModalSubmit()) {
		const modalId = interaction.customId

		if (modalId === 'welcomeModal') {
			await interaction.deferReply({ ephemeral: true })
			const welcomeMessage =
				interaction.fields.getTextInputValue('welcomeMessage')
			const leaveMessage = interaction.fields.getTextInputValue('leaveMessage')
			await setServerConfig(interaction, { welcomeMessage, leaveMessage })
		}
	} else if (interaction.isSelectMenu()) {
		const selectMenuId = interaction.customId

		if (selectMenuId === 'rolesSelectMenu') {
			await interaction.deferReply({ ephemeral: true })
			const selectedRoles = interaction.values
			// Placeholder level, you should prompt user for actual levels
			const rolesWithLevels = selectedRoles.map((roleId) => ({
				roleId,
				level: 1,
			}))
			await setServerConfig(interaction, { roles: rolesWithLevels })
		}
	}
}

export { interactionHandler }
