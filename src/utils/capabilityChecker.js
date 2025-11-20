/**
 * Checks browser and hardware capabilities for TV display
 * Returns an object with capability status and error messages
 */

export const checkCapabilities = () => {
  const errors = [];
  const warnings = [];
  
  // Check WebGL support (required for 3D Avatar)
  const webglSupported = checkWebGL();
  if (!webglSupported.supported) {
    errors.push({
      component: 'Avatar',
      title: '3D Avatar Not Supported',
      message: webglSupported.message,
      requirement: 'WebGL 2.0 or WebGL 1.0 support required for 3D avatar rendering'
    });
  }
  
  // Check PDF.js support
  const pdfSupported = checkPDFSupport();
  if (!pdfSupported.supported) {
    errors.push({
      component: 'PDF Reader',
      title: 'PDF Reader Not Supported',
      message: pdfSupported.message,
      requirement: 'PDF.js library and worker support required for PDF rendering'
    });
  }
  
  // Check Canvas support (required for both)
  const canvasSupported = checkCanvasSupport();
  if (!canvasSupported.supported) {
    errors.push({
      component: 'General',
      title: 'Canvas Not Supported',
      message: canvasSupported.message,
      requirement: 'HTML5 Canvas API required'
    });
  }
  
  // Check for required APIs
  const fetchSupported = typeof fetch !== 'undefined';
  if (!fetchSupported) {
    errors.push({
      component: 'General',
      title: 'Network API Not Supported',
      message: 'Fetch API is not available in this browser',
      requirement: 'Modern browser with Fetch API support required'
    });
  }
  
  // Check memory/performance (warnings, not errors)
  const memoryInfo = checkMemory();
  if (memoryInfo.lowMemory) {
    warnings.push({
      component: 'Performance',
      title: 'Low Memory Warning',
      message: memoryInfo.message,
      requirement: 'Device may experience performance issues'
    });
  }
  
  return {
    supported: errors.length === 0,
    errors,
    warnings,
    webglSupported: webglSupported.supported,
    pdfSupported: pdfSupported.supported,
    canvasSupported: canvasSupported.supported
  };
};

/**
 * Check WebGL support for 3D rendering
 */
const checkWebGL = () => {
  try {
    // Check for WebGL 2.0 first
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    
    if (gl2) {
      return {
        supported: true,
        version: 'WebGL 2.0',
        message: 'WebGL 2.0 is supported'
      };
    }
    
    // Fallback to WebGL 1.0
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl1) {
      const debugInfo = gl1.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl1.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
      
      return {
        supported: true,
        version: 'WebGL 1.0',
        message: `WebGL 1.0 is supported (Renderer: ${renderer})`
      };
    }
    
    return {
      supported: false,
      version: null,
      message: 'WebGL is not supported in this browser. The 3D avatar cannot be displayed.'
    };
  } catch (error) {
    return {
      supported: false,
      version: null,
      message: `WebGL check failed: ${error.message}`
    };
  }
};

/**
 * Check PDF.js support
 */
const checkPDFSupport = () => {
  try {
    // Check if PDF.js worker can be loaded
    if (typeof Worker === 'undefined') {
      return {
        supported: false,
        message: 'Web Workers are not supported. PDF rendering requires Web Worker support.'
      };
    }
    
    // Check if PDF.js is available (will be checked when component loads)
    // For now, just check basic requirements
    const hasBlobSupport = typeof Blob !== 'undefined';
    const hasURLSupport = typeof URL !== 'undefined' && URL.createObjectURL;
    const hasFileReader = typeof FileReader !== 'undefined';
    
    if (!hasBlobSupport || !hasURLSupport || !hasFileReader) {
      return {
        supported: false,
        message: 'Required APIs for PDF rendering are not available (Blob, URL, FileReader)'
      };
    }
    
    return {
      supported: true,
      message: 'PDF rendering should be supported'
    };
  } catch (error) {
    return {
      supported: false,
      message: `PDF support check failed: ${error.message}`
    };
  }
};

/**
 * Check Canvas support
 */
const checkCanvasSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext) {
      return {
        supported: false,
        message: 'HTML5 Canvas is not supported in this browser'
      };
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        supported: false,
        message: 'Canvas 2D context is not available'
      };
    }
    
    return {
      supported: true,
      message: 'Canvas is supported'
    };
  } catch (error) {
    return {
      supported: false,
      message: `Canvas check failed: ${error.message}`
    };
  }
};

/**
 * Check device memory (if available)
 */
const checkMemory = () => {
  try {
    // Check if deviceMemory API is available
    if (navigator.deviceMemory) {
      const memoryGB = navigator.deviceMemory;
      
      if (memoryGB < 2) {
        return {
          lowMemory: true,
          message: `Device has low memory (${memoryGB}GB). Performance may be limited.`
        };
      }
      
      return {
        lowMemory: false,
        message: `Device memory: ${memoryGB}GB`
      };
    }
    
    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 0;
    if (cores > 0 && cores < 2) {
      return {
        lowMemory: true,
        message: `Device has limited CPU cores (${cores}). Performance may be limited.`
      };
    }
    
    return {
      lowMemory: false,
      message: cores > 0 ? `CPU cores: ${cores}` : 'Memory information not available'
    };
  } catch (error) {
    return {
      lowMemory: false,
      message: 'Unable to check device memory'
    };
  }
};

/**
 * Get browser information for debugging
 */
export const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  
  return {
    userAgent: ua,
    platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
    deviceMemory: navigator.deviceMemory || 'Unknown'
  };
};

