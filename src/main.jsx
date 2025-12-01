// Import polyfills FIRST - must be before any other imports
import "./polyfills";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatProvider } from "./hooks/useChat";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

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
