/**
 * Utility functions to safely render values in React
 * Prevents React error #130 (Objects are not valid as a React child)
 */
import React from "react";

/**
 * Safely converts a value to a string for rendering
 * @param {any} value - The value to convert
 * @returns {string} - Safe string representation
 */
export const safeString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    // Don't render objects directly - return a safe message
    if (Array.isArray(value)) {
      return `[Array with ${value.length} items]`;
    }
    // Try to find a common property that might be useful
    if (value.title) return String(value.title);
    if (value.name) return String(value.name);
    if (value.id) return String(value.id);
    if (value.courseName) return String(value.courseName);
    return "[Object]";
  }
  return String(value);
};

/**
 * Safely renders a value, returning a React element if it's an object
 * @param {any} value - The value to render
 * @param {string} fallback - Fallback text if value is invalid
 * @returns {React.ReactNode} - Safe React node
 */
export const safeRender = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (React.isValidElement(value)) {
    return value;
  }
  if (typeof value === "object") {
    // Return a safe string representation instead of the object
    return safeString(value);
  }
  return String(value);
};

/**
 * Validates that a value can be safely rendered
 * @param {any} value - The value to validate
 * @returns {boolean} - True if value can be safely rendered
 */
export const canRender = (value) => {
  if (value === null || value === undefined) {
    return true; // null/undefined are valid
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (React.isValidElement(value)) {
    return true;
  }
  // Objects and arrays cannot be rendered directly
  return false;
};

