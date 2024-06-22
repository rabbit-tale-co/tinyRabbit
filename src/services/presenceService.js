import { ActivityType } from 'discord.js'

import { getGlobalLeaderboard } from '../api/leaderBoard'
import { fetchTotalXp } from '../api/TotalXp'

export async function updateBotPresence(client) {
	try {
		// Fetch the global leaderboard
		const leaderboard = await getGlobalLeaderboard()

		// Initialize total XP
		const totalXp = await fetchTotalXp()

		const presenceMessage = `⭐ ${totalXp.toLocaleString()} XP`

		client.user.setPresence({
			activities: [
				{
					name: presenceMessage,
					type: ActivityType.Watching,
					url: 'https://tinyrabbit.co',
					//state: presenceMessage,
				},
			],
			status: 'online',
		})

		console.info(`TotalXP: ${totalXp.toLocaleString()}`)
	} catch (error) {
		console.error('Error updating bot status:', error)
	}
}
