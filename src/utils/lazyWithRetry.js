import { lazy } from 'react';

/**
 * Check if device is Android (including Android TV/Box)
 */
const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android/i.test(ua);
};

/**
 * Normalize module path for Android devices
 * Converts absolute URLs to relative paths when possible
 */
const normalizeModulePath = (error) => {
  if (!error || !error.message) return null;
  
  const message = error.message.toString();
  // Try to extract the URL from error messages
  const urlMatch = message.match(/http[s]?:\/\/[^\s]+/);
  if (!urlMatch) return null;
  
  const absoluteUrl = urlMatch[0];
  try {
    const url = new URL(absoluteUrl);
    // Convert to relative path
    const relativePath = url.pathname + url.search + url.hash;
    return relativePath;
  } catch (e) {
    return null;
  }
};

/**
 * Creates a lazy-loaded component with retry logic for failed dynamic imports
 * This helps handle network issues or missing chunks in production builds
 * Enhanced for Android devices with more aggressive retry logic
 * 
 * @param {Function} importFn - The dynamic import function
 * @param {Object} options - Options for retry behavior
 * @param {number} options.retries - Number of retry attempts (default: 5 for Android, 3 for others)
 * @param {number} options.retryDelay - Base delay between retries in ms (default: 1500 for Android, 1000 for others)
 * @returns {React.LazyExoticComponent} - Lazy component with retry logic
 */
export function lazyWithRetry(importFn, options = {}) {
  const isAndroid = isAndroidDevice();
  const defaultRetries = isAndroid ? 5 : 3;
  const defaultRetryDelay = isAndroid ? 1500 : 1000;
  
  const { retries = defaultRetries, retryDelay = defaultRetryDelay } = options;

  return lazy(async () => {
    let lastError;
    let normalizedPath = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await importFn();
        return module;
      } catch (error) {
        lastError = error;
        
        // On first error, try to normalize the path for Android
        if (attempt === 0 && isAndroid) {
          normalizedPath = normalizeModulePath(error);
          if (normalizedPath) {
            console.warn(`Android: Detected absolute URL, attempting relative path: ${normalizedPath}`);
            try {
              // Try with relative path
              const relativeModule = await import(/* @vite-ignore */ normalizedPath);
              return relativeModule;
            } catch (relativeError) {
              console.warn(`Android: Relative path also failed:`, relativeError);
            }
          }
        }
        
        console.warn(`Failed to load module (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        // If this is the last attempt, throw the error
        if (attempt === retries) {
          // Enhance error message for better debugging
          let errorMessage = `Failed to load module after ${retries + 1} attempts. `;
          errorMessage += `Original error: ${error.message || error}. `;
          
          if (isAndroid) {
            errorMessage += `\n\nAndroid-specific issues:\n`;
            errorMessage += `- Network connectivity issues (check WiFi/network connection)\n`;
            errorMessage += `- CORS configuration problems (server may need to allow Android WebView)\n`;
            errorMessage += `- Missing build files (verify all assets are deployed)\n`;
            errorMessage += `- WebView cache issues (try clearing browser cache)\n`;
            errorMessage += `\nTry:\n`;
            errorMessage += `1. Refresh the page\n`;
            errorMessage += `2. Clear browser/WebView cache\n`;
            errorMessage += `3. Check network connection\n`;
            errorMessage += `4. Verify server CORS settings allow Android WebView`;
          } else {
            errorMessage += `This might be due to network issues, missing build files, or CORS problems. `;
            errorMessage += `Please check that all assets are properly deployed and accessible.`;
          }
          
          const enhancedError = new Error(errorMessage);
          enhancedError.originalError = error;
          throw enhancedError;
        }
        
        // Exponential backoff with jitter for Android devices
        const delay = isAndroid 
          ? retryDelay * Math.pow(1.5, attempt) + Math.random() * 500
          : retryDelay * (attempt + 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw lastError;
  });
}

