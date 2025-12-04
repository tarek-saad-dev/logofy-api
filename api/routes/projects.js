const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/projects
 * Get all projects for the authenticated user
 * Query params: page, limit, search (optional)
 */
router.get('/', authenticate, async(req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        // Build query with soft delete filter (only non-deleted projects)
        // Join with logos table to get thumbnail_url
        let countQuery = 'SELECT COUNT(*) FROM projects WHERE user_id = $1 AND deleted_at IS NULL';
        let dataQuery = `
            SELECT 
                p.id, 
                p.title,
                p.logo_id,
                l.thumbnail_url as logo_thumbnail_url
            FROM projects p
            LEFT JOIN logos l ON l.id = p.logo_id
            WHERE p.user_id = $1 AND p.deleted_at IS NULL
        `;
        const queryParams = [userId];

        // Add search filter if provided
        if (search) {
            countQuery += ' AND title ILIKE $2';
            dataQuery += ' AND p.title ILIKE $2';
            queryParams.push(`%${search}%`);
        }

        // Add ordering and pagination
        dataQuery += ' ORDER BY p.updated_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
        queryParams.push(limit, offset);

        // Get total count
        const countResult = await query(countQuery, queryParams.slice(0, search ? 2 : 1));
        const total = parseInt(countResult.rows[0].count);

        // Get projects with logo thumbnail
        const result = await query(dataQuery, queryParams);

        // Map to simple format with id, title, and thumbnailUrl
        const projects = result.rows.map(row => {
            // Use logo thumbnail_url if available, otherwise try to extract from json_doc
            let thumbnailUrl = row.logo_thumbnail_url || null;
            
            // If no logo thumbnail, try to extract from json_doc as fallback
            // (This requires fetching json_doc separately, but for now we'll just use logo thumbnail)
            // Note: We removed json_doc from SELECT to keep response lightweight
            // If you need json_doc thumbnail fallback, you can add it back

            return {
                id: row.id,
                title: row.title,
                thumbnailUrl: thumbnailUrl,
                logoId: row.logo_id || null
            };
        });

        res.json({
            success: true,
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID (only if owned by user)
 */
router.get('/:id', authenticate, async(req, res) => {
    try {
        const userId = req.userId;
        const projectId = req.params.id;

        // Validate that userId and projectId are present
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required'
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID format'
            });
        }

        // Query with explicit parameter binding to ensure only one project is returned
        // Join with logos to get thumbnail_url
        const result = await query(
            `SELECT 
                p.id, 
                p.user_id, 
                p.title, 
                p.json_doc, 
                p.logo_id,
                l.thumbnail_url as logo_thumbnail_url,
                p.created_at, 
                p.updated_at, 
                p.deleted_at 
            FROM projects p
            LEFT JOIN logos l ON l.id = p.logo_id
            WHERE p.id = $1 AND p.user_id = $2 AND p.deleted_at IS NULL 
            LIMIT 1`, [projectId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or access denied'
            });
        }

        // Ensure we only return the first (and should be only) row
        const project = result.rows[0];
        
        // Add thumbnailUrl to project response
        project.thumbnailUrl = project.logo_thumbnail_url || null;
        delete project.logo_thumbnail_url; // Clean up internal field name

        res.json({
            success: true,
            data: {
                project
            }
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', authenticate, async(req, res) => {
    try {
        const userId = req.userId;
        const { title, json_doc, logo_id } = req.body;

        // Validation
        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        if (title.length > 200) {
            return res.status(400).json({
                success: false,
                message: 'Title must be 200 characters or less'
            });
        }

        if (!json_doc) {
            return res.status(400).json({
                success: false,
                message: 'json_doc is required'
            });
        }

        // Validate json_doc is a valid JSON object
        let jsonDocValue;
        try {
            jsonDocValue = typeof json_doc === 'string' ? JSON.parse(json_doc) : json_doc;
            if (typeof jsonDocValue !== 'object' || jsonDocValue === null) {
                throw new Error('json_doc must be a valid JSON object');
            }
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: 'json_doc must be a valid JSON object'
            });
        }

        // Validate logo_id if provided
        if (logo_id) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(logo_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid logo_id format'
                });
            }
            // Verify logo exists
            const logoCheck = await query('SELECT id FROM logos WHERE id = $1', [logo_id]);
            if (logoCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Logo not found'
                });
            }
        }

        // Create project (let PostgreSQL generate the UUID using gen_random_uuid())
        const result = await query(
            'INSERT INTO projects (user_id, title, json_doc, logo_id) VALUES ($1, $2, $3, $4) RETURNING id, user_id, title, json_doc, logo_id, created_at, updated_at, deleted_at', [userId, title.trim(), JSON.stringify(jsonDocValue), logo_id || null]
        );

        // pg driver automatically parses JSONB, return the project as-is
        const project = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: {
                project
            }
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create project',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * PUT /api/projects/:id
 * Update an existing project
 */
router.put('/:id', authenticate, async(req, res) => {
    try {
        const userId = req.userId;
        const projectId = req.params.id;
        const { title, json_doc, logo_id } = req.body;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID format'
            });
        }

        // Check if project exists and belongs to user
        const checkResult = await query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL', [projectId, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or access denied'
            });
        }

        // Build update query dynamically based on provided fields
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (title !== undefined) {
            if (title.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Title cannot be empty'
                });
            }
            if (title.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Title must be 200 characters or less'
                });
            }
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(title.trim());
        }

        if (json_doc !== undefined) {
            // Validate json_doc is a valid JSON object
            let jsonDocValue;
            try {
                jsonDocValue = typeof json_doc === 'string' ? JSON.parse(json_doc) : json_doc;
                if (typeof jsonDocValue !== 'object' || jsonDocValue === null) {
                    throw new Error('json_doc must be a valid JSON object');
                }
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: 'json_doc must be a valid JSON object'
                });
            }
            updateFields.push(`json_doc = $${paramIndex++}`);
            updateValues.push(JSON.stringify(jsonDocValue));
        }

        if (logo_id !== undefined) {
            // Validate logo_id format if provided
            if (logo_id !== null && logo_id !== '') {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(logo_id)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid logo_id format'
                    });
                }
                // Verify logo exists
                const logoCheck = await query('SELECT id FROM logos WHERE id = $1', [logo_id]);
                if (logoCheck.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Logo not found'
                    });
                }
            }
            updateFields.push(`logo_id = $${paramIndex++}`);
            updateValues.push(logo_id || null);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update. Provide title and/or json_doc'
            });
        }

        // Add project ID and user ID to params
        updateValues.push(projectId, userId);

        // Execute update (updated_at will be automatically updated by trigger)
        const updateQuery = `
            UPDATE projects 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND deleted_at IS NULL
            RETURNING id, user_id, title, json_doc, logo_id, created_at, updated_at, deleted_at
        `;
        
        const result = await query(updateQuery, updateValues);
        
        // Fetch logo thumbnail if logo_id exists
        const project = result.rows[0];
        if (project.logo_id) {
            const logoRes = await query('SELECT thumbnail_url FROM logos WHERE id = $1', [project.logo_id]);
            if (logoRes.rows.length > 0) {
                project.thumbnailUrl = logoRes.rows[0].thumbnail_url;
            } else {
                project.thumbnailUrl = null;
            }
        } else {
            project.thumbnailUrl = null;
        }

        res.json({
            success: true,
            message: 'Project updated successfully',
            data: {
                project
            }
        });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update project',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * DELETE /api/projects/:id
 * Soft delete a project (set deleted_at timestamp)
 */
router.delete('/:id', authenticate, async(req, res) => {
    try {
        const userId = req.userId;
        const projectId = req.params.id;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID format'
            });
        }

        // Check if project exists and belongs to user
        const checkResult = await query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL', [projectId, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or access denied'
            });
        }

        // Soft delete (set deleted_at)
        const result = await query(
            'UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id, title', [projectId, userId]
        );

        res.json({
            success: true,
            message: 'Project deleted successfully',
            data: {
                project: {
                    id: result.rows[0].id,
                    title: result.rows[0].title
                }
            }
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete project',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;