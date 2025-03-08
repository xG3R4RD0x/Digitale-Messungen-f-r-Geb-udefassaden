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
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [toolMessage, setToolMessage] = useState("");

  // Cargar y mostrar la imagen
  useEffect(() => {
    if (!imageUrl) return;

    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Calcular dimensiones manteniendo el ratio de aspecto original
      // Usamos 0.35 para dar espacio a la UI
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
      setMultiSelectMode(false);

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

  // Implementación de GrabCut
  const handleGrabCut = () => {
    setErrorMessage("");

    if (!isOpenCVReady) {
      setErrorMessage("OpenCV no está listo aún. Por favor, espere.");
      return;
    }

    if (!window.cv) {
      setErrorMessage(
        "Biblioteca OpenCV no encontrada. Intente refrescar la página."
      );
      return;
    }

    // Declarar variables fuera del bloque try para que estén disponibles en finally
    let src, mask, bgdModel, fgdModel;

    try {
      console.log("Iniciando operación GrabCut...");
      const cv = window.cv;

      // Validar dimensiones de selección
      const rectWidth = Math.abs(endPoint.x - startPoint.x);
      const rectHeight = Math.abs(endPoint.y - startPoint.y);

      if (rectWidth < 20 || rectHeight < 20) {
        setErrorMessage(
          "Selección demasiado pequeña. Dibuje un rectángulo más grande (al menos 20x20 píxeles)."
        );
        return;
      }

      console.log("Leyendo imagen desde canvas...");
      src = cv.imread(canvasRef.current);

      if (!src || src.empty()) {
        throw new Error("No se pudo leer la imagen desde el canvas.");
      }

      console.log(
        "Imagen leída correctamente. Dimensiones:",
        src.rows,
        "x",
        src.cols
      );

      // Crear máscara y modelos
      mask = new cv.Mat();
      bgdModel = new cv.Mat();
      fgdModel = new cv.Mat();

      // Crear rectángulo
      const rect = new cv.Rect(
        Math.min(startPoint.x, endPoint.x),
        Math.min(startPoint.y, endPoint.y),
        rectWidth,
        rectHeight
      );

      console.log(
        "Rectángulo GrabCut:",
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );

      // Verificar que el rectángulo esté dentro de los límites de la imagen
      if (
        rect.x < 0 ||
        rect.y < 0 ||
        rect.x + rect.width > src.cols ||
        rect.y + rect.height > src.rows
      ) {
        throw new Error(
          "Rectángulo de selección fuera de los límites de la imagen."
        );
      }

      console.log("Aplicando algoritmo GrabCut...");

      // Aplicar algoritmo GrabCut
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);

      // Inicializar máscara y modelos con los tamaños correctos
      mask.create(src.rows, src.cols, cv.CV_8UC1);
      mask.setTo(new cv.Scalar(0));
      bgdModel.create(1, 65, cv.CV_64FC1);
      bgdModel.setTo(new cv.Scalar(0));
      fgdModel.create(1, 65, cv.CV_64FC1);
      fgdModel.setTo(new cv.Scalar(0));

      console.log("Ejecutando grabCut...");
      cv.grabCut(src, mask, rect, bgdModel, fgdModel, 3, cv.GC_INIT_WITH_RECT);

      console.log("GrabCut completado. Creando máscara de resultado...");

      // Crear máscara a partir de los resultados
      const maskData = new Uint8Array(mask.rows * mask.cols);
      for (let i = 0; i < mask.rows; i++) {
        for (let j = 0; j < mask.cols; j++) {
          const pixelValue = mask.ucharPtr(i, j)[0];
          if (pixelValue === cv.GC_FGD || pixelValue === cv.GC_PR_FGD) {
            // Si es foreground probable o definitivo, marcarlo según el modo
            maskData[i * mask.cols + j] = 1;
          }
        }
      }

      // Aplicar máscara al canvas
      applyMask(maskData);

      console.log("Procesamiento GrabCut completado exitosamente.");

      // Habilitar modo multi-selección después de la primera máscara
      setMultiSelectMode(true);

      // Restablecer estado de selección pero mantener la máscara visible
      resetSelectionOnly();
    } catch (error) {
      console.error("Error en operación GrabCut:", error);
      setErrorMessage(
        `Error: ${
          error.message || "Ocurrió un error desconocido al procesar la imagen."
        }`
      );
    } finally {
      // Limpiar recursos si se crearon
      try {
        if (window.cv) {
          if (src) src.delete();
          if (mask) mask.delete();
          if (bgdModel) bgdModel.delete();
          if (fgdModel) fgdModel.delete();
        }
      } catch (e) {
        console.error("Error durante la limpieza:", e);
      }
    }

    // Al finalizar, actualizar la vista previa y mensajes
    setTimeout(updatePreview, 0);
    setToolMessage(
      multiSelectMode
        ? "Puede continuar refinando la selección"
        : "Selección aplicada. Utilice el botón + o - para agregar o quitar áreas"
    );
  };

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

  // Aplicar máscara al canvas
  const applyMask = (maskData) => {
    const maskCtx = maskCanvasRef.current.getContext("2d");
    const width = maskCanvasRef.current.width;
    const height = maskCanvasRef.current.height;

    if (!isMaskApplied) {
      // Primera máscara: crear un nuevo ImageData
      const imageData = maskCtx.createImageData(width, height);

      for (let i = 0; i < maskData.length; i++) {
        const pos = i * 4;
        if (maskData[i]) {
          imageData.data[pos] = 255; // R
          imageData.data[pos + 1] = 0; // G
          imageData.data[pos + 2] = 0; // B
          imageData.data[pos + 3] = 128; // A (semi-transparente)
        }
      }

      maskCtx.putImageData(imageData, 0, 0);
    } else {
      // Para máscaras posteriores, obtener la máscara existente y combinarla según el modo
      const existingMask = maskCtx.getImageData(0, 0, width, height);

      for (let i = 0; i < maskData.length; i++) {
        const pos = i * 4;

        if (mode === MODES.ADD) {
          // En modo ADD, agregar áreas seleccionadas a la máscara
          if (maskData[i]) {
            existingMask.data[pos] = 255; // R
            existingMask.data[pos + 1] = 0; // G
            existingMask.data[pos + 2] = 0; // B
            existingMask.data[pos + 3] = 128; // A
          }
        } else if (mode === MODES.SUBTRACT) {
          // En modo SUBTRACT, quitar áreas seleccionadas de la máscara
          if (maskData[i]) {
            existingMask.data[pos] = 0; // R
            existingMask.data[pos + 1] = 0; // G
            existingMask.data[pos + 2] = 0; // B
            existingMask.data[pos + 3] = 0; // A (transparente - quitar de la máscara)
          }
        }
      }

      maskCtx.putImageData(existingMask, 0, 0);
    }

    setIsMaskApplied(true);
    // Actualizar la vista previa
    setTimeout(updatePreview, 0);
  };

  // Implementación de Magic Wand
  const handleMagicWand = (x, y) => {
    if (!isOpenCVReady) {
      setErrorMessage("OpenCV no está listo aún. Por favor, espere.");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newMask = new Uint8Array(imageData.width * imageData.height);

    // Obtener el color del pixel seleccionado
    const pixelPos = (y * imageData.width + x) * 4;
    const targetColor = {
      r: imageData.data[pixelPos],
      g: imageData.data[pixelPos + 1],
      b: imageData.data[pixelPos + 2],
    };

    const tolerance = 32; // Ajustar esto según necesidad para más/menos precisión
    floodFill(imageData, newMask, x, y, targetColor, tolerance);

    // Aplicar la máscara según el modo actual
    if (mode === MODES.SUBTRACT) {
      // Invertir la máscara para modo SUBTRACT
      for (let i = 0; i < newMask.length; i++) {
        newMask[i] = newMask[i] ? 0 : 1;
      }
    }

    applyMask(newMask);
    setIsMaskApplied(true);

    // Actualizar mensaje después de aplicar
    setToolMessage(
      "Use el modo + o - para agregar o quitar áreas de la selección"
    );

    // Actualizar la vista previa después de aplicar la máscara
    setTimeout(updatePreview, 0);
  };

  // Algoritmo de floodFill para Magic Wand
  const floodFill = (imageData, mask, x, y, targetColor, tolerance) => {
    const stack = [{ x, y }];
    const width = imageData.width;
    const height = imageData.height;
    const processed = new Set(); // Para evitar procesar el mismo pixel dos veces

    while (stack.length > 0) {
      const current = stack.pop();
      const key = `${current.y * width + current.x}`;

      if (processed.has(key)) continue;
      processed.add(key);

      const pos = (current.y * width + current.x) * 4;
      const currentColor = {
        r: imageData.data[pos],
        g: imageData.data[pos + 1],
        b: imageData.data[pos + 2],
      };

      if (colorMatch(targetColor, currentColor, tolerance)) {
        mask[current.y * width + current.x] = 1;

        // Añadir vecinos a la pila
        const directions = [
          { dx: 1, dy: 0 }, // derecha
          { dx: -1, dy: 0 }, // izquierda
          { dx: 0, dy: 1 }, // abajo
          { dx: 0, dy: -1 }, // arriba
        ];

        for (const dir of directions) {
          const nx = current.x + dir.dx;
          const ny = current.y + dir.dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborKey = `${ny * width + nx}`;
            if (!processed.has(neighborKey)) {
              stack.push({ x: nx, y: ny });
            }
          }
        }
      }
    }
  };

  // Comprobación de coincidencia de color con tolerancia
  const colorMatch = (c1, c2, tolerance) => {
    return (
      Math.abs(c1.r - c2.r) <= tolerance &&
      Math.abs(c1.g - c2.g) <= tolerance &&
      Math.abs(c1.b - c2.b) <= tolerance
    );
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
    const selectionCtx = selectionRef.current.getContext("2d");
    selectionCtx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );

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

    setHasSelection(false);
    setIsMaskApplied(false);
    setErrorMessage("");
    setMultiSelectMode(false);

    // Restablecer mensaje inicial
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

  const handleMouseDown = (e) => {
    // Si tenemos máscara aplicada y no estamos en modo multi-selección, no permitir nuevas selecciones
    if (isMaskApplied && !multiSelectMode && selectedTool === TOOLS.GRABCUT)
      return;

    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === TOOLS.MAGIC_WAND) {
      handleMagicWand(x, y);
    } else if (selectedTool === TOOLS.GRABCUT) {
      setIsSelecting(true);
      setStartPoint({ x, y });
      setEndPoint({ x, y });
      setErrorMessage("");

      // Limpiar selección previa
      const selectionCtx = selectionRef.current.getContext("2d");
      selectionCtx.clearRect(
        0,
        0,
        selectionRef.current.width,
        selectionRef.current.height
      );
    }
  };

  const handleMouseMove = (e) => {
    if (isSelecting && selectedTool === TOOLS.GRABCUT) {
      const rect = e.target.getBoundingClientRect();
      const newEndPoint = {
        x: Math.max(
          0,
          Math.min(e.clientX - rect.left, canvasRef.current.width)
        ),
        y: Math.max(
          0,
          Math.min(e.clientY - rect.top, canvasRef.current.height)
        ),
      };
      setEndPoint(newEndPoint);

      // Dibujar rectángulo de selección
      const selectionCtx = selectionRef.current.getContext("2d");
      selectionCtx.clearRect(
        0,
        0,
        selectionRef.current.width,
        selectionRef.current.height
      );
      selectionCtx.strokeStyle = "blue";
      selectionCtx.lineWidth = 2;
      selectionCtx.setLineDash([5, 5]);
      selectionCtx.strokeRect(
        startPoint.x,
        startPoint.y,
        newEndPoint.x - startPoint.x,
        newEndPoint.y - startPoint.y
      );
    }
  };

  const handleMouseUp = () => {
    if (selectedTool !== TOOLS.GRABCUT || !isSelecting) return;

    setIsSelecting(false);

    // Verificar si la selección es válida
    const selectionWidth = Math.abs(endPoint.x - startPoint.x);
    const selectionHeight = Math.abs(endPoint.y - startPoint.y);

    if (selectionWidth > 20 && selectionHeight > 20) {
      setHasSelection(true);
    } else {
      setErrorMessage(
        "Selección demasiado pequeña. Por favor dibuje un rectángulo más grande (al menos 20x20 píxeles)."
      );
      resetSelectionOnly();
    }
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
                onClick={handleGrabCut}
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
                      ? isMaskApplied && !multiSelectMode
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
            </div>
          </div>
        </div>

        {/* Vista Previa - Panel Derecho */}
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
