/**
 * Logo Maker API - Complete Interface for Logo Creation
 * 
 * This file contains comprehensive TypeScript interfaces for creating logos
 * with all possible attributes and configurations supported by the API.
 * 
 * Base URL: http://localhost:3000/api
 * Endpoints: POST /api/logo, POST /api/logo/mobile
 */

// ==============================================
// BASE INTERFACES
// ==============================================

/**
 * Main interface for creating a new logo
 * Supports both standard and mobile-compatible formats
 */
export interface CreateLogoRequest {
  // Core Logo Properties
  logoId?: string;                    // Optional UUID for logo ID
  templateId?: string;                // Optional template ID to base logo on
  userId?: string;                    // User ID or email for ownership
  name: string;                       // Logo name/title (required)
  description?: string;               // Logo description
  
  // Canvas Configuration
  canvas: CanvasConfiguration;
  
  // Layer Definitions
  layers: LayerDefinition[];
  
  // Design Properties
  colorsUsed?: ColorUsage[];          // Colors used in the logo
  alignments?: AlignmentSettings;    // Logo alignment settings
  
  // Responsive Configuration
  responsive?: ResponsiveSettings;
  
  // Metadata
  metadata?: LogoMetadata;
  
  // Export Configuration
  export?: ExportSettings;
  
  // Legacy/Alternative Properties (for standard API)
  owner_id?: string;                 // Alternative to userId
  title?: string;                     // Alternative to name
  canvas_w?: number;                 // Canvas width in pixels
  canvas_h?: number;                 // Canvas height in pixels
  dpi?: number;                      // Dots per inch
  category_id?: string;               // Category UUID
  is_template?: boolean;              // Whether this is a template
}

// ==============================================
// CANVAS CONFIGURATION
// ==============================================

export interface CanvasConfiguration {
  aspectRatio: number;                // Canvas aspect ratio (width/height)
  background: BackgroundConfiguration;
}

export interface BackgroundConfiguration {
  type: 'solid' | 'gradient' | 'image';
  solidColor?: string;                // Hex color for solid background
  gradient?: GradientConfiguration;   // Gradient configuration
  image?: ImageBackgroundConfiguration; // Image background configuration
}

export interface GradientConfiguration {
  type: 'linear' | 'radial';
  angle?: number;                     // Angle for linear gradients (degrees)
  stops: GradientStop[];              // Color stops
}

export interface GradientStop {
  offset: number;                     // Position (0-1)
  hex: string;                       // Hex color
  alpha: number;                      // Alpha/opacity (0-1)
}

export interface ImageBackgroundConfiguration {
  type: 'imported' | 'url';
  path: string;                      // Image path or URL
}

// ==============================================
// LAYER DEFINITIONS
// ==============================================

export interface LayerDefinition {
  layerId?: string;                   // Optional UUID for layer ID
  type: LayerType;                    // Layer type
  visible?: boolean;                  // Layer visibility
  order?: number;                     // Z-index/order
  position: Position;                 // Layer position
  scaleFactor?: number;               // Scale factor
  rotation?: number;                  // Rotation in degrees
  opacity?: number;                   // Opacity (0-1)
  flip?: FlipSettings;                // Flip settings
  
  // Type-specific properties
  text?: TextLayerProperties;
  shape?: ShapeLayerProperties;
  icon?: IconLayerProperties;
  image?: ImageLayerProperties;
  background?: BackgroundLayerProperties;
  
  // Legacy properties (for standard API)
  name?: string;                      // Layer name
  z_index?: number;                   // Alternative to order
  x_norm?: number;                    // Alternative to position.x
  y_norm?: number;                    // Alternative to position.y
  scale?: number;                      // Alternative to scaleFactor
  rotation_deg?: number;               // Alternative to rotation
  anchor_x?: number;                  // Anchor point X
  anchor_y?: number;                  // Anchor point Y
  blend_mode?: BlendMode;              // Blend mode
  is_visible?: boolean;               // Alternative to visible
  is_locked?: boolean;                // Layer lock status
  common_style?: any;                 // Common style properties
  flip_horizontal?: boolean;          // Alternative to flip.horizontal
  flip_vertical?: boolean;           // Alternative to flip.vertical
}

export type LayerType = 'text' | 'shape' | 'icon' | 'image' | 'background' | 'TEXT' | 'SHAPE' | 'ICON' | 'IMAGE' | 'BACKGROUND';

export interface Position {
  x: number;                          // X position (0-1 normalized)
  y: number;                          // Y position (0-1 normalized)
}

export interface FlipSettings {
  horizontal: boolean;                // Horizontal flip
  vertical: boolean;                  // Vertical flip
}

export type BlendMode = 
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-burn' | 'color-dodge' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity' | 'soft-light' | 'hard-light';

// ==============================================
// TEXT LAYER PROPERTIES
// ==============================================

export interface TextLayerProperties {
  value: string;                      // Text content
  font?: string;                      // Font family name
  fontColor?: string;                 // Text color (hex)
  fontWeight?: FontWeight;            // Font weight
  fontStyle?: FontStyle;             // Font style
  alignment?: TextAlignment;          // Text alignment
  lineHeight?: number;                // Line height multiplier
  letterSpacing?: number;             // Letter spacing
  
  // Advanced text properties (for standard API)
  fontSize?: number;                  // Font size in pixels
  font_id?: string;                   // Font asset ID
  baseline?: string;                  // Text baseline
  fill_hex?: string;                 // Alternative to fontColor
  fill_alpha?: number;               // Fill opacity
  stroke_hex?: string;               // Stroke color
  stroke_alpha?: number;             // Stroke opacity
  stroke_width?: number;             // Stroke width
  stroke_align?: string;             // Stroke alignment
  gradient?: any;                    // Text gradient
}

export type FontWeight = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

// ==============================================
// SHAPE LAYER PROPERTIES
// ==============================================

export interface ShapeLayerProperties {
  type: ShapeType;                    // Shape type
  color?: string;                     // Fill color (hex)
  strokeColor?: string;               // Stroke color (hex)
  strokeWidth?: number;               // Stroke width
  
  // Advanced shape properties (for standard API)
  shape_kind?: ShapeType;             // Alternative to type
  svg_path?: string;                 // SVG path data
  points?: number[];                  // Shape points
  rx?: number;                       // Corner radius X
  ry?: number;                       // Corner radius Y
  fill_hex?: string;                 // Alternative to color
  fill_alpha?: number;               // Fill opacity
  gradient?: any;                    // Shape gradient
  stroke_hex?: string;               // Alternative to strokeColor
  stroke_alpha?: number;             // Stroke opacity
  stroke_dash?: number[];           // Stroke dash pattern
  line_cap?: string;                 // Line cap style
  line_join?: string;                // Line join style
  meta?: any;                        // Additional metadata
}

export type ShapeType = 'rect' | 'circle' | 'ellipse' | 'polygon' | 'path' | 'line';

// ==============================================
// ICON LAYER PROPERTIES
// ==============================================

export interface IconLayerProperties {
  src: string;                        // Icon source/name
  color?: string;                     // Icon tint color (hex)
  
  // Advanced icon properties (for standard API)
  asset_id?: string;                  // Asset ID reference
  tint_hex?: string;                 // Alternative to color
  tint_alpha?: number;               // Tint opacity
  allow_recolor?: boolean;            // Allow recoloring
}

// ==============================================
// IMAGE LAYER PROPERTIES
// ==============================================

export interface ImageLayerProperties {
  src?: string;                       // Image source URL
  type?: 'imported' | 'url';         // Image type
  path?: string;                      // Image path
  
  // Advanced image properties (for standard API)
  asset_id?: string;                  // Asset ID reference
  crop?: CropSettings;                // Crop settings
  fit?: ImageFit;                     // Image fit mode
  rounding?: number;                  // Corner rounding
  blur?: number;                      // Blur amount
  brightness?: number;                // Brightness adjustment
  contrast?: number;                  // Contrast adjustment
}

export interface CropSettings {
  x: number;                          // Crop X position
  y: number;                          // Crop Y position
  w: number;                          // Crop width
  h: number;                          // Crop height
}

export type ImageFit = 'contain' | 'cover' | 'fill' | 'scale-down' | 'none';

// ==============================================
// BACKGROUND LAYER PROPERTIES
// ==============================================

export interface BackgroundLayerProperties {
  type: 'solid' | 'gradient' | 'image';
  color?: string;                     // Background color (hex)
  image?: ImageBackgroundConfiguration;
  
  // Advanced background properties (for standard API)
  mode?: 'solid' | 'gradient' | 'image'; // Alternative to type
  fill_hex?: string;                 // Alternative to color
  fill_alpha?: number;               // Fill opacity
  gradient?: GradientConfiguration;  // Background gradient
  asset_id?: string;                 // Background asset ID
  repeat?: string;                   // Background repeat
  position?: string;                 // Background position
  size?: string;                     // Background size
}

// ==============================================
// DESIGN PROPERTIES
// ==============================================

export interface ColorUsage {
  role: 'text' | 'icon' | 'shape' | 'background';
  color: string;                      // Hex color
}

export interface AlignmentSettings {
  verticalAlign?: 'top' | 'center' | 'bottom';
  horizontalAlign?: 'left' | 'center' | 'right';
}

// ==============================================
// RESPONSIVE SETTINGS
// ==============================================

export interface ResponsiveSettings {
  version?: string;                   // Responsive version
  description?: string;               // Description
  scalingMethod?: 'scaleFactor' | 'absolute' | 'relative';
  positionMethod?: 'relative' | 'absolute';
  fullyResponsive?: boolean;          // Fully responsive flag
}

// ==============================================
// METADATA
// ==============================================

export interface LogoMetadata {
  createdAt?: string;                 // Creation timestamp (ISO)
  updatedAt?: string;                 // Update timestamp (ISO)
  tags?: string[];                    // Tags array
  version?: number;                   // Version number
  responsive?: boolean;                // Responsive flag
}

// ==============================================
// EXPORT SETTINGS
// ==============================================

export interface ExportSettings {
  format?: ExportFormat;              // Export format
  transparentBackground?: boolean;    // Transparent background
  quality?: number;                   // Export quality (1-100)
  responsive?: ResponsiveExportSettings;
}

export type ExportFormat = 'png' | 'svg' | 'jpg' | 'jpeg' | 'webp';

export interface ResponsiveExportSettings {
  scalable?: boolean;                 // Scalable export
  maintainAspectRatio?: boolean;      // Maintain aspect ratio
}

// ==============================================
// API RESPONSE INTERFACES
// ==============================================

export interface LogoCreationResponse {
  success: boolean;
  data: {
    logoId: string;
    templateId?: string;
    userId?: string;
    name: string;
    description?: string;
    canvas: CanvasConfiguration;
    layers: LayerDefinition[];
    colorsUsed: ColorUsage[];
    alignments: AlignmentSettings;
    responsive: ResponsiveSettings;
    metadata: LogoMetadata;
    export: ExportSettings;
  };
  message?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  data?: null;
}

// ==============================================
// UTILITY TYPES
// ==============================================

/**
 * Helper type for creating mobile-compatible logo requests
 */
export type MobileLogoRequest = CreateLogoRequest;

/**
 * Helper type for creating standard API logo requests
 */
export type StandardLogoRequest = CreateLogoRequest;

/**
 * Helper type for layer creation with all possible properties
 */
export type CompleteLayerDefinition = LayerDefinition & {
  text?: TextLayerProperties;
  shape?: ShapeLayerProperties;
  icon?: IconLayerProperties;
  image?: ImageLayerProperties;
  background?: BackgroundLayerProperties;
};

// ==============================================
// EXAMPLE USAGE
// ==============================================

/**
 * Example: Creating a simple text logo
 */
export const exampleTextLogo: CreateLogoRequest = {
  name: "My Brand Logo",
  description: "A simple text-based logo",
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
        value: "MY BRAND",
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
    tags: ["logo", "brand", "text"],
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
 * Example: Creating a complex logo with multiple layers
 */
export const exampleComplexLogo: CreateLogoRequest = {
  name: "Complete Brand Logo",
  description: "A complex logo with multiple elements",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 45,
        stops: [
          { offset: 0, hex: "#FF6B6B", alpha: 1 },
          { offset: 1, hex: "#4ECDC4", alpha: 1 }
        ]
      }
    }
  },
  layers: [
    {
      type: "background",
      visible: true,
      order: 0,
      position: { x: 0, y: 0 },
      scaleFactor: 1.0,
      background: {
        type: "gradient",
        gradient: {
          type: "radial",
          stops: [
            { offset: 0, hex: "#FF6B6B", alpha: 1 },
            { offset: 1, hex: "#4ECDC4", alpha: 1 }
          ]
        }
      }
    },
    {
      type: "shape",
      visible: true,
      order: 1,
      position: { x: 0.5, y: 0.3 },
      scaleFactor: 0.8,
      rotation: 0,
      opacity: 0.9,
      shape: {
        type: "circle",
        color: "#FFFFFF",
        strokeColor: "#000000",
        strokeWidth: 2
      }
    },
    {
      type: "icon",
      visible: true,
      order: 2,
      position: { x: 0.5, y: 0.3 },
      scaleFactor: 0.6,
      rotation: 0,
      opacity: 1.0,
      icon: {
        src: "star_icon",
        color: "#FFD700"
      }
    },
    {
      type: "text",
      visible: true,
      order: 3,
      position: { x: 0.5, y: 0.7 },
      scaleFactor: 1.0,
      rotation: 0,
      opacity: 1.0,
      text: {
        value: "BRAND NAME",
        font: "Helvetica",
        fontColor: "#FFFFFF",
        fontWeight: "bold",
        fontStyle: "normal",
        alignment: "center",
        lineHeight: 1.2,
        letterSpacing: 2
      }
    }
  ],
  colorsUsed: [
    { role: "background", color: "#FF6B6B" },
    { role: "background", color: "#4ECDC4" },
    { role: "shape", color: "#FFFFFF" },
    { role: "icon", color: "#FFD700" },
    { role: "text", color: "#FFFFFF" }
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
    tags: ["logo", "brand", "complex", "multi-layer"],
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
// API ENDPOINT CONSTANTS
// ==============================================

export const API_ENDPOINTS = {
  BASE_URL: 'http://localhost:3000/api',
  CREATE_LOGO: '/logo',
  CREATE_MOBILE_LOGO: '/logo/mobile',
  GET_LOGO: '/logo/:id',
  GET_MOBILE_LOGO: '/logo/:id/mobile',
  UPDATE_LOGO: '/logo/:id',
  DELETE_LOGO: '/logo/:id',
  EXPORT_PNG: '/logo/:id/export.png',
  EXPORT_SVG: '/logo/:id/export.svg',
  THUMBNAIL: '/logo/:id/thumbnail'
} as const;

// ==============================================
// VALIDATION HELPERS
// ==============================================

/**
 * Validates if a color string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validates if a position value is within valid range (0-1)
 */
export function isValidPosition(value: number): boolean {
  return value >= 0 && value <= 1;
}

/**
 * Validates if an opacity value is within valid range (0-1)
 */
export function isValidOpacity(value: number): boolean {
  return value >= 0 && value <= 1;
}

/**
 * Validates if a scale factor is positive
 */
export function isValidScale(value: number): boolean {
  return value > 0;
}

/**
 * Validates a complete logo creation request
 */
export function validateLogoRequest(request: CreateLogoRequest): string[] {
  const errors: string[] = [];
  
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

export default CreateLogoRequest;
