const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { ok, fail } = require('../utils/envelope');
const { localization } = require('../middleware/localization');

// Apply localization middleware
router.use(localization);

// ==============================================
// GET ALL SHAPE CATEGORIES
// ==============================================

// GET /api/shape-categories - Get all shape categories with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      include_inactive = 'false',
      include_counts = 'true',
      parent_id,
      lang = 'en'
    } = req.query;

    const includeInactive = include_inactive === 'true';
    const includeCounts = include_counts === 'true';

    let whereClause = includeInactive ? '' : 'WHERE sc.is_active = TRUE';
    let queryParams = [];

    if (parent_id) {
      const prefix = whereClause ? ' AND ' : 'WHERE ';
      whereClause += `${prefix}sc.parent_id = $${queryParams.length + 1}`;
      queryParams.push(parent_id);
    }

    // Check if shape_categories table exists
    let tableExists = false;
    try {
      const tableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'shape_categories'
        ) as exists
      `);
      tableExists = tableCheck.rows[0]?.exists || false;
    } catch (e) {
      tableExists = false;
    }
    
    if (!tableExists) {
      // Return empty result if table doesn't exist
      const currentLang = res.locals.lang ?? "en";
      return res.json(ok({ 
        categories: [],
        total: 0 
      }, currentLang, currentLang === "ar" ? "تم جلب فئات الأشكال بنجاح (لا توجد فئات)" : "Shape categories fetched successfully (no categories)"));
    }
    
    let querySQL;
    if (includeCounts) {
      querySQL = `
        SELECT 
          sc.id, sc.name, sc.name_en, sc.name_ar,
          sc.description, sc.description_en, sc.description_ar,
          sc.shape_asset_id, sc.slug, sc.parent_id, sc.sort_order,
          sc.is_active, sc.meta, sc.created_at, sc.updated_at,
          COUNT(sca.shape_id)::BIGINT as shape_count
        FROM shape_categories sc
        LEFT JOIN shape_category_assignments sca ON sca.category_id = sc.id
        ${whereClause}
        GROUP BY sc.id
        ORDER BY sc.sort_order ASC, sc.name ASC
      `;
    } else {
      querySQL = `
        SELECT 
          sc.id, sc.name, sc.name_en, sc.name_ar,
          sc.description, sc.description_en, sc.description_ar,
          sc.shape_asset_id, sc.slug, sc.parent_id, sc.sort_order,
          sc.is_active, sc.meta, sc.created_at, sc.updated_at
        FROM shape_categories sc
        ${whereClause}
        ORDER BY sc.sort_order ASC, sc.name ASC
      `;
    }

    const result = await query(querySQL, queryParams);

    // Format response with localization
    const categories = result.rows.map(cat => {
      const localizedName = lang === 'ar' 
        ? (cat.name_ar || cat.name_en || cat.name)
        : (cat.name_en || cat.name);
      const localizedDescription = lang === 'ar'
        ? (cat.description_ar || cat.description_en || cat.description)
        : (cat.description_en || cat.description);

      return {
        id: cat.id,
        name: localizedName,
        name_en: cat.name_en || cat.name,
        name_ar: cat.name_ar || cat.name_en || cat.name,
        description: localizedDescription,
        description_en: cat.description_en || cat.description,
        description_ar: cat.description_ar || cat.description_en || cat.description,
        shapeAssetId: cat.shape_asset_id,
        slug: cat.slug,
        parentId: cat.parent_id,
        sortOrder: cat.sort_order,
        isActive: cat.is_active,
        meta: cat.meta,
        shapeCount: cat.shape_count || 0,
        createdAt: new Date(cat.created_at).toISOString(),
        updatedAt: new Date(cat.updated_at).toISOString()
      };
    });

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok({ 
      categories,
      total: categories.length 
    }, currentLang, currentLang === "ar" ? "تم جلب فئات الأشكال بنجاح" : "Shape categories fetched successfully"));
  } catch (error) {
    console.error('Error fetching shape categories:', error);
    console.error('Error details:', error.message, error.stack);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب فئات الأشكال" : "Failed to fetch shape categories"));
  }
});

// ==============================================
// GET SHAPE CATEGORY BY ID
// ==============================================

// GET /api/shape-categories/:id - Get specific shape category with shape count
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = 'en' } = req.query;

    const result = await query(`
      SELECT 
        sc.id, sc.name, sc.name_en, sc.name_ar,
        sc.description, sc.description_en, sc.description_ar,
        sc.shape_asset_id, sc.slug, sc.parent_id, sc.sort_order,
        sc.is_active, sc.meta, sc.created_at, sc.updated_at,
        COUNT(sca.shape_id)::BIGINT as shape_count
      FROM shape_categories sc
      LEFT JOIN shape_category_assignments sca ON sca.category_id = sc.id
      WHERE sc.id = $1
      GROUP BY sc.id
    `, [id]);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأشكال غير موجودة" : "Shape category not found"));
    }

    const cat = result.rows[0];
    const localizedName = lang === 'ar' 
      ? (cat.name_ar || cat.name_en || cat.name)
      : (cat.name_en || cat.name);
    const localizedDescription = lang === 'ar'
      ? (cat.description_ar || cat.description_en || cat.description)
      : (cat.description_en || cat.description);

    const category = {
      id: cat.id,
      name: localizedName,
      name_en: cat.name_en || cat.name,
      name_ar: cat.name_ar || cat.name_en || cat.name,
      description: localizedDescription,
      description_en: cat.description_en || cat.description,
      description_ar: cat.description_ar || cat.description_en || cat.description,
      shapeAssetId: cat.shape_asset_id,
      slug: cat.slug,
      parentId: cat.parent_id,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
      meta: cat.meta,
      shapeCount: cat.shape_count || 0,
      createdAt: new Date(cat.created_at).toISOString(),
      updatedAt: new Date(cat.updated_at).toISOString()
    };

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(category, currentLang, currentLang === "ar" ? "تم جلب فئة الأشكال بنجاح" : "Shape category fetched successfully"));
  } catch (error) {
    console.error('Error fetching shape category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب فئة الأشكال" : "Failed to fetch shape category"));
  }
});

// ==============================================
// CREATE SHAPE CATEGORY
// ==============================================

// POST /api/shape-categories - Create new shape category
router.post('/', async (req, res) => {
  try {
    const {
      name,
      name_en,
      name_ar,
      description,
      description_en,
      description_ar,
      shape_asset_id,
      slug,
      parent_id,
      sort_order = 0,
      is_active = true,
      meta
    } = req.body;

    // Validation
    if (!name) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(400).json(fail(currentLang, currentLang === "ar" ? "الاسم مطلوب" : "Name is required"));
    }

    // Generate slug from name if not provided
    const generatedSlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const result = await query(`
      INSERT INTO shape_categories (
        name, name_en, name_ar, description, description_en, description_ar,
        shape_asset_id, slug, parent_id, sort_order, is_active, meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      name,
      name_en || null,
      name_ar || null,
      description || null,
      description_en || null,
      description_ar || null,
      shape_asset_id || null,
      generatedSlug,
      parent_id || null,
      sort_order,
      is_active,
      meta ? JSON.stringify(meta) : null
    ]);

    const cat = result.rows[0];
    const category = {
      id: cat.id,
      name: cat.name,
      name_en: cat.name_en || cat.name,
      name_ar: cat.name_ar || cat.name_en || cat.name,
      description: cat.description,
      description_en: cat.description_en || cat.description,
      description_ar: cat.description_ar || cat.description_en || cat.description,
      shapeAssetId: cat.shape_asset_id,
      slug: cat.slug,
      parentId: cat.parent_id,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
      meta: cat.meta,
      shapeCount: 0,
      createdAt: new Date(cat.created_at).toISOString(),
      updatedAt: new Date(cat.updated_at).toISOString()
    };

    const currentLang = res.locals.lang ?? "en";
    return res.status(201).json(ok(category, currentLang, currentLang === "ar" ? "تم إنشاء فئة الأشكال بنجاح" : "Shape category created successfully"));
  } catch (error) {
    console.error('Error creating shape category:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      const currentLang = res.locals.lang ?? "en";
      return res.status(409).json(fail(currentLang, currentLang === "ar" ? "فئة الأشكال موجودة بالفعل" : "Shape category already exists"));
    }

    // Handle missing table error
    if (error.message && error.message.includes('does not exist')) {
      const lang = res.locals.lang ?? "en";
      return res.status(500).json(fail(lang, lang === "ar" ? "جداول فئات الأشكال غير موجودة. يرجى تشغيل الترحيل أولاً" : "Shape category tables do not exist. Please run migration first"));
    }

    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في إنشاء فئة الأشكال" : "Failed to create shape category"));
  }
});

// ==============================================
// UPDATE SHAPE CATEGORY
// ==============================================

// PATCH /api/shape-categories/:id - Update shape category
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const setClause = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'name', 'name_en', 'name_ar', 'description', 'description_en', 'description_ar',
      'shape_asset_id', 'slug', 'parent_id', 'sort_order', 'is_active', 'meta'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        paramCount++;
        if (key === 'meta' && typeof updates[key] === 'object') {
          setClause.push(`${key} = $${paramCount}::jsonb`);
          values.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
        }
      }
    });

    if (setClause.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(400).json(fail(currentLang, currentLang === "ar" ? "لا توجد تحديثات" : "No updates provided"));
    }

    paramCount++;
    values.push(id);

    const result = await query(`
      UPDATE shape_categories 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأشكال غير موجودة" : "Shape category not found"));
    }

    const cat = result.rows[0];
    
    // Get shape count
    const countResult = await query(`
      SELECT COUNT(*)::BIGINT as shape_count
      FROM shape_category_assignments
      WHERE category_id = $1
    `, [id]);

    const category = {
      id: cat.id,
      name: cat.name,
      name_en: cat.name_en || cat.name,
      name_ar: cat.name_ar || cat.name_en || cat.name,
      description: cat.description,
      description_en: cat.description_en || cat.description,
      description_ar: cat.description_ar || cat.description_en || cat.description,
      shapeAssetId: cat.shape_asset_id,
      slug: cat.slug,
      parentId: cat.parent_id,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
      meta: cat.meta,
      shapeCount: countResult.rows[0]?.shape_count || 0,
      createdAt: new Date(cat.created_at).toISOString(),
      updatedAt: new Date(cat.updated_at).toISOString()
    };

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(category, currentLang, currentLang === "ar" ? "تم تحديث فئة الأشكال بنجاح" : "Shape category updated successfully"));
  } catch (error) {
    console.error('Error updating shape category:', error);
    
    if (error.code === '23505') {
      const currentLang = res.locals.lang ?? "en";
      return res.status(409).json(fail(currentLang, currentLang === "ar" ? "فئة الأشكال موجودة بالفعل" : "Shape category already exists"));
    }

    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في تحديث فئة الأشكال" : "Failed to update shape category"));
  }
});

// ==============================================
// DELETE SHAPE CATEGORY
// ==============================================

// DELETE /api/shape-categories/:id - Delete shape category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has assigned shapes
    const assignmentsResult = await query(`
      SELECT COUNT(*)::BIGINT as count
      FROM shape_category_assignments
      WHERE category_id = $1
    `, [id]);

    const assignmentCount = assignmentsResult.rows[0]?.count || 0;

    if (assignmentCount > 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(400).json(fail(currentLang, currentLang === "ar" ? "لا يمكن حذف الفئة: تحتوي على أشكال" : "Cannot delete category: it has assigned shapes"));
    }

    const result = await query(`
      DELETE FROM shape_categories 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأشكال غير موجودة" : "Shape category not found"));
    }

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(null, currentLang, currentLang === "ar" ? "تم حذف فئة الأشكال بنجاح" : "Shape category deleted successfully"));
  } catch (error) {
    console.error('Error deleting shape category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في حذف فئة الأشكال" : "Failed to delete shape category"));
  }
});

// ==============================================
// SHAPE-CATEGORY ASSIGNMENTS
// ==============================================

// GET /api/shape-categories/:id/shapes - Get all shapes in a category
router.get('/:id/shapes', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 20,
      lang = 'en' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Verify category exists
    const categoryCheck = await query('SELECT id, name FROM shape_categories WHERE id = $1', [id]);
    if (categoryCheck.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأشكال غير موجودة" : "Shape category not found"));
    }

    // Get shapes in this category
    const result = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height,
        ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
        ai.created_at, ai.updated_at,
        sca.created_at as assigned_at
      FROM shape_category_assignments sca
      INNER JOIN assets ai ON ai.id = sca.shape_id
      WHERE sca.category_id = $1
        AND ai.kind IN ('vector', 'raster')
        AND ai.meta->>'library_type' = 'shape'
      ORDER BY sca.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*)::BIGINT as total
      FROM shape_category_assignments sca
      INNER JOIN assets ai ON ai.id = sca.shape_id
      WHERE sca.category_id = $1
        AND ai.kind IN ('vector', 'raster')
        AND ai.meta->>'library_type' = 'shape'
    `, [id]);

    const shapes = result.rows.map(shape => ({
      id: shape.id,
      kind: shape.kind,
      name: shape.name,
      url: shape.url,
      width: shape.width,
      height: shape.height,
      hasAlpha: shape.has_alpha,
      vectorSvg: shape.vector_svg,
      meta: shape.meta,
      dominantHex: shape.dominant_hex,
      assignedAt: new Date(shape.assigned_at).toISOString(),
      createdAt: new Date(shape.created_at).toISOString(),
      updatedAt: new Date(shape.updated_at).toISOString()
    }));

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok({
      categoryId: id,
      categoryName: categoryCheck.rows[0].name,
      shapes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0]?.total || 0),
        pages: Math.ceil(parseInt(countResult.rows[0]?.total || 0) / parseInt(limit))
      }
    }, currentLang, currentLang === "ar" ? "تم جلب الأشكال بنجاح" : "Shapes fetched successfully"));
  } catch (error) {
    console.error('Error fetching shapes in category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب الأشكال" : "Failed to fetch shapes"));
  }
});

// POST /api/shape-categories/:id/shapes - Assign shape(s) to category
router.post('/:id/shapes', async (req, res) => {
  try {
    const { id } = req.params;
    const { shape_ids } = req.body;

    if (!shape_ids || !Array.isArray(shape_ids) || shape_ids.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(400).json(fail(currentLang, currentLang === "ar" ? "معرفات الأشكال مطلوبة" : "Shape IDs array is required"));
    }

    // Verify category exists
    const categoryCheck = await query('SELECT id, name FROM shape_categories WHERE id = $1', [id]);
    if (categoryCheck.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأشكال غير موجودة" : "Shape category not found"));
    }

    const client = await getClient();
    await client.query('BEGIN');

    try {
      const assignments = [];
      const errors = [];

      for (const shapeId of shape_ids) {
        // Verify shape exists and is actually a shape
        const shapeCheck = await client.query(`
          SELECT id FROM assets 
          WHERE id = $1 
            AND kind IN ('vector', 'raster')
            AND meta->>'library_type' = 'shape'
        `, [shapeId]);

        if (shapeCheck.rows.length === 0) {
          errors.push({ shape_id: shapeId, error: 'Shape not found or invalid' });
          continue;
        }

        // Insert assignment (ignore if already exists due to UNIQUE constraint)
        try {
          const assignmentResult = await client.query(`
            INSERT INTO shape_category_assignments (shape_id, category_id)
            VALUES ($1, $2)
            ON CONFLICT (shape_id, category_id) DO NOTHING
            RETURNING id
          `, [shapeId, id]);

          if (assignmentResult.rows.length > 0) {
            assignments.push({
              shape_id: shapeId,
              assignment_id: assignmentResult.rows[0].id
            });
          } else {
            assignments.push({
              shape_id: shapeId,
              assignment_id: null,
              note: 'Already assigned'
            });
          }
        } catch (assignError) {
          errors.push({ shape_id: shapeId, error: assignError.message });
        }
      }

      await client.query('COMMIT');

      const currentLang = res.locals.lang ?? "en";
      return res.status(201).json(ok({
        categoryId: id,
        categoryName: categoryCheck.rows[0].name,
        assignments,
        errors: errors.length > 0 ? errors : undefined,
        totalAssigned: assignments.length
      }, currentLang, currentLang === "ar" ? "تم تعيين الأشكال بنجاح" : "Shapes assigned successfully"));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error assigning shapes to category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في تعيين الأشكال" : "Failed to assign shapes"));
  }
});

// DELETE /api/shape-categories/:categoryId/shapes/:shapeId - Remove shape from category
router.delete('/:categoryId/shapes/:shapeId', async (req, res) => {
  try {
    const { categoryId, shapeId } = req.params;

    const result = await query(`
      DELETE FROM shape_category_assignments
      WHERE category_id = $1 AND shape_id = $2
      RETURNING id
    `, [categoryId, shapeId]);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "التعيين غير موجود" : "Assignment not found"));
    }

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(null, currentLang, currentLang === "ar" ? "تم إزالة الشكل من الفئة بنجاح" : "Shape removed from category successfully"));
  } catch (error) {
    console.error('Error removing shape from category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في إزالة الشكل" : "Failed to remove shape"));
  }
});

// ==============================================
// GET SHAPE CATEGORIES FOR A SHAPE
// ==============================================

// GET /api/shape-categories/by-shape/:shapeId - Get all categories for a shape
router.get('/by-shape/:shapeId', async (req, res) => {
  try {
    const { shapeId } = req.params;
    const { lang = 'en' } = req.query;

    // Verify shape exists
    const shapeCheck = await query('SELECT id, name FROM assets WHERE id = $1', [shapeId]);
    if (shapeCheck.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "الشكل غير موجود" : "Shape not found"));
    }

    const result = await query(`
      SELECT 
        sc.id, sc.name, sc.name_en, sc.name_ar,
        sc.description, sc.description_en, sc.description_ar,
        sc.shape_asset_id, sc.slug, sc.parent_id, sc.sort_order,
        sc.is_active, sc.meta, sc.created_at, sc.updated_at,
        sca.created_at as assigned_at
      FROM shape_category_assignments sca
      INNER JOIN shape_categories sc ON sc.id = sca.category_id
      WHERE sca.shape_id = $1 AND sc.is_active = TRUE
      ORDER BY sc.sort_order ASC, sc.name ASC
    `, [shapeId]);

    const categories = result.rows.map(cat => {
      const localizedName = lang === 'ar' 
        ? (cat.name_ar || cat.name_en || cat.name)
        : (cat.name_en || cat.name);

      return {
        id: cat.id,
        name: localizedName,
        name_en: cat.name_en || cat.name,
        name_ar: cat.name_ar || cat.name_en || cat.name,
        slug: cat.slug,
        assignedAt: new Date(cat.assigned_at).toISOString()
      };
    });

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok({
      shapeId,
      shapeName: shapeCheck.rows[0].name,
      categories,
      total: categories.length
    }, currentLang, currentLang === "ar" ? "تم جلب الفئات بنجاح" : "Categories fetched successfully"));
  } catch (error) {
    console.error('Error fetching categories for shape:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب الفئات" : "Failed to fetch categories"));
  }
});

module.exports = router;






