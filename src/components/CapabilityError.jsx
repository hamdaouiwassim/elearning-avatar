import { useEffect, useState } from "react";
import { checkCapabilities, getBrowserInfo } from "../utils/capabilityChecker";

export const CapabilityError = ({ onRetry }) => {
  const [capabilities, setCapabilities] = useState(null);
  const [browserInfo, setBrowserInfo] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const caps = checkCapabilities();
    const info = getBrowserInfo();
    setCapabilities(caps);
    setBrowserInfo(info);
  }, []);

  if (!capabilities) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking system capabilities...</p>
        </div>
      </div>
    );
  }

  // If everything is supported, don't show error
  if (capabilities.supported) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4 overflow-auto">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            System Requirements Not Met
          </h1>
          <p className="text-gray-600 text-lg">
            Your TV browser or hardware doesn't meet the requirements to run this application.
          </p>
        </div>

        {/* Errors List */}
        <div className="space-y-4 mb-6">
          {capabilities.errors.map((error, index) => (
            <div
              key={index}
              className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-red-900">
                    {error.title}
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{error.message}</p>
                  <p className="mt-2 text-xs text-red-600 font-medium">
                    Requirement: {error.requirement}
                  </p>
                  {error.component && (
                    <span className="mt-2 inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded">
                      {error.component}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {capabilities.warnings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">
              Performance Warnings
            </h3>
            <div className="space-y-2">
              {capabilities.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg"
                >
                  <p className="text-sm text-yellow-800">{warning.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browser Info (Collapsible) */}
        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-left flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <span className="font-semibold text-gray-700">
              {showDetails ? "Hide" : "Show"} Browser Information
            </span>
            <svg
              className={`w-5 h-5 text-gray-600 transform transition-transform ${
                showDetails ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showDetails && browserInfo && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm">
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Platform:</span>{" "}
                  {browserInfo.platform}
                </div>
                <div>
                  <span className="font-semibold">Language:</span>{" "}
                  {browserInfo.language}
                </div>
                <div>
                  <span className="font-semibold">CPU Cores:</span>{" "}
                  {browserInfo.hardwareConcurrency}
                </div>
                <div>
                  <span className="font-semibold">Device Memory:</span>{" "}
                  {browserInfo.deviceMemory} GB
                </div>
                <div>
                  <span className="font-semibold">Online:</span>{" "}
                  {browserInfo.onLine ? "Yes" : "No"}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <span className="font-semibold">User Agent:</span>
                  <div className="mt-1 text-xs text-gray-600 break-all">
                    {browserInfo.userAgent}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Retry Check
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
          <p>
            Please ensure your TV browser supports WebGL and modern web standards.
            <br />
            Try updating your browser or using a different browser if available.
          </p>
        </div>
      </div>
    </div>
  );
};

