import React from "react";

/**
 * Magic Wand Component - Color-based image segmentation
 * This component provides a tool to select areas with similar color by clicking
 */
export default function MagicWandComponent(props) {
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
    isOpenCVReady,
    updatePreview,
    mode,
  } = props;

  // Default settings for the Magic Wand
  let tolerance = 1; // Aumentado el valor predeterminado para mejor usabilidad
  const colorSpace = "RGB"; // Default color space

  // Always use pointer cursor for this tool
  const cursor = "pointer";

  // Initialize the tool
  const initTool = () => {
    // Initialize MagicWand functionality directly (no external script needed)
    initMagicWandFunctionality();
    registerContextButtons();

    return {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      cursor,
    };
  };

  // Initialize Magic Wand functionality directly in our code
  const initMagicWandFunctionality = () => {
    // Only initialize once
    if (window.MagicWand) return;

    // Create MagicWand namespace
    window.MagicWand = {};

    // Implementation of Magic Wand functionality
    // Based on simplified version of magic-wand-js

    // Function to perform flood fill based on color similarity
    window.MagicWand.floodFill = (imageData, x, y, tolerance) => {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;

      // Create mask array for result
      const mask = new Uint8Array(width * height);

      // Check if point is inside image bounds
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return mask;
      }

      // Get target color at seed point
      const targetPos = (y * width + x) * 4;
      const targetR = data[targetPos];
      const targetG = data[targetPos + 1];
      const targetB = data[targetPos + 2];

      // Queue for flood fill algorithm
      const queue = [];
      queue.push(y * width + x); // Store pixel position as 1D index

      // Process queue using BFS (breadth-first search)
      while (queue.length > 0) {
        const pos = queue.shift();
        const px = pos % width;
        const py = Math.floor(pos / width);
        const dataPos = pos * 4;

        // Skip if already processed
        if (mask[pos]) continue;

        // Check color similarity
        const r = data[dataPos];
        const g = data[dataPos + 1];
        const b = data[dataPos + 2];

        const colorDiff = Math.sqrt(
          Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
        );

        // If color is within tolerance, add to mask
        if (colorDiff <= tolerance) {
          mask[pos] = 1;

          // Add 4-connected neighbors to queue
          if (px > 0 && !mask[pos - 1]) queue.push(pos - 1); // Left
          if (px < width - 1 && !mask[pos + 1]) queue.push(pos + 1); // Right
          if (py > 0 && !mask[pos - width]) queue.push(pos - width); // Up
          if (py < height - 1 && !mask[pos + width]) queue.push(pos + width); // Down
        }
      }

      return mask;
    };

    // Function to trace the outline of a selection
    window.MagicWand.traceSelection = (imageData, mask) => {
      const width = imageData.width;
      const height = imageData.height;
      const points = [];

      // Find boundary points (simple version)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pos = y * width + x;

          if (!mask[pos]) continue;

          // Check if this pixel is on the boundary
          const isOnBoundary =
            x === 0 ||
            !mask[pos - 1] || // Left edge
            x === width - 1 ||
            !mask[pos + 1] || // Right edge
            y === 0 ||
            !mask[pos - width] || // Top edge
            y === height - 1 ||
            !mask[pos + width]; // Bottom edge

          if (isOnBoundary) {
            points.push({ x, y });
          }
        }
      }

      // Order the points to form a connected boundary
      if (points.length > 0) {
        // Simple approach: just return boundary points
        // For a real implementation, you'd want to order them properly
        return points;
      }

      return [];
    };

    console.log("Magic Wand functionality initialized");
  };

  // ======== INTERACTION FUNCTIONS ========

  // Register contextual buttons for the tool
  const registerContextButtons = () => {
    // Register tolerance control buttons
    registerToolButtons([
      {
        label: "Less Tolerance",
        icon: "-",
        title: "Decrease selection tolerance",
        className: "bg-blue-500 text-white",
        onClick: () => adjustTolerance(-5),
      },
      {
        label: `${tolerance}`,
        title: "Current tolerance value",
        className: "bg-gray-200 text-black",
        onClick: () => {}, // No action
      },
      {
        label: "More Tolerance",
        icon: "+",
        title: "Increase selection tolerance",
        className: "bg-blue-500 text-white",
        onClick: () => adjustTolerance(5),
      },
    ]);
  };

  // Adjust the magic wand tolerance
  const adjustTolerance = (amount) => {
    tolerance = Math.max(1, Math.min(100, tolerance + amount));

    // Update buttons with new tolerance
    registerContextButtons();
  };

  // Process the Magic Wand selection at given coordinates
  const processMagicWand = (x, y) => {
    try {
      console.log(
        "Processing Magic Wand selection at:",
        x,
        y,
        "with tolerance:",
        tolerance
      );

      // Get image data from canvas
      const ctx = canvasRef.current.getContext("2d");
      const imageData = ctx.getImageData(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      // Process the selection with Magic Wand
      const mask = window.MagicWand.floodFill(imageData, x, y, tolerance);
      const selection = window.MagicWand.traceSelection(imageData, mask);

      if (!mask || !selection || selection.length === 0) {
        setErrorMessage(
          "No area selected. Try adjusting the tolerance or selecting a different area."
        );
        return;
      }

      console.log(`Selection created with ${selection.length} boundary points`);

      // Aplicar a la máscara primero
      applyToMask(mask);

      // Mostrar el contorno temporalmente por 500ms y luego limpiarlo
      // para que solo quede la máscara consistente
      drawSelection(selection);
      setTimeout(() => {
        // Limpiar la selección para que solo se vea en la máscara
        if (selectionRef.current) {
          const ctx = selectionRef.current.getContext("2d");
          ctx.clearRect(
            0,
            0,
            selectionRef.current.width,
            selectionRef.current.height
          );
        }
      }, 500);

      // Update preview
      updatePreview(true);

      // Set selection state
      setHasSelection(true);
    } catch (error) {
      console.error("Error in Magic Wand processing:", error);
      setErrorMessage(`Magic Wand error: ${error.message || "Unknown error"}`);
    }
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    // Clear any previous selection visualization
    const ctx = selectionRef.current.getContext("2d");
    ctx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );

    // Get click coordinates
    const rect = e.target.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Process magic wand selection
    processMagicWand(x, y);

    // Return the point for consistency with other tools
    return { x, y };
  };

  // Not used much for Magic Wand
  const handleMouseMove = (e, isSelecting, start) => {
    // No action needed on mouse move
    return null;
  };

  // Not used much for Magic Wand
  const handleMouseUp = (end, start) => {
    // Selection is already processed on click
    return true;
  };

  // Draw selection outline - Usando color rojo consistentemente
  const drawSelection = (selection) => {
    const ctx = selectionRef.current.getContext("2d");

    // Limpiar completamente el canvas de selección
    ctx.clearRect(
      0,
      0,
      selectionRef.current.width,
      selectionRef.current.height
    );

    // Si no hay puntos, no hacemos nada más
    if (!selection || selection.length === 0) return;

    // Configurar el estilo gráfico para el contorno
    ctx.strokeStyle = "red"; // ROJO siempre
    ctx.lineWidth = 2;
    ctx.setLineDash([]); // Línea sólida, no punteada

    // Dibujar el contorno
    ctx.beginPath();
    for (let i = 0; i < selection.length; i++) {
      const point = selection[i];
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.closePath();

    // Rellenar con color semitransparente
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)"; // Rojo semitransparente
    ctx.fill();

    // Dibujar el contorno
    ctx.stroke();

    console.log("Selection drawn with RED color");
  };

  // Apply the selection to mask - Mejorado para preservar selecciones previas
  const applyToMask = (mask) => {
    if (!mask || !maskCanvasRef.current) return;

    const ctx = maskCanvasRef.current.getContext("2d");
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Obtener los datos actuales de la máscara
    const imageData = ctx.getImageData(0, 0, width, height);
    const isAddMode = mode === "add" || !mode;

    console.log(`Applying mask in ${isAddMode ? "ADD" : "SUBTRACT"} mode`);

    // Aplicar la máscara
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = y * width + x; // Posición en la máscara
        const dataPos = pos * 4; // Posición en los datos de imagen (RGBA)

        if (mask[pos]) {
          // Si este pixel está en la selección
          if (isAddMode) {
            // Modo ADD - Pintar rojo con transparencia fija constante
            imageData.data[dataPos] = 255; // R
            imageData.data[dataPos + 1] = 0; // G
            imageData.data[dataPos + 2] = 0; // B
            imageData.data[dataPos + 3] = 150; // A (valor constante para mejor visibilidad)
          } else {
            // Modo SUBTRACT - Hacer transparente completamente
            imageData.data[dataPos + 3] = 0; // A (transparente)
          }
        }
      }
    }

    // Colocar los datos de vuelta en el canvas
    ctx.putImageData(imageData, 0, 0);

    // Notificar que se ha aplicado una máscara
    setIsMaskApplied(true);
  };

  // Public interface
  return {
    initTool,
    handleMagicWand: processMagicWand,
    registerButtons: registerContextButtons,
    cursor,
  };
}
