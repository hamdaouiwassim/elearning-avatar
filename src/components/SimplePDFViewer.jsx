import { useState, useEffect, useRef } from "react";

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
    <div className="w-full h-full bg-gray-100">
      <iframe
        ref={iframeRef}
        src={pdfUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
        onError={handleError}
        allow="fullscreen"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '100vh'
        }}
      />
    </div>
  );
};

