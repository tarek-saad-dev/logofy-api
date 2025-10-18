# Postman Documentation - Logo Maker API Updates

This document provides comprehensive Postman documentation for all the updates made to the Logo Maker API, including enhanced text layer properties, shape layer src support, and icon library functionality.

## Environment Variables

Set up these variables in your Postman environment:

```
baseUrl: http://localhost:3000/api
```

## Collection Overview

### 1. Text Layer Enhancements
- Added complete text layer properties including fontSize, baseline, fillAlpha, stroke properties, and gradient support
- All text properties are now returned in GET requests

### 2. Shape Layer Updates
- Added `src` property to store local shape file paths
- Shapes can now reference local SVG files stored on the client device

### 3. Icon Library System
- Icons are now stored in the database as a reusable library
- Icon URLs are returned instead of just icon names
- Supports icon reuse across multiple logos

## API Endpoints

### 1. Create Logo with Enhanced Properties

**POST** `{{baseUrl}}/logo/mobile`

**Description**: Creates a new logo with all enhanced layer properties including complete text properties, shape src, and icon library support.

**Headers**:
```
Content-Type: application/json
```

**Request Body** (Complete Example):
```json
{
  "name": "Complete Spec Example Logo",
  "description": "A comprehensive JSON covering all layer attributes and background variants per the Logo Maker API.",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "gradient",
      "solidColor": "#FFFFFF",
      "gradient": {
        "type": "linear",
        "angle": 135,
        "stops": [
          {
            "offset": 0.0,
            "hex": "#667eea",
            "alpha": 1.0
          },
          {
            "offset": 0.5,
            "hex": "#5C7AEA",
            "alpha": 0.9
          },
          {
            "offset": 1.0,
            "hex": "#764ba2",
            "alpha": 1.0
          }
        ]
      },
      "image": {
        "type": "imported",
        "path": "/images/example-background.jpg"
      }
    }
  },
  "layers": [
    {
      "layerId": "auto",
      "type": "text",
      "visible": true,
      "order": 0,
      "position": {
        "x": 0.5,
        "y": 0.25
      },
      "scaleFactor": 0.8,
      "rotation": -5.0,
      "opacity": 0.95,
      "flip": {
        "horizontal": false,
        "vertical": false
      },
      "text": {
        "value": "YOUR BRAND",
        "font": "Helvetica",
        "fontSize": 48,
        "fontColor": "#111111",
        "fontWeight": "bold",
        "fontStyle": "italic",
        "alignment": "center",
        "baseline": "alphabetic",
        "lineHeight": 1.1,
        "letterSpacing": 1.25,
        "fillAlpha": 1.0,
        "strokeHex": "#000000",
        "strokeAlpha": 0.5,
        "strokeWidth": 2,
        "strokeAlign": "center",
        "gradient": {
          "type": "linear",
          "angle": 45,
          "stops": [
            {
              "offset": 0,
              "hex": "#ff0000",
              "alpha": 1
            },
            {
              "offset": 1,
              "hex": "#0000ff",
              "alpha": 1
            }
          ]
        }
      }
    },
    {
      "layerId": "auto",
      "type": "shape",
      "visible": true,
      "order": 1,
      "position": {
        "x": 0.5,
        "y": 0.5
      },
      "scaleFactor": 0.6,
      "rotation": 0.0,
      "opacity": 1.0,
      "flip": {
        "horizontal": false,
        "vertical": false
      },
      "shape": {
        "src": "assets/local/Basic/13.svg",
        "type": "rect",
        "color": "#2196F3",
        "strokeColor": "#FFFFFF",
        "strokeWidth": 3.0
      }
    },
    {
      "layerId": "auto",
      "type": "icon",
      "visible": true,
      "order": 2,
      "position": {
        "x": 0.5,
        "y": 0.5
      },
      "scaleFactor": 0.35,
      "rotation": 0.0,
      "opacity": 1.0,
      "flip": {
        "horizontal": false,
        "vertical": false
      },
      "icon": {
        "src": "star-icon",
        "url": "https://cdn.example.com/icons/star-icon.svg",
        "color": "#FFFFFF"
      }
    },
    {
      "layerId": "auto",
      "type": "image",
      "visible": true,
      "order": 3,
      "position": {
        "x": 0.85,
        "y": 0.85
      },
      "scaleFactor": 0.25,
      "rotation": 15.0,
      "opacity": 0.9,
      "flip": {
        "horizontal": true,
        "vertical": false
      },
      "image": {
        "src": "leaf_watermark",
        "type": "imported",
        "path": "/images/leaf.png"
      }
    }
  ],
  "colorsUsed": [
    {
      "role": "text",
      "color": "#111111"
    },
    {
      "role": "shape",
      "color": "#2196F3"
    },
    {
      "role": "icon",
      "color": "#FFFFFF"
    }
  ],
  "alignments": {
    "verticalAlign": "center",
    "horizontalAlign": "center"
  },
  "responsive": {
    "version": "3.0",
    "description": "Fully responsive logo data",
    "scalingMethod": "scaleFactor",
    "positionMethod": "relative",
    "fullyResponsive": true
  },
  "metadata": {
    "createdAt": "2025-10-18T09:20:21.440004Z",
    "updatedAt": "2025-10-18T09:20:21.440013Z",
    "tags": [
      "logo",
      "complete",
      "spec",
      "example"
    ],
    "version": 3,
    "responsive": true
  },
  "export": {
    "format": "png",
    "transparentBackground": true,
    "quality": 100,
    "responsive": {
      "scalable": true,
      "maintainAspectRatio": true
    }
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "logoId": "generated-uuid",
    "templateId": null,
    "userId": "user-id",
    "name": "Complete Spec Example Logo",
    "description": "A comprehensive JSON covering all layer attributes and background variants per the Logo Maker API.",
    "categoryId": null,
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "gradient",
        "solidColor": "#FFFFFF",
        "gradient": {
          "type": "linear",
          "angle": 135,
          "stops": [
            {
              "offset": 0.0,
              "hex": "#667eea",
              "alpha": 1.0
            },
            {
              "offset": 0.5,
              "hex": "#5C7AEA",
              "alpha": 0.9
            },
            {
              "offset": 1.0,
              "hex": "#764ba2",
              "alpha": 1.0
            }
          ]
        },
        "image": {
          "type": "imported",
          "path": "/images/example-background.jpg"
        }
      }
    },
    "layers": [
      {
        "layerId": "generated-layer-id",
        "type": "text",
        "visible": true,
        "order": 0,
        "position": {
          "x": 0.5,
          "y": 0.25
        },
        "scaleFactor": 0.8,
        "rotation": -5.0,
        "opacity": 0.95,
        "flip": {
          "horizontal": false,
          "vertical": false
        },
        "text": {
          "value": "YOUR BRAND",
          "font": "Helvetica",
          "fontSize": 48,
          "fontColor": "#111111",
          "fontWeight": "bold",
          "fontStyle": "italic",
          "alignment": "center",
          "baseline": "alphabetic",
          "lineHeight": 1.1,
          "letterSpacing": 1.25,
          "fillAlpha": 1.0,
          "strokeHex": "#000000",
          "strokeAlpha": 0.5,
          "strokeWidth": 2,
          "strokeAlign": "center",
          "gradient": {
            "type": "linear",
            "angle": 45,
            "stops": [
              {
                "offset": 0,
                "hex": "#ff0000",
                "alpha": 1
              },
              {
                "offset": 1,
                "hex": "#0000ff",
                "alpha": 1
              }
            ]
          }
        }
      },
      {
        "layerId": "generated-layer-id",
        "type": "shape",
        "visible": true,
        "order": 1,
        "position": {
          "x": 0.5,
          "y": 0.5
        },
        "scaleFactor": 0.6,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {
          "horizontal": false,
          "vertical": false
        },
        "shape": {
          "src": "assets/local/Basic/13.svg",
          "type": "rect",
          "color": "#2196F3",
          "strokeColor": "#FFFFFF",
          "strokeWidth": 3.0
        }
      },
      {
        "layerId": "generated-layer-id",
        "type": "icon",
        "visible": true,
        "order": 2,
        "position": {
          "x": 0.5,
          "y": 0.5
        },
        "scaleFactor": 0.35,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {
          "horizontal": false,
          "vertical": false
        },
        "icon": {
          "src": "https://cdn.example.com/icons/star-icon.svg",
          "color": "#FFFFFF"
        }
      },
      {
        "layerId": "generated-layer-id",
        "type": "image",
        "visible": true,
        "order": 3,
        "position": {
          "x": 0.85,
          "y": 0.85
        },
        "scaleFactor": 0.25,
        "rotation": 15.0,
        "opacity": 0.9,
        "flip": {
          "horizontal": true,
          "vertical": false
        },
        "image": {
          "src": "leaf_watermark",
          "type": "imported",
          "path": "/images/leaf.png"
        }
      }
    ],
    "colorsUsed": [
      {
        "role": "text",
        "color": "#111111"
      },
      {
        "role": "shape",
        "color": "#2196F3"
      },
      {
        "role": "icon",
        "color": "#FFFFFF"
      }
    ],
    "alignments": {
      "verticalAlign": "center",
      "horizontalAlign": "center"
    },
    "responsive": {
      "version": "3.0",
      "description": "Fully responsive logo data",
      "scalingMethod": "scaleFactor",
      "positionMethod": "relative",
      "fullyResponsive": true
    },
    "metadata": {
      "createdAt": "2025-10-18T09:20:21.440004Z",
      "updatedAt": "2025-10-18T09:20:21.440013Z",
      "tags": [
        "logo",
        "complete",
        "spec",
        "example"
      ],
      "version": 3,
      "responsive": true
    },
    "export": {
      "format": "png",
      "transparentBackground": true,
      "quality": 100,
      "responsive": {
        "scalable": true,
        "maintainAspectRatio": true
      }
    }
  }
}
```

### 2. Get Logo with Enhanced Properties

**GET** `{{baseUrl}}/logo/{{logoId}}/mobile`

**Description**: Retrieves a logo with all enhanced layer properties including complete text properties, shape src, and icon URLs.

**Path Variables**:
- `logoId`: The UUID of the logo to retrieve

**Expected Response**: Same structure as the POST response above.

### 3. Get Logo List with Enhanced Properties

**GET** `{{baseUrl}}/logo/mobile`

**Description**: Retrieves a paginated list of logos with all enhanced layer properties.

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "logoId": "uuid",
      "templateId": null,
      "userId": "user-id",
      "name": "Logo Name",
      "description": "Logo description",
      "canvas": {
        "aspectRatio": 1.0,
        "background": {
          "type": "solid",
          "solidColor": "#ffffff",
          "gradient": null,
          "image": null
        }
      },
      "layers": [
        // Same layer structure as above with all enhanced properties
      ],
      "colorsUsed": [
        {
          "role": "text",
          "color": "#000000"
        }
      ],
      "alignments": {
        "verticalAlign": "center",
        "horizontalAlign": "center"
      },
      "responsive": {
        "version": "3.0",
        "description": "Fully responsive logo data",
        "scalingMethod": "scaleFactor",
        "positionMethod": "relative",
        "fullyResponsive": true
      },
      "metadata": {
        "createdAt": "2025-10-18T09:20:21.440004Z",
        "updatedAt": "2025-10-18T09:20:21.440013Z",
        "tags": [
          "logo",
          "design",
          "responsive"
        ],
        "version": 3,
        "responsive": true
      },
      "export": {
        "format": "png",
        "transparentBackground": true,
        "quality": 100,
        "responsive": {
          "scalable": true,
          "maintainAspectRatio": true
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 4. Get Logo Structured Format

**GET** `{{baseUrl}}/logo/{{logoId}}/mobile-structured`

**Description**: Retrieves a logo in the exact mobile JSON structure with all enhanced properties.

**Path Variables**:
- `logoId`: The UUID of the logo to retrieve

**Expected Response**: Same structure as the mobile format but with the exact structure expected by mobile clients.

## Layer Type Specifications

### Text Layer Enhanced Properties

```json
{
  "text": {
    "value": "Text content",
    "font": "Helvetica",
    "fontSize": 48,
    "fontColor": "#111111",
    "fontWeight": "bold",
    "fontStyle": "italic",
    "alignment": "center",
    "baseline": "alphabetic",
    "lineHeight": 1.1,
    "letterSpacing": 1.25,
    "fillAlpha": 1.0,
    "strokeHex": "#000000",
    "strokeAlpha": 0.5,
    "strokeWidth": 2,
    "strokeAlign": "center",
    "gradient": {
      "type": "linear",
      "angle": 45,
      "stops": [
        {
          "offset": 0,
          "hex": "#ff0000",
          "alpha": 1
        },
        {
          "offset": 1,
          "hex": "#0000ff",
          "alpha": 1
        }
      ]
    }
  }
}
```

### Shape Layer with Src Property

```json
{
  "shape": {
    "src": "assets/local/Basic/13.svg",
    "type": "rect",
    "color": "#2196F3",
    "strokeColor": "#FFFFFF",
    "strokeWidth": 3.0
  }
}
```

### Icon Layer with Library Support

```json
{
  "icon": {
    "src": "https://cdn.example.com/icons/star-icon.svg",
    "color": "#FFFFFF"
  }
}
```

**Note**: When creating icons, you can provide both `src` (identifier) and `url` (actual URL). The system will store the icon in the library and return the URL in responses.

## Testing Scenarios

### 1. Test Complete Text Properties

Create a logo with all text properties to verify they are all stored and returned:

```json
{
  "name": "Text Properties Test",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "solid",
      "solidColor": "#ffffff"
    }
  },
  "layers": [
    {
      "type": "text",
      "text": {
        "value": "Complete Text Test",
        "font": "Arial",
        "fontSize": 64,
        "fontColor": "#ff0000",
        "fontWeight": "bold",
        "fontStyle": "italic",
        "alignment": "center",
        "baseline": "alphabetic",
        "lineHeight": 1.2,
        "letterSpacing": 2.0,
        "fillAlpha": 0.8,
        "strokeHex": "#000000",
        "strokeAlpha": 0.5,
        "strokeWidth": 3,
        "strokeAlign": "center",
        "gradient": {
          "type": "linear",
          "angle": 90,
          "stops": [
            {"offset": 0, "hex": "#ff0000", "alpha": 1},
            {"offset": 1, "hex": "#0000ff", "alpha": 1}
          ]
        }
      }
    }
  ]
}
```

### 2. Test Shape with Src Property

Create a logo with a shape that has a local src path:

```json
{
  "name": "Shape Src Test",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "solid",
      "solidColor": "#ffffff"
    }
  },
  "layers": [
    {
      "type": "shape",
      "shape": {
        "src": "assets/local/Basic/13.svg",
        "type": "rect",
        "color": "#673ab7",
        "strokeColor": "#000000",
        "strokeWidth": 2
      }
    }
  ]
}
```

### 3. Test Icon Library

Create a logo with an icon that will be stored in the library:

```json
{
  "name": "Icon Library Test",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "solid",
      "solidColor": "#ffffff"
    }
  },
  "layers": [
    {
      "type": "icon",
      "icon": {
        "src": "heart-icon",
        "url": "https://cdn.example.com/icons/heart-icon.svg",
        "color": "#ff0000"
      }
    }
  ]
}
```

Then create another logo using the same icon to test reuse:

```json
{
  "name": "Icon Reuse Test",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "solid",
      "solidColor": "#ffffff"
    }
  },
  "layers": [
    {
      "type": "icon",
      "icon": {
        "src": "heart-icon",
        "url": "https://cdn.example.com/icons/heart-icon.svg",
        "color": "#00ff00"
      }
    }
  ]
}
```

## Error Handling

### Common Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "message": "name is required"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "message": "Logo not found"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "Failed to create logo"
}
```

## Postman Collection Setup

1. Create a new Postman collection named "Logo Maker API - Enhanced"
2. Add the base URL as an environment variable
3. Import all the requests above
4. Set up test scripts to verify responses contain all enhanced properties

### Test Script Example

Add this to the "Tests" tab of your requests:

```javascript
// Test that all text properties are present
pm.test("Text layer has all enhanced properties", function () {
    const responseJson = pm.response.json();
    if (responseJson.data && responseJson.data.layers) {
        const textLayer = responseJson.data.layers.find(layer => layer.type === 'text');
        if (textLayer) {
            const textProps = textLayer.text;
            pm.expect(textProps).to.have.property('fontSize');
            pm.expect(textProps).to.have.property('baseline');
            pm.expect(textProps).to.have.property('fillAlpha');
            pm.expect(textProps).to.have.property('strokeHex');
            pm.expect(textProps).to.have.property('strokeAlpha');
            pm.expect(textProps).to.have.property('strokeWidth');
            pm.expect(textProps).to.have.property('strokeAlign');
            pm.expect(textProps).to.have.property('gradient');
        }
    }
});

// Test that shape has src property
pm.test("Shape layer has src property", function () {
    const responseJson = pm.response.json();
    if (responseJson.data && responseJson.data.layers) {
        const shapeLayer = responseJson.data.layers.find(layer => layer.type === 'shape');
        if (shapeLayer) {
            pm.expect(shapeLayer.shape).to.have.property('src');
        }
    }
});

// Test that icon has URL
pm.test("Icon layer has URL", function () {
    const responseJson = pm.response.json();
    if (responseJson.data && responseJson.data.layers) {
        const iconLayer = responseJson.data.layers.find(layer => layer.type === 'icon');
        if (iconLayer) {
            pm.expect(iconLayer.icon.src).to.include('http');
        }
    }
});
```

This comprehensive documentation covers all the updates made to the Logo Maker API, including the enhanced text properties, shape src support, and icon library functionality.
