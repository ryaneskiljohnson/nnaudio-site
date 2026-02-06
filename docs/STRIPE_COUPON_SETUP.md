# Create Stripe Coupon for Black Friday Sale

## Quick Setup (5 minutes)

### Step 1: Go to Stripe Dashboard

**Live Mode:** https://dashboard.stripe.com/coupons  
**Test Mode:** https://dashboard.stripe.com/test/coupons

⚠️ Create the coupon in **both** Test and Live modes!

---

### Step 2: Click "Create coupon"

---

### Step 3: Fill in Details

#### Coupon Information

**Coupon ID (IMPORTANT):**
```
BLACKFRIDAY2025
```
⚠️ Must be EXACTLY this - case sensitive!

**Name (for your reference):**
```
Black Friday 2025 Sale - Lifetime $99
```

---

#### Discount Details

**Type:**
- Select: **"Amount off"**

**Amount:**
```
50.00
```

**Currency:**
```
USD
```

**Calculation:**
- Regular price: $149
- Sale price: $99
- Discount: $50 off

---

#### Duration

**Select: "Once"**
- Customer can use the coupon once

---

#### Product Restrictions

**Applies to:**
- Select: **"Specific products"**
- Search and select: **Your Lifetime price/product**

**To find your product:**
1. Start typing "Lifetime" or "Pro"
2. Select the product that has the $149 price
3. Alternatively, select the price ID directly

---

### Step 4: Save

Click **"Create coupon"** button

---

### Step 5: Verify

After creation, verify:
- ✅ Coupon ID is `BLACKFRIDAY2025` (not `BLACKFRIDAY2025_abc123`)
- ✅ Amount is $50.00 USD
- ✅ Duration is "Once"
- ✅ Applies to Lifetime product

---

## Alternative: Create via Stripe CLI

If you have Stripe CLI installed:

```bash
# Test mode
stripe coupons create \
  --id BLACKFRIDAY2025 \
  --amount-off 5000 \
  --currency usd \
  --duration once \
  --name "Black Friday 2025 Sale - Lifetime $99"

# Live mode (add --live flag)
stripe coupons create \
  --id BLACKFRIDAY2025 \
  --amount-off 5000 \
  --currency usd \
  --duration once \
  --name "Black Friday 2025 Sale - Lifetime $99" \
  --live
```

Note: Amount is in cents (5000 = $50)

---

## Testing the Coupon

### Manual Test
1. Go to: https://dashboard.stripe.com/test/checkout
2. Create test checkout session
3. Apply coupon code: `BLACKFRIDAY2025`
4. Verify it reduces price by $50

### Automatic Test
1. Enable sale: `active: true` in `config/sales.ts`
2. Visit your pricing page
3. Select Lifetime plan
4. Click "Get Started"
5. Check Stripe checkout - should show $99

---

## Common Issues

### "Coupon not found" error
**Problem:** Coupon ID doesn't match  
**Solution:** Check spelling - must be exactly `BLACKFRIDAY2025`

### Coupon doesn't apply to product
**Problem:** Product restriction not set  
**Solution:** Edit coupon, add Lifetime product to restrictions

### Discount wrong amount
**Problem:** Amount_off incorrect  
**Solution:** Edit coupon, set to $50.00 (5000 cents)

### Works in test, not in live
**Problem:** Coupon only created in test mode  
**Solution:** Create coupon in live mode too

---

## After Black Friday

### Deactivate the Sale

**Option 1: Set inactive**
```typescript
// config/sales.ts
active: false
```

**Option 2: Let dates expire**
The sale will auto-deactivate after `endDate`

**Option 3: Delete/deactivate coupon**
- In Stripe Dashboard
- Deactivate `BLACKFRIDAY2025` coupon

---

## Reusing for Future Sales

### Christmas Sale
```typescript
export const CHRISTMAS_SALE: SaleConfig = {
  active: true,
  name: 'christmas_2025',
  title: '🎄 Christmas Sale',
  description: 'Lifetime access for just $99!',
  applicablePlans: ['lifetime'],
  salePrices: { lifetime: 99 },
  stripeCouponCode: 'CHRISTMAS2025',
  startDate: new Date('2025-12-20'),
  endDate: new Date('2025-12-27'),
  theme: {
    background: 'linear-gradient(135deg, #00C853, #00796B)',
    textColor: '#FFFFFF',
    accentColor: '#FFD700',
  },
};
```

Then create coupon `CHRISTMAS2025` in Stripe!

---

## Summary

1. Create coupon: `BLACKFRIDAY2025`
2. Set amount: $50 off
3. Apply to: Lifetime product
4. Enable sale: `active: true`
5. Done! 🎉

**Estimated time:** 5 minutes  
**Difficulty:** Easy ✅

---

**Last updated:** November 19, 2025

