import { getApps, initializeApp } from 'firebase/app'
import {
	getFirestore,
	doc,
	getDoc,
	setDoc,
	getDocs,
	collection,
	writeBatch,
} from 'firebase/firestore'

const firebaseConfig = {
	apiKey: process.env.FIREBASE_API_KEY,
	authDomain: process.env.FIREBASE_AUTH_DOMAIN,
	projectId: process.env.FIREBASE_PROJECT_ID,
	storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.FIREBASE_APP_ID,
	measurementId: process.env.FIREBASE_MEASUREMENT_ID,
}

let db

export function initializeFirebase() {
	if (!getApps().length) {
		const firebaseApp = initializeApp(firebaseConfig)
		db = getFirestore(firebaseApp)
		console.log('Firebase initialized.')
	}
}

export { db, doc, getDoc, setDoc, getDocs, collection, writeBatch }
