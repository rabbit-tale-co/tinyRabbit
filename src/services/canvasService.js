import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import axios from 'axios'
import path from 'node:path'
import fs from 'node:fs'

import { formatter } from '../utils/formatter.js'

/**
 * Downloads an image from a given URL and returns it as a buffer.
 * @param {string} url - The URL of the image to download.
 * @returns {Promise<Buffer>} The image as a buffer.
 */
async function downloadImage(url) {
	const response = await axios({
		url,
		responseType: 'arraybuffer',
	})
	return Buffer.from(response.data, 'binary')
}

/**
 * Draws centered text within a specified rectangle.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {string} text - The text to draw.
 * @param {number} rectX - The X coordinate of the rectangle.
 * @param {number} rectY - The Y coordinate of the rectangle.
 * @param {number} rectWidth - The width of the rectangle.
 * @param {number} rectHeight - The height of the rectangle.
 * @param {number} fontSize - The font size of the text.
 * @param {string} fontFamily - The font family of the text.
 */
function drawTextCentered(
	ctx,
	text,
	rectX,
	rectY,
	rectWidth,
	rectHeight,
	fontSize,
	fontFamily
) {
	ctx.font = `${fontSize}px ${fontFamily}`
	const textMetrics = ctx.measureText(text)
	const textWidth = textMetrics.width
	const textHeight = fontSize // Approximate text height by font size

	const x = rectX + (rectWidth - textWidth) / 2
	const y = rectY + (rectHeight - textHeight) / 2

	ctx.fillText(text, x, y)
}

/**
 * Generates a ranking image for a user.
 * @param {Object} user - The user data.
 * @param {string} user.username - The username of the user.
 * @param {string} user.avatarUrl - The URL of the user's avatar.
 * @param {number} user.globalLevel - The global level of the user.
 * @param {number} user.globalRank - The global rank of the user.
 * @param {number} user.globalXp - The global XP of the user.
 * @param {number} user.globalXpNeeded - The XP needed for the next global level.
 * @param {number} user.serverLevel - The server level of the user.
 * @param {number} user.serverRank - The server rank of the user.
 * @param {number} user.serverXp - The server XP of the user.
 * @param {number} user.serverXpNeeded - The XP needed for the next server level.
 * @returns {Promise<Buffer>} The generated image as a buffer.
 */
async function generateRankingImage(user) {
	try {
		// Load the template image
		const templatePath = path.resolve('src/assets/xp_card.png')
		const templateImage = await loadImage(fs.readFileSync(templatePath))

		const width = templateImage.width
		const height = templateImage.height
		const canvas = createCanvas(width, height)
		const ctx = canvas.getContext('2d')

		// Draw the template
		ctx.drawImage(templateImage, 0, 0, width, height)

		// Download and process user avatar
		const avatarBuffer = await downloadImage(user.avatarUrl)
		const avatar = await loadImage(avatarBuffer)

		// Draw user avatar
		const avatarSize = 80
		const avatarX = 24
		const avatarY = 24
		ctx.save()
		ctx.beginPath()
		ctx.arc(
			avatarX + avatarSize / 2,
			avatarY + avatarSize / 2,
			avatarSize / 2,
			0,
			Math.PI * 2
		)
		ctx.closePath()
		ctx.clip()
		ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
		ctx.restore()

		// Load and set custom font
		const fontPath = path.resolve('src/assets/font/IndustryTest-Bold.otf')
		const fontLoaded = GlobalFonts.registerFromPath(fontPath, 'Industry')
		if (!fontLoaded) {
			throw new Error(`Failed to load font from path: ${fontPath}`)
		}
		ctx.font = '32px Industry'
		ctx.fillStyle = '#FFFFFF'

		// Draw username
		if (user.username) {
			ctx.font = '36px Industry'
			ctx.fillText(`@${user.username}`, 124, 75)
		} else {
			console.error('Username is undefined')
		}

		// Draw Global Ranking section
		if (
			user.globalLevel !== undefined &&
			user.globalRank !== undefined &&
			user.globalXp !== undefined &&
			user.globalXpNeeded !== undefined
		) {
			ctx.font = '36px Industry'
			ctx.fillText('Global Ranking', 24, 154)
			ctx.font = '24px Industry'
			ctx.fillText(`LV. ${user.globalLevel}`, 24, 196)
			ctx.font = '16px Industry'
			ctx.fillStyle = '#A1BAC4'
			drawTextCentered(
				// @ts-ignore
				ctx,
				`#${user.globalRank}`,
				186,
				186,
				100,
				20,
				16,
				'Industry'
			)

			// Draw Global Ranking Progress Bar
			ctx.fillStyle = '#45596326'
			const globalProgress = (user.globalXp / user.globalXpNeeded) * 500
			ctx.fillRect(300, 120, globalProgress, 90) // Progress bar
			ctx.fillStyle = '#FFFFFF'
			drawTextCentered(
				// @ts-ignore
				ctx,
				`${formatter.format(user.globalXp)} / ${formatter.format(
					user.globalXpNeeded
				)}`,
				300,
				170,
				500,
				40,
				24,
				'Industry'
			)
		} else {
			console.error('Global ranking data is undefined:', {
				globalLevel: user.globalLevel,
				globalRank: user.globalRank,
				globalXp: user.globalXp,
				globalXpNeeded: user.globalXpNeeded,
			})
		}

		// Draw Server Ranking section
		if (
			user.serverLevel !== undefined &&
			user.serverRank !== undefined &&
			user.serverXp !== undefined &&
			user.serverXpNeeded !== undefined
		) {
			ctx.fillStyle = '#FFFFFF'
			ctx.font = '25px Industry'
			ctx.fillText('Server Ranking', 50, 300)
			ctx.font = '20px Industry'
			ctx.fillText(`LV. ${user.serverLevel}`, 50, 330)
			ctx.fillStyle = '#7289DA'
			ctx.fillText(`#${user.serverRank}`, 150, 330)

			// Draw Server Ranking Progress Bar
			ctx.fillStyle = '#2C2F33'
			ctx.fillRect(300, 310, 500, 40) // Background bar
			ctx.fillStyle = '#4D4D4D'
			const serverProgress = (user.serverXp / user.serverXpNeeded) * 500
			ctx.fillRect(300, 310, serverProgress, 40) // Progress bar
			ctx.fillStyle = '#FFFFFF'
			drawTextCentered(
				// @ts-ignore
				ctx,
				`${user.serverXp} / ${user.serverXpNeeded}`,
				300,
				310,
				500,
				40,
				20,
				'Industry'
			)
		} else {
			console.error('Server ranking data is undefined:', {
				serverLevel: user.serverLevel,
				serverRank: user.serverRank,
				serverXp: user.serverXp,
				serverXpNeeded: user.serverXpNeeded,
			})
		}

		const buffer = canvas.toBuffer('image/png')
		return buffer
	} catch (error) {
		console.error('Error generating ranking image:', error)
		throw error
	}
}

export { generateRankingImage }
