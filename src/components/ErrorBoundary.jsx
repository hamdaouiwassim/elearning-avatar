import React from "react";

// Helper function to decode React error messages
const decodeReactError = (error) => {
  if (!error || !error.message) return error?.toString() || "Unknown error";
  
  const message = error.message.toString();
  
  // Dynamic import errors
  if (message.includes("Failed to fetch dynamically imported module") || message.includes("dynamically imported module")) {
    const moduleMatch = message.match(/module:\s*(.+)/);
    const moduleUrl = moduleMatch ? moduleMatch[1] : "unknown module";
    return `Failed to load module: ${moduleUrl}. This might be due to:\n- Network connectivity issues\n- Missing build files (check that all assets are deployed)\n- CORS configuration problems\n- Incorrect base path configuration\n\nTry refreshing the page or checking the browser console for more details.`;
  }
  
  // React error #130: Objects are not valid as a React child
  if (message.includes("#130") || message.includes("Objects are not valid")) {
    return "Error: Objects are not valid as a React child. This usually means an object is being rendered directly in JSX instead of a property value. Check that you're rendering strings, numbers, or valid React elements, not objects.";
  }
  
  // React error #31: Objects are not valid as a React child (found object with keys {...})
  if (message.includes("#31")) {
    const keysMatch = message.match(/keys \{([^}]+)\}/);
    if (keysMatch) {
      return `Error: Objects are not valid as a React child. Found object with keys: ${keysMatch[1]}. Make sure you're rendering a property of the object (e.g., object.name) rather than the object itself.`;
    }
    return "Error: Objects are not valid as a React child. Check that you're rendering object properties, not the object itself.";
  }
  
  // Try to extract more information from the error
  if (message.includes("invariant=")) {
    const invariantMatch = message.match(/invariant=(\d+)/);
    if (invariantMatch) {
      const errorCode = invariantMatch[1];
      return `React Error #${errorCode}. Visit https://reactjs.org/docs/error-decoder.html?invariant=${errorCode} for more details.`;
    }
  }
  
  return message;
};

// Helper to safely stringify error info
const safeStringify = (obj, maxDepth = 3, currentDepth = 0) => {
  if (currentDepth >= maxDepth) return "[Max depth reached]";
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  
  try {
    if (typeof obj === "object") {
      if (obj instanceof Error) {
        return obj.toString();
      }
      const keys = Object.keys(obj).slice(0, 10); // Limit keys
      const preview = keys.map(key => {
        const value = obj[key];
        if (typeof value === "object" && value !== null) {
          return `${key}: [Object]`;
        }
        return `${key}: ${String(value).substring(0, 50)}`;
      }).join(", ");
      return `{${preview}${keys.length < Object.keys(obj).length ? "..." : ""}}`;
    }
    return String(obj);
  } catch (e) {
    return "[Unable to stringify]";
  }
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { componentName = "Component" } = this.props;
      const errorMessage = this.state.error ? decodeReactError(this.state.error) : "Unknown error";
      const errorStack = this.state.errorInfo?.componentStack 
        ? this.state.errorInfo.componentStack.split("\n").slice(0, 10).join("\n")
        : null;
      
      return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {componentName} Error
              </h1>
              <p className="text-gray-600">
                An error occurred while loading the {componentName.toLowerCase()}.
              </p>
            </div>

            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Error Message:
              </p>
              <p className="text-sm text-red-700 font-mono break-words whitespace-pre-wrap">
                {errorMessage}
              </p>
            </div>

            {errorStack && (
              <div className="mb-6 p-4 bg-gray-50 border-l-4 border-gray-400 rounded-r-lg">
                <p className="text-xs font-semibold text-gray-900 mb-2">
                  Component Stack:
                </p>
                <p className="text-xs text-gray-700 font-mono break-all whitespace-pre-wrap">
                  {errorStack}
                </p>
              </div>
            )}

            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <p className="text-xs text-blue-900">
                <strong>Tip:</strong> If you see "Objects are not valid as a React child", check that you're rendering object properties (e.g., {"{object.name}"}) instead of the object itself (e.g., {"{object}"}).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

