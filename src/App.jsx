import { useState } from "react";
import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { Home } from "./components/Home";
import { PDFBackground } from "./components/PDFBackground";

function App() {
  const [showLearning, setShowLearning] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [pdfReaderOpen, setPdfReaderOpen] = useState(true);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfNumPages, setPdfNumPages] = useState(null);

  const handleStartLearning = (course) => {
    setSelectedCourse(course);
    setShowLearning(true);
  };

  const handleBackToHome = () => {
    setShowLearning(false);
    setSelectedCourse(null);
  };

  if (!showLearning) {
    return <Home onStartLearning={handleStartLearning} />;
  }

  return (
    <>
      <Loader />
      <Leva />
      {/* PDF Background */}
      {selectedCourse && (
        <PDFBackground
          document={selectedCourse}
          pageNumber={pdfPageNumber}
          setPageNumber={setPdfPageNumber}
          scale={pdfScale}
          setScale={setPdfScale}
          numPages={pdfNumPages}
          setNumPages={setPdfNumPages}
        />
      )}
      {/* Avatar Canvas - Overlay */}
      <Canvas
        shadows
        camera={{ position: [0, 0, 1], fov: 30 }}
        style={{
          width: "100%",
          height: "100%",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 10,
        }}
      >
        <Experience />
      </Canvas>
      {/* UI Controls - Overlay */}
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
    </>
  );
}

export default App;
