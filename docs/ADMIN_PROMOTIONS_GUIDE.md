# Admin Promotions Manager - User Guide

## 🎯 Quick Access

**URL:** http://localhost:3000/admin/promotions (or https://cymasphere.com/admin/promotions)

**Navigation:** Admin Console → Promotions

---

## 📊 What You Can Do

The Promotions page allows you to:

1. **Enable/Disable Sales** - Toggle sales on/off with one click
2. **Set Discount Amount** - Choose percentage or fixed dollar amount
3. **Preview Pricing** - See exactly what customers will see
4. **Manage Coupon Codes** - Configure Stripe coupon integration
5. **Real-time Updates** - Changes take effect immediately

---

## 🎮 How to Use

### 1. Enable/Disable Sale

**Toggle the sale status:**
- Click the **ACTIVE/INACTIVE** button
- Green (ACTIVE) = Sale is live
- Gray (INACTIVE) = Sale is disabled

When active:
- Black Friday banner appears on pricing page
- Lifetime plan shows sale price
- Discount auto-applied at checkout

### 2. Configure Discount

**Choose discount type:**
- **Fixed Amount ($):** Exact dollar amount off (e.g., $50 off)
- **Percentage (%):** Percentage off the price (e.g., 33% off)

**Set discount value:**
- Enter the amount or percentage
- Sale price updates automatically in the preview

**Examples:**
```
Discount Type: Amount ($)
Discount Value: 50
Result: $149 - $50 = $99

Discount Type: Percentage (%)
Discount Value: 33
Result: $149 × 67% = $100 (approx)
```

### 3. Preview Pricing

The preview section shows:
- **Original price:** $249 (strikethrough)
- **Sale price:** $99 (large, gradient)
- **Savings badge:** "60% OFF - Save $150!"
- **Coupon info:** Stripe coupon code and amount

### 4. Save Configuration

Click **"Save Configuration"** to:
- Update the `config/sales.ts` file
- Apply changes to the website
- Show confirmation message

⚠️ **Important:** After saving, you must:
- Restart the dev server (for local development)
- OR deploy to production (for live site)

---

## 💡 Common Scenarios

### Scenario 1: Black Friday Sale - $99 Lifetime

```
1. Set discount type: Amount ($)
2. Set discount value: 50
3. Result: $99 sale price
4. Coupon needed: $50 off
5. Click "Save Configuration"
6. Create Stripe coupon: BLACKFRIDAY2025 ($50 off)
7. Toggle "ACTIVE"
8. Deploy/restart
```

### Scenario 2: 50% Off Sale

```
1. Set discount type: Percentage (%)
2. Set discount value: 50
3. Result: ~$75 sale price
4. Coupon needed: $74 off
5. Click "Save Configuration"
6. Create Stripe coupon with calculated amount
7. Toggle "ACTIVE"
8. Deploy/restart
```

### Scenario 3: Disable Sale

```
1. Toggle "INACTIVE"
2. Click "Save Configuration"
3. Deploy/restart
4. Pricing reverts to normal
```

---

## 🔧 Technical Details

### What Gets Updated

**File:** `config/sales.ts`

**Changes:**
```typescript
active: true,  // ← Enabled/disabled
salePrices: {
  lifetime: 99,  // ← Sale price
},
description: 'Lifetime access for just $99 - Save $150!',  // ← Auto-calculated
```

### Stripe Integration

The system automatically calculates:
- **Sale Price:** Based on your discount settings
- **Coupon Amount:** How much off to set in Stripe
- **Savings Display:** What to show customers

**You must manually:**
- Create the Stripe coupon with the exact amount shown
- Use the coupon code displayed (e.g., BLACKFRIDAY2025)

---

## ⚠️ Important Notes

### 1. Server Restart Required
After saving changes, you must:
- **Local:** Restart dev server (`npm run dev`)
- **Production:** Deploy the changes

### 2. Stripe Coupon Must Match
The Stripe coupon amount must exactly match what the page shows.

**Example:**
- Page shows: "$50 off"
- Stripe coupon: Must be exactly $50.00 off

### 3. Preview Before Activating
Always:
1. Save configuration
2. Restart/deploy
3. Click "Preview on Website"
4. Verify pricing looks correct
5. Then toggle ACTIVE

---

## 🎨 Visual Guide

### Promotions Dashboard

```
┌──────────────────────────────────────────────────────┐
│ 🔊 Promotions & Sales                                │
│ Manage promotional campaigns and discount pricing    │
├──────────────────────────────────────────────────────┤
│                                                       │
│ 🔥 Black Friday Sale Status                          │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [✅ ACTIVE] 🔥 Sale is currently live            │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ 💰 Pricing Configuration                             │
│ ┌────────────────────┬────────────────────────────┐  │
│ │ Discount Type      │ Discount Value             │  │
│ │ [Amount ($)]       │ [50]                       │  │
│ └────────────────────┴────────────────────────────┘  │
│                                                       │
│ Stripe Coupon Code                                   │
│ [BLACKFRIDAY2025                                 ]   │
│                                                       │
│ 👁️  Pricing Preview                                  │
│ ┌──────────────────────────────────────────────────┐ │
│ │         $249  (crossed out)                      │ │
│ │         $99   (large, red)                       │ │
│ │      🔥 60% OFF - Save $150!                     │ │
│ │                                                  │ │
│ │  Stripe coupon: BLACKFRIDAY2025 - $50 off       │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ⚠️  Make sure Stripe coupon exists with $50 off      │
│                                                       │
│ [💾 Save Configuration] [👁️ Preview] [🔄 Reload]    │
└──────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

Before going live:

- [ ] Set discount value in admin panel
- [ ] Save configuration
- [ ] Restart dev server (or deploy)
- [ ] Create matching Stripe coupon
- [ ] Click "Preview on Website"
- [ ] Verify banner shows correct messaging
- [ ] Verify pricing shows correct sale price
- [ ] Test checkout - coupon should auto-apply
- [ ] Verify final Stripe amount matches
- [ ] Toggle ACTIVE
- [ ] Monitor first few purchases

---

## 🔄 Workflow

### Starting a Sale

```
1. Admin Panel → Promotions
2. Set discount (e.g., $50 off)
3. Save Configuration
4. Restart/Deploy
5. Create Stripe coupon
6. Test in preview
7. Toggle ACTIVE
8. Monitor sales
```

### Ending a Sale

```
1. Admin Panel → Promotions
2. Toggle INACTIVE
3. Save Configuration
4. Restart/Deploy
5. Verify pricing reverted
```

---

## 💰 Pricing Examples

### Current Setup

| Setting | Value |
|---------|-------|
| Normal Price | $149 |
| Original Price | $249 |
| Black Friday | $99 |
| Discount | $50 off |
| Savings | $150 (60%) |

### Alternative Configs

**25% Off Sale ($112):**
```
Discount Type: Percentage (%)
Discount Value: 25
Result: $149 × 75% = $112
Coupon: $37 off
```

**33% Off Sale ($100):**
```
Discount Type: Percentage (%)
Discount Value: 33
Result: $149 × 67% = $100
Coupon: $49 off
```

**Fixed $79 Sale:**
```
Discount Type: Amount ($)
Discount Value: 70
Result: $149 - $70 = $79
Coupon: $70 off
```

---

## 🎯 Best Practices

### 1. Test Before Activating
- Always save, deploy, and test before toggling ACTIVE
- Use "Preview on Website" button
- Test actual checkout flow

### 2. Clear Communication
- Match coupon code to sale name (BLACKFRIDAY2025)
- Ensure Stripe coupon description is clear
- Monitor customer support for confusion

### 3. Monitor Performance
- Track conversion rates during sale
- Compare to normal rates
- Adjust if needed

### 4. Plan Deactivation
- Set calendar reminder for sale end date
- Have process ready to toggle INACTIVE
- Verify pricing reverts correctly

---

## 🆘 Troubleshooting

### "Coupon not found" in checkout
**Solution:** Create the coupon in Stripe with exact code shown

### Pricing not updating
**Solution:** Restart dev server or redeploy

### Banner not appearing
**Solution:** Toggle ACTIVE and clear browser cache

### Wrong discount amount
**Solution:** Check Stripe coupon matches calculated amount

---

## 📞 Support

For issues or questions:
- Check: `BLACK_FRIDAY_SALE_SETUP.md`
- Check: `STRIPE_COUPON_SETUP.md`
- Review: `config/sales.ts` directly

---

**Created:** November 19, 2025  
**Status:** ✅ Ready to Use

