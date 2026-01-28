import { useState, useEffect, useRef, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL ;

export const useExercises = (labId) => {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        let abort = false;

        if (!labId) {
            setExercises([]);
            setError(null);
            loadingRef.current = false;
            return;
        }

        if (loadingRef.current) {
            return;
        }

        const loadExercises = async () => {
            loadingRef.current = true;
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/api/labs/${labId}/exercises`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error("Impossible de charger les exercices.");
                }

                const data = await response.json();
                if (abort) return;

                // Ensure data is array and unique
                let fetched = Array.isArray(data) ? data : [];
                const uniqueExercises = fetched.filter((exercise, index, self) =>
                    index === self.findIndex((e) => e.id === exercise.id)
                );

                setExercises(uniqueExercises);
            } catch (err) {
                if (abort) return;
                setExercises([]);
                setError(err.message);
            } finally {
                if (!abort) {
                    setLoading(false);
                    loadingRef.current = false;
                }
            }
        };

        loadExercises();

        return () => {
            abort = true;
            loadingRef.current = false;
        };
    }, [labId]);

    return { exercises, loading, error };
};
