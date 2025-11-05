import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the worker for pdfjs - using local worker file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export const PDFReader = ({ isOpen, onClose, document }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [file, setFile] = useState(null);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
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
      setPageNumber(1);
    }
  }, [document]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !file || !numPages) return;

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
  }, [isOpen, file, numPages]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setPageNumber(1);
    } else {
      alert("Please select a valid PDF file");
    }
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleSliderChange = (event) => {
    const newPage = parseInt(event.target.value);
    setPageNumber(newPage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-2/3 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-pink-500 text-white p-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl">PDF Reader</h2>
          {document && (
            <p className="text-sm text-pink-100 mt-1">{document.title}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-md transition-colors"
        >
          Close
        </button>
      </div>

      {/* File Upload - Only show if no document provided */}
      {!document && (
        <div className="p-4 border-b bg-gray-50">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"
          />
        </div>
      )}

      {/* Controls */}
      {file && (
        <div className="p-4 border-b bg-gray-50 flex flex-col gap-4">
          {/* Page Navigation */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={pageNumber <= 1}
                className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-700 font-medium whitespace-nowrap">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors"
              >
                Next
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Zoom Out
              </button>
              <span className="text-gray-700 font-medium">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Zoom In
              </button>
            </div>
          </div>
          {/* Page Slider */}
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-sm font-medium min-w-[2rem]">
                1
              </span>
              <input
                type="range"
                min="1"
                max={numPages}
                value={pageNumber}
                onChange={handleSliderChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${numPages > 1 ? ((pageNumber - 1) / (numPages - 1)) * 100 : 100}%, #e5e7eb ${numPages > 1 ? ((pageNumber - 1) / (numPages - 1)) * 100 : 100}%, #e5e7eb 100%)`,
                }}
              />
              <span className="text-gray-600 text-sm font-medium min-w-[2rem] text-right">
                {numPages}
              </span>
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
        {file ? (
          <div className="bg-white shadow-lg max-w-full">
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
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              className="w-24 h-24 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xl">Upload a PDF file to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

