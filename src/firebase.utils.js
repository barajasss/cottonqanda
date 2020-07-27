import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'

const firebaseConfig = {
	apiKey: 'AIzaSyBUm7VDXmBH8HjHaOMSdvwtn_OkuQEY3GA',
	authDomain: 'cottonqna.firebaseapp.com',
	databaseURL: 'https://cottonqna.firebaseio.com',
	projectId: 'cottonqna',
	storageBucket: 'cottonqna.appspot.com',
	messagingSenderId: '674077307541',
	appId: '1:674077307541:web:215e7318e66aab12aba19c',
}

firebase.initializeApp(firebaseConfig)

const googleSignIn = () => {
	firebase
		.auth()
		.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
		.then(() => {
			const provider = new firebase.auth.GoogleAuthProvider()
			return firebase.auth().signInWithPopup(provider)
		})
		.catch(err => {
			console.log(err)
		})
}

const googleSignOut = () => {
	firebase.auth().signOut()
}

const fetchUserById = async uid => {
	const userDoc = await firebase
		.firestore()
		.collection('users')
		.doc(uid)
		.get()
	if (userDoc.exists) {
		return userDoc.data()
	}
	return null
}

/////////////////////////////

// QUESTION CONTROLLER

////////////////////////////

//
// UTILS
//

const getDocStartAt = async (collection, start = 0, limit = 5) => {
	const totalDocs = (await firebase.firestore().collection(collection).get())
		.docs.length
	let allLoaded = false
	let newVisible, first
	if (start === 0) {
		newVisible = (
			await firebase
				.firestore()
				.collection(collection)
				.orderBy('createdAt', 'desc')
				.limit(1)
				.get()
		).docs[0]
	} else {
		first = await firebase
			.firestore()
			.collection(collection)
			.orderBy('createdAt', 'desc')
			.limit(start + 1)
			.get()
		newVisible = first.docs[first.docs.length - 1]
	}
	if ((first && first.docs.length === totalDocs) || totalDocs <= limit) {
		allLoaded = true
	}
	return [newVisible, allLoaded]
}

const questionWithAnswersAndUpvotes = async (
	questionDoc,
	getFirstAnswer = false
) => {
	if (!questionDoc.exists) {
		return null
	}
	let answers = await firebase
		.firestore()
		.collection('answers')
		.where('questionId', '==', questionDoc.id)
		.get()
	let upvotesCollection = await firebase
		.firestore()
		.collection(`/questions/${questionDoc.id}/upvotes`)
		.get()
	if (upvotesCollection.empty) {
		upvotesCollection = []
	} else {
		upvotesCollection = upvotesCollection.docs
	}
	const question = {
		id: questionDoc.id,
		...questionDoc.data(),
		upvotes: upvotesCollection,
		firstAnswer: null,
		answerCount: answers.docs.length,
	}
	if (getFirstAnswer && !answers.empty) {
		let firstAnswerUpvotes = await firebase
			.firestore()
			.collection(`/answers/${answers.docs[0].id}/upvotes`)
			.get()
		if (firstAnswerUpvotes.empty) {
			firstAnswerUpvotes = []
		} else {
			firstAnswerUpvotes = firstAnswerUpvotes.docs
		}
		question.firstAnswer = {
			id: answers.docs[0].id,
			...answers.docs[0].data(),
			upvotes: firstAnswerUpvotes,
		}
	}
	return question
}
// END OF UTILS //

const postQuestion = async ({
	uid,
	displayName,
	photoURL,
	question,
	category,
	discipline,
	tags,
}) => {
	await firebase.firestore().collection('questions').add({
		uid,
		displayName,
		photoURL,
		question,
		category,
		discipline,
		tags,
		createdAt: Date.now(),
	})
}

const fetchQuestion = async questionId => {
	try {
		const questionDoc = await firebase
			.firestore()
			.doc(`/questions/${questionId}`)
			.get()
		const question = questionWithAnswersAndUpvotes(questionDoc)
		return question
	} catch (err) {
		console.log(err)
		return null
	}
}

const searchQuestions = async (searchTerm = '') => {
	const questions = []
	try {
		let questionsRef = firebase
			.firestore()
			.collection('questions')
			.orderBy('createdAt', 'asc')
		if (searchTerm.length !== 0) {
			questionsRef = questionsRef
				.where('tags', 'array-contains', searchTerm)
				.limit(20)
		} else {
			questionsRef = questionsRef.limit(20)
		}
		let questionsCollection = await questionsRef.get()
		await Promise.all(
			questionsCollection.docs.map(async questionDoc => {
				const question = await questionWithAnswersAndUpvotes(
					questionDoc,
					true
				)
				questions.push(question)
			})
		)
		return questions
	} catch (err) {
		console.log(err)
		return []
	}
}

const fetchQuestions = async (start = 0) => {
	const questions = []
	const limit = 5
	const [newVisible, allLoaded] = await getDocStartAt(
		'questions',
		start,
		limit
	)
	try {
		const questionsRef = await firebase
			.firestore()
			.collection('questions')
			.orderBy('createdAt', 'desc')
			.startAt(newVisible)
			.limit(limit)
			.get()

		for (let questionDoc of questionsRef.docs) {
			const question = await questionWithAnswersAndUpvotes(
				questionDoc,
				true
			)
			questions.push(question)
		}
		return { questions, allLoaded }
	} catch (err) {
		console.log(err)
		return { questions: [], allLoaded }
	}
}

const fetchQuestionsByUid = async uid => {
	const questions = []
	try {
		const questionsRef = await firebase
			.firestore()
			.collection('questions')
			.where('uid', '==', uid)
			.orderBy('createdAt', 'desc')
			.get()
		for (let questionDoc of questionsRef.docs) {
			const question = await questionWithAnswersAndUpvotes(questionDoc)
			questions.push(question)
		}
		return questions
	} catch (err) {
		console.log(err)
		return []
	}
}

const updateQuestionFirebase = async ({
	id,
	question,
	category,
	discipline,
	tags,
}) => {
	try {
		await firebase.firestore().collection('questions').doc(id).set(
			{
				question,
				category,
				discipline,
				tags,
			},
			{ merge: true }
		)
		const questionDoc = await firebase
			.firestore()
			.doc(`/questions/${id}`)
			.get()
		const updatedQuestion = await questionWithAnswersAndUpvotes(questionDoc)
		return updatedQuestion
	} catch (err) {
		return null
	}
}

const deleteQuestionFirebase = async questionId => {
	try {
		await firebase.firestore().doc(`/questions/${questionId}`).delete()
		const answers = await firebase
			.firestore()
			.collection(`answers`)
			.where('questionId', '==', questionId)
			.get()
		const upvotes = await firebase
			.firestore()
			.collectionGroup('upvotes')
			.where('questionId', '==', questionId)
			.get()

		if (!upvotes.empty) {
			await Promise.all(
				upvotes.docs.map(async upvoteDoc => {
					await upvoteDoc.ref.delete()
				})
			)
		}
		if (!answers.empty) {
			await Promise.all(
				answers.docs.map(async answerDoc => {
					await answerDoc.ref.delete()
				})
			)
		}
	} catch (err) {
		console.log(err)
	}
}

const upvoteQuestion = async (uid, questionId) => {
	if (!uid || !questionId) {
		return
	}
	try {
		await firebase
			.firestore()
			.collection(`/questions/${questionId}/upvotes`)
			.doc(uid)
			.set(
				{
					uid,
					questionId,
				},
				{ merge: true }
			)
		let upvotes = await firebase
			.firestore()
			.collection(`/questions/${questionId}/upvotes`)
			.get()
		if (upvotes.empty) {
			upvotes = []
		} else {
			upvotes = upvotes.docs
		}
		return {
			id: questionId,
			upvotes,
		}
	} catch (err) {
		console.log(err)
		return null
	}
}

const deUpvoteQuestion = async (uid, questionId) => {
	try {
		await firebase
			.firestore()
			.collection(`/questions/${questionId}/upvotes`)
			.doc(uid)
			.delete()
		let upvotes = await firebase
			.firestore()
			.collection(`/questions/${questionId}/upvotes`)
			.get()

		if (upvotes.empty) {
			upvotes = []
		} else {
			upvotes = upvotes.docs
		}
		return {
			id: questionId,
			upvotes,
		}
	} catch (err) {
		console.log(err)
		return null
	}
}

/////////////////////////////////////

// ANSWER CONTROLLERS

////////////////////////////////////

// ANSWER UTILS //

const answerWithUpvotes = async answerDoc => {
	let upvotes = await firebase
		.firestore()
		.collection(`/answers/${answerDoc.id}/upvotes`)
		.get()
	if (upvotes.empty) {
		upvotes = []
	} else {
		upvotes = upvotes.docs
	}
	const answer = {
		id: answerDoc.id,
		...answerDoc.data(),
		upvotes,
	}
	return answer
}

// END OF ANSWER UITILS //

const postAnswer = async ({
	uid,
	questionId,
	displayName,
	photoURL,
	answer,
}) => {
	const answerDoc = await firebase.firestore().collection('answers').add({
		uid,
		questionId,
		displayName,
		photoURL,
		answer,
		createdAt: Date.now(),
	})
	const answerDocData = await firebase
		.firestore()
		.collection('answers')
		.doc(answerDoc.id)
		.get()
	const answerData = {
		id: answerDoc.id,
		...answerDocData.data(),
		upvotes: [],
	}
	return answerData
}

const fetchAnswers = async questionId => {
	try {
		const answersRef = await firebase
			.firestore()
			.collection('answers')
			.where('questionId', '==', questionId)
			.orderBy('createdAt', 'desc')
			.get()
		let answers = []
		for (let answerDoc of answersRef.docs) {
			const answer = await answerWithUpvotes(answerDoc)
			answers.push(answer)
		}
		return answers
	} catch (err) {
		console.log(err)
		return []
	}
}

const fetchAnswersByUid = async uid => {
	const answers = []
	try {
		const answersRef = await firebase
			.firestore()
			.collection('answers')
			.where('uid', '==', uid)
			.orderBy('createdAt', 'desc')
			.get()
		await Promise.all(
			answersRef.docs.map(async answerDoc => {
				const answer = await answerWithUpvotes(answerDoc)
				answers.push(answer)
			})
		)
		return answers
	} catch (err) {
		console.log(err)
		return []
	}
}

const updateAnswerFirebase = async ({ id, answer }) => {
	try {
		await firebase
			.firestore()
			.collection('answers')
			.doc(id)
			.set({ answer }, { merge: true })
		const answerDoc = await firebase.firestore().doc(`/answers/${id}`).get()
		const updatedAnswer = await answerWithUpvotes(answerDoc)
		return updatedAnswer
	} catch (err) {
		return null
	}
}

const deleteAnswerFirebase = async answerId => {
	try {
		await firebase.firestore().doc(`/answers/${answerId}`).delete()
		const upvotes = await firebase
			.firestore()
			.collectionGroup('upvotes')
			.where('answerId', '==', answerId)
			.get()

		if (!upvotes.empty) {
			await Promise.all(
				upvotes.docs.map(async upvoteDoc => {
					await upvoteDoc.ref.delete()
				})
			)
		}
	} catch (err) {
		console.log(err)
	}
}

const upvoteAnswer = async (uid, questionId, answerId) => {
	if (!uid || !questionId || !answerId) {
		return
	}
	try {
		await firebase
			.firestore()
			.collection(`/answers/${answerId}/upvotes`)
			.doc(uid)
			.set(
				{
					uid,
					questionId,
					answerId,
				},
				{ merge: true }
			)
		let upvotes = await firebase
			.firestore()
			.collection(`/answers/${answerId}/upvotes`)
			.get()
		if (upvotes.empty) {
			upvotes = []
		} else {
			upvotes = upvotes.docs
		}
		return {
			id: answerId,
			upvotes,
		}
	} catch (err) {
		console.log(err)
		return null
	}
}

const deUpvoteAnswer = async (uid, answerId) => {
	try {
		await firebase
			.firestore()
			.collection(`/answers/${answerId}/upvotes`)
			.doc(uid)
			.delete()
		let upvotes = await firebase
			.firestore()
			.collection(`/answers/${answerId}/upvotes`)
			.get()

		if (upvotes.empty) {
			upvotes = []
		} else {
			upvotes = upvotes.docs
		}
		return {
			id: answerId,
			upvotes,
		}
	} catch (err) {
		console.log(err)
		return null
	}
}

export {
	firebase,
	googleSignIn,
	googleSignOut,
	fetchUserById,
	// question controllers
	postQuestion,
	fetchQuestions,
	searchQuestions,
	fetchQuestionsByUid,
	fetchQuestion,
	updateQuestionFirebase,
	deleteQuestionFirebase,
	upvoteQuestion,
	deUpvoteQuestion,
	// answer controllers
	postAnswer,
	fetchAnswers,
	fetchAnswersByUid,
	updateAnswerFirebase,
	deleteAnswerFirebase,
	upvoteAnswer,
	deUpvoteAnswer,
}
