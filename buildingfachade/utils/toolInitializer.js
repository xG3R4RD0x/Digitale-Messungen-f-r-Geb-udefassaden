import GrabCutComponent from "../components/GrabCutComponent";
import MagicWandComponent from "../components/MagicWandComponent";

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

// Add this new function for Magic Wand tool
export const initMagicWandTool = (props) => {
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

  const magicWandTool = MagicWandComponent({
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
    mode: mode?.toLowerCase(),
  });

  return magicWandTool;
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
    case "magic_wand":
      return initMagicWandTool(props);
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
