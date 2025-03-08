import { useEffect, useRef, useState } from "react";
import { useOpenCV } from "../contexts/OpenCVContext";

export default function GrabCutComponent({ imageUrl }) {
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const selectionRef = useRef(null);
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
  // Track if we're in multi-selection mode
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Load and display the image
  useEffect(() => {
    if (!imageUrl) return;

    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Calculate dimensions maintaining the original aspect ratio
      const maxWidth = Math.min(window.innerWidth * 0.8, 800);
      const maxHeight = Math.min(window.innerHeight * 0.8, 600);

      let width = image.width;
      let height = image.height;

      if (width > maxWidth || height > maxHeight) {
        const scaleW = maxWidth / width;
        const scaleH = maxHeight / height;
        const scale = Math.min(scaleW, scaleH);

        width *= scale;
        height *= scale;
      }

      setImageDimensions({ width, height });

      // Configure canvases
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

      // Reset state for new image
      setHasSelection(false);
      setIsMaskApplied(false);
      setErrorMessage("");
    };
  }, [imageUrl]);

  const handleGrabCut = () => {
    setErrorMessage("");

    if (!isOpenCVReady) {
      setErrorMessage("OpenCV is not ready yet. Please wait.");
      return;
    }

    if (!window.cv) {
      setErrorMessage("OpenCV library not found. Try refreshing the page.");
      return;
    }

    try {
      console.log("Starting GrabCut operation...");
      const cv = window.cv;

      // Validate selection dimensions
      const rectWidth = Math.abs(endPoint.x - startPoint.x);
      const rectHeight = Math.abs(endPoint.y - startPoint.y);

      if (rectWidth < 20 || rectHeight < 20) {
        setErrorMessage(
          "Selection too small. Draw a larger rectangle (at least 20x20 pixels)."
        );
        return;
      }

      console.log("Reading image from canvas...");
      const src = cv.imread(canvasRef.current);

      if (!src || src.empty()) {
        throw new Error("Failed to read image from canvas.");
      }
      console.log(
        "Image read successfully. Dimensions:",
        src.rows,
        "x",
        src.cols
      );

      // Create mask and models
      const mask = new cv.Mat();
      const bgdModel = new cv.Mat();
      const fgdModel = new cv.Mat();

      // Create rectangle
      const rect = new cv.Rect(
        Math.min(startPoint.x, endPoint.x),
        Math.min(startPoint.y, endPoint.y),
        rectWidth,
        rectHeight
      );

      console.log("GrabCut rect:", rect.x, rect.y, rect.width, rect.height);
      console.log(
        "Canvas dimensions:",
        canvasRef.current.width,
        "x",
        canvasRef.current.height
      );

      // Ensure the rectangle is within the image bounds
      if (
        rect.x < 0 ||
        rect.y < 0 ||
        rect.x + rect.width > src.cols ||
        rect.y + rect.height > src.rows
      ) {
        throw new Error("Selection rectangle outside image boundaries.");
      }

      console.log("Applying GrabCut algorithm...");
      // Apply GrabCut algorithm
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);

      // Initialize mask and models with correct sizes
      mask.create(src.rows, src.cols, cv.CV_8UC1);
      mask.setTo(new cv.Scalar(0));
      bgdModel.create(1, 65, cv.CV_64FC1);
      bgdModel.setTo(new cv.Scalar(0));
      fgdModel.create(1, 65, cv.CV_64FC1);
      fgdModel.setTo(new cv.Scalar(0));

      console.log("Running grabCut...");
      cv.grabCut(src, mask, rect, bgdModel, fgdModel, 3, cv.GC_INIT_WITH_RECT);

      console.log("GrabCut completed. Creating result mask...");
      // Create mask from results
      const maskData = new Uint8Array(mask.rows * mask.cols);

      for (let i = 0; i < mask.rows; i++) {
        for (let j = 0; j < mask.cols; j++) {
          const pixelValue = mask.ucharPtr(i, j)[0];
          if (pixelValue === cv.GC_FGD || pixelValue === cv.GC_PR_FGD) {
            maskData[i * mask.cols + j] = 1;
          }
        }
      }

      // Apply mask to canvas (preserving existing masks)
      applyMask(maskData);

      console.log("GrabCut processing completed successfully.");

      // Enable multi-select mode after first successful mask
      setMultiSelectMode(true);

      // Reset selection state but keep mask visible
      resetSelectionOnly();
    } catch (error) {
      console.error("Error in GrabCut operation:", error);
      setErrorMessage(
        `Error: ${
          error.message ||
          "An unknown error occurred while processing the image."
        }`
      );
    } finally {
      // Clean up resources if they were created
      try {
        if (window.cv) {
          const cv = window.cv;
          // Only cleanup if these objects were successfully created
          if (typeof src !== "undefined") src.delete();
          if (typeof mask !== "undefined") mask.delete();
          if (typeof bgdModel !== "undefined") bgdModel.delete();
          if (typeof fgdModel !== "undefined") fgdModel.delete();
        }
      } catch (e) {
        console.error("Error during cleanup:", e);
      }
    }
  };

  // Apply mask to canvas while preserving existing masks
  const applyMask = (maskData) => {
    const maskCtx = maskCanvasRef.current.getContext("2d");

    // If this is the first mask, create a new ImageData
    if (!isMaskApplied) {
      const imageData = maskCtx.createImageData(
        maskCanvasRef.current.width,
        maskCanvasRef.current.height
      );

      for (let i = 0; i < maskData.length; i++) {
        const pos = i * 4;
        if (maskData[i]) {
          imageData.data[pos] = 255; // R
          imageData.data[pos + 1] = 0; // G
          imageData.data[pos + 2] = 0; // B
          imageData.data[pos + 3] = 128; // A (semi-transparent)
        }
      }

      maskCtx.putImageData(imageData, 0, 0);
    } else {
      // For subsequent masks, get the existing mask and merge
      const existingMask = maskCtx.getImageData(
        0,
        0,
        maskCanvasRef.current.width,
        maskCanvasRef.current.height
      );

      for (let i = 0; i < maskData.length; i++) {
        const pos = i * 4;
        if (maskData[i]) {
          existingMask.data[pos] = 255; // R
          existingMask.data[pos + 1] = 0; // G
          existingMask.data[pos + 2] = 0; // B
          existingMask.data[pos + 3] = 128; // A (semi-transparent)
        }
      }

      maskCtx.putImageData(existingMask, 0, 0);
    }

    setIsMaskApplied(true);
  };

  // Reset only the selection, not the mask
  const resetSelectionOnly = () => {
    // Clear selection rectangle
    const selectionCtx = selectionRef.current.getContext("2d");
    selectionCtx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );

    // Reset selection state
    setHasSelection(false);
  };

  const handleMouseDown = (e) => {
    // Allow new selections even if mask is applied when in multi-select mode
    if (isMaskApplied && !multiSelectMode) return;

    setIsSelecting(true);
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setEndPoint({ x, y });
    setErrorMessage("");

    // Clear previous selection
    const selectionCtx = selectionRef.current.getContext("2d");
    selectionCtx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );
  };

  const handleMouseMove = (e) => {
    if (isSelecting) {
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

      // Draw selection rectangle
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

    // Check if selection is valid
    const selectionWidth = Math.abs(endPoint.x - startPoint.x);
    const selectionHeight = Math.abs(endPoint.y - startPoint.y);

    if (selectionWidth > 20 && selectionHeight > 20) {
      setHasSelection(true);
    } else {
      setErrorMessage(
        "Selection too small. Please draw a larger rectangle (at least 20x20 pixels)."
      );
      // Clear the selection
      const selectionCtx = selectionRef.current.getContext("2d");
      selectionCtx.clearRect(
        0,
        0,
        selectionRef.current.width,
        selectionRef.current.height
      );
    }
  };

  const resetSelection = () => {
    // Clear selection and mask
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

    setHasSelection(false);
    setIsMaskApplied(false);
    setErrorMessage("");
    setMultiSelectMode(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: imageDimensions.width, height: imageDimensions.height }}
      >
        {!isOpenCVReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-75 z-50">
            <p className="text-gray-800 font-medium">Loading OpenCV.js...</p>
          </div>
        )}

        {/* Base canvas for the image */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 z-10"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            cursor: isMaskApplied && !multiSelectMode ? "default" : "crosshair",
          }}
        />

        {/* Canvas for the selection rectangle */}
        <canvas
          ref={selectionRef}
          className="absolute top-0 left-0 pointer-events-none z-20"
        />

        {/* Canvas for the mask */}
        <canvas
          ref={maskCanvasRef}
          className="absolute top-0 left-0 pointer-events-none z-30"
        />
      </div>

      {errorMessage && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 flex space-x-4">
        <button
          className="btn btn-blue"
          onClick={handleGrabCut}
          disabled={!hasSelection || !isOpenCVReady}
        >
          Apply GrabCut
        </button>

        <button
          className="btn btn-green"
          onClick={resetSelection}
          disabled={!hasSelection && !isMaskApplied && !errorMessage}
        >
          Reset All
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        {!hasSelection && !isMaskApplied && !errorMessage && (
          <p>Draw a rectangle around the object you want to extract</p>
        )}
        {hasSelection && !errorMessage && (
          <p>Click "Apply GrabCut" to segment the selected area</p>
        )}
        {isMaskApplied && multiSelectMode && !hasSelection && !errorMessage && (
          <p>
            Draw another rectangle to add to the mask, or click Reset All to
            start over
          </p>
        )}
      </div>

      {isOpenCVReady && (
        <div className="mt-4 text-xs text-gray-500">
          <p>OpenCV.js is loaded and ready to use.</p>
        </div>
      )}
    </div>
  );
}
