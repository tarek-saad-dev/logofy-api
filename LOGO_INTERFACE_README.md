# Logo Maker API - Client-Side Interface Documentation

This documentation provides comprehensive interfaces and examples for creating logos using the Logo Maker API from client-side applications.

## 📁 Files Overview

- **`logo-creation-interface.ts`** - Complete TypeScript interfaces for logo creation
- **`logo-api-client-examples.js`** - Practical JavaScript examples and utility functions
- **`README.md`** - This documentation file

## 🚀 Quick Start

### 1. Basic Logo Creation

```javascript
import { createLogo, simpleTextLogo } from './logo-api-client-examples.js';

// Use a pre-defined example
const result = await createLogo(simpleTextLogo);
console.log('Logo created:', result.data.logoId);
```

### 2. Custom Logo Creation

```javascript
import { createLogo, createTextLayer, createDefaultCanvas } from './logo-api-client-examples.js';

const customLogo = {
  name: "My Custom Logo",
  canvas: createDefaultCanvas(1.0),
  layers: [
    createTextLayer("CUSTOM", {
      fontColor: "#ff6b6b",
      fontWeight: "bold"
    })
  ],
  colorsUsed: [{ role: "text", color: "#ff6b6b" }],
  // ... other required fields
};

const result = await createLogo(customLogo);
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/logo` | Create logo (standard format) |
| `POST` | `/api/logo/mobile` | Create logo (mobile format) |
| `GET` | `/api/logo/:id` | Get logo by ID |
| `GET` | `/api/logo/:id/mobile` | Get logo in mobile format |
| `PATCH` | `/api/logo/:id` | Update logo |
| `DELETE` | `/api/logo/:id` | Delete logo |
| `GET` | `/api/logo/:id/export.png` | Export as PNG |
| `GET` | `/api/logo/:id/export.svg` | Export as SVG |
| `GET` | `/api/logo/:id/thumbnail` | Get thumbnail |

## 🎨 Logo Structure

### Core Components

1. **Canvas Configuration** - Defines the logo canvas and background
2. **Layers** - Individual elements (text, shapes, icons, images)
3. **Colors Used** - Color palette used in the logo
4. **Alignments** - Logo alignment settings
5. **Responsive Settings** - Responsive behavior configuration
6. **Metadata** - Tags, version, timestamps
7. **Export Settings** - Export format and quality options

### Layer Types

#### 1. Text Layer
```javascript
{
  type: "text",
  text: {
    value: "Your Text",
    font: "Arial",
    fontColor: "#000000",
    fontWeight: "bold",
    alignment: "center"
  }
}
```

#### 2. Shape Layer
```javascript
{
  type: "shape",
  shape: {
    type: "circle", // rect, circle, ellipse, polygon, path, line
    color: "#ff6b6b",
    strokeColor: "#ffffff",
    strokeWidth: 2
  }
}
```

#### 3. Icon Layer
```javascript
{
  type: "icon",
  icon: {
    src: "icon_name",
    color: "#4ecdc4"
  }
}
```

#### 4. Image Layer
```javascript
{
  type: "image",
  image: {
    src: "image_url",
    type: "imported"
  }
}
```

#### 5. Background Layer
```javascript
{
  type: "background",
  background: {
    type: "solid", // solid, gradient, image
    color: "#ffffff"
  }
}
```

## 🎯 Complete Examples

### Example 1: Simple Text Logo
```javascript
const simpleLogo = {
  name: "Company Logo",
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
      position: { x: 0.5, y: 0.5 },
      text: {
        value: "COMPANY",
        fontColor: "#000000",
        fontWeight: "bold"
      }
    }
  ],
  colorsUsed: [{ role: "text", color: "#000000" }],
  alignments: {
    verticalAlign: "center",
    horizontalAlign: "center"
  },
  responsive: {
    version: "3.0",
    scalingMethod: "scaleFactor",
    positionMethod: "relative",
    fullyResponsive: true
  },
  metadata: {
    tags: ["logo", "company"],
    version: 1,
    responsive: true
  },
  export: {
    format: "png",
    transparentBackground: true,
    quality: 100
  }
};
```

### Example 2: Logo with Icon and Text
```javascript
const iconTextLogo = {
  name: "Tech Logo",
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
      position: { x: 0.5, y: 0.4 },
      scaleFactor: 0.3,
      icon: {
        src: "rocket_icon",
        color: "#ffffff"
      }
    },
    {
      type: "text",
      position: { x: 0.5, y: 0.7 },
      scaleFactor: 0.8,
      text: {
        value: "TECHSTART",
        fontColor: "#ffffff",
        fontWeight: "bold"
      }
    }
  ],
  colorsUsed: [
    { role: "icon", color: "#ffffff" },
    { role: "text", color: "#ffffff" }
  ],
  // ... other required fields
};
```

### Example 3: Complex Multi-Layer Logo
```javascript
const complexLogo = {
  name: "Premium Logo",
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
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.8,
      opacity: 0.1,
      shape: {
        type: "circle",
        color: "#000000"
      }
    },
    {
      type: "shape",
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.6,
      shape: {
        type: "rect",
        color: "#007bff",
        strokeColor: "#ffffff",
        strokeWidth: 3
      }
    },
    {
      type: "icon",
      position: { x: 0.5, y: 0.5 },
      scaleFactor: 0.4,
      icon: {
        src: "star_icon",
        color: "#ffffff"
      }
    },
    {
      type: "text",
      position: { x: 0.5, y: 0.8 },
      scaleFactor: 0.6,
      text: {
        value: "PREMIUM",
        fontColor: "#007bff",
        fontWeight: "bold"
      }
    }
  ],
  colorsUsed: [
    { role: "shape", color: "#000000" },
    { role: "shape", color: "#007bff" },
    { role: "icon", color: "#ffffff" },
    { role: "text", color: "#007bff" }
  ],
  // ... other required fields
};
```

## 🛠️ Utility Functions

### Creating Default Configurations

```javascript
import { 
  createDefaultCanvas, 
  createTextLayer, 
  createShapeLayer, 
  createIconLayer 
} from './logo-api-client-examples.js';

// Create default canvas
const canvas = createDefaultCanvas(1.0); // Square canvas

// Create text layer
const textLayer = createTextLayer("Hello", {
  fontColor: "#ff6b6b",
  fontWeight: "bold",
  position: { x: 0.5, y: 0.5 }
});

// Create shape layer
const shapeLayer = createShapeLayer("circle", {
  color: "#4ecdc4",
  position: { x: 0.5, y: 0.5 }
});

// Create icon layer
const iconLayer = createIconLayer("star_icon", {
  color: "#ffd700",
  position: { x: 0.5, y: 0.5 }
});
```

### Validation

```javascript
import { validateLogoRequest } from './logo-api-client-examples.js';

const logoData = { /* your logo data */ };
const errors = validateLogoRequest(logoData);

if (errors.length > 0) {
  console.error('Validation errors:', errors);
} else {
  // Proceed with logo creation
  const result = await createLogo(logoData);
}
```

## 📱 Mobile-Compatible Format

The API supports a mobile-compatible format that's optimized for mobile applications:

```javascript
import { createMobileLogo } from './logo-api-client-examples.js';

const mobileLogo = {
  logoId: "1759094821977",
  userId: "user@example.com",
  name: "Mobile Logo",
  description: "Mobile-optimized logo",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "solid",
      solidColor: "#ffffff"
    }
  },
  layers: [
    {
      layerId: "1759074588677",
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

const result = await createMobileLogo(mobileLogo);
```

## 🎨 Background Types

### Solid Background
```javascript
background: {
  type: "solid",
  solidColor: "#ffffff"
}
```

### Gradient Background
```javascript
background: {
  type: "gradient",
  gradient: {
    type: "linear", // or "radial"
    angle: 45, // for linear gradients
    stops: [
      { offset: 0, hex: "#ff6b6b", alpha: 1 },
      { offset: 1, hex: "#4ecdc4", alpha: 1 }
    ]
  }
}
```

### Image Background
```javascript
background: {
  type: "image",
  image: {
    type: "imported",
    path: "/path/to/image.jpg"
  }
}
```

## 📤 Export Options

### PNG Export
```javascript
import { exportLogoAsPng } from './logo-api-client-examples.js';

const pngUrl = await exportLogoAsPng(logoId, {
  width: 1920,
  height: 1920,
  dpi: 300,
  quality: 100
});
```

### SVG Export
```javascript
import { exportLogoAsSvg } from './logo-api-client-examples.js';

const svgUrl = await exportLogoAsSvg(logoId, {
  width: 1920,
  height: 1920
});
```

### Thumbnail
```javascript
import { getLogoThumbnail } from './logo-api-client-examples.js';

const thumbnailUrl = await getLogoThumbnail(logoId, {
  width: 300,
  height: 300
});
```

## 🔧 Advanced Features

### Layer Transformations
```javascript
{
  type: "text",
  position: { x: 0.5, y: 0.5 },
  scaleFactor: 1.2,        // Scale up 20%
  rotation: 15,            // Rotate 15 degrees
  opacity: 0.8,            // 80% opacity
  flip: { 
    horizontal: true,       // Flip horizontally
    vertical: false 
  }
}
```

### Blend Modes
```javascript
{
  type: "shape",
  blend_mode: "multiply",  // normal, multiply, screen, overlay, etc.
  // ... other properties
}
```

### Advanced Text Properties
```javascript
{
  type: "text",
  text: {
    value: "Advanced Text",
    font: "Helvetica",
    fontColor: "#000000",
    fontWeight: "bold",
    fontStyle: "italic",
    alignment: "center",
    lineHeight: 1.5,
    letterSpacing: 2,
    fontSize: 48,          // Font size in pixels
    strokeColor: "#ffffff", // Text stroke
    strokeWidth: 2         // Stroke width
  }
}
```

### Advanced Shape Properties
```javascript
{
  type: "shape",
  shape: {
    type: "rect",
    color: "#ff6b6b",
    strokeColor: "#ffffff",
    strokeWidth: 3,
    rx: 10,               // Corner radius X
    ry: 10,               // Corner radius Y
    strokeDash: [5, 5],   // Dashed stroke
    lineCap: "round",     // Line cap style
    lineJoin: "round"     // Line join style
  }
}
```

## 🚨 Error Handling

```javascript
try {
  const result = await createLogo(logoData);
  console.log('Success:', result);
} catch (error) {
  if (error.message.includes('400')) {
    console.error('Bad Request - Check your data format');
  } else if (error.message.includes('404')) {
    console.error('Not Found - Check your endpoint URL');
  } else if (error.message.includes('500')) {
    console.error('Server Error - Try again later');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## 📊 Response Format

### Success Response
```javascript
{
  success: true,
  data: {
    logoId: "uuid-string",
    templateId: null,
    userId: "user@example.com",
    name: "Logo Name",
    description: "Logo description",
    canvas: { /* canvas config */ },
    layers: [ /* layer definitions */ ],
    colorsUsed: [ /* color usage */ ],
    alignments: { /* alignment settings */ },
    responsive: { /* responsive settings */ },
    metadata: { /* metadata */ },
    export: { /* export settings */ }
  }
}
```

### Error Response
```javascript
{
  success: false,
  message: "Error description"
}
```

## 🔍 Validation Rules

- **Logo name**: Required, non-empty string
- **Canvas**: Required with valid aspect ratio (> 0)
- **Background**: Required with valid type and configuration
- **Layers**: At least one layer required
- **Position**: X and Y coordinates must be between 0 and 1
- **Opacity**: Must be between 0 and 1
- **Scale Factor**: Must be positive
- **Colors**: Must be valid hex color format (#RRGGBB or #RGB)
- **Text Value**: Required for text layers, non-empty string

## 🎯 Best Practices

1. **Always validate** your logo data before sending to the API
2. **Use utility functions** for creating common layer types
3. **Handle errors gracefully** with proper error handling
4. **Use appropriate aspect ratios** for your use case
5. **Optimize export settings** based on your needs
6. **Test with different screen sizes** using responsive settings
7. **Use meaningful names and descriptions** for better organization
8. **Leverage the mobile format** for mobile applications

## 📚 Additional Resources

- **API Documentation**: See `LOGO_MAKER_API.md` for complete API reference
- **Mobile Documentation**: See `MOBILE_API_DOCUMENTATION.md` for mobile-specific details
- **Postman Collection**: Use the provided Postman collection for testing
- **Examples**: Check the example files for more complex use cases

## 🤝 Support

For questions or issues:
1. Check the validation errors first
2. Review the API documentation
3. Test with the provided examples
4. Check the server logs for detailed error messages

---

**Happy Logo Creating! 🎨**
