import { useState, useEffect } from "react";
import { SafeRender } from "../utils/safeComponent";

const API_URL = import.meta.env.VITE_API_URL || "http://102.211.209.131:3002";

export const ImageBackground = ({ document, pageNumber, setPageNumber, scale, setScale, numPages, setNumPages: setNumPagesProp }) => {
  const [webpImageUrls, setWebpImageUrls] = useState([]);

  // Validate and normalize props to prevent object rendering errors
  const normalizedPageNumber = typeof pageNumber === 'number' && !isNaN(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const normalizedScale = typeof scale === 'number' && !isNaN(scale) && scale > 0 ? scale : 1.0;

  useEffect(() => {
    try {
      if (document && typeof document === 'object' && !Array.isArray(document)) {
        // Check if this is a chapter with WebP images
        const hasWebpImages = document.webpImages && Array.isArray(document.webpImages) && document.webpImages.length > 0;
        const hasChapterId = document.id && (typeof document.id === 'string' || typeof document.id === 'number');
        const hasCourseId = document.courseId && typeof document.courseId === 'string';
        
        if (hasWebpImages && hasChapterId && hasCourseId) {
          // Get page count from webpImages or numPagesVisual
          const pageCount = document.webpImages.length || document.numPagesVisual || document.numPages;
          if (setNumPagesProp && typeof pageCount === 'number' && !isNaN(pageCount) && pageCount > 0) {
            setNumPagesProp(pageCount);
          }
          
          // Pre-generate WebP image URLs for all pages
          const urls = [];
          for (let i = 1; i <= pageCount; i++) {
            const imageUrl = `${API_URL}/api/courses/${document.courseId}/chapters/${document.id}/file?type=webp&page=${i}`;
            urls.push(imageUrl);
          }
          setWebpImageUrls(urls);
          
          if (setPageNumber) {
            setPageNumber(1);
          }
        } else {
          // No WebP images available
          console.warn('ImageBackground: Chapter does not have WebP images available');
          setWebpImageUrls([]);
        }
      } else if (document === null || document === undefined) {
        // Document is null/undefined, clear images
        setWebpImageUrls([]);
      } else {
        console.error('ImageBackground: Invalid document type', typeof document, document);
        setWebpImageUrls([]);
      }
    } catch (error) {
      console.error('ImageBackground: Error processing document', error);
      setWebpImageUrls([]);
    }
  }, [document, setPageNumber, setNumPagesProp]);

  // Keyboard navigation
  useEffect(() => {
    if (webpImageUrls.length === 0 || !numPages || !setPageNumber) return;

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
  }, [webpImageUrls, numPages, setPageNumber, normalizedPageNumber]);

  // Early return if no document or no images available
  if (!document || !webpImageUrls || webpImageUrls.length === 0) return null;

  const safePageNumber = Number(normalizedPageNumber) || 1;
  const safeScale = Number(normalizedScale) || 1.0;

  // Get current WebP image URL for the current page
  const getCurrentWebpImageUrl = () => {
    const pageIndex = safePageNumber - 1;
    if (pageIndex >= 0 && pageIndex < webpImageUrls.length) {
      return webpImageUrls[pageIndex];
    }
    return null;
  };

  return (
    <SafeRender>
      <div className="fixed inset-0 z-0 bg-gray-100 overflow-auto landscape-mode">
       
        
        {/* WebP Image Viewer */}
        <div className="h-screen w-full flex items-center justify-center overflow-auto">
          <div className="bg-white shadow-2xl w-full h-full flex items-center justify-center relative">
            <div className="relative w-full h-full flex items-center justify-center" style={{ overflow: 'auto' }}>
              <img
                src={getCurrentWebpImageUrl() || ''}
                alt={`Page ${safePageNumber}`}
                style={{
                  transform: `scale(${safeScale})`,
                  transition: 'transform 0.2s ease-in-out',
                  maxWidth: '100%',
                  height: '100vh',
                  width: 'auto',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  console.error('Failed to load WebP image:', getCurrentWebpImageUrl());
                  e.target.style.display = 'none';
                }}
                loading="lazy"
              />
              {!getCurrentWebpImageUrl() && (
                <div className="p-8 text-center text-gray-500">
                  Chargement de la page {safePageNumber}...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SafeRender>
  );
};

