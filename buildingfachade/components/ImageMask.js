import { useEffect, useRef, useState } from "react";
import { useOpenCV } from "../contexts/OpenCVContext";
import { initializeTool, getToolCursor } from "../utils/toolInitializer";

// Constantes
const TOOLS = { GRABCUT: "grabcut", MAGIC_WAND: "magic_wand" };
const MODES = { ADD: "add", SUBTRACT: "subtract" };

export default function ImageMask({ imageUrl, instanceId }) {
  // Referencias a elementos DOM y canvas
  const canvasRefs = {
    main: useRef(null), // Canvas original
    mask: useRef(null), // Canvas para máscara
    selection: useRef(null), // Canvas para selección temporal
    preview: useRef(null), // Canvas para vista previa
  };

  const overlayRef = useRef(null); // Referencia al overlay

  // Estado central de la aplicación
  const { isOpenCVReady } = useOpenCV();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState(TOOLS.GRABCUT);
  const [mode, setMode] = useState(MODES.ADD);
  const [cursor, setCursor] = useState("default");

  // Estado de selección y máscara
  const [selection, setSelection] = useState({
    active: false, // Si hay selección activa
    isSelecting: false, // Si está en proceso de selección
    start: { x: 0, y: 0 }, // Punto inicio
    end: { x: 0, y: 0 }, // Punto final
  });

  const [hasMask, setHasMask] = useState(false); // Si hay máscara aplicada
  const [maskData, setMaskData] = useState(null); // Datos de la máscara para persistencia

  // Estados UI
  const [error, setError] = useState("");
  const [buttons, setButtons] = useState([]);
  const [activeTool, setActiveTool] = useState(null);

  // ========== INICIALIZACIÓN Y CARGA ==========

  // Cargar imagen
  useEffect(() => {
    if (!imageUrl) return;

    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Calcular dimensiones manteniendo proporción
      const maxWidth = window.innerWidth * 0.35;
      const maxHeight = window.innerHeight * 0.7;

      let { width, height } = image;
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width *= scale;
        height *= scale;
      }

      // Actualizar dimensiones
      setDimensions({ width, height });

      // Inicializar todos los canvas
      Object.values(canvasRefs).forEach((ref) => {
        if (ref.current) {
          ref.current.width = width;
          ref.current.height = height;

          // Dibujar la imagen en el canvas principal y de vista previa
          if (ref === canvasRefs.main || ref === canvasRefs.preview) {
            const ctx = ref.current.getContext("2d");
            ctx.drawImage(image, 0, 0, width, height);
          }
        }
      });

      // Reset estados
      resetState(false);
    };
  }, [imageUrl]);

  // Inicializar herramienta cuando cambia la selección o OpenCV
  useEffect(() => {
    if (tool && isOpenCVReady) {
      // Limpiar botones anteriores
      setButtons([]);

      const toolInterface = initializeTool(tool, {
        canvasRef: canvasRefs.main,
        maskCanvasRef: canvasRefs.mask,
        selectionRef: canvasRefs.selection,
        registerToolButtons: setButtons,
        setErrorMessage: setError,
        resetSelectionOnly,
        hasSelection: selection.active,
        setHasSelection: (active) =>
          setSelection((prev) => ({ ...prev, active })),
        setIsMaskApplied: setHasMask,
        startPoint: selection.start,
        endPoint: selection.end,
        isOpenCVReady,
        updatePreview: applyMaskToPreview,
        mode,
      });

      if (toolInterface) {
        const tool = toolInterface.initTool();
        setActiveTool(tool);
        setCursor(tool?.cursor || "crosshair");
      }
    }
  }, [tool, mode, isOpenCVReady]);

  // Actualizar botones al cambiar la selección
  useEffect(() => {
    if (selection.active && activeTool) {
      const toolProps = {
        canvasRef: canvasRefs.main,
        maskCanvasRef: canvasRefs.mask,
        selectionRef: canvasRefs.selection,
        registerToolButtons: setButtons,
        setErrorMessage: setError,
        resetSelectionOnly,
        hasSelection: selection.active,
        setHasSelection: (active) =>
          setSelection((prev) => ({ ...prev, active })),
        setIsMaskApplied: setHasMask,
        startPoint: selection.start,
        endPoint: selection.end,
        isOpenCVReady,
        updatePreview: applyMaskToPreview,
        mode,
      };

      const toolInstance = initializeTool(tool, toolProps);
      if (toolInstance) toolInstance.registerButtons();
    }
  }, [selection.active]);

  // Actualizar visibilidad del overlay cuando cambia hasMask
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.style.display = hasMask ? "none" : "flex";
    }

    // Si tenemos máscara, actualizar vista previa
    if (hasMask && canvasRefs.mask.current && !selection.isSelecting) {
      const ctx = canvasRefs.mask.current.getContext("2d");
      const mask = ctx.getImageData(
        0,
        0,
        canvasRefs.mask.current.width,
        canvasRefs.mask.current.height
      );

      // Guardar datos de máscara para persistencia
      setMaskData(mask);

      // Aplicar a vista previa
      applyMaskToPreview(true);
    }
  }, [hasMask]);

  // ========== FUNCIONES DE MÁSCARA Y VISTA PREVIA ==========

  // Aplicar máscara a la vista previa
  function applyMaskToPreview(force = false) {
    const { main, mask, preview } = canvasRefs;
    if (!preview.current || !mask.current || !main.current) return;

    const previewCtx = preview.current.getContext("2d");
    const width = preview.current.width;
    const height = preview.current.height;

    // Dibujar imagen original
    const originalCtx = main.current.getContext("2d");
    const originalImage = originalCtx.getImageData(0, 0, width, height);
    previewCtx.putImageData(originalImage, 0, 0);

    // Obtener máscara actual
    const maskCtx = mask.current.getContext("2d");
    const maskImage = maskCtx.getImageData(0, 0, width, height);

    // Verificar si hay máscara
    let pixelsFound = false;

    if (hasMask || force) {
      // Aplicar efectos
      const previewImage = previewCtx.getImageData(0, 0, width, height);

      for (let i = 0; i < previewImage.data.length; i += 4) {
        if (maskImage.data[i + 3] > 0) {
          pixelsFound = true;

          // Efecto visual - azulado para objeto seleccionado
          previewImage.data[i] *= 0.8; // R
          previewImage.data[i + 1] *= 0.8; // G
          previewImage.data[i + 2] = Math.min(
            255,
            previewImage.data[i + 2] * 1.2
          ); // B
        } else {
          // Semi-transparencia para fondo
          previewImage.data[i + 3] = 100; // Alpha
        }
      }

      previewCtx.putImageData(previewImage, 0, 0);

      // Actualizar estado si es necesario
      if (pixelsFound !== hasMask) {
        setHasMask(pixelsFound);
      }

      // Actualizar el overlay
      if (overlayRef.current) {
        overlayRef.current.style.display = pixelsFound ? "none" : "flex";
      }
    }
  }

  // Restaurar máscara guardada cuando se cambia de herramienta
  useEffect(() => {
    if (maskData && canvasRefs.mask.current && hasMask) {
      const maskCtx = canvasRefs.mask.current.getContext("2d");
      maskCtx.putImageData(maskData, 0, 0);

      // Forzar actualización de vista previa
      setTimeout(() => applyMaskToPreview(true), 0);

      // Ocultar overlay
      if (overlayRef.current) {
        overlayRef.current.style.display = "none";
      }
    }
  }, [tool, maskData]);

  // ========== MANEJADORES DE EVENTOS ==========

  // Cambio de herramienta
  const changeTool = (newTool) => {
    if (tool === newTool) return;

    // Limpiar selección pero mantener máscara
    resetSelectionOnly();
    setTool(newTool);

    // Forzar a que se mantengan los estados de máscara
    if (hasMask && overlayRef.current) {
      overlayRef.current.style.display = "none";
    }
  };

  // Cambio de modo
  const toggleMode = () => {
    setMode(mode === MODES.ADD ? MODES.SUBTRACT : MODES.ADD);
  };

  // Reset solo selección
  const resetSelectionOnly = () => {
    if (canvasRefs.selection.current) {
      const ctx = canvasRefs.selection.current.getContext("2d");
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      setSelection({
        active: false,
        isSelecting: false,
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
      });
    }
  };

  // Reset completo
  const resetAll = () => {
    // Limpiar canvas
    [canvasRefs.selection, canvasRefs.mask].forEach((ref) => {
      if (ref.current) {
        const ctx = ref.current.getContext("2d");
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      }
    });

    // Restaurar imagen original en vista previa
    if (canvasRefs.preview.current && canvasRefs.main.current) {
      const mainCtx = canvasRefs.main.current.getContext("2d");
      const previewCtx = canvasRefs.preview.current.getContext("2d");
      const image = mainCtx.getImageData(
        0,
        0,
        dimensions.width,
        dimensions.height
      );
      previewCtx.putImageData(image, 0, 0);
    }

    // Reset estados
    resetState(false);
  };

  // Inicializar/resetear estados
  const resetState = (preserveMask = false) => {
    if (!preserveMask) {
      setHasMask(false);
      setMaskData(null);
    }

    setSelection({
      active: false,
      isSelecting: false,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    });

    setError("");
    setButtons([]);
  };

  // ========== MANEJADORES DE MOUSE ==========

  const handleMouseDown = (e) => {
    setError("");

    if (activeTool?.handleMouseDown) {
      const point = activeTool.handleMouseDown(e);
      if (point) {
        setSelection((prev) => ({
          ...prev,
          isSelecting: true,
          start: point,
          end: point,
        }));
      }
    }
  };

  const handleMouseMove = (e) => {
    if (selection.isSelecting && activeTool?.handleMouseMove) {
      const newEnd = activeTool.handleMouseMove(e, true, selection.start);
      if (newEnd) {
        setSelection((prev) => ({
          ...prev,
          end: newEnd,
        }));
      }
    }
  };

  const handleMouseUp = () => {
    if (selection.isSelecting && activeTool?.handleMouseUp) {
      const valid = activeTool.handleMouseUp(selection.end, selection.start);

      setSelection((prev) => ({
        ...prev,
        isSelecting: false,
        active: valid,
      }));
    }
  };

  // ========== RENDERIZADO ==========

  return (
    <div className="w-full flex flex-col items-center p-4">
      {/* Mensaje de error */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Indicador de carga OpenCV */}
      {!isOpenCVReady && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          Cargando OpenCV.js... Por favor, espere.
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-wrap justify-center lg:justify-between gap-6">
        {/* Panel de edición */}
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden flex">
          {/* Barra de herramientas */}
          <div className="bg-gray-100 p-2 flex flex-col gap-2 justify-start rounded-l-lg">
            {/* Herramienta GrabCut */}
            <button
              className={`w-full p-2 rounded ${
                tool === TOOLS.GRABCUT
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300"
              }`}
              onClick={() => changeTool(TOOLS.GRABCUT)}
              disabled={!isOpenCVReady}
              title="GrabCut - Selección rectangular"
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="grabcut">
                  📦
                </span>
              </div>
            </button>

            {/* Herramienta Magic Wand */}
            <button
              className={`w-full p-2 rounded ${
                tool === TOOLS.MAGIC_WAND
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300"
              }`}
              onClick={() => changeTool(TOOLS.MAGIC_WAND)}
              title="Varita Mágica - Selección por color"
              disabled={!isOpenCVReady}
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="magic-wand">
                  ✨
                </span>
              </div>
            </button>

            {/* Separador */}
            <div className="border-t border-gray-300 my-2"></div>

            {/* Botón de modo */}
            <button
              className={`w-full p-2 rounded ${
                mode === MODES.ADD
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
              onClick={toggleMode}
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

            {/* Botón reset */}
            <button
              className="w-full p-2 rounded bg-gray-500 text-white mt-auto"
              onClick={resetAll}
              disabled={!hasMask && !selection.active}
              title="Resetear todo"
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="reset">
                  🔄
                </span>
              </div>
            </button>
          </div>

          {/* Área de edición */}
          <div className="relative">
            <div className="bg-gray-50 py-2 px-4 border-b">
              <h3 className="text-lg font-medium text-gray-700 text-center">
                Editor
              </h3>
            </div>

            {/* Área de canvas */}
            <div
              className="relative"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
              }}
            >
              {/* Overlay de carga */}
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

              {/* Capas de canvas */}
              <canvas
                ref={canvasRefs.main}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute top-0 left-0"
                style={{ zIndex: 1, cursor }}
              />
              <canvas
                ref={canvasRefs.mask}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ zIndex: 2 }}
              />
              <canvas
                ref={canvasRefs.selection}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ zIndex: 3 }}
              />
            </div>

            {/* Botones contextuales */}
            <div className="bg-gray-50 py-2 px-4 border-t">
              {buttons.length > 0 && (
                <div className="flex gap-2 z-10 justify-end">
                  {buttons.map((button, index) => (
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

        {/* Panel de vista previa */}
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-50 py-2 px-4 border-b">
            <h3 className="text-lg font-medium text-gray-700 text-center">
              Vista Previa
            </h3>
          </div>

          <div
            className="relative"
            style={{
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
            }}
          >
            <canvas
              ref={canvasRefs.preview}
              className="absolute top-0 left-0"
            />

            {/* Mensaje de overlay */}
            <div
              ref={overlayRef}
              className="absolute inset-0 flex items-center justify-center text-center p-4 bg-gray-50 bg-opacity-80"
              style={{ display: hasMask ? "none" : "flex" }}
            >
              <p className="text-gray-600 max-w-xs">
                {tool === TOOLS.GRABCUT
                  ? "Use la herramienta GrabCut para segmentar el objeto"
                  : "Use la varita mágica para seleccionar áreas de color similar"}
              </p>
            </div>
          </div>

          {/* Indicador de modo */}
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
