import { useEffect, useRef, useState } from "react";

const TOOLS = {
  GRABCUT: "grabcut",
  MAGIC_WAND: "magic_wand",
};

const MODES = {
  ADD: "add",
  SUBTRACT: "subtract",
};

export default function ImageMask({ imageUrl, instanceId }) {
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const selectionRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState(TOOLS.GRABCUT);
  const [mode, setMode] = useState(MODES.ADD);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const containerRef = useRef(null);

  useEffect(() => {
    const scriptId = `opencv-script-${instanceId}`;
    if (document.getElementById(scriptId)) {
      setIsOpenCVReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://docs.opencv.org/4.5.0/opencv.js";
    script.async = true;
    script.onload = () => {
      if (window.cv) {
        setIsOpenCVReady(true);
      } else {
        window.Module = {
          onRuntimeInitialized: () => {
            setIsOpenCVReady(true);
          },
        };
      }
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [instanceId]);

  useEffect(() => {
    if (!imageUrl) return;

    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Calcular dimensiones manteniendo el tamaño original de la imagen
      const maxWidth = window.innerWidth * 0.8; // 80% del ancho de la ventana
      const maxHeight = window.innerHeight * 0.8; // 80% del alto de la ventana

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

      // Aplicar dimensiones a todos los canvas
      [canvasRef, maskCanvasRef, selectionRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = width;
          ref.current.height = height;
          if (ref === canvasRef) {
            const ctx = ref.current.getContext("2d");
            ctx.drawImage(image, 0, 0, width, height);
          }
        }
      });
    };
  }, [imageUrl]);

  const handleGrabCut = async () => {
    if (!isOpenCVReady || !window.cv) return;

    const cv = window.cv;
    const src = cv.imread(canvasRef.current);
    const mask = new cv.Mat();
    const bgdModel = new cv.Mat();
    const fgdModel = new cv.Mat();
    const rect = new cv.Rect(
      Math.min(startPoint.x, endPoint.x),
      Math.min(startPoint.y, endPoint.y),
      Math.abs(endPoint.x - startPoint.x),
      Math.abs(endPoint.y - startPoint.y)
    );

    try {
      cv.grabCut(src, mask, rect, bgdModel, fgdModel, 5, cv.GC_INIT_WITH_RECT);

      const maskData = new Uint8Array(mask.rows * mask.cols);
      for (let i = 0; i < mask.rows; i++) {
        for (let j = 0; j < mask.cols; j++) {
          if (
            mask.ucharPtr(i, j)[0] === cv.GC_FGD ||
            mask.ucharPtr(i, j)[0] === cv.GC_PR_FGD
          ) {
            maskData[i * mask.cols + j] = 1;
          }
        }
      }

      applyMask(maskData);
    } catch (error) {
      console.error("Error en GrabCut:", error);
    } finally {
      src.delete();
      mask.delete();
      bgdModel.delete();
      fgdModel.delete();
    }
  };

  const handleMagicWand = (x, y) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mask = new Uint8Array(imageData.width * imageData.height);

    const targetColor = {
      r: imageData.data[(y * imageData.width + x) * 4],
      g: imageData.data[(y * imageData.width + x) * 4 + 1],
      b: imageData.data[(y * imageData.width + x) * 4 + 2],
    };

    const tolerance = 32;
    floodFill(imageData, mask, x, y, targetColor, tolerance);

    applyMask(mask);
  };

  const floodFill = (imageData, mask, x, y, targetColor, tolerance) => {
    const stack = [{ x, y }];
    const width = imageData.width;
    const height = imageData.height;

    while (stack.length) {
      const current = stack.pop();
      const pos = (current.y * width + current.x) * 4;

      if (mask[current.y * width + current.x]) continue;

      const currentColor = {
        r: imageData.data[pos],
        g: imageData.data[pos + 1],
        b: imageData.data[pos + 2],
      };

      if (colorMatch(targetColor, currentColor, tolerance)) {
        mask[current.y * width + current.x] = 1;

        if (current.x > 0) stack.push({ x: current.x - 1, y: current.y });
        if (current.x < width - 1)
          stack.push({ x: current.x + 1, y: current.y });
        if (current.y > 0) stack.push({ x: current.x, y: current.y - 1 });
        if (current.y < height - 1)
          stack.push({ x: current.x, y: current.y + 1 });
      }
    }
  };

  const colorMatch = (c1, c2, tolerance) => {
    return (
      Math.abs(c1.r - c2.r) <= tolerance &&
      Math.abs(c1.g - c2.g) <= tolerance &&
      Math.abs(c1.b - c2.b) <= tolerance
    );
  };

  const applyMask = (maskData) => {
    const maskCtx = maskCanvasRef.current.getContext("2d");
    const imageData = maskCtx.createImageData(
      maskCanvasRef.current.width,
      maskCanvasRef.current.height
    );

    for (let i = 0; i < maskData.length; i++) {
      const pos = i * 4;
      if (maskData[i]) {
        imageData.data[pos] = 255;
        imageData.data[pos + 1] = 0;
        imageData.data[pos + 2] = 0;
        imageData.data[pos + 3] = 128;
      }
    }

    maskCtx.putImageData(imageData, 0, 0);
  };

  const handleMouseDown = (e) => {
    setIsSelecting(true);
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setEndPoint({ x, y });

    if (selectedTool === TOOLS.MAGIC_WAND) {
      handleMagicWand(x, y);
    } else if (selectedTool === TOOLS.GRABCUT) {
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
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setEndPoint(newEndPoint);

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
    setIsSelecting(false);
    if (selectedTool === TOOLS.GRABCUT) {
      handleGrabCut();
      const selectionCtx = selectionRef.current.getContext("2d");
      selectionCtx.clearRect(
        0,
        0,
        selectionRef.current.width,
        selectionRef.current.height
      );
    }
  };

  return (
    <div className="w-full flex justify-center p-4">
      <div
        ref={containerRef}
        className="flex bg-white rounded-lg shadow-lg"
        style={{
          width: imageDimensions.width
            ? `${imageDimensions.width + 68}px`
            : "auto",
          height: imageDimensions.height
            ? `${imageDimensions.height + 32}px`
            : "auto",
        }}
      >
        {/* Barra de herramientas con altura ajustada */}
        <div
          className="bg-gray-100 rounded-l-lg mr-4 p-2 flex flex-col gap-2 justify-start"
          style={{
            height: imageDimensions.height
              ? `${imageDimensions.height}px`
              : "auto",
            width: "48px",
          }}
        >
          <button
            className={`w-full aspect-square rounded ${
              selectedTool === TOOLS.GRABCUT
                ? "bg-blue-500 text-white"
                : "bg-white border border-gray-300"
            }`}
            onClick={() => setSelectedTool(TOOLS.GRABCUT)}
            disabled={!isOpenCVReady}
            title="Herramienta GrabCut"
          >
            📦
          </button>
          <button
            className={`w-full aspect-square rounded ${
              selectedTool === TOOLS.MAGIC_WAND
                ? "bg-blue-500 text-white"
                : "bg-white border border-gray-300"
            }`}
            onClick={() => setSelectedTool(TOOLS.MAGIC_WAND)}
            title="Varita Mágica"
          >
            ✨
          </button>
          <button
            className={`w-full aspect-square rounded ${
              mode === MODES.ADD
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
            onClick={() =>
              setMode(mode === MODES.ADD ? MODES.SUBTRACT : MODES.ADD)
            }
            title={mode === MODES.ADD ? "Modo Agregar" : "Modo Quitar"}
          >
            {mode === MODES.ADD ? "+" : "-"}
          </button>
        </div>

        {/* Contenedor de la imagen */}
        <div
          className="relative bg-white rounded-r-lg"
          style={{
            width: `${imageDimensions.width}px`,
            height: `${imageDimensions.height}px`,
          }}
        >
          {!isOpenCVReady && (
            <div className="absolute inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center rounded z-50">
              <span className="text-gray-600">Cargando OpenCV...</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="rounded absolute top-0 left-0"
            style={{ zIndex: 1 }}
          />
          <canvas
            ref={maskCanvasRef}
            className="absolute top-0 left-0 pointer-events-none rounded"
            style={{ zIndex: 2 }}
          />
          <canvas
            ref={selectionRef}
            className="absolute top-0 left-0 pointer-events-none rounded"
            style={{ zIndex: 3 }}
          />
        </div>
      </div>
    </div>
  );
}
