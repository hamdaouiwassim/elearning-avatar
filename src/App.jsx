import { useState, lazy, Suspense, useEffect } from "react";
import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Home } from "./components/Home";
import { CapabilityError } from "./components/CapabilityError";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { checkCapabilities } from "./utils/capabilityChecker";

// Lazy load heavy components for better TV performance
const Experience = lazy(() => import("./components/Experience").then(module => ({ default: module.Experience })));
const UI = lazy(() => import("./components/UI").then(module => ({ default: module.UI })));
const PDFBackground = lazy(() => import("./components/PDFBackground").then(module => ({ default: module.PDFBackground })));

function App() {
  const [showLearning, setShowLearning] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
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
  
  // Delay Canvas rendering slightly to prioritize PDF loading on TV
  useEffect(() => {
    if (showLearning) {
      // Small delay to let PDF start loading first
      const timer = setTimeout(() => {
        setIsCanvasReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsCanvasReady(false);
    }
  }, [showLearning]);
  
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
    setShowLearning(true);
  };

  const handleBackToHome = () => {
    setShowLearning(false);
    setSelectedCourse(null);
  };

  // Show capability error if requirements not met
  if (capabilityCheckDone && capabilities && !capabilities.supported) {
    return <CapabilityError onRetry={handleRetryCapabilityCheck} />;
  }

  if (!showLearning) {
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
        {capabilityCheckDone && <Home onStartLearning={handleStartLearning} />}
      </>
    );
  }

  return (
    <>
      <Loader />
      <Leva hidden />
      
      {/* PDF Background - Lazy loaded with Suspense */}
      {selectedCourse && (
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
      {isCanvasReady && (
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
      
      {/* UI Controls - Overlay - Lazy loaded with Suspense */}
      <Suspense fallback={
        <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading UI...</p>
          </div>
        </div>
      }>
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
        />
      </Suspense>
    </>
  );
}

export default App;
