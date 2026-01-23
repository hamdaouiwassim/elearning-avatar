import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Avatar } from "./Avatar";
import { useChat } from "../hooks/useChat";
import { useAudioState } from "../hooks/useAudioState";
import { Leva } from "leva";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const QuizPage = () => {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex } or { questionId: selectedIndices[] } for multiple
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [bestScore, setBestScore] = useState(null);
  const [chapterName, setChapterName] = useState("");
  
  // Avatar hooks
  const { setAudioElement, setAudioId, setLipSyncUrl } = useChat();
  const audioRef = useRef(null);
  const isAvatarSpeaking = useAudioState();

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudioElement(null);
      setAudioId(null);
      setLipSyncUrl(null);
    };
  }, [setAudioElement, setAudioId, setLipSyncUrl]);

  // Handle avatar audio playback
  const handleAvatarAudio = useCallback(
    async ({ audioUrl, audioId, lipSyncUrl }) => {
      if (!audioRef.current || !audioUrl) {
        return false;
      }

      const resolvedUrl = audioUrl.startsWith("http")
        ? audioUrl
        : `${API_URL}${audioUrl}`;

      try {
        audioRef.current.src = resolvedUrl;
        audioRef.current.load();
        setAudioElement(audioRef.current);
        setAudioId(audioId || null);
        setLipSyncUrl(lipSyncUrl ?? null);
        await audioRef.current.play();
        return true;
      } catch (error) {
        console.error("Error playing quiz avatar audio:", error);
        return false;
      }
    },
    [setAudioElement, setAudioId, setLipSyncUrl]
  );

  // Fetch chapter info and quiz questions
  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !chapterId) {
        setError('Missing course or chapter ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch chapter info
        const chapterResponse = await fetch(
          `${API_URL}/api/courses/${courseId}/chapters/${chapterId}`,
          { credentials: 'include' }
        );
        
        if (chapterResponse.ok) {
          const chapter = await chapterResponse.json();
          setChapterName(chapter.chapterName || chapter.title || 'Chapter');
        }

        // Fetch quiz questions
        const quizResponse = await fetch(
          `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz`,
          { credentials: 'include' }
        );

        if (!quizResponse.ok) {
          if (quizResponse.status === 404) {
            setError('No quiz available for this chapter');
          } else {
            throw new Error('Failed to fetch quiz questions');
          }
          setLoading(false);
          return;
        }

        const data = await quizResponse.json();
        console.log('Quiz data received:', data); // Debug log
        
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          
        // Initialize answers object
        const initialAnswers = {};
        data.questions.forEach(q => {
          initialAnswers[q.id] = q.questionType === 'multiple' ? [] : null;
        });
        setAnswers(initialAnswers);
        
        // Show welcome message from avatar
        await showWelcomeMessage(data.questions.length);
        } else {
          setQuestions([]);
        }
        
        // Fetch attempts
        await fetchAttempts();
      } catch (err) {
        console.error('Error fetching quiz data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, chapterId]);

  // Fetch quiz attempts
  const fetchAttempts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/attempts`,
        { credentials: 'include' }
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

  const handleAnswerSelect = (questionId, selectedIndex, questionType = 'single') => {
    if (submitted) return;
    
    if (questionType === 'multiple') {
      // Multiple-choice: toggle selection
      setAnswers(prev => {
        const current = prev[questionId] || [];
        const currentIndices = Array.isArray(current) ? current : [];
        const index = selectedIndex;
        
        if (currentIndices.includes(index)) {
          // Deselect
          return {
            ...prev,
            [questionId]: currentIndices.filter(i => i !== index)
          };
        } else {
          // Select
          return {
            ...prev,
            [questionId]: [...currentIndices, index].sort((a, b) => a - b)
          };
        }
      });
    } else {
      // Single-choice: replace selection
      setAnswers(prev => ({
        ...prev,
        [questionId]: selectedIndex
      }));
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredQuestions = questions.filter(q => {
      const answer = answers[q.id];
      if (q.questionType === 'multiple') {
        return !answer || !Array.isArray(answer) || answer.length === 0;
      } else {
        return answer === null || answer === undefined;
      }
    });
    
    if (unansweredQuestions.length > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions.length} unanswered question(s). Do you want to submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => {
        const question = questions.find(q => q.id === questionId);
        const isMultiple = question?.questionType === 'multiple';
        
        if (isMultiple) {
          return {
            questionId,
            selectedIndices: Array.isArray(answer) ? answer : []
          };
        } else {
          return {
            questionId,
            selectedIndex: answer !== null && answer !== undefined ? answer : -1
          };
        }
      });

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
      
      // Get avatar feedback explaining quiz errors
      await fetchQuizFeedback(data);
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
      initialAnswers[q.id] = q.questionType === 'multiple' ? [] : null;
    });
    setAnswers(initialAnswers);
  };

  const handleBack = () => {
    navigate(`/courses/${courseId}/chapters/${chapterId}/learn`);
  };

  // Show welcome message when quiz starts
  const showWelcomeMessage = async (totalQuestions) => {
    try {
      const welcomeText = `Bonjour ! Je vais t'accompagner pendant ce quiz. Il y a ${totalQuestions} question${totalQuestions > 1 ? 's' : ''} à répondre. Prends ton temps, lis bien chaque question et sélectionne la ou les bonnes réponses. Je serai là pour t'aider si tu as besoin. Bonne chance !`;

      const response = await fetch(
        `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            feedbackText: welcomeText
          })
        }
      );

      if (response.ok) {
        const payload = await response.json();
        if (payload.feedback?.audioUrl && handleAvatarAudio) {
          await handleAvatarAudio({
            audioUrl: payload.feedback.audioUrl,
            audioId: payload.feedback.audioId,
            lipSyncUrl: payload.feedback.lipSyncUrl ?? null,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching welcome message:', err);
      // Don't show error to user, welcome message is optional
    }
  };

  // Fetch avatar feedback for quiz results
  const fetchQuizFeedback = async (quizResults) => {
    try {
      const incorrectAnswers = quizResults.answers.filter(a => !a.isCorrect);
      const correctCount = quizResults.score;
      const totalCount = quizResults.totalQuestions;
      const percentage = quizResults.percentage;

      // Build feedback text based on results
      let feedbackText = "";
      if (percentage === 100) {
        feedbackText = `Félicitations ! Tu as obtenu un score parfait de ${percentage}% ! Tu as répondu correctement à toutes les ${totalCount} questions. Continue comme ça !`;
      } else if (percentage >= 80) {
        feedbackText = `Excellent travail ! Tu as obtenu ${correctCount} sur ${totalCount} questions, soit ${percentage}%. C'est un très bon score !`;
        if (incorrectAnswers.length > 0) {
          feedbackText += ` Tu as fait ${incorrectAnswers.length} erreur(s). Je vais t'expliquer les bonnes réponses.`;
        }
      } else if (percentage >= 60) {
        feedbackText = `Bon effort ! Tu as obtenu ${correctCount} sur ${totalCount} questions, soit ${percentage}%. Il y a encore quelques points à améliorer.`;
        if (incorrectAnswers.length > 0) {
          feedbackText += ` Tu as fait ${incorrectAnswers.length} erreur(s). Laisse-moi t'expliquer les bonnes réponses pour que tu puisses mieux comprendre.`;
        }
      } else {
        feedbackText = `Tu as obtenu ${correctCount} sur ${totalCount} questions, soit ${percentage}%. Ne te décourage pas, c'est normal de faire des erreurs quand on apprend !`;
        if (incorrectAnswers.length > 0) {
          feedbackText += ` Tu as fait ${incorrectAnswers.length} erreur(s). Je vais t'expliquer en détail les bonnes réponses pour que tu comprennes mieux.`;
        }
      }

      // Add details about incorrect answers
      if (incorrectAnswers.length > 0) {
        feedbackText += " Voici les questions où tu as fait des erreurs : ";
        incorrectAnswers.slice(0, 3).forEach((answer, idx) => {
          feedbackText += `Question ${idx + 1} : ${answer.questionText}. `;
          if (answer.explanation) {
            feedbackText += `Explication : ${answer.explanation}. `;
          }
        });
        if (incorrectAnswers.length > 3) {
          feedbackText += `Et ${incorrectAnswers.length - 3} autre(s) question(s). `;
        }
        feedbackText += "N'hésite pas à revoir le chapitre pour mieux comprendre ces concepts.";
      }

      const response = await fetch(
        `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            feedbackText,
            score: correctCount,
            totalQuestions: totalCount,
            percentage,
            incorrectCount: incorrectAnswers.length
          })
        }
      );

      if (response.ok) {
        const payload = await response.json();
        if (payload.feedback?.audioUrl && handleAvatarAudio) {
          await handleAvatarAudio({
            audioUrl: payload.feedback.audioUrl,
            audioId: payload.feedback.audioId,
            lipSyncUrl: payload.feedback.lipSyncUrl ?? null,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching quiz feedback:', err);
      // Don't show error to user, avatar feedback is optional
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.entries(answers).filter(([questionId, answer]) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.questionType === 'multiple') {
      return Array.isArray(answer) && answer.length > 0;
    } else {
      return answer !== null && answer !== undefined;
    }
  }).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
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
              onClick={handleBack}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
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
              onClick={handleBack}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results view
  if (submitted && results) {
    return (
      <>
      <Leva hidden />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Column */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 h-[400px] p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-center text-gray-800 mb-2">Assistant</h3>
                  {isAvatarSpeaking && (
                    <div className="flex items-center gap-2 justify-center text-sm text-pink-600 mb-2">
                      <div className="w-2 h-2 text-center bg-pink-500 rounded-full animate-pulse"></div>
                      Avatar actif
                    </div>
                  )}
                </div>
                <Canvas
                  camera={{ position: [0, 1.9, 2.4], fov: 22 }}
                  dpr={[1, 1.8]}
                  gl={{ antialias: true, alpha: true }}
                >
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[2, 3, 2]} intensity={0.8} />
                  <Suspense fallback={null}>
                    <group position-y={-1.7} rotation={[-0.5, 0, 0]}>
                      <Avatar />
                    </group>
                  </Suspense>
                </Canvas>
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Results</h2>
              <p className="text-gray-600">{chapterName}</p>
            </div>
            <button
              onClick={handleBack}
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
                  {answer.options && answer.options.map((option, optIndex) => {
                    const isMultiple = answer.questionType === 'multiple';
                    const isSelected = isMultiple
                      ? (Array.isArray(answer.selectedIndices) && answer.selectedIndices.includes(optIndex))
                      : (optIndex === answer.selectedIndex);
                    const isCorrect = isMultiple
                      ? (Array.isArray(answer.correctAnswerIndices) && answer.correctAnswerIndices.includes(optIndex))
                      : (optIndex === answer.correctAnswerIndex);
                    let bgColor = 'bg-gray-100';
                    let textColor = 'text-gray-800';

                    if (isCorrect && isSelected) {
                      bgColor = 'bg-green-200';
                      textColor = 'text-green-900';
                    } else if (isCorrect && !isSelected) {
                      bgColor = 'bg-yellow-100';
                      textColor = 'text-yellow-900';
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
                          {isCorrect && !isSelected && isMultiple && <span className="text-yellow-700 text-xs">(Correct but not selected)</span>}
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
              onClick={handleBack}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Back to Chapter
            </button>
          </div>
        </div>
        </div>
        </div>
      </div>
      
      {/* Hidden Audio Element for Avatar */}
      <audio
        ref={audioRef}
        className="hidden"
      />
    </div>
    </>
    );
  }

  // Quiz view
  return (
    <>
    <Leva hidden />
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 h-[400px]  p-4">
              <div className="mb-4">
                <h3 className="text-lg text-center font-semibold text-gray-800 mb-2">Assistant</h3>
                {isAvatarSpeaking && (
                  <div className="flex items-center gap-2 justify-center text-sm text-pink-600 mb-2">
                    <div className="w-2 h-2 text-center bg-pink-500 rounded-full animate-pulse"></div>
                    Avatar actif
                  </div>
                )}
              </div>
              <Canvas
                camera={{ position: [0, 1.9, 2.4], fov: 22 }}
                dpr={[1, 1.8]}
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[2, 3, 2]} intensity={0.8} />
                <Suspense fallback={null}>
                  <group position-y={-1.7} rotation={[-0.5, 0, 0]}>
                    <Avatar />
                  </group>
                </Suspense>
              </Canvas>
            </div>
          </div>

          {/* Quiz Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-2xl p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Chapter Quiz</h2>
                  <p className="text-gray-600">{chapterName}</p>
                </div>
                <button
                  onClick={handleBack}
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
                    const answer = answers[q.id];
                    const isAnswered = q.questionType === 'multiple' 
                      ? (Array.isArray(answer) && answer.length > 0)
                      : (answer !== null && answer !== undefined);
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
                    {currentQuestion.questionType === 'multiple' && (
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Multiple Choice:</strong> Select all that apply
                        </p>
                      </div>
                    )}
                    {currentQuestion.options && currentQuestion.options.length > 0 ? (
                      currentQuestion.options.map((option, index) => {
                        const isMultiple = currentQuestion.questionType === 'multiple';
                        const answer = answers[currentQuestion.id];
                        const isSelected = isMultiple
                          ? (Array.isArray(answer) && answer.includes(index))
                          : (answer === index);
                        
                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(currentQuestion.id, index, currentQuestion.questionType)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-pink-500 bg-pink-50'
                                : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isMultiple ? (
                                <div
                                  className={`w-5 h-5 border-2 flex items-center justify-center rounded ${
                                    isSelected
                                      ? 'border-pink-500 bg-pink-500'
                                      : 'border-gray-400 bg-white'
                                  }`}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              ) : (
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
                              )}
                              <span className="text-gray-800">{option}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          ⚠️ No options available for this question. Please contact support.
                        </p>
                      </div>
                    )}
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
        </div>
      </div>
      
      {/* Hidden Audio Element for Avatar */}
      <audio
        ref={audioRef}
        className="hidden"
      />
    </div>
    </>
  );
};
