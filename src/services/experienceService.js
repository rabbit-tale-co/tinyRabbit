import { updateUserXpAndLevel } from '../utils/xpUtils'
import { updateMemberRoles } from './roleService'

import { addUserOrUpdate, getUser } from '../api/user'

const userMessages = []

/**
 * Stores message history for a user.
 * @param {string} userId - The ID of the user.
 * @param {string} channelId - The ID of the channel where the message was sent.
 * @param {string} content - The content of the message.
 */
function storeMessageHistory(userId, channelId, content) {
	if (!userMessages[userId]) userMessages[userId] = []

	userMessages[userId].push({ channelId, content })

	if (userMessages[userId].length > 5) userMessages[userId].shift()
}

/**
 * Processes a user's message to calculate and update their experience points and roles.
 * @param {Object} message - The message object from Discord.
 */
export async function processUserMessageForXP(message) {
	const user = {
		userId: message.author.id,
		userName: message.author.username,
		displayName: message.member
			? message.member.displayName
			: message.author.username,
	}

	let data = await getUser(message.guild.id, user.userId).catch((error) => {
		console.error('Error fetching points:', error)
		return null // Return null in case of error
	})

	// Initialize default experience if user not found
	if (!data) data = { xp: 0, level: 0 }

	storeMessageHistory(user.userId, message.channelId, message.content)

	// TODO: Upgrade anti-spam/xp farm system
	// if (isSpammingXP(user.userId, userMessages, message.channelId)) {
	//    return //console.info('Detected spam - no points awarded.')
	// }

	const contentExperience = 0 // await evaluateMessageWithAPI(message.content); //evaluateMessageContent(message.content)

	// Update points and level for the user
	const userData = updateUserXpAndLevel(data, contentExperience)

	// Add or update user in Firestore
	await addUserOrUpdate(message.guild.id, user.userId, userData)

	// If the user has leveled up, update their roles
	if (userData.levelUp || userData.levelDown) {
		await updateMemberRoles(message.guild, user.userId, userData)
	}
}
