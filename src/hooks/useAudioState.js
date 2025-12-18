import { useState, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

export const useAudioState = () => {
    const { audioElement } = useChat();
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        if (!audioElement) {
            setIsSpeaking(false);
            return;
        }

        const checkAudioState = () => {
            const playing = !audioElement.paused && !audioElement.ended && audioElement.currentTime > 0;
            setIsSpeaking(playing);
        };

        // Check initial state
        checkAudioState();

        // Listen to audio events
        const events = ['play', 'pause', 'ended', 'timeupdate'];
        events.forEach(event => {
            audioElement.addEventListener(event, checkAudioState);
        });

        return () => {
            events.forEach(event => {
                audioElement.removeEventListener(event, checkAudioState);
            });
        };
    }, [audioElement]);

    return isSpeaking;
};
