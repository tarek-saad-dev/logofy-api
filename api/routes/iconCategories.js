const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { ok, fail } = require('../utils/envelope');
const { localization } = require('../middleware/localization');

// Apply localization middleware
router.use(localization);

// ==============================================
// GET ALL ICON CATEGORIES
// ==============================================

// GET /api/icon-categories - Get all icon categories with optional filtering
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

    let whereClause = includeInactive ? '' : 'WHERE ic.is_active = TRUE';
    let queryParams = [];

    if (parent_id) {
      const prefix = whereClause ? ' AND ' : 'WHERE ';
      whereClause += `${prefix}ic.parent_id = $${queryParams.length + 1}`;
      queryParams.push(parent_id);
    }

    // Check if icon_categories table exists
    let tableExists = false;
    try {
      const tableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'icon_categories'
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
      }, currentLang, currentLang === "ar" ? "تم جلب فئات الأيقونات بنجاح (لا توجد فئات)" : "Icon categories fetched successfully (no categories)"));
    }
    
    let querySQL;
    if (includeCounts) {
      querySQL = `
        SELECT 
          ic.id, ic.name, ic.name_en, ic.name_ar,
          ic.description, ic.description_en, ic.description_ar,
          ic.icon_asset_id, ic.slug, ic.parent_id, ic.sort_order,
          ic.is_active, ic.meta, ic.created_at, ic.updated_at,
          COUNT(ica.icon_id)::BIGINT as icon_count
        FROM icon_categories ic
        LEFT JOIN icon_category_assignments ica ON ica.category_id = ic.id
        ${whereClause}
        GROUP BY ic.id
        ORDER BY ic.sort_order ASC, ic.name ASC
      `;
    } else {
      querySQL = `
        SELECT 
          ic.id, ic.name, ic.name_en, ic.name_ar,
          ic.description, ic.description_en, ic.description_ar,
          ic.icon_asset_id, ic.slug, ic.parent_id, ic.sort_order,
          ic.is_active, ic.meta, ic.created_at, ic.updated_at
        FROM icon_categories ic
        ${whereClause}
        ORDER BY ic.sort_order ASC, ic.name ASC
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
        iconAssetId: cat.icon_asset_id,
        slug: cat.slug,
        parentId: cat.parent_id,
        sortOrder: cat.sort_order,
        isActive: cat.is_active,
        meta: cat.meta,
        iconCount: cat.icon_count || 0,
        createdAt: new Date(cat.created_at).toISOString(),
        updatedAt: new Date(cat.updated_at).toISOString()
      };
    });

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok({ 
      categories,
      total: categories.length 
    }, currentLang, currentLang === "ar" ? "تم جلب فئات الأيقونات بنجاح" : "Icon categories fetched successfully"));
  } catch (error) {
    console.error('Error fetching icon categories:', error);
    console.error('Error details:', error.message, error.stack);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب فئات الأيقونات" : "Failed to fetch icon categories"));
  }
});

// ==============================================
// GET ICON CATEGORY BY ID
// ==============================================

// GET /api/icon-categories/:id - Get specific icon category with icon count
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = 'en' } = req.query;

    const result = await query(`
      SELECT 
        ic.id, ic.name, ic.name_en, ic.name_ar,
        ic.description, ic.description_en, ic.description_ar,
        ic.icon_asset_id, ic.slug, ic.parent_id, ic.sort_order,
        ic.is_active, ic.meta, ic.created_at, ic.updated_at,
        COUNT(ica.icon_id)::BIGINT as icon_count
      FROM icon_categories ic
      LEFT JOIN icon_category_assignments ica ON ica.category_id = ic.id
      WHERE ic.id = $1
      GROUP BY ic.id
    `, [id]);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأيقونات غير موجودة" : "Icon category not found"));
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
      iconAssetId: cat.icon_asset_id,
      slug: cat.slug,
      parentId: cat.parent_id,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
      meta: cat.meta,
      iconCount: cat.icon_count || 0,
      createdAt: new Date(cat.created_at).toISOString(),
      updatedAt: new Date(cat.updated_at).toISOString()
    };

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(category, currentLang, currentLang === "ar" ? "تم جلب فئة الأيقونات بنجاح" : "Icon category fetched successfully"));
  } catch (error) {
    console.error('Error fetching icon category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب فئة الأيقونات" : "Failed to fetch icon category"));
  }
});

// ==============================================
// CREATE ICON CATEGORY
// ==============================================

// POST /api/icon-categories - Create new icon category
router.post('/', async (req, res) => {
  try {
    const {
      name,
      name_en,
      name_ar,
      description,
      description_en,
      description_ar,
      icon_asset_id,
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
      INSERT INTO icon_categories (
        name, name_en, name_ar, description, description_en, description_ar,
        icon_asset_id, slug, parent_id, sort_order, is_active, meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      name,
      name_en || null,
      name_ar || null,
      description || null,
      description_en || null,
      description_ar || null,
      icon_asset_id || null,
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
      iconAssetId: cat.icon_asset_id,
      slug: cat.slug,
      parentId: cat.parent_id,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
      meta: cat.meta,
      iconCount: 0,
      createdAt: new Date(cat.created_at).toISOString(),
      updatedAt: new Date(cat.updated_at).toISOString()
    };

    const currentLang = res.locals.lang ?? "en";
    return res.status(201).json(ok(category, currentLang, currentLang === "ar" ? "تم إنشاء فئة الأيقونات بنجاح" : "Icon category created successfully"));
  } catch (error) {
    console.error('Error creating icon category:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      const currentLang = res.locals.lang ?? "en";
      return res.status(409).json(fail(currentLang, currentLang === "ar" ? "فئة الأيقونات موجودة بالفعل" : "Icon category already exists"));
    }

    // Handle missing table error
    if (error.message && error.message.includes('does not exist')) {
      const lang = res.locals.lang ?? "en";
      return res.status(500).json(fail(lang, lang === "ar" ? "جداول فئات الأيقونات غير موجودة. يرجى تشغيل الترحيل أولاً" : "Icon category tables do not exist. Please run migration first"));
    }

    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في إنشاء فئة الأيقونات" : "Failed to create icon category"));
  }
});

// ==============================================
// UPDATE ICON CATEGORY
// ==============================================

// PATCH /api/icon-categories/:id - Update icon category
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
      'icon_asset_id', 'slug', 'parent_id', 'sort_order', 'is_active', 'meta'
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
      UPDATE icon_categories 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأيقونات غير موجودة" : "Icon category not found"));
    }

    const cat = result.rows[0];
    
    // Get icon count
    const countResult = await query(`
      SELECT COUNT(*)::BIGINT as icon_count
      FROM icon_category_assignments
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
      iconAssetId: cat.icon_asset_id,
      slug: cat.slug,
      parentId: cat.parent_id,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
      meta: cat.meta,
      iconCount: countResult.rows[0]?.icon_count || 0,
      createdAt: new Date(cat.created_at).toISOString(),
      updatedAt: new Date(cat.updated_at).toISOString()
    };

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(category, currentLang, currentLang === "ar" ? "تم تحديث فئة الأيقونات بنجاح" : "Icon category updated successfully"));
  } catch (error) {
    console.error('Error updating icon category:', error);
    
    if (error.code === '23505') {
      const currentLang = res.locals.lang ?? "en";
      return res.status(409).json(fail(currentLang, currentLang === "ar" ? "فئة الأيقونات موجودة بالفعل" : "Icon category already exists"));
    }

    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في تحديث فئة الأيقونات" : "Failed to update icon category"));
  }
});

// ==============================================
// DELETE ICON CATEGORY
// ==============================================

// DELETE /api/icon-categories/:id - Delete icon category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has assigned icons
    const assignmentsResult = await query(`
      SELECT COUNT(*)::BIGINT as count
      FROM icon_category_assignments
      WHERE category_id = $1
    `, [id]);

    const assignmentCount = assignmentsResult.rows[0]?.count || 0;

    if (assignmentCount > 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(400).json(fail(currentLang, currentLang === "ar" ? "لا يمكن حذف الفئة: تحتوي على أيقونات" : "Cannot delete category: it has assigned icons"));
    }

    const result = await query(`
      DELETE FROM icon_categories 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأيقونات غير موجودة" : "Icon category not found"));
    }

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(null, currentLang, currentLang === "ar" ? "تم حذف فئة الأيقونات بنجاح" : "Icon category deleted successfully"));
  } catch (error) {
    console.error('Error deleting icon category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في حذف فئة الأيقونات" : "Failed to delete icon category"));
  }
});

// ==============================================
// ICON-CATEGORY ASSIGNMENTS
// ==============================================

// GET /api/icon-categories/:id/icons - Get all icons in a category
router.get('/:id/icons', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 20,
      lang = 'en' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Verify category exists
    const categoryCheck = await query('SELECT id, name FROM icon_categories WHERE id = $1', [id]);
    if (categoryCheck.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأيقونات غير موجودة" : "Icon category not found"));
    }

    // Get icons in this category
    const result = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height,
        ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
        ai.created_at, ai.updated_at,
        ica.created_at as assigned_at
      FROM icon_category_assignments ica
      INNER JOIN assets ai ON ai.id = ica.icon_id
      WHERE ica.category_id = $1
        AND ai.kind IN ('vector', 'raster')
        AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      ORDER BY ica.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*)::BIGINT as total
      FROM icon_category_assignments ica
      INNER JOIN assets ai ON ai.id = ica.icon_id
      WHERE ica.category_id = $1
        AND ai.kind IN ('vector', 'raster')
        AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
    `, [id]);

    const icons = result.rows.map(icon => ({
      id: icon.id,
      kind: icon.kind,
      name: icon.name,
      url: icon.url,
      width: icon.width,
      height: icon.height,
      hasAlpha: icon.has_alpha,
      vectorSvg: icon.vector_svg,
      meta: icon.meta,
      dominantHex: icon.dominant_hex,
      assignedAt: new Date(icon.assigned_at).toISOString(),
      createdAt: new Date(icon.created_at).toISOString(),
      updatedAt: new Date(icon.updated_at).toISOString()
    }));

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok({
      categoryId: id,
      categoryName: categoryCheck.rows[0].name,
      icons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0]?.total || 0),
        pages: Math.ceil(parseInt(countResult.rows[0]?.total || 0) / parseInt(limit))
      }
    }, currentLang, currentLang === "ar" ? "تم جلب الأيقونات بنجاح" : "Icons fetched successfully"));
  } catch (error) {
    console.error('Error fetching icons in category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب الأيقونات" : "Failed to fetch icons"));
  }
});

// POST /api/icon-categories/:id/icons - Assign icon(s) to category
router.post('/:id/icons', async (req, res) => {
  try {
    const { id } = req.params;
    const { icon_ids } = req.body;

    if (!icon_ids || !Array.isArray(icon_ids) || icon_ids.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(400).json(fail(currentLang, currentLang === "ar" ? "معرفات الأيقونات مطلوبة" : "Icon IDs array is required"));
    }

    // Verify category exists
    const categoryCheck = await query('SELECT id, name FROM icon_categories WHERE id = $1', [id]);
    if (categoryCheck.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "فئة الأيقونات غير موجودة" : "Icon category not found"));
    }

    const client = await getClient();
    await client.query('BEGIN');

    try {
      const assignments = [];
      const errors = [];

      for (const iconId of icon_ids) {
        // Verify icon exists and is actually an icon
        const iconCheck = await client.query(`
          SELECT id FROM assets 
          WHERE id = $1 
            AND kind IN ('vector', 'raster')
            AND (meta->>'library_type' = 'icon' OR meta->>'library_type' IS NULL)
        `, [iconId]);

        if (iconCheck.rows.length === 0) {
          errors.push({ icon_id: iconId, error: 'Icon not found or invalid' });
          continue;
        }

        // Insert assignment (ignore if already exists due to UNIQUE constraint)
        try {
          const assignmentResult = await client.query(`
            INSERT INTO icon_category_assignments (icon_id, category_id)
            VALUES ($1, $2)
            ON CONFLICT (icon_id, category_id) DO NOTHING
            RETURNING id
          `, [iconId, id]);

          if (assignmentResult.rows.length > 0) {
            assignments.push({
              icon_id: iconId,
              assignment_id: assignmentResult.rows[0].id
            });
          } else {
            assignments.push({
              icon_id: iconId,
              assignment_id: null,
              note: 'Already assigned'
            });
          }
        } catch (assignError) {
          errors.push({ icon_id: iconId, error: assignError.message });
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
      }, currentLang, currentLang === "ar" ? "تم تعيين الأيقونات بنجاح" : "Icons assigned successfully"));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error assigning icons to category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في تعيين الأيقونات" : "Failed to assign icons"));
  }
});

// DELETE /api/icon-categories/:categoryId/icons/:iconId - Remove icon from category
router.delete('/:categoryId/icons/:iconId', async (req, res) => {
  try {
    const { categoryId, iconId } = req.params;

    const result = await query(`
      DELETE FROM icon_category_assignments
      WHERE category_id = $1 AND icon_id = $2
      RETURNING id
    `, [categoryId, iconId]);

    if (result.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "التعيين غير موجود" : "Assignment not found"));
    }

    const currentLang = res.locals.lang ?? "en";
    return res.json(ok(null, currentLang, currentLang === "ar" ? "تم إزالة الأيقونة من الفئة بنجاح" : "Icon removed from category successfully"));
  } catch (error) {
    console.error('Error removing icon from category:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في إزالة الأيقونة" : "Failed to remove icon"));
  }
});

// ==============================================
// GET ICON CATEGORIES FOR AN ICON
// ==============================================

// GET /api/icon-categories/by-icon/:iconId - Get all categories for an icon
router.get('/by-icon/:iconId', async (req, res) => {
  try {
    const { iconId } = req.params;
    const { lang = 'en' } = req.query;

    // Verify icon exists
    const iconCheck = await query('SELECT id, name FROM assets WHERE id = $1', [iconId]);
    if (iconCheck.rows.length === 0) {
      const currentLang = res.locals.lang ?? "en";
      return res.status(404).json(fail(currentLang, currentLang === "ar" ? "الأيقونة غير موجودة" : "Icon not found"));
    }

    const result = await query(`
      SELECT 
        ic.id, ic.name, ic.name_en, ic.name_ar,
        ic.description, ic.description_en, ic.description_ar,
        ic.icon_asset_id, ic.slug, ic.parent_id, ic.sort_order,
        ic.is_active, ic.meta, ic.created_at, ic.updated_at,
        ica.created_at as assigned_at
      FROM icon_category_assignments ica
      INNER JOIN icon_categories ic ON ic.id = ica.category_id
      WHERE ica.icon_id = $1 AND ic.is_active = TRUE
      ORDER BY ic.sort_order ASC, ic.name ASC
    `, [iconId]);

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
      iconId,
      iconName: iconCheck.rows[0].name,
      categories,
      total: categories.length
    }, currentLang, currentLang === "ar" ? "تم جلب الفئات بنجاح" : "Categories fetched successfully"));
  } catch (error) {
    console.error('Error fetching categories for icon:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في جلب الفئات" : "Failed to fetch categories"));
  }
});

module.exports = router;

