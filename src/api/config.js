import { db, doc, getDoc, setDoc } from '../db/firebase'

/**
 * Sets server configuration.
 * @param {Object} interaction - Discord interaction object.
 * @param {Object} config - Configuration settings to update.
 */
async function setServerConfig(interaction, config) {
	const serverId = interaction.guild.id
	const configRef = doc(db, 'servers', serverId, 'config', 'settings')

	try {
		const currentConfigDoc = await getDoc(configRef)
		const currentConfig = currentConfigDoc.exists()
			? currentConfigDoc.data()
			: {}

		const updatedConfig = {
			...currentConfig,
			...config,
		}

		await setDoc(configRef, updatedConfig)
		await interaction.followUp('Server configuration updated successfully.')
	} catch (error) {
		console.error('Error setting server config:', error)
		await interaction.followUp(
			'There was an error updating the server configuration.'
		)
	}
}

/**
 * Gets server configuration.
 * @param {string} serverId - The ID of the server.
 * @returns {Promise<any>} Configuration settings.
 */
async function getServerConfig(serverId) {
	const configRef = doc(db, 'servers', serverId, 'config', 'settings')

	try {
		const configDoc = await getDoc(configRef)
		if (configDoc.exists()) {
			return configDoc.data()
		}

		console.log('No configuration found for this server.')
		return null
	} catch (error) {
		console.error('Error fetching server config:', error)
		return null
	}
}

/**
 * Saves the welcome message to the database inside the settings.
 * @param {string} serverId - The ID of the server.
 * @param {string} welcomeChannelId - The ID of the welcome channel.
 * @param {string} welcomeMessage - The welcome message.
 * @returns {Promise<void>} - A promise that resolves when the document is saved.
 */
async function saveGreetings(serverId, welcomeChannelId, welcomeMessage) {
	if (!serverId || !welcomeChannelId || !welcomeMessage) {
		throw new Error('Missing parameters')
	}

	const configRef = doc(db, 'servers', serverId, 'config', 'settings')

	try {
		const currentConfigDoc = await getDoc(configRef)
		const currentConfig = currentConfigDoc.exists()
			? currentConfigDoc.data()
			: {}

		const updatedConfig = {
			...currentConfig,
			greetings: {
				welcomeChannelId,
				welcomeMessage,
			},
		}

		await setDoc(configRef, updatedConfig)
	} catch (error) {
		console.error('Error saving greetings:', error)
		throw new Error('Error saving greetings')
	}
}

export { setServerConfig, getServerConfig, saveGreetings }
