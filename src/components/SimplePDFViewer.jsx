import { useState, useEffect, useRef } from "react";
import { getDeviceType } from "../utils/deviceDetector";

/**
 * Simple PDF Viewer for Android Boxes/TV
 * Ultra-simple implementation using iframe - no complex features
 */
export const SimplePDFViewer = ({ 
  fileUrl, 
  pageNumber = 1 
}) => {
  const iframeRef = useRef(null);
  const [error, setError] = useState(false);

  // Normalize props to ensure they're primitives, never objects
  const normalizedFileUrl = typeof fileUrl === 'string' ? fileUrl : (fileUrl && typeof fileUrl === 'object' && fileUrl.url ? String(fileUrl.url) : null);
  const normalizedPageNumber = typeof pageNumber === 'number' && !isNaN(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  // Construct PDF URL with page anchor
  const getPdfUrl = () => {
    if (!normalizedFileUrl || typeof normalizedFileUrl !== 'string') return null;
    
    // Remove existing anchors and add page number
    const baseUrl = normalizedFileUrl.split('#')[0];
    const safePageNum = Number(normalizedPageNumber) || 1;
    return `${baseUrl}#page=${safePageNum}`;
  };

  useEffect(() => {
    if (iframeRef.current) {
      setError(false);
    }
  }, [normalizedFileUrl, normalizedPageNumber]);

  const handleError = () => {
    setError(true);
  };

  const pdfUrl = getPdfUrl();

  if (!pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">No PDF file available</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-8">
        <p className="text-red-600 mb-4 text-center">Unable to load PDF</p>
        <a 
          href={pdfUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Download PDF
        </a>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full bg-gray-100"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        zIndex: 1,
        overflow: 'hidden',
        // Ensure fullscreen on Android boxes
        minWidth: '100vw',
        minHeight: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh'
      }}
    >
      {/* Device Type Label */}
      <div 
        className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold shadow-lg"
        style={{ pointerEvents: 'none' }}
      >
        Device: {(() => {
          try {
            const deviceType = getDeviceType();
            return typeof deviceType === 'string' ? deviceType.toUpperCase() : 'UNKNOWN';
          } catch (error) {
            return 'UNKNOWN';
          }
        })()}
      </div>
      <iframe
        ref={iframeRef}
        src={pdfUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
        onError={handleError}
        allow="fullscreen"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0
        }}
      />
    </div>
  );
};

