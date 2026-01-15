import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LabSpace } from "./LabSpace";
import { useChat } from "../hooks/useChat";
import { useAudioState } from "../hooks/useAudioState";
import { useExercises } from "../hooks/useExercises";
import { ExerciseSidebar } from "./ExerciseSidebar";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Avatar } from "./Avatar";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const LabPage = ({ onBackToHome, course, lab, initialExercise = null }) => {
  // --- Hooks & State ---
  const { setAudioElement, setAudioId } = useChat();
  const audioRef = useRef(null);

  // Custom hooks for logic extraction
  const isAvatarSpeaking = useAudioState();
  const { exercises, loading: exercisesLoading, error: exercisesError } = useExercises(lab?.id);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // --- Effects ---

  // Initialize exercise selection
  useEffect(() => {
    if (initialExercise && exercises.length > 0) {
      const exerciseIndex = exercises.findIndex(ex => ex.id === initialExercise.id);
      if (exerciseIndex !== -1) {
        setCurrentExerciseIndex(exerciseIndex);
        // If specific exercise requested via props, maybe auto-start? 
        // For now, we stick to the requested "Intro View" flow.
      }
    }
  }, [initialExercise, exercises]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudioElement(null);
      setAudioId(null);
    };
  }, [setAudioElement, setAudioId]);

  // --- Callbacks ---

  const handleAvatarAudio = useCallback(
    async ({ audioUrl, audioId }) => {
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
        await audioRef.current.play();
        return true;
      } catch (error) {
        console.error("Error playing lab audio:", error);
        return false;
      }
    },
    [setAudioElement, setAudioId]
  );

  // --- Derived State ---

  const currentExercise = useMemo(() => {
    if (!lab?.id || exercises.length === 0) return null;
    return exercises[Math.min(currentExerciseIndex, exercises.length - 1)];
  }, [lab?.id, exercises, currentExerciseIndex]);

  // --- Event Handlers ---

  const goPrev = () => {
    if (exercises.length === 0) return;
    setCurrentExerciseIndex((prev) => Math.max(prev - 1, 0));
  };

  const goNext = () => {
    if (exercises.length === 0) return;
    setCurrentExerciseIndex((prev) => Math.min(prev + 1, exercises.length - 1));
  };

  // --- Render ---

  // Error State: No Lab Selected
  if (!lab?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center px-4">
        <div className="bg-white/90 rounded-3xl shadow-2xl p-8 max-w-lg text-center space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Lab indisponible</h2>
          <p className="text-gray-600">
            Aucun lab sélectionné. Veuillez sélectionner un lab depuis la page des cours.
          </p>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Retour à l'accueil
            </button>
          )}
        </div>
      </div>
    );
  }

  // 1. Loading State (Centered)
  if (exercisesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="bg-white/90 rounded-3xl shadow-xl p-8 flex items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-pink-500"></div>
          <p className="font-medium text-gray-700">Chargement du laboratoire...</p>
        </div>
      </div>
    );
  }

  // 2. Intro View (Before Starting)
  if (!hasStarted && exercises.length > 0) {
    const firstEx = exercises[0];
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl p-8 md:p-12 max-w-3xl w-full text-center space-y-8 border border-white/50">

          <div className="space-y-2">
            <div className="inline-block rounded-full bg-pink-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-pink-600">
              {lab.labName || "Nouveau Challenge"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              {firstEx.exerciseName}
            </h1>
          </div>

          <div className="prose prose-lg prose-gray mx-auto text-gray-600 leading-relaxed">
            <p>{firstEx.exerciseDescription || "Prêt à relever le défi ? Cliquez ci-dessous pour commencer."}</p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <button
              onClick={() => setHasStarted(true)}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-pink-600 px-8 py-4 font-bold text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-pink-500 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-pink-300"
            >
              <span className="relative flex items-center gap-3 text-lg">
                Commencer le Lab
                <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition"
              >
                Retourner à l'accueil
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              {exercises.length} étape{exercises.length > 1 ? 's' : ''} dans ce module
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Main Interface (After Starting)
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 px-3 py-6 lg:px-6 lg:py-10 overflow-x-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">

        {/* Header Section */}
        <div className="p-2 md:p-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Titan Academy Logo" 
                className="h-10 w-auto"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-600">
                  Titan Academy • Laboratoire
                </p>
              <h1 className="mt-2 text-3xl font-black text-gray-800 lg:text-5xl">
                {lab?.labName || course?.courseName || "Espace d'entraînement"}
              </h1>
              {lab?.labType && (
                <p className="mt-2 text-xs font-medium text-gray-600">
                  Type: <span className="font-semibold">{lab.labType}</span>
                </p>
              )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {onBackToHome && (
                <button
                  onClick={onBackToHome}
                  className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/50 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80"
                >
                  <span>Retour à l'accueil</span>
                </button>
              )}
              <div className="rounded-2xl border border-white/50 bg-white/50 px-4 py-2 text-center backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-600">
                  Progression
                </p>
                <p className="text-lg font-bold text-pink-600">
                  {exercises.length > 0 ? currentExerciseIndex + 1 : 0}
                  <span className="text-sm font-medium text-pink-400">
                    /{exercises.length || 0}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section: Sidebar + Workspace */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,320px)_1fr]">

          <div className="flex flex-col gap-6">
            <ExerciseSidebar
              exercises={exercises}
              loading={exercisesLoading}
              error={exercisesError}
              currentIndex={currentExerciseIndex}
              onNext={goNext}
              onPrev={goPrev}
            />
            {/* Avatar - Relative to Page but positioned in this column */}
            {exercises.length > 0 && (
              <div className="sticky top-6 h-[400px]">
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
            )}
          </div>

          <section className="space-y-4 lg:space-y-6">
            <LabSpace
              onAvatarAudio={handleAvatarAudio}
              isAvatarSpeaking={isAvatarSpeaking}
              statement={currentExercise ? {
                id: currentExercise.id,
                title: currentExercise.exerciseName,
                body: currentExercise.exerciseDescription || ""
              } : null}
              docId={currentExercise?.id || null}
            />
          </section>
        </div>
      </div>

      {/* Hidden Audio Element for Avatar */}
      <audio
        ref={audioRef}
        className="hidden"
      />
    </div>
  );
};
