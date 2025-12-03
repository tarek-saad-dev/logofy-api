#!/bin/bash

# Example cURL commands for Legacy Mobile Format Endpoints

# Replace LOGO_ID with your actual logo UUID
LOGO_ID="bdd8c50a-383c-44c4-a212-ede3c06e6102"
BASE_URL="http://localhost:3000"

# ============================================
# PATCH /api/logo/:id/mobile/legacy - Update Logo
# ============================================

# Basic update (name and description only)
echo "1. Basic Update:"
curl -X PATCH "${BASE_URL}/api/logo/${LOGO_ID}/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Logo Name",
    "description": "Updated description for the logo"
  }'

echo -e "\n\n"

# Partial update (only specific fields)
echo "2. Partial Update:"
curl -X PATCH "${BASE_URL}/api/logo/${LOGO_ID}/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Name Only",
    "categoryId": "e8a45f2f-0c09-43dd-9741-fca53a074be8"
  }'

echo -e "\n\n"

# Update with JSON file
echo "3. Update from JSON file:"
curl -X PATCH "${BASE_URL}/api/logo/${LOGO_ID}/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d @examples/patch-logo-legacy-complete.json

echo -e "\n\n"

# Update only layers
echo "4. Update layers only:"
curl -X PATCH "${BASE_URL}/api/logo/${LOGO_ID}/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d @examples/patch-logo-legacy-layers-only.json

echo -e "\n\n"

# Update with gradient background
echo "5. Update with gradient background:"
curl -X PATCH "${BASE_URL}/api/logo/${LOGO_ID}/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d '{
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "gradient",
        "solidColor": null,
        "gradient": {
          "angle": 90,
          "stops": [
            {
              "color": "#ff0000",
              "position": 0
            },
            {
              "color": "#0000ff",
              "position": 1
            }
          ]
        },
        "image": null
      }
    }
  }'

echo -e "\n\n"

# ============================================
# DELETE /api/logo/:id/mobile/legacy - Delete Logo
# ============================================

echo "6. Delete Logo:"
curl -X DELETE "${BASE_URL}/api/logo/${LOGO_ID}/mobile/legacy" \
  -H "Content-Type: application/json"

echo -e "\n\n"

