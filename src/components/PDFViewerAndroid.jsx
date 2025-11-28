import { useState, useEffect, useRef } from "react";

/**
 * Android-compatible PDF Viewer Component
 * Uses iframe for native PDF viewing (works on Android browsers)
 * This approach is more reliable on Android boxes than react-pdf with Web Workers
 */
export const PDFViewerAndroid = ({ 
  file, 
  pageNumber, 
  scale, 
  onLoadSuccess,
  loading: LoadingComponent,
  error: ErrorComponent 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef(null);
  const objectRef = useRef(null);
  const [useObject, setUseObject] = useState(false);

  useEffect(() => {
    if (!file) return;
    
    setIsLoading(true);
    setHasError(false);
    
    // Try iframe first, fallback to object after timeout
    const timer = setTimeout(() => {
      if (isLoading) {
        // If still loading, try object tag as fallback
        setUseObject(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [file]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
    
    // Call onLoadSuccess if provided
    // Note: We can't reliably get page count from iframe, so we'll use a placeholder
    if (onLoadSuccess) {
      onLoadSuccess({ numPages: 100 }); // Use a high number to allow navigation
    }
  };

  // Handle iframe error - fallback to object
  const handleIframeError = () => {
    setUseObject(true);
    setIsLoading(false);
  };

  // Handle object load
  const handleObjectLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoadSuccess) {
      onLoadSuccess({ numPages: 100 });
    }
  };

  // Handle object error
  const handleObjectError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Construct PDF URL with page anchor
  const getPdfUrl = () => {
    if (!file) return null;
    
    if (typeof file === 'string') {
      // Use #page anchor for page navigation (supported by most PDF viewers)
      const baseUrl = file.split('#')[0]; // Remove existing anchors
      return `${baseUrl}#page=${pageNumber}`;
    }
    
    return file;
  };

  if (!file) {
    return null;
  }

  // Show error if both methods failed
  if (hasError && useObject) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {ErrorComponent ? (
          <ErrorComponent />
        ) : (
          <div className="p-8 text-center text-red-600">
            <p className="mb-4">Unable to load PDF. Your browser may not support PDF viewing.</p>
            <a 
              href={getPdfUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-700"
            >
              Click here to download the PDF
            </a>
          </div>
        )}
      </div>
    );
  }

  // Use object tag as fallback (better compatibility on older Android) - Landscape optimized
  if (useObject) {
    return (
      <div className="relative w-full h-full landscape-pdf-container">
        {isLoading && LoadingComponent && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <LoadingComponent />
          </div>
        )}
        <object
          ref={objectRef}
          data={getPdfUrl()}
          type="application/pdf"
          className="w-full h-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            maxWidth: '100vw',
            maxHeight: '100vh',
          }}
          onLoad={handleObjectLoad}
          onError={handleObjectError}
        >
          <div className="p-8 text-center text-gray-600">
            <p className="mb-4">PDF viewer not supported.</p>
            <a 
              href={getPdfUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-700"
            >
              Download PDF
            </a>
          </div>
        </object>
      </div>
    );
  }

  // Primary: Use iframe (works on most Android browsers) - Landscape optimized
  return (
    <div className="relative w-full h-full landscape-pdf-container">
      {isLoading && LoadingComponent && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <LoadingComponent />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={getPdfUrl()}
        className="w-full h-full border-0"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="PDF Viewer"
        allow="fullscreen"
      />
    </div>
  );
};

