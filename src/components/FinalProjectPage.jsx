import { useState, useEffect, useMemo } from "react";

const API_URL = import.meta.env.VITE_API_URL ;

export const FinalProjectPage = ({ course, finalProject, onBackToHome }) => {
  const [project, setProject] = useState(finalProject);
  const [documents, setDocuments] = useState(finalProject?.documents || []);
  const [loading, setLoading] = useState(false); // Start with false since we already have data
  const [submission, setSubmission] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submissionComment, setSubmissionComment] = useState("");

  // Extract courseId in a stable way
  const courseId = useMemo(() => {
    return course?.courseId || course?.id;
  }, [course?.courseId, course?.id]);

  // Update project state when finalProject prop changes
  useEffect(() => {
    if (finalProject) {
      setProject(finalProject);
      setDocuments(finalProject.documents || []);
    }
  }, [finalProject]);

  // Load submission only once when component mounts or courseId changes
  useEffect(() => {
    if (!courseId) return;

    const loadSubmission = async () => {
      try {
        const response = await fetch(`${API_URL}/api/courses/${courseId}/final-project/submission`, {
          credentials: 'include'
        });
        if (response.ok) {
          const submissionData = await response.json();
          setSubmission(submissionData);
        } else if (response.status === 404) {
          // No submission yet
          setSubmission(null);
        }
      } catch (err) {
        console.error("Error loading submission:", err);
      }
    };

    loadSubmission();
  }, [courseId]); // Only depend on courseId, not the whole course object

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/zip', 'application/x-zip-compressed'];
      const validExtensions = ['.pdf', '.zip'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        setUploadError("Veuillez sélectionner un fichier PDF ou ZIP");
        setSelectedFile(null);
        return;
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError("Le fichier est trop volumineux (maximum 50MB)");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile && !submission) {
      setUploadError("Veuillez sélectionner un fichier");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      if (submissionComment.trim()) {
        formData.append('comment', submissionComment.trim());
      }

      if (!courseId) {
        setUploadError("Erreur: ID du cours non trouvé");
        setUploading(false);
        return;
      }

      const method = submission ? 'PUT' : 'POST';
      const response = await fetch(`${API_URL}/api/courses/${courseId}/final-project/submission`, {
        method: method,
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(true);
        setSelectedFile(null);
        setSubmissionComment("");
        // Reload submission after successful upload
        try {
          const response = await fetch(`${API_URL}/api/courses/${courseId}/final-project/submission`, {
            credentials: 'include'
          });
          if (response.ok) {
            const submissionData = await response.json();
            setSubmission(submissionData);
          } else if (response.status === 404) {
            setSubmission(null);
          }
        } catch (err) {
          console.error("Error reloading submission:", err);
        }
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      } else {
        setUploadError(data.error || 'Erreur lors de la soumission');
      }
    } catch (error) {
      console.error('Error submitting work:', error);
      setUploadError('Erreur lors de la soumission: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getDocumentPdfUrl = (documentId) => {
    if (!courseId) return '#';
    return `${API_URL}/api/courses/${courseId}/final-project/documents/${documentId}/pdf`;
  };

  const getSubmissionFileUrl = () => {
    if (!submission?.fileResource || !courseId) return null;
    return `${API_URL}/api/courses/${courseId}/final-project/submission/file`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement du projet final...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <i className="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
          <p className="text-xl text-gray-800 mb-4">Projet final non disponible</p>
          <p className="text-gray-600 mb-6">Aucun projet final n'a été configuré pour ce cours.</p>
          <button
            onClick={onBackToHome}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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
            <span>Retour à l'accueil</span>
          </button>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-4xl font-black text-gray-800 mb-2">{project.projectName}</h1>
            {project.projectDescription && (
              <p className="text-lg text-gray-600">{project.projectDescription}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Project Documents */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-file-pdf text-red-500"></i>
                Documents du Projet ({documents.length})
              </h2>
              
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-file-pdf text-4xl text-gray-300 mb-2"></i>
                  <p className="text-gray-500">Aucun document disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">{doc.documentName}</h3>
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

          {/* Right Column: Submission Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-upload text-orange-500"></i>
                Soumettre mon Travail
              </h2>

              {uploadSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check-circle text-green-600"></i>
                    <p className="text-green-800 font-medium">Travail soumis avec succès !</p>
                  </div>
                </div>
              )}

              {submission && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    Travail déjà soumis
                  </h3>
                  <p className="text-sm text-blue-700 mb-2">
                    Soumis le: {formatDate(submission.submittedAt)}
                  </p>
                  {submission.comment && (
                    <p className="text-sm text-blue-600 mb-3">
                      <strong>Commentaire:</strong> {submission.comment}
                    </p>
                  )}
                  {submission.fileResource && (
                    <a
                      href={getSubmissionFileUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      <i className="fas fa-download"></i>
                      <span>Télécharger mon fichier</span>
                    </a>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fichier (PDF ou ZIP) <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 transition-colors">
                    <input
                      type="file"
                      id="fileInput"
                      accept=".pdf,.zip"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="fileInput"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                      <p className="text-gray-700 font-medium mb-1">
                        {selectedFile ? selectedFile.name : submission ? "Cliquez pour remplacer le fichier" : "Cliquez pour sélectionner un fichier"}
                      </p>
                      <p className="text-sm text-gray-500">PDF ou ZIP (max 50MB)</p>
                      {selectedFile && (
                        <p className="text-xs text-gray-400 mt-1">
                          Taille: {formatFileSize(selectedFile.size)}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={submissionComment}
                    onChange={(e) => setSubmissionComment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows="4"
                    placeholder="Ajoutez un commentaire sur votre travail..."
                    disabled={uploading}
                  />
                </div>

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{uploadError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || (!selectedFile && !submission)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{submission ? 'Mise à jour...' : 'Soumission...'}</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>{submission ? 'Mettre à jour ma soumission' : 'Soumettre mon travail'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
