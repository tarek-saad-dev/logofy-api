const fs = require('fs');

// Read the current logo.js file
const content = fs.readFileSync('api/routes/logo.js', 'utf8');

// Find the line with "// LOGO CRUD OPERATIONS"
const lines = content.split('\n');
const logoCrudIndex = lines.findIndex(line => line.includes('// LOGO CRUD OPERATIONS'));

if (logoCrudIndex === -1) {
  console.error('Could not find LOGO CRUD OPERATIONS section');
  process.exit(1);
}

// Extract the library routes (from ICON LIBRARY ENDPOINTS to the end)
const iconLibraryIndex = lines.findIndex(line => line.includes('// ICON LIBRARY ENDPOINTS'));
if (iconLibraryIndex === -1) {
  console.error('Could not find ICON LIBRARY ENDPOINTS section');
  process.exit(1);
}

// Get all library routes
const libraryRoutes = lines.slice(iconLibraryIndex);

// Remove the library routes from their current position
const beforeLibrary = lines.slice(0, iconLibraryIndex);
const afterLibrary = lines.slice(iconLibraryIndex + libraryRoutes.length);

// Insert library routes before LOGO CRUD OPERATIONS
const newContent = [
  ...beforeLibrary,
  ...afterLibrary.slice(0, logoCrudIndex - iconLibraryIndex),
  ...libraryRoutes,
  ...afterLibrary.slice(logoCrudIndex - iconLibraryIndex)
].join('\n');

// Write the fixed content
fs.writeFileSync('api/routes/logo.js', newContent);
console.log('Fixed route ordering in logo.js');
