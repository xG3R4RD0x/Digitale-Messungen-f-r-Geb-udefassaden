import GrabCutComponent from "../components/GrabCutComponent";

export const initGrabCutTool = (props) => {
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

  const grabCutTool = GrabCutComponent({
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
    updatePreview, // Pass the function to update the preview
    mode: mode?.toLowerCase(),
  });

  return grabCutTool;
};

export const initializeTool = (toolType, props) => {
  // Validate parameters
  if (!toolType || !props) return null;

  // Clear contextual buttons when initializing a new tool
  if (props.registerToolButtons) {
    props.registerToolButtons([]);
  }

  // Initialize the corresponding tool
  switch (toolType.toLowerCase()) {
    case "grabcut":
      return initGrabCutTool(props);
    // More tools can be added here in the future
    default:
      console.warn(`Tool not implemented: ${toolType}`);
      return null;
  }
};

export const getToolCursor = (tool, hasSelection, isMaskApplied) => {
  // If the tool defines its own cursor, use it
  if (tool?.cursor) {
    return tool.cursor;
  }

  return "crosshair";
};
