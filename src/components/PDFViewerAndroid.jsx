import { useState, useEffect, useRef } from "react";
import React from "react";
import { getDeviceType } from "../utils/deviceDetector";

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
    try {
      if (!normalizedFile) return;
      
      setIsLoading(true);
      setHasError(false);
      
      // Try iframe first, fallback to object after timeout
      const timer = setTimeout(() => {
        try {
          if (isLoading) {
            // If still loading, try object tag as fallback
            console.warn('PDFViewerAndroid: Iframe taking too long, trying object tag fallback');
            setUseObject(true);
          }
        } catch (error) {
          console.error('PDFViewerAndroid: Error in timeout callback', error);
        }
      }, 3000);

      return () => {
        try {
          clearTimeout(timer);
        } catch (error) {
          console.error('PDFViewerAndroid: Error clearing timeout', error);
        }
      };
    } catch (error) {
      console.error('PDFViewerAndroid: Error in useEffect', error);
      setIsLoading(false);
      setHasError(true);
    }
  }, [normalizedFile, isLoading]);

  // Handle iframe load
  const handleIframeLoad = () => {
    try {
      setIsLoading(false);
      setHasError(false);
      
      // Call onLoadSuccess if provided
      // Note: We can't reliably get page count from iframe, so we'll use a placeholder
      if (onLoadSuccess) {
        try {
          onLoadSuccess({ numPages: 100 }); // Use a high number to allow navigation
        } catch (error) {
          console.error('PDFViewerAndroid: Error in onLoadSuccess callback', error);
        }
      }
    } catch (error) {
      console.error('PDFViewerAndroid: Error in handleIframeLoad', error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  // Handle iframe error - fallback to object
  const handleIframeError = () => {
    try {
      console.error('PDFViewerAndroid: Iframe failed to load, falling back to object tag');
      setUseObject(true);
      setIsLoading(false);
    } catch (error) {
      console.error('PDFViewerAndroid: Error in handleIframeError', error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  // Handle object load
  const handleObjectLoad = () => {
    try {
      setIsLoading(false);
      setHasError(false);
      if (onLoadSuccess) {
        try {
          onLoadSuccess({ numPages: 100 });
        } catch (error) {
          console.error('PDFViewerAndroid: Error in onLoadSuccess callback (object)', error);
        }
      }
    } catch (error) {
      console.error('PDFViewerAndroid: Error in handleObjectLoad', error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  // Handle object error
  const handleObjectError = () => {
    try {
      console.error('PDFViewerAndroid: Object tag failed to load PDF');
      setIsLoading(false);
      setHasError(true);
    } catch (error) {
      console.error('PDFViewerAndroid: Error in handleObjectError', error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  // Construct PDF URL with page anchor and inline viewing parameters
  const getPdfUrl = () => {
    try {
      if (!normalizedFile) return null;
      
      // Ensure normalizedFile is a string
      const fileString = String(normalizedFile);
      if (!fileString || fileString.length === 0) {
        console.error('PDFViewerAndroid: Invalid file string in getPdfUrl');
        return null;
      }
      
      // Remove existing anchors and query params
      const urlParts = fileString.split('#');
      const baseUrl = urlParts[0].split('?')[0];
      const pageNum = typeof normalizedPageNumber === 'number' && !isNaN(normalizedPageNumber) && normalizedPageNumber > 0 
        ? normalizedPageNumber 
        : 1;
      
      // Add parameters to force inline viewing (prevent download prompt on Android)
      // #toolbar=0 hides toolbar, #view=FitH fits horizontally, #zoom=page fits page
      // These parameters tell the browser to display inline, not download
      return `${baseUrl}#page=${pageNum}&toolbar=0&view=FitH&zoom=page`;
    } catch (error) {
      console.error('PDFViewerAndroid: Error constructing PDF URL', error);
      return normalizedFile ? String(normalizedFile) : null;
    }
  };

  if (!normalizedFile) {
    return null;
  }

  // Show error if both methods failed
  if (hasError && useObject) {
    try {
      const pdfUrl = getPdfUrl();
      return (
        <div className="w-full h-full flex items-center justify-center">
          {isValidErrorComponent ? (
            React.isValidElement(ErrorComponent) ? ErrorComponent : <ErrorComponent />
          ) : (
            <div className="p-8 text-center text-red-600">
              <p className="mb-4">Unable to load PDF. Your browser may not support PDF viewing.</p>
              {pdfUrl && (
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 underline hover:text-blue-700"
                >
                  Click here to download the PDF
                </a>
              )}
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('PDFViewerAndroid: Error rendering error component', error);
      return (
        <div className="w-full h-full flex items-center justify-center p-8 text-center text-red-600">
          <div>
            <p className="mb-4">Error loading PDF viewer.</p>
            <p className="text-sm text-gray-500">Error: {error?.message || 'Unknown error'}</p>
          </div>
        </div>
      );
    }
  }

  // Use object tag as fallback (better compatibility on older Android) - Landscape optimized
  if (useObject) {
    try {
      const pdfUrl = getPdfUrl();
      const safeScale = typeof normalizedScale === 'number' && !isNaN(normalizedScale) && normalizedScale > 0 
        ? normalizedScale 
        : 1.0;
      
      return (
        <div className="relative w-full h-full landscape-pdf-container">
          {/* Device Type Label */}
          <div 
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-600 text-white px-3 py-1 rounded-md text-sm font-semibold shadow-lg"
            style={{ pointerEvents: 'none' }}
          >
            Device: {(() => {
              try {
                const deviceType = getDeviceType();
                return typeof deviceType === 'string' ? deviceType.toUpperCase() : 'UNKNOWN';
              } catch (error) {
                console.error('PDFViewerAndroid: Error getting device type', error);
                return 'UNKNOWN';
              }
            })()}
          </div>
          {isLoading && isValidLoadingComponent && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              {(() => {
                try {
                  return React.isValidElement(LoadingComponent) ? LoadingComponent : <LoadingComponent />;
                } catch (error) {
                  console.error('PDFViewerAndroid: Error rendering loading component', error);
                  return <div className="p-8 text-center text-gray-600">Loading PDF...</div>;
                }
              })()}
            </div>
          )}
          <iframe
            ref={objectRef}
            src={pdfUrl || undefined}
            className="w-full h-full border-0"
            style={{
              transform: `scale(${safeScale})`,
              transformOrigin: 'center center',
              width: `${100 / safeScale}%`,
              height: `${100 / safeScale}%`,
              maxWidth: '100vw',
              maxHeight: '100vh',
            }}
            onLoad={handleObjectLoad}
            onError={handleObjectError}
            title="PDF Viewer"
            allow="fullscreen"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      );
    } catch (error) {
      console.error('PDFViewerAndroid: Error rendering object tag viewer', error);
      return (
        <div className="w-full h-full flex items-center justify-center p-8 text-center text-red-600">
          <div>
            <p className="mb-4">Error rendering PDF viewer (object tag).</p>
            <p className="text-sm text-gray-500">Error: {error?.message || 'Unknown error'}</p>
          </div>
        </div>
      );
    }
  }

  // Primary: Use iframe (works on most Android browsers) - Landscape optimized
  try {
    const pdfUrl = getPdfUrl();
    const safeScale = typeof normalizedScale === 'number' && !isNaN(normalizedScale) && normalizedScale > 0 
      ? normalizedScale 
      : 1.0;
    
    return (
      <div className="relative w-full h-full landscape-pdf-container">
        {/* Device Type Label */}
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-purple-600 text-white px-3 py-1 rounded-md text-sm font-semibold shadow-lg"
          style={{ pointerEvents: 'none' }}
        >
          Device: {(() => {
            try {
              const deviceType = getDeviceType();
              return typeof deviceType === 'string' ? deviceType.toUpperCase() : 'UNKNOWN';
            } catch (error) {
              console.error('PDFViewerAndroid: Error getting device type', error);
              return 'UNKNOWN';
            }
          })()}
        </div>
        {isLoading && isValidLoadingComponent && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            {(() => {
              try {
                if (React.isValidElement(LoadingComponent)) {
                  return LoadingComponent;
                } else if (typeof LoadingComponent === 'function') {
                  return <LoadingComponent />;
                }
                return null;
              } catch (error) {
                console.error('PDFViewerAndroid: Error rendering loading component', error);
                return <div className="p-8 text-center text-gray-600">Loading PDF...</div>;
              }
            })()}
          </div>
        )}
        {/* Use iframe with inline viewing parameters to prevent download prompt */}
        <iframe
          ref={iframeRef}
          src={pdfUrl || undefined}
          className="w-full h-full border-0"
          style={{
            transform: `scale(${safeScale})`,
            transformOrigin: 'center center',
            width: `${100 / safeScale}%`,
            height: `${100 / safeScale}%`,
            maxWidth: '100vw',
            maxHeight: '100vh',
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="PDF Viewer"
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    );
  } catch (error) {
    console.error('PDFViewerAndroid: Error rendering iframe viewer', error);
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-center text-red-600">
        <div>
          <p className="mb-4">Error rendering PDF viewer (iframe).</p>
          <p className="text-sm text-gray-500">Error: {error?.message || 'Unknown error'}</p>
          {normalizedFile && (
            <a 
              href={String(normalizedFile)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-700 mt-4 inline-block"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
    );
  }
};

