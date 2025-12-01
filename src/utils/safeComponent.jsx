import React from "react";

/**
 * Safe wrapper component that ensures children are never objects
 * Prevents React error #130: Objects are not valid as a React child
 */
export const SafeRender = ({ children, fallback = null }) => {
  // Recursively check if a value can be safely rendered
  const canRender = (value) => {
    if (value === null || value === undefined) {
      return true; // null/undefined are valid
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return true;
    }
    if (React.isValidElement(value)) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.every(item => canRender(item));
    }
    // Objects cannot be rendered directly
    return false;
  };

  // Safely convert a value to a renderable format
  const safeConvert = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (React.isValidElement(value)) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item, index) => (
        <React.Fragment key={index}>
          {safeConvert(item)}
        </React.Fragment>
      ));
    }
    if (typeof value === "object") {
      // Try to find a useful property
      if (value.toString && typeof value.toString === 'function') {
        try {
          const str = value.toString();
          if (str !== '[object Object]') {
            return str;
          }
        } catch (e) {
          // Ignore
        }
      }
      // Return fallback for objects
      return fallback;
    }
    return String(value);
  };

  // Check if children can be rendered
  if (!canRender(children)) {
    console.warn('SafeRender: Attempted to render an object, converting to safe format', children);
    return <>{safeConvert(children)}</>;
  }

  return <>{children}</>;
};

/**
 * Higher-order component that wraps a component with safe rendering
 */
export const withSafeRender = (Component) => {
  return React.forwardRef((props, ref) => {
    // Validate all props that might be rendered
    const safeProps = { ...props };
    
    // Convert any object props to safe values
    Object.keys(safeProps).forEach(key => {
      const value = safeProps[key];
      if (value && typeof value === 'object' && !React.isValidElement(value) && !Array.isArray(value)) {
        // Don't modify function props or refs
        if (typeof value !== 'function' && key !== 'ref' && key !== 'key') {
          // Keep the object for props, but log a warning
          console.warn(`withSafeRender: Prop ${key} is an object, ensure it's not rendered directly`);
        }
      }
    });

    return (
      <SafeRender>
        <Component {...safeProps} ref={ref} />
      </SafeRender>
    );
  });
};

