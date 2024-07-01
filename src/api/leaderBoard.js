import { collection, getDocs, doc, getDoc, setDoc, db } from '../db/firebase.js'
import { calculateTotalXpForLevel } from '../utils/xpUtils.js'

const MAX_RETRIES = 5; // Maximum number of retries
const BATCH_SIZE = 10; // Number of users to fetch in each batch
const DELAY_BETWEEN_BATCHES = 1000; // Delay between batches in milliseconds

/**
 * Fetches user data from Discord.
 * @param {Array<string>} userIds - The IDs of the users.
 * @returns {Promise<Array<Object>>} The user data.
 */
const fetchUserDataBatch = async (userIds) => {
  const userDataBatch = [];

  for (const userId of userIds) {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch(`https://discord.com/api/users/${userId}`, {
          headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
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
        userDataBatch.push({
          id: userData.id,
          username: userData.username,
          globalName: userData.global_name,
          avatarUrl: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp`,
        });
        break;
      } catch (error) {
        console.error(`Error fetching user data for user ID ${userId}:`, error.message);
        if (retries < MAX_RETRIES) {
          console.warn(`Retrying... (${retries + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** retries)); // Exponential backoff
          retries++;
        } else {
          userDataBatch.push(null);
          break;
        }
      }
    }
  }

  return userDataBatch;
};

/**
 * Fetches user data in batches.
 * @param {Array<string>} userIds - The IDs of the users.
 * @returns {Promise<Array<Object>>} The user data.
 */
const fetchUserDataInBatches = async (userIds) => {
  const chunks = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    chunks.push(userIds.slice(i, i + BATCH_SIZE));
  }

  const userData = [];
  for (const chunk of chunks) {
    const chunkData = await fetchUserDataBatch(chunk);
    userData.push(...chunkData);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES)); // Delay between batches
  }

  return userData.filter(user => user !== null); // Filter out any null entries
};

/**
 * Gets the global leaderboard.
 * @returns {Promise<Array>} The global leaderboard.
 */
async function getGlobalLeaderboard() {
  try {
    const ref = collection(db, 'leaderboard');
    const snapshot = await getDocs(ref);
    const leaderboardData = snapshot.docs
      .map((doc) => ({ userId: doc.id, ...doc.data() }))
      .sort((a, b) => b.xp - a.xp);

    const userIds = leaderboardData.map(user => user.userId);
    const userData = await fetchUserDataInBatches(userIds);

    const enrichedLeaderboard = leaderboardData.map(user => {
      const userDataForUser = userData.find(u => u.id === user.userId);
      return {
        ...user,
        username: userDataForUser ? userDataForUser.username : null,
        globalName: userDataForUser ? userDataForUser.globalName : null,
        avatarUrl: userDataForUser ? userDataForUser.avatarUrl : null,
      };
    });

    return enrichedLeaderboard;
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
