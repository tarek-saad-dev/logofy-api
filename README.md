# Logo Maker API

This is the backend for the Logo Maker app. It serves logos and their render layers, each linked to an asset. Use these endpoints from your frontend to render and manage logos.

## 🆕 What's New (Mobile-ready data + list endpoint)

- New paginated list endpoint returning the same mobile shape as `GET /api/logo/:id/mobile`:
  - `GET /api/logo/mobile?page=<number>&limit=<number>` (defaults: page=1, limit=20, max limit=100)
  - Response includes `data` (array of logos in mobile format) and `pagination` `{ page, limit, total, pages }`.
- Route ordering hardened: static routes are registered before parameterized ones to avoid `/mobile` being captured by `/:id`.
- Mobile mapping normalized:
  - All numeric fields are numbers (not strings): `position.x/y`, `scaleFactor`, `rotation`, `opacity`, text `lineHeight`/`letterSpacing`, shape `strokeWidth`.
  - IMAGE layers now use `{ type: 'imported', path }` for consistency with background images.
  - ICON layers ensure `src` falls back to `icon_<asset_id>` when `asset_name` is missing.
  - `colorsUsed` falls back to computed colors from layers when the DB `colors_used` array is empty.
- Schema note: IDs are UUID, so list joins use `ANY($1::uuid[])`.

Quick smoke tests

- Health:
  - PowerShell: `Invoke-RestMethod http://localhost:3000/health | ConvertTo-Json -Depth 4`
  - curl: `curl -s http://localhost:3000/health | jq`
- List (page 1):
  - `curl -s http://localhost:3000/api/logo/mobile | jq '.pagination, .data[0]'`
- List (page 2, limit 50):
  - `curl -s "http://localhost:3000/api/logo/mobile?page=2&limit=50" | jq '.pagination'`
- Single (mobile):
  - `curl -s http://localhost:3000/api/logo/<UUID>/mobile | jq '.logoId, .layers | length'`
- Single (structured):
  - `curl -s http://localhost:3000/api/logo/<UUID>/mobile-structured | jq '.responsive, .export'`

Uncommitted changes (working tree)

- Modified: `LOGO_MAKER_API.md`, `api/routes/logo.js`, `package.json`, `package-lock.json`
- Untracked (added):
  - `MOBILE_API_DOCUMENTATION.md`, `MOBILE_INTEGRATION_SUMMARY.md`
  - `api/config/add_mobile_fields.sql`, `api/config/add_mobile_fields_fixed.sql`, `api/config/run_mobile_migration.js`, `api/config/update_function.sql`
  - `api/routes/logo.js.backup`, `api/routes/logo_duplicate_issue.js`, `api/routes/logo_updated.js`
  - `manual_uuid_test.js`, `minimal_test.js`, `simple_test.js`, `test_mobile_endpoints.js`, `test_mobile_structured.js`, `uuid_test.js`

## Base URLs
- Local: `http://localhost:3000`
- Production: `https://logo-maker-endpoints.vercel.app`

## Auth
- No authentication required (you can add later if needed).

## Environment Variables
- `DATABASE_URL` (required)
- `CLOUDINARY_*` (optional, only if using upload endpoints):
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Data Model (simplified)
- `logos`: `{ id: UUID, title: string, created_at, updated_at }`
- `assets`: `{ id: UUID, url: string, default_x, default_y, default_scale, default_rotation, created_at, updated_at }`
- `logo_layers`: `{ id: UUID, logo_id: UUID, asset_id: UUID, x_norm: number, y_norm: number, scale: number, rotation: number, z_index: number, created_at, updated_at }`

## Endpoints

### Get a logo with its layers and asset data
GET `/api/logo/:id`

Response example:
```json
{
  "success": true,
  "data": {
    "id": "ba2b822e-70ea-4e6c-8c1d-9d1a12345678",
    "title": "My Logo",
    "created_at": "2025-09-20T12:34:56.000Z",
    "updated_at": "2025-09-21T08:15:30.000Z",
    "layers": [
      {
        "id": "9c0e2b3a-1d4b-4b2e-9b0a-abc123",
        "logo_id": "ba2b822e-70ea-4e6c-8c1d-9d1a12345678",
        "asset_id": "3a9f1e2c-7d4e-4f2b-9c1a-asset111",
        "x_norm": 0.52,
        "y_norm": 0.41,
        "scale": 1.1,
        "rotation": 0,
        "z_index": 0,
        "created_at": "2025-09-20T12:35:10.000Z",
        "updated_at": "2025-09-20T12:35:10.000Z",
        "asset": {
          "id": "3a9f1e2c-7d4e-4f2b-9c1a-asset111",
          "url": "https://res.cloudinary.com/demo/image/upload/sample.png",
          "default_x": 0.5,
          "default_y": 0.5,
          "default_scale": 1,
          "default_rotation": 0,
          "created_at": "2025-09-18T10:00:00.000Z",
          "updated_at": "2025-09-18T10:00:00.000Z"
        }
      }
    ]
  }
}
```

Front-end usage sketch (React):
```tsx
// Fetch
const res = await fetch(`/api/logo/${logoId}`);
const { data } = await res.json();

// Render
return (
  <Canvas>
    {data.layers.map(layer => (
      <Sprite
        key={layer.id}
        src={layer.asset.url}
        x={layer.x_norm}
        y={layer.y_norm}
        scale={layer.scale}
        rotation={layer.rotation}
        zIndex={layer.z_index}
      />
    ))}
  </Canvas>
);
```

Notes for rendering:
- `x_norm`, `y_norm` are normalized coordinates in [0, 1]. Multiply by canvas width/height to get pixels.
- Use `z_index` for stacking order.
- Fallback to asset defaults when a layer value is missing (e.g., initial placement).

### List logos
GET `/api/logos`

Response example:
```json
{
  "success": true,
  "data": [
    { "id": "ba2b822e-...", "title": "My Logo", "created_at": "...", "updated_at": "..." }
  ]
}
```

### Upload image (optional)
POST `/api/upload/image`
- multipart form-data: `image` file

Response example:
```json
{
  "success": true,
  "data": {
    "public_id": "starter-project/abc123",
    "secure_url": "https://res.cloudinary.com/.../image/upload/v.../abc123.png"
  }
}
```

---
# 🚀 Express.js Starter with Database & Storage

> **The Ultimate Backend Starter Template** - Ready-to-deploy Express.js API with PostgreSQL database and Cloudinary storage integration.

[![Deploy with Vercel](https://vercel.com/button)](https://logo-maker-endpoints.vercel.app)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.2-000000)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192-blue)](https://postgresql.org/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448FF-orange)](https://cloudinary.com/)

## 🎯 What You Get

This starter template provides everything you need to build a production-ready backend API:

- ✅ **Express.js** server with security middleware
- ✅ **PostgreSQL Database** with Neon integration
- ✅ **Cloudinary Storage** for image uploads
- ✅ **Database Models** with full CRUD operations
- ✅ **File Upload** endpoints with image processing
- ✅ **Pagination & Search** functionality
- ✅ **Vercel Deployment** ready
- ✅ **Environment Configuration**
- ✅ **Comprehensive Documentation**

## 🚀 Quick Start (5 Minutes)

### 1. Clone & Install
```bash
git clone https://github.com/Tarek-Saad/logo-maker-endpoints
cd express-starter-db-storage
npm install
```

### 2. Set Up Your Database
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your connection string

### 3. Set Up Cloudinary
1. Go to [Cloudinary Console](https://console.cloudinary.com/)
2. Copy your Cloudinary URL

### 4. Configure Environment
```bash
cp env.example .env
```

Edit `.env` with your credentials:
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Cloudinary Configuration  
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"

# Optional
ASSET_BASE_URL="https://your-cdn-url.com/"
NODE_ENV=development
PORT=3000
```

### 5. Initialize Database
```bash
npm run init-db
```

### 6. Start Development
```bash
npm run dev
```

🎉 **Your API is running at `http://localhost:3000`**

## 📚 API Documentation

### Base URL
- **Local**: `http://localhost:3000`
- **Production**: `https://your-app.vercel.app`

### Authentication
Currently no authentication required. Add JWT or OAuth as needed.

### Endpoints

#### 🏥 Health Check
```http
GET /
GET /health
```

#### 👥 Users API
```http
GET    /api/users              # Get all users (paginated)
GET    /api/users/:id          # Get user by ID
POST   /api/users              # Create new user
PUT    /api/users/:id          # Update user
DELETE /api/users/:id          # Delete user
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search by name or email

#### 📝 Posts API
```http
GET    /api/posts              # Get all posts (paginated)
GET    /api/posts/:id          # Get post by ID
POST   /api/posts              # Create new post
PUT    /api/posts/:id          # Update post
DELETE /api/posts/:id          # Delete post
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search by title or content
- `author` - Filter by author name

#### 📁 File Upload API
```http
POST   /api/upload/image       # Upload single image
POST   /api/upload/images      # Upload multiple images (max 5)
DELETE /api/upload/image/:id   # Delete image
GET    /api/upload/image/:id/url # Get image URL with transformations
```

## 🔧 Usage Examples

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

### Create a Post
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my post",
    "author_id": 1,
    "image_url": "https://example.com/image.jpg"
  }'
```

### Upload an Image
```bash
curl -X POST http://localhost:3000/api/upload/image \
  -F "image=@/path/to/your/image.jpg"
```

### Search Posts
```bash
curl "http://localhost:3000/api/posts?search=express&page=1&limit=10"
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Posts Table
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables:**
   ```bash
   vercel env add DATABASE_URL
   vercel env add CLOUDINARY_URL
   vercel env add ASSET_BASE_URL
   vercel env add NODE_ENV
   ```

### Deploy to Other Platforms

- **Railway**: Connect GitHub repo
- **Heroku**: Add buildpacks and environment variables
- **DigitalOcean**: Use App Platform
- **AWS**: Use Lambda or EC2

## 📁 Project Structure

```
├── api/
│   ├── config/
│   │   ├── database.js      # Database configuration
│   │   └── cloudinary.js    # Cloudinary configuration
│   ├── models/
│   │   ├── User.js          # User model with CRUD operations
│   │   └── Post.js          # Post model with CRUD operations
│   ├── routes/
│   │   ├── users.js         # User API endpoints
│   │   ├── posts.js         # Post API endpoints
│   │   └── upload.js        # File upload endpoints
│   └── index.js             # Main Express application
├── scripts/
│   └── init-db.js           # Database initialization script
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
├── vercel.json             # Vercel deployment configuration
└── README.md               # This file
```

## 🛠️ Development

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run init-db    # Initialize database tables
```

### Adding New Features

1. **New Model**: Create in `api/models/`
2. **New Routes**: Create in `api/routes/` and import in `api/index.js`
3. **New Config**: Add to `api/config/`

### Database Management

- **Initialize**: `npm run init-db`
- **Reset**: Drop tables and run init again
- **Migrations**: Add SQL files in `scripts/migrations/`

## 🔍 Advanced Features

### Pagination
All list endpoints support pagination:
```bash
GET /api/users?page=2&limit=5
```

### Search
Search across multiple fields:
```bash
GET /api/posts?search=javascript
GET /api/users?search=john
```

### Image Transformations
Get optimized image URLs:
```bash
GET /api/upload/image/:id/url?width=300&height=200&crop=fill&quality=auto
```

### Error Handling
Consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

## 🔧 Customization

### Change Database Provider
1. Update `DATABASE_URL` in `.env`
2. Modify connection settings in `api/config/database.js`

### Change Storage Provider
1. Update `CLOUDINARY_URL` in `.env`
2. Modify storage settings in `api/config/cloudinary.js`
3. Update upload routes in `api/routes/upload.js`

### Add Authentication
1. Install JWT: `npm install jsonwebtoken`
2. Create auth middleware
3. Protect routes as needed

### Add Validation
1. Install Joi: `npm install joi`
2. Create validation schemas
3. Add to route handlers

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed:**
- Check `DATABASE_URL` format
- Ensure database is accessible
- Verify SSL settings

**Cloudinary Upload Failed:**
- Check `CLOUDINARY_URL` format
- Verify API credentials
- Check file size limits

**Vercel Deployment Failed:**
- Check environment variables
- Verify build logs
- Ensure all dependencies are in `package.json`

### Getting Help

1. Check the [Issues](https://github.com/Tarek-Saad/logo-maker-endpoints/issues) page
2. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [PostgreSQL](https://postgresql.org/) - Database
- [Cloudinary](https://cloudinary.com/) - Image storage
- [Vercel](https://vercel.com/) - Deployment platform
- [Neon](https://neon.tech/) - Database hosting

## 📞 Support

- 📧 **Email**: tareksaad.dev@gmail.com
- 💬 **Discord**: [Join our community](https://discord.gg/sateenGD)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Tarek-Saad/logo-maker-endpoints/issues)

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

Made with ❤️ by Tarek (https://github.com/Tarek-Saad)

[⬆ Back to Top](#-expressjs-starter-with-database--storage)

</div>
