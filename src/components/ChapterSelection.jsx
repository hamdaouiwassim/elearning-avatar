import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

// Modal pour visualiser le projet final et ses documents
const FinalProjectViewModal = ({ course, finalProject, onClose, onRefresh }) => {
  const [documents, setDocuments] = useState(finalProject?.documents || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load documents if not already loaded
    if (finalProject && (!finalProject.documents || finalProject.documents.length === 0)) {
      loadDocuments();
    } else {
      setDocuments(finalProject?.documents || []);
    }
  }, [finalProject]);

  const loadDocuments = async () => {
    if (!course?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/courses/${course.id}/final-project`, {
        credentials: 'include'
      });
      if (response.ok) {
        const project = await response.json();
        setDocuments(project.documents || []);
      }
    } catch (err) {
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentPdfUrl = (documentId) => {
    return `${API_URL}/api/courses/${course.id}/final-project/documents/${documentId}/pdf`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-gray-800">{finalProject?.projectName || 'Projet Final'}</h3>
            {finalProject?.projectDescription && (
              <p className="text-sm text-gray-600 mt-1">{finalProject.projectDescription}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-file-pdf text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 text-lg">Aucun document disponible</p>
              <p className="text-gray-400 text-sm mt-2">Les documents seront affichés ici une fois ajoutés</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Documents ({documents.length})
              </h4>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-800 mb-1">{doc.documentName}</h5>
                      {doc.documentDescription && (
                        <p className="text-sm text-gray-600 mb-3">{doc.documentDescription}</p>
                      )}
                      <a
                        href={getDocumentPdfUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        <i className="fas fa-file-pdf"></i>
                        <span>Voir le PDF</span>
                        <i className="fas fa-external-link-alt text-xs"></i>
                      </a>
                    </div>
                    <div className="ml-4">
                      <i className="fas fa-file-pdf text-3xl text-red-500"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChapterSelection = ({ course, onSelectChapter, onBackToHome }) => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFinalProjectModal, setShowFinalProjectModal] = useState(false);
  const [finalProject, setFinalProject] = useState(null);
  const [checkingFinalProject, setCheckingFinalProject] = useState(true);
  const [showFinalProjectView, setShowFinalProjectView] = useState(false);
  const [hasLabs, setHasLabs] = useState(false);

  const checkFinalProject = useCallback(async () => {
    if (!course?.id) {
      setCheckingFinalProject(false);
      return;
    }

    setCheckingFinalProject(true);
    try {
      const response = await fetch(`${API_URL}/api/courses/${course.id}/final-project`, {
        credentials: 'include'
      });
      if (response.ok) {
        const project = await response.json();
        setFinalProject(project);
      } else if (response.status === 404) {
        // No final project exists yet
        setFinalProject(null);
      } else {
        console.error("Error checking final project:", response.status, response.statusText);
        setFinalProject(null);
      }
    } catch (err) {
      console.error("Error checking final project:", err);
      setFinalProject(null);
    } finally {
      setCheckingFinalProject(false);
    }
  }, [course]);

  const checkLabs = useCallback(async () => {
    if (!course?.id) {
      setHasLabs(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/courses/${course.id}/labs`, {
        credentials: 'include'
      });
      if (response.ok) {
        const labs = await response.json();
        const labsArray = Array.isArray(labs) ? labs : [];
        setHasLabs(labsArray.length > 0);
      } else {
        setHasLabs(false);
      }
    } catch (err) {
      console.error("Error checking labs:", err);
      setHasLabs(false);
    }
  }, [course]);

  useEffect(() => {
    if (!course || !course.id) {
      setLoading(false);
      return;
    }

    const loadChapters = async () => {
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
    checkFinalProject();
    checkLabs();
  }, [course, checkFinalProject, checkLabs]);


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
        <div className="mb-12">
          <div className="flex flex-col gap-6">
            <button
              onClick={onBackToHome}
              className="self-start text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
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
            
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
                  {course.courseName}
                </h1>
                <p className="text-lg md:text-xl text-gray-600">
                  Choisissez un chapitre pour commencer l'apprentissage
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar with Labs and Final Project buttons */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Actions</h2>
            <div className="space-y-3">
              {/* Accéder aux labs button */}
              {hasLabs && (
                <button
                  onClick={() => {
                    if (window.handleOpenLabs) {
                      window.handleOpenLabs(course);
                    }
                  }}
                  className="w-full font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  <i className="fas fa-flask mr-2"></i>
                  <span>Accéder aux labs</span>
                </button>
              )}

              {/* Final Project button */}
              {checkingFinalProject ? (
                <button
                  disabled
                  className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow-lg cursor-not-allowed"
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Vérification...</span>
                </button>
              ) : finalProject ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowFinalProjectView(true)}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Voir le projet final</span>
                  </button>
                  <button
                    onClick={() => setShowFinalProjectModal(true)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>Modifier</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowFinalProjectModal(true)}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Ajouter le projet final</span>
                </button>
              )}
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

        {/* Modal pour ajouter/modifier le projet final */}
        {showFinalProjectModal && (
          <FinalProjectModal
            course={course}
            finalProject={finalProject}
            onClose={() => {
              setShowFinalProjectModal(false);
            }}
            onSuccess={async () => {
              setShowFinalProjectModal(false);
              await checkFinalProject();
            }}
          />
        )}

        {/* Modal pour visualiser le projet final et ses documents */}
        {showFinalProjectView && finalProject && (
          <FinalProjectViewModal
            course={course}
            finalProject={finalProject}
            onClose={() => {
              setShowFinalProjectView(false);
            }}
            onRefresh={async () => {
              await checkFinalProject();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Modal pour créer/modifier le projet final et ajouter des documents
const FinalProjectModal = ({ course, finalProject, onClose, onSuccess }) => {
  const [projectName, setProjectName] = useState(finalProject?.projectName || "");
  const [projectDescription, setProjectDescription] = useState(finalProject?.projectDescription || "");
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (finalProject) {
      setProjectName(finalProject.projectName || "");
      setProjectDescription(finalProject.projectDescription || "");
    }
  }, [finalProject]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      alert("Seuls les fichiers PDF sont acceptés.");
    }
    
    setDocuments(prev => [...prev, ...pdfFiles.map(file => ({
      file,
      name: file.name,
      exerciseName: file.name.replace('.pdf', ''),
      exerciseDescription: ""
    }))]);
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const updateDocumentName = (index, name) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, exerciseName: name } : doc
    ));
  };

  const updateDocumentDescription = (index, description) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, exerciseDescription: description } : doc
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      setUploadError("Le nom du projet final est requis");
      return;
    }

    if (!finalProject && documents.length === 0) {
      setUploadError("Veuillez ajouter au moins un document");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      let projectId;
      
      if (finalProject) {
        // Étape 1: Mettre à jour le projet final existant
        const updateResponse = await fetch(`${API_URL}/api/courses/${course.id}/final-project`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            projectName: projectName.trim(),
            projectDescription: projectDescription.trim() || null
          })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Erreur lors de la mise à jour du projet final');
        }

        projectId = finalProject.id;
      } else {
        // Étape 1: Créer le projet final
        const projectResponse = await fetch(`${API_URL}/api/courses/${course.id}/final-project`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            projectName: projectName.trim(),
            projectDescription: projectDescription.trim() || null
          })
        });

        if (!projectResponse.ok) {
          const errorData = await projectResponse.json();
          throw new Error(errorData.error || 'Erreur lors de la création du projet final');
        }

        const projectData = await projectResponse.json();
        projectId = projectData.id;
      }

      // Étape 2: Ajouter les nouveaux documents au projet final
      const uploadPromises = documents.map(async (doc) => {
        const formData = new FormData();
        formData.append('documentName', doc.exerciseName.trim() || doc.name.replace('.pdf', ''));
        if (doc.exerciseDescription.trim()) {
          formData.append('documentDescription', doc.exerciseDescription.trim());
        }
        formData.append('pdfResource', doc.file);

        const documentResponse = await fetch(`${API_URL}/api/courses/${course.id}/final-project/documents`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!documentResponse.ok) {
          const errorData = await documentResponse.json();
          throw new Error(errorData.error || `Erreur lors de l'ajout du document ${doc.name}`);
        }

        return documentResponse.json();
      });

      await Promise.all(uploadPromises);

      setUploadSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error('Error creating/updating final project:', error);
      setUploadError(error.message || 'Erreur lors de la création/mise à jour du projet final');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800">
              {finalProject ? 'Modifier le projet final' : 'Ajouter le projet final'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {uploadSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-gray-800 mb-2">Mini projet créé avec succès !</p>
              <p className="text-gray-600">Les documents ont été ajoutés au mini projet.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Nom du mini projet */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom du projet final <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Projet de fin de module"
                    required
                  />
                </div>

                {/* Description du projet final */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                    placeholder="Description du projet final..."
                  />
                </div>

                {/* Upload de documents */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Documents PDF <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                    <input
                      type="file"
                      id="fileInput"
                      accept=".pdf"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="fileInput"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-gray-600 font-medium">Cliquez pour ajouter des fichiers PDF</span>
                      <span className="text-sm text-gray-500 mt-1">ou glissez-déposez les fichiers ici</span>
                    </label>
                  </div>
                </div>

                {/* Liste des documents ajoutés */}
                {documents.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Documents ajoutés ({documents.length})
                    </h3>
                    {documents.map((doc, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{doc.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={doc.exerciseName}
                            onChange={(e) => updateDocumentName(index, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Nom du document"
                          />
                          <textarea
                            value={doc.exerciseDescription}
                            onChange={(e) => updateDocumentDescription(index, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            rows="2"
                            placeholder="Description (optionnel)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages d'erreur */}
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{uploadError}</p>
                  </div>
                )}

                {/* Boutons */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                    disabled={uploading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading || documents.length === 0 || !miniProjetName.trim()}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Création en cours...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Créer le mini projet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

