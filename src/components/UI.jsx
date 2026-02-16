import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../hooks/useChat";

const API_URL = import.meta.env.VITE_API_URL ;

export const UI = ({
  pdfReaderOpen,
  selectedCourse,
  onBackToHome,
  onSelectChapter,
  onOpenLab,
  onOpenFinalProject,
  pdfPageNumber,
  setPdfPageNumber,
  pdfScale,
  setPdfScale,
  pdfNumPages,
  initialProgressCompleted,
}) => {
  const navigate = useNavigate();
  const { chat, loading, cameraZoomed, setCameraZoomed, message, avatarPosition, setAvatarPosition, setAudioElement, setAudioId, setLipSyncUrl, audioElement, avatarScreenPosition } = useChat();
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
  const audioRef = useRef(null);
  const [isDocumentAudio, setIsDocumentAudio] = useState(false); // Track if playing document audio
  const positionSaveIntervalRef = useRef(null);

  // Save position for document
  const savePosition = useCallback((docId, position) => {
    if (!docId || !isDocumentAudio) return;
    localStorage.setItem(`audio_position_${docId}`, position.toString());
  }, [isDocumentAudio]);

  const handleAvatarAudioPlayback = useCallback(
    async ({ audioUrl, audioId, lipSyncUrl }) => {
      if (!audioUrl || !audioRef.current) {
        return false;
      }

      try {
        if (selectedCourse?.id && isDocumentAudio && audioRef.current) {
          savePosition(selectedCourse.id, audioRef.current.currentTime);
          if (positionSaveIntervalRef.current) {
            clearInterval(positionSaveIntervalRef.current);
            positionSaveIntervalRef.current = null;
          }
        }

        audioRef.current.src = audioUrl;
        audioRef.current.load();
        setIsDocumentAudio(false);
        setAudioElement(audioRef.current);
        setAudioId(audioId || null);
        setLipSyncUrl(lipSyncUrl ?? null);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        return true;
      } catch (err) {
        console.error("Error playing avatar audio:", err);
        return false;
      }
    },
    [selectedCourse?.id, isDocumentAudio, setAudioElement, setAudioId, setLipSyncUrl, savePosition]
  );

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
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const getHistoryStorageKey = useCallback(() => {
    const courseId = selectedCourse?.courseId || "unknown-course";
    const chapterId = selectedCourse?.id || "unknown-chapter";
    return `qa_history_${courseId}_${chapterId}`;
  }, [selectedCourse?.courseId, selectedCourse?.id]);

  const mergeHistoryEntries = useCallback((localEntries, serverEntries) => {
    const merged = new Map();

    const addEntry = (entry) => {
      if (!entry) return;
      const key = entry.serverId
        ? `server:${entry.serverId}`
        : `local:${entry.question || ""}|${entry.timestamp || ""}`;
      if (!merged.has(key)) {
        merged.set(key, entry);
      }
    };

    (serverEntries || []).forEach(addEntry);
    (localEntries || []).forEach(addEntry);

    return Array.from(merged.values()).sort((a, b) => {
      const aTime = new Date(a.timestamp || 0).getTime();
      const bTime = new Date(b.timestamp || 0).getTime();
      return bTime - aTime;
    });
  }, []);

  // Page timing synchronization state
  const [pageTimings, setPageTimings] = useState([]); // Array of {page: number, time: number, duration: number, audioPath: string}
  const [currentPageAudio, setCurrentPageAudio] = useState(null); // Current page being played
  const [isChapterComplete, setIsChapterComplete] = useState(false); // Track if all pages have been read

  // Chapter completion overlay state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [hasQuizQuestions, setHasQuizQuestions] = useState(false);
  const [quizBestAttempt, setQuizBestAttempt] = useState(null);

  // Check quiz status when chapter completes
  useEffect(() => {
    if (!isChapterComplete) {
      setShowCompletionOverlay(false);
      return;
    }
    const courseId = selectedCourse?.courseId;
    const chapterId = selectedCourse?.id;
    if (!courseId || !chapterId) return;

    const checkQuizStatus = async () => {
      try {
        // Check if quiz questions exist
        const quizResponse = await fetch(`${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz`, {
          credentials: 'include'
        });
        if (quizResponse.ok) {
          const quizData = await quizResponse.json();
          const questionsList = quizData.questions || quizData;
          const has = Array.isArray(questionsList) && questionsList.length > 0;
          setHasQuizQuestions(has);

          if (has) {
            // Check user's best attempt
            const attemptsResponse = await fetch(`${API_URL}/api/courses/${courseId}/chapters/${chapterId}/quiz/attempts`, {
              credentials: 'include'
            });
            if (attemptsResponse.ok) {
              const data = await attemptsResponse.json();
              setQuizBestAttempt(data.bestAttempt || null);
            }
          }
        }
      } catch (error) {
        console.warn('[UI] Failed to check quiz:', error.message);
      }
      setShowCompletionOverlay(true);
    };

    checkQuizStatus();
  }, [isChapterComplete, selectedCourse?.courseId, selectedCourse?.id]);

  // Chapters sidebar state
  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar open by default
  const [showLabButton, setShowLabButton] = useState(false); // State for lab button visibility

  // Final project state
  const [finalProject, setFinalProject] = useState(null);
  const [checkingFinalProject, setCheckingFinalProject] = useState(false);
  const [showFinalProjectView, setShowFinalProjectView] = useState(false);

  // Save progress whenever page changes (skip if chapter already completed)
  const progressSaveTimeoutRef = useRef(null);
  const chapterAlreadyCompleted = useRef(initialProgressCompleted || false);
  useEffect(() => {
    if (!pdfPageNumber || !pdfNumPages || !selectedCourse?.courseId || !selectedCourse?.id) return;
    if (chapterAlreadyCompleted.current) return;

    // Debounce to avoid saving on every rapid page change
    if (progressSaveTimeoutRef.current) {
      clearTimeout(progressSaveTimeoutRef.current);
    }

    progressSaveTimeoutRef.current = setTimeout(() => {
      const saveProgress = async () => {
        try {
          const res = await fetch(`${API_URL}/api/courses/${selectedCourse.courseId}/chapters/${selectedCourse.id}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              lastPageNumber: pdfPageNumber,
              totalPages: pdfNumPages
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'completed') {
              chapterAlreadyCompleted.current = true;
            }
          }
        } catch (error) {
          console.warn('[Progress] Failed to save progress:', error.message);
        }
      };
      saveProgress();
    }, 1000);

    return () => {
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
    };
  }, [pdfPageNumber, pdfNumPages, selectedCourse?.courseId, selectedCourse?.id]);

  // Save progress on unmount (user leaves the page) - skip if already completed
  useEffect(() => {
    return () => {
      if (chapterAlreadyCompleted.current) return;
      if (pdfPageNumber && pdfNumPages && selectedCourse?.courseId && selectedCourse?.id) {
        const beacon = JSON.stringify({
          lastPageNumber: pdfPageNumber,
          totalPages: pdfNumPages
        });
        try {
          navigator.sendBeacon(
            `${API_URL}/api/courses/${selectedCourse.courseId}/chapters/${selectedCourse.id}/progress`,
            new Blob([beacon], { type: 'application/json' })
          );
        } catch (e) {
          // sendBeacon might fail silently, that's okay
        }
      }
    };
  }, [pdfPageNumber, pdfNumPages, selectedCourse?.courseId, selectedCourse?.id]);

  // Check for final project
  useEffect(() => {
    const checkFinalProject = async () => {
      console.log('[UI] Checking final project...', selectedCourse);
      setCheckingFinalProject(true);
      
      if (!selectedCourse?.courseId) {
        console.log('[UI] No courseId, skipping final project check');
        setCheckingFinalProject(false);
        setFinalProject(null);
        return;
      }

      try {
        const url = `${API_URL}/api/courses/${selectedCourse.courseId}/final-project`;
        console.log('[UI] Fetching final project from:', url);
        const response = await fetch(url, {
          credentials: 'include'
        });
        console.log('[UI] Final project response status:', response.status);
        
        if (response.ok) {
          const project = await response.json();
          console.log('[UI] Loaded final project:', project);
          console.log('[UI] Final project documents:', project.documents);
          setFinalProject(project);
        } else if (response.status === 404) {
          // No final project exists yet
          console.log('[UI] No final project found (404)');
          setFinalProject(null);
        } else {
          console.error("[UI] Error checking final project:", response.status, response.statusText);
          setFinalProject(null);
        }
      } catch (error) {
        console.error("[UI] Error checking final project:", error);
        setFinalProject(null);
      } finally {
        setCheckingFinalProject(false);
      }
    };

    checkFinalProject();
  }, [selectedCourse?.courseId]);

  // Check for labs with exercises
  useEffect(() => {
    const checkLabs = async () => {
      // Reset state first
      setShowLabButton(false);

      if (!selectedCourse?.courseId) return;

      try {
        const API_URL = import.meta.env.VITE_API_URL ;
        const response = await fetch(`${API_URL}/api/courses/${selectedCourse.courseId}/labs`, {
          credentials: 'include'
        });

        if (response.ok) {
          const labs = await response.json();
          // Check if any lab has at least one exercise
          const hasExercises = Array.isArray(labs) && labs.some(lab => lab.exercisesCount > 0);
          console.log(`[UI] Course ${selectedCourse.courseId} has labs with exercises: ${hasExercises}`);
          setShowLabButton(hasExercises);
        }
      } catch (error) {
        console.error("[UI] Error checking labs:", error);
        setShowLabButton(false);
      }
    };

    checkLabs();
  }, [selectedCourse?.courseId]);

  // Fetch page timing metadata for synchronization
  const fetchPageTimings = useCallback(async (docId, courseId) => {
    if (!docId) return;

    try {
      // Use chapter endpoint if courseId is available, otherwise fallback to documents endpoint
      const endpoint = courseId
        ? `${API_URL}/api/courses/${courseId}/chapters/${docId}/page-timings`
        : `${API_URL}/api/documents/${docId}/page-timings`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Include session cookie for authentication
      });

      if (response.ok) {
        const data = await response.json();
        // Expected format: [{page: 1, time: 0}, {page: 2, time: 30.5}, ...]
        // Or: {timings: [...], pages: [...]}
        if (Array.isArray(data)) {
          setPageTimings(data);
          // If we have page timings with audio, start with first page
          if (data.length > 0 && data[0].audioPath && selectedCourse?.courseId && selectedCourse?.id) {
            // Will be loaded when play is triggered
          }
        } else if (data.timings && Array.isArray(data.timings)) {
          setPageTimings(data.timings);
        } else if (data.pages && Array.isArray(data.pages)) {
          // Convert pages array to timings format if needed
          const timings = data.pages.map((pageData, index) => ({
            page: pageData.page || index + 1,
            time: pageData.time || pageData.startTime || 0,
            duration: pageData.duration,
            audioPath: pageData.audioPath,
          }));
          setPageTimings(timings);
        }
      }
    } catch (error) {
      console.error("Error fetching page timings:", error);
      // If endpoint doesn't exist, we'll just skip synchronization
    }
  }, []);

  // Load audio for a specific page
  const loadPageAudio = useCallback(async (pageNumber, courseId, chapterId) => {
    if (!pageTimings || pageTimings.length === 0) {
      console.warn("[Page Audio] No page timings available");
      return false;
    }

    const pageData = pageTimings.find(t => t.page === pageNumber);
    if (!pageData) {
      console.warn(`[Page Audio] No data found for page ${pageNumber}`);
      return false;
    }

    // Check if page has audio file (new approach with per-page audio)
    if (pageData.audioPath || pageData.audioFile) {
      try {
        // Construct audio URL for the page
        const audioUrl = chapterId && courseId
          ? `${API_URL}/api/courses/${courseId}/chapters/${chapterId}/audio/${pageNumber}`
          : null;

        if (!audioUrl) {
          console.warn(`[Page Audio] Cannot construct audio URL for page ${pageNumber}`);
          return false;
        }

        // Load the audio
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          setCurrentPageAudio(pageNumber);
          const pageLipSyncUrl = `/api/courses/${courseId}/chapters/${chapterId}/lip-sync/${pageNumber}`;
          // Configure libsync for this page audio
          // Wait for audio to be loaded before setting up libsync
          audioRef.current.addEventListener('loadeddata', () => {
            setIsDocumentAudio(true);
            setAudioElement(audioRef.current);
            setAudioId(`${chapterId}-page-${pageNumber}`);
            setLipSyncUrl(pageLipSyncUrl);
            console.log(`[Page Audio] Configured libsync for page ${pageNumber} with ID: ${chapterId}-page-${pageNumber}`);
          }, { once: true });
          // Also set immediately in case loadeddata already fired
          setIsDocumentAudio(true);
          setAudioElement(audioRef.current);
          setAudioId(`${chapterId}-page-${pageNumber}`);
          setLipSyncUrl(pageLipSyncUrl);
          console.log(`[Page Audio] Loaded audio for page ${pageNumber} with libsync ID: ${chapterId}-page-${pageNumber}`);
          return true;
        }
      } catch (error) {
        console.error(`[Page Audio] Error loading audio for page ${pageNumber}:`, error);
        return false;
      }
    }

    return false;
  }, [pageTimings, setAudioElement, setAudioId, setLipSyncUrl]);

  // Move to next page and load its audio
  const playNextPage = useCallback(async () => {
    if (!currentPageAudio || !pdfNumPages) return;

    const nextPage = currentPageAudio + 1;
    if (nextPage > pdfNumPages) {
      // Reached the end - all pages have been read
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentPageAudio(null);
      setIsChapterComplete(true); // Mark chapter as complete
      return;
    }

    // Change slide to next page
    if (setPdfPageNumber) {
      setPdfPageNumber(nextPage);
    }

    // Load and play audio for next page
    const courseId = selectedCourse?.courseId;
    const chapterId = selectedCourse?.id;
    
    if (courseId && chapterId) {
      const loaded = await loadPageAudio(nextPage, courseId, chapterId);
      if (loaded && audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setIsPaused(false);
        } catch (error) {
          console.error(`[Page Audio] Error playing page ${nextPage}:`, error);
        }
      }
    }
  }, [currentPageAudio, pdfNumPages, setPdfPageNumber, selectedCourse, loadPageAudio]);

  // Fetch chapters for sidebar
  useEffect(() => {
    const loadChapters = async () => {
      if (!selectedCourse?.courseId) {
        setChapters([]);
        return;
      }

      setChaptersLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/courses/${selectedCourse.courseId}/chapters`, {
          credentials: 'include' // Important: send session cookie
        });
        if (response.ok) {
          const data = await response.json();
          const chaptersArray = Array.isArray(data) ? data : [data];
          setChapters(chaptersArray);
        } else {
          setChapters([]);
        }
      } catch (error) {
        console.error("Error loading chapters:", error);
        setChapters([]);
      } finally {
        setChaptersLoading(false);
      }
    };

    loadChapters();
  }, [selectedCourse?.courseId]);

  // Reset audio when document changes
  useEffect(() => {
    if (selectedCourse) {
      setIsPlaying(false);
      setIsPaused(false);
      setIsDocumentAudio(false);
      setAnalysisText(null); // Clear analysis when document changes
      setSummaryText(null); // Clear summary when document changes
      setAnswerText(null); // Clear answer text when document changes
      setPageTimings([]); // Reset page timings
      setCurrentPageAudio(null); // Reset current page audio
      setIsChapterComplete(false); // Reset chapter completion status
      chapterAlreadyCompleted.current = initialProgressCompleted || false; // Reset completed flag
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      // Clear audio context for Avatar
      setAudioElement(null);
      setAudioId(null);
      setLipSyncUrl(null);
      // Clear position save interval
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
        positionSaveIntervalRef.current = null;
      }

      // Clear saved position for this document so it starts from beginning on load
      if (selectedCourse.id) {
        localStorage.removeItem(`audio_position_${selectedCourse.id}`);
        // Fetch page timings for synchronization
        fetchPageTimings(selectedCourse.id, selectedCourse.courseId);
      }
    }
  }, [selectedCourse?.id, selectedCourse?.courseId, fetchPageTimings, setAudioElement, setAudioId, setLipSyncUrl]);

  useEffect(() => {
    const loadQuestionHistory = async () => {
      if (!selectedCourse?.courseId || !selectedCourse?.id) {
        setQuestionHistory([]);
        return;
      }

      const storageKey = getHistoryStorageKey();
      let localHistory = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          localHistory = JSON.parse(stored);
        }
      } catch (error) {
        console.warn("[UI] Failed to parse local history:", error);
      }

      setQuestionHistory(localHistory);

      const isAuth = localStorage.getItem("isAuthenticated") === "true";
      if (!isAuth) return;

      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          courseId: selectedCourse.courseId,
          chapterId: selectedCourse.id,
          limit: "50"
        });
        const response = await fetch(`${API_URL}/api/qa/history?${params.toString()}`, {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          const serverItems = Array.isArray(data.items) ? data.items : [];
          const mappedServerItems = serverItems.map((item) => ({
            id: item.id || Date.now(),
            serverId: item.id || null,
            question: item.question,
            answer: item.answer,
            audioUrl: item.audioUrl,
            timestamp: item.timestamp
          }));
          const merged = mergeHistoryEntries(localHistory, mappedServerItems);
          setQuestionHistory(merged);
        }
      } catch (error) {
        console.error("[UI] Failed to load server history:", error);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadQuestionHistory();
  }, [selectedCourse?.courseId, selectedCourse?.id, getHistoryStorageKey, mergeHistoryEntries]);

  useEffect(() => {
    if (!selectedCourse?.courseId || !selectedCourse?.id) return;
    const storageKey = getHistoryStorageKey();
    try {
      localStorage.setItem(storageKey, JSON.stringify(questionHistory));
    } catch (error) {
      console.warn("[UI] Failed to save local history:", error);
    }
  }, [questionHistory, selectedCourse?.courseId, selectedCourse?.id, getHistoryStorageKey]);

  const handlePlay = async () => {
    if (!selectedCourse || !selectedCourse.id) {
      alert("Aucun document sélectionné");
      return;
    }

    const courseId = selectedCourse?.courseId;
    const chapterId = selectedCourse?.id;

    // Resume from pause without jumping pages
    if (isPaused && audioRef.current) {
      if (currentPageAudio && courseId && chapterId) {
        if (setPdfPageNumber) {
          setPdfPageNumber(currentPageAudio);
        }
        if (!audioRef.current.src) {
          const loaded = await loadPageAudio(currentPageAudio, courseId, chapterId);
          if (loaded) {
            await audioRef.current.play();
          }
        } else {
          await audioRef.current.play();
        }
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(true);
      setIsPaused(false);
      setIsDocumentAudio(true);
      return;
    }

    // If chapter is complete, replay from the beginning
    if (isChapterComplete) {
      setIsChapterComplete(false);
      setCurrentPageAudio(null);
      if (setPdfPageNumber) {
        setPdfPageNumber(1);
      }
      // Start playing from first page
      if (courseId && chapterId && pageTimings.length > 0) {
        const loaded = await loadPageAudio(1, courseId, chapterId);
        if (loaded && audioRef.current) {
          // loadPageAudio already configures libsync (setAudioElement and setAudioId)
          await audioRef.current.play();
          setIsPlaying(true);
          setIsPaused(false);
        }
      }
      return;
    }

    // Hide all question modals
    setShowQuestionModal(false);
    setShowHistoryModal(false);
    setAnswerText(null);

    const hasPageAudio = pageTimings.length > 0 && pageTimings[0]?.audioPath;
    if (!hasPageAudio || !courseId || !chapterId) {
      alert("Générez l'audio page par page avant de lancer la lecture.");
      return;
    }

    setTtsLoading(true);
    try {
      const startPage = currentPageAudio || pdfPageNumber || 1;
      if (setPdfPageNumber) {
        setPdfPageNumber(startPage);
      }
      setIsChapterComplete(false);
      const loaded = await loadPageAudio(startPage, courseId, chapterId);
      if (loaded && audioRef.current) {
        await audioRef.current.play();
      }
      setIsPlaying(true);
      setIsPaused(false);
    } catch (error) {
      console.error("Error starting page TTS:", error);
      alert("Échec de la lecture audio. Veuillez réessayer.");
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
      const courseId = selectedCourse.courseId;

      // Fetch summary text - use chapter endpoint if courseId is available
      try {
        const summaryEndpoint = courseId
          ? `${API_URL}/api/courses/${courseId}/chapters/${docId}/summary?language=fr`
          : `${API_URL}/api/documents/${docId}/summary`;

        const summaryTextResponse = await fetch(summaryEndpoint, {
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
        // Note: Chapter summary endpoint includes audio in the response, so we use the same endpoint
        const generateEndpoint = courseId
          ? `${API_URL}/api/courses/${courseId}/chapters/${docId}/summary?language=fr`
          : `${API_URL}/api/documents/${docId}/summary/audio`;

        const generateResponse = await fetch(generateEndpoint, {
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
      const courseId = selectedCourse.courseId;

      // Call the analysis API endpoint - use chapter endpoint if courseId is available
      // Note: Analysis endpoint might not exist for chapters, so we fallback to documents
      const analyzeEndpoint = courseId
        ? `${API_URL}/api/courses/${courseId}/chapters/${docId}/analyze`
        : `${API_URL}/api/documents/${docId}/analyze`;

      const response = await fetch(analyzeEndpoint, {
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
    handlePause();
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
        const historyContext = questionHistory
          .filter((entry) => entry?.question && entry?.answer)
          .slice(0, 5)
          .map((entry) => ({
            question: entry.question,
            answer: entry.answer
          }));

        // Submit text question
        response = await fetch(`${API_URL}/api/qa`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            question: questionText.trim(),
            courseId: selectedCourse?.courseId || null,
            chapterId: selectedCourse?.id || null,
            courseName: selectedCourse?.courseName || null,
            chapterName: selectedCourse?.chapterName || selectedCourse?.chapter_name || null,
            pageNumber: pdfPageNumber || null,
            history: historyContext
          }),
        });
      } else if (recordedAudio) {
        // Submit audio question
        const formData = new FormData();
        formData.append("question", recordedAudio.blob, "question.wav");
        if (selectedCourse?.courseId) {
          formData.append("courseId", selectedCourse.courseId);
        }
        if (selectedCourse?.id) {
          formData.append("chapterId", selectedCourse.id);
        }
        if (selectedCourse?.courseName) {
          formData.append("courseName", selectedCourse.courseName);
        }
        if (selectedCourse?.chapterName || selectedCourse?.chapter_name) {
          formData.append("chapterName", selectedCourse?.chapterName || selectedCourse?.chapter_name);
        }
        if (pdfPageNumber) {
          formData.append("pageNumber", String(pdfPageNumber));
        }

        response = await fetch(`${API_URL}/api/qa`, {
          method: "POST",
          body: formData,
          credentials: "include",
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
          serverId: data.historyId || null,
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

    if (!selectedCourse || !numPages) return null;

    return (
      <>
        {/* Page Number Display - Top Center */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg border-2 border-pink-200 px-6 py-2">
            <span className="text-gray-800 font-semibold text-base">
              Page {pageNumber} {numPages && `sur ${numPages}`}
            </span>
          </div>
        </div>


      </>
    );
  };

  return (
    <>
      {/* Chapters Sidebar */}
      {selectedCourse?.courseId && (
        <div
          className={`fixed left-0 top-0 bottom-0 z-30 bg-white shadow-2xl transition-all duration-300 pointer-events-auto ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
            }`}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="flex flex-col border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
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
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Chapitres
                </h2>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-white hover:text-gray-200 transition-colors"
                  title={sidebarOpen ? "Masquer" : "Afficher"}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {sidebarOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </div>

            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto p-4">
              {chaptersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : chapters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun chapitre disponible</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter) => {
                    const isActive = chapter.id === selectedCourse.id;
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => {
                          if (onSelectChapter && !isActive) {
                            onSelectChapter({
                              ...chapter,
                              courseId: selectedCourse.courseId,
                              courseName: selectedCourse.courseName,
                              courseDescription: selectedCourse.courseDescription
                            });
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-all ${isActive
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`font-semibold text-sm mb-1 ${isActive ? 'text-white' : 'text-gray-800'}`}>
                              {chapter.chapterName}
                            </h3>
                            {chapter.chapterDescription && (
                              <p className={`text-xs line-clamp-2 ${isActive ? 'text-purple-100' : 'text-gray-600'}`}>
                                {chapter.chapterDescription}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {chapter.numPagesVisual > 0 && (
                                <span className={`flex items-center gap-1 ${isActive ? 'text-purple-100' : 'text-gray-500'}`}>
                                  <svg
                                    className="w-3 h-3"
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
                                  {chapter.numPagesVisual} pages
                                </span>
                              )}
                              {chapter.webpImages && chapter.webpImages.length > 0 && (
                                <span className={`flex items-center gap-1 ${isActive ? 'text-green-200' : 'text-green-600'}`}>
                                  <svg
                                    className="w-3 h-3"
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
                                  {chapter.webpImages.length} images
                                </span>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <svg
                              className="w-5 h-5 text-white flex-shrink-0 ml-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lab Button (Footer) */}
            {(showLabButton || selectedCourse?.hasStatements) && onOpenLab && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => onOpenLab(selectedCourse)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-sm transform hover:scale-[1.02]"
                  title="Accéder aux exercices pratiques"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Accéder au Labo
                </button>
              </div>
            )}

            {/* Final Project Button (Footer) */}
            {finalProject && onOpenFinalProject && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => onOpenFinalProject(selectedCourse, finalProject)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-md py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-sm transform hover:scale-[1.02]"
                  title="Voir le projet final"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Voir le Projet Final
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Answer Display Box - Left Side */}
      {answerText && (
        <div
          className={`fixed top-1/2 transform -translate-y-1/2 z-30 pointer-events-auto transition-all ${pdfReaderOpen
            ? sidebarOpen
              ? "right-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "right-4 w-96 max-w-md"
            : sidebarOpen
              ? "right-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "right-4 w-96 max-w-md"
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
          className={`fixed z-30 pointer-events-auto transition-all ${pdfReaderOpen
            ? sidebarOpen
              ? "right-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "right-4 w-96 max-w-md"
            : sidebarOpen
              ? "right-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "right-4 w-96 max-w-md"
            } ${answerText && summaryText
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
          className={`fixed z-30 pointer-events-auto transition-all ${pdfReaderOpen
            ? sidebarOpen
              ? "right-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "right-4 w-96 max-w-md"
            : sidebarOpen
              ? "right-4 w-80 max-w-[calc(33.333%-2rem)]"
              : "right-4 w-96 max-w-md"
            } ${answerText && analysisText
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
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="Titan Academy Logo" 
                className="h-8 w-auto"
              />
              <div>
                
                {selectedCourse && (
                  <div className="mt-1">
                    <p className="text-sm text-gray-600 font-semibold">
                      Apprentissage : {selectedCourse.courseName || selectedCourse.title}
                    </p>
                    {/* {selectedCourse.courseDescription && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {selectedCourse.courseDescription}
                      </p>
                    )} */}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pointer-events-auto">
              {selectedCourse?.hasStatements && onOpenLab && (
                <button
                  onClick={() => onOpenLab(selectedCourse)}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                  title="Passer aux exercices avec le lab"
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span>Ouvrir le Lab</span>
                </button>
              )}
              {onBackToHome && (
                <button
                  onClick={onBackToHome}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                  title="Retour aux chapitres"
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
                  <span>Retour</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Main Avatar Control Buttons - Bottom Center */}
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-30 flex items-center justify-center gap-3 md:gap-4 pointer-events-auto">
          {/* Play/Replay Button */}
          <button
            onClick={handlePlay}
            disabled={!selectedCourse || (isPlaying && !isChapterComplete) || ttsLoading}
            className={`pointer-events-auto ${isChapterComplete ? 'bg-orange-500 hover:bg-orange-600' : 'bg-pink-500 hover:bg-pink-600'} disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 md:p-4 rounded-full transition-colors shadow-lg ${(isPlaying && !isChapterComplete) || ttsLoading ? "opacity-50" : ""
              }`}
            title={ttsLoading ? "Génération audio..." : isChapterComplete ? "Rejouer le chapitre" : "Lire"}
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
            ) : isChapterComplete ? (
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
                  d="M16.023 9.348a4.5 4.5 0 010 7.196m-7.106-7.196a4.5 4.5 0 000 7.196m7.106 0L12 12.75m-4.5-4.5L12 3.75m0 0l4.5 4.5M12 3.75l-4.5 4.5M12 21a9 9 0 100-18 9 9 0 000 18z"
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
            className={`pointer-events-auto bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 md:p-4 rounded-full transition-colors shadow-lg ${questionHistory.length === 0 ? "opacity-50" : ""
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
            className={`pointer-events-auto bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 md:p-4 rounded-full transition-colors shadow-lg ${!selectedCourse || ttsLoading || summaryLoading ? "opacity-50" : ""
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
            onEnded={() => {
              // For document audio: move to next page when current page audio ends
              if (isDocumentAudio && currentPageAudio) {
                // Play next page audio
                playNextPage();
              } else {
                // Non-document audio ended (summary/answer)
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
              }

              // Keep answer text visible even after audio ends
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              setIsPaused(true);
              // Save position when paused (for document audio)
              if (selectedCourse?.id && isDocumentAudio && audioRef.current) {
                savePosition(selectedCourse.id, audioRef.current.currentTime);
              }
            }}
          />
        </div>
      </div>

      {/* Chapter Completion Overlay */}
      {showCompletionOverlay && isChapterComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Chapitre terminé !</h3>

            {/* Case 1: Quiz exists and user already passed it - show results */}
            {hasQuizQuestions && quizBestAttempt && quizBestAttempt.percentage >= 50 ? (
              <div>
                <p className="text-gray-600 mb-4">Vous avez déjà réussi le quiz de ce chapitre.</p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      quizBestAttempt.percentage >= 80 ? 'bg-green-500' : 'bg-yellow-500'
                    }`}>
                      {Math.round(quizBestAttempt.percentage)}%
                    </div>
                  </div>
                  <p className="text-green-800 font-semibold text-lg">
                    {quizBestAttempt.score}/{quizBestAttempt.totalQuestions} bonnes réponses
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    {quizBestAttempt.percentage >= 80 ? 'Excellent travail !' : 'Quiz réussi !'}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(`/courses/${selectedCourse.courseId}/chapters/${selectedCourse.id}/quiz`)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Repasser le Quiz
                  </button>
                  <button
                    onClick={() => setShowCompletionOverlay(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>

            /* Case 2: Quiz exists but not passed yet (or failed) - show "Passer le Quiz" */
            ) : hasQuizQuestions ? (
              <div>
                <p className="text-gray-600 mb-6">
                  {quizBestAttempt
                    ? `Votre meilleur score : ${Math.round(quizBestAttempt.percentage)}%. Réessayez pour améliorer votre résultat !`
                    : 'Testez vos connaissances avec le quiz !'}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(`/courses/${selectedCourse.courseId}/chapters/${selectedCourse.id}/quiz`)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Passer le Quiz
                  </button>
                  <button
                    onClick={() => setShowCompletionOverlay(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    Plus tard
                  </button>
                </div>
              </div>

            /* Case 3: No quiz for this chapter */
            ) : (
              <div>
                <p className="text-gray-600 mb-6">
                  Félicitations, vous avez terminé ce chapitre !
                </p>
                <button
                  onClick={() => setShowCompletionOverlay(false)}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  Continuer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar Toggle Button (when sidebar is closed) */}
      {selectedCourse?.courseId && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40 bg-gradient-to-r from-purple-500 to-pink-600 text-white p-3 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-700 transition-all pointer-events-auto"
          title="Afficher les chapitres"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

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
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none ${duplicateQuestion ? "border-yellow-500" : "border-gray-300"
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
                      className={`p-3 cursor-pointer hover:bg-pink-50 transition-colors ${index === selectedSuggestionIndex ? "bg-pink-100" : ""
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
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${isRecording
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
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${(!questionText.trim() && !recordedAudio) || loading || message || ttsLoading
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

      {/* Final Project View Modal */}
      {showFinalProjectView && finalProject && selectedCourse && (
        <FinalProjectViewModal
          course={selectedCourse}
          finalProject={finalProject}
          onClose={() => {
            setShowFinalProjectView(false);
          }}
        />
      )}

    </>
  );
};

// Modal pour visualiser le projet final et ses documents
const FinalProjectViewModal = ({ course, finalProject, onClose }) => {
  const [documents, setDocuments] = useState(finalProject?.documents || []);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL ;

  useEffect(() => {
    // Load documents if not already loaded
    if (finalProject && (!finalProject.documents || finalProject.documents.length === 0)) {
      loadDocuments();
    } else {
      setDocuments(finalProject?.documents || []);
    }
  }, [finalProject]);

  const loadDocuments = async () => {
    if (!course?.courseId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/courses/${course.courseId}/final-project`, {
        credentials: 'include'
      });
      if (response.ok) {
        const project = await response.json();
        setDocuments(project.documents || []);
      }
    } catch (err) {
      console.error("[UI] Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentPdfUrl = (documentId) => {
    return `${API_URL}/api/courses/${course.courseId}/final-project/documents/${documentId}/pdf`;
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
