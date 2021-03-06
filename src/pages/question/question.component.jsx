import React from 'react'

import './question.styles.scss'

import { fetchAndUpdateQuestion } from '../../redux/question/question.actions'
import Question from '../../components/question/question.component'
import AnswerForm from '../../components/answer-form/answer-form.component'
import AnswerContainer from '../../components/answer-container/answer-container.component'

import { connect } from 'react-redux'

class QuestionPage extends React.Component {
	constructor() {
		super()
		this.state = {
			questionExists: true,
			displayAnswerForm: false,
			fetchedQuestion: false,
		}
	}
	toggleAnswerForm = () => {
		this.setState(state => ({
			displayAnswerForm: !state.displayAnswerForm,
		}))
	}
	renderAnswerForm = () => {
		const { displayAnswerForm } = this.state
		return displayAnswerForm ? (
			<AnswerForm toggleAnswerForm={this.toggleAnswerForm} />
		) : (
			''
		)
	}

	componentDidMount = async () => {
		const {
			fetchAndUpdateQuestion,
			match: { params },
		} = this.props
		const question = await fetchAndUpdateQuestion(params.questionId)
		if (!question) {
			this.setState({
				questionExists: false,
			})
		} else {
			this.setState({
				questionExists: true,
			})
		}
		this.setState({ fetchedQuestion: true })
	}
	render() {
		const { question } = this.props
		const { questionExists, fetchedQuestion } = this.state

		return (
			<div>
				{!fetchedQuestion && <h5>Loading question...</h5>}
				{questionExists ? (
					question ? (
						<div>
							<Question
								{...question}
								toggleAnswerForm={this.toggleAnswerForm}
								expanded
							/>
							{this.renderAnswerForm()}
							<AnswerContainer
								answerCount={question.answerCount}
							/>
						</div>
					) : (
						''
					)
				) : (
					<h3>Question Does Not Exist</h3>
				)}
			</div>
		)
	}
}

const mapStateToProps = (
	{ questions: { questions } },
	{ match: { params } }
) => {
	return {
		question: questions.find(question => question.id === params.questionId),
	}
}
const mapDispatchToProps = () => (dispatch, { match: { params } }) => ({
	fetchAndUpdateQuestion: () =>
		dispatch(fetchAndUpdateQuestion(params.questionId)),
})

export default connect(mapStateToProps, mapDispatchToProps)(QuestionPage)
