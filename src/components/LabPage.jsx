import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { LabSpace } from "./LabSpace";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const LabPage = ({ onBackToHome, course }) => {
  const { setAudioElement, setAudioId, audioElement } = useChat();
  const audioRef = useRef(null);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [statements, setStatements] = useState([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [statementsError, setStatementsError] = useState(null);
  const [currentStatementIndex, setCurrentStatementIndex] = useState(0);

  useEffect(() => {
    if (!audioElement) {
      setIsAvatarSpeaking(false);
      return;
    }

    const handleAudioState = () => {
      const playing =
        !audioElement.paused &&
        !audioElement.ended &&
        (audioElement.currentTime || 0) > 0;
      setIsAvatarSpeaking(playing);
    };

    handleAudioState();
    const events = ["play", "pause", "ended", "timeupdate"];
    events.forEach((event) => audioElement.addEventListener(event, handleAudioState));

    return () => {
      events.forEach((event) =>
        audioElement.removeEventListener(event, handleAudioState)
      );
    };
  }, [audioElement]);

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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudioElement(null);
      setAudioId(null);
    };
  }, [setAudioElement, setAudioId]);

  const statementsEnabled = Boolean(course?.id && course?.hasStatements);

  useEffect(() => {
    let abort = false;

    if (!statementsEnabled) {
      setStatements([]);
      setStatementsError(null);
      setCurrentStatementIndex(0);
      return;
    }

    const loadStatements = async () => {
      setStatementsLoading(true);
      setStatementsError(null);
      try {
        // Use chapter endpoint if courseId is available, otherwise fallback to documents
        const statementsEndpoint = course.courseId
          ? `${API_URL}/api/courses/${course.courseId}/chapters/${course.id}/statements`
          : `${API_URL}/api/documents/${course.id}/statements`;
        
        const response = await fetch(statementsEndpoint);
        if (!response.ok) {
          throw new Error("Impossible de charger les exercices.");
        }
        const data = await response.json();
        if (abort) return;
        const fetched = Array.isArray(data.statements) ? data.statements : [];
        setStatements(fetched);
        setCurrentStatementIndex(0);
      } catch (error) {
        if (abort) return;
        setStatements([]);
        setStatementsError(error.message);
      } finally {
        if (!abort) {
          setStatementsLoading(false);
        }
      }
    };

    loadStatements();

    return () => {
      abort = true;
    };
  }, [course?.id, statementsEnabled]);

  const currentStatement = useMemo(() => {
    if (!course?.id || statements.length === 0) return null;
    return statements[Math.min(currentStatementIndex, statements.length - 1)];
  }, [course?.id, statements, currentStatementIndex]);

  const hasStatements = Boolean(statementsEnabled && statements.length > 0);

  useEffect(() => {
    console.log(
      "[LabPage] statements count:",
      statements.length,
      "| active statement:",
      currentStatementIndex + 1
    );
  }, [statements.length, currentStatementIndex]);

  const goToStatement = (index) => {
    setCurrentStatementIndex(index);
  };

  const goPrev = () => {
    if (statements.length === 0) return;
    setCurrentStatementIndex((prev) => Math.max(prev - 1, 0));
  };

  const goNext = () => {
    if (statements.length === 0) return;
    setCurrentStatementIndex((prev) => Math.min(prev + 1, statements.length - 1));
  };

  if (!statementsEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center px-4">
        <div className="bg-white/90 rounded-3xl shadow-2xl p-8 max-w-lg text-center space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Lab indisponible</h2>
          <p className="text-gray-600">
            Ce cours n'inclut pas encore de fichier d'énoncés. Ajoutez un PDF d'exercices aux documents du cours pour activer le laboratoire guidé.
          </p>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Retour à l’accueil
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 px-3 py-6 lg:px-6 lg:py-10 overflow-x-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
        <div className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-500">
                Titan Academy • Laboratoire
              </p>
              <h1 className="mt-2 text-3xl font-black text-gray-900 lg:text-4xl">
                {course?.courseName || course?.title || "Espace d’entraînement Python"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600 lg:text-base">
                Résolvez les exercices un à un, obtenez une analyse automatique et améliorez votre
                code directement dans l’éditeur intégré.
              </p>
              {course?.hasStatements && (
                <p className="mt-2 text-xs font-medium text-gray-500">
                  {statementsLoading
                    ? "Chargement des énoncés..."
                    : statements.length > 0
                    ? `${statements.length} énoncé(s) disponibles`
                    : "Aucun énoncé n’a pu être extrait de ce PDF."}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {onBackToHome && (
                <button
                  onClick={onBackToHome}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50"
                >
                  <span>Retour à l’accueil</span>
                </button>
              )}
              <div className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-500">
                  Progression
                </p>
                <p className="text-lg font-bold text-pink-600">
                  {statements.length > 0 ? currentStatementIndex + 1 : 0}
                  <span className="text-sm font-medium text-pink-400">
                    /{statements.length || 0}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,320px)_1fr]">
          <aside className="rounded-3xl border border-white/50 bg-white/90 p-4 shadow-xl backdrop-blur space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-pink-500">
                  Énoncé en cours
                </p>
                <p className="text-sm text-gray-500">
                  {statementsLoading
                    ? "Chargement..."
                    : statements.length > 0
                    ? `Énoncé ${currentStatementIndex + 1} / ${statements.length}`
                    : "Aucun énoncé disponible"}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={goPrev}
                  disabled={currentStatementIndex === 0}
                  className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Énoncé précédent"
                >
                  <span className="sr-only">Précédent</span>
                  ‹
                </button>
                <button
                  onClick={goNext}
                  disabled={currentStatementIndex >= statements.length - 1}
                  className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Énoncé suivant"
                >
                  <span className="sr-only">Suivant</span>
                  ›
                </button>
              </div>
            </div>

            {statementsError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {statementsError}
              </p>
            )}

            {statementsLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-pink-500"></div>
                Chargement des énoncés...
              </div>
            )}

            {!statementsLoading && !statementsError && statements.length === 0 && (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Aucun énoncé disponible pour ce cours.
              </p>
            )}

            {currentStatement && (
              <div className="space-y-3 rounded-2xl border border-pink-100 bg-pink-50/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-pink-500">
                  Page {currentStatement.page}
                </p>
                <h3 className="text-lg font-semibold text-gray-900">{currentStatement.title}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {currentStatement.body}
                </p>
              </div>
            )}

            {statements.length > 0 && (
              <div className="sticky top-4">
                <div className="h-[260px] sm:h-[500px] w-full">
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
            )}

        
          </aside>

          <section className="space-y-4 lg:space-y-6">
            {currentStatement && (
              <div className="rounded-3xl border border-white/50 bg-white/90 p-5 shadow-xl backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-pink-500">
                      Énoncé sélectionné
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-gray-900">{currentStatement.title}</h2>
                  </div>
                  {currentStatement.page && (
                    <span className="rounded-full border border-pink-100 bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600">
                      Page {currentStatement.page}
                    </span>
                  )}
                </div>
                <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
                  {currentStatement.body}
                </p>
              </div>
            )}

            <LabSpace
              onAvatarAudio={handleAvatarAudio}
              isAvatarSpeaking={isAvatarSpeaking}
              statement={currentStatement}
              docId={course?.id || null}
            />
          </section>
        </div>
      </div>


      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setIsAvatarSpeaking(true)}
        onPause={() => setIsAvatarSpeaking(false)}
        onEnded={() => setIsAvatarSpeaking(false)}
      />
    </div>
  );
}

