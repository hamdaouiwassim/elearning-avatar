import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ;

export const LabSpace = ({
  onAvatarAudio,
  isAvatarSpeaking,
  defaultInstructions = "Explique le résultat et propose une amélioration si besoin.",
  statement = null,
  docId = null,
}) => {
  const [code, setCode] = useState("");
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);

  useEffect(() => {
    if (statement) {
      const intro = `Analyse et guide l'élève sur l'exercice "${statement.title}".`;
      const condensed = statement.body.length > 600 ? `${statement.body.slice(0, 600)}...` : statement.body;
      setInstructions(`${intro}\n${condensed}`);
    } else {
      setInstructions(defaultInstructions);
    }
  }, [statement?.id, defaultInstructions]);

  const runPython = async ({ correction = isCorrectionMode } = {}) => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    // Check for empty code
    if (!code || !code.trim()) {
      try {
        const response = await fetch(`${API_URL}/api/lab/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: 'empty_input' }),
        });

        const payload = await response.json();

        if (payload.feedback?.audioUrl && onAvatarAudio) {
          onAvatarAudio({
            audioUrl: payload.feedback.audioUrl,
            audioId: payload.feedback.audioId,
          });
        }

        setError("La zone d'interprétation est vide.");
      } catch (err) {
        console.error("Error fetching feedback:", err);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/lab/python/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          instructions: correction
            ? `${instructions}\n\nAnalyse l'exercice en profondeur et propose une correction étape par étape.`
            : instructions,
          stdin: stdin.trim().length > 0 ? stdin : undefined,
          docId,
          statementId: statement?.id,
          statementTitle: statement?.title,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Échec de l'exécution Python.");
      }

      setResult(payload);

      if (payload.feedback?.audioUrl && onAvatarAudio) {
        onAvatarAudio({
          audioUrl: payload.feedback.audioUrl,
          audioId: payload.feedback.audioId,
        });
      }
    } catch (err) {
      setError(err.message || "Erreur inattendue.");
    } finally {
      setIsRunning(false);
    }
  };

  const canReplayAvatar = !!result?.feedback?.audioUrl;

  return (
    <div className="w-full">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-pink-100 p-4 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-pink-500 font-semibold">
              Laboratoire interactif
            </p>
            <h3 className="text-xl font-bold text-gray-900">Espace Python</h3>
            <p className="text-sm text-gray-500">
              Écris ton code, exécute-le et laisse l’avatar te coacher.
            </p>
          </div>
          {isAvatarSpeaking && (
            <span className="flex items-center gap-2 text-pink-600 text-xs font-semibold bg-pink-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
              Avatar actif
            </span>
          )}
        </div>

        {statement && (
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-pink-600 font-semibold">
                Exercice {statement.order || statement.page}
              </p>
              {statement.page && (
                <span className="text-xs text-pink-500">Page {statement.page}</span>
              )}
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              {statement.title}
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {statement.body}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600 uppercase">
              Zone d’interprétation
            </label>
            <span className="text-xs text-gray-400">
              Python 3 - sortie temps réel
            </span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={8}
            className="w-full font-mono text-sm bg-gray-900 text-green-200 rounded-xl p-3 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="print('Hello Titan Academy!')"
          />
        </div>


        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase">
            Mode d’exécution
          </span>
          <div className="flex rounded-full bg-gray-100 p-1 text-xs font-semibold text-gray-500">
            <button
              onClick={() => setIsCorrectionMode(false)}
              className={`px-3 py-1 rounded-full transition ${!isCorrectionMode ? "bg-white text-pink-600 shadow" : ""
                }`}
            >
              Exécuter
            </button>
            <button
              onClick={() => setIsCorrectionMode(true)}
              className={`px-3 py-1 rounded-full transition ${isCorrectionMode ? "bg-white text-purple-600 shadow" : ""
                }`}
            >
              Corriger
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => runPython({ correction: isCorrectionMode })}
            disabled={isRunning}
            className={`flex-1 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-xl shadow-lg transition ${isRunning ? "opacity-60 cursor-not-allowed" : ""
              }`}
          >
            {isRunning
              ? isCorrectionMode
                ? "Analyse..."
                : "Exécution..."
              : isCorrectionMode
                ? "Lancer la correction"
                : "Exécuter le code"}
          </button>
          <button
            onClick={() =>
              canReplayAvatar &&
              onAvatarAudio({
                audioUrl: result.feedback.audioUrl,
                audioId: result.feedback.audioId,
              })
            }
            disabled={!canReplayAvatar}
            className={`px-4 py-3 rounded-xl border font-semibold text-sm transition ${canReplayAvatar
                ? "border-pink-400 text-pink-600 hover:bg-pink-50"
                : "border-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            Rejouer l’avatar
          </button>
        </div>

        {result?.evaluation && (
          <div
            className={`p-4 rounded-2xl border ${result.evaluation.status === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
              }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <span>
                {result.evaluation.status === "success"
                  ? "✅ Code valide"
                  : "❌ Code invalide"}
              </span>
              <span className="text-xs uppercase">
                {result.evaluation.status === "success" ? "True" : "False"}
              </span>
            </div>
            <p className="text-sm mt-1">{result.evaluation.message}</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs uppercase text-gray-500 font-semibold">
                  Sortie (stdout)
                </p>
                <pre className="text-gray-800 mt-1 whitespace-pre-wrap text-xs max-h-32 overflow-auto">
                  {result.run.stdout || "Aucune sortie"}
                </pre>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs uppercase text-gray-500 font-semibold">
                  Erreurs (stderr)
                </p>
                <pre className="text-gray-800 mt-1 whitespace-pre-wrap text-xs max-h-32 overflow-auto">
                  {result.run.stderr || "Aucune erreur"}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-pink-50 border border-pink-200 rounded-2xl">
              <p className="text-xs uppercase text-pink-600 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                Feedback de l’avatar
              </p>
              <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
                {result.feedback?.text || "Pas de retour disponible."}
              </p>
              <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                <span>
                  Durée : {(result.run.durationMs / 1000).toFixed(2)}s
                  {result.run.timedOut && " • Temps dépassé"}
                </span>
                {result.feedback?.mood && (
                  <span className="capitalize">
                    Humeur avatar : {result.feedback.mood}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

