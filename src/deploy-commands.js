import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'

const commands = [
	{
		name: 'xp',
		description: 'Shows the XP level of a user',
		options: [
			{
				type: 6, // Corresponds to the USER type
				name: 'user',
				description: 'The user whose XP level you want to check',
				required: false,
			},
		],
	},
	{
		name: 'setxp',
		description: 'Sets the XP level of a user (Admin only)',
		options: [
			{
				type: 6, // USER type
				name: 'user',
				description: 'The user whose XP level you want to set',
				required: true,
			},
			{
				type: 4, // INTEGER type
				name: 'amount',
				description: 'The amount of XP to set for the user',
				required: true,
			},
			{
				type: 4, // INTEGER type
				name: 'level',
				description: 'The level to set for the user',
				required: true,
			},
		],
	},
	{
		name: 'setconfig',
		description: 'Configure server settings (Admin only)',
		options: [
			{
				type: 3, // STRING type
				name: 'config',
				description: 'The name of the setting to configure',
				required: true,
				choices: [
					//{ name: 'Welcome and Leave Messages', value: 'messages' },
					{ name: 'Roles & Levels', value: 'roles' },
					// Add more configuration options here as needed
				],
			},
		],
	},
	{
		name: 'getconfig',
		description: 'Get a list of all configurations (Admin only)',
		options: [],
	},
]

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN)
;(async () => {
	try {
		console.log('Started the process of registering slash commands globally.')

		// Use the global commands route
		await rest.put(Routes.applicationCommands('1207315441614331904'), {
			body: commands,
		})

		console.log('Successfully registered slash commands globally.')
	} catch (error) {
		console.error(error)
	}
})()
