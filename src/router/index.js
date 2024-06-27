import { fetchTotalXp } from '../api/totalXp'
import { getGlobalLeaderboard, updateLeaderboard } from '../api/leaderBoard'
import { getGlobalRank, getServerRank } from '../api/userRank'
import { checkBotMembership, getGuildDetails } from '../api/guilds'
import { checkBotStatus } from '../api/status/BotStatus'
import { checkDatabaseConnection } from '../api/status/dbConnection'
import { getHealthStatus } from '../api/healthCheck'
import { saveGreetings } from '../api/config'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const getPackageVersion = () => {
	const packageJsonPath = resolve(process.cwd(), 'package.json')
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
	return packageJson.version
}

function setCorsHeaders(response) {
	response.headers.set('Access-Control-Allow-Origin', '*')
	response.headers.set(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, OPTIONS'
	)
	response.headers.set(
		'Access-Control-Allow-Headers',
		'Authorization, Content-Type'
	)
	return response
}

/**
 * Router function to handle API requests.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response.
 */
async function router(req) {
	const url = new URL(req.url)

	if (req.method === 'OPTIONS') {
		return setCorsHeaders(new Response(null, { status: 204 }))
	}

	switch (url.pathname) {
		case '/api/bot-status':
			return handleBotStatus(req)
		case '/api/total-xp':
			return handleTotalXp(req)
		case '/api/guilds/getGuild':
			return handleGetGuild(req)
		case '/api/guilds/checkBotMembership':
			return handleCheckBotMembership(req)
		case '/api/guilds/botGuilds':
			return handleGetBotGuilds(req);
		case '/api/user/getUsers':
			return handleGetUsers(req)
		case '/api/user/getUser':
			return handleGetUser(req)
		case '/api/db/saveGreetings':
			return handleSaveGreetings(req)
		default:
			return new Response('Not Found', { status: 404 })
	}
}

/**
 * Handles the /api/bot-status endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Response} The HTTP response with the bot status.
 */

export async function handleBotStatus(req) {
	const healthStatus = getHealthStatus()
	const version = getPackageVersion()

	return new Response(
		JSON.stringify({
			status: healthStatus.status,
			version: version,
			services: healthStatus.services,
		}),
		{
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		}
	)
}

/**
 * Handles the /api/total-xp endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with the total XP.
 */

async function handleTotalXp(req) {
	try {
		const totalXp = await fetchTotalXp()
		return new Response(JSON.stringify({ totalXp }), {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		console.error('Error fetching total XP:', error)
		return new Response('Error fetching total XP', { status: 500 })
	}
}

/**
 * Leaderboard API
 */

/**
 * Handles the /api/leaderboard/getGlobal endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with the global leaderboard.
 */
async function handleGlobalLeaderboard(req) {
	try {
		const globalLeaderboard = await getGlobalLeaderboard()
		return new Response(JSON.stringify(globalLeaderboard), {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		console.error('Error fetching global leaderboard:', error)
		return new Response('Error fetching global leaderboard', { status: 500 })
	}
}

/**
 * Handles the /api/leaderboard/getServer endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with the server leaderboard.
 */
async function handleServerLeaderboard(req) {
	const { searchParams } = new URL(req.url)
	const serverId = searchParams.get('serverId')

	if (!serverId) {
		return new Response('Missing serverId', { status: 400 })
	}

	try {
		const serverLeaderboard = await getServerLeaderboard(serverId)
		return new Response(JSON.stringify(serverLeaderboard), {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		console.error('Error fetching server leaderboard:', error)
		return new Response('Error fetching server leaderboard', { status: 500 })
	}
}

/**
 * Handles the /api/leaderboard/update endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response confirming the leaderboard update.
 */
async function handleUpdateLeaderboard(req) {
	try {
		const requestBody = await req.json()
		const { userId, serverId, level, xp } = requestBody

		if (!userId || !serverId || level === undefined || xp === undefined) {
			return new Response('Missing parameters', { status: 400 })
		}

		await updateLeaderboard(userId, serverId, level, xp)

		return new Response('Leaderboard updated successfully', { status: 200 })
	} catch (error) {
		console.error('Error updating leaderboard:', error)
		return new Response('Error updating leaderboard', { status: 500 })
	}
}

/**
 * Guilds API
 */

/**
 * Handles the /api/guilds/getGuild endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with the guild details.
 */
async function handleGetGuild(req) {
	const { searchParams } = new URL(req.url)
	const guildId = searchParams.get('guildId')

	if (!guildId) {
		return new Response('Missing guildId', { status: 400 })
	}

	try {
		const {
			guildDetails,
			categoryCount,
			textChannelCount,
			voiceChannelCount,
			roles,
			channels,
		} = await getGuildDetails(guildId)

		return new Response(
			JSON.stringify({
				guildDetails,
				categoryCount,
				textChannelCount,
				voiceChannelCount,
				memberCount: guildDetails.approximate_member_count,
				roles,
				channels,
			}),
			{
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json',
				},
			}
		)
	} catch (error) {
		console.error('Error fetching guild details:', error)
		return new Response('Error fetching guild details', { status: 500 })
	}
}

async function handleCheckBotMembership(req) {
	const { searchParams } = new URL(req.url)
	const guildId = searchParams.get('guildId')
	if (!guildId) {
		return new Response(JSON.stringify({ error: 'Missing guildId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	try {
		const isBotMember = await checkBotMembership(guildId)
		return new Response(JSON.stringify({ isBotMember }), {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		console.error('Error checking bot membership:', error)
		return new Response(JSON.stringify({ isBotMember: false }), {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
			status: 200,
		})
	}
}

async function handleGetBotGuilds(req) {
	try {
	  const guilds = await getBotGuilds();
	  return new Response(JSON.stringify(guilds), {
		 headers: {
			'Access-Control-Allow-Origin': '*',
			'Content-Type': 'application/json',
		 },
	  });
	} catch (error) {
	  console.error('Error fetching bot guilds:', error);
	  return new Response(JSON.stringify({ error: 'Error fetching bot guilds' }), {
		 status: 500,
		 headers: {
			'Access-Control-Allow-Origin': '*',
			'Content-Type': 'application/json',
		 },
	  });
	}
 }

/**
 * User API
 */

/**
 * Handles the /api/user/getUsers endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with the list of users.
 */
async function handleGetUsers(req) {
	const { searchParams } = new URL(req.url)
	const serverId = searchParams.get('serverId')

	if (!serverId) {
		return new Response('Missing serverId', { status: 400 })
	}

	try {
		const users = await getUsers(serverId)
		return new Response(JSON.stringify(users), {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		console.error('Error fetching users:', error)
		return new Response('Error fetching users', { status: 500 })
	}
}

/**
 * Handles the /api/user/getUser endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with the user data.
 */
async function handleGetUser(req) {
	const { searchParams } = new URL(req.url)
	const serverId = searchParams.get('serverId')
	const userId = searchParams.get('userId')

	if (!serverId || !userId) {
		return new Response('Missing serverId or userId', { status: 400 })
	}

	try {
		const user = await getUser(serverId, userId)
		return new Response(JSON.stringify(user), {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		console.error('Error fetching user:', error)
		return new Response('Error fetching user', { status: 500 })
	}
}

/**
 * Handles the /api/user/addOrUpdate endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response confirming the user update.
 */
async function handleAddUserOrUpdate(req) {
	try {
		const requestBody = await req.json()
		const { serverId, userId, userData } = requestBody

		if (!serverId || !userId || !userData) {
			return new Response('Missing parameters', { status: 400 })
		}

		await addUserOrUpdate(serverId, userId, userData)

		return new Response('User added/updated successfully', { status: 200 })
	} catch (error) {
		console.error('Error adding/updating user:', error)
		return new Response('Error adding/updating user', { status: 500 })
	}
}

/**
 * Handles the /api/user/getGlobalRank and /api/user/getServerRank endpoints.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response with the user's rank.
 */
async function handleUserRank(req) {
	const { searchParams } = new URL(req.url)
	const userId = searchParams.get('userId')
	const serverId = searchParams.get('serverId')

	if (!userId || !serverId) {
		return new Response('Missing userId or serverId', { status: 400 })
	}

	try {
		if (req.url.includes('getGlobalRank')) {
			const globalRank = await getGlobalRank(userId)
			return new Response(JSON.stringify({ userId, globalRank }), {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json',
				},
			})
		}

		if (req.url.includes('getServerRank')) {
			const serverRank = await getServerRank(userId, serverId)
			return new Response(JSON.stringify({ userId, serverRank }), {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json',
				},
			})
		}

		return new Response('Invalid rank type', { status: 400 })
	} catch (error) {
		console.error('Error fetching user ranks:', error)
		return new Response('Error fetching user ranks', { status: 500 })
	}
}

/**
 * DB API
 */

/**
 * Handles the /api/save-welcome-message endpoint.
 * @param {Request} req - The incoming HTTP request.
 * @returns {Promise<Response>} The HTTP response confirming the save operation.
 */
async function handleSaveGreetings(req) {
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ message: 'Method not allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
			},
		})
	}

	try {
		const requestBody = await req.json()
		const { serverId, welcomeChannelId, welcomeMessage } = requestBody

		await saveGreetings(serverId, welcomeChannelId, welcomeMessage)

		return new Response(
			JSON.stringify({ message: 'Welcome message saved successfully!' }),
			{
				status: 200,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json',
				},
			}
		)
	} catch (error) {
		console.error('Error saving welcome message:', error)
		return new Response(
			JSON.stringify({ message: 'Error saving welcome message', error }),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		)
	}
}

export { router }
