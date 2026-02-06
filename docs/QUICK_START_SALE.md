# Black Friday Sale - Quick Start

## ⚡ 3 Steps to Launch

### Step 1: Create Stripe Coupon (2 minutes)

Go to: https://dashboard.stripe.com/coupons

```
ID:       BLACKFRIDAY2025
Amount:   $50.00 off
Duration: Once
Product:  Lifetime
```

### Step 2: Enable Sale (30 seconds)

**File:** `config/sales.ts`

Change line 22:
```typescript
active: true,  // ← Make sure this is true
```

### Step 3: Deploy (or restart dev server)

```bash
npm run dev
```

Or deploy to production.

---

## ✅ That's It!

Visit your pricing page and you should see:
- 🎁 Black Friday banner with countdown
- 💰 Lifetime plan at $99
- 🔥 60% OFF badge

---

## 📋 Quick Reference

**Enable sale:**  
`config/sales.ts` → `active: true`

**Disable sale:**  
`config/sales.ts` → `active: false`

**Change price:**  
`config/sales.ts` → `salePrices: { lifetime: 99 }`

**Change dates:**  
`config/sales.ts` → `startDate` and `endDate`

---

## 🎯 Current Configuration

```typescript
Sale Name:     Black Friday 2025
Sale Price:    $99 (lifetime only)
Coupon Code:   BLACKFRIDAY2025
Dates:         Nov 25 - Dec 2, 2025
Status:        Ready to activate
```

---

## 🔧 Troubleshooting

**Banner not showing?**
- Set `active: true` in `config/sales.ts`
- Check dates if using date range
- Restart server

**Discount not applying?**
- Create coupon in Stripe
- Check coupon ID: `BLACKFRIDAY2025`
- Verify it applies to Lifetime product

**Wrong price?**
- Check `salePrices.lifetime` in config
- Should be: `99` (not `9900`)

---

**Need help?** Check `BLACK_FRIDAY_SALE_SETUP.md` for detailed guide.

