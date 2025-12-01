import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFViewerAndroid } from "./PDFViewerAndroid";
import { SimplePDFViewer } from "./SimplePDFViewer";
import { isAndroid, isAndroidBox } from "../utils/deviceDetector";
import { SafeRender } from "../utils/safeComponent";

// Set up the worker for pdfjs - using local worker file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export const PDFBackground = ({ document, pageNumber, setPageNumber, scale, setScale, numPages, setNumPages: setNumPagesProp }) => {
  const [file, setFile] = useState(null);

  // Validate and normalize props to prevent object rendering errors
  const normalizedPageNumber = typeof pageNumber === 'number' && !isNaN(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const normalizedScale = typeof scale === 'number' && !isNaN(scale) && scale > 0 ? scale : 1.0;
  
  // Ensure file is always a string or null, never an object
  const normalizedFile = typeof file === 'string' ? file : null;

  const onDocumentLoadSuccess = (result) => {
    // Safely extract numPages from result object
    let docNumPages = null;
    if (result && typeof result === 'object') {
      docNumPages = result.numPages;
    }
    
    // Only update if we don't already have a page count from metadata
    // or if the loaded count is more reliable (not a placeholder)
    if (setNumPagesProp && typeof docNumPages === 'number' && !isNaN(docNumPages)) {
      if (!numPages || (docNumPages < 1000)) {
        setNumPagesProp(docNumPages);
      }
    }
    if (setPageNumber) {
      setPageNumber(1);
    }
  };

  useEffect(() => {
    try {
      if (document && typeof document === 'object' && !Array.isArray(document)) {
        // If document has id, construct the URL to fetch from API
        const documentId = document.id;
        if (documentId && (typeof documentId === 'string' || typeof documentId === 'number')) {
          const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";
          const fileUrl = `${API_URL}/api/documents/${String(documentId)}/file`;
          
          // Ensure fileUrl is always a string
          if (typeof fileUrl === 'string' && fileUrl.length > 0) {
            setFile(fileUrl);
          } else {
            console.error('PDFBackground: Invalid file URL generated', fileUrl);
            setFile(null);
          }
          
          // Try to get page count from document metadata if available
          if (isAndroid && setNumPagesProp) {
            const numPagesVisual = document.numPagesVisual;
            const numPages = document.numPages;
            if (typeof numPagesVisual === 'number' && !isNaN(numPagesVisual)) {
              setNumPagesProp(numPagesVisual);
            } else if (typeof numPages === 'number' && !isNaN(numPages)) {
              setNumPagesProp(numPages);
            }
          }
        } else {
          // Fallback to pdfUrl if it exists
          const pdfUrl = document.pdfUrl;
          if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.length > 0) {
            setFile(pdfUrl);
          } else {
            console.error('PDFBackground: Invalid pdfUrl', pdfUrl);
            setFile(null);
          }
        }
        if (setPageNumber) {
          setPageNumber(1);
        }
      } else if (document === null || document === undefined) {
        // Document is null/undefined, clear file
        setFile(null);
      } else {
        console.error('PDFBackground: Invalid document type', typeof document, document);
        setFile(null);
      }
    } catch (error) {
      console.error('PDFBackground: Error processing document', error);
      setFile(null);
    }
  }, [document, setPageNumber, setNumPagesProp, isAndroid]);

  // Keyboard navigation
  useEffect(() => {
    if (!file || !numPages || !setPageNumber) return;

    const handleKeyDown = (event) => {
      // Don't handle if user is typing in an input field
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.isContentEditable
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPageNumber((prev) => {
          const currentPage = typeof prev === 'number' ? prev : normalizedPageNumber;
          return Math.max(1, currentPage - 1);
        });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setPageNumber((prev) => {
          const currentPage = typeof prev === 'number' ? prev : normalizedPageNumber;
          return numPages ? Math.min(numPages, currentPage + 1) : currentPage + 1;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [file, numPages, setPageNumber]);

  // Early return if no document or file is not a valid string
  if (!document || !normalizedFile) return null;

  // Use simple viewer for Android boxes, full viewer for TV and other devices
  const useSimpleViewer = isAndroidBox();
  const useAndroidViewer = isAndroid() && !isAndroidBox(); // Android but not a box (TV)

  // Final safety check - ensure all values are primitives
  const safeFile = String(normalizedFile);
  const safePageNumber = Number(normalizedPageNumber) || 1;
  const safeScale = Number(normalizedScale) || 1.0;

  // Fullscreen styles for Android boxes
  const fullscreenStyles = useSimpleViewer ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    zIndex: 0,
    overflow: 'hidden'
  } : {};

  return (
    <SafeRender>
      <div 
        className={useSimpleViewer ? "fixed inset-0 bg-gray-100" : "fixed inset-0 z-0 bg-gray-100 overflow-auto landscape-mode"}
        style={fullscreenStyles}
      >
        {useSimpleViewer ? (
          // Simple PDF viewer for Android boxes - fullscreen iframe
          <SimplePDFViewer 
            fileUrl={safeFile}
            pageNumber={safePageNumber}
          />
        ) : (
          <div className="min-h-full flex items-center justify-center p-2 lg:p-4">
            <div className="bg-white shadow-2xl w-full h-full flex items-center justify-center">
              {useAndroidViewer ? (
                // Android-compatible viewer using iframe - Landscape optimized (for TV)
                <div className="w-full h-full">
                  <PDFViewerAndroid
                    file={safeFile}
                    pageNumber={safePageNumber}
                    scale={safeScale}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="p-8 text-center text-gray-600">
                        Loading PDF...
                      </div>
                    }
                    error={
                      <div className="p-8 text-center text-red-600">
                        Error loading PDF. Please try another file.
                      </div>
                    }
                  />
                </div>
              ) : (
                // Standard react-pdf viewer for non-Android devices - Landscape optimized
                <Document
                  file={safeFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="p-8 text-center text-gray-600">
                      Loading PDF...
                    </div>
                  }
                  error={
                    <div className="p-8 text-center text-red-600">
                      Error loading PDF. Please try another file.
                    </div>
                  }
                >
                  <Page
                    pageNumber={safePageNumber}
                    scale={safeScale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="p-8 text-center text-gray-500">
                        Loading page...
                      </div>
                    }
                    // Optimize for landscape and TV performance
                    devicePixelRatio={typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1}
                    width={typeof window !== 'undefined' && typeof window.innerWidth === 'number' ? window.innerWidth * 0.95 : 800} // Use 95% of screen width for landscape
                  />
                </Document>
              )}
            </div>
          </div>
        )}
      </div>
    </SafeRender>
  );
};

