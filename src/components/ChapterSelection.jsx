import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const ChapterSelection = ({ course, onSelectChapter, onBackToHome }) => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadChapters = async () => {
      if (!course || !course.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/courses/${course.id}/chapters`, {
          credentials: 'include' // Important: send session cookie
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const chaptersArray = Array.isArray(data) ? data : [data];
        setChapters(chaptersArray);
        setLoading(false);
      } catch (err) {
        console.error("Error loading chapters:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadChapters();
  }, [course]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement des chapitres...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <p className="text-xl text-red-600 mb-4">Erreur lors du chargement des chapitres</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onBackToHome}
            className="mt-4 bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center md:text-left mb-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={onBackToHome}
                  className="mb-4 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  <span>Retour aux cours</span>
                </button>
                <h1 className="text-5xl font-black text-gray-800 mb-4">
                  {course.courseName}
                </h1>
                <p className="text-xl text-gray-600">
                  Choisissez un chapitre pour commencer l'apprentissage
                </p>
                {course.courseDescription && (
                  <p className="text-lg text-gray-500 mt-2">
                    {course.courseDescription}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chapters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105 cursor-pointer"
              onClick={() => {
                // Pass chapter with course info for WebP image display
                onSelectChapter({
                  ...chapter,
                  courseId: course.id,
                  courseName: course.courseName,
                  courseDescription: course.courseDescription
                });
              }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                    Chapitre
                  </span>
                  {chapter.numPagesVisual && (
                    <span className="text-xs text-gray-500">
                      {chapter.numPagesVisual} pages
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {chapter.chapterName}
                </h3>
                {chapter.chapterDescription && (
                  <p className="text-gray-600 mb-4 line-clamp-4 text-sm">
                    {chapter.chapterDescription.length > 200
                      ? `${chapter.chapterDescription.substring(0, 200)}...`
                      : chapter.chapterDescription}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  {chapter.statementsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
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
                      {chapter.statementsCount} exercices
                    </span>
                  )}
                  {chapter.webpImages && chapter.webpImages.length > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Images disponibles
                    </span>
                  )}
                </div>
                <button
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>Commencer l'apprentissage</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {chapters.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Aucun chapitre disponible pour ce cours.</p>
            <button
              onClick={onBackToHome}
              className="mt-4 bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg"
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

