import {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js'

import { setServerConfig } from '../api/config'

/**
 * Show the modal to set welcome and leave messages.
 * @param {Object} interaction - The interaction object.
 */
async function showMessagesModal(interaction) {
	const modal = new ModalBuilder()
		.setCustomId('setMessagesModal')
		.setTitle('Set Welcome and Leave Messages')

	const welcomeMessageInput = new TextInputBuilder()
		.setCustomId('welcomeMessage')
		.setLabel('Welcome Message')
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder('Enter welcome message (use {user} for username)')
		.setRequired(false)

	const leaveMessageInput = new TextInputBuilder()
		.setCustomId('leaveMessage')
		.setLabel('Leave Message')
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder('Enter leave message (use {user} for username)')
		.setRequired(false)

	const channelSelectMenu = new TextInputBuilder()
		.setCustomId('welcomeLeaveChannel')
		.setPlaceholder('Select a channel for welcome and leave messages')
		.addOptions(
			interaction.guild.channels.cache
				.filter((/** @type {{ isText: () => any; }} */ channel) =>
					channel.isText()
				)
				.map((/** @type {{ name: any; id: any; }} */ channel) => ({
					label: channel.name,
					value: channel.id,
				}))
		)
		// @ts-ignore
		.setMinValues(1)
		.setMaxValues(1)

	const firstActionRow = new ActionRowBuilder().addComponents(
		welcomeMessageInput
	)
	const secondActionRow = new ActionRowBuilder().addComponents(
		leaveMessageInput
	)

	const thirdActionRow = new ActionRowBuilder().addComponents(channelSelectMenu)

	// @ts-ignore
	modal.addComponents(firstActionRow, secondActionRow, thirdActionRow)

	await interaction.showModal(modal)
}

/**
 * @param {{ fields: { getTextInputValue: (arg0: string) => any; }; deferReply: (arg0: { ephemeral: boolean; }) => any; followUp: (arg0: { content: string; ephemeral: boolean; }) => any; }} interaction
 */
async function handleMessagesModalSubmit(interaction) {
	const welcomeMessage = interaction.fields.getTextInputValue('welcomeMessage')
	const leaveMessage = interaction.fields.getTextInputValue('leaveMessage')
	const welcomeLeaveChannel = interaction.fields.getTextInputValue(
		'welcomeLeaveChannel'
	)

	// Store the messages in the config
	const config = {
		welcomeMessage: welcomeMessage || '',
		leaveMessage: leaveMessage || '',
		welcomeLeaveChannel: welcomeLeaveChannel || '',
	}

	try {
		console.log('Received messages:', config)
		await interaction.deferReply({ ephemeral: true })
		await setServerConfig(interaction, config)
		await interaction.followUp({
			content: 'Welcome and leave messages have been set successfully!',
			ephemeral: true,
		})
	} catch (error) {
		console.error('Error setting server config:', error)
		await interaction.followUp({
			content: 'There was an error setting the welcome and leave messages.',
			ephemeral: true,
		})
	}
}

export { showMessagesModal, handleMessagesModalSubmit }
