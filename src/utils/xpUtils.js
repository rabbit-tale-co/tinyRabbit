const XP_PER_LEVEL = 3_000 // 2_880
const XP_PER_MESSAGE = 150 // 15

/**
 * Updates user XP and levels based on message content or direct XP setting.
 * @param {Object} data - The user data object containing XP and level.
 * @param {number} newXp - The new XP value, if setting directly.
 * @param {boolean} isDirectSet - Flag indicating if the XP is being set directly (e.g., setxp command).
 * @param {Object} [originalData=null] - The original user data for comparison.
 * @returns {Object} Updated user data, including levelUp and levelDown flags.
 */

function updateUserXpAndLevel(
	data,
	newXp,
	isDirectSet = false,
	originalData = null
) {
	const previousLevel = originalData ? originalData.level : data.level

	if (isDirectSet) {
		data.xp = newXp
	} else {
		data.xp += XP_PER_MESSAGE + (newXp || 0)
	}

	let xpForNextLevel = calculateXpForNextLevel(data.level)

	while (data.xp >= xpForNextLevel) {
		data.xp -= xpForNextLevel
		data.level++
		xpForNextLevel = calculateXpForNextLevel(data.level)
	}

	while (data.xp < 0 && data.level > 0) {
		data.level--
		data.xp += calculateXpForNextLevel(data.level)
	}

	if (data.level === 0 && data.xp < 0) {
		data.xp = 0
	}

	const levelUp = data.level > previousLevel
	const levelDown = data.level < previousLevel

	return { ...data, levelUp, levelDown }
}

/**
 * Calculates the total XP for a specific level.
 * @param {number} level - The level to calculate total XP for.
 * @param {number} xp - The current XP at the given level.
 * @returns {number} Total XP for the given level.
 */
function calculateTotalXpForLevel(level, xp) {
	const xpForPreviousLevels = calculateXpForNextLevel(level - 1)
	return xpForPreviousLevels + xp
}

/**
 * Calculates the XP needed to reach the next level.
 * @param {number} level - The current level.
 * @returns {number} XP required to reach the next level.
 */
function calculateXpForNextLevel(level) {
	return (level + 1) * XP_PER_LEVEL
}

export {
	calculateTotalXpForLevel,
	calculateXpForNextLevel,
	updateUserXpAndLevel,
	XP_PER_MESSAGE,
}
