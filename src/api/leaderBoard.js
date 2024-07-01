import { collection, getDocs, doc, getDoc, setDoc, db } from '../db/firebase.js'
import { calculateTotalXpForLevel } from '../utils/xpUtils.js'

/**
 * Fetches user data from Discord.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Object>} The user data.
 */
const fetchUserData = async (userId) => {
	try {
	  const response = await fetch(`https://discord.com/api/users/${userId}`, {
		 headers: {
			Authorization: `Bot ${process.env.BOT_TOKEN}`,
		 },
	  });
 
	  if (!response.ok) {
		 throw new Error('Failed to fetch user data');
	  }
 
	  const userData = await response.json();
	  return {
		 id: userData.id,
		 username: userData.username,
		 globalName: userData.global_name,
		 avatarUrl: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp`,
	  };
	} catch (error) {
	  console.error('Error fetching user data:', error);
	  return null;
	}
 };

/**
 * Gets the global leaderboard.
 * @returns {Promise<Array>} The global leaderboard.
 */
async function getGlobalLeaderboard(limit = 10) {
	try {
	  const ref = collection(db, 'leaderboard');
	  const snapshot = await getDocs(ref);
	  const leaderboardData = snapshot.docs
		 .map((doc) => ({ userId: doc.id, ...doc.data() }))
		 .sort((a, b) => b.xp - a.xp)
		 .slice(0, limit);
 
	  const enrichedLeaderboardPromises = leaderboardData.map(async (user) => {
		 const userData = await fetchUserData(user.userId);
		 return {
			...user,
			username: userData.username,
			globalName: userData.globalName,
			avatarUrl: userData.avatarUrl,
		 };
	  });
 
	  return Promise.all(enrichedLeaderboardPromises);
	} catch (error) {
	  console.error('Error fetching global leaderboard:', error);
	  throw error;
	}
 }

/**
 * Gets the server leaderboard.
 * @param {string} serverId - The ID of the server.
 * @returns {Promise<Array>} The server leaderboard.
 */
async function getServerLeaderboard(serverId) {
	try {
		const ref = collection(db, 'leaderboard')
		const snapshot = await getDocs(ref)

		const response = await Promise.all(
			snapshot.docs.map(async (doc) => {
				const userId = doc.id

				const serverRef = collection(db, `leaderboard/${userId}/servers`)
				const serverSnapshot = await getDocs(serverRef)

				let serverXP = 0
				for (const serverDoc of serverSnapshot.docs) {
					if (serverDoc.id === serverId) {
						serverXP = serverDoc.data().xp
					}
				}

				return { userId, serverXP }
			})
		)

		const Leaderboard = response.filter((user) => user.serverXP > 0)

		Leaderboard.sort((a, b) => b.serverXP - a.serverXP)

		return Leaderboard
	} catch (error) {
		console.error('Error fetching server leaderboard:', error)
		return []
	}
}

/**
 * Updates the leaderboard with the new XP and level.
 * @param {string} userId - The ID of the user.
 * @param {string} serverId - The ID of the server.
 * @param {number} level - The user's level.
 * @param {number} xp - The user's XP.
 */
async function updateLeaderboard(userId, serverId, level, xp) {
	try {
		const totalXpForServer = calculateTotalXpForLevel(level, xp)

		const leaderboardRef = doc(db, 'leaderboard', userId)
		const leaderboardDoc = await getDoc(leaderboardRef)

		let currentGlobalXp = 0
		if (leaderboardDoc.exists()) currentGlobalXp = leaderboardDoc.data().xp

		const userServerXpRef = doc(db, 'leaderboard', userId, 'servers', serverId)
		const userServerXpDoc = await getDoc(userServerXpRef)

		let previousServerXp = 0
		if (userServerXpDoc.exists()) previousServerXp = userServerXpDoc.data().xp

		const newGlobalXp = currentGlobalXp - previousServerXp + totalXpForServer

		await setDoc(leaderboardRef, {
			xp: newGlobalXp,
		})

		await setDoc(userServerXpRef, {
			xp: totalXpForServer,
		})
	} catch (error) {
		console.error('Error updating leaderboard:', error)
		throw error
	}
}

export { updateLeaderboard, getGlobalLeaderboard, getServerLeaderboard }
