import { collection, getDocs, doc, getDoc, setDoc, db, query, orderBy } from '../db/firebase.js'
import { calculateTotalXpForLevel } from '../utils/xpUtils.js'

const BOT_TOKEN = process.env.BOT_TOKEN;
const MAX_RETRIES = 5; // Maximum number of retries
const USER_CACHE = new Map(); // In-memory cache

/**
 * Fetches user data from Discord.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Object>} The user data.
 */
const fetchUserData = async (userId) => {
  if (USER_CACHE.has(userId)) {
    return USER_CACHE.get(userId);
  }

  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const response = await fetch(`https://discord.com/api/users/${userId}`, {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      });

      if (response.status === 429) { // Handle rate limiting
        const retryAfter = response.headers.get('retry-after');
        console.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (retryAfter || 1) * 1000));
        retries++;
        continue;
      }

      if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText} - ${errorDetails}`);
      }

      const userData = await response.json();
      const userRecord = {
        id: userData.id,
        username: userData.username,
        globalName: userData.global_name,
        avatarUrl: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp`,
      };

      USER_CACHE.set(userId, userRecord); // Cache the user data
      return userRecord;
    } catch (error) {
      console.error(`Error fetching user data for user ID ${userId}:`, error.message);
      if (retries < MAX_RETRIES) {
        console.warn(`Retrying... (${retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** retries)); // Exponential backoff
        retries++;
      } else {
        return null;
      }
    }
  }
};

/**
 * Gets the global leaderboard with pagination.
 * @param {number} page - The page number.
 * @param {number} limit - The number of users per page.
 * @returns {Promise<Array>} The global leaderboard.
 */
async function getGlobalLeaderboard(page = 1, limit = 25) {
  try {
    const ref = collection(db, 'leaderboard');
    const snapshot = await getDocs(query(ref, orderBy('xp', 'desc')));
    const leaderboardData = snapshot.docs
      .map((doc) => ({ userId: doc.id, ...doc.data() }))
      .sort((a, b) => b.xp - a.xp);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedData = leaderboardData.slice(startIndex, endIndex);

    const enrichedLeaderboardPromises = paginatedData.map(async (user) => {
      const userData = await fetchUserData(user.userId);
      if (userData) {
        return {
          ...user,
          username: userData.username,
          globalName: userData.globalName,
          avatarUrl: userData.avatarUrl,
        };
      }
      return user; // If userData is null, return the original user data
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
			}),
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
