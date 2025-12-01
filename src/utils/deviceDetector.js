/**
 * Device detection utilities
 * Detects Android boxes, TV, and other device types
 */

/**
 * Check if device is Android
 */
export const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

/**
 * Check if device is Android TV or Android Box
 * Android TV/Box typically have specific user agent strings
 */
export const isAndroidBox = () => {
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for Android TV/Box indicators
  const androidBoxIndicators = [
    'androidtv',           // Android TV
    'smart-tv',            // Smart TV
    'smarttv',             // Smart TV variant
    'tv',                  // TV in user agent
    'box',                 // Box in user agent
    'settop',              // Set-top box
    'stb',                 // Set-top box abbreviation
  ];
  
  // Check if any indicator is present
  const hasBoxIndicator = androidBoxIndicators.some(indicator => 
    ua.includes(indicator)
  );
  
  // Also check for Android without mobile indicators (likely a box/TV)
  const isAndroid = /android/i.test(ua);
  const hasMobileIndicator = /mobile|phone|tablet/i.test(ua);
  
  // If Android but no mobile indicators, likely a box/TV
  if (isAndroid && !hasMobileIndicator) {
    return true;
  }
  
  return hasBoxIndicator;
};

/**
 * Check if device is a TV (any type)
 */
export const isTV = () => {
  const ua = navigator.userAgent.toLowerCase();
  
  const tvIndicators = [
    'tv',
    'smart-tv',
    'smarttv',
    'androidtv',
    'roku',
    'appletv',
    'tizen',
    'webos',
    'lg tv',
    'samsung tv',
    'sony tv',
  ];
  
  return tvIndicators.some(indicator => ua.includes(indicator));
};

/**
 * Check if device is a mobile device
 */
export const isMobile = () => {
  const ua = navigator.userAgent.toLowerCase();
  return /mobile|phone|tablet/i.test(ua) && !isTV();
};

/**
 * Get device type
 */
export const getDeviceType = () => {
  if (isAndroidBox()) {
    return 'android-box';
  }
  if (isTV()) {
    return 'tv';
  }
  if (isMobile()) {
    return 'mobile';
  }
  if (isAndroid()) {
    return 'android';
  }
  return 'desktop';
};

