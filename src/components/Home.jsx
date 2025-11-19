import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const Home = ({ onStartLearning }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/documents`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Handle both array and single object responses
        const documentsArray = Array.isArray(data) ? data : [data];
        setDocuments(documentsArray);
        console.log("documentsArray",documentsArray);
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading documents:", err);
        setError(err.message);
        setLoading(false);
      });
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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-gray-800 mb-4">
            Titan Academy
          </h1>
          <p className="text-xl text-gray-600">
            Choisissez un document et commencez à apprendre avec votre assistant virtuel
          </p>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Cours
                  </span>
                  {doc.timestamp && (
                    <span className="text-xs text-gray-500">
                      {formatDate(doc.timestamp)}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {doc.courseName || doc.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-4 text-sm">
                  {doc.courseDescription
                    ? `${doc.courseDescription.substring(0, 200)}${
                        doc.courseDescription.length > 200 ? "..." : ""
                      }`
                    : "Aucune description disponible"}
                </p>
                {doc.courseDescription && doc.courseDescription.length > 0 && (
                  <div className="mb-4 text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">
                      Aperçu :
                    </span>{" "}
                    {doc.courseDescription.length > 220
                      ? `${doc.courseDescription.substring(0, 220)}...`
                      : doc.courseDescription}
                  </div>
                )}
                <button
                  onClick={() => onStartLearning(doc)}
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

        {documents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Aucun document disponible.</p>
          </div>
        )}
      </div>
    </div>
  );
};

