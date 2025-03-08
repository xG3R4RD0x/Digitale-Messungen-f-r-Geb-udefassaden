import React, { createContext, useState, useEffect, useContext } from "react";

// Crear el contexto
export const OpenCVContext = createContext();

// Proveedor de OpenCV
export function OpenCVProvider({ children }) {
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Script ya está cargado y OpenCV está disponible
    if (window.cv) {
      console.log("OpenCV ya está cargado y disponible.");
      setIsOpenCVReady(true);
      setIsLoading(false);
      return;
    }

    // Script cargado pero OpenCV aún no está inicializado
    const scriptTag = document.getElementById("opencv-script");
    if (scriptTag) {
      console.log(
        "Script de OpenCV ya está cargando, esperando inicialización..."
      );

      // Si el módulo ya tiene una función de inicialización pendiente, no la sobreescribamos
      if (!window.Module || !window.Module.onRuntimeInitialized) {
        window.Module = window.Module || {};
        window.Module.onRuntimeInitialized = () => {
          console.log("OpenCV runtime inicializado.");
          setIsOpenCVReady(true);
          setIsLoading(false);
        };
      }
      return;
    }

    console.log("Cargando OpenCV.js...");
    setIsLoading(true);

    // Crear el script de OpenCV
    const script = document.createElement("script");
    script.id = "opencv-script"; // ID único
    script.src = "https://docs.opencv.org/4.5.0/opencv.js";
    script.async = true;
    script.onload = () => {
      console.log("Script de OpenCV cargado.");

      if (window.cv) {
        console.log("OpenCV disponible inmediatamente.");
        setIsOpenCVReady(true);
        setIsLoading(false);
      } else {
        console.log("Configurando inicialización de OpenCV...");
        window.Module = window.Module || {};
        window.Module.onRuntimeInitialized = () => {
          console.log("OpenCV runtime inicializado.");
          setIsOpenCVReady(true);
          setIsLoading(false);
        };
      }
    };

    script.onerror = () => {
      console.error("Error al cargar OpenCV.js");
      setError("No se pudo cargar OpenCV.js");
      setIsLoading(false);
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      // No eliminamos el script para evitar múltiples cargas,
      // pero podríamos limpiarlo si fuera necesario
    };
  }, []);

  return (
    <OpenCVContext.Provider value={{ isOpenCVReady, isLoading, error }}>
      {children}
    </OpenCVContext.Provider>
  );
}

// Hook personalizado para usar OpenCV
export function useOpenCV() {
  const context = useContext(OpenCVContext);
  if (context === undefined) {
    throw new Error("useOpenCV debe usarse dentro de un OpenCVProvider");
  }
  return context;
}
