/**
 * GrabCut Component - Image segmentation using GrabCut algorithm
 * This component provides a rectangular selection tool to extract objects from images
 */
export default function GrabCutComponent(props) {
  const {
    canvasRef,
    maskCanvasRef,
    selectionRef,
    registerToolButtons,
    setErrorMessage,
    resetSelectionOnly,
    hasSelection,
    setHasSelection,
    setIsMaskApplied,
    startPoint,
    endPoint,
    isOpenCVReady,
    updatePreview,
    mode,
  } = props;

  // Always use crosshair cursor for this tool
  const cursor = "crosshair";

  // Initialize the tool
  const initTool = () => {
    registerContextButtons();
    return {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      cursor,
    };
  };

  // ======== INTERACTION FUNCTIONS ========

  // Register contextual buttons for the tool
  const registerContextButtons = () => {
    if (hasSelection) {
      registerToolButtons([
        {
          label: "Apply GrabCut",
          icon: "✓",
          title: "Apply GrabCut to the selection",
          className: "bg-purple-500 text-white ml-auto",
          onClick: processGrabCut,
        },
      ]);
    } else {
      registerToolButtons([]);
    }
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    const rect = e.target.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Clear previous selection
    const ctx = selectionRef.current.getContext("2d");
    ctx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );

    return point;
  };

  const handleMouseMove = (e, isSelecting, start) => {
    if (!isSelecting) return null;

    const rect = e.target.getBoundingClientRect();
    const end = {
      x: Math.max(0, Math.min(e.clientX - rect.left, canvasRef.current.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, canvasRef.current.height)),
    };

    // Draw selection rectangle
    drawSelectionRect(start, end);
    return end;
  };

  const handleMouseUp = (end, start) => {
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    // Verify minimum selection size
    if (width > 20 && height > 20) {
      setHasSelection(true);
      return true;
    } else {
      setErrorMessage(
        "Selection too small. Please draw a larger rectangle (minimum 20x20 pixels)."
      );
      clearSelection();
      return false;
    }
  };

  // ======== HELPER FUNCTIONS ========

  // Draw selection rectangle
  const drawSelectionRect = (start, end) => {
    const ctx = selectionRef.current.getContext("2d");
    ctx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  };

  // Clear selection
  const clearSelection = () => {
    const ctx = selectionRef.current.getContext("2d");
    ctx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );
  };

  // ======== GRABCUT PROCESSING ========

  // Process selection with GrabCut algorithm
  const processGrabCut = () => {
    setErrorMessage("");

    // Initial validations
    if (!validateEnvironment()) return;
    if (!validateSelection()) return;

    let src, mask, bgdModel, fgdModel;

    try {
      const cv = window.cv;

      // Read image from canvas
      src = cv.imread(canvasRef.current);
      if (!src || src.empty()) {
        throw new Error("Error reading image from canvas");
      }

      // Initialize matrices
      [mask, bgdModel, fgdModel] = initializeMatrices(src);

      // Create selection rectangle
      const rect = createSelectionRect();

      // Validate position
      if (!validateRectPosition(rect, src)) {
        throw new Error("Selection rectangle is outside image boundaries");
      }

      // Apply GrabCut algorithm
      cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
      cv.grabCut(src, mask, rect, bgdModel, fgdModel, 3, cv.GC_INIT_WITH_RECT);

      // Create resulting mask
      const maskData = extractMaskData(mask, cv);

      // Apply mask
      applyMaskToCanvas(maskData);

      // Clean up selection and update preview
      resetSelectionOnly();
      setTimeout(() => updatePreview(true), 0);
    } catch (error) {
      console.error("Error in GrabCut operation:", error);
      setErrorMessage(
        `Error: ${error.message || "Unknown error processing the image"}`
      );
    } finally {
      // Release resources
      cleanupResources([src, mask, bgdModel, fgdModel]);
    }
  };

  // Validate OpenCV environment
  const validateEnvironment = () => {
    if (!isOpenCVReady) {
      setErrorMessage("OpenCV is not ready. Please wait.");
      return false;
    }

    if (!window.cv) {
      setErrorMessage("OpenCV library not found. Try refreshing the page.");
      return false;
    }

    return true;
  };

  // Validate selection dimensions
  const validateSelection = () => {
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    if (width < 20 || height < 20) {
      setErrorMessage(
        "Selection too small. Please draw a larger rectangle (minimum 20x20 pixels)."
      );
      return false;
    }

    return true;
  };

  // Initialize matrices for GrabCut
  const initializeMatrices = (src) => {
    const cv = window.cv;

    // Create matrices
    const mask = new cv.Mat();
    const bgdModel = new cv.Mat();
    const fgdModel = new cv.Mat();

    // Initialize with correct sizes
    mask.create(src.rows, src.cols, cv.CV_8UC1);
    mask.setTo(new cv.Scalar(0));

    bgdModel.create(1, 65, cv.CV_64FC1);
    bgdModel.setTo(new cv.Scalar(0));

    fgdModel.create(1, 65, cv.CV_64FC1);
    fgdModel.setTo(new cv.Scalar(0));

    return [mask, bgdModel, fgdModel];
  };

  // Create selection rectangle
  const createSelectionRect = () => {
    const cv = window.cv;
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    return new cv.Rect(x, y, width, height);
  };

  // Validate rectangle position
  const validateRectPosition = (rect, src) => {
    return !(
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.width > src.cols ||
      rect.y + rect.height > src.rows
    );
  };

  // Extract mask data
  const extractMaskData = (mask, cv) => {
    const maskData = new Uint8Array(mask.rows * mask.cols);

    for (let i = 0; i < mask.rows; i++) {
      for (let j = 0; j < mask.cols; j++) {
        const pixelValue = mask.ucharPtr(i, j)[0];
        if (pixelValue === cv.GC_FGD || pixelValue === cv.GC_PR_FGD) {
          maskData[i * mask.cols + j] = 1;
        }
      }
    }

    return maskData;
  };

  // Apply mask to canvas - Updated to match Magic Wand's consistency
  const applyMaskToCanvas = (maskData) => {
    const ctx = maskCanvasRef.current.getContext("2d");
    const imageData = ctx.getImageData(
      0,
      0,
      maskCanvasRef.current.width,
      maskCanvasRef.current.height
    );

    const isAddMode = mode === "add" || !mode;

    for (let i = 0; i < maskData.length; i++) {
      if (!maskData[i]) continue;

      const pos = i * 4;
      if (isAddMode) {
        // Add mode - Semi-transparent red color con valor fijo
        imageData.data[pos] = 255; // R
        imageData.data[pos + 1] = 0; // G
        imageData.data[pos + 2] = 0; // B
        imageData.data[pos + 3] = 150; // A (mismo valor que en Magic Wand)
      } else {
        // Subtract mode - Make transparent
        imageData.data[pos + 3] = 0; // A (transparente)
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setIsMaskApplied(true);
  };

  // Release OpenCV resources
  const cleanupResources = (resources) => {
    if (!window.cv) return;

    resources.forEach((resource) => {
      if (resource) {
        try {
          resource.delete();
        } catch (e) {
          console.error("Error releasing resource:", e);
        }
      }
    });
  };

  // Public interface
  return {
    initTool,
    handleGrabCut: processGrabCut,
    registerButtons: registerContextButtons,
    cursor,
  };
}
