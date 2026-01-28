/**
 * Authentication utility functions
 */

const API_URL = import.meta.env.VITE_API_URL ;

/**
 * Check if user is authenticated
 */
export const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      return data.authenticated === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    
    // Clear local storage
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    
    return true;
  } catch (error) {
    console.error("Error logging out:", error);
    return false;
  }
};

/**
 * Get user email from localStorage
 */
export const getUserEmail = () => {
  return localStorage.getItem("userEmail") || null;
};

/**
 * Check if user is authenticated (from localStorage)
 */
export const isAuthenticated = () => {
  return localStorage.getItem("isAuthenticated") === "true";
};

