// Eliminamos el uso de useState y cualquier otro Hook

// GrabCut tool module to be used with ImageMask container
export default function GrabCutComponent({
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
}) {
  // Process the selection with GrabCut algorithm
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

    let src, mask, bgdModel, fgdModel;

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
      src = cv.imread(canvasRef.current);

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
      mask = new cv.Mat();
      bgdModel = new cv.Mat();
      fgdModel = new cv.Mat();

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

      // Apply mask to canvas
      applyMask(maskData);

      console.log("GrabCut processing completed successfully.");

      // Reset selection state but keep mask visible
      resetSelectionOnly();

      // Forzar actualización de la vista previa con flag para indicar que es la primera aplicación
      if (updatePreview) {
        // Esperamos a que se complete la actualización de la máscara antes de actualizar la vista previa
        setTimeout(() => {
          updatePreview(true); // Pasar true para indicar que acaba de aplicarse una máscara
        }, 0);
      }
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
          if (src) src.delete();
          if (mask) mask.delete();
          if (bgdModel) bgdModel.delete();
          if (fgdModel) fgdModel.delete();
        }
      } catch (e) {
        console.error("Error during cleanup:", e);
      }
    }
  };

  // Apply mask to canvas using the current mode (add/subtract)
  const applyMask = (maskData) => {
    const maskCtx = maskCanvasRef.current.getContext("2d");

    // Obtener la imagen de datos actual para trabajar con ella
    const currentImageData = maskCtx.getImageData(
      0,
      0,
      maskCanvasRef.current.width,
      maskCanvasRef.current.height
    );

    for (let i = 0; i < maskData.length; i++) {
      const pos = i * 4;

      // Si estamos en modo ADD o no hay modo especificado y el pixel está seleccionado
      if ((mode === "add" || !mode) && maskData[i]) {
        currentImageData.data[pos] = 255; // R
        currentImageData.data[pos + 1] = 0; // G
        currentImageData.data[pos + 2] = 0; // B
        currentImageData.data[pos + 3] = 128; // A (semi-transparente)
      }
      // Si estamos en modo SUBTRACT y el pixel está seleccionado, lo hacemos transparente
      else if (mode === "subtract" && maskData[i]) {
        currentImageData.data[pos + 3] = 0; // A (transparente)
      }
    }

    maskCtx.putImageData(currentImageData, 0, 0);
    setIsMaskApplied(true);
  };

  // Event handlers for mouse interaction
  const handleMouseDown = (e) => {
    // Siempre permitir selecciones, incluso si ya hay una máscara
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Clear previous selection
    const selectionCtx = selectionRef.current.getContext("2d");
    selectionCtx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );

    return { x, y };
  };

  const handleMouseMove = (e, isSelecting, startPoint) => {
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

      return newEndPoint;
    }
    return null;
  };

  const handleMouseUp = (endPoint, startPoint) => {
    // Check if selection is valid
    const selectionWidth = Math.abs(endPoint.x - startPoint.x);
    const selectionHeight = Math.abs(endPoint.y - startPoint.y);

    if (selectionWidth > 20 && selectionHeight > 20) {
      setHasSelection(true);
      return true;
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
      return false;
    }
  };

  // Register contextual button for GrabCut application
  const registerButtons = () => {
    if (hasSelection) {
      registerToolButtons([
        {
          label: "Apply GrabCut",
          icon: "✓",
          title: "Apply GrabCut to the selection",
          className: "bg-purple-500 text-white ml-auto",
          onClick: handleGrabCut,
        },
      ]);
    } else {
      registerToolButtons([]);
    }
  };

  // Define preferred cursor - Modificamos la lógica para permitir selecciones múltiples
  const cursor = "crosshair"; // Siempre usar crosshair para permitir selecciones múltiples

  // Initialize tool when selected
  const initTool = () => {
    registerButtons();
    return {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      cursor,
    };
  };

  return {
    initTool,
    handleGrabCut,
    registerButtons,
    cursor,
  };
}
