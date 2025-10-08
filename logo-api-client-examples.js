/**
 * Logo Maker API - Client-Side Usage Examples
 * 
 * This file contains practical examples of how to use the logo creation API
 * from client-side applications (React, Vue, Angular, vanilla JS, etc.)
 * 
 * Base URL: http://localhost:3000/api
 */

// ==============================================
// BASIC USAGE EXAMPLES
// ==============================================

/**
 * Example 1: Simple Text Logo
 * Perfect for beginners and basic logo creation
 */
const simpleTextLogo = {
  name: "My Company Logo",
  description: "A clean, simple text-based logo",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "solid",
      solidColor: "#ffffff"
    }
  },
  layers: [
    {
      type: "text",
      visible: true,
      order: 0,
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 1.0,
      rotation: 0,
      opacity: 1.0,
      flip: { horizontal: false, vertical: false },
      text: {
        value: "MY COMPANY",
        font: "Arial",
        fontColor: "#000000",
        fontWeight: "bold",
        fontStyle: "normal",
        alignment: "center",
        lineHeight: 1.0,
        letterSpacing: 0
      }
    }
  ],
  colorsUsed: [
    { role: "text", color: "#000000" }
  ],
  alignments: {
    verticalAlign: "center",
    horizontalAlign: "center"
  },
  responsive: {
    version: "3.0",
    description: "Fully responsive logo data",
    scalingMethod: "scaleFactor",
    positionMethod: "relative",
    fullyResponsive: true
  },
  metadata: {
    tags: ["logo", "company", "text"],
    version: 1,
    responsive: true
  },
  export: {
    format: "png",
    transparentBackground: true,
    quality: 100,
    responsive: {
      scalable: true,
      maintainAspectRatio: true
    }
  }
};

/**
 * Example 2: Logo with Icon and Text
 * Common pattern for modern logo design
 */
const iconTextLogo = {
  name: "Tech Startup Logo",
  description: "Modern logo with icon and text",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 135,
        stops: [
          { offset: 0, hex: "#667eea", alpha: 1 },
          { offset: 1, hex: "#764ba2", alpha: 1 }
        ]
      }
    }
  },
  layers: [
    {
      type: "icon",
      visible: true,
      order: 0,
      position: { x: 0.5, y: 0.4 },
      scaleFactor: 0.3,
      rotation: 0,
      opacity: 1.0,
      flip: { horizontal: false, vertical: false },
      icon: {
        src: "rocket_icon",
        color: "#ffffff"
      }
    },
    {
      type: "text",
      visible: true,
      order: 1,
      position: { x: 0.5, y: 0.7 },
      scaleFactor: 0.8,
      rotation: 0,
      opacity: 1.0,
      flip: { horizontal: false, vertical: false },
      text: {
        value: "TECHSTART",
        font: "Helvetica",
        fontColor: "#ffffff",
        fontWeight: "bold",
        fontStyle: "normal",
        alignment: "center",
        lineHeight: 1.0,
        letterSpacing: 1
      }
    }
  ],
  colorsUsed: [
    { role: "icon", color: "#ffffff" },
    { role: "text", color: "#ffffff" }
  ],
  alignments: {
    verticalAlign: "center",
    horizontalAlign: "center"
  },
  responsive: {
    version: "3.0",
    description: "Fully responsive logo data",
    scalingMethod: "scaleFactor",
    positionMethod: "relative",
    fullyResponsive: true
  },
  metadata: {
    tags: ["logo", "tech", "startup", "modern"],
    version: 1,
    responsive: true
  },
  export: {
    format: "png",
    transparentBackground: false,
    quality: 100,
    responsive: {
      scalable: true,
      maintainAspectRatio: true
    }
  }
};

/**
 * Example 3: Complex Multi-Layer Logo
 * Advanced logo with multiple elements and effects
 */
const complexLogo = {
  name: "Premium Brand Logo",
  description: "Complex logo with multiple layers and effects",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "solid",
      solidColor: "#f8f9fa"
    }
  },
  layers: [
    {
      type: "shape",
      visible: true,
      order: 0,
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.8,
      rotation: 0,
      opacity: 0.1,
      flip: { horizontal: false, vertical: false },
      shape: {
        type: "circle",
        color: "#000000",
        strokeColor: null,
        strokeWidth: 0
      }
    },
    {
      type: "shape",
      visible: true,
      order: 1,
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.6,
      rotation: 0,
      opacity: 1.0,
      flip: { horizontal: false, vertical: false },
      shape: {
        type: "rect",
        color: "#007bff",
        strokeColor: "#ffffff",
        strokeWidth: 3
      }
    },
    {
      type: "icon",
      visible: true,
      order: 2,
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.4,
      rotation: 0,
      opacity: 1.0,
      flip: { horizontal: false, vertical: false },
      icon: {
        src: "star_icon",
        color: "#ffffff"
      }
    },
    {
      type: "text",
      visible: true,
      order: 3,
      position: { x: 0.5, y: 0.8 },
      scaleFactor: 0.6,
      rotation: 0,
      opacity: 1.0,
      flip: { horizontal: false, vertical: false },
      text: {
        value: "PREMIUM",
        font: "Arial",
        fontColor: "#007bff",
        fontWeight: "bold",
        fontStyle: "normal",
        alignment: "center",
        lineHeight: 1.0,
        letterSpacing: 2
      }
    }
  ],
  colorsUsed: [
    { role: "shape", color: "#000000" },
    { role: "shape", color: "#007bff" },
    { role: "icon", color: "#ffffff" },
    { role: "text", color: "#007bff" }
  ],
  alignments: {
    verticalAlign: "center",
    horizontalAlign: "center"
  },
  responsive: {
    version: "3.0",
    description: "Fully responsive logo data",
    scalingMethod: "scaleFactor",
    positionMethod: "relative",
    fullyResponsive: true
  },
  metadata: {
    tags: ["logo", "premium", "brand", "complex"],
    version: 1,
    responsive: true
  },
  export: {
    format: "png",
    transparentBackground: true,
    quality: 100,
    responsive: {
      scalable: true,
      maintainAspectRatio: true
    }
  }
};

/**
 * Example 4: Logo with Image Background
 * Logo with custom background image
 */
const imageBackgroundLogo = {
  name: "Nature Brand Logo",
  description: "Logo with nature-themed background image",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "image",
      image: {
        type: "imported",
        path: "/images/nature-background.jpg"
      }
    }
  },
  layers: [
    {
      type: "shape",
      visible: true,
      order: 0,
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.7,
      rotation: 0,
      opacity: 0.8,
      flip: { horizontal: false, vertical: false },
      shape: {
        type: "circle",
        color: "#ffffff",
        strokeColor: "#4CAF50",
        strokeWidth: 4
      }
    },
    {
      type: "text",
      visible: true,
      order: 1,
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.8,
      rotation: 0,
      opacity: 1.0,
      flip: { horizontal: false, vertical: false },
      text: {
        value: "NATURE",
        font: "Georgia",
        fontColor: "#4CAF50",
        fontWeight: "bold",
        fontStyle: "normal",
        alignment: "center",
        lineHeight: 1.0,
        letterSpacing: 1
      }
    }
  ],
  colorsUsed: [
    { role: "shape", color: "#ffffff" },
    { role: "text", color: "#4CAF50" }
  ],
  alignments: {
    verticalAlign: "center",
    horizontalAlign: "center"
  },
  responsive: {
    version: "3.0",
    description: "Fully responsive logo data",
    scalingMethod: "scaleFactor",
    positionMethod: "relative",
    fullyResponsive: true
  },
  metadata: {
    tags: ["logo", "nature", "green", "organic"],
    version: 1,
    responsive: true
  },
  export: {
    format: "png",
    transparentBackground: false,
    quality: 100,
    responsive: {
      scalable: true,
      maintainAspectRatio: true
    }
  }
};

// ==============================================
// CLIENT-SIDE API FUNCTIONS
// ==============================================

/**
 * API Configuration
 */
const API_CONFIG = {
  baseUrl: 'http://localhost:3000/api',
  endpoints: {
    createLogo: '/logo',
    createMobileLogo: '/logo/mobile',
    getLogo: '/logo',
    updateLogo: '/logo',
    deleteLogo: '/logo',
    exportPng: '/logo',
    exportSvg: '/logo',
    thumbnail: '/logo'
  }
};

/**
 * Create a new logo using the standard API
 * @param {Object} logoData - Logo creation data
 * @returns {Promise<Object>} Created logo response
 */
async function createLogo(logoData) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.createLogo}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logoData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating logo:', error);
    throw error;
  }
}

/**
 * Create a new logo using the mobile-compatible API
 * @param {Object} logoData - Logo creation data in mobile format
 * @returns {Promise<Object>} Created logo response
 */
async function createMobileLogo(logoData) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.createMobileLogo}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logoData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating mobile logo:', error);
    throw error;
  }
}

/**
 * Get a logo by ID
 * @param {string} logoId - Logo ID
 * @param {string} format - Response format ('mobile' or 'standard')
 * @returns {Promise<Object>} Logo data
 */
async function getLogo(logoId, format = 'standard') {
  try {
    const url = format === 'mobile' 
      ? `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getLogo}/${logoId}/mobile`
      : `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getLogo}/${logoId}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching logo:', error);
    throw error;
  }
}

/**
 * Update an existing logo
 * @param {string} logoId - Logo ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} Updated logo response
 */
async function updateLogo(logoId, updates) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.updateLogo}/${logoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating logo:', error);
    throw error;
  }
}

/**
 * Delete a logo
 * @param {string} logoId - Logo ID
 * @returns {Promise<Object>} Deletion response
 */
async function deleteLogo(logoId) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.deleteLogo}/${logoId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting logo:', error);
    throw error;
  }
}

/**
 * Export logo as PNG
 * @param {string} logoId - Logo ID
 * @param {Object} options - Export options
 * @returns {Promise<string>} Export URL
 */
async function exportLogoAsPng(logoId, options = {}) {
  const { width = 1920, height = 1080, dpi = 300, quality = 95 } = options;
  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString(),
    dpi: dpi.toString(),
    quality: quality.toString()
  });

  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.exportPng}/${logoId}/export.png?${params}`;
}

/**
 * Export logo as SVG
 * @param {string} logoId - Logo ID
 * @param {Object} options - Export options
 * @returns {Promise<string>} Export URL
 */
async function exportLogoAsSvg(logoId, options = {}) {
  const { width = 1920, height = 1080 } = options;
  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString()
  });

  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.exportSvg}/${logoId}/export.svg?${params}`;
}

/**
 * Get logo thumbnail
 * @param {string} logoId - Logo ID
 * @param {Object} options - Thumbnail options
 * @returns {Promise<string>} Thumbnail URL
 */
async function getLogoThumbnail(logoId, options = {}) {
  const { width = 300, height = 300 } = options;
  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString()
  });

  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.thumbnail}/${logoId}/thumbnail?${params}`;
}

// ==============================================
// VALIDATION FUNCTIONS
// ==============================================

/**
 * Validate hex color format
 * @param {string} color - Color string
 * @returns {boolean} Is valid hex color
 */
function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate position value (0-1)
 * @param {number} value - Position value
 * @returns {boolean} Is valid position
 */
function isValidPosition(value) {
  return value >= 0 && value <= 1;
}

/**
 * Validate opacity value (0-1)
 * @param {number} value - Opacity value
 * @returns {boolean} Is valid opacity
 */
function isValidOpacity(value) {
  return value >= 0 && value <= 1;
}

/**
 * Validate scale factor (positive)
 * @param {number} value - Scale value
 * @returns {boolean} Is valid scale
 */
function isValidScale(value) {
  return value > 0;
}

/**
 * Validate logo creation request
 * @param {Object} request - Logo request data
 * @returns {Array<string>} Array of validation errors
 */
function validateLogoRequest(request) {
  const errors = [];
  
  // Required fields
  if (!request.name || request.name.trim() === '') {
    errors.push('Logo name is required');
  }
  
  if (!request.canvas) {
    errors.push('Canvas configuration is required');
  } else {
    if (!request.canvas.aspectRatio || request.canvas.aspectRatio <= 0) {
      errors.push('Canvas aspect ratio must be positive');
    }
    
    if (!request.canvas.background) {
      errors.push('Canvas background configuration is required');
    }
  }
  
  if (!request.layers || request.layers.length === 0) {
    errors.push('At least one layer is required');
  }
  
  // Validate layers
  request.layers?.forEach((layer, index) => {
    if (!layer.type) {
      errors.push(`Layer ${index}: type is required`);
    }
    
    if (!layer.position || !isValidPosition(layer.position.x) || !isValidPosition(layer.position.y)) {
      errors.push(`Layer ${index}: position must be between 0 and 1`);
    }
    
    if (layer.opacity !== undefined && !isValidOpacity(layer.opacity)) {
      errors.push(`Layer ${index}: opacity must be between 0 and 1`);
    }
    
    if (layer.scaleFactor !== undefined && !isValidScale(layer.scaleFactor)) {
      errors.push(`Layer ${index}: scale factor must be positive`);
    }
    
    // Validate type-specific properties
    if (layer.type === 'text' && layer.text) {
      if (!layer.text.value || layer.text.value.trim() === '') {
        errors.push(`Layer ${index}: text value is required`);
      }
      if (layer.text.fontColor && !isValidHexColor(layer.text.fontColor)) {
        errors.push(`Layer ${index}: invalid text color format`);
      }
    }
    
    if (layer.type === 'shape' && layer.shape) {
      if (layer.shape.color && !isValidHexColor(layer.shape.color)) {
        errors.push(`Layer ${index}: invalid shape color format`);
      }
      if (layer.shape.strokeColor && !isValidHexColor(layer.shape.strokeColor)) {
        errors.push(`Layer ${index}: invalid stroke color format`);
      }
    }
    
    if (layer.type === 'icon' && layer.icon) {
      if (layer.icon.color && !isValidHexColor(layer.icon.color)) {
        errors.push(`Layer ${index}: invalid icon color format`);
      }
    }
  });
  
  // Validate colors used
  request.colorsUsed?.forEach((colorUsage, index) => {
    if (!isValidHexColor(colorUsage.color)) {
      errors.push(`Color ${index}: invalid color format`);
    }
  });
  
  return errors;
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Generate a unique logo ID
 * @returns {string} Unique ID
 */
function generateLogoId() {
  return Date.now().toString();
}

/**
 * Generate a unique layer ID
 * @returns {string} Unique ID
 */
function generateLayerId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a default canvas configuration
 * @param {number} aspectRatio - Aspect ratio
 * @returns {Object} Canvas configuration
 */
function createDefaultCanvas(aspectRatio = 1.0) {
  return {
    aspectRatio: aspectRatio,
    background: {
      type: "solid",
      solidColor: "#ffffff"
    }
  };
}

/**
 * Create a default text layer
 * @param {string} text - Text content
 * @param {Object} options - Layer options
 * @returns {Object} Text layer
 */
function createTextLayer(text, options = {}) {
  const {
    position = { x: 0.5, y: 0.5 },
    scaleFactor = 1.0,
    fontColor = "#000000",
    font = "Arial",
    fontWeight = "normal",
    alignment = "center"
  } = options;

  return {
    type: "text",
    visible: true,
    order: 0,
    position: position,
    scaleFactor: scaleFactor,
    rotation: 0,
    opacity: 1.0,
    flip: { horizontal: false, vertical: false },
    text: {
      value: text,
      font: font,
      fontColor: fontColor,
      fontWeight: fontWeight,
      fontStyle: "normal",
      alignment: alignment,
      lineHeight: 1.0,
      letterSpacing: 0
    }
  };
}

/**
 * Create a default shape layer
 * @param {string} shapeType - Shape type
 * @param {Object} options - Layer options
 * @returns {Object} Shape layer
 */
function createShapeLayer(shapeType, options = {}) {
  const {
    position = { x: 0.5, y: 0.5 },
    scaleFactor = 1.0,
    color = "#000000",
    strokeColor = null,
    strokeWidth = 0
  } = options;

  return {
    type: "shape",
    visible: true,
    order: 0,
    position: position,
    scaleFactor: scaleFactor,
    rotation: 0,
    opacity: 1.0,
    flip: { horizontal: false, vertical: false },
    shape: {
      type: shapeType,
      color: color,
      strokeColor: strokeColor,
      strokeWidth: strokeWidth
    }
  };
}

/**
 * Create a default icon layer
 * @param {string} iconSrc - Icon source
 * @param {Object} options - Layer options
 * @returns {Object} Icon layer
 */
function createIconLayer(iconSrc, options = {}) {
  const {
    position = { x: 0.5, y: 0.5 },
    scaleFactor = 1.0,
    color = "#000000"
  } = options;

  return {
    type: "icon",
    visible: true,
    order: 0,
    position: position,
    scaleFactor: scaleFactor,
    rotation: 0,
    opacity: 1.0,
    flip: { horizontal: false, vertical: false },
    icon: {
      src: iconSrc,
      color: color
    }
  };
}

// ==============================================
// USAGE EXAMPLES
// ==============================================

/**
 * Example: Creating a logo programmatically
 */
async function createLogoExample() {
  try {
    // Create a simple logo
    const logoData = {
      name: "Dynamic Logo",
      description: "Created programmatically",
      canvas: createDefaultCanvas(1.0),
      layers: [
        createTextLayer("DYNAMIC", {
          position: { x: 0.5, y: 0.5 },
          fontColor: "#007bff",
          fontWeight: "bold"
        })
      ],
      colorsUsed: [
        { role: "text", color: "#007bff" }
      ],
      alignments: {
        verticalAlign: "center",
        horizontalAlign: "center"
      },
      responsive: {
        version: "3.0",
        description: "Fully responsive logo data",
        scalingMethod: "scaleFactor",
        positionMethod: "relative",
        fullyResponsive: true
      },
      metadata: {
        tags: ["logo", "dynamic", "programmatic"],
        version: 1,
        responsive: true
      },
      export: {
        format: "png",
        transparentBackground: true,
        quality: 100,
        responsive: {
          scalable: true,
          maintainAspectRatio: true
        }
      }
    };

    // Validate the request
    const errors = validateLogoRequest(logoData);
    if (errors.length > 0) {
      console.error('Validation errors:', errors);
      return;
    }

    // Create the logo
    const result = await createLogo(logoData);
    console.log('Logo created successfully:', result);

    // Get the logo ID
    const logoId = result.data.logoId;
    console.log('Logo ID:', logoId);

    // Export as PNG
    const pngUrl = await exportLogoAsPng(logoId, {
      width: 1920,
      height: 1920,
      quality: 100
    });
    console.log('PNG Export URL:', pngUrl);

    // Export as SVG
    const svgUrl = await exportLogoAsSvg(logoId, {
      width: 1920,
      height: 1920
    });
    console.log('SVG Export URL:', svgUrl);

    // Get thumbnail
    const thumbnailUrl = await getLogoThumbnail(logoId, {
      width: 300,
      height: 300
    });
    console.log('Thumbnail URL:', thumbnailUrl);

  } catch (error) {
    console.error('Error in logo creation example:', error);
  }
}

/**
 * Example: Creating a mobile-compatible logo
 */
async function createMobileLogoExample() {
  try {
    const mobileLogoData = {
      logoId: generateLogoId(),
      userId: "user@example.com",
      name: "Mobile Logo",
      description: "Mobile-compatible logo",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: generateLayerId(),
          type: "text",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 1.0,
          rotation: 0.0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          text: {
            value: "MOBILE",
            font: "Arial",
            fontColor: "#000000",
            fontWeight: "normal",
            fontStyle: "normal",
            alignment: "center",
            lineHeight: 1.0,
            letterSpacing: 0
          }
        }
      ],
      colorsUsed: [
        { role: "text", color: "#000000" }
      ],
      alignments: {
        verticalAlign: "center",
        horizontalAlign: "center"
      },
      responsive: {
        version: "3.0",
        description: "Fully responsive logo data",
        scalingMethod: "scaleFactor",
        positionMethod: "relative",
        fullyResponsive: true
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["logo", "mobile", "responsive"],
        version: 3,
        responsive: true
      },
      export: {
        format: "png",
        transparentBackground: true,
        quality: 100,
        responsive: {
          scalable: true,
          maintainAspectRatio: true
        }
      }
    };

    const result = await createMobileLogo(mobileLogoData);
    console.log('Mobile logo created successfully:', result);

  } catch (error) {
    console.error('Error in mobile logo creation example:', error);
  }
}

// ==============================================
// EXPORT FOR USE IN OTHER MODULES
// ==============================================

// Export all examples and functions for use in other modules
export {
  // Examples
  simpleTextLogo,
  iconTextLogo,
  complexLogo,
  imageBackgroundLogo,
  
  // API Functions
  createLogo,
  createMobileLogo,
  getLogo,
  updateLogo,
  deleteLogo,
  exportLogoAsPng,
  exportLogoAsSvg,
  getLogoThumbnail,
  
  // Validation Functions
  isValidHexColor,
  isValidPosition,
  isValidOpacity,
  isValidScale,
  validateLogoRequest,
  
  // Utility Functions
  generateLogoId,
  generateLayerId,
  createDefaultCanvas,
  createTextLayer,
  createShapeLayer,
  createIconLayer,
  
  // Example Functions
  createLogoExample,
  createMobileLogoExample,
  
  // Configuration
  API_CONFIG
};

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    simpleTextLogo,
    iconTextLogo,
    complexLogo,
    imageBackgroundLogo,
    createLogo,
    createMobileLogo,
    getLogo,
    updateLogo,
    deleteLogo,
    exportLogoAsPng,
    exportLogoAsSvg,
    getLogoThumbnail,
    isValidHexColor,
    isValidPosition,
    isValidOpacity,
    isValidScale,
    validateLogoRequest,
    generateLogoId,
    generateLayerId,
    createDefaultCanvas,
    createTextLayer,
    createShapeLayer,
    createIconLayer,
    createLogoExample,
    createMobileLogoExample,
    API_CONFIG
  };
}
