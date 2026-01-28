import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL ;

export const Quiz = ({ courseId, chapterId, chapterName, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [bestScore, setBestScore] = useState(null);

  // Fetch quiz questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz`,
          {
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch quiz questions');
        }

        const data = await response.json();
        setQuestions(data.questions || []);
        
        // Initialize answers object
        const initialAnswers = {};
        data.questions.forEach(q => {
          initialAnswers[q.id] = null;
        });
        setAnswers(initialAnswers);
      } catch (err) {
        console.error('Error fetching quiz questions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (courseId && chapterId) {
      fetchQuestions();
      fetchAttempts();
    }
  }, [courseId, chapterId]);

  // Fetch quiz attempts
  const fetchAttempts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/attempts`,
        {
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAttempts(data.attempts || []);
        if (data.bestAttempt) {
          setBestScore(data.bestAttempt.percentage);
        }
      }
    } catch (err) {
      console.error('Error fetching quiz attempts:', err);
    }
  };

  const handleAnswerSelect = (questionId, selectedIndex) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedIndex
    }));
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredQuestions = questions.filter(q => answers[q.id] === null || answers[q.id] === undefined);
    if (unansweredQuestions.length > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions.length} unanswered question(s). Do you want to submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex: selectedIndex !== null ? selectedIndex : -1
      }));

      const response = await fetch(
        `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ answers: answersArray })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const data = await response.json();
      setResults(data);
      setSubmitted(true);
      fetchAttempts(); // Refresh attempts to show new best score
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSubmitted(false);
    setResults(null);
    // Initialize answers object
    const initialAnswers = {};
    questions.forEach(q => {
      initialAnswers[q.id] = null;
    });
    setAnswers(initialAnswers);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.values(answers).filter(a => a !== null && a !== undefined).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
            <p className="text-gray-600">Loading quiz questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <svg
              className="w-16 h-16 text-red-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Quiz</h3>
            <p className="text-gray-600 mb-6 text-center">{error}</p>
            <button
              onClick={onClose}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Quiz Available</h3>
            <p className="text-gray-600 mb-6 text-center">
              This chapter doesn't have a quiz yet. Check back later!
            </p>
            <button
              onClick={onClose}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results view
  if (submitted && results) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full my-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Results</h2>
              <p className="text-gray-600">{chapterName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Score Summary */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Your Score</p>
                <p className="text-4xl font-bold">{results.score} / {results.totalQuestions}</p>
                <p className="text-2xl mt-2">{results.percentage}%</p>
              </div>
              <div className="text-right">
                {results.isNewBest && (
                  <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg mb-2 font-bold">
                    🎉 New Best Score!
                  </div>
                )}
                {bestScore !== null && (
                  <p className="text-sm opacity-90">Best: {bestScore}%</p>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {results.answers.map((answer, index) => (
              <div
                key={answer.questionId}
                className={`border-2 rounded-lg p-4 ${
                  answer.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">
                    Question {index + 1}: {answer.questionText}
                  </h3>
                  {answer.isCorrect ? (
                    <span className="text-green-600 font-bold">✓ Correct</span>
                  ) : (
                    <span className="text-red-600 font-bold">✗ Incorrect</span>
                  )}
                </div>
                <div className="space-y-2">
                  {answer.options.map((option, optIndex) => {
                    const isSelected = optIndex === answer.selectedIndex;
                    const isCorrect = optIndex === answer.correctAnswerIndex;
                    let bgColor = 'bg-gray-100';
                    let textColor = 'text-gray-800';

                    if (isCorrect) {
                      bgColor = 'bg-green-200';
                      textColor = 'text-green-900';
                    } else if (isSelected && !isCorrect) {
                      bgColor = 'bg-red-200';
                      textColor = 'text-red-900';
                    }

                    return (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg ${bgColor} ${textColor}`}
                      >
                        <div className="flex items-center gap-2">
                          {isCorrect && <span className="font-bold">✓</span>}
                          {isSelected && !isCorrect && <span className="font-bold">✗</span>}
                          <span>{option}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {answer.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Explanation:</strong> {answer.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleRestart}
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Retake Quiz
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Chapter Quiz</h2>
            <p className="text-gray-600">{chapterName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {answeredCount} / {questions.length} answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-pink-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Navigation */}
        {questions.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {questions.map((q, index) => {
              const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined;
              const isCurrent = index === currentQuestionIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-pink-500 text-white'
                      : isAnswered
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Current Question */}
        {currentQuestion && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              {currentQuestion.questionText}
            </h3>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === index;
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500'
                            : 'border-gray-400'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className="text-gray-800">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            Previous
          </button>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1))}
              className="px-6 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors font-semibold"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
