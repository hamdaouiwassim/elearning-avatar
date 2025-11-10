import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the worker for pdfjs - using local worker file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export const PDFBackground = ({ document, pageNumber, setPageNumber, scale, setScale, numPages, setNumPages: setNumPagesProp }) => {
  const [file, setFile] = useState(null);

  const onDocumentLoadSuccess = ({ numPages: docNumPages }) => {
    if (setNumPagesProp) {
      setNumPagesProp(docNumPages);
    }
    if (setPageNumber) {
      setPageNumber(1);
    }
  };

  useEffect(() => {
    if (document) {
      // If document has id, construct the URL to fetch from API
      if (document.id) {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        setFile(`${API_URL}/api/documents/${document.id}/file`);
      } else if (document.pdfUrl) {
        // Fallback to pdfUrl if it exists
        setFile(document.pdfUrl);
      }
      if (setPageNumber) {
        setPageNumber(1);
      }
    }
  }, [document, setPageNumber]);

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
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setPageNumber((prev) => Math.min(numPages, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [file, numPages, setPageNumber]);

  if (!document || !file) return null;

  return (
    <div className="fixed inset-0 z-0 bg-gray-100 overflow-auto">
      <div className="min-h-full flex items-center justify-center p-8">
        {file ? (
          <div className="bg-white shadow-2xl max-w-full">
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
              />
            </Document>
          </div>
        ) : null}
      </div>
    </div>
  );
};

