import { lazy } from 'react';

/**
 * Creates a lazy-loaded component with retry logic for failed dynamic imports
 * This helps handle network issues or missing chunks in production builds
 * 
 * @param {Function} importFn - The dynamic import function
 * @param {Object} options - Options for retry behavior
 * @param {number} options.retries - Number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {React.LazyExoticComponent} - Lazy component with retry logic
 */
export function lazyWithRetry(importFn, options = {}) {
  const { retries = 3, retryDelay = 1000 } = options;

  return lazy(async () => {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await importFn();
        return module;
      } catch (error) {
        lastError = error;
        console.warn(`Failed to load module (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        // If this is the last attempt, throw the error
        if (attempt === retries) {
          // Enhance error message for better debugging
          const enhancedError = new Error(
            `Failed to load module after ${retries + 1} attempts. ` +
            `Original error: ${error.message || error}. ` +
            `This might be due to network issues, missing build files, or CORS problems. ` +
            `Please check that all assets are properly deployed and accessible.`
          );
          enhancedError.originalError = error;
          throw enhancedError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw lastError;
  });
}

