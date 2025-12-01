/**
 * Polyfills for old Android WebView
 * This file must be loaded before any other JavaScript code
 * Supports Android 4.4+ (KitKat) and later versions
 */

// Core-js polyfills - comprehensive ES6+ support
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Fetch API polyfill for old Android
import 'whatwg-fetch';

// Additional polyfills for specific Android WebView issues

// Object.assign polyfill (for Android 4.4)
if (typeof Object.assign !== 'function') {
  Object.assign = function(target) {
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    var to = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];
      if (nextSource != null) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Array.from polyfill (for Android 4.4)
if (!Array.from) {
  Array.from = function(arrayLike, mapFn, thisArg) {
    var C = this;
    var items = Object(arrayLike);
    if (arrayLike == null) {
      throw new TypeError('Array.from requires an array-like object - not null or undefined');
    }
    var mapFunction = mapFn === undefined ? undefined : mapFn;
    var T;
    if (typeof mapFunction !== 'undefined') {
      if (typeof mapFunction !== 'function') {
        throw new TypeError('Array.from: when provided, the second argument must be a function');
      }
      if (arguments.length > 2) {
        T = thisArg;
      }
    }
    var len = parseInt(items.length) || 0;
    var A = typeof C === 'function' ? Object(new C(len)) : new Array(len);
    var k = 0;
    var kValue;
    while (k < len) {
      kValue = items[k];
      if (mapFunction) {
        A[k] = typeof T === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(T, kValue, k);
      } else {
        A[k] = kValue;
      }
      k += 1;
    }
    A.length = len;
    return A;
  };
}

// Array.includes polyfill (for Android 4.4)
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement, fromIndex) {
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }
    var o = Object(this);
    var len = parseInt(o.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(fromIndex) || 0;
    var k = n >= 0 ? n : Math.max(len + n, 0);
    function sameValueZero(x, y) {
      return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
    }
    for (; k < len; k++) {
      if (sameValueZero(o[k], searchElement)) {
        return true;
      }
    }
    return false;
  };
}

// String.includes polyfill (for Android 4.4)
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// String.startsWith polyfill (for Android 4.4)
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

// String.endsWith polyfill (for Android 4.4)
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, length) {
    if (length === undefined || length > this.length) {
      length = this.length;
    }
    return this.substring(length - searchString.length, length) === searchString;
  };
}

// Promise polyfill check (core-js should handle this, but double-check)
if (typeof Promise === 'undefined') {
  console.warn('Promise is not available. core-js should have polyfilled it.');
}

// URL polyfill for old Android
if (typeof URL === 'undefined' || typeof URLSearchParams === 'undefined') {
  // Basic URL polyfill - core-js should handle this, but ensure it's available
  console.warn('URL or URLSearchParams may not be fully supported');
}

// IntersectionObserver polyfill (optional, but useful for React)
if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  // Note: This is a large polyfill, only include if needed
  // You can install 'intersection-observer' package if needed
  console.warn('IntersectionObserver is not available. Consider installing intersection-observer polyfill if needed.');
}

// ResizeObserver polyfill (optional)
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  console.warn('ResizeObserver is not available. Consider installing resize-observer-polyfill if needed.');
}

// CustomEvent polyfill for Android 4.4
if (typeof window !== 'undefined' && typeof window.CustomEvent !== 'function') {
  (function() {
    function CustomEvent(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
  })();
}

// requestAnimationFrame polyfill for very old Android
if (typeof window !== 'undefined') {
  var lastTime = 0;
  var vendors = ['webkit', 'moz'];
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                                  window[vendors[x] + 'CancelRequestAnimationFrame'];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }

  // requestIdleCallback polyfill for old Android (used in Avatar component)
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = function(callback, options) {
      var timeout = options && options.timeout ? options.timeout : 0;
      var start = Date.now();
      return window.setTimeout(function() {
        callback({
          didTimeout: false,
          timeRemaining: function() {
            return Math.max(0, 50 - (Date.now() - start));
          }
        });
      }, 1);
    };
  }
  if (!window.cancelIdleCallback) {
    window.cancelIdleCallback = function(id) {
      window.clearTimeout(id);
    };
  }
}

// console methods polyfill (some old Android WebViews have incomplete console)
if (typeof console === 'undefined') {
  window.console = {};
}
var methods = ['log', 'warn', 'error', 'info', 'debug'];
for (var i = 0; i < methods.length; i++) {
  if (typeof console[methods[i]] !== 'function') {
    console[methods[i]] = function() {};
  }
}

console.log('Polyfills loaded for Android WebView compatibility');

