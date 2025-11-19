import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { entitlementMiddleware, requirePro } from '../middleware/entitlement';
import { query } from '../config/database';
// ... other imports (cloudinary, sharp, etc.)

const router = express.Router();

/**
 * Example: GET /api/logo/:id/export/high-quality
 * 
 * This route demonstrates how to use entitlement checking to restrict
 * high-quality exports to Pro users only.
 * 
 * Flow:
 * 1. authenticate middleware: Verifies JWT and sets req.user
 * 2. entitlementMiddleware: Loads entitlement and sets req.entitlement
 * 3. requirePro middleware: Ensures req.entitlement === 'pro'
 * 4. Handler: Processes high-quality export
 */
router.get(
  '/logo/:id/export/high-quality',
  authenticate,              // Step 1: Verify user is authenticated
  entitlementMiddleware,     // Step 2: Load entitlement (sets req.entitlement)
  requirePro,                // Step 3: Require 'pro' entitlement
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // At this point, we know:
      // - User is authenticated (req.user exists)
      // - User has 'pro' entitlement (req.entitlement === 'pro')
      
      // Verify logo ownership
      const logoResult = await query(
        `SELECT id, owner_id FROM logos WHERE id = $1`,
        [id]
      );

      if (logoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Logo not found'
        });
      }

      const logo = logoResult.rows[0];

      // Check ownership (optional - you might want to allow exports of public templates)
      if (logo.owner_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to export this logo'
        });
      }

      // High-quality export parameters (only available to Pro users)
      const highQualityParams = {
        dpi: 600,        // Higher DPI for Pro users
        quality: 100,    // Maximum quality
        format: 'png'    // Lossless format
      };

      // ... rest of export logic (same as regular export route)
      // Generate high-quality export
      // Upload to Cloudinary
      // Return URL

      res.json({
        success: true,
        message: 'High-quality export completed',
        data: {
          // ... export data
        }
      });
    } catch (error: any) {
      console.error('Error in high-quality export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export logo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * Example: GET /api/logo/:id/export (with entitlement-based quality)
 * 
 * This route allows all users to export, but provides different quality
 * based on entitlement level.
 */
router.get(
  '/logo/:id/export',
  authenticate,
  entitlementMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const entitlement = req.entitlement; // 'guest' | 'trial' | 'pro'

      // Determine export quality based on entitlement
      let exportParams: {
        dpi: number;
        quality: number;
        maxWidth: number;
        maxHeight: number;
      };

      switch (entitlement) {
        case 'pro':
          // Pro users get highest quality
          exportParams = {
            dpi: 600,
            quality: 100,
            maxWidth: 5000,
            maxHeight: 5000
          };
          break;
        case 'trial':
          // Trial users get medium quality
          exportParams = {
            dpi: 300,
            quality: 90,
            maxWidth: 2000,
            maxHeight: 2000
          };
          break;
        case 'guest':
        default:
          // Guest users get low quality (watermarked or limited)
          exportParams = {
            dpi: 150,
            quality: 70,
            maxWidth: 1000,
            maxHeight: 1000
          };
          break;
      }

      // ... export logic using exportParams

      res.json({
        success: true,
        message: 'Export completed',
        data: {
          // ... export data
          entitlement: entitlement,
          quality: exportParams
        }
      });
    } catch (error: any) {
      console.error('Error in export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export logo'
      });
    }
  }
);

module.exports = router;

