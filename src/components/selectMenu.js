import {
	ActionRowBuilder,
	AnyComponentBuilder,
	StringSelectMenuBuilder,
} from 'discord.js'

async function showRolesSelectMenu(interaction) {
	const roles = interaction.guild.roles.cache.map((role) => ({
		label: role.name,
		value: role.id,
	}))

	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId('rolesSelectMenu')
		.setPlaceholder('Select roles')
		.addOptions(roles) // Add options correctly
		.setMinValues(1)
		.setMaxValues(roles.length) // Adjust as necessary

	const row = new ActionRowBuilder().addComponents(selectMenu)

	await interaction.reply({
		content: 'Select roles and assign levels:',
		components: [row],
		ephemeral: true,
	})
}

export { showRolesSelectMenu }
