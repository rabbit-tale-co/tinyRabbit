import { processUserMessageForXP } from '../services/experienceService'

/**
 * Event handler for message creation.
 * @param {Object} message - The message object from Discord.
 */
async function messageHandler(message) {
	if (message.author.bot) return

	await processUserMessageForXP(message)
}

export { messageHandler }
