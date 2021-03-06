import React from 'react'
import './myquestion.styles.scss'

import { connect } from 'react-redux'
import { Redirect } from 'react-router-dom'
import { Helmet } from 'react-helmet'

import Question from '../../components/question/question.component'
import EditQuestion from '../../components/edit-question/edit-question.component'

import LoadMore from '../../components/load-more/load-more.component'

import {
	fetchByUidAndUpdateQuestions,
	fetchNextByUidAndUpdateQuestions,
} from '../../redux/question/question.actions'

class MyQuestionPage extends React.Component {
	constructor() {
		super()
		this.state = {
			questionsFetched: false,
		}
	}
	async componentDidMount() {
		const {
			fetchByUidAndUpdateQuestions,
			user: { uid },
		} = this.props
		if (!uid) {
			return
		}
		await fetchByUidAndUpdateQuestions(uid)
		this.setState({
			questionsFetched: true,
		})
	}
	render() {
		const {
			questions,
			allLoaded,
			fetchNextByUidAndUpdateQuestions,
			user: { isLoggedIn, uid },
		} = this.props
		const { questionsFetched } = this.state
		return (
			<div>
				<Helmet>
					<title>My Questions</title>
				</Helmet>
				<h3 className='pb-3 border-bottom'>My Questions</h3>
				{!isLoggedIn ? <Redirect to='/' /> : ''}
				{questions.map(question => (
					<div key={question.id}>
						<Question {...question} />
						<EditQuestion {...question} />
					</div>
				))}

				{!questionsFetched && <h5>Loading your questions...</h5>}
				{questionsFetched && questions.length === 0 && (
					<h6>No questions found</h6>
				)}
				{questionsFetched && (
					<LoadMore
						fetchNext={() => fetchNextByUidAndUpdateQuestions(uid)}
						allLoaded={allLoaded}
					/>
				)}
			</div>
		)
	}
}

const mapStateToProps = ({ questions: { questions, allLoaded }, user }) => ({
	questions,
	allLoaded,
	user,
})

const mapDispatchToProps = dispatch => ({
	fetchByUidAndUpdateQuestions: uid =>
		dispatch(fetchByUidAndUpdateQuestions(uid)),
	fetchNextByUidAndUpdateQuestions: uid =>
		dispatch(fetchNextByUidAndUpdateQuestions(uid)),
})

export default connect(mapStateToProps, mapDispatchToProps)(MyQuestionPage)
