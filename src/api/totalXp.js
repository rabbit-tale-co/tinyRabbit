import { getGlobalLeaderboard } from './leaderBoard'

/**
 * Fetches global leaderboard data and calculates total XP.
 * @returns {Promise<number>} Total XP from the global leaderboard.
 */
async function fetchTotalXp() {
	try {
		const leaderboard = await getGlobalLeaderboard()

		// Initialize total XP
		let totalXp = 0

		// Iterate over the global leaderboard and accumulate XP
		for (const user of leaderboard) {
			// Ensure user.xp is a number
			const userXp = Number(user.xp)
			if (!Number.isNaN(userXp)) {
				totalXp += userXp
			} else {
				console.warn(
					`Invalid XP value for user ${user.userId || 'unknown'}:`,
					user.xp
				)
			}
		}

		return totalXp
	} catch (error) {
		console.error('Error fetching total XP:', error)
		throw error
	}
}

export { fetchTotalXp }
