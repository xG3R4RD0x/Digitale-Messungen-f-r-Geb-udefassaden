import { useEffect, useRef, useState } from "react";
import { useOpenCV } from "../contexts/OpenCVContext";

const TOOLS = {
  GRABCUT: "grabcut",
  MAGIC_WAND: "magic_wand",
};

const MODES = {
  ADD: "add",
  SUBTRACT: "subtract",
};

export default function ImageMask({ imageUrl, instanceId }) {
  // Referencias a canvas
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const selectionRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Estados
  const [selectedTool, setSelectedTool] = useState(TOOLS.GRABCUT);
  const [mode, setMode] = useState(MODES.ADD);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const { isOpenCVReady } = useOpenCV();
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [hasSelection, setHasSelection] = useState(false);
  const [isMaskApplied, setIsMaskApplied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toolMessage, setToolMessage] = useState("");

  // Nuevo estado para botones contextuales
  const [contextualButtons, setContextualButtons] = useState([]);

  // Cargar y mostrar la imagen
  useEffect(() => {
    if (!imageUrl) return;

    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Calcular dimensiones manteniendo el ratio de aspecto original
      const maxWidth = window.innerWidth * 0.35;
      const maxHeight = window.innerHeight * 0.7;

      let width = image.width;
      let height = image.height;

      // Escalar si la imagen es demasiado grande
      if (width > maxWidth || height > maxHeight) {
        const scaleW = maxWidth / width;
        const scaleH = maxHeight / height;
        const scale = Math.min(scaleW, scaleH);

        width *= scale;
        height *= scale;
      }

      setImageDimensions({ width, height });

      // Configurar todos los canvases con exactamente las mismas dimensiones
      [canvasRef, maskCanvasRef, selectionRef, previewCanvasRef].forEach(
        (ref) => {
          if (ref.current) {
            ref.current.width = width;
            ref.current.height = height;
            if (ref === canvasRef || ref === previewCanvasRef) {
              const ctx = ref.current.getContext("2d");
              ctx.drawImage(image, 0, 0, width, height);
            }
          }
        }
      );

      // Resetear estados para la nueva imagen
      setHasSelection(false);
      setIsMaskApplied(false);
      setErrorMessage("");

      // Establecer mensaje inicial de ayuda
      setToolMessage(
        selectedTool === TOOLS.GRABCUT
          ? "Dibuje un rectángulo alrededor del objeto que desea extraer"
          : "Haga clic en un área para seleccionar regiones de color similar"
      );
    };
  }, [imageUrl, selectedTool]);

  // Actualizar mensaje de ayuda cuando cambia la herramienta
  useEffect(() => {
    if (!isMaskApplied) {
      setToolMessage(
        selectedTool === TOOLS.GRABCUT
          ? "Dibuje un rectángulo alrededor del objeto que desea extraer"
          : "Haga clic en un área para seleccionar regiones de color similar"
      );
    }
  }, [selectedTool, isMaskApplied]);

  // Función para actualizar la vista previa con la máscara aplicada
  const updatePreview = () => {
    if (!previewCanvasRef.current) return;

    const previewCtx = previewCanvasRef.current.getContext("2d");
    const width = previewCanvasRef.current.width;
    const height = previewCanvasRef.current.height;

    // Volver a dibujar la imagen original
    if (canvasRef.current) {
      const originalCtx = canvasRef.current.getContext("2d");
      const originalImage = originalCtx.getImageData(0, 0, width, height);
      previewCtx.putImageData(originalImage, 0, 0);
    }

    if (isMaskApplied && maskCanvasRef.current) {
      // Obtener la máscara
      const maskCtx = maskCanvasRef.current.getContext("2d");
      const maskImage = maskCtx.getImageData(0, 0, width, height);

      // Aplicar la máscara a la vista previa
      const previewImage = previewCtx.getImageData(0, 0, width, height);

      for (let i = 0; i < previewImage.data.length; i += 4) {
        // Si el alfa es mayor a 0, este píxel es parte de la máscara
        if (maskImage.data[i + 3] > 0) {
          // Resaltar el objeto en la vista previa (tono azulado)
          previewImage.data[i] *= 0.8; // R - reducir componente rojo
          previewImage.data[i + 1] *= 0.8; // G - reducir componente verde
          previewImage.data[i + 2] = Math.min(
            255,
            previewImage.data[i + 2] * 1.2
          ); // B - aumentar componente azul
        } else {
          // Reducir la opacidad del fondo
          previewImage.data[i + 3] = 100; // Alpha - semi transparente
        }
      }

      previewCtx.putImageData(previewImage, 0, 0);
    }
  };

  // Nueva función para actualizar la vista previa directamente sin depender del estado
  const updatePreviewDirectly = (maskData) => {
    if (
      !previewCanvasRef.current ||
      !canvasRef.current ||
      !maskCanvasRef.current
    )
      return;

    const previewCtx = previewCanvasRef.current.getContext("2d");
    const width = previewCanvasRef.current.width;
    const height = previewCanvasRef.current.height;

    // Volver a dibujar la imagen original en la vista previa
    const originalCtx = canvasRef.current.getContext("2d");
    const originalImage = originalCtx.getImageData(0, 0, width, height);
    previewCtx.putImageData(originalImage, 0, 0);

    // Obtener la máscara completa acumulada del canvas de máscara
    const maskCtx = maskCanvasRef.current.getContext("2d");
    const fullMaskImage = maskCtx.getImageData(0, 0, width, height);

    // Obtener la vista previa para modificarla
    const previewImage = previewCtx.getImageData(0, 0, width, height);

    // Aplicar efectos visuales basados en la máscara completa
    for (let i = 0; i < previewImage.data.length; i += 4) {
      // Si el canal alfa de la máscara es mayor a 0, este píxel es parte de la máscara
      if (fullMaskImage.data[i + 3] > 0) {
        // Resaltar el objeto en la vista previa (tono azulado)
        previewImage.data[i] *= 0.8; // R - reducir componente rojo
        previewImage.data[i + 1] *= 0.8; // G - reducir componente verde
        previewImage.data[i + 2] = Math.min(
          255,
          previewImage.data[i + 2] * 1.2
        ); // B - aumentar componente azul
      } else {
        // Reducir la opacidad del fondo
        previewImage.data[i + 3] = 100; // Alpha - semi transparente
      }
    }

    // Actualizar la vista previa
    previewCtx.putImageData(previewImage, 0, 0);
  };

  // Resetear solo la selección, no la máscara
  const resetSelectionOnly = () => {
    const selectionCtx = selectionRef.current.getContext("2d");
    selectionCtx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );
    setHasSelection(false);
  };

  // Resetear todo: selección y máscara
  const resetAll = () => {
    // Limpiar la selección
    const selectionCtx = selectionRef.current.getContext("2d");
    selectionCtx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );

    // Limpiar la máscara
    const maskCtx = maskCanvasRef.current.getContext("2d");
    maskCtx.clearRect(
      0,
      0,
      maskCanvasRef.current.width,
      maskCanvasRef.current.height
    );

    // Restaurar la vista previa original
    if (previewCanvasRef.current && canvasRef.current) {
      const origCtx = canvasRef.current.getContext("2d");
      const previewCtx = previewCanvasRef.current.getContext("2d");
      const origImage = origCtx.getImageData(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      previewCtx.putImageData(origImage, 0, 0);
    }

    // Resetear estados
    setHasSelection(false);
    setIsMaskApplied(false);
    setErrorMessage("");

    // Actualizar mensaje
    setToolMessage(
      selectedTool === TOOLS.GRABCUT
        ? "Dibuje un rectángulo alrededor del objeto que desea extraer"
        : "Haga clic en un área para seleccionar regiones de color similar"
    );
  };

  // Manejar cambio de herramienta
  const handleToolChange = (tool) => {
    setSelectedTool(tool);
    // Actualizar mensaje de ayuda
    setToolMessage(
      tool === TOOLS.GRABCUT
        ? "Dibuje un rectángulo alrededor del objeto que desea extraer"
        : "Haga clic en un área para seleccionar regiones de color similar"
    );
  };

  // Manejar cambio de modo
  const handleModeChange = () => {
    const newMode = mode === MODES.ADD ? MODES.SUBTRACT : MODES.ADD;
    setMode(newMode);
    setToolMessage(
      `Modo cambiado a: ${newMode === MODES.ADD ? "Agregar" : "Quitar"} áreas`
    );
  };

  // Stub versions of mouse handlers
  const handleMouseDown = (e) => {
    // Removed implementation
    setErrorMessage("");
  };

  const handleMouseMove = (e) => {
    // Removed implementation
  };

  const handleMouseUp = () => {
    // Removed implementation
  };

  // Función para registrar botones contextuales desde herramientas
  const registerToolButtons = (buttons) => {
    setContextualButtons(buttons);
  };

  return (
    <div className="w-full flex flex-col items-center p-4">
      {errorMessage && (
        <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}

      {/* Mensajes de ayuda */}
      <div className="w-full max-w-6xl mb-4">
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-2">
          {toolMessage}
        </p>
        {!isOpenCVReady && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
            Cargando OpenCV.js... Por favor, espere.
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl flex flex-wrap justify-center lg:justify-between gap-6">
        {/* Editor con barra de herramientas vertical */}
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden flex">
          {/* Barra de herramientas vertical */}
          <div className="bg-gray-100 p-2 flex flex-col gap-2 justify-start rounded-l-lg">
            <button
              className={`w-full p-2 rounded ${
                selectedTool === TOOLS.GRABCUT
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300"
              }`}
              onClick={() => handleToolChange(TOOLS.GRABCUT)}
              disabled={!isOpenCVReady}
              title="GrabCut - Selección rectangular"
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="grabcut">
                  📦
                </span>
              </div>
            </button>

            <button
              className={`w-full p-2 rounded ${
                selectedTool === TOOLS.MAGIC_WAND
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300"
              }`}
              onClick={() => handleToolChange(TOOLS.MAGIC_WAND)}
              title="Varita Mágica - Selección por color"
              disabled={!isOpenCVReady}
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="magic-wand">
                  ✨
                </span>
              </div>
            </button>

            <div className="border-t border-gray-300 my-2"></div>

            <button
              className={`w-full p-2 rounded ${
                mode === MODES.ADD
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
              onClick={handleModeChange}
              title={
                mode === MODES.ADD
                  ? "Modo: Añadir selección"
                  : "Modo: Quitar selección"
              }
            >
              <div className="flex justify-center items-center">
                <span>{mode === MODES.ADD ? "+" : "-"}</span>
              </div>
            </button>

            {selectedTool === TOOLS.GRABCUT && hasSelection && (
              <button
                className="w-full p-2 rounded bg-purple-500 text-white"
                onClick={() => {}}
                disabled={!hasSelection || !isOpenCVReady}
                title="Aplicar GrabCut a la selección"
              >
                <div className="flex justify-center items-center">
                  <span>✓</span>
                </div>
              </button>
            )}

            <button
              className="w-full p-2 rounded bg-gray-500 text-white mt-auto"
              onClick={resetAll}
              disabled={!isMaskApplied && !hasSelection}
              title="Resetear todo"
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="reset">
                  🔄
                </span>
              </div>
            </button>
          </div>

          {/* Contenedor del editor */}
          <div className="relative">
            <div className="bg-gray-50 py-2 px-4 border-b">
              <h3 className="text-lg font-medium text-gray-700 text-center">
                Editor
              </h3>
            </div>
            <div
              className="relative"
              style={{
                width: `${imageDimensions.width}px`,
                height: `${imageDimensions.height}px`,
              }}
            >
              {!isOpenCVReady && (
                <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center z-50">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-2"></div>
                    <span className="text-gray-800 font-medium">
                      Cargando OpenCV.js...
                    </span>
                  </div>
                </div>
              )}

              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute top-0 left-0"
                style={{
                  zIndex: 1,
                  cursor:
                    selectedTool === TOOLS.GRABCUT
                      ? isMaskApplied
                        ? "default"
                        : "crosshair"
                      : "pointer",
                }}
              />

              <canvas
                ref={maskCanvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ zIndex: 2 }}
              />

              <canvas
                ref={selectionRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ zIndex: 3 }}
              />

              {/* Área para botones contextuales */}
              {contextualButtons.length > 0 && (
                <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                  {contextualButtons.map((button, index) => (
                    <button
                      key={index}
                      className={`p-2 rounded ${
                        button.className || "bg-blue-500 text-white"
                      }`}
                      onClick={button.onClick}
                      title={button.title}
                    >
                      {button.icon || button.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vista Previa */}
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-50 py-2 px-4 border-b">
            <h3 className="text-lg font-medium text-gray-700 text-center">
              Vista Previa
            </h3>
          </div>
          <div
            className="relative"
            style={{
              width: `${imageDimensions.width}px`,
              height: `${imageDimensions.height}px`,
            }}
          >
            <canvas ref={previewCanvasRef} className="absolute top-0 left-0" />

            {!isMaskApplied && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-4 bg-gray-50 bg-opacity-80">
                <p className="text-gray-600 max-w-xs">
                  {selectedTool === TOOLS.GRABCUT
                    ? "Use la herramienta GrabCut para segmentar el objeto"
                    : "Use la varita mágica para seleccionar áreas de color similar"}
                </p>
              </div>
            )}
          </div>

          {/* Indicador del modo actual */}
          <div className="bg-gray-50 py-2 px-4 border-t">
            <div className="flex justify-center">
              <span
                className={`px-3 py-1 text-sm rounded-full ${
                  mode === MODES.ADD
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                Modo: {mode === MODES.ADD ? "Agregar" : "Quitar"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
