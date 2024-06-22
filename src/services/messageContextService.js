import OpenAI from 'openai'

const openai = new OpenAI(process.env.OPENAI_API_KEY)

async function evaluateMessageWithAPI(content) {
	try {
		const response = await openai.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `You are a Discord chat moderator and based on the context of the user's statement, determine whether it is a normal message, or if it is spam/flood or XP farming (on your basis, XP points are assigned, thanks to which the user levels up). Your only task is to write "spam" "not-spam"`,
				},
				{ role: 'user', content }, // Dynamically insert the message content to be evaluated
			],
			model: 'davinci-002',
		})

		// Extract the assistant's response
		const assistantResponse = response.data.choices[0].message.content
			.trim()
			.toLowerCase()

		// Determine if the response indicates the message is spam
		if (assistantResponse.includes('spam')) {
			return -10 // Penalty for spam
		}
	} catch (error) {
		console.error('Error calling OpenAI API:', error)
		return 0 // Handle error or unknown cases
	}
}

export { evaluateMessageWithAPI }
