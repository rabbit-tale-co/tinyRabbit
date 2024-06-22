import {
	db,
	doc,
	getDoc,
	getDocs,
	collection,
	writeBatch,
	setDoc,
} from '../db/firebase.js'
import { updateLeaderboard } from './leaderBoard.js'

const userCache = {}

/**
 * Gets users for a specific server.
 * @param {string} serverId - The ID of the server.
 * @returns {Promise<object>} List of users.
 */
async function getUsers(serverId) {
	if (!serverId) throw new Error('Invalid serverId')

	const levelsCol = collection(db, 'servers', serverId, 'levels')
	const levelsSnapshot = await getDocs(levelsCol)

	return levelsSnapshot.docs.map((doc) => ({
		userId: doc.id,
		...doc.data(),
	}))
}

/**
 * Gets a specific user for a specific server.
 * @param {string} serverId - The ID of the server.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} User data.
 */
async function getUser(serverId, userId) {
	if (!serverId || !userId) throw new Error('Invalid serverId or userId')

	const cacheKey = `${serverId}_${userId}`
	if (userCache[cacheKey]) return userCache[cacheKey] // Return from cache if available

	const userRef = doc(db, 'servers', serverId, 'levels', userId)
	const userDoc = await getDoc(userRef)

	if (!userDoc.exists()) return {}

	const userData = userDoc.data()
	// Store in cache
	userCache[cacheKey] = userData
	return userData
}

/**
 * Adds or updates a user in the database.
 * @param {string} serverId - The ID of the server.
 * @param {string} userId - The ID of the user.
 * @param {Object} userData - The user data to update.
 */
async function addUserOrUpdate(serverId, userId, userData) {
	if (!serverId || !userId) throw new Error('Invalid serverId or userId')

	try {
		const userRef = doc(db, 'servers', serverId, 'levels', userId)

		const userXp = !Number.isNaN(userData.xp) ? userData.xp : 0
		const userLevel = !Number.isNaN(userData.level) ? userData.level : 0

		const userDoc = await getDoc(userRef)

		if (userDoc.exists()) {
			await setDoc(userRef, {
				xp: userXp,
				level: userLevel,
			})
			//console.log('User updated:', userId, serverId, userLevel, userXp)
		} else {
			await setDoc(userRef, {
				xp: userXp,
				level: userLevel,
			})
			//console.log('User added:', userId, serverId, userLevel, userXp)
		}

		userCache[`${serverId}_${userId}`] = {
			xp: userXp,
			level: userLevel,
		}

		await updateLeaderboard(userId, serverId, userLevel, userXp)
	} catch (error) {
		console.error('Error adding/updating user:', error)
	}
}

export { getUsers, getUser, addUserOrUpdate }
