import { useState, lazy, Suspense, useEffect } from "react";
import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Home } from "./components/Home";
import { CapabilityError } from "./components/CapabilityError";
import { OldBrowserError } from "./components/OldBrowserError";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { checkCapabilities, isOldBrowser } from "./utils/capabilityChecker";
import { lazyWithRetry } from "./utils/lazyWithRetry";

// Lazy load heavy components for better TV performance with retry logic
const Experience = lazyWithRetry(() => import("./components/Experience").then(module => ({ default: module.Experience })));
const UI = lazyWithRetry(() => import("./components/UI").then(module => ({ default: module.UI })));
const PDFBackground = lazyWithRetry(() => import("./components/PDFBackground").then(module => ({ default: module.PDFBackground })));
const LabPage = lazyWithRetry(() => import("./components/LabPage").then(module => ({ default: module.LabPage })));

function App() {
  const [view, setView] = useState("home"); // home | learning | lab
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [labCourse, setLabCourse] = useState(null);
  const [pdfReaderOpen, setPdfReaderOpen] = useState(true);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [capabilityCheckDone, setCapabilityCheckDone] = useState(false);
  
  // Check browser/hardware capabilities on mount
  useEffect(() => {
    const caps = checkCapabilities();
    setCapabilities(caps);
    setCapabilityCheckDone(true);
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

  const handleStartLearning = (course) => {
    setSelectedCourse(course);
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
    setLabCourse(null);
  };

  const isHome = view === "home";
  const isLearning = view === "learning";
  const isLab = view === "lab";

  // Check for old browser first (before capability check)
  if (isOldBrowser()) {
    return <OldBrowserError />;
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
      
      {/* PDF Background - Lazy loaded with Suspense */}
      {isLearning && selectedCourse && (
        <ErrorBoundary componentName="PDF Reader">
          <Suspense fallback={
            <div className="fixed inset-0 z-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-xl">Loading PDF...</p>
              </div>
            </div>
          }>
            <PDFBackground
              document={selectedCourse}
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
          {isLearning && selectedCourse ? (
            <UI
              pdfReaderOpen={pdfReaderOpen}
              setPdfReaderOpen={setPdfReaderOpen}
              selectedCourse={selectedCourse}
              onBackToHome={handleBackToHome}
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
