# Billing System Implementation Summary

## ✅ What Was Created

### 1. Checkout Session Route
**File**: `api/routes/billing.js`

**Endpoint**: `POST /api/billing/create-checkout-session`

**What it does**:
- Reads authenticated user from `req.user` (set by auth middleware)
- Accepts plan in request body: `{ "plan": "weekly" | "monthly" | "yearly" }`
- Maps plan to Stripe price IDs from environment variables
- Creates Stripe Checkout Session in subscription mode
- Returns checkout URL for frontend redirect

**Example Request**:
```bash
POST /api/billing/create-checkout-session
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "plan": "monthly"
}
```

**Example Response**:
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

---

### 2. Stripe Webhook Handler
**File**: `api/routes/stripeWebhook.js`

**Endpoint**: `POST /api/stripe/webhook`

**What it does**:
- Uses `express.raw({ type: 'application/json' })` for signature verification
- Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handles these events:
  - `checkout.session.completed` - When user completes checkout
  - `customer.subscription.created` - When subscription is created
  - `customer.subscription.updated` - When subscription is updated
  - `customer.subscription.deleted` - When subscription is canceled

**Event Handling Flow**:
1. **checkout.session.completed** → Retrieves subscription → Calls `upsertSubscription()`
2. **customer.subscription.created/updated** → Calls `upsertSubscription()`
3. **customer.subscription.deleted** → Updates subscription status to 'canceled' and sets `canceled_at`

**Upsert Logic**:
- Finds user by Stripe customer ID (from existing subscriptions)
- If not found, retrieves customer from Stripe and finds user by email
- Upserts subscription data into `subscriptions` table

---

### 3. Entitlement Service
**File**: `api/services/entitlementService.js`

**Function**: `getEntitlementForUser(userId: string)`

**Returns**: `'guest' | 'trial' | 'pro'`

**Logic Flow**:

```
1. Check subscriptions table:
   └─ Query: status IN ('active', 'trialing') AND current_period_end > NOW()
   └─ If found → return 'pro'

2. Check manual trial (users.tier):
   └─ Query: tier = 'trial' AND tier_expires_at > NOW()
   └─ If found → return 'trial'

3. Default:
   └─ return 'guest'
```

**Priority**: Stripe subscription > Manual trial > Guest

---

### 4. Entitlement Middleware
**File**: `api/middleware/entitlement.js`

**Functions**:
- `entitlementMiddleware` - Loads entitlement and attaches to `req.entitlement`
- `requirePro` - Requires 'pro' entitlement (returns 403 if not pro)

**Usage Example**:
```javascript
const { authenticate } = require('./middleware/auth');
const { entitlementMiddleware, requirePro } = require('./middleware/entitlement');

// Pro-only route
router.get('/pro-feature', 
  authenticate,              // Verify user is authenticated
  entitlementMiddleware,     // Load entitlement → sets req.entitlement
  requirePro,               // Require 'pro' → returns 403 if not pro
  (req, res) => {
    // Only Pro users reach here
    res.json({ message: 'Pro feature' });
  }
);

// Different quality based on entitlement
router.get('/export', 
  authenticate,
  entitlementMiddleware,
  (req, res) => {
    const entitlement = req.entitlement; // 'guest' | 'trial' | 'pro'
    
    let quality;
    if (entitlement === 'pro') {
      quality = { dpi: 600, quality: 100 };
    } else if (entitlement === 'trial') {
      quality = { dpi: 300, quality: 90 };
    } else {
      quality = { dpi: 150, quality: 70 };
    }
    
    // Use quality settings...
  }
);
```

---

### 5. Database Migrations

#### Subscriptions Table
**File**: `migrations/add_subscriptions_table.sql` (already exists)

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `stripe_customer_id` (VARCHAR)
- `stripe_sub_id` (VARCHAR)
- `status` (ENUM: 'active', 'trialing', 'past_due', 'canceled')
- `current_period_end` (TIMESTAMPTZ)
- `canceled_at` (TIMESTAMPTZ, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### Tier Columns
**File**: `migrations/add_tier_columns_to_users.sql` (new)

**Adds to users table**:
- `tier` (TEXT, nullable) - Manual trial tier ('trial', 'pro', 'guest', etc.)
- `tier_expires_at` (TIMESTAMPTZ, nullable) - Trial expiration date

---

## 🔄 Complete Flow

### Subscription Flow

```
1. User clicks "Subscribe" on frontend
   ↓
2. Frontend calls: POST /api/billing/create-checkout-session
   Body: { "plan": "monthly" }
   ↓
3. Backend creates Stripe Checkout Session
   Returns: { "url": "https://checkout.stripe.com/..." }
   ↓
4. Frontend redirects user to Stripe Checkout
   ↓
5. User completes payment on Stripe
   ↓
6. Stripe sends webhook: checkout.session.completed
   ↓
7. POST /api/stripe/webhook receives event
   ↓
8. Backend retrieves subscription from Stripe
   ↓
9. Backend upserts into subscriptions table
   ↓
10. User entitlement = 'pro'
```

### Entitlement Check Flow

```
1. User makes request to protected route
   ↓
2. authenticate middleware: Verifies JWT → sets req.user
   ↓
3. entitlementMiddleware: Calls getEntitlementForUser()
   ↓
4. getEntitlementForUser() checks:
   a. subscriptions table (active Stripe subscription?)
   b. users.tier (active manual trial?)
   c. default to 'guest'
   ↓
5. Sets req.entitlement = 'pro' | 'trial' | 'guest'
   ↓
6. requirePro middleware (if used): Checks req.entitlement === 'pro'
   ↓
7. Route handler executes
```

---

## 📝 Environment Variables

Add to `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_WEEKLY=price_your_weekly_price_id_here
STRIPE_PRICE_MONTHLY=price_your_monthly_price_id_here
STRIPE_PRICE_YEARLY=price_your_yearly_price_id_here

# Frontend URL (for Stripe Checkout redirects)
FRONTEND_URL=http://localhost:3000
```

---

## 🚀 Setup Steps

1. **Run Database Migrations**:
   ```bash
   # Add tier columns to users table
   psql $DATABASE_URL -f migrations/add_tier_columns_to_users.sql
   ```

2. **Set Environment Variables**:
   - Copy from `env.example` to `.env`
   - Fill in Stripe keys and price IDs

3. **Configure Stripe Webhook**:
   - Go to Stripe Dashboard → Webhooks
   - Create endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

4. **Routes are Already Added**:
   - `api/index.js` already includes billing routes
   - No additional setup needed

---

## 🧪 Testing

### Test Checkout Session
```bash
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "monthly"}'
```

### Test Webhook (Stripe CLI)
```bash
# Install Stripe CLI
# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### Test Entitlement
```bash
# After user has active subscription
curl http://localhost:3000/api/some-protected-route \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📚 Files Created

### JavaScript (Production Ready)
- ✅ `api/routes/billing.js` - Checkout session route
- ✅ `api/routes/stripeWebhook.js` - Webhook handler
- ✅ `api/services/entitlementService.js` - Entitlement logic
- ✅ `api/middleware/entitlement.js` - Entitlement middleware

### TypeScript (Reference/Examples)
- 📄 `api/routes/billing.ts` - TypeScript version
- 📄 `api/routes/stripeWebhook.ts` - TypeScript version
- 📄 `api/services/entitlementService.ts` - TypeScript version
- 📄 `api/middleware/entitlement.ts` - TypeScript version
- 📄 `api/routes/exportWithEntitlement.example.ts` - Example usage

### Database
- ✅ `migrations/add_tier_columns_to_users.sql` - Tier columns migration

### Documentation
- ✅ `BILLING_SETUP_GUIDE.md` - Complete setup guide
- ✅ `BILLING_IMPLEMENTATION_SUMMARY.md` - This file

---

## 💡 Key Points

1. **Priority Order**: Stripe subscription > Manual trial > Guest
2. **Webhook Security**: Always verify signature using `STRIPE_WEBHOOK_SECRET`
3. **User Linking**: Webhook finds user by Stripe customer ID or email
4. **Error Handling**: Defaults to 'guest' on errors (safe fallback)
5. **Middleware Chain**: `authenticate` → `entitlementMiddleware` → `requirePro` (optional)

---

## 🔧 Manual Trial Management

To grant a manual trial:

```sql
UPDATE users 
SET tier = 'trial', 
    tier_expires_at = NOW() + INTERVAL '7 days'
WHERE id = 'user-uuid-here';
```

To check user entitlement:

```sql
-- Check Stripe subscription
SELECT * FROM subscriptions 
WHERE user_id = 'user-uuid' 
  AND status IN ('active', 'trialing') 
  AND current_period_end > NOW();

-- Check manual trial
SELECT tier, tier_expires_at FROM users WHERE id = 'user-uuid';
```

---

## ✅ All Requirements Met

- ✅ Checkout Session route with plan selection
- ✅ Webhook handler with event processing
- ✅ Subscription upsert logic
- ✅ Entitlement function with priority logic
- ✅ Entitlement middleware
- ✅ Example export route with entitlement check
- ✅ Database migrations
- ✅ Environment variable configuration
- ✅ Complete documentation

