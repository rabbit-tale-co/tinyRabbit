import { serve } from 'bun'
import dotenv from 'dotenv'

import { Client, GatewayIntentBits } from 'discord.js'
import { initializeFirebase } from './db/firebase'

import { messageHandler } from './events/onMessage'
import { interactionHandler } from './events/onInteraction'
import { handleMemberJoin, handleMemberLeave } from './events/guildMember'

import { updateBotPresence } from './services/presenceService'

import { handleBotStatus, router } from './router'
import { getHealthStatus, healthCheck } from './api/healthCheck'

dotenv.config()

const PORT = process.env.PORT || 3000
const CLIENT_ID = process.env.BOT_CLIENT_ID
const CLIENT_SECRET = process.env.BOT_CLIENT_SECRET
// TODO: change rabbittale.co to api.rabbittale.co
const REDIRECT_URI = 'https://api.rabbittale.co/callback'

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

serve({
	fetch(req) {
		const url = new URL(req.url)

		if (req.method === 'OPTIONS')
			return setCorsHeaders(new Response(null, { status: 204 }))

		if (url.pathname.startsWith('/api')) return router(req)

		if (url.pathname === '/login') {
			const state = encodeURIComponent(
				req.headers.get('Referer') || 'http://dashboard.rabbittale.co'
			)
			return new Response(null, {
				status: 302,
				headers: {
					Location: `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
						REDIRECT_URI
					)}&response_type=code&scope=identify+guilds+email&state=${state}`,
				},
			})
		}

		if (url.pathname === '/callback') {
			const code = url.searchParams.get('code')
			const state = decodeURIComponent(
				url.searchParams.get('state') || 'http://dashboard.rabbittale.co'
			)
			const error = url.searchParams.get('error')

			if (error) {
				return new Response(null, {
					status: 302,
					headers: {
						Location: `${state}?error=${error}`,
					},
				})
			}

			if (!code) {
				return new Response('Authorization code not found', {
					status: 400,
					headers: {
						Location: `${state}?error=code_not_found`,
					},
				})
			}

			const params = new URLSearchParams()
			params.append('client_id', CLIENT_ID)
			params.append('client_secret', CLIENT_SECRET)
			params.append('grant_type', 'authorization_code')
			params.append('code', code)
			params.append('redirect_uri', REDIRECT_URI)

			return fetch('https://discord.com/api/oauth2/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: params.toString(),
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.access_token) {
						return new Response(null, {
							status: 302,
							headers: {
								Location: `${state}?access_token=${data.access_token}&expires_in=${data.expires_in}`,
							},
						})
					}
					return new Response('Error fetching access token', {
						status: 400,
					})
				})
		}
		return new Response('Not Found', { status: 404 })
	},
	port: PORT,
	websocket: {
		message(ws, message) {
			console.log('Received message', message)
		},
		close(ws) {
			console.log('WebSocket closed')
		},
		open(ws) {
			console.log('WebSocket opened')
		},
	},
})

console.info(`Server is running on port ${PORT}`)

// Initialize Firebase
initializeFirebase()
//FIXME: Bot today at 12:00 AM disconected from db

// Initialize Discord Bot
export const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
	],
	// @ts-ignore
	ws: { properties: { browser: 'Discord iOS' } },
})

client.once('ready', async (c) => {
	if (!c.user) return

	console.log(`${c.user.tag} has logged in!`)

	// Update bot status for all guilds
	await updateBotPresence(c)
	await handleBotStatus(c)

	setInterval(() => {
		initializeFirebase()
	}, 86_400_000) // 24h

	// Update bot status every hour for all guilds
	setInterval(async () => {
		await updateBotPresence(c)
	}, 900_000) // 1h - 3_600_000 now it's 15 min

	setInterval(async () => {
		await healthCheck()
		const healthStatus = getHealthStatus()
		// console.log('Health Check:', healthStatus)
	}, 15_000) // 15 seconds
})

client.on('messageCreate', messageHandler)
client.on('interactionCreate', interactionHandler)

// Guild member events
client.on('guildMemberAdd', handleMemberJoin)
client.on('guildMemberRemove', handleMemberLeave)

client.login(process.env.BOT_TOKEN)
