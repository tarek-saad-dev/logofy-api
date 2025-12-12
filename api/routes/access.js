const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * POST /api/access
 * Create or update the access boolean value
 * Body: { value: boolean }
 */
router.post('/', async (req, res) => {
    try {
        const { value } = req.body;

        // Validate input
        if (typeof value !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Value must be a boolean (true or false)'
            });
        }

        // Check if a record already exists
        const existingRecord = await query(
            'SELECT id FROM access ORDER BY created_at DESC LIMIT 1'
        );

        let result;
        if (existingRecord.rows.length > 0) {
            // Update existing record
            result = await query(
                'UPDATE access SET value = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [value, existingRecord.rows[0].id]
            );
        } else {
            // Create new record
            result = await query(
                'INSERT INTO access (value) VALUES ($1) RETURNING *',
                [value]
            );
        }

        if (result.rows.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save access value'
            });
        }

        res.json({
            success: true,
            data: {
                access: result.rows[0]
            },
            message: existingRecord.rows.length > 0 ? 'Access value updated successfully' : 'Access value created successfully'
        });
    } catch (error) {
        console.error('Error saving access value:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save access value',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/access
 * Get the current access boolean value
 */
router.get('/', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM access ORDER BY created_at DESC LIMIT 1'
        );

        if (result.rows.length === 0) {
            // Return default value if no record exists
            return res.json({
                success: true,
                data: {
                    access: {
                        id: null,
                        value: false,
                        created_at: null,
                        updated_at: null
                    }
                },
                message: 'No access record found, returning default value'
            });
        }

        res.json({
            success: true,
            data: {
                access: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Error fetching access value:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch access value',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

