import Jimp from 'jimp'

/**
 * Fetches the dominant color from an image provided as a URL.
 * @param {string} imageUrl - The URL of the image.
 * @returns {Promise<string>} - The dominant color in HEX format.
 */
async function getDominantColor(imageUrl) {
	try {
		const image = await Jimp.read(imageUrl)
		const colorCounts = {}
		const width = image.bitmap.width
		const height = image.bitmap.height

		// Count occurrences of each color in the image
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const color = Jimp.intToRGBA(image.getPixelColor(x, y))
				const hexColor = rgbToHex(color.r, color.g, color.b)
				if (colorCounts[hexColor]) {
					colorCounts[hexColor]++
				} else {
					colorCounts[hexColor] = 1
				}
			}
		}

		// Find the color with the highest count
		let dominantColor = ''
		let maxCount = 0
		for (const [color, count] of Object.entries(colorCounts)) {
			if (typeof count === 'number' && count > maxCount) {
				maxCount = count
				dominantColor = color
			}
		}

		return dominantColor
	} catch (error) {
		console.error('Error fetching the dominant color:', error)
		throw error
	}
}

/**
 * Converts RGB values to HEX format.
 * @param {number} r - The red value (0-255).
 * @param {number} g - The green value (0-255).
 * @param {number} b - The blue value (0-255).
 * @returns {string} - The color in HEX format.
 */
function rgbToHex(r, g, b) {
	return `#${((1 << 24) + (r << 16) + (g << 8) + b)
		.toString(16)
		.slice(1)
		.toUpperCase()}`
}

export { getDominantColor }
