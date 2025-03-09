import React, { createContext, useState, useEffect, useContext } from "react";

// Create context
export const OpenCVContext = createContext();

// OpenCV Provider
export function OpenCVProvider({ children }) {
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Script is already loaded and OpenCV is available
    if (window.cv) {
      console.log("OpenCV is already loaded and available.");
      setIsOpenCVReady(true);
      setIsLoading(false);
      return;
    }

    // Script loaded but OpenCV not yet initialized
    const scriptTag = document.getElementById("opencv-script");
    if (scriptTag) {
      console.log(
        "OpenCV script is already loading, waiting for initialization..."
      );

      // If module already has a pending initialization function, don't overwrite it
      if (!window.Module || !window.Module.onRuntimeInitialized) {
        window.Module = window.Module || {};
        window.Module.onRuntimeInitialized = () => {
          console.log("OpenCV runtime initialized.");
          setIsOpenCVReady(true);
          setIsLoading(false);
        };
      }
      return;
    }

    console.log("Loading OpenCV.js...");
    setIsLoading(true);

    // Create OpenCV script
    const script = document.createElement("script");
    script.id = "opencv-script"; // Unique ID
    script.src = "https://docs.opencv.org/4.5.0/opencv.js";
    script.async = true;
    script.onload = () => {
      console.log("OpenCV script loaded.");

      if (window.cv) {
        console.log("OpenCV available immediately.");
        setIsOpenCVReady(true);
        setIsLoading(false);
      } else {
        console.log("Setting up OpenCV initialization...");
        window.Module = window.Module || {};
        window.Module.onRuntimeInitialized = () => {
          console.log("OpenCV runtime initialized.");
          setIsOpenCVReady(true);
          setIsLoading(false);
        };
      }
    };

    script.onerror = () => {
      console.error("Error loading OpenCV.js");
      setError("Failed to load OpenCV.js");
      setIsLoading(false);
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      // We don't remove the script to avoid multiple loads,
      // but we could clean it up if necessary
    };
  }, []);

  return (
    <OpenCVContext.Provider value={{ isOpenCVReady, isLoading, error }}>
      {children}
    </OpenCVContext.Provider>
  );
}

// Custom hook to use OpenCV
export function useOpenCV() {
  const context = useContext(OpenCVContext);
  if (context === undefined) {
    throw new Error("useOpenCV must be used within an OpenCVProvider");
  }
  return context;
}
