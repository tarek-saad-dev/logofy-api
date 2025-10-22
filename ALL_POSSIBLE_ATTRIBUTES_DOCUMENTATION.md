# Complete List of All Possible Attributes for Logo POST API

This document provides a comprehensive list of all possible attributes that can be included in the JSON payload when posting a logo to the mobile API endpoint.

## API Endpoint
```
POST /api/logo/mobile
```

## Root Level Attributes

### Required Attributes
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `name` | String | Primary logo name (fallback if name_en/name_ar not provided) | `"My Logo"` |
| `description` | String | Primary description (fallback if description_en/description_ar not provided) | `"A beautiful logo"` |

### Optional Identifiers
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `logoId` | String (UUID) | Specific logo ID - if not provided, auto-generated | `"12345678-1234-1234-1234-123456789abc"` |
| `templateId` | String (UUID) | Template ID if logo is based on a template | `"87654321-4321-4321-4321-cba987654321"` |
| `userId` | String | User email or UUID - if not provided, uses null | `"user@example.com"` |
| `categoryId` | String (UUID) | Category UUID for logo classification | `"11111111-1111-1111-1111-111111111111"` |

### Multilingual Support (All Optional)
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `name_en` | String | English name | `"My Logo"` |
| `name_ar` | String | Arabic name | `"شعاري"` |
| `description_en` | String | English description | `"A beautiful logo"` |
| `description_ar` | String | Arabic description | `"شعار جميل"` |
| `tags_en` | Array[String] | English tags array | `["design", "logo", "brand"]` |
| `tags_ar` | Array[String] | Arabic tags array | `["تصميم", "شعار", "علامة تجارية"]` |

## Canvas Configuration

### Required
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `canvas` | Object | Canvas configuration | See below |

### Canvas Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `aspectRatio` | Number | Yes | Width/height ratio | `1.0` (square), `1.5` (landscape), `0.75` (portrait) |
| `background` | Object | Yes | Background configuration | See below |

### Background Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `type` | String | Yes | Background type | `"solid"`, `"gradient"`, `"image"` |
| `solidColor` | String | No | Fallback color for solid backgrounds | `"#ffffff"` |
| `gradient` | Object | No | Gradient configuration | See below |
| `image` | Object | No | Background image configuration | See below |

### Gradient Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `angle` | Number | No | Gradient angle in degrees (0-360) | `135.0` |
| `stops` | Array | Yes | Array of gradient stops | See below |

### Gradient Stop Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `color` | String | Yes | Color in hex format | `"#667eea"` |
| `position` | Number | Yes | Position from 0.0 to 1.0 | `0.0` |

### Background Image Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `type` | String | No | Image type | `"imported"`, `"url"` |
| `path` | String | Yes | Image URL or path | `"https://example.com/bg.jpg"` |
| `src` | String | No | Image source identifier | `"background.jpg"` |

## Layers Array

### Required
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `layers` | Array | Array of layer objects (can be empty) | `[]` |

### Layer Common Properties (All Required)
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `type` | String | Layer type | `"background"`, `"text"`, `"shape"`, `"icon"`, `"image"` |
| `position` | Object | Layer position (normalized coordinates 0.0-1.0) | `{"x": 0.5, "y": 0.5}` |

### Layer Common Properties (All Optional)
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `layerId` | String (UUID) | Auto-generated | Specific layer ID | `"layer-001-0001-0001-0001-000000000001"` |
| `visible` | Boolean | `true` | Layer visibility | `true` |
| `order` | Number | `0` | Layer stacking order (lower numbers appear behind) | `0` |
| `scaleFactor` | Number | `1.0` | Scale multiplier | `1.0` |
| `rotation` | Number | `0` | Rotation in degrees | `0` |
| `opacity` | Number | `1.0` | Opacity from 0.0 to 1.0 | `1.0` |
| `flip` | Object | `{"horizontal": false, "vertical": false}` | Flip transformations | See below |

### Flip Object Properties
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `horizontal` | Boolean | `false` | Flip horizontally | `false` |
| `vertical` | Boolean | `false` | Flip vertically | `false` |

## Layer Type-Specific Properties

### Background Layer Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `background` | Object | Yes | Background configuration | See below |

#### Background Layer Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `type` | String | Yes | Background type | `"solid"`, `"gradient"`, `"image"` |
| `color` | String | Yes (if type is "solid") | Background color | `"#f8f9fa"` |
| `image` | Object | No | Background image object | See Background Image Object |
| `repeat` | String | No | Image repeat mode | `"repeat"`, `"no-repeat"`, `"repeat-x"`, `"repeat-y"` |
| `position` | String | No | Image position | `"top-left"`, `"top"`, `"top-right"`, `"left"`, `"center"`, `"right"`, `"bottom-left"`, `"bottom"`, `"bottom-right"` |
| `size` | String | No | Image size | `"auto"`, `"cover"`, `"contain"` |

### Text Layer Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `text` | Object | Yes | Text configuration | See below |

#### Text Layer Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `value` | String | Yes | Text content | `"Hello World"` |
| `font` | String | No | Font family | `"Arial"` |
| `fontSize` | Number | No | Font size in pixels | `48` |
| `fontColor` | String | No | Text color | `"#000000"` |
| `fontWeight` | String | No | Font weight | `"normal"`, `"bold"`, `"100"`, `"200"`, `"300"`, `"400"`, `"500"`, `"600"`, `"700"`, `"800"`, `"900"` |
| `fontStyle` | String | No | Font style | `"normal"`, `"italic"`, `"oblique"` |
| `alignment` | String | No | Text alignment | `"left"`, `"center"`, `"right"` |
| `baseline` | String | No | Text baseline | `"alphabetic"`, `"top"`, `"hanging"`, `"middle"`, `"ideographic"`, `"bottom"` |
| `lineHeight` | Number | No | Line height multiplier | `1.0` |
| `letterSpacing` | Number | No | Letter spacing in pixels | `0` |
| `fillAlpha` | Number | No | Fill opacity | `1.0` |
| `strokeHex` | String | No | Stroke color | `"#000000"` |
| `strokeAlpha` | Number | No | Stroke opacity | `1.0` |
| `strokeWidth` | Number | No | Stroke width in pixels | `2` |
| `strokeAlign` | String | No | Stroke alignment | `"inside"`, `"outside"`, `"center"` |
| `gradient` | Object | No | Text gradient | See Gradient Object |
| `underline` | Boolean | No | Underline text | `false` |
| `underlineDirection` | String | No | Underline direction | `"horizontal"`, `"vertical"` |
| `textCase` | String | No | Text case | `"normal"`, `"uppercase"`, `"lowercase"`, `"capitalize"` |
| `textDecoration` | String | No | Text decoration | `"none"`, `"underline"`, `"overline"`, `"line-through"` |
| `textTransform` | String | No | Text transform | `"none"`, `"uppercase"`, `"lowercase"`, `"capitalize"` |
| `fontVariant` | String | No | Font variant | `"normal"`, `"small-caps"` |

### Shape Layer Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `shape` | Object | Yes | Shape configuration | See below |

#### Shape Layer Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `type` | String | Yes | Shape type | `"rect"`, `"circle"`, `"ellipse"`, `"polygon"`, `"line"`, `"path"` |
| `color` | String | Yes | Fill color | `"#e74c3c"` |
| `src` | String | No | SVG path or URL for custom shapes | `"path/to/shape.svg"` |
| `strokeColor` | String | No | Stroke color | `"#c0392b"` |
| `strokeWidth` | Number | No | Stroke width in pixels | `3` |

### Icon Layer Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `icon` | Object | Yes | Icon configuration | See below |

#### Icon Layer Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `src` | String | Yes | Icon identifier or name | `"star-icon"` |
| `color` | String | No | Tint color | `"#f1c40f"` |
| `url` | String | No | Icon URL | `"https://example.com/icons/star.svg"` |

### Image Layer Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `image` | Object | Yes | Image configuration | See below |

#### Image Layer Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `path` | String | Yes | Image URL or path | `"https://example.com/image.jpg"` |
| `type` | String | No | Image type | `"imported"`, `"url"` |
| `src` | String | No | Image source identifier | `"image.jpg"` |

## Additional Optional Root Level Attributes

### Color Management
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `colorsUsed` | Array | Array of colors used in the logo | See below |

#### Color Object Properties
| Attribute | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `role` | String | Yes | Color role | `"text"`, `"icon"`, `"shape"`, `"background"` |
| `color` | String | Yes | Color in hex format | `"#000000"` |

### Alignment Settings
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `alignments` | Object | Alignment settings | See below |

#### Alignment Object Properties
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `verticalAlign` | String | `"center"` | Vertical alignment | `"top"`, `"center"`, `"bottom"` |
| `horizontalAlign` | String | `"center"` | Horizontal alignment | `"left"`, `"center"`, `"right"` |

### Responsive Settings
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `responsive` | Object | Responsive settings | See below |

#### Responsive Object Properties
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `version` | String | `"3.0"` | Responsive version | `"3.0"` |
| `description` | String | `"Fully responsive logo data - no absolute sizes stored"` | Responsive description | `"Fully responsive logo data"` |
| `scalingMethod` | String | `"scaleFactor"` | Scaling method | `"scaleFactor"`, `"viewport"` |
| `positionMethod` | String | `"relative"` | Position method | `"relative"`, `"absolute"` |
| `fullyResponsive` | Boolean | `true` | Whether logo is fully responsive | `true` |

### Metadata
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `metadata` | Object | Logo metadata | See below |

#### Metadata Object Properties
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `createdAt` | String (ISO 8601) | Current timestamp | Creation timestamp | `"2024-01-15T10:30:00.000Z"` |
| `updatedAt` | String (ISO 8601) | Current timestamp | Last update timestamp | `"2024-01-15T10:30:00.000Z"` |
| `tags` | Array[String] | `["logo", "design", "responsive"]` | Tags array | `["design", "logo", "brand"]` |
| `version` | Number | `3` | Logo version number | `3` |
| `responsive` | Boolean | `true` | Whether logo supports responsive behavior | `true` |
| `legacyFormat` | Boolean | `true` | Whether logo supports legacy format | `true` |
| `legacyVersion` | String | `"1.0"` | Legacy compatibility version | `"1.0"` |
| `mobileOptimized` | Boolean | `true` | Whether logo is optimized for mobile | `true` |

### Export Settings
| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `export` | Object | Export settings | See below |

#### Export Object Properties
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `format` | String | `"png"` | Export format | `"png"`, `"jpg"`, `"svg"`, `"pdf"` |
| `transparentBackground` | Boolean | `true` | Whether to use transparent background | `true` |
| `quality` | Number | `100` | Export quality 1-100 | `100` |
| `responsive` | Object | See below | Responsive export settings | See below |

#### Export Responsive Object Properties
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `scalable` | Boolean | `true` | Whether export is scalable | `true` |
| `maintainAspectRatio` | Boolean | `true` | Whether to maintain aspect ratio | `true` |

### Language and Direction
| Attribute | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `language` | String | `"en"` | Primary language | `"en"`, `"ar"` |
| `direction` | String | `"ltr"` | Text direction | `"ltr"`, `"rtl"` |

## Summary

- **Total Root Level Attributes**: 20+ attributes
- **Required Attributes**: 2 (name, description)
- **Layer Types Supported**: 5 (background, text, shape, icon, image)
- **Multilingual Support**: English and Arabic
- **Responsive Design**: Full support with multiple configuration options
- **Export Options**: Multiple formats with quality and responsive settings

## Example Usage

See `FINAL_COMPREHENSIVE_LOGO_JSON_CLEAN.json` for a complete working example with all possible attributes.
