

export const ExerciseSidebar = ({
    exercises,
    loading,
    error,
    currentIndex,
    onNext,
    onPrev
}) => {
    return (
        <aside className="rounded-3xl border border-white/50 bg-white/90 p-4 shadow-xl backdrop-blur space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-pink-500">
                        Exercice en cours
                    </p>
                    <p className="text-sm text-gray-500">
                        {loading
                            ? "Chargement..."
                            : exercises.length > 0
                                ? `Exercice ${currentIndex + 1} / ${exercises.length}`
                                : "Aucun exercice disponible"}
                    </p>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={onPrev}
                        disabled={currentIndex === 0}
                        className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Exercice précédent"
                    >
                        <span className="sr-only">Précédent</span>
                        ‹
                    </button>
                    <button
                        onClick={onNext}
                        disabled={currentIndex >= exercises.length - 1}
                        className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Exercice suivant"
                    >
                        <span className="sr-only">Suivant</span>
                        ›
                    </button>
                </div>
            </div>

            {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </p>
            )}

            {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-pink-500"></div>
                    Chargement des exercices...
                </div>
            )}

            {!loading && !error && exercises.length === 0 && (
                <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Aucun exercice disponible pour ce lab.
                </p>
            )}


        </aside>
    );
};
