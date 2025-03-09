import { useEffect, useRef, useState } from "react";
import { useOpenCV } from "../contexts/OpenCVContext";
import { initializeTool, getToolCursor } from "../utils/toolInitializer";

// Constants
const TOOLS = { GRABCUT: "grabcut", MAGIC_WAND: "magic_wand" };
const MODES = { ADD: "add", SUBTRACT: "subtract" };

export default function ImageMask({ imageUrl, instanceId }) {
  // DOM and canvas references
  const canvasRefs = {
    main: useRef(null), // Original canvas
    mask: useRef(null), // Mask canvas
    selection: useRef(null), // Temporary selection canvas
    preview: useRef(null), // Preview canvas
  };

  const overlayRef = useRef(null); // Overlay reference

  // Application core state
  const { isOpenCVReady } = useOpenCV();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState(TOOLS.GRABCUT);
  const [mode, setMode] = useState(MODES.ADD);
  const [cursor, setCursor] = useState("default");

  // Selection and mask state
  const [selection, setSelection] = useState({
    active: false, // If selection is active
    isSelecting: false, // If in selection process
    start: { x: 0, y: 0 }, // Start point
    end: { x: 0, y: 0 }, // End point
  });

  const [hasMask, setHasMask] = useState(false); // If mask is applied
  const [maskData, setMaskData] = useState(null); // Mask data for persistence

  // UI states
  const [error, setError] = useState("");
  const [buttons, setButtons] = useState([]);
  const [activeTool, setActiveTool] = useState(null);

  // ========== INITIALIZATION AND LOADING ==========

  // Load image
  useEffect(() => {
    if (!imageUrl) return;

    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Calculate dimensions while maintaining aspect ratio
      const maxWidth = window.innerWidth * 0.35;
      const maxHeight = window.innerHeight * 0.7;

      let { width, height } = image;
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width *= scale;
        height *= scale;
      }

      // Update dimensions
      setDimensions({ width, height });

      // Initialize all canvases
      Object.values(canvasRefs).forEach((ref) => {
        if (ref.current) {
          ref.current.width = width;
          ref.current.height = height;

          // Draw the image on the main and preview canvases
          if (ref === canvasRefs.main || ref === canvasRefs.preview) {
            const ctx = ref.current.getContext("2d");
            ctx.drawImage(image, 0, 0, width, height);
          }
        }
      });

      // Reset states
      resetState(false);
    };
  }, [imageUrl]);

  // Initialize tool when selection or OpenCV state changes
  useEffect(() => {
    if (tool && isOpenCVReady) {
      // Clear previous buttons
      setButtons([]);

      if (tool === TOOLS.MAGIC_WAND || !window.magicWandPreloaded) {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/gh/Tamersoul/magic-wand-js@master/magic-wand.js";
        script.async = true;
        script.id = "magic-wand-preload";
        document.body.appendChild(script);
        window.magicWandPreloaded = true;
      }

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

  // Update buttons when selection changes
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

  // Update overlay visibility when hasMask changes
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.style.display = hasMask ? "none" : "flex";
    }

    // If we have a mask, update the preview
    if (hasMask && canvasRefs.mask.current && !selection.isSelecting) {
      const ctx = canvasRefs.mask.current.getContext("2d");
      const mask = ctx.getImageData(
        0,
        0,
        canvasRefs.mask.current.width,
        canvasRefs.mask.current.height
      );

      // Save mask data for persistence
      setMaskData(mask);

      // Apply to preview
      applyMaskToPreview(true);
    }
  }, [hasMask]);

  // ========== MASK AND PREVIEW FUNCTIONS ==========

  // Apply mask to preview
  function applyMaskToPreview(force = false) {
    const { main, mask, preview } = canvasRefs;
    if (!preview.current || !mask.current || !main.current) return;

    const previewCtx = preview.current.getContext("2d");
    const width = preview.current.width;
    const height = preview.current.height;

    // Draw original image
    const originalCtx = main.current.getContext("2d");
    const originalImage = originalCtx.getImageData(0, 0, width, height);
    previewCtx.putImageData(originalImage, 0, 0);

    // Get current mask
    const maskCtx = mask.current.getContext("2d");
    const maskImage = maskCtx.getImageData(0, 0, width, height);

    // Check if mask exists
    let pixelsFound = false;

    if (hasMask || force) {
      // Apply effects
      const previewImage = previewCtx.getImageData(0, 0, width, height);

      for (let i = 0; i < previewImage.data.length; i += 4) {
        if (maskImage.data[i + 3] > 0) {
          pixelsFound = true;

          previewImage.data[i] *= 0.8; // R
          previewImage.data[i + 1] *= 0.8; // G
          previewImage.data[i + 2] = Math.min(
            255,
            previewImage.data[i + 2] * 1.2
          ); // B
        } else {
          previewImage.data[i + 3] = 100; // Alpha
        }
      }

      previewCtx.putImageData(previewImage, 0, 0);

      // Update state if necessary - important to maintain hasMask true if pixels found
      if (pixelsFound !== hasMask) {
        setHasMask(pixelsFound);
      } else if (pixelsFound) {
        // Ensure mask is recognized even if state hasn't changed
        setHasMask(true);
      }

      // Always update overlay based on pixels found
      if (overlayRef.current) {
        overlayRef.current.style.display = pixelsFound ? "none" : "flex";
      }
    }
  }

  // Restore saved mask when changing tools or when maskData changes
  useEffect(() => {
    if (maskData && canvasRefs.mask.current) {
      const maskCtx = canvasRefs.mask.current.getContext("2d");

      maskCtx.putImageData(maskData, 0, 0);

      if (hasMask) {
        // Force update of preview to ensure mask is visible
        setTimeout(() => applyMaskToPreview(true), 50);

        // Hide overlay
        if (overlayRef.current) {
          overlayRef.current.style.display = "none";
        }
      }
    }
  }, [tool, maskData]);

  // ========== EVENT HANDLERS ==========

  const changeTool = (newTool) => {
    if (tool === newTool) return;

    if (canvasRefs.mask.current) {
      const maskCtx = canvasRefs.mask.current.getContext("2d");
      const currentMaskData = maskCtx.getImageData(
        0,
        0,
        canvasRefs.mask.current.width,
        canvasRefs.mask.current.height
      );
      setMaskData(currentMaskData);
    }

    // Clear selection but keep mask
    resetSelectionOnly();
    setTool(newTool);

    // Force mask states to be maintained
    if (hasMask && overlayRef.current) {
      overlayRef.current.style.display = "none";
    }
  };

  // Mode change
  const toggleMode = () => {
    setMode(mode === MODES.ADD ? MODES.SUBTRACT : MODES.ADD);
  };

  // Reset only selection
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

  // Complete reset
  const resetAll = () => {
    // Clear canvases
    [canvasRefs.selection, canvasRefs.mask].forEach((ref) => {
      if (ref.current) {
        const ctx = ref.current.getContext("2d");
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      }
    });

    // Restore original image to preview
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

    // Reset states
    resetState(false);
  };

  // Initialize/reset states
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

  // ========== MOUSE HANDLERS ==========

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

  // Download the masked image - Modified to extract segmented object only
  const downloadMaskedImage = () => {
    if (!hasMask || !canvasRefs.main.current || !canvasRefs.mask.current)
      return;

    try {
      // Create a temporary canvas for the segmented image
      const tempCanvas = document.createElement("canvas");
      const width = canvasRefs.main.current.width;
      const height = canvasRefs.main.current.height;
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");

      // Get original image data
      const mainCtx = canvasRefs.main.current.getContext("2d");
      const originalImage = mainCtx.getImageData(0, 0, width, height);

      // Get mask data
      const maskCtx = canvasRefs.mask.current.getContext("2d");
      const maskImage = maskCtx.getImageData(0, 0, width, height);

      // Create a new ImageData with transparent background
      const segmentedImage = tempCtx.createImageData(width, height);

      // Copy only pixels where the mask exists
      for (let i = 0; i < originalImage.data.length; i += 4) {
        if (maskImage.data[i + 3] > 0) {
          // Copy RGB values from original image
          segmentedImage.data[i] = originalImage.data[i]; // R
          segmentedImage.data[i + 1] = originalImage.data[i + 1]; // G
          segmentedImage.data[i + 2] = originalImage.data[i + 2]; // B
          segmentedImage.data[i + 3] = 255; // A (fully opaque)
        } else {
          // Set transparent pixels
          segmentedImage.data[i + 3] = 0; // A (transparent)
        }
      }

      // Put the segmented image on the canvas
      tempCtx.putImageData(segmentedImage, 0, 0);

      // Convert canvas to blob
      tempCanvas.toBlob((blob) => {
        // Create a download link and trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `segmented_${new Date().getTime()}.png`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        setError("Segmented image downloaded successfully!");

        // Clear error message after 3 seconds
        setTimeout(() => {
          setError("");
        }, 3000);
      }, "image/png");
    } catch (err) {
      setError(`Error downloading segmented image: ${err.message}`);
    }
  };

  // ========== RENDERING ==========

  return (
    <div className="w-full flex flex-col items-center p-4">
      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* OpenCV loading indicator */}
      {!isOpenCVReady && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          Loading OpenCV.js... Please wait.
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-wrap justify-center lg:justify-between gap-6">
        {/* Editor panel */}
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden flex">
          {/* Toolbar */}
          <div className="bg-gray-100 p-2 flex flex-col gap-2 justify-start rounded-l-lg">
            {/* GrabCut tool */}
            <button
              className={`w-full p-2 rounded ${
                tool === TOOLS.GRABCUT
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300"
              }`}
              onClick={() => changeTool(TOOLS.GRABCUT)}
              disabled={!isOpenCVReady}
              title="GrabCut - Rectangular selection"
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="grabcut">
                  📦
                </span>
              </div>
            </button>

            {/* Magic Wand tool */}
            <button
              className={`w-full p-2 rounded ${
                tool === TOOLS.MAGIC_WAND
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-300"
              }`}
              onClick={() => changeTool(TOOLS.MAGIC_WAND)}
              title="Magic Wand - Select areas with similar color by clicking"
              disabled={!isOpenCVReady}
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="magic-wand">
                  ✨
                </span>
              </div>
            </button>

            {/* Separator */}
            <div className="border-t border-gray-300 my-2"></div>

            {/* Mode button */}
            <button
              className={`w-full p-2 rounded ${
                mode === MODES.ADD
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
              onClick={toggleMode}
              title={
                mode === MODES.ADD
                  ? "Mode: Add selection"
                  : "Mode: Remove selection"
              }
            >
              <div className="flex justify-center items-center">
                <span>{mode === MODES.ADD ? "+" : "-"}</span>
              </div>
            </button>

            {/* Reset button */}
            <button
              className="w-full p-2 rounded bg-gray-500 text-white mt-auto"
              onClick={resetAll}
              disabled={!hasMask && !selection.active}
              title="Reset all"
            >
              <div className="flex justify-center items-center">
                <span role="img" aria-label="reset">
                  🔄
                </span>
              </div>
            </button>
          </div>

          {/* Editing area */}
          <div className="relative">
            <div className="bg-gray-50 py-2 px-4 border-b">
              <h3 className="text-lg font-medium text-gray-700 text-center">
                Editor
              </h3>
            </div>

            {/* Canvas area */}
            <div
              className="relative"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
              }}
            >
              {/* Loading overlay */}
              {!isOpenCVReady && (
                <div className="absolute inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center z-50">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-2"></div>
                    <span className="text-gray-800 font-medium">
                      Loading OpenCV.js...
                    </span>
                  </div>
                </div>
              )}

              {/* Canvas layers */}
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

            {/* Contextual buttons */}
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

        {/* Preview panel */}
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-50 py-2 px-4 border-b">
            <h3 className="text-lg font-medium text-gray-700 text-center">
              Preview
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

            {/* Overlay message */}
            <div
              ref={overlayRef}
              className="absolute inset-0 flex items-center justify-center text-center p-4 bg-gray-50 bg-opacity-80"
              style={{ display: hasMask ? "none" : "flex" }}
            >
              <p className="text-gray-600 max-w-xs">
                {tool === TOOLS.GRABCUT
                  ? "Draw a rectangle around the object you want to segment"
                  : tool === TOOLS.MAGIC_WAND
                  ? "Click on an area with similar color to select it. Adjust tolerance using + and - buttons"
                  : "Select a tool to segment the image"}
              </p>
            </div>
          </div>
          {/* Mode indicator */}
          <div className="bg-gray-50 py-2 px-4 border-t">
            <div className="flex justify-between items-center">
              <span
                className={`px-3 py-1 text-sm rounded-full ${
                  mode === MODES.ADD
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                Mode: {mode === MODES.ADD ? "Add" : "Remove"}
              </span>

              {/* Download button */}
              <button
                onClick={downloadMaskedImage}
                disabled={!hasMask}
                className={`ml-2 px-3 py-1 text-sm rounded-full bg-blue-500 hover:bg-blue-700 text-white flex items-center ${
                  !hasMask ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Download image with mask applied"
              >
                <span role="img" aria-label="download">
                  ⬇️ Download
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
