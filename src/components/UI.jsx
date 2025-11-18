import { useRef, useState, useEffect, useCallback } from "react";
import { useChat } from "../hooks/useChat";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const UI = ({
  hidden,
  pdfReaderOpen,
  setPdfReaderOpen,
  selectedCourse,
  onBackToHome,
  pdfPageNumber,
  setPdfPageNumber,
  pdfScale,
  setPdfScale,
  pdfNumPages,
  ...props
}) => {
  const { chat, loading, cameraZoomed, setCameraZoomed, message, avatarPosition, setAvatarPosition, setAudioElement, setAudioId, audioElement, avatarScreenPosition } = useChat();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Monitor audio playback state to detect when avatar is speaking
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
  const [isPaused, setIsPaused] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioData, setAudioData] = useState(null);
  const [audioMimeType, setAudioMimeType] = useState(null);
  const [documentAudioSrc, setDocumentAudioSrc] = useState(null); // Store document audio source
  const audioRef = useRef(null);
  const [isDocumentAudio, setIsDocumentAudio] = useState(false); // Track if playing document audio
  const positionSaveIntervalRef = useRef(null);
  
  // Answer display state
  const [answerText, setAnswerText] = useState(null);
  
  // Analysis display state
  const [analysisText, setAnalysisText] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // Summary display state
  const [summaryText, setSummaryText] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Question history state
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Auto-complete state
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [duplicateQuestion, setDuplicateQuestion] = useState(null);
  
  // Page timing synchronization state
  const [pageTimings, setPageTimings] = useState([]); // Array of {page: number, time: number}
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false); // Track if audio has been played for current document

  // Get saved position for document
  const getSavedPosition = (docId) => {
    if (!docId) return 0;
    const saved = localStorage.getItem(`audio_position_${docId}`);
    return saved ? parseFloat(saved) : 0;
  };

  // Save position for document
  const savePosition = (docId, position) => {
    if (!docId || !isDocumentAudio) return;
    localStorage.setItem(`audio_position_${docId}`, position.toString());
  };

  // Fetch page timing metadata for synchronization
  const fetchPageTimings = useCallback(async (docId) => {
    if (!docId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/documents/${docId}/page-timings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Expected format: [{page: 1, time: 0}, {page: 2, time: 30.5}, ...]
        // Or: {timings: [...], pages: [...]}
        if (Array.isArray(data)) {
          setPageTimings(data);
        } else if (data.timings && Array.isArray(data.timings)) {
          setPageTimings(data.timings);
        } else if (data.pages && Array.isArray(data.pages)) {
          // Convert pages array to timings format if needed
          const timings = data.pages.map((pageData, index) => ({
            page: pageData.page || index + 1,
            time: pageData.time || pageData.startTime || 0,
          }));
          setPageTimings(timings);
        }
      }
    } catch (error) {
      console.error("Error fetching page timings:", error);
      // If endpoint doesn't exist, we'll just skip synchronization
    }
  }, []);

  // Get the current PDF page based on audio time
  const getPageForTime = (currentTime) => {
    if (!pageTimings || pageTimings.length === 0) return null;
    
    // Sort timings by time (should already be sorted, but just in case)
    const sortedTimings = [...pageTimings].sort((a, b) => a.time - b.time);
    
    // Find the appropriate page for current time
    for (let i = sortedTimings.length - 1; i >= 0; i--) {
      if (currentTime >= sortedTimings[i].time) {
        return sortedTimings[i].page;
      }
    }
    
    // If time is before first timing, return first page
    return sortedTimings[0]?.page || 1;
  };

  // Reset audio when document changes
  useEffect(() => {
    if (selectedCourse) {
      setAudioData(null);
      setAudioMimeType(null);
      setDocumentAudioSrc(null);
      setIsPlaying(false);
      setIsPaused(false);
      setIsDocumentAudio(false);
      setAnalysisText(null); // Clear analysis when document changes
      setSummaryText(null); // Clear summary when document changes
      setQuestionHistory([]); // Clear question history when document changes
      setAnswerText(null); // Clear answer text when document changes
      setPageTimings([]); // Reset page timings
      setHasPlayedOnce(false); // Reset play flag for new document
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      // Clear audio context for Avatar
      setAudioElement(null);
      setAudioId(null);
      // Clear position save interval
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
        positionSaveIntervalRef.current = null;
      }
      
      // Clear saved position for this document so it starts from beginning on load
      if (selectedCourse.id) {
        localStorage.removeItem(`audio_position_${selectedCourse.id}`);
        // Fetch page timings for synchronization
        fetchPageTimings(selectedCourse.id);
      }
    }
  }, [selectedCourse?.id, fetchPageTimings, setAudioElement, setAudioId]);

  const handlePlay = async () => {
    if (!selectedCourse || !selectedCourse.id) {
      alert("Aucun document sélectionné");
      return;
    }

    // Hide all question modals
    setShowQuestionModal(false);
    setShowHistoryModal(false);
    setAnswerText(null);

    // If we already have document audio data, restore and play it
    if ((audioData || documentAudioSrc) && audioRef.current) {
      // Restore document audio source if it was changed (e.g., by answer audio)
      if (documentAudioSrc && audioRef.current.src !== documentAudioSrc) {
        audioRef.current.src = documentAudioSrc;
        audioRef.current.load();
      }
      
      // Set audio element and ID in context for Avatar libsync
      setAudioElement(audioRef.current);
      setAudioId(selectedCourse.id);
      
      // On first play after document load, start from beginning; otherwise resume from saved position
      if (!hasPlayedOnce) {
        audioRef.current.currentTime = 0;
        setHasPlayedOnce(true);
        // Reset to first page
        if (pdfNumPages && setPdfPageNumber) {
          setPdfPageNumber(1);
        }
      } else {
        // Restore saved position for subsequent plays
        const savedPosition = getSavedPosition(selectedCourse.id);
        if (savedPosition > 0) {
          audioRef.current.currentTime = savedPosition;
        }
      }
      
      setIsDocumentAudio(true);
      
      // Sync initial page when starting playback
      if (audioRef.current && pageTimings.length > 0 && pdfNumPages) {
        const currentTime = audioRef.current.currentTime;
        const targetPage = getPageForTime(currentTime);
        if (targetPage && targetPage >= 1 && targetPage <= pdfNumPages) {
          setPdfPageNumber(targetPage);
        }
      }
      
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
      
      // Start saving position periodically
      if (positionSaveIntervalRef.current) {
clearInterval(positionSaveIntervalRef.current);
      }
      positionSaveIntervalRef.current = setInterval(() => {
        if (audioRef.current && isDocumentAudio && !audioRef.current.paused) {
          savePosition(selectedCourse.id, audioRef.current.currentTime);
        }
      }, 1000);
      return;
    }

    setTtsLoading(true);
    try {
      const audioId = selectedCourse.id;
      
      // First, check if audio file already exists
      const audioUrl = `${API_URL}/audios/${audioId}.wav`;
      let audioSrc = null;

      try {
        const checkResponse = await fetch(audioUrl, {
          method: "GET",
          headers: {
            "Accept": "audio/wav",
          },
        });

        if (checkResponse.ok) {
          // Audio file exists, use it directly
          audioSrc = audioUrl;
          setAudioMimeType("audio/wav");
          // Store document audio source for later restoration
          setDocumentAudioSrc(audioUrl);
        } else {
          // Audio file doesn't exist, generate it via TTS API
          throw new Error("Audio not found, will generate");
        }
      } catch (checkError) {
        // Audio doesn't exist, generate it via TTS API
        const ttsResponse = await fetch(`${API_URL}/api/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ docId: audioId }),
        });

        if (!ttsResponse.ok) {
          throw new Error(`TTS API error! status: ${ttsResponse.status}`);
        }

        const data = await ttsResponse.json();
        
        if (data.audioData && data.mimeType) {
          setAudioData(data.audioData);
          setAudioMimeType(data.mimeType);
          
          // Create audio source from base64 data
          audioSrc = `data:${data.mimeType};base64,${data.audioData}`;
          // Store document audio source for later restoration
          setDocumentAudioSrc(audioSrc);
        } else {
          throw new Error("Invalid TTS response format");
        }
      }

      // Play the audio
      if (audioSrc && audioRef.current) {
        audioRef.current.src = audioSrc;
        audioRef.current.load();
        
        // Store document audio source
        setDocumentAudioSrc(audioSrc);
        
        // Set audio element and ID in context for Avatar libsync
        setAudioElement(audioRef.current);
        setAudioId(audioId);
        
        // On first play after document load, start from beginning; otherwise resume from saved position
        if (!hasPlayedOnce) {
          audioRef.current.currentTime = 0;
          setHasPlayedOnce(true);
          // Reset to first page
          if (pdfNumPages && setPdfPageNumber) {
            setPdfPageNumber(1);
          }
        } else {
          // Restore saved position for subsequent plays
          const savedPosition = getSavedPosition(audioId);
          if (savedPosition > 0) {
            audioRef.current.currentTime = savedPosition;
          }
        }
        
        setIsDocumentAudio(true);
        
        // Sync initial page when starting playback
        if (audioRef.current && pageTimings.length > 0 && pdfNumPages) {
          const currentTime = audioRef.current.currentTime;
          const targetPage = getPageForTime(currentTime);
          if (targetPage && targetPage >= 1 && targetPage <= pdfNumPages) {
            setPdfPageNumber(targetPage);
          }
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        
        // Start saving position periodically
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
        }
        positionSaveIntervalRef.current = setInterval(() => {
          if (audioRef.current && isDocumentAudio && !audioRef.current.paused) {
            savePosition(audioId, audioRef.current.currentTime);
          }
        }, 1000); // Save every second
      }
    } catch (error) {
      console.error("Error fetching TTS:", error);
      alert("Échec de la génération audio. Veuillez réessayer.");
    } finally {
      setTtsLoading(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
      
      // Save position when paused
      if (selectedCourse?.id && isDocumentAudio) {
        savePosition(selectedCourse.id, audioRef.current.currentTime);
      }
    }
  };

  const handleResume = () => {
    if (audioRef.current && isPaused) {
      // Hide all question modals
      setShowQuestionModal(false);
      setShowHistoryModal(false);
      setAnswerText(null);
      
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleSummary = async () => {
    if (!selectedCourse || !selectedCourse.id) {
      alert("Aucun document sélectionné");
      return;
    }

    // Hide all question modals
    setShowQuestionModal(false);
    setShowHistoryModal(false);
    setAnswerText(null);

    setSummaryLoading(true);
    setTtsLoading(true);
    try {
      // Save document audio position before playing summary
      if (selectedCourse?.id && isDocumentAudio && audioRef.current) {
        savePosition(selectedCourse.id, audioRef.current.currentTime);
        // Stop position saving interval for document audio
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
          positionSaveIntervalRef.current = null;
        }
      }

      const docId = selectedCourse.id;
      
      // Fetch summary text
      try {
        const summaryTextResponse = await fetch(`${API_URL}/api/documents/${docId}/summary`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (summaryTextResponse.ok) {
          const summaryData = await summaryTextResponse.json();
          
          // Display the summary text
          if (summaryData.summary) {
            setSummaryText(summaryData.summary);
          } else if (summaryData.text) {
            setSummaryText(summaryData.text);
          } else if (typeof summaryData === 'string') {
            setSummaryText(summaryData);
          } else {
            setSummaryText(JSON.stringify(summaryData, null, 2));
          }
        }
      } catch (summaryTextError) {
        console.error("Error fetching summary text:", summaryTextError);
        // Continue to try to get audio even if text fails
      }

      // Fetch summary audio
      const summaryAudioUrl = `${API_URL}/audios/${docId}-summary.wav`;
      let audioUrl = null;

      // First, check if summary audio file already exists
      try {
        const checkResponse = await fetch(summaryAudioUrl, {
          method: "GET",
          headers: {
            "Accept": "audio/wav",
          },
        });

        if (checkResponse.ok) {
          // Summary audio file exists, use it directly
          audioUrl = summaryAudioUrl;
        } else {
          // Summary audio doesn't exist, generate it via API
          throw new Error("Summary audio not found, will generate");
        }
      } catch (checkError) {
        // Summary doesn't exist, generate it via API
        const generateResponse = await fetch(`${API_URL}/api/documents/${docId}/summary/audio`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!generateResponse.ok) {
          throw new Error(`Summary generation error! status: ${generateResponse.status}`);
        }

        // The response is JSON with audioData (base64) and mimeType
        const data = await generateResponse.json();
        
        if (data.audioData && data.mimeType) {
          // Create audio source from base64 data
          audioUrl = `data:${data.mimeType};base64,${data.audioData}`;
        } else if (data.audioUrl) {
          // Fallback: if audioUrl is provided, use it
          audioUrl = data.audioUrl.startsWith("http")
            ? data.audioUrl
            : `${API_URL}${data.audioUrl}`;
        } else {
          // Try to get blob if response is audio file
          try {
            const audioBlob = await generateResponse.blob();
            audioUrl = URL.createObjectURL(audioBlob);
          } catch (blobError) {
            throw new Error("Invalid response format: no audioData or audioUrl found");
          }
        }
      }

      // Play the audio
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        setIsDocumentAudio(false); // This is summary audio, not document audio
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      alert("Échec du chargement du résumé. Veuillez réessayer.");
    } finally {
      setTtsLoading(false);
      setSummaryLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCourse || !selectedCourse.id) {
      alert("Aucun document sélectionné");
      return;
    }

    setAnalysisLoading(true);
    try {
      const docId = selectedCourse.id;
      
      // Call the analysis API endpoint
      const response = await fetch(`${API_URL}/api/documents/${docId}/analyze`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Analysis error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Display the analysis text
      if (data.analysis) {
        setAnalysisText(data.analysis);
      } else if (data.text) {
        setAnalysisText(data.text);
      } else {
        // If response is just a string
        setAnalysisText(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      }

      // If there's audio, play it
      if (data.audioUrl && audioRef.current) {
        // Save document audio position before playing analysis audio
        if (selectedCourse?.id && isDocumentAudio && audioRef.current) {
          savePosition(selectedCourse.id, audioRef.current.currentTime);
          if (positionSaveIntervalRef.current) {
            clearInterval(positionSaveIntervalRef.current);
            positionSaveIntervalRef.current = null;
          }
        }

        const audioUrl = data.audioUrl.startsWith("http")
          ? data.audioUrl
          : `${API_URL}${data.audioUrl}`;

        audioRef.current.src = audioUrl;
        audioRef.current.load();
        setIsDocumentAudio(false); // This is analysis audio, not document audio
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
      alert("Échec de l'analyse du document. Veuillez réessayer.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAskQuestion = () => {
    setShowQuestionModal(true);
    setQuestionText("");
    setRecordedAudio(null);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setDuplicateQuestion(null);
    // Optionally clear previous answer when asking new question
    // setAnswerText(null);
  };

  // Find similar questions in history for auto-complete
  const findSuggestions = (input) => {
    if (!input.trim() || questionHistory.length === 0) {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
      return;
    }

    const inputLower = input.toLowerCase().trim();
    const matches = questionHistory
      .filter((entry) => {
        const questionLower = entry.question.toLowerCase().trim();
        return questionLower.includes(inputLower) || inputLower.includes(questionLower);
      })
      .slice(0, 5); // Limit to 5 suggestions

    setSuggestions(matches);
    setSelectedSuggestionIndex(-1);
  };

  // Check if question already exists
  const checkDuplicateQuestion = (question) => {
    if (!question.trim()) return null;

    const questionLower = question.toLowerCase().trim();
    const exactMatch = questionHistory.find(
      (entry) => entry.question.toLowerCase().trim() === questionLower
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Check for very similar questions (fuzzy match)
    const similarMatch = questionHistory.find((entry) => {
      const entryLower = entry.question.toLowerCase().trim();
      // Check if questions are very similar (same length ± 10 chars and high similarity)
      if (Math.abs(entryLower.length - questionLower.length) <= 10) {
        // Simple similarity check: if one contains the other or vice versa with high match
        const similarity = calculateSimilarity(entryLower, questionLower);
        return similarity > 0.85; // 85% similarity threshold
      }
      return false;
    });

    return similarMatch || null;
  };

  // Simple similarity calculation (Levenshtein-like)
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;

    const longerLower = longer.toLowerCase();
    const shorterLower = shorter.toLowerCase();

    // Check if one contains the other
    if (longerLower.includes(shorterLower) || shorterLower.includes(longerLower)) {
      return shorter.length / longer.length;
    }

    // Simple character-based similarity
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longerLower.includes(shorterLower[i])) {
        matches++;
      }
    }
    return matches / longer.length;
  };

  const handleQuestionTextChange = (e) => {
    const value = e.target.value;
    setQuestionText(value);
    findSuggestions(value);
    
    // Check for duplicate in real-time
    if (value.trim()) {
      const duplicate = checkDuplicateQuestion(value.trim());
      setDuplicateQuestion(duplicate);
    } else {
      setDuplicateQuestion(null);
    }
  };

  const selectSuggestion = (suggestion) => {
    setQuestionText(suggestion.question);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setDuplicateQuestion(checkDuplicateQuestion(suggestion.question));
  };

  const handleSubmitQuestion = async () => {
    if (loading || message) return;

    // Check for duplicate question
    const duplicate = checkDuplicateQuestion(questionText.trim());
    if (duplicate && questionText.trim()) {
      setDuplicateQuestion(duplicate);
      return; // Don't submit, show warning instead
    }

    setTtsLoading(true);
    try {
      let response;

      if (questionText.trim()) {
        // Submit text question
        response = await fetch(`${API_URL}/api/qa`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: questionText.trim() }),
        });
      } else if (recordedAudio) {
        // Submit audio question
        const formData = new FormData();
        formData.append("question", recordedAudio.blob, "question.wav");

        response = await fetch(`${API_URL}/api/qa`, {
          method: "POST",
          body: formData,
        });
      } else {
        return; // No question to submit
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the response - answer and audioUrl
      if (data.answer && data.audioUrl) {
        // Save document audio position before playing answer
        if (selectedCourse?.id && isDocumentAudio && audioRef.current) {
          savePosition(selectedCourse.id, audioRef.current.currentTime);
          // Stop position saving interval for document audio
          if (positionSaveIntervalRef.current) {
            clearInterval(positionSaveIntervalRef.current);
            positionSaveIntervalRef.current = null;
          }
        }
        
        // Store the answer text to display
        setAnswerText(data.answer);
        
        // Play the audio response (this is answer audio, not document audio)
        const audioUrl = data.audioUrl.startsWith("http")
          ? data.audioUrl
          : `${API_URL}${data.audioUrl}`;

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          setIsDocumentAudio(false); // This is answer audio, not document audio
          await audioRef.current.play();
          setIsPlaying(true);
          setIsPaused(false);
        }

        // Save to history
        const questionInput = questionText.trim() || (recordedAudio ? "Audio Question" : "Question");
        const historyEntry = {
          id: Date.now(),
          question: questionInput,
          answer: data.answer,
          audioUrl: audioUrl,
          timestamp: new Date().toISOString(),
        };
        setQuestionHistory((prev) => [historyEntry, ...prev]);

        // Close modal and reset
        setShowQuestionModal(false);
        setQuestionText("");
        setRecordedAudio(null);
        setSuggestions([]);
        setDuplicateQuestion(null);
      }
    } catch (error) {
      console.error("Error submitting question:", error);
      alert("Échec de l'envoi de la question. Veuillez réessayer.");
    } finally {
      setTtsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Convert to WAV format for French audio
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // For now, we'll use the webm blob directly
        // If your backend requires WAV, you'll need to convert it
        // For simplicity, we'll send webm - backend should handle conversion
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url: audioUrl });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Impossible d'accéder au microphone. Veuillez vérifier les permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCloseModal = () => {
    if (isRecording) {
      stopRecording();
    }
    setShowQuestionModal(false);
    setQuestionText("");
    setRecordedAudio(null);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setDuplicateQuestion(null);
  };

  const handlePlayHistoryAnswer = async (historyEntry) => {
    if (!historyEntry.audioUrl) return;

    try {
      // Save document audio position if playing
      if (selectedCourse?.id && isDocumentAudio && audioRef.current) {
        savePosition(selectedCourse.id, audioRef.current.currentTime);
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
          positionSaveIntervalRef.current = null;
        }
      }

      // Display the answer text
      setAnswerText(historyEntry.answer);

      // Play the audio
      if (audioRef.current) {
        audioRef.current.src = historyEntry.audioUrl;
        audioRef.current.load();
        setIsDocumentAudio(false);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Error playing history answer:", error);
        alert("Échec de la lecture de l'audio de la réponse.");
    }
  };

  // PDF Controls Component
  const PDFControls = ({ selectedCourse, pageNumber, setPageNumber, scale, setScale, numPages }) => {

    const goToPreviousPage = () => {
      setPageNumber((prev) => Math.max(1, prev - 1));
    };

    const goToNextPage = () => {
      setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
    };

    const zoomIn = () => {
      setScale((prev) => {
        const newScale = Math.min(prev + 0.2, 3.0);
        console.log('Zoom In:', prev, '->', newScale);
        return newScale;
      });
    };

    const zoomOut = () => {
      setScale((prev) => {
        const newScale = Math.max(prev - 0.2, 0.5);
        console.log('Zoom Out:', prev, '->', newScale);
        return newScale;
      });
    };

    const handleSliderChange = (event) => {
      const newPage = parseInt(event.target.value);
      setPageNumber(newPage);
    };

    if (!selectedCourse || !numPages) return null;

    return (
      <div className="fixed top-1/2 left-4 transform -translate-y-1/2 z-40 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border-2 border-pink-200 p-4">
          {/* Vertical Layout */}
          <div className="flex flex-col gap-3">
            {/* Page Navigation */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={pageNumber <= 1}
                  className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md transition-colors text-sm"
                >
                  ↑
                </button>
              </div>
              <span className="text-gray-700 font-medium whitespace-nowrap text-sm text-center">
                Page {pageNumber} {numPages && `sur ${numPages}`}
              </span>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= (numPages || 1)}
                  className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md transition-colors text-sm"
                >
                  ↓
                </button>
              </div>
            </div>
            
            {/* Page Slider - Vertical */}
            {numPages && numPages > 1 && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-gray-600 text-xs font-medium">
                  {numPages}
                </span>
                <input
                  type="range"
                  min="1"
                  max={numPages}
                  value={pageNumber}
                  onChange={handleSliderChange}
                  className="w-2 h-32 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-vertical"
                  style={{
                    background: `linear-gradient(to bottom, #ec4899 0%, #ec4899 ${numPages > 1 ? ((pageNumber - 1) / (numPages - 1)) * 100 : 100}%, #e5e7eb ${numPages > 1 ? ((pageNumber - 1) / (numPages - 1)) * 100 : 100}%, #e5e7eb 100%)`,
                    writingMode: 'vertical-lr',
                    transform: 'rotate(180deg)',
                  }}
                />
                <span className="text-gray-600 text-xs font-medium">
                  1
                </span>
              </div>
            )}
            
            {/* Zoom Controls */}
            <div className="flex flex-col items-center gap-2 border-t border-gray-200 pt-3">
              <button
                onClick={zoomIn}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md transition-colors text-sm"
              >
                +
              </button>
              <span className="text-gray-700 font-medium text-sm min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomOut}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md transition-colors text-sm"
              >
                −
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      {/* Answer Display Box - Left Side */}
      {answerText && (
        <div
          className={`fixed top-1/2 transform -translate-y-1/2 z-30 pointer-events-auto transition-all ${
            pdfReaderOpen
              ? "left-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "left-4 w-96 max-w-md"
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 border-2 border-pink-200 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-pink-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Réponse à votre question :
              </h3>
              <button
                onClick={() => setAnswerText(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Fermer"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {answerText}
              </p>
            </div>
            {isPlaying && (
              <div className="mt-4 flex items-center gap-2 text-sm text-pink-600">
                <svg
                  className="w-4 h-4 animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                </svg>
                <span>Lecture audio...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Display Box - Left Side */}
      {analysisText && (
        <div
          className={`fixed z-30 pointer-events-auto transition-all ${
            pdfReaderOpen
              ? "left-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "left-4 w-96 max-w-md"
          } ${
            answerText && summaryText
              ? "top-[calc(50%+30rem)] transform -translate-y-0"
              : answerText || summaryText
              ? "top-[calc(50%+15rem)] transform -translate-y-0" 
              : "top-1/2 transform -translate-y-1/2"
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 border-2 border-purple-200 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Analyse du document
              </h3>
              <button
                onClick={() => setAnalysisText(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Fermer"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {analysisText}
              </p>
            </div>
            {isPlaying && (
              <div className="mt-4 flex items-center gap-2 text-sm text-purple-600">
                <svg
                  className="w-4 h-4 animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                </svg>
                <span>Lecture audio...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Display Box - Left Side */}
      {summaryText && (
        <div
          className={`fixed z-30 pointer-events-auto transition-all ${
            pdfReaderOpen
              ? "left-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "left-4 w-96 max-w-md"
          } ${
            answerText && analysisText
              ? "top-[calc(50%+30rem)] transform -translate-y-0"
              : answerText || analysisText
              ? "top-[calc(50%+15rem)] transform -translate-y-0"
              : "top-1/2 transform -translate-y-1/2"
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 border-2 border-blue-200 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
                Résumé du document
              </h3>
              <button
                onClick={() => setSummaryText(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Fermer"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {summaryText}
              </p>
            </div>
            {isPlaying && (
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
                <svg
                  className="w-4 h-4 animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                </svg>
                <span>Lecture audio...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 right-0 bottom-0 z-20 flex justify-between p-4 flex-col pointer-events-none">
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-black text-xl">Titan Academy</h1>
              {/* <p>I will always love you ❤️</p> */}
              {selectedCourse && (
                <p className="text-sm text-gray-600 mt-1">
                  Apprentissage : {selectedCourse.title}
                </p>
              )}
            </div>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="pointer-events-auto bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                title="Retour à l'accueil"
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
                <span>Accueil</span>
              </button>
            )}
          </div>
        </div>
        {/* Main Avatar Control Buttons - Bottom Center */}
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-30 flex items-center justify-center gap-3 md:gap-4 pointer-events-auto">
          {/* Play Button */}
          <button
            onClick={handlePlay}
            disabled={!selectedCourse || isPlaying || ttsLoading}
            className={`pointer-events-auto bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 md:p-4 rounded-full transition-colors shadow-lg ${
              isPlaying || ttsLoading ? "opacity-50" : ""
            }`}
            title={ttsLoading ? "Génération audio..." : "Lire"}
          >
            {ttsLoading ? (
              <svg
                className="animate-spin h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
            )}
          </button>

          {/* Pause Button */}
          <button
            onClick={handlePause}
            disabled={!isPlaying}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 md:p-4 rounded-full transition-colors shadow-lg"
            title="Pause"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25v13.5m-7.5-13.5v13.5"
              />
            </svg>
          </button>

          {/* Question History Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            disabled={questionHistory.length === 0}
            className={`pointer-events-auto bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 md:p-4 rounded-full transition-colors shadow-lg ${
              questionHistory.length === 0 ? "opacity-50" : ""
            }`}
            title="Historique des questions"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Summary Button */}
          <button
            onClick={handleSummary}
            disabled={!selectedCourse || ttsLoading || summaryLoading}
            className={`pointer-events-auto bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 md:p-4 rounded-full transition-colors shadow-lg ${
              !selectedCourse || ttsLoading || summaryLoading ? "opacity-50" : ""
            }`}
            title="Résumé"
          >
            {(ttsLoading || summaryLoading) ? (
              <svg
                className="animate-spin h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>

          {/* Avatar Zoom Button */}
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-3 md:p-4 rounded-full transition-colors shadow-lg"
            title={cameraZoomed ? "Dézoomer l'avatar" : "Zoomer l'avatar"}
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>

          {/* Avatar Position Button - Move to Right */}
          <button
            onClick={() => setAvatarPosition(avatarPosition === "center" ? "right" : "center")}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-3 md:p-4 rounded-full transition-colors shadow-lg"
            title={avatarPosition === "right" ? "Déplacer l'avatar au centre" : "Déplacer l'avatar à droite"}
          >
            {avatarPosition === "right" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            )}
          </button>

          {/* Hidden audio element to control playback */}
          <audio
            ref={audioRef}
            onTimeUpdate={() => {
              // Synchronize PDF page with audio time (only for document audio)
              if (isDocumentAudio && audioRef.current && pageTimings.length > 0 && pdfNumPages) {
                const currentTime = audioRef.current.currentTime;
                const targetPage = getPageForTime(currentTime);
                
                if (targetPage && targetPage !== pdfPageNumber && targetPage >= 1 && targetPage <= pdfNumPages) {
                  setPdfPageNumber(targetPage);
                }
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setIsPaused(false);
              
              // If document audio ended, save position (should be at end)
              if (selectedCourse?.id && isDocumentAudio) {
                savePosition(selectedCourse.id, audioRef.current.duration || 0);
                // Clear position save interval
                if (positionSaveIntervalRef.current) {
                  clearInterval(positionSaveIntervalRef.current);
                  positionSaveIntervalRef.current = null;
                }
              } else if (!isDocumentAudio && selectedCourse?.id) {
                // Answer audio finished - restore document audio if it was playing
                // The position was already saved when answer started playing
                // User can click play again to resume document audio from saved position
              }
              
              // Keep answer text visible even after audio ends
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPaused(false);
              // Save position when paused (for document audio)
              if (selectedCourse?.id && isDocumentAudio && audioRef.current) {
                savePosition(selectedCourse.id, audioRef.current.currentTime);
              }
            }}
          />
        </div>
      </div>

      {/* PDF Controls - Floating Overlay */}
      {selectedCourse && pdfPageNumber && setPdfPageNumber && (
        <PDFControls
          selectedCourse={selectedCourse}
          pageNumber={pdfPageNumber}
          setPageNumber={setPdfPageNumber}
          scale={pdfScale}
          setScale={setPdfScale}
          numPages={pdfNumPages}
        />
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center pointer-events-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Poser une question</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Text Input */}
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tapez votre question :
              </label>
              <textarea
                value={questionText}
                onChange={handleQuestionTextChange}
                onKeyDown={(e) => {
                  // Handle arrow keys for suggestion navigation
                  if (suggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) =>
                        prev < suggestions.length - 1 ? prev + 1 : prev
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
                      e.preventDefault();
                      selectSuggestion(suggestions[selectedSuggestionIndex]);
                    }
                  }
                }}
                placeholder="Entrez votre question ici..."
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none ${
                  duplicateQuestion ? "border-yellow-500" : "border-gray-300"
                }`}
                rows={4}
                disabled={isRecording}
              />
              
              {/* Auto-complete Suggestions */}
              {suggestions.length > 0 && questionText.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      onClick={() => selectSuggestion(suggestion)}
                      className={`p-3 cursor-pointer hover:bg-pink-50 transition-colors ${
                        index === selectedSuggestionIndex ? "bg-pink-100" : ""
                      } ${index > 0 ? "border-t border-gray-200" : ""}`}
                    >
                      <p className="text-sm text-gray-800 font-medium">{suggestion.question}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{suggestion.answer.substring(0, 60)}...</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Duplicate Question Warning */}
              {duplicateQuestion && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">
                        Cette question a déjà été posée
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Cliquez sur "Rejouer la réponse" pour écouter la réponse précédente, ou modifiez votre question.
                      </p>
                      <button
                        onClick={() => {
                          handlePlayHistoryAnswer(duplicateQuestion);
                          setShowQuestionModal(false);
                          setQuestionText("");
                          setRecordedAudio(null);
                          setSuggestions([]);
                          setDuplicateQuestion(null);
                        }}
                        className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                      >
                        Rejouer la réponse
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recorded Audio Preview */}
            {recordedAudio && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Audio enregistré :</p>
                <audio src={recordedAudio.url} controls className="w-full" />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {/* Record Audio Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-gray-500 hover:bg-gray-600 text-white"
                }`}
                disabled={loading || message}
              >
                {isRecording ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-pulse"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    <span>Arrêter l'enregistrement</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                    <span>Enregistrer l'audio</span>
                  </>
                )}
              </button>

              {/* Submit Button */}
              <button
                onClick={handleSubmitQuestion}
                disabled={(!questionText.trim() && !recordedAudio) || loading || message || ttsLoading}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  (!questionText.trim() && !recordedAudio) || loading || message || ttsLoading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-pink-500 hover:bg-pink-600 text-white"
                }`}
              >
                {ttsLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  "Envoyer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center pointer-events-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Historique des questions</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {questionHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune question posée pour le moment.</p>
              ) : (
                questionHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="w-5 h-5 text-pink-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                            />
                          </svg>
                          <p className="font-semibold text-gray-800 text-sm">Question :</p>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3 ml-7">{entry.question}</p>
                        
                        <div className="flex items-center gap-2 mb-2 ml-7">
                          <svg
                            className="w-5 h-5 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                          <p className="font-semibold text-gray-800 text-sm">Réponse:</p>
                        </div>
                        <p className="text-gray-700 mb-3 ml-7 whitespace-pre-wrap">{entry.answer}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 ml-7">
                      <button
                        onClick={() => handlePlayHistoryAnswer(entry)}
                        className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm"
                        title="Lire la réponse"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                          />
                        </svg>
                        Lire la réponse
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prominent Ask Button - Fixed Top Right */}
      <button
        onClick={handleAskQuestion}
        className="fixed top-16 right-64 z-[100] pointer-events-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-5 py-4 sm:px-6 sm:py-4 rounded-full transition-all duration-200 shadow-2xl flex items-center gap-2 sm:gap-3 font-semibold text-base sm:text-lg hover:scale-110 active:scale-95 group"
        title="Poser une question"
      >
        {/* Subtle glow effect */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-75 blur-xl group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
        
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-6 h-6 sm:w-7 sm:h-7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
        <span className="hidden sm:inline font-bold">Demander</span>
      </button>
    </>
  );
};
