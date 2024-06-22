import { checkBotStatus } from '../api/status/BotStatus'
import { checkDatabaseConnection } from '../api/status/dbConnection'

let healthStatus = {
	status: 'offline',
	services: {
		database: 'offline',
		bot: 'offline',
	},
}

async function healthCheck() {
	try {
		const [databaseStatus, botStatus] = await Promise.all([
			checkDatabaseConnection(),
			checkBotStatus(),
		])

		healthStatus = {
			status: 'online',
			services: {
				database: databaseStatus,
				bot: botStatus,
			},
		}
	} catch (error) {
		console.error('Error during health check:', error)
		healthStatus = {
			status: 'offline',
			services: {
				database: 'offline',
				bot: 'offline',
			},
		}
	}
}

function getHealthStatus() {
	return healthStatus
}

export { healthCheck, getHealthStatus }
