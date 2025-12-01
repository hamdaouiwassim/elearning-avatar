import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFViewerAndroid } from "./PDFViewerAndroid";

// Set up the worker for pdfjs - using local worker file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Detect Android device
const isAndroid = /Android/i.test(navigator.userAgent);

export const PDFBackground = ({ document, pageNumber, setPageNumber, scale, setScale, numPages, setNumPages: setNumPagesProp }) => {
  const [file, setFile] = useState(null);

  // Validate and normalize props to prevent object rendering errors
  const normalizedPageNumber = typeof pageNumber === 'number' && !isNaN(pageNumber) ? pageNumber : 1;
  const normalizedScale = typeof scale === 'number' && !isNaN(scale) ? scale : 1.0;

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
    if (document && typeof document === 'object' && !Array.isArray(document)) {
      // If document has id, construct the URL to fetch from API
      const documentId = document.id;
      if (documentId && (typeof documentId === 'string' || typeof documentId === 'number')) {
        const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";
        setFile(`${API_URL}/api/documents/${String(documentId)}/file`);
        
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
        if (pdfUrl && typeof pdfUrl === 'string') {
          setFile(pdfUrl);
        }
      }
      if (setPageNumber) {
        setPageNumber(1);
      }
    } else if (document === null || document === undefined) {
      // Document is null/undefined, clear file
      setFile(null);
    }
  }, [document, setPageNumber, setNumPagesProp]);

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

  if (!document || !file) return null;

  return (
    <div className="fixed inset-0 z-0 bg-gray-100 overflow-auto landscape-mode">
      <div className="min-h-full flex items-center justify-center p-2 lg:p-4">
        {file ? (
          <div className="bg-white shadow-2xl w-full h-full flex items-center justify-center">
            {isAndroid ? (
              // Android-compatible viewer using iframe - Landscape optimized
              <div className="w-full h-full">
                <PDFViewerAndroid
                  file={file}
                  pageNumber={normalizedPageNumber}
                  scale={normalizedScale}
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
                file={file}
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
                  pageNumber={normalizedPageNumber}
                  scale={normalizedScale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={
                    <div className="p-8 text-center text-gray-500">
                      Loading page...
                    </div>
                  }
                  // Optimize for landscape and TV performance
                  devicePixelRatio={window.devicePixelRatio || 1}
                  width={window.innerWidth * 0.95} // Use 95% of screen width for landscape
                />
              </Document>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

