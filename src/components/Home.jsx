import { useState, useEffect } from "react";
import { logout, getUserEmail } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const Home = ({ onStartLearning }) => {
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
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
        
        // For each course, fetch its chapters AND labs
        const coursesWithChapters = await Promise.all(
          coursesArray.map(async (course) => {
            try {
              let chapters = [];
              let labs = [];
              
              // Only fetch chapters if user is enrolled
              if (course.isEnrolled) {
                // Fetch chapters
                const chaptersResponse = await fetch(`${API_URL}/api/courses/${course.id}/chapters`, {
                  credentials: 'include' // Important: send session cookie
                });
                if (chaptersResponse.ok) {
                  chapters = await chaptersResponse.json();
                  chapters = Array.isArray(chapters) ? chapters : [];
                }
                
                // Fetch labs for enrolled courses
                try {
                  const labsResponse = await fetch(`${API_URL}/api/courses/${course.id}/labs`, {
                    credentials: 'include'
                  });
                  if (labsResponse.ok) {
                    labs = await labsResponse.json();
                    labs = Array.isArray(labs) ? labs : [];
                    console.log(`[Home] Loaded ${labs.length} labs for course ${course.id} (${course.courseName})`);
                  } else {
                    console.error(`[Home] Failed to load labs for course ${course.id}:`, labsResponse.status, labsResponse.statusText);
                  }
                } catch (err) {
                  console.error(`[Home] Error loading labs for course ${course.id}:`, err);
                }
              }
              
              return {
                ...course,
                chapters,
                labs,
                hasLabs: labs.length > 0
              };
            } catch (err) {
              console.error(`Error loading data for course ${course.id}:`, err);
              return { ...course, chapters: [], labs: [], hasLabs: false };
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

  // Filter courses based on search query
  const filteredCourses = searchQuery.trim() === ""
    ? courses
    : courses.filter((course) => {
        const query = searchQuery.toLowerCase();
        const name = (course.courseName || "").toLowerCase();
        const description = (course.courseDescription || "").toLowerCase();
        const courseId = (course.id || "").toLowerCase();
        return name.includes(query) || description.includes(query) || courseId.includes(query);
      });

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
              <div className="flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  alt="Titan Academy Logo" 
                  className="h-16 w-auto"
                />
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

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un cours par nom, description ou ID..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all bg-white shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                title="Effacer la recherche"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-center mt-2 text-sm text-gray-500">
              {filteredCourses.length === 0
                ? "Aucun cours trouvé"
                : `${filteredCourses.length} cours${filteredCourses.length !== 1 ? "s" : ""} trouvé${filteredCourses.length !== 1 ? "s" : ""}`}
            </div>
          )}
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const courseImageUrl = course.courseImage
              ? `${API_URL}/uploads/courses/${course.id}/${course.courseImage}`
              : null;
            const firstChapter = course.chapters && course.chapters.length > 0 ? course.chapters[0] : null;
            const hasChapters = course.chapters && course.chapters.length > 0;
            const hasSubscription = course.userHasActiveSubscription || course.hasActiveSubscription || false;
            
            return (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105"
              >
                {/* Course Image */}
                {courseImageUrl ? (
                  <div className="w-full h-48 overflow-hidden bg-gray-200">
                    <img
                      src={courseImageUrl}
                      alt={course.courseName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = "none";
                        if (e.target.nextElementSibling) {
                          e.target.nextElementSibling.style.display = "flex";
                        }
                      }}
                    />
                    <div
                      className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center"
                      style={{ display: "none" }}
                    >
                      <svg
                        className="w-16 h-16 text-white opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-white opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                )}
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

                  {/* Action Buttons */}
                  {course.isEnrolled && (
                    <div className="space-y-3">
                      {hasChapters && (
                        <button
                          onClick={() => {
                            onStartLearning(course);
                          }}
                          className="w-full font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white"
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
                      )}
                      
                      {/* Labs Button - Show if course has labs */}
                      {course.hasLabs && (
                        <button
                          onClick={() => {
                            if (window.handleOpenLabs) {
                              window.handleOpenLabs(course);
                            }
                          }}
                          className="w-full font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                          <i className="fas fa-flask mr-2"></i>
                          <span>Voir les Labs ({course.labs?.length || 0})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCourses.length === 0 && !loading && (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-xl text-gray-600 mb-2">Aucun cours ne correspond à votre recherche</p>
                <p className="text-gray-500">Essayez avec d'autres mots-clés</p>
              </>
            ) : (
              <p className="text-xl text-gray-600">Aucun cours disponible.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

