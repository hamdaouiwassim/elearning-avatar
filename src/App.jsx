import { useState, useEffect } from "react";
import { checkCapabilities } from "./utils/capabilityChecker";
import { isAndroid } from "./utils/deviceDetector";
import { checkAuthStatus, isAuthenticated } from "./utils/auth";
import { AppRouter } from "./AppRouter";

function App() {
  const [capabilities, setCapabilities] = useState(null);
  const [capabilityCheckDone, setCapabilityCheckDone] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const verifyAuth = async () => {
      // First check localStorage for quick check
      if (isAuthenticated()) {
        // Then verify with server
        const isAuth = await checkAuthStatus();
        setAuthenticated(isAuth);
        if (!isAuth) {
          // Clear invalid auth state
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("userEmail");
        }
      }
      setAuthChecking(false);
    };

    verifyAuth();
  }, []);

  // Check browser/hardware capabilities on mount
  useEffect(() => {
    const caps = checkCapabilities();
    setCapabilities(caps);
    setCapabilityCheckDone(true);
  }, []);

  // Preload critical modules on Android devices to prevent loading failures
  useEffect(() => {
    if (isAndroid()) {
      // Preload UI component as it's critical and often fails on Android
      const preloadModules = async () => {
        try {
          // Preload UI component
          await import("./components/UI");
          console.log("Android: Preloaded UI module successfully");
        } catch (error) {
          console.warn("Android: Failed to preload UI module:", error);
        }
      };

      // Delay preloading slightly to not interfere with initial render
      const timer = setTimeout(preloadModules, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Retry capability check
  const handleRetryCapabilityCheck = () => {
    setCapabilityCheckDone(false);
    setTimeout(() => {
      const caps = checkCapabilities();
      setCapabilities(caps);
      setCapabilityCheckDone(true);
    }, 100);
  };

  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  return (
    <AppRouter
      authenticated={authenticated}
      authChecking={authChecking}
      capabilityCheckDone={capabilityCheckDone}
      capabilities={capabilities}
      onRetryCapabilityCheck={handleRetryCapabilityCheck}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}

export default App;
