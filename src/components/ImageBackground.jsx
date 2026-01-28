import { useState, useEffect } from "react";
import { SafeRender } from "../utils/safeComponent";

const API_URL = import.meta.env.VITE_API_URL ;

export const ImageBackground = ({ document, pageNumber, setPageNumber, scale, setScale, numPages, setNumPages: setNumPagesProp }) => {
  const [webpImageUrls, setWebpImageUrls] = useState([]);
  const [hasVideo, setHasVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoElement, setVideoElement] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showVideoControls, setShowVideoControls] = useState(true);

  // Validate and normalize props to prevent object rendering errors
  const normalizedPageNumber = typeof pageNumber === 'number' && !isNaN(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const normalizedScale = typeof scale === 'number' && !isNaN(scale) && scale > 0 ? scale : 1.0;

  useEffect(() => {
    try {
      if (document && typeof document === 'object' && !Array.isArray(document)) {
        const video = document.videoLink || document.video_link;
        const hasVideoLink = typeof video === 'string' && video.length > 0;
        setHasVideo(hasVideoLink);
        setVideoUrl(hasVideoLink ? video : null);

        if (hasVideoLink) {
          // When video is provided, we don't load WebP pages
          setWebpImageUrls([]);
          if (setNumPagesProp) setNumPagesProp(null);
          if (setPageNumber) setPageNumber(1);
          return;
        }

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
        setHasVideo(false);
        setVideoUrl(null);
      } else {
        console.error('ImageBackground: Invalid document type', typeof document, document);
        setWebpImageUrls([]);
        setHasVideo(false);
        setVideoUrl(null);
      }
    } catch (error) {
      console.error('ImageBackground: Error processing document', error);
      setWebpImageUrls([]);
      setHasVideo(false);
      setVideoUrl(null);
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

  // Early return if no document and no video
  if (!document || (!hasVideo && (!webpImageUrls || webpImageUrls.length === 0))) return null;

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
        {/* Video background if provided */}
        {hasVideo && videoUrl ? (
          <div className="h-screen w-full flex items-center justify-center overflow-hidden bg-black relative">
            <video
              ref={setVideoElement}
              src={videoUrl}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onTimeUpdate={(e) => setVideoCurrentTime(e.target.currentTime)}
              onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
            />
            {/* Custom Video Controls - Positioned above avatar (z-20) */}
            <div 
              className="fixed bottom-0 left-0 right-0 z-20 bg-black bg-opacity-70 backdrop-blur-sm p-4"
              onMouseEnter={() => setShowVideoControls(true)}
              onMouseLeave={() => setShowVideoControls(true)}
            >
              <div className="max-w-4xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-2">
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 0}
                    value={videoCurrentTime}
                    onChange={(e) => {
                      if (videoElement) {
                        videoElement.currentTime = parseFloat(e.target.value);
                        setVideoCurrentTime(parseFloat(e.target.value));
                      }
                    }}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(videoCurrentTime / videoDuration) * 100}%, #4b5563 ${(videoCurrentTime / videoDuration) * 100}%, #4b5563 100%)`
                    }}
                  />
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Play/Pause Button */}
                    <button
                      onClick={() => {
                        if (videoElement) {
                          if (isVideoPlaying) {
                            videoElement.pause();
                          } else {
                            videoElement.play();
                          }
                        }
                      }}
                      className="text-white hover:text-blue-400 transition-colors"
                      aria-label={isVideoPlaying ? "Pause" : "Play"}
                    >
                      {isVideoPlaying ? (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                    
                    {/* Time Display */}
                    <span className="text-white text-sm font-mono">
                      {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                      </svg>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        defaultValue="1"
                        onChange={(e) => {
                          if (videoElement) {
                            videoElement.volume = parseFloat(e.target.value);
                          }
                        }}
                        className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    {/* Fullscreen Button */}
                    <button
                      onClick={() => {
                        if (videoElement) {
                          if (videoElement.requestFullscreen) {
                            videoElement.requestFullscreen();
                          } else if (videoElement.webkitRequestFullscreen) {
                            videoElement.webkitRequestFullscreen();
                          } else if (videoElement.mozRequestFullScreen) {
                            videoElement.mozRequestFullScreen();
                          }
                        }
                      }}
                      className="text-white hover:text-blue-400 transition-colors"
                      aria-label="Fullscreen"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* WebP Image Viewer */
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
        )}
      </div>
    </SafeRender>
  );
};

// Helper function to format time
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

