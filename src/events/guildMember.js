import { getServerConfig } from '../api/config'
import { createWelcomeEmbed } from '../services/embedServiceV2'

/**
 * Replaces placeholders in the welcome message with actual values.
 * @param {string} message - The welcome message template.
 * @param {Object} member - The member that joined the guild.
 * @param {Object} welcomeChannel - The welcome channel.
 * @returns {string} - The welcome message with placeholders replaced.
 */
/**
 * Replaces placeholders in the welcome message with actual values.
 * @param {string} message - The welcome message template.
 * @param {Object} member - The member that joined the guild.
 * @param {Object} welcomeChannel - The welcome channel.
 * @returns {string} - The welcome message with placeholders replaced.
 */
function replacePlaceholders(message, member, welcomeChannel) {
	const guild = member.guild;

	// Replace standard placeholders
	let output = message
		 .replace('{user}', `<@${member.id}>`)
		 .replace('{avatar}', member.user.displayAvatarURL())
		 .replace('{username}', member.user.tag)
		 .replace('{server}', guild.name);

	// Replace channel mentions
	output = output.replace(/{#(\w+)}/g, (_, channelName) => {
		 const channel = guild.channels.cache.find((ch) => ch.name === channelName);
		 return channel ? `<#${channel.id}>` : `#${channelName}`;
	});

	// Replace role mentions
	output = output.replace(/{&(\w+)}/g, (_, roleName) => {
		 const role = guild.roles.cache.find((r) => r.name === roleName);
		 return role ? `<@&${role.id}>` : `@${roleName}`;
	});

	// Ensure the newline characters are interpreted correctly
	output = output.replace(/\\n/g, '\n');

	return output;
}

/**
 * Handles the guild member join event.
 * @param {Object} member - The member that joined the guild.
 */
async function handleMemberJoin(member) {
	try {
		const config = await getServerConfig(member.guild.id)

		// console.log(`Member joined: ${member.user.tag}`)

		if (!config) {
			console.error(`No config found for guild ${member.guild.id}`)
			return
		}

		// Assign join role to new members
		if (config.joinRoleId) {
			const role = member.guild.roles.cache.get(config.joinRoleId)

			if (role) {
				await member.roles.add(role)
				//console.log(`Assigned join role to ${member.user.tag}`);
			}
		}

		const welcomeConfig = config.greetings
		// Send welcome message
		if (welcomeConfig.welcomeMessageType === 'embed') {
			const embed = await createWelcomeEmbed(member, embedConfig)

			const welcomeChannel = member.guild.channels.cache.get(
				welcomeConfig.welcomeChannelId
			)

			if (welcomeChannel) {
				await welcomeChannel.send({
					embeds: [embed.embed],
					// files: embed.attachment ? [embed.attachment] : [],
				})
			} else {
				console.error(
					`Welcome channel with ID ${welcomeConfig.welcomeChannelId} not found`
				)
			}

			// if (welcomeChannel) {
			//    if (config.welcomeMessageType === 'embed') {
			//       const embed = await createWelcomeEmbed(
			//          member,
			//          config.welcomeMessage,
			//          config.welcomeImageUrl
			//       )

			//       await welcomeChannel.send({
			//          embeds: [embed.embed],
			//          // files: embed.attachment ? [embed.attachment] : [],
			//       })
			//    } else {
			//       const message = replacePlaceholders(
			//          config.welcomeMessage,
			//          member
			//       )
			//       await welcomeChannel.send(message)
			//    }
			// } else {
			//    console.error(
			//       `Welcome channel with ID ${config.welcomeChannelId} not found`
			//    )
			// }
		} else {
			// const message = welcomeConfig.welcomeMessage
			//    .replace('{server}', member.guild.name)
			//    .replace('{user}', `<@${member.user.id}>`)
			const message = replacePlaceholders(welcomeConfig.welcomeMessage, member)

			const welcomeChannel = member.guild.channels.cache.get(
				welcomeConfig.welcomeChannelId
			)
			if (welcomeChannel) {
				await welcomeChannel.send(message)
			} else {
				console.error(
					`Welcome channel with ID ${welcomeConfig.welcomeChannelId} not found`
				)
			}
		}
	} catch (error) {
		console.error(`Error handling member join for ${member.user.tag}:`, error)
	}
}

/**
 * Handles the guild member leave event.
 * @param {Object} member - The member that left the guild.
 */
async function handleMemberLeave(member) {
	try {
		const config = await getServerConfig(member.guild.id)

		if (!config) {
			console.error(`No config found for guild ${member.guild.id}`)
			return
		}

		// Send leave message
		// if (config.leaveMessage) {
		//    const leaveChannel = member.guild.systemChannel

		//    if (leaveChannel) {
		//       await leaveChannel.send(
		//          config.leaveMessage.replace('{user}', member.user.tag)
		//       )
		//    }
		// }
	} catch (error) {
		console.error(`Error handling member leave for ${member.user.tag}:`, error)
	}
}

export { handleMemberJoin, handleMemberLeave, replacePlaceholders }
