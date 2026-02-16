import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export const QuizManager = () => {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();

  const [chapterName, setChapterName] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    questionText: "",
    questionType: "single",
    options: ["", ""],
    correctAnswerIndex: 0,
    correctAnswerIndices: [],
    explanation: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const [chapterRes, quizRes] = await Promise.all([
        fetch(`${API_URL}/api/courses/${courseId}/chapters/${chapterId}`, {
          credentials: "include",
        }),
        fetch(
          `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/admin`,
          { credentials: "include" }
        ),
      ]);

      if (chapterRes.ok) {
        const ch = await chapterRes.json();
        setChapterName(ch.chapterName || ch.name || "");
      }

      if (quizRes.ok) {
        const data = await quizRes.json();
        setQuestions(data.questions || []);
      } else if (quizRes.status === 403) {
        setError("Accès administrateur requis");
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error("Error loading quiz questions:", err);
      setError("Erreur lors du chargement des questions");
    } finally {
      setLoading(false);
    }
  }, [courseId, chapterId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const resetForm = () => {
    setFormData({
      questionText: "",
      questionType: "single",
      options: ["", ""],
      correctAnswerIndex: 0,
      correctAnswerIndices: [],
      explanation: "",
    });
    setEditingQuestion(null);
    setFormError(null);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (question) => {
    setEditingQuestion(question);
    setFormData({
      questionText: question.questionText || "",
      questionType: question.questionType || "single",
      options: question.options ? [...question.options] : ["", ""],
      correctAnswerIndex: question.correctAnswerIndex ?? 0,
      correctAnswerIndices: question.correctAnswerIndices
        ? [...question.correctAnswerIndices]
        : [],
      explanation: question.explanation || "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const addOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) return;
    setFormData((prev) => {
      const newOptions = prev.options.filter((_, i) => i !== index);
      let newCorrectIndex = prev.correctAnswerIndex;
      if (newCorrectIndex >= newOptions.length) newCorrectIndex = 0;
      const newCorrectIndices = prev.correctAnswerIndices
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i));
      return {
        ...prev,
        options: newOptions,
        correctAnswerIndex: newCorrectIndex,
        correctAnswerIndices: newCorrectIndices,
      };
    });
  };

  const updateOption = (index, value) => {
    setFormData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  const toggleCorrectIndex = (index) => {
    setFormData((prev) => {
      const indices = prev.correctAnswerIndices.includes(index)
        ? prev.correctAnswerIndices.filter((i) => i !== index)
        : [...prev.correctAnswerIndices, index];
      return { ...prev, correctAnswerIndices: indices };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const validOptions = formData.options.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) {
      setFormError("Au moins 2 options non vides sont requises");
      return;
    }
    if (!formData.questionText.trim()) {
      setFormError("La question est requise");
      return;
    }
    if (
      formData.questionType === "multiple" &&
      formData.correctAnswerIndices.length === 0
    ) {
      setFormError(
        "Sélectionnez au moins une bonne réponse pour une question à choix multiple"
      );
      return;
    }

    setSaving(true);
    try {
      const body = {
        questionText: formData.questionText.trim(),
        questionType: formData.questionType,
        options: formData.options.map((o) => o.trim()).filter((o) => o.length > 0),
        explanation: formData.explanation.trim() || null,
      };

      if (formData.questionType === "single") {
        body.correctAnswerIndex = formData.correctAnswerIndex;
      } else {
        body.correctAnswerIndices = formData.correctAnswerIndices;
      }

      let url = `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/admin/questions`;
      let method = "POST";

      if (editingQuestion) {
        url += `/${editingQuestion.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      setShowForm(false);
      resetForm();
      await loadQuestions();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm("Supprimer cette question ?")) return;

    try {
      const res = await fetch(
        `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/admin/questions/${questionId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }
      await loadQuestions();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement des questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </button>
          <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-2">
            Gestion du Quiz
          </h1>
          {chapterName && (
            <p className="text-lg text-gray-600">Chapitre : {chapterName}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Add Question Button */}
        <div className="mb-6">
          <button
            onClick={openNewForm}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une question
          </button>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl text-gray-500 mb-2">Aucune question pour ce chapitre</p>
            <p className="text-gray-400">Cliquez sur "Ajouter une question" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-700 text-sm font-bold px-2.5 py-1 rounded-full">
                      Q{idx + 1}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      q.questionType === "multiple"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {q.questionType === "multiple" ? "Choix multiple" : "Choix unique"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(q)}
                      className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Modifier"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-gray-800 font-medium mb-3">{q.questionText}</p>
                <div className="space-y-1.5">
                  {(q.options || []).map((opt, optIdx) => {
                    const isCorrect =
                      q.questionType === "multiple"
                        ? (q.correctAnswerIndices || []).includes(optIdx)
                        : q.correctAnswerIndex === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm ${
                          isCorrect
                            ? "bg-green-50 border border-green-200 text-green-800"
                            : "bg-gray-50 border border-gray-100 text-gray-600"
                        }`}
                      >
                        {isCorrect && (
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Explication :</span> {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Question Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingQuestion ? "Modifier la question" : "Nouvelle question"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Question Text */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Question <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.questionText}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          questionText: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows="3"
                      placeholder="Entrez la question..."
                      required
                    />
                  </div>

                  {/* Question Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type de question
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="questionType"
                          value="single"
                          checked={formData.questionType === "single"}
                          onChange={() =>
                            setFormData((prev) => ({
                              ...prev,
                              questionType: "single",
                              correctAnswerIndices: [],
                            }))
                          }
                          className="text-purple-600"
                        />
                        <span className="text-sm">Choix unique</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="questionType"
                          value="multiple"
                          checked={formData.questionType === "multiple"}
                          onChange={() =>
                            setFormData((prev) => ({
                              ...prev,
                              questionType: "multiple",
                              correctAnswerIndex: 0,
                            }))
                          }
                          className="text-purple-600"
                        />
                        <span className="text-sm">Choix multiple</span>
                      </label>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Options <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {formData.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {formData.questionType === "single" ? (
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={formData.correctAnswerIndex === idx}
                              onChange={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  correctAnswerIndex: idx,
                                }))
                              }
                              className="text-green-600 flex-shrink-0"
                              title="Marquer comme bonne réponse"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={formData.correctAnswerIndices.includes(idx)}
                              onChange={() => toggleCorrectIndex(idx)}
                              className="text-green-600 flex-shrink-0 rounded"
                              title="Marquer comme bonne réponse"
                            />
                          )}
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            placeholder={`Option ${idx + 1}`}
                          />
                          {formData.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              className="text-red-400 hover:text-red-600 flex-shrink-0"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addOption}
                      className="mt-2 text-sm text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ajouter une option
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.questionType === "single"
                        ? "Sélectionnez le bouton radio pour indiquer la bonne réponse"
                        : "Cochez les cases pour indiquer les bonnes réponses"}
                    </p>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Explication (optionnel)
                    </label>
                    <textarea
                      value={formData.explanation}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          explanation: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      rows="2"
                      placeholder="Explication de la bonne réponse..."
                    />
                  </div>

                  {/* Error */}
                  {formError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm">{formError}</p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                      disabled={saving}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enregistrement...
                        </>
                      ) : editingQuestion ? (
                        "Mettre à jour"
                      ) : (
                        "Créer la question"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
