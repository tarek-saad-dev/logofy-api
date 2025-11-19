import { Request, Response, NextFunction } from 'express';
import { getEntitlementForUser, Entitlement } from '../services/entitlementService';

/**
 * Extend Express Request to include entitlement
 */
declare global {
  namespace Express {
    interface Request {
      entitlement?: Entitlement;
    }
  }
}

/**
 * Middleware to load and attach user entitlement to req.entitlement
 * 
 * This middleware:
 * 1. Gets the user ID from req.user.id (assumes auth middleware ran first)
 * 2. Calls getEntitlementForUser to determine entitlement
 * 3. Attaches the result to req.entitlement
 * 4. Calls next() to continue
 * 
 * Usage:
 *   router.get('/protected-route', authenticate, entitlementMiddleware, (req, res) => {
 *     if (req.entitlement === 'pro') {
 *       // Allow access
 *     }
 *   });
 */
export async function entitlementMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure user is authenticated (should be set by auth middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get entitlement for the user
    const entitlement = await getEntitlementForUser(req.user.id);
    
    // Attach to request object
    req.entitlement = entitlement;
    
    // Continue to next middleware/route
    next();
  } catch (error) {
    console.error('Error in entitlement middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check user entitlement'
    });
  }
}

/**
 * Middleware to require 'pro' entitlement
 * 
 * Returns 403 if user is not 'pro'
 * 
 * Usage:
 *   router.post('/pro-only-route', authenticate, entitlementMiddleware, requirePro, handler);
 */
export function requirePro(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.entitlement !== 'pro') {
    return res.status(403).json({
      success: false,
      message: 'Pro subscription required. Please upgrade to access this feature.'
    });
  }
  next();
}

