// Import polyfills FIRST - must be before any other imports
import "./polyfills";

import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Polyfills for browser compatibility
import 'core-js/features/url';
import 'core-js/features/url-search-params';
import 'core-js/features/array/includes';
import 'core-js/features/array/from';
import 'core-js/features/object/assign';
import 'core-js/features/typed-array';
import 'core-js/features/promise';
import 'core-js/features/map';
import 'core-js/features/set';
import 'whatwg-fetch';


import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatProvider } from "./hooks/useChat";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OldBrowserError } from "./components/OldBrowserError";
import { isOldBrowser } from "./utils/capabilityChecker";
import "./index.css";

// Early check for old browser before React renders
const checkOldBrowser = () => {
  return (
    !window.Promise ||
    !window.URL ||
    !window.TextEncoder ||
    !window.fetch
  );
};

// If browser is too old, show error immediately
if (checkOldBrowser()) {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <OldBrowserError />
  );
} else {
  // Wrap entire app in ErrorBoundary to catch any unhandled errors
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary componentName="Application">
        <ChatProvider>
          <App />
        </ChatProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
