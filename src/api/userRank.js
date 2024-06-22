import { getGlobalLeaderboard, getServerLeaderboard } from './leaderBoard'

/**
 * Gets the global rank of a user based on their XP and levels.
 * @param {string} targetUserId - The ID of the user whose global rank is being fetched.
 * @returns {Promise<number|null>} The global rank of the user or null if the user is not ranked.
 */
async function getGlobalRank(targetUserId) {
	try {
		const allUsers = await getGlobalLeaderboard()

		// Find the index of the target user in the sorted array and add 1 to get the rank (0-based index to 1-based rank)
		const globalRank =
			allUsers.findIndex((user) => user.userId === targetUserId) + 1

		if (globalRank === 0) {
			// User does not exist in the leaderboard
			console.log(`User ${targetUserId} is not ranked globally.`)
			return null
		}

		return globalRank
	} catch (error) {
		console.error('Error fetching global rank:', error)
		return null
	}
}

/**
 * Gets the server rank of a user based on their XP and levels.
 * @param {string} targetUserId - The ID of the user whose server rank is being fetched.
 * @param {string} serverId - The ID of the server.
 * @returns {Promise<number|null>} The server rank of the user or null if the user is not ranked.
 */
async function getServerRank(targetUserId, serverId) {
	try {
		const serverUsers = await getServerLeaderboard(serverId)

		// Find the index of the target user in the sorted array
		const userIndex = serverUsers.findIndex(
			(user) => user.userId === targetUserId
		)

		if (userIndex === -1) {
			// User does not exist in the server leaderboard
			console.log(`User ${targetUserId} is not ranked on server ${serverId}.`)
			return null
		}

		// Convert zero-based index to one-based rank
		const serverRank = userIndex + 1

		return serverRank
	} catch (error) {
		console.error('Error fetching server rank:', error)
		return null
	}
}

export { getGlobalRank, getServerRank }
