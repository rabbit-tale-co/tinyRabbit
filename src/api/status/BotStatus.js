import { client } from '../../index' // Ensure correct import of client

export const checkBotStatus = async () => {
	return new Promise((resolve) => {
		if (client.isReady()) {
			resolve('online')
		} else {
			client.once('ready', () => {
				resolve('online')
			})
		}
		setTimeout(() => {
			if (!client.isReady()) {
				resolve('offline')
			}
		}, 5000) // Timeout to resolve as offline if bot is not ready within 5 seconds
	})
}
