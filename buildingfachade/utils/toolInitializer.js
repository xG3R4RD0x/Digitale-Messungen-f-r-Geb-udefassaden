import GrabCutComponent from "../components/GrabCutComponent";

/**
 * Inicializa la herramienta GrabCut
 * @param {Object} props - Propiedades necesarias para la herramienta
 * @returns {Object} - La interfaz de la herramienta inicializada
 */
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
    updatePreview, // Pasamos la función para actualizar la vista previa
    mode: mode?.toLowerCase(),
  });

  return grabCutTool;
};

/**
 * Inicializa la herramienta correspondiente según el tipo
 * @param {string} toolType - Tipo de herramienta a inicializar (ej: 'grabcut', 'magic_wand')
 * @param {Object} props - Propiedades necesarias para la herramienta
 * @returns {Object|null} - La interfaz de la herramienta inicializada o null si no se encuentra
 */
export const initializeTool = (toolType, props) => {
  // Validar parámetros
  if (!toolType || !props) return null;

  // Limpiar botones contextuales al inicializar una nueva herramienta
  if (props.registerToolButtons) {
    props.registerToolButtons([]);
  }

  // Inicializar la herramienta correspondiente
  switch (toolType.toLowerCase()) {
    case "grabcut":
      return initGrabCutTool(props);
    // Aquí se pueden agregar más herramientas en el futuro
    default:
      console.warn(`Herramienta no implementada: ${toolType}`);
      return null;
  }
};

/**
 * Obtiene las propiedades de cursor para una herramienta
 * @param {Object} tool - Herramienta inicializada
 * @param {boolean} hasSelection - Si hay una selección activa
 * @param {boolean} isMaskApplied - Si hay una máscara aplicada
 * @returns {string} - El estilo de cursor a utilizar
 */
export const getToolCursor = (tool, hasSelection, isMaskApplied) => {
  // Si la herramienta define su propio cursor, usarlo
  if (tool?.cursor) {
    return tool.cursor;
  }

  // Usar crosshair por defecto para herramientas de selección
  return "crosshair";
};
