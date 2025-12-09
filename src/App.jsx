import { useState, lazy, Suspense, useEffect } from "react";
import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { ChapterSelection } from "./components/ChapterSelection";
import { CapabilityError } from "./components/CapabilityError";
import { OldBrowserError } from "./components/OldBrowserError";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { checkCapabilities, isOldBrowser } from "./utils/capabilityChecker";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { isAndroid } from "./utils/deviceDetector";
import { checkAuthStatus, isAuthenticated } from "./utils/auth";

// Lazy load heavy components for better TV performance with retry logic
const Experience = lazyWithRetry(() => import("./components/Experience").then(module => ({ default: module.Experience })));
const UI = lazyWithRetry(() => import("./components/UI").then(module => ({ default: module.UI })));
const ImageBackground = lazyWithRetry(() => import("./components/ImageBackground").then(module => ({ default: module.ImageBackground })));
const LabPage = lazyWithRetry(() => import("./components/LabPage").then(module => ({ default: module.LabPage })));

function App() {
  const [view, setView] = useState("home"); // home | chapters | learning | lab
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [labCourse, setLabCourse] = useState(null);
  const [pdfReaderOpen] = useState(true);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [capabilityCheckDone, setCapabilityCheckDone] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Check authentication status on mount
  useEffect(() => {
    const verifyAuth = async () => {
      // First check localStorage for quick check
      if (isAuthenticated()) {
        // Then verify with server
        const isAuth = await checkAuthStatus();
        setAuthenticated(isAuth);
        if (!isAuth) {
          // Clear invalid auth state
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("userEmail");
        }
      }
      setAuthChecking(false);
    };

    verifyAuth();
  }, []);

  // Check browser/hardware capabilities on mount
  useEffect(() => {
    const caps = checkCapabilities();
    setCapabilities(caps);
    setCapabilityCheckDone(true);
  }, []);

  // Preload critical modules on Android devices to prevent loading failures
  useEffect(() => {
    if (isAndroid()) {
      // Preload UI component as it's critical and often fails on Android
      const preloadModules = async () => {
        try {
          // Preload UI component
          await import("./components/UI");
          console.log("Android: Preloaded UI module successfully");
        } catch (error) {
          console.warn("Android: Failed to preload UI module:", error);
        }
      };
      
      // Delay preloading slightly to not interfere with initial render
      const timer = setTimeout(preloadModules, 500);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Delay Canvas rendering slightly (only for the learning view) to prioritize PDF loading on TV
  useEffect(() => {
    if (view === "learning") {
      const timer = setTimeout(() => {
        setIsCanvasReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
    setIsCanvasReady(false);
  }, [view]);
  
  // Retry capability check
  const handleRetryCapabilityCheck = () => {
    setCapabilityCheckDone(false);
    setTimeout(() => {
      const caps = checkCapabilities();
      setCapabilities(caps);
      setCapabilityCheckDone(true);
    }, 100);
  };

  const handleStartLearning = async (course) => {
    // If it's already a chapter (has courseId), start learning directly
    if (course.courseId) {
      setSelectedChapter(course);
      setSelectedCourse(course);
      setLabCourse(null);
      setView("learning");
      return;
    }

    // This is a course, fetch chapters and select the first one
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";
      const response = await fetch(`${API_URL}/api/courses/${course.id}/chapters`, {
        credentials: 'include' // Important: send session cookie
      });
      
      if (response.ok) {
        const chapters = await response.json();
        const chaptersArray = Array.isArray(chapters) ? chapters : [];
        
        if (chaptersArray.length > 0) {
          // Select the first chapter
          const firstChapter = {
            ...chaptersArray[0],
            courseId: course.id,
            courseName: course.courseName,
            courseDescription: course.courseDescription
          };
          setSelectedChapter(firstChapter);
          setSelectedCourse(firstChapter);
          setLabCourse(null);
          setView("learning");
        } else {
          // No chapters available, show chapter selection view
          setSelectedCourse(course);
          setSelectedChapter(null);
          setLabCourse(null);
          setView("chapters");
        }
      } else {
        // Error fetching chapters, show chapter selection view
        setSelectedCourse(course);
        setSelectedChapter(null);
        setLabCourse(null);
        setView("chapters");
      }
    } catch (error) {
      console.error("Error loading chapters:", error);
      // On error, show chapter selection view
      setSelectedCourse(course);
      setSelectedChapter(null);
      setLabCourse(null);
      setView("chapters");
    }
  };

  const handleSelectChapter = (chapter) => {
    setSelectedChapter(chapter);
    setSelectedCourse(chapter);
    setLabCourse(null);
    setView("learning");
  };

  const handleOpenLab = (course) => {
    if (!course || !course.hasStatements) {
      return;
    }
    setLabCourse(course);
    setSelectedCourse(course);
    setView("lab");
  };

  const handleBackToHome = () => {
    setView("home");
    setSelectedCourse(null);
    setSelectedChapter(null);
    setLabCourse(null);
  };

  const handleLoginSuccess = () => {
    setAuthenticated(true);
    setView("home");
  };

  const handleBackToChapters = () => {
    setView("chapters");
    setSelectedChapter(null);
  };

  const isHome = view === "home";
  const isChapters = view === "chapters";
  const isLearning = view === "learning";
  const isLab = view === "lab";

  // Check for old browser first (before capability check)
  if (isOldBrowser()) {
    return <OldBrowserError />;
  }

  // Show login if not authenticated
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show capability error if requirements not met
  if (capabilityCheckDone && capabilities && !capabilities.supported) {
    // Check if it's an old browser error
    const hasOldBrowserError = capabilities.errors?.some(err => err.isOldBrowser);
    if (hasOldBrowserError) {
      return <OldBrowserError />;
    }
    return <CapabilityError onRetry={handleRetryCapabilityCheck} />;
  }

  if (isHome) {
    return (
      <>
        {!capabilityCheckDone && (
          <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Checking system requirements...</p>
            </div>
          </div>
        )}
        {capabilityCheckDone && (
          <Home
            onStartLearning={handleStartLearning}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Loader />
      <Leva hidden />
      
      {/* Chapter Selection View */}
      {isChapters && selectedCourse && (
        <ChapterSelection
          course={selectedCourse}
          onSelectChapter={handleSelectChapter}
          onBackToHome={handleBackToHome}
        />
      )}

      {/* Image Background - Lazy loaded with Suspense */}
      {isLearning && selectedChapter && (
        <ErrorBoundary componentName="Image Reader">
          <Suspense fallback={
            <div className="fixed inset-0 z-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-xl">Chargement des images...</p>
              </div>
            </div>
          }>
            <ImageBackground
              document={selectedChapter}
              pageNumber={pdfPageNumber}
              setPageNumber={setPdfPageNumber}
              scale={pdfScale}
              setScale={setPdfScale}
              numPages={pdfNumPages}
              setNumPages={setPdfNumPages}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      
      {/* Avatar Canvas - Overlay - Lazy loaded with Suspense */}
      {isCanvasReady && isLearning && (
        <ErrorBoundary componentName="3D Avatar">
          <Canvas
            shadows
            camera={{ position: [0, 0, 1], fov: 30 }}
            dpr={[1, 2]} // Limit pixel ratio for TV performance
            performance={{ min: 0.5 }} // Reduce quality if FPS drops below 30
            style={{
              width: "100%",
              height: "100%",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 10,
            }}
            gl={{ 
              antialias: false, // Disable antialiasing for better TV performance
              powerPreference: "high-performance",
              stencil: false,
              depth: true
            }}
          >
            <Suspense fallback={null}>
              <Experience />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      )}
      
      {/* Overlay content */}
      <ErrorBoundary componentName="UI Component">
        <Suspense fallback={
          <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading UI...</p>
            </div>
          </div>
        }>
          {isLearning && selectedChapter ? (
            <UI
              pdfReaderOpen={pdfReaderOpen}
              selectedCourse={selectedChapter}
              onBackToHome={handleBackToHome}
              onSelectChapter={handleSelectChapter}
              pdfPageNumber={pdfPageNumber}
              setPdfPageNumber={setPdfPageNumber}
              pdfScale={pdfScale}
              setPdfScale={setPdfScale}
              pdfNumPages={pdfNumPages}
              onOpenLab={handleOpenLab}
            />
          ) : (
            <LabPage onBackToHome={handleBackToHome} course={labCourse} />
          )}
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
