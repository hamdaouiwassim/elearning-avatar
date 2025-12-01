import { useState, useEffect, useRef } from "react";
import React from "react";

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

  // Validate and normalize props to prevent object rendering errors
  const normalizedPageNumber = typeof pageNumber === 'number' && !isNaN(pageNumber) ? pageNumber : (typeof pageNumber === 'string' ? parseInt(pageNumber, 10) || 1 : 1);
  const normalizedScale = typeof scale === 'number' && !isNaN(scale) && scale > 0 ? scale : (typeof scale === 'string' ? parseFloat(scale) || 1.0 : 1.0);
  
  // Ensure file is a string, not an object
  const normalizedFile = typeof file === 'string' ? file : (file && typeof file === 'object' && file.url ? String(file.url) : (file && typeof file === 'object' && file.src ? String(file.src) : null));
  
  // Validate LoadingComponent and ErrorComponent are valid React elements
  const isValidLoadingComponent = LoadingComponent && (React.isValidElement(LoadingComponent) || typeof LoadingComponent === 'function');
  const isValidErrorComponent = ErrorComponent && (React.isValidElement(ErrorComponent) || typeof ErrorComponent === 'function');

  useEffect(() => {
    if (!normalizedFile) return;
    
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
  }, [normalizedFile, isLoading]);

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
    if (!normalizedFile) return null;
    
    // Use #page anchor for page navigation (supported by most PDF viewers)
    const baseUrl = normalizedFile.split('#')[0]; // Remove existing anchors
    return `${baseUrl}#page=${normalizedPageNumber}`;
  };

  if (!normalizedFile) {
    return null;
  }

  // Show error if both methods failed
  if (hasError && useObject) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {isValidErrorComponent ? (
          React.isValidElement(ErrorComponent) ? ErrorComponent : <ErrorComponent />
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
        {isLoading && isValidLoadingComponent && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            {React.isValidElement(LoadingComponent) ? LoadingComponent : <LoadingComponent />}
          </div>
        )}
        <object
          ref={objectRef}
          data={getPdfUrl()}
          type="application/pdf"
          className="w-full h-full"
          style={{
            transform: `scale(${normalizedScale})`,
            transformOrigin: 'center center',
            width: `${100 / normalizedScale}%`,
            height: `${100 / normalizedScale}%`,
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

