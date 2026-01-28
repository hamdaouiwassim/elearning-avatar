import { useState, useEffect } from "react";
import { LabSpace } from "./LabSpace";

const API_URL = import.meta.env.VITE_API_URL ;

export const CourseLabs = ({ course, onBackToHome, onSelectLab }) => {
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLabs = async () => {
      if (!course?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_URL}/api/courses/${course.id}/labs`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to load labs');
        }
        
        const labsData = await response.json();
        const labsArray = Array.isArray(labsData) ? labsData : [];
        setLabs(labsArray);
        
        // Automatically navigate to LabPage with the first lab if available and callback exists
        if (labsArray.length > 0 && onSelectLab) {
          onSelectLab(course, labsArray[0]);
          return;
        }
        
        // Otherwise, select first lab in this component
        if (labsArray.length > 0) {
          const firstLab = labsArray[0];
          setSelectedLab(firstLab);
          
          // Load exercises for the first lab
          try {
            const exercisesResponse = await fetch(`${API_URL}/api/labs/${firstLab.id}/exercises`, {
              credentials: 'include'
            });
            
            if (exercisesResponse.ok) {
              const exercisesData = await exercisesResponse.json();
              setExercises(Array.isArray(exercisesData) ? exercisesData : []);
            }
          } catch (err) {
            console.error('Error loading exercises for first lab:', err);
          }
        }
      } catch (err) {
        console.error('Error loading labs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLabs();
  }, [course?.id, onSelectLab]); // Add onSelectLab to dependencies

  const handleSelectLab = async (lab) => {
    // If onSelectLab callback is provided, use it to navigate to LabPage
    if (onSelectLab) {
      onSelectLab(course, lab);
      return;
    }
    
    // Otherwise, show exercises in this component
    setSelectedLab(lab);
    setSelectedExercise(null);
    
    try {
      const response = await fetch(`${API_URL}/api/labs/${lab.id}/exercises`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const exercisesData = await response.json();
        setExercises(Array.isArray(exercisesData) ? exercisesData : []);
      }
    } catch (err) {
      console.error('Error loading exercises:', err);
    }
  };

  const handleSelectExercise = (exercise) => {
    // If onSelectLab callback exists, navigate to LabPage with the selected lab and exercise
    // The LabPage will handle showing the exercise
    if (onSelectLab && selectedLab) {
      onSelectLab(course, selectedLab);
      // Note: We can't pass exercise directly, but LabPage will show the first exercise by default
      // Or we could modify the flow to pass exercise info
      return;
    }
    
    // Otherwise, show exercise in this component
    setSelectedExercise(exercise);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Chargement des labs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <p className="text-xl text-red-600 mb-4">Erreur</p>
          <p className="text-gray-600">{error}</p>
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

  // Show exercise view if exercise is selected
  if (selectedExercise) {
    return (
      <ExerciseView
        exercise={selectedExercise}
        lab={selectedLab}
        onBack={() => setSelectedExercise(null)}
        onBackToHome={onBackToHome}
      />
    );
  }

  // Show exercises list if lab is selected
  if (selectedLab) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => {
                  setSelectedLab(null);
                  setExercises([]);
                }}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour aux labs
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={onBackToHome}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Retour à l'accueil
              </button>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedLab.labName}</h2>
            {selectedLab.labDescription && (
              <p className="text-gray-600">{selectedLab.labDescription}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Type: <span className="font-semibold">{selectedLab.labType}</span>
            </p>
          </div>

          {exercises.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-600">Aucun exercice disponible pour ce lab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 cursor-pointer"
                  onClick={() => handleSelectExercise(exercise)}
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{exercise.exerciseName}</h3>
                  {exercise.exerciseDescription && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {exercise.exerciseDescription}
                    </p>
                  )}
                  {exercise.pdfResource && (
                    <span className="inline-flex items-center gap-2 text-sm text-blue-600">
                      <i className="fas fa-file-pdf"></i>
                      PDF disponible
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show labs list (only if no lab is selected, which shouldn't happen now, but kept for safety)
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={onBackToHome}
            className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour à l'accueil
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Labs - {course.courseName}
          </h1>
          <p className="text-gray-600">{course.courseDescription}</p>
        </div>

        {labs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <i className="fas fa-flask text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-600 text-lg">Aucun lab disponible pour ce cours.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((lab) => (
              <div
                key={lab.id}
                className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 cursor-pointer ${
                  selectedLab?.id === lab.id ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => handleSelectLab(lab)}
              >
                <div className="flex items-start justify-between mb-4">
                  <i className="fas fa-flask text-3xl text-indigo-500"></i>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-semibold">
                    {lab.labType}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{lab.labName}</h3>
                {lab.labDescription && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {lab.labDescription}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    <i className="fas fa-dumbbell mr-1"></i>
                    {lab.exercisesCount || 0} exercice{lab.exercisesCount !== 1 ? 's' : ''}
                  </span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Exercise View Component with Code Interpreter
const ExerciseView = ({ exercise, lab, onBack, onBackToHome }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (exercise?.pdfResource && exercise?.id) {
      setLoadingPdf(true);
      setPdfUrl(`${API_URL}/api/exercises/${exercise.id}/pdf`);
      setLoadingPdf(false);
    }
  }, [exercise]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour aux exercices
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={onBackToHome}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Retour à l'accueil
            </button>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{exercise.exerciseName}</h2>
          {exercise.exerciseDescription && (
            <p className="text-gray-600">{exercise.exerciseDescription}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PDF Viewer */}
          {pdfUrl && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-file-pdf text-red-500"></i>
                Énoncé de l'exercice
              </h3>
              {loadingPdf ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-pink-500"></div>
                </div>
              ) : (
                <iframe
                  src={pdfUrl}
                  className="w-full h-96 rounded-lg border border-gray-200"
                  title="Exercise PDF"
                />
              )}
            </div>
          )}

          {/* Code Interpreter */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <LabSpace
              exercise={exercise}
              defaultInstructions={exercise.exerciseDescription || "Résous l'exercice en écrivant ton code."}
              docId={exercise.id}
              statement={{
                id: exercise.id,
                title: exercise.exerciseName,
                body: exercise.exerciseDescription || ""
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
