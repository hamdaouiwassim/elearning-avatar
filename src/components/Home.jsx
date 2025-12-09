import { useState, useEffect } from "react";
import { logout, getUserEmail } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const Home = ({ onStartLearning }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  useEffect(() => {
    setUserEmail(getUserEmail());
  }, []);

  // Close logout confirmation when clicking outside
  useEffect(() => {
    if (showLogoutConfirm) {
      const handleClickOutside = (event) => {
        if (!event.target.closest('.logout-container')) {
          setShowLogoutConfirm(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLogoutConfirm]);

  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        // Fetch all courses (with credentials to send session cookie)
        const coursesResponse = await fetch(`${API_URL}/api/courses`, {
          credentials: 'include' // Important: send session cookie
        });
        if (!coursesResponse.ok) {
          throw new Error(`HTTP error! status: ${coursesResponse.status}`);
        }
        const coursesData = await coursesResponse.json();
        const coursesArray = Array.isArray(coursesData) ? coursesData : [coursesData];
        
        // For each course, fetch its chapters (with credentials to send session cookie)
        const coursesWithChapters = await Promise.all(
          coursesArray.map(async (course) => {
            try {
              // Only fetch chapters if user is enrolled
              if (course.isEnrolled) {
                const chaptersResponse = await fetch(`${API_URL}/api/courses/${course.id}/chapters`, {
                  credentials: 'include' // Important: send session cookie
                });
                if (chaptersResponse.ok) {
                  const chapters = await chaptersResponse.json();
                  return {
                    ...course,
                    chapters: Array.isArray(chapters) ? chapters : []
                  };
                }
              }
              return { ...course, chapters: [] };
            } catch (err) {
              console.error(`Error loading chapters for course ${course.id}:`, err);
              return { ...course, chapters: [] };
            }
          })
        );
        
        setCourses(coursesWithChapters);
        console.log("coursesWithChapters", coursesWithChapters);
        setLoading(false);
      } catch (err) {
        console.error("Error loading courses:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload(); // Reload to show login page
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <p className="text-xl text-red-600 mb-4">Erreur lors du chargement des documents</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg"
          >
            Réessayer
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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-5xl font-black text-gray-800 mb-4">
                  Titan Academy
                </h1>
                <p className="text-xl text-gray-600">
                  Choisissez un document et commencez à apprendre avec votre assistant virtuel
                </p>
                {userEmail && (
                  <p className="text-sm text-gray-500 mt-2">
                    Connecté en tant que: <span className="font-semibold text-indigo-600">{userEmail}</span>
                  </p>
                )}
              </div>
              {userEmail && (
                <div className="relative logout-container">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
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
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Déconnexion
                  </button>
                  
                  {showLogoutConfirm && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl p-4 border border-gray-200 z-50 min-w-[250px]">
                      <p className="text-sm text-gray-700 mb-3">
                        Êtes-vous sûr de vouloir vous déconnecter?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleLogout}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                        >
                          Oui, déconnexion
                        </button>
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const firstChapter = course.chapters && course.chapters.length > 0 ? course.chapters[0] : null;
            const hasChapters = course.chapters && course.chapters.length > 0;
            const hasSubscription = course.userHasActiveSubscription || course.hasActiveSubscription || false;
            
            return (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Cours
                    </span>
                    {course.createdAt && (
                      <span className="text-xs text-gray-500">
                        {formatDate(course.createdAt)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {course.courseName}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-4 text-sm">
                    {course.courseDescription
                      ? `${course.courseDescription.substring(0, 200)}${
                          course.courseDescription.length > 200 ? "..." : ""
                        }`
                      : "Aucune description disponible"}
                  </p>
                  {course.courseDescription && course.courseDescription.length > 0 && (
                    <div className="mb-4 text-sm text-gray-500">
                      <span className="font-semibold text-gray-700">
                        Aperçu :
                      </span>{" "}
                      {course.courseDescription.length > 220
                        ? `${course.courseDescription.substring(0, 220)}...`
                        : course.courseDescription}
                    </div>
                  )}
                  {/* Enrollment Status */}
                  {course.isEnrolled && (
                    <div className="mb-4">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <i className="fas fa-check-circle mr-1"></i>
                        Inscrit
                      </span>
                    </div>
                  )}

                  {hasChapters && course.isEnrolled && (
                    <div className="mb-4 text-sm text-gray-500">
                      <span className="font-semibold text-gray-700">
                        Chapitres :
                      </span>{" "}
                      {course.chapters.length} chapitre{course.chapters.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* Action Button - Only show if user is enrolled */}
                  {course.isEnrolled ? (
                    <button
                      onClick={() => {
                        onStartLearning(course);
                      }}
                      disabled={!hasChapters}
                      className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        hasChapters
                          ? "bg-pink-500 hover:bg-pink-600 text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <span>
                        {hasChapters ? "Commencer l'apprentissage" : "Aucun chapitre disponible"}
                      </span>
                      {hasChapters && (
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
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Aucun cours disponible.</p>
          </div>
        )}
      </div>
    </div>
  );
};

