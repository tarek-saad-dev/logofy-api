const express = require('express');
const { query } = require('./api/config/database');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb', strict: false }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ========== ICONS ==========
// GET icons (basic with filters)
app.get('/api/logo/icons', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, type, search, tags } = req.query;
    const offset = (page - 1) * limit;

    let where = `ai.kind IN ('vector','raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)`;
    const params = [];

    if (category) {
      params.push(category);
      where += ` AND ai.meta->>'category' = $${params.length}`;
    }
    if (type) {
      params.push(type);
      where += ` AND ai.kind = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (ai.name ILIKE $${params.length} OR ai.meta->>'description' ILIKE $${params.length})`;
    }
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagArray.length > 0) {
        params.push(JSON.stringify(tagArray));
        where += ` AND ai.meta->'tags' @> $${params.length}`;
      }
    }

    const dataQuery = `
      SELECT ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex, ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ${where}
      ORDER BY ai.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM assets ai
      WHERE ${where}
    `;

    const dataParams = [...params, Number(limit), Number(offset)];
    const [iconsRes, countRes] = await Promise.all([
      query(dataQuery, dataParams),
      query(countQuery, params)
    ]);

    const icons = iconsRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      url: r.url,
      type: r.kind,
      width: r.width,
      height: r.height,
      hasAlpha: r.has_alpha,
      vectorSvg: r.vector_svg,
      category: r.meta?.category || 'general',
      tags: r.meta?.tags || [],
      description: r.meta?.description || '',
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    res.json({ success: true, data: icons, pagination: { page: Number(page), limit: Number(limit), total: countRes.rows[0].total } });
  } catch (e) {
    console.error('GET /icons error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch icons' });
  }
});

// POST icons (create)
app.post('/api/logo/icons', async (req, res) => {
  try {
    const { name, url, type = 'vector', width = 100, height = 100, hasAlpha = true, vectorSvg = null, category = 'general', tags = [], description = '' } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'name and url are required' });
    }
    const meta = { library_type: 'icon', category, tags, description };
    const result = await query(
      `INSERT INTO assets (kind, name, url, width, height, has_alpha, vector_svg, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [type, name, url, width, height, hasAlpha, vectorSvg, JSON.stringify(meta)]
    );
    const r = result.rows[0];
    return res.status(201).json({ success: true, data: {
      id: r.id, name: r.name, url: r.url, type: r.kind, width: r.width, height: r.height, hasAlpha: r.has_alpha, vectorSvg: r.vector_svg,
      category: r.meta?.category || 'general', tags: r.meta?.tags || [], description: r.meta?.description || '',
      createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString()
    }});
  } catch (e) {
    console.error('POST /icons error', e);
    res.status(500).json({ success: false, message: 'Failed to create icon' });
  }
});

// GET icon by id
app.get('/api/logo/icons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, ai.has_alpha, ai.vector_svg, ai.meta, ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ai.id = $1 AND ai.kind IN ('vector','raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Icon not found' });
    const r = result.rows[0];
    return res.json({ success: true, data: {
      id: r.id, name: r.name, url: r.url, type: r.kind, width: r.width, height: r.height, hasAlpha: r.has_alpha, vectorSvg: r.vector_svg,
      category: r.meta?.category || 'general', tags: r.meta?.tags || [], description: r.meta?.description || '',
      createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString()
    }});
  } catch (e) {
    console.error('GET /icons/:id error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch icon' });
  }
});

// PATCH icon by id
app.patch('/api/logo/icons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, type, width, height, hasAlpha, vectorSvg, category, tags, description, meta } = req.body;

    // Build partial update
    const sets = [];
    const params = [];
    if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`); }
    if (url !== undefined) { params.push(url); sets.push(`url = $${params.length}`); }
    if (type !== undefined) { params.push(type); sets.push(`kind = $${params.length}`); }
    if (width !== undefined) { params.push(width); sets.push(`width = $${params.length}`); }
    if (height !== undefined) { params.push(height); sets.push(`height = $${params.length}`); }
    if (hasAlpha !== undefined) { params.push(hasAlpha); sets.push(`has_alpha = $${params.length}`); }
    if (vectorSvg !== undefined) { params.push(vectorSvg); sets.push(`vector_svg = $${params.length}`); }

    // Merge meta
    const metaUpdates = {};
    if (category !== undefined) metaUpdates.category = category;
    if (tags !== undefined) metaUpdates.tags = tags;
    if (description !== undefined) metaUpdates.description = description;
    if (meta !== undefined) {
      try {
        const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
        Object.assign(metaUpdates, parsed);
      } catch {}
    }
    if (Object.keys(metaUpdates).length > 0) {
      params.push(JSON.stringify(metaUpdates));
      sets.push(`meta = COALESCE(meta, '{}'::jsonb) || $${params.length}::jsonb`);
    }

    if (sets.length === 0) return res.json({ success: true, message: 'No changes' });

    params.push(id);
    const result = await query(`
      UPDATE assets SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length} AND kind IN ('vector','raster') AND (meta->>'library_type' = 'icon' OR meta->>'library_type' IS NULL)
      RETURNING *
    `, params);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Icon not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('PATCH /icons/:id error', e);
    res.status(500).json({ success: false, message: 'Failed to update icon' });
  }
});

// DELETE icon by id
app.delete('/api/logo/icons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      DELETE FROM assets WHERE id = $1 AND kind IN ('vector','raster') AND (meta->>'library_type' = 'icon' OR meta->>'library_type' IS NULL)
      RETURNING *
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Icon not found' });
    return res.json({ success: true, message: 'Icon deleted' });
  } catch (e) {
    console.error('DELETE /icons/:id error', e);
    // Always return JSON
    res.status(500).json({ success: false, message: 'Failed to delete icon' });
  }
});

// GET icons library (optimized)
app.get('/api/logo/icons/library', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, type, style, featured, search, tags, sort = 'popularity', order = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    let where = `ai.kind IN ('vector','raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)`;
    const params = [];

    if (featured === 'true') where += ` AND (ai.meta->>'is_featured' = 'true' OR ai.meta->>'is_popular' = 'true')`;
    if (category) { params.push(category); where += ` AND ai.meta->>'category' = $${params.length}`; }
    if (type) { params.push(type); where += ` AND ai.kind = $${params.length}`; }
    if (style) { params.push(style); where += ` AND ai.meta->>'style' = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (ai.name ILIKE $${params.length} OR ai.meta->>'description' ILIKE $${params.length} OR ai.meta->>'keywords' ILIKE $${params.length})`; }
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagArray.length > 0) { params.push(JSON.stringify(tagArray)); where += ` AND ai.meta->'tags' @> $${params.length}`; }
    }

    const sortClause = sort === 'popularity' ? `(ai.meta->>'download_count')::int` : `ai.created_at`;

    const dataQuery = `
      SELECT ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex, ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ${where}
      ORDER BY ${sortClause} ${order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}, ai.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `SELECT COUNT(*)::int AS total FROM assets ai WHERE ${where}`;

    const dataParams = [...params, Number(limit), Number(offset)];
    const [iconsRes, countRes, categoriesRes] = await Promise.all([
      query(dataQuery, dataParams),
      query(countQuery, params),
      query(`
        SELECT ai.meta->>'category' as category, COUNT(*) as count,
               COUNT(CASE WHEN ai.meta->>'is_featured' = 'true' THEN 1 END) as featured_count
        FROM assets ai
        WHERE ai.kind IN ('vector','raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL) AND ai.meta->>'category' IS NOT NULL
        GROUP BY ai.meta->>'category' ORDER BY count DESC
      `)
    ]);

    res.json({
      success: true,
      data: { icons: iconsRes.rows, categories: categoriesRes.rows },
      pagination: { page: Number(page), limit: Number(limit), total: countRes.rows[0].total },
      filters: { category, type, style, featured: featured === 'true', search, tags: tags ? tags.split(',') : [] }
    });
  } catch (e) {
    console.error('GET /icons/library error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch icon library' });
  }
});

// GET icon categories
app.get('/api/logo/icons/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT ai.meta->>'category' as category, COUNT(*) as count
      FROM assets ai
      WHERE ai.kind IN ('vector','raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL) AND ai.meta->>'category' IS NOT NULL
      GROUP BY ai.meta->>'category' ORDER BY count DESC
    `);
    res.json({ success: true, data: result.rows, totalCategories: result.rows.length });
  } catch (e) {
    console.error('GET /icons/categories error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// GET featured icons
app.get('/api/logo/icons/featured', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await query(`
      SELECT ai.id, ai.kind, ai.name, ai.url, ai.meta
      FROM assets ai
      WHERE ai.kind IN ('vector','raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
        AND (ai.meta->>'is_featured' = 'true' OR ai.meta->>'is_popular' = 'true')
      ORDER BY (ai.meta->>'download_count')::int DESC, ai.created_at DESC
      LIMIT $1
    `, [Number(limit)]);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (e) {
    console.error('GET /icons/featured error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch featured icons' });
  }
});

// ========== BACKGROUNDS ==========
// GET backgrounds
app.get('/api/logo/backgrounds', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, type, search } = req.query;
    const offset = (page - 1) * limit;

    let where = `ai.kind IN ('raster','vector') AND ai.meta->>'library_type' = 'background'`;
    const params = [];

    if (category) { params.push(category); where += ` AND ai.meta->>'category' = $${params.length}`; }
    if (type) { params.push(type); where += ` AND ai.kind = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (ai.name ILIKE $${params.length} OR ai.meta->>'description' ILIKE $${params.length})`; }

    const dataQuery = `
      SELECT ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex, ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ${where}
      ORDER BY ai.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `SELECT COUNT(*)::int AS total FROM assets ai WHERE ${where}`;

    const dataParams = [...params, Number(limit), Number(offset)];
    const [bgRes, countRes] = await Promise.all([
      query(dataQuery, dataParams),
      query(countQuery, params)
    ]);

    res.json({ success: true, data: bgRes.rows, pagination: { page: Number(page), limit: Number(limit), total: countRes.rows[0].total } });
  } catch (e) {
    console.error('GET /backgrounds error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch backgrounds' });
  }
});

// POST backgrounds (create)
app.post('/api/logo/backgrounds', async (req, res) => {
  try {
    const { name, url, type = 'raster', width = 1920, height = 1080, hasAlpha = false, vectorSvg = null, category = 'general', tags = [], description = '' } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'name and url are required' });
    }
    const meta = { library_type: 'background', category, tags, description };
    const result = await query(
      `INSERT INTO assets (kind, name, url, width, height, has_alpha, vector_svg, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [type, name, url, width, height, hasAlpha, vectorSvg, JSON.stringify(meta)]
    );
    const r = result.rows[0];
    return res.status(201).json({ success: true, data: {
      id: r.id, name: r.name, url: r.url, type: r.kind, width: r.width, height: r.height, hasAlpha: r.has_alpha, vectorSvg: r.vector_svg,
      category: r.meta?.category || 'general', tags: r.meta?.tags || [], description: r.meta?.description || '',
      createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString()
    }});
  } catch (e) {
    console.error('POST /backgrounds error', e);
    res.status(500).json({ success: false, message: 'Failed to create background' });
  }
});

// GET background by id
app.get('/api/logo/backgrounds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, ai.has_alpha, ai.vector_svg, ai.meta, ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ai.id = $1 AND ai.kind IN ('raster','vector') AND ai.meta->>'library_type' = 'background'
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Background not found' });
    const r = result.rows[0];
    return res.json({ success: true, data: {
      id: r.id, name: r.name, url: r.url, type: r.kind, width: r.width, height: r.height, hasAlpha: r.has_alpha, vectorSvg: r.vector_svg,
      category: r.meta?.category || 'general', tags: r.meta?.tags || [], description: r.meta?.description || '',
      createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString()
    }});
  } catch (e) {
    console.error('GET /backgrounds/:id error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch background' });
  }
});

// PATCH background by id
app.patch('/api/logo/backgrounds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, type, width, height, hasAlpha, vectorSvg, category, tags, description, meta } = req.body;

    const sets = [];
    const params = [];
    if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`); }
    if (url !== undefined) { params.push(url); sets.push(`url = $${params.length}`); }
    if (type !== undefined) { params.push(type); sets.push(`kind = $${params.length}`); }
    if (width !== undefined) { params.push(width); sets.push(`width = $${params.length}`); }
    if (height !== undefined) { params.push(height); sets.push(`height = $${params.length}`); }
    if (hasAlpha !== undefined) { params.push(hasAlpha); sets.push(`has_alpha = $${params.length}`); }
    if (vectorSvg !== undefined) { params.push(vectorSvg); sets.push(`vector_svg = $${params.length}`); }

    const metaUpdates = {};
    if (category !== undefined) metaUpdates.category = category;
    if (tags !== undefined) metaUpdates.tags = tags;
    if (description !== undefined) metaUpdates.description = description;
    if (meta !== undefined) {
      try {
        const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
        Object.assign(metaUpdates, parsed);
      } catch {}
    }
    if (Object.keys(metaUpdates).length > 0) {
      params.push(JSON.stringify(metaUpdates));
      sets.push(`meta = COALESCE(meta, '{}'::jsonb) || $${params.length}::jsonb`);
    }

    if (sets.length === 0) return res.json({ success: true, message: 'No changes' });

    params.push(id);
    const result = await query(`
      UPDATE assets SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length} AND kind IN ('raster','vector') AND meta->>'library_type' = 'background'
      RETURNING *
    `, params);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Background not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('PATCH /backgrounds/:id error', e);
    res.status(500).json({ success: false, message: 'Failed to update background' });
  }
});

// DELETE background by id
app.delete('/api/logo/backgrounds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      DELETE FROM assets WHERE id = $1 AND kind IN ('raster','vector') AND meta->>'library_type' = 'background'
      RETURNING *
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Background not found' });
    return res.json({ success: true, message: 'Background deleted' });
  } catch (e) {
    console.error('DELETE /backgrounds/:id error', e);
    res.status(500).json({ success: false, message: 'Failed to delete background' });
  }
});

// ========== ASSETS (minimal) ==========
// GET assets (very simple)
app.get('/api/assets', async (req, res) => {
  try {
    const { page = 1, limit = 20, kind, category, search } = req.query;
    const offset = (page - 1) * limit;

    let where = '1=1';
    const params = [];
    if (kind) { params.push(kind); where += ` AND kind = $${params.length}`; }
    if (category) { params.push(category); where += ` AND meta->>'category' = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (name ILIKE $${params.length} OR meta->>'tags' ILIKE $${params.length})`; }

    const dataQuery = `
      SELECT id, kind, name, storage, url, provider_id, mime_type, bytes_size, width, height, has_alpha, dominant_hex, palette, vector_svg, meta, created_by, created_at, updated_at
      FROM assets
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countQuery = `SELECT COUNT(*) as total FROM assets WHERE ${where}`;

    const dataParams = [...params, Number(limit), Number(offset)];
    const [dataRes, countRes] = await Promise.all([
      query(dataQuery, dataParams),
      query(countQuery, params)
    ]);

    res.json({ success: true, data: dataRes.rows, pagination: { page: Number(page), limit: Number(limit), total: Number(countRes.rows[0].total) } });
  } catch (e) {
    console.error('GET /api/assets error', e);
    res.status(500).json({ success: false, message: 'Failed to fetch assets' });
  }
});

// POST asset record (simple)
app.post('/api/assets', async (req, res) => {
  try {
    const { kind, name, storage = 'cloudinary', url, provider_id = null, mime_type = 'image/svg+xml', bytes_size = 0, width = null, height = null, has_alpha = null, dominant_hex = null, palette = null, vector_svg = null, meta = {}, created_by = null } = req.body;
    if (!kind || !name || !url) {
      return res.status(400).json({ success: false, message: 'kind, name and url are required' });
    }
    const result = await query(
      `INSERT INTO assets (kind, name, storage, url, provider_id, mime_type, bytes_size, width, height, has_alpha, dominant_hex, palette, vector_svg, meta, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [kind, name, storage, url, provider_id, mime_type, bytes_size, width, height, has_alpha, dominant_hex, palette, vector_svg, typeof meta === 'string' ? meta : JSON.stringify(meta), created_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('POST /api/assets error', e);
    res.status(500).json({ success: false, message: 'Failed to create asset' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});
