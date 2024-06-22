import { initializeFirebase } from '../../db/firebase'

const checkDatabaseConnection = async () => {
	try {
		await initializeFirebase()
		return { status: 'online' }
	} catch (error) {
		console.error('Database connection error:', error)
		return { status: 'offline', error: error.message }
	}
}

export { checkDatabaseConnection }
