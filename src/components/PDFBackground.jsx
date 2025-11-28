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

  const onDocumentLoadSuccess = ({ numPages: docNumPages }) => {
    // Only update if we don't already have a page count from metadata
    // or if the loaded count is more reliable (not a placeholder)
    if (setNumPagesProp) {
      if (!numPages || (docNumPages && docNumPages < 1000)) {
        setNumPagesProp(docNumPages);
      }
    }
    if (setPageNumber) {
      setPageNumber(1);
    }
  };

  useEffect(() => {
    if (document) {
      // If document has id, construct the URL to fetch from API
      if (document.id) {
        const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";
        setFile(`${API_URL}/api/documents/${document.id}/file`);
        
        // Try to get page count from document metadata if available
        if (isAndroid && setNumPagesProp) {
          if (document.numPagesVisual) {
            setNumPagesProp(document.numPagesVisual);
          } else if (document.numPages) {
            setNumPagesProp(document.numPages);
          }
        }
      } else if (document.pdfUrl) {
        // Fallback to pdfUrl if it exists
        setFile(document.pdfUrl);
      }
      if (setPageNumber) {
        setPageNumber(1);
      }
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
        setPageNumber((prev) => Math.max(1, prev - 1));
      } else       if (event.key === "ArrowRight") {
        event.preventDefault();
        setPageNumber((prev) => numPages ? Math.min(numPages, prev + 1) : prev + 1);
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
                  pageNumber={pageNumber || 1}
                  scale={scale || 1.0}
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
                  pageNumber={pageNumber || 1}
                  scale={scale || 1.0}
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

