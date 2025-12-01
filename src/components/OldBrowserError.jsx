import React from "react";

/**
 * Error component for old/unsupported browsers
 * Shows when browser doesn't have required APIs
 */
export const OldBrowserError = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Browser Not Supported
          </h1>
          <p className="text-gray-600">
            Your device browser is too old. Please update WebView.
          </p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
          <p className="text-sm font-semibold text-yellow-900 mb-2">
            Required Features Missing:
          </p>
          <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
            {!window.Promise && <li>Promise API</li>}
            {!window.URL && <li>URL API</li>}
            {!window.TextEncoder && <li>TextEncoder API</li>}
            {!window.fetch && <li>Fetch API</li>}
          </ul>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
          <p className="text-xs text-blue-900">
            <strong>How to fix:</strong> Update your Android WebView or use a modern browser like Chrome.
            On Android devices, go to Google Play Store and update "Android System WebView".
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleReload}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

