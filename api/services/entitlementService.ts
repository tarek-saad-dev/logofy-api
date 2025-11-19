import { query } from '../config/database';

/**
 * User entitlement type
 * - 'pro': User has an active Stripe subscription
 * - 'trial': User has an active manual trial
 * - 'guest': User has no active subscription or trial
 */
export type Entitlement = 'guest' | 'trial' | 'pro';

/**
 * Get entitlement for a user
 * 
 * Logic:
 * 1. First check subscriptions table for active Stripe subscription
 * 2. If no valid Stripe subscription, check manual trial (users.tier and users.tier_expires_at)
 * 3. Otherwise return 'guest'
 * 
 * @param userId - The user's UUID
 * @returns The user's entitlement level
 */
export async function getEntitlementForUser(userId: string): Promise<Entitlement> {
  try {
    // Step 1: Check for active Stripe subscription
    const subscriptionResult = await query(
      `SELECT id, status, current_period_end 
       FROM subscriptions 
       WHERE user_id = $1 
         AND status IN ('active', 'trialing') 
         AND current_period_end > NOW()
       ORDER BY current_period_end DESC
       LIMIT 1`,
      [userId]
    );

    if (subscriptionResult.rows.length > 0) {
      // User has an active Stripe subscription
      return 'pro';
    }

    // Step 2: Check for manual trial (users.tier and users.tier_expires_at)
    const userResult = await query(
      `SELECT tier, tier_expires_at 
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      
      // Check if user has an active manual trial
      if (user.tier === 'trial' && user.tier_expires_at) {
        const tierExpiresAt = new Date(user.tier_expires_at);
        const now = new Date();
        
        if (tierExpiresAt > now) {
          // Trial is still active
          return 'trial';
        }
      }
    }

    // Step 3: No active subscription or trial
    return 'guest';
  } catch (error) {
    console.error('Error getting entitlement for user:', error);
    // On error, default to 'guest' to be safe
    return 'guest';
  }
}

