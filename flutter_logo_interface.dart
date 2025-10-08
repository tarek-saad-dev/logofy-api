/**
 * Logo Maker API - Flutter Integration Interface
 * 
 * This file contains comprehensive JSON interfaces and Dart classes
 * for integrating the Logo Maker API with Flutter applications.
 * 
 * Base URL: http://localhost:3000/api
 * Endpoints: POST /api/logo/mobile (recommended for Flutter)
 */

// ==============================================
// DART CLASSES FOR FLUTTER INTEGRATION
// ==============================================

class CreateLogoRequest {
  final String? logoId;
  final String? templateId;
  final String? userId;
  final String name;
  final String? description;
  final CanvasConfiguration canvas;
  final List<LayerDefinition> layers;
  final List<ColorUsage>? colorsUsed;
  final AlignmentSettings? alignments;
  final ResponsiveSettings? responsive;
  final LogoMetadata? metadata;
  final ExportSettings? export;

  CreateLogoRequest({
    this.logoId,
    this.templateId,
    this.userId,
    required this.name,
    this.description,
    required this.canvas,
    required this.layers,
    this.colorsUsed,
    this.alignments,
    this.responsive,
    this.metadata,
    this.export,
  });

  Map<String, dynamic> toJson() {
    return {
      if (logoId != null) 'logoId': logoId,
      if (templateId != null) 'templateId': templateId,
      if (userId != null) 'userId': userId,
      'name': name,
      if (description != null) 'description': description,
      'canvas': canvas.toJson(),
      'layers': layers.map((layer) => layer.toJson()).toList(),
      if (colorsUsed != null) 'colorsUsed': colorsUsed!.map((color) => color.toJson()).toList(),
      if (alignments != null) 'alignments': alignments!.toJson(),
      if (responsive != null) 'responsive': responsive!.toJson(),
      if (metadata != null) 'metadata': metadata!.toJson(),
      if (export != null) 'export': export!.toJson(),
    };
  }

  factory CreateLogoRequest.fromJson(Map<String, dynamic> json) {
    return CreateLogoRequest(
      logoId: json['logoId'],
      templateId: json['templateId'],
      userId: json['userId'],
      name: json['name'],
      description: json['description'],
      canvas: CanvasConfiguration.fromJson(json['canvas']),
      layers: (json['layers'] as List).map((layer) => LayerDefinition.fromJson(layer)).toList(),
      colorsUsed: json['colorsUsed'] != null 
          ? (json['colorsUsed'] as List).map((color) => ColorUsage.fromJson(color)).toList()
          : null,
      alignments: json['alignments'] != null ? AlignmentSettings.fromJson(json['alignments']) : null,
      responsive: json['responsive'] != null ? ResponsiveSettings.fromJson(json['responsive']) : null,
      metadata: json['metadata'] != null ? LogoMetadata.fromJson(json['metadata']) : null,
      export: json['export'] != null ? ExportSettings.fromJson(json['export']) : null,
    );
  }
}

class CanvasConfiguration {
  final double aspectRatio;
  final BackgroundConfiguration background;

  CanvasConfiguration({
    required this.aspectRatio,
    required this.background,
  });

  Map<String, dynamic> toJson() {
    return {
      'aspectRatio': aspectRatio,
      'background': background.toJson(),
    };
  }

  factory CanvasConfiguration.fromJson(Map<String, dynamic> json) {
    return CanvasConfiguration(
      aspectRatio: json['aspectRatio'].toDouble(),
      background: BackgroundConfiguration.fromJson(json['background']),
    );
  }
}

class BackgroundConfiguration {
  final String type; // 'solid', 'gradient', 'image'
  final String? solidColor;
  final GradientConfiguration? gradient;
  final ImageBackgroundConfiguration? image;

  BackgroundConfiguration({
    required this.type,
    this.solidColor,
    this.gradient,
    this.image,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      if (solidColor != null) 'solidColor': solidColor,
      if (gradient != null) 'gradient': gradient!.toJson(),
      if (image != null) 'image': image!.toJson(),
    };
  }

  factory BackgroundConfiguration.fromJson(Map<String, dynamic> json) {
    return BackgroundConfiguration(
      type: json['type'],
      solidColor: json['solidColor'],
      gradient: json['gradient'] != null ? GradientConfiguration.fromJson(json['gradient']) : null,
      image: json['image'] != null ? ImageBackgroundConfiguration.fromJson(json['image']) : null,
    );
  }
}

class GradientConfiguration {
  final String type; // 'linear', 'radial'
  final double? angle;
  final List<GradientStop> stops;

  GradientConfiguration({
    required this.type,
    this.angle,
    required this.stops,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      if (angle != null) 'angle': angle,
      'stops': stops.map((stop) => stop.toJson()).toList(),
    };
  }

  factory GradientConfiguration.fromJson(Map<String, dynamic> json) {
    return GradientConfiguration(
      type: json['type'],
      angle: json['angle']?.toDouble(),
      stops: (json['stops'] as List).map((stop) => GradientStop.fromJson(stop)).toList(),
    );
  }
}

class GradientStop {
  final double offset;
  final String hex;
  final double alpha;

  GradientStop({
    required this.offset,
    required this.hex,
    required this.alpha,
  });

  Map<String, dynamic> toJson() {
    return {
      'offset': offset,
      'hex': hex,
      'alpha': alpha,
    };
  }

  factory GradientStop.fromJson(Map<String, dynamic> json) {
    return GradientStop(
      offset: json['offset'].toDouble(),
      hex: json['hex'],
      alpha: json['alpha'].toDouble(),
    );
  }
}

class ImageBackgroundConfiguration {
  final String type; // 'imported', 'url'
  final String path;

  ImageBackgroundConfiguration({
    required this.type,
    required this.path,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'path': path,
    };
  }

  factory ImageBackgroundConfiguration.fromJson(Map<String, dynamic> json) {
    return ImageBackgroundConfiguration(
      type: json['type'],
      path: json['path'],
    );
  }
}

class LayerDefinition {
  final String? layerId;
  final String type; // 'text', 'shape', 'icon', 'image', 'background'
  final bool? visible;
  final int? order;
  final Position position;
  final double? scaleFactor;
  final double? rotation;
  final double? opacity;
  final FlipSettings? flip;
  final TextLayerProperties? text;
  final ShapeLayerProperties? shape;
  final IconLayerProperties? icon;
  final ImageLayerProperties? image;
  final BackgroundLayerProperties? background;

  LayerDefinition({
    this.layerId,
    required this.type,
    this.visible,
    this.order,
    required this.position,
    this.scaleFactor,
    this.rotation,
    this.opacity,
    this.flip,
    this.text,
    this.shape,
    this.icon,
    this.image,
    this.background,
  });

  Map<String, dynamic> toJson() {
    return {
      if (layerId != null) 'layerId': layerId,
      'type': type,
      if (visible != null) 'visible': visible,
      if (order != null) 'order': order,
      'position': position.toJson(),
      if (scaleFactor != null) 'scaleFactor': scaleFactor,
      if (rotation != null) 'rotation': rotation,
      if (opacity != null) 'opacity': opacity,
      if (flip != null) 'flip': flip!.toJson(),
      if (text != null) 'text': text!.toJson(),
      if (shape != null) 'shape': shape!.toJson(),
      if (icon != null) 'icon': icon!.toJson(),
      if (image != null) 'image': image!.toJson(),
      if (background != null) 'background': background!.toJson(),
    };
  }

  factory LayerDefinition.fromJson(Map<String, dynamic> json) {
    return LayerDefinition(
      layerId: json['layerId'],
      type: json['type'],
      visible: json['visible'],
      order: json['order'],
      position: Position.fromJson(json['position']),
      scaleFactor: json['scaleFactor']?.toDouble(),
      rotation: json['rotation']?.toDouble(),
      opacity: json['opacity']?.toDouble(),
      flip: json['flip'] != null ? FlipSettings.fromJson(json['flip']) : null,
      text: json['text'] != null ? TextLayerProperties.fromJson(json['text']) : null,
      shape: json['shape'] != null ? ShapeLayerProperties.fromJson(json['shape']) : null,
      icon: json['icon'] != null ? IconLayerProperties.fromJson(json['icon']) : null,
      image: json['image'] != null ? ImageLayerProperties.fromJson(json['image']) : null,
      background: json['background'] != null ? BackgroundLayerProperties.fromJson(json['background']) : null,
    );
  }
}

class Position {
  final double x;
  final double y;

  Position({required this.x, required this.y});

  Map<String, dynamic> toJson() {
    return {
      'x': x,
      'y': y,
    };
  }

  factory Position.fromJson(Map<String, dynamic> json) {
    return Position(
      x: json['x'].toDouble(),
      y: json['y'].toDouble(),
    );
  }
}

class FlipSettings {
  final bool horizontal;
  final bool vertical;

  FlipSettings({required this.horizontal, required this.vertical});

  Map<String, dynamic> toJson() {
    return {
      'horizontal': horizontal,
      'vertical': vertical,
    };
  }

  factory FlipSettings.fromJson(Map<String, dynamic> json) {
    return FlipSettings(
      horizontal: json['horizontal'],
      vertical: json['vertical'],
    );
  }
}

class TextLayerProperties {
  final String value;
  final String? font;
  final String? fontColor;
  final String? fontWeight;
  final String? fontStyle;
  final String? alignment;
  final double? lineHeight;
  final double? letterSpacing;

  TextLayerProperties({
    required this.value,
    this.font,
    this.fontColor,
    this.fontWeight,
    this.fontStyle,
    this.alignment,
    this.lineHeight,
    this.letterSpacing,
  });

  Map<String, dynamic> toJson() {
    return {
      'value': value,
      if (font != null) 'font': font,
      if (fontColor != null) 'fontColor': fontColor,
      if (fontWeight != null) 'fontWeight': fontWeight,
      if (fontStyle != null) 'fontStyle': fontStyle,
      if (alignment != null) 'alignment': alignment,
      if (lineHeight != null) 'lineHeight': lineHeight,
      if (letterSpacing != null) 'letterSpacing': letterSpacing,
    };
  }

  factory TextLayerProperties.fromJson(Map<String, dynamic> json) {
    return TextLayerProperties(
      value: json['value'],
      font: json['font'],
      fontColor: json['fontColor'],
      fontWeight: json['fontWeight'],
      fontStyle: json['fontStyle'],
      alignment: json['alignment'],
      lineHeight: json['lineHeight']?.toDouble(),
      letterSpacing: json['letterSpacing']?.toDouble(),
    );
  }
}

class ShapeLayerProperties {
  final String type; // 'rect', 'circle', 'ellipse', 'polygon', 'path', 'line'
  final String? color;
  final String? strokeColor;
  final double? strokeWidth;

  ShapeLayerProperties({
    required this.type,
    this.color,
    this.strokeColor,
    this.strokeWidth,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      if (color != null) 'color': color,
      if (strokeColor != null) 'strokeColor': strokeColor,
      if (strokeWidth != null) 'strokeWidth': strokeWidth,
    };
  }

  factory ShapeLayerProperties.fromJson(Map<String, dynamic> json) {
    return ShapeLayerProperties(
      type: json['type'],
      color: json['color'],
      strokeColor: json['strokeColor'],
      strokeWidth: json['strokeWidth']?.toDouble(),
    );
  }
}

class IconLayerProperties {
  final String src;
  final String? color;

  IconLayerProperties({
    required this.src,
    this.color,
  });

  Map<String, dynamic> toJson() {
    return {
      'src': src,
      if (color != null) 'color': color,
    };
  }

  factory IconLayerProperties.fromJson(Map<String, dynamic> json) {
    return IconLayerProperties(
      src: json['src'],
      color: json['color'],
    );
  }
}

class ImageLayerProperties {
  final String? src;
  final String? type;
  final String? path;

  ImageLayerProperties({
    this.src,
    this.type,
    this.path,
  });

  Map<String, dynamic> toJson() {
    return {
      if (src != null) 'src': src,
      if (type != null) 'type': type,
      if (path != null) 'path': path,
    };
  }

  factory ImageLayerProperties.fromJson(Map<String, dynamic> json) {
    return ImageLayerProperties(
      src: json['src'],
      type: json['type'],
      path: json['path'],
    );
  }
}

class BackgroundLayerProperties {
  final String type; // 'solid', 'gradient', 'image'
  final String? color;
  final ImageBackgroundConfiguration? image;

  BackgroundLayerProperties({
    required this.type,
    this.color,
    this.image,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      if (color != null) 'color': color,
      if (image != null) 'image': image!.toJson(),
    };
  }

  factory BackgroundLayerProperties.fromJson(Map<String, dynamic> json) {
    return BackgroundLayerProperties(
      type: json['type'],
      color: json['color'],
      image: json['image'] != null ? ImageBackgroundConfiguration.fromJson(json['image']) : null,
    );
  }
}

class ColorUsage {
  final String role; // 'text', 'icon', 'shape', 'background'
  final String color;

  ColorUsage({required this.role, required this.color});

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'color': color,
    };
  }

  factory ColorUsage.fromJson(Map<String, dynamic> json) {
    return ColorUsage(
      role: json['role'],
      color: json['color'],
    );
  }
}

class AlignmentSettings {
  final String? verticalAlign; // 'top', 'center', 'bottom'
  final String? horizontalAlign; // 'left', 'center', 'right'

  AlignmentSettings({
    this.verticalAlign,
    this.horizontalAlign,
  });

  Map<String, dynamic> toJson() {
    return {
      if (verticalAlign != null) 'verticalAlign': verticalAlign,
      if (horizontalAlign != null) 'horizontalAlign': horizontalAlign,
    };
  }

  factory AlignmentSettings.fromJson(Map<String, dynamic> json) {
    return AlignmentSettings(
      verticalAlign: json['verticalAlign'],
      horizontalAlign: json['horizontalAlign'],
    );
  }
}

class ResponsiveSettings {
  final String? version;
  final String? description;
  final String? scalingMethod; // 'scaleFactor', 'absolute', 'relative'
  final String? positionMethod; // 'relative', 'absolute'
  final bool? fullyResponsive;

  ResponsiveSettings({
    this.version,
    this.description,
    this.scalingMethod,
    this.positionMethod,
    this.fullyResponsive,
  });

  Map<String, dynamic> toJson() {
    return {
      if (version != null) 'version': version,
      if (description != null) 'description': description,
      if (scalingMethod != null) 'scalingMethod': scalingMethod,
      if (positionMethod != null) 'positionMethod': positionMethod,
      if (fullyResponsive != null) 'fullyResponsive': fullyResponsive,
    };
  }

  factory ResponsiveSettings.fromJson(Map<String, dynamic> json) {
    return ResponsiveSettings(
      version: json['version'],
      description: json['description'],
      scalingMethod: json['scalingMethod'],
      positionMethod: json['positionMethod'],
      fullyResponsive: json['fullyResponsive'],
    );
  }
}

class LogoMetadata {
  final String? createdAt;
  final String? updatedAt;
  final List<String>? tags;
  final int? version;
  final bool? responsive;

  LogoMetadata({
    this.createdAt,
    this.updatedAt,
    this.tags,
    this.version,
    this.responsive,
  });

  Map<String, dynamic> toJson() {
    return {
      if (createdAt != null) 'createdAt': createdAt,
      if (updatedAt != null) 'updatedAt': updatedAt,
      if (tags != null) 'tags': tags,
      if (version != null) 'version': version,
      if (responsive != null) 'responsive': responsive,
    };
  }

  factory LogoMetadata.fromJson(Map<String, dynamic> json) {
    return LogoMetadata(
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      version: json['version'],
      responsive: json['responsive'],
    );
  }
}

class ExportSettings {
  final String? format; // 'png', 'svg', 'jpg', 'jpeg', 'webp'
  final bool? transparentBackground;
  final int? quality;
  final ResponsiveExportSettings? responsive;

  ExportSettings({
    this.format,
    this.transparentBackground,
    this.quality,
    this.responsive,
  });

  Map<String, dynamic> toJson() {
    return {
      if (format != null) 'format': format,
      if (transparentBackground != null) 'transparentBackground': transparentBackground,
      if (quality != null) 'quality': quality,
      if (responsive != null) 'responsive': responsive!.toJson(),
    };
  }

  factory ExportSettings.fromJson(Map<String, dynamic> json) {
    return ExportSettings(
      format: json['format'],
      transparentBackground: json['transparentBackground'],
      quality: json['quality'],
      responsive: json['responsive'] != null ? ResponsiveExportSettings.fromJson(json['responsive']) : null,
    );
  }
}

class ResponsiveExportSettings {
  final bool? scalable;
  final bool? maintainAspectRatio;

  ResponsiveExportSettings({
    this.scalable,
    this.maintainAspectRatio,
  });

  Map<String, dynamic> toJson() {
    return {
      if (scalable != null) 'scalable': scalable,
      if (maintainAspectRatio != null) 'maintainAspectRatio': maintainAspectRatio,
    };
  }

  factory ResponsiveExportSettings.fromJson(Map<String, dynamic> json) {
    return ResponsiveExportSettings(
      scalable: json['scalable'],
      maintainAspectRatio: json['maintainAspectRatio'],
    );
  }
}

// ==============================================
// RESPONSE CLASSES
// ==============================================

class LogoCreationResponse {
  final bool success;
  final LogoData? data;
  final String? message;

  LogoCreationResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory LogoCreationResponse.fromJson(Map<String, dynamic> json) {
    return LogoCreationResponse(
      success: json['success'],
      data: json['data'] != null ? LogoData.fromJson(json['data']) : null,
      message: json['message'],
    );
  }
}

class LogoData {
  final String logoId;
  final String? templateId;
  final String? userId;
  final String name;
  final String? description;
  final CanvasConfiguration canvas;
  final List<LayerDefinition> layers;
  final List<ColorUsage> colorsUsed;
  final AlignmentSettings alignments;
  final ResponsiveSettings responsive;
  final LogoMetadata metadata;
  final ExportSettings export;

  LogoData({
    required this.logoId,
    this.templateId,
    this.userId,
    required this.name,
    this.description,
    required this.canvas,
    required this.layers,
    required this.colorsUsed,
    required this.alignments,
    required this.responsive,
    required this.metadata,
    required this.export,
  });

  factory LogoData.fromJson(Map<String, dynamic> json) {
    return LogoData(
      logoId: json['logoId'],
      templateId: json['templateId'],
      userId: json['userId'],
      name: json['name'],
      description: json['description'],
      canvas: CanvasConfiguration.fromJson(json['canvas']),
      layers: (json['layers'] as List).map((layer) => LayerDefinition.fromJson(layer)).toList(),
      colorsUsed: (json['colorsUsed'] as List).map((color) => ColorUsage.fromJson(color)).toList(),
      alignments: AlignmentSettings.fromJson(json['alignments']),
      responsive: ResponsiveSettings.fromJson(json['responsive']),
      metadata: LogoMetadata.fromJson(json['metadata']),
      export: ExportSettings.fromJson(json['export']),
    );
  }
}

// ==============================================
// FLUTTER API SERVICE CLASS
// ==============================================

class LogoApiService {
  static const String baseUrl = 'http://localhost:3000/api';
  
  static Future<LogoCreationResponse> createLogo(CreateLogoRequest request) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/logo/mobile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(request.toJson()),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return LogoCreationResponse.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to create logo: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error creating logo: $e');
    }
  }

  static Future<LogoData> getLogo(String logoId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/logo/$logoId/mobile'),
      );

      if (response.statusCode == 200) {
        return LogoData.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to get logo: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting logo: $e');
    }
  }

  static Future<String> exportLogoAsPng(String logoId, {
    int width = 1920,
    int height = 1920,
    int dpi = 300,
    int quality = 95,
  }) async {
    final params = {
      'width': width.toString(),
      'height': height.toString(),
      'dpi': dpi.toString(),
      'quality': quality.toString(),
    };
    
    final uri = Uri.parse('$baseUrl/logo/$logoId/export.png').replace(queryParameters: params);
    return uri.toString();
  }

  static Future<String> exportLogoAsSvg(String logoId, {
    int width = 1920,
    int height = 1920,
  }) async {
    final params = {
      'width': width.toString(),
      'height': height.toString(),
    };
    
    final uri = Uri.parse('$baseUrl/logo/$logoId/export.svg').replace(queryParameters: params);
    return uri.toString();
  }

  static Future<String> getLogoThumbnail(String logoId, {
    int width = 300,
    int height = 300,
  }) async {
    final params = {
      'width': width.toString(),
      'height': height.toString(),
    };
    
    final uri = Uri.parse('$baseUrl/logo/$logoId/thumbnail').replace(queryParameters: params);
    return uri.toString();
  }
}

// ==============================================
// JSON EXAMPLES FOR FLUTTER
// ==============================================

class FlutterLogoExamples {
  
  /// Example 1: Simple Text Logo
  static Map<String, dynamic> get simpleTextLogo => {
    "name": "Flutter Text Logo",
    "description": "Simple text-based logo for Flutter app",
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
        "visible": true,
        "order": 0,
        "position": {"x": 0.5, "y": 0.5},
        "scaleFactor": 1.0,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "text": {
          "value": "FLUTTER",
          "font": "Arial",
          "fontColor": "#2196F3",
          "fontWeight": "bold",
          "fontStyle": "normal",
          "alignment": "center",
          "lineHeight": 1.0,
          "letterSpacing": 0
        }
      }
    ],
    "colorsUsed": [
      {"role": "text", "color": "#2196F3"}
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
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "tags": ["logo", "flutter", "text"],
      "version": 1,
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
  };

  /// Example 2: Logo with Icon and Text
  static Map<String, dynamic> get iconTextLogo => {
    "name": "Flutter App Logo",
    "description": "Modern logo with icon and text for Flutter app",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "gradient",
        "gradient": {
          "type": "linear",
          "angle": 135,
          "stops": [
            {"offset": 0, "hex": "#667eea", "alpha": 1},
            {"offset": 1, "hex": "#764ba2", "alpha": 1}
          ]
        }
      }
    },
    "layers": [
      {
        "type": "icon",
        "visible": true,
        "order": 0,
        "position": {"x": 0.5, "y": 0.4},
        "scaleFactor": 0.3,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "icon": {
          "src": "flutter_icon",
          "color": "#ffffff"
        }
      },
      {
        "type": "text",
        "visible": true,
        "order": 1,
        "position": {"x": 0.5, "y": 0.7},
        "scaleFactor": 0.8,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "text": {
          "value": "MY APP",
          "font": "Helvetica",
          "fontColor": "#ffffff",
          "fontWeight": "bold",
          "fontStyle": "normal",
          "alignment": "center",
          "lineHeight": 1.0,
          "letterSpacing": 1
        }
      }
    ],
    "colorsUsed": [
      {"role": "icon", "color": "#ffffff"},
      {"role": "text", "color": "#ffffff"}
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
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "tags": ["logo", "flutter", "app", "modern"],
      "version": 1,
      "responsive": true
    },
    "export": {
      "format": "png",
      "transparentBackground": false,
      "quality": 100,
      "responsive": {
        "scalable": true,
        "maintainAspectRatio": true
      }
    }
  };

  /// Example 3: Complex Multi-Layer Logo
  static Map<String, dynamic> get complexLogo => {
    "name": "Premium Flutter Logo",
    "description": "Complex logo with multiple layers for premium Flutter app",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#f8f9fa"
      }
    },
    "layers": [
      {
        "type": "shape",
        "visible": true,
        "order": 0,
        "position": {"x": 0.5, "y": 0.5},
        "scaleFactor": 0.8,
        "rotation": 0.0,
        "opacity": 0.1,
        "flip": {"horizontal": false, "vertical": false},
        "shape": {
          "type": "circle",
          "color": "#000000",
          "strokeColor": null,
          "strokeWidth": 0
        }
      },
      {
        "type": "shape",
        "visible": true,
        "order": 1,
        "position": {"x": 0.5, "y": 0.5},
        "scaleFactor": 0.6,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "shape": {
          "type": "rect",
          "color": "#2196F3",
          "strokeColor": "#ffffff",
          "strokeWidth": 3
        }
      },
      {
        "type": "icon",
        "visible": true,
        "order": 2,
        "position": {"x": 0.5, "y": 0.5},
        "scaleFactor": 0.4,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "icon": {
          "src": "star_icon",
          "color": "#ffffff"
        }
      },
      {
        "type": "text",
        "visible": true,
        "order": 3,
        "position": {"x": 0.5, "y": 0.8},
        "scaleFactor": 0.6,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "text": {
          "value": "PREMIUM",
          "font": "Arial",
          "fontColor": "#2196F3",
          "fontWeight": "bold",
          "fontStyle": "normal",
          "alignment": "center",
          "lineHeight": 1.0,
          "letterSpacing": 2
        }
      }
    ],
    "colorsUsed": [
      {"role": "shape", "color": "#000000"},
      {"role": "shape", "color": "#2196F3"},
      {"role": "icon", "color": "#ffffff"},
      {"role": "text", "color": "#2196F3"}
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
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "tags": ["logo", "flutter", "premium", "complex"],
      "version": 1,
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
  };

  /// Example 4: Logo with Image Background
  static Map<String, dynamic> get imageBackgroundLogo => {
    "name": "Nature Flutter Logo",
    "description": "Logo with nature-themed background for Flutter app",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "image",
        "image": {
          "type": "imported",
          "path": "/data/user/0/com.example.flutterapp/cache/nature-background.jpg"
        }
      }
    },
    "layers": [
      {
        "type": "shape",
        "visible": true,
        "order": 0,
        "position": {"x": 0.5, "y": 0.5},
        "scaleFactor": 0.7,
        "rotation": 0.0,
        "opacity": 0.8,
        "flip": {"horizontal": false, "vertical": false},
        "shape": {
          "type": "circle",
          "color": "#ffffff",
          "strokeColor": "#4CAF50",
          "strokeWidth": 4
        }
      },
      {
        "type": "text",
        "visible": true,
        "order": 1,
        "position": {"x": 0.5, "y": 0.5},
        "scaleFactor": 0.8,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "text": {
          "value": "NATURE",
          "font": "Georgia",
          "fontColor": "#4CAF50",
          "fontWeight": "bold",
          "fontStyle": "normal",
          "alignment": "center",
          "lineHeight": 1.0,
          "letterSpacing": 1
        }
      }
    ],
    "colorsUsed": [
      {"role": "shape", "color": "#ffffff"},
      {"role": "text", "color": "#4CAF50"}
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
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "tags": ["logo", "flutter", "nature", "green"],
      "version": 1,
      "responsive": true
    },
    "export": {
      "format": "png",
      "transparentBackground": false,
      "quality": 100,
      "responsive": {
        "scalable": true,
        "maintainAspectRatio": true
      }
    }
  };

  /// Example 5: Mobile-Optimized Logo
  static Map<String, dynamic> get mobileOptimizedLogo => {
    "logoId": "1759094821977",
    "userId": "flutter_user_123",
    "name": "Mobile Flutter Logo",
    "description": "Optimized for mobile Flutter applications",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#ffffff"
      }
    },
    "layers": [
      {
        "layerId": "1759074588677",
        "type": "icon",
        "visible": true,
        "order": 0,
        "position": {"x": 0.25, "y": 0.5},
        "scaleFactor": 0.15,
        "rotation": -25.0,
        "opacity": 1.0,
        "flip": {"horizontal": true, "vertical": true},
        "icon": {
          "src": "icon_58873",
          "color": "#ffc107"
        }
      },
      {
        "layerId": "1759074588679",
        "type": "text",
        "visible": true,
        "order": 1,
        "position": {"x": 0.75, "y": 0.5},
        "scaleFactor": 0.28,
        "rotation": 0.0,
        "opacity": 1.0,
        "flip": {"horizontal": false, "vertical": false},
        "text": {
          "value": "flutter",
          "font": "Courier New",
          "fontColor": "#e91e63",
          "fontWeight": "900",
          "fontStyle": "normal",
          "alignment": "center",
          "lineHeight": 1.0,
          "letterSpacing": -2.5
        }
      }
    ],
    "colorsUsed": [
      {"role": "icon", "color": "#ffc107"},
      {"role": "text", "color": "#e91e63"}
    ],
    "alignments": {
      "verticalAlign": "center",
      "horizontalAlign": "center"
    },
    "responsive": {
      "version": "3.0",
      "description": "Fully responsive logo data - no absolute sizes stored",
      "scalingMethod": "scaleFactor",
      "positionMethod": "relative",
      "fullyResponsive": true
    },
    "metadata": {
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "tags": ["logo", "flutter", "mobile", "responsive"],
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
  };
}

// ==============================================
// FLUTTER USAGE EXAMPLES
// ==============================================

class FlutterUsageExamples {
  
  /// Example: Creating a logo using Dart classes
  static CreateLogoRequest createSimpleLogo() {
    return CreateLogoRequest(
      name: "My Flutter Logo",
      description: "Created with Flutter",
      canvas: CanvasConfiguration(
        aspectRatio: 1.0,
        background: BackgroundConfiguration(
          type: "solid",
          solidColor: "#ffffff",
        ),
      ),
      layers: [
        LayerDefinition(
          type: "text",
          position: Position(x: 0.5, y: 0.5),
          text: TextLayerProperties(
            value: "FLUTTER",
            fontColor: "#2196F3",
            fontWeight: "bold",
            alignment: "center",
          ),
        ),
      ],
      colorsUsed: [
        ColorUsage(role: "text", color: "#2196F3"),
      ],
      alignments: AlignmentSettings(
        verticalAlign: "center",
        horizontalAlign: "center",
      ),
      responsive: ResponsiveSettings(
        version: "3.0",
        scalingMethod: "scaleFactor",
        positionMethod: "relative",
        fullyResponsive: true,
      ),
      metadata: LogoMetadata(
        tags: ["logo", "flutter"],
        version: 1,
        responsive: true,
      ),
      export: ExportSettings(
        format: "png",
        transparentBackground: true,
        quality: 100,
      ),
    );
  }

  /// Example: Creating a logo using JSON
  static Future<void> createLogoFromJson() async {
    try {
      final logoJson = FlutterLogoExamples.simpleTextLogo;
      final request = CreateLogoRequest.fromJson(logoJson);
      final response = await LogoApiService.createLogo(request);
      
      if (response.success) {
        print('Logo created successfully: ${response.data?.logoId}');
      } else {
        print('Failed to create logo: ${response.message}');
      }
    } catch (e) {
      print('Error creating logo: $e');
    }
  }

  /// Example: Getting and displaying a logo
  static Future<void> getAndDisplayLogo(String logoId) async {
    try {
      final logo = await LogoApiService.getLogo(logoId);
      print('Logo name: ${logo.name}');
      print('Logo description: ${logo.description}');
      print('Number of layers: ${logo.layers.length}');
      
      // Get export URLs
      final pngUrl = await LogoApiService.exportLogoAsPng(logoId);
      final svgUrl = await LogoApiService.exportLogoAsSvg(logoId);
      final thumbnailUrl = await LogoApiService.getLogoThumbnail(logoId);
      
      print('PNG URL: $pngUrl');
      print('SVG URL: $svgUrl');
      print('Thumbnail URL: $thumbnailUrl');
    } catch (e) {
      print('Error getting logo: $e');
    }
  }
}

// ==============================================
// VALIDATION UTILITIES
// ==============================================

class LogoValidation {
  
  static bool isValidHexColor(String color) {
    return RegExp(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$').hasMatch(color);
  }
  
  static bool isValidPosition(double value) {
    return value >= 0 && value <= 1;
  }
  
  static bool isValidOpacity(double value) {
    return value >= 0 && value <= 1;
  }
  
  static bool isValidScale(double value) {
    return value > 0;
  }
  
  static List<String> validateLogoRequest(CreateLogoRequest request) {
    final errors = <String>[];
    
    // Required fields
    if (request.name.trim().isEmpty) {
      errors.add('Logo name is required');
    }
    
    if (request.canvas.aspectRatio <= 0) {
      errors.add('Canvas aspect ratio must be positive');
    }
    
    if (request.layers.isEmpty) {
      errors.add('At least one layer is required');
    }
    
    // Validate layers
    for (int i = 0; i < request.layers.length; i++) {
      final layer = request.layers[i];
      
      if (!isValidPosition(layer.position.x) || !isValidPosition(layer.position.y)) {
        errors.add('Layer $i: position must be between 0 and 1');
      }
      
      if (layer.opacity != null && !isValidOpacity(layer.opacity!)) {
        errors.add('Layer $i: opacity must be between 0 and 1');
      }
      
      if (layer.scaleFactor != null && !isValidScale(layer.scaleFactor!)) {
        errors.add('Layer $i: scale factor must be positive');
      }
      
      // Validate type-specific properties
      if (layer.type == 'text' && layer.text != null) {
        if (layer.text!.value.trim().isEmpty) {
          errors.add('Layer $i: text value is required');
        }
        if (layer.text!.fontColor != null && !isValidHexColor(layer.text!.fontColor!)) {
          errors.add('Layer $i: invalid text color format');
        }
      }
      
      if (layer.type == 'shape' && layer.shape != null) {
        if (layer.shape!.color != null && !isValidHexColor(layer.shape!.color!)) {
          errors.add('Layer $i: invalid shape color format');
        }
        if (layer.shape!.strokeColor != null && !isValidHexColor(layer.shape!.strokeColor!)) {
          errors.add('Layer $i: invalid stroke color format');
        }
      }
      
      if (layer.type == 'icon' && layer.icon != null) {
        if (layer.icon!.color != null && !isValidHexColor(layer.icon!.color!)) {
          errors.add('Layer $i: invalid icon color format');
        }
      }
    }
    
    // Validate colors used
    if (request.colorsUsed != null) {
      for (int i = 0; i < request.colorsUsed!.length; i++) {
        if (!isValidHexColor(request.colorsUsed![i].color)) {
          errors.add('Color $i: invalid color format');
        }
      }
    }
    
    return errors;
  }
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

class LogoHelpers {
  
  static String generateLogoId() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }
  
  static String generateLayerId() {
    return '${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecond}';
  }
  
  static CanvasConfiguration createDefaultCanvas({double aspectRatio = 1.0}) {
    return CanvasConfiguration(
      aspectRatio: aspectRatio,
      background: BackgroundConfiguration(
        type: "solid",
        solidColor: "#ffffff",
      ),
    );
  }
  
  static LayerDefinition createTextLayer(String text, {
    Position? position,
    double? scaleFactor,
    String? fontColor,
    String? font,
    String? fontWeight,
    String? alignment,
  }) {
    return LayerDefinition(
      type: "text",
      position: position ?? Position(x: 0.5, y: 0.5),
      scaleFactor: scaleFactor ?? 1.0,
      text: TextLayerProperties(
        value: text,
        font: font ?? "Arial",
        fontColor: fontColor ?? "#000000",
        fontWeight: fontWeight ?? "normal",
        alignment: alignment ?? "center",
      ),
    );
  }
  
  static LayerDefinition createShapeLayer(String shapeType, {
    Position? position,
    double? scaleFactor,
    String? color,
    String? strokeColor,
    double? strokeWidth,
  }) {
    return LayerDefinition(
      type: "shape",
      position: position ?? Position(x: 0.5, y: 0.5),
      scaleFactor: scaleFactor ?? 1.0,
      shape: ShapeLayerProperties(
        type: shapeType,
        color: color ?? "#000000",
        strokeColor: strokeColor,
        strokeWidth: strokeWidth ?? 0,
      ),
    );
  }
  
  static LayerDefinition createIconLayer(String iconSrc, {
    Position? position,
    double? scaleFactor,
    String? color,
  }) {
    return LayerDefinition(
      type: "icon",
      position: position ?? Position(x: 0.5, y: 0.5),
      scaleFactor: scaleFactor ?? 1.0,
      icon: IconLayerProperties(
        src: iconSrc,
        color: color ?? "#000000",
      ),
    );
  }
}

// ==============================================
// REQUIRED IMPORTS FOR FLUTTER
// ==============================================

/*
Add these imports to your Flutter pubspec.yaml:

dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  json_annotation: ^4.8.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  json_serializable: ^6.7.1
  build_runner: ^2.4.7

Then run: flutter packages get
And: dart run build_runner build
*/
