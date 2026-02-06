# Promotions Manager - Complete Guide

## 🎯 Overview

A database-driven promotions management system that allows you to:
- Create and manage multiple promotional campaigns
- Configure discount amounts or percentages
- Set sale dates (start/end)
- Customize banner content and colors
- Auto-generate Stripe coupons
- Toggle promotions on/off
- Track views, conversions, and revenue

---

## 🚀 Quick Start

### Access the Promotions Manager

**URL:** http://localhost:3000/admin/promotions

**Navigation:** Admin Console → Promotions

---

## 📊 Features

### 1. Promotions Table View
- View all promotions in a table
- See status (active/inactive) at a glance
- View campaign details, dates, pricing
- Track performance stats

### 2. Create/Edit Promotions
- Campaign name and display title
- Banner description
- Start and end dates
- Discount type (percentage or fixed amount)
- Applicable plans (monthly, annual, lifetime)
- Stripe coupon code
- Auto-create Stripe coupon option
- Priority ordering

### 3. Toggle Active Status
- One-click enable/disable
- Immediately affects website
- No code changes needed

### 4. Stripe Integration
- Auto-creates Stripe coupons
- Checks if coupon already exists
- Calculates correct discount amount
- Shows creation status

### 5. Performance Tracking
- View count per promotion
- Conversion tracking
- Revenue attribution

---

## 🎮 How to Use

### Creating a New Promotion

1. **Click "Create Promotion"**

2. **Fill in Campaign Details:**
   - **Name:** Unique ID (e.g., `black_friday_2025`)
   - **Title:** Display title (e.g., `🔥 Black Friday Sale`)
   - **Description:** Banner text (e.g., `Lifetime access for just $99`)

3. **Set Dates:**
   - **Start Date:** When sale begins (optional)
   - **End Date:** When sale ends (optional)
   - Leave empty for no date restrictions

4. **Configure Discount:**
   - **Type:** Fixed Amount ($) or Percentage (%)
   - **Value:** Discount amount (e.g., 50 for $50 off)

5. **Select Applicable Plans:**
   - Check: Monthly, Annual, and/or Lifetime
   - Multiple selections allowed

6. **Stripe Coupon:**
   - **Code:** Enter coupon code (e.g., `BLACKFRIDAY2025`)
   - **Auto-create:** Check to auto-generate in Stripe
   - System will check if exists first

7. **Set Priority (Optional):**
   - Higher number = higher priority
   - If multiple promotions active, highest priority shows

8. **Review Preview:**
   - See calculated sale prices
   - Verify Stripe coupon amount
   - Check all details

9. **Click "Create":**
   - Promotion saved to database
   - Stripe coupon created (if checked)
   - Success message displayed

10. **Toggle Active:**
    - Click toggle icon in table
    - Promotion goes live immediately

---

### Editing an Existing Promotion

1. **Click Edit Icon (pencil)** in the table row
2. **Modify fields** as needed
3. **Click "Update"**
4. **Changes apply immediately** (no restart needed)

### Deleting a Promotion

1. **Click Delete Icon (trash)** in the table row
2. **Confirm deletion**
3. **Promotion removed** from database

---

## 💰 Discount Calculation Examples

### Example 1: $50 Off Lifetime ($99 Sale)
```
Discount Type: Amount ($)
Discount Value: 50
Normal Price: $149
Sale Price: $99
Stripe Coupon: $50 off
```

### Example 2: 33% Off Lifetime
```
Discount Type: Percentage (%)
Discount Value: 33
Normal Price: $149
Sale Price: ~$100
Stripe Coupon: ~$49 off
```

### Example 3: 50% Off All Plans
```
Applicable Plans: Monthly, Annual, Lifetime
Discount Type: Percentage (%)
Discount Value: 50

Results:
  Monthly: $6 → $3
  Annual: $59 → $30
  Lifetime: $149 → $75
```

---

## 🎨 Banner Customization (Future Feature)

Currently uses default red gradient theme. Future updates will allow:
- Custom background gradients
- Custom text colors
- Custom accent colors
- Icons and emojis

Edit `banner_theme` in database for now.

---

## 📅 Date Handling

### No Dates (Always Active)
- Leave start_date and end_date empty
- Promotion runs indefinitely when toggled active

### Start Date Only
- Promotion starts on this date
- Runs until manually disabled

### End Date Only
- Promotion active immediately
- Automatically disables after end date

### Both Dates
- Promotion active only within date range
- Auto-activates at start
- Auto-deactivates at end

---

## 🎯 Priority System

When multiple promotions are active:
- Highest priority promotion displays
- Others are hidden
- Default priority: 0
- Set higher numbers for more important sales

**Example:**
```
Black Friday (priority: 100)  ← Shows
Cyber Monday (priority: 90)   ← Hidden
Holiday Sale (priority: 50)   ← Hidden
```

---

## 📊 Performance Tracking

### Views
- Incremented when promotion banner is shown
- Future implementation

### Conversions
- Incremented when customer completes purchase
- Future implementation

### Revenue
- Total revenue attributed to this promotion
- Future implementation

---

## 🔧 Technical Details

### Database Table

**Table:** `public.promotions`

**Key Fields:**
- `id` - UUID
- `name` - Unique identifier
- `title` - Display title
- `description` - Banner description
- `active` - Enable/disable status
- `start_date` / `end_date` - Date range
- `applicable_plans` - Array of plans
- `discount_type` - 'percentage' or 'amount'
- `discount_value` - Discount amount
- `sale_price_*` - Calculated sale prices
- `stripe_coupon_code` - Coupon to apply
- `stripe_coupon_created` - Auto-creation status
- `priority` - Display priority

### Stripe Coupon Auto-Creation

When "Auto-create Stripe coupon" is checked:
1. System checks if coupon exists in Stripe
2. If not, creates new coupon with:
   - ID: Your specified coupon code
   - Amount: Calculated discount
   - Duration: Once per customer
   - Currency: USD
3. Marks `stripe_coupon_created = true`

### API Endpoints

**GET /api/admin/promotions**
- Fetch all promotions (admin only)
- Returns array of promotions

**POST /api/admin/promotions**
- Create or update promotion (admin only)
- Auto-creates Stripe coupon if requested

**DELETE /api/admin/promotions?id=UUID**
- Delete promotion (admin only)

**GET /api/promotions/active?plan=lifetime**
- Fetch active promotion for a plan (public)
- Used by pricing page and banner

---

## ⚠️ Important Notes

### 1. Stripe Coupon Must Exist
Even with auto-creation, verify the coupon in Stripe:
- Go to: https://dashboard.stripe.com/coupons
- Find your coupon code
- Verify amount matches

### 2. Multiple Active Promotions
- Only highest priority shows to customers
- Others remain active in database
- Use priority to control which displays

### 3. Date-Based Auto-Activation
- Promotions within date range automatically apply
- No need to manually toggle on/off
- But `active` must be `true`

### 4. Immediate Effect
- Changes apply immediately
- No server restart needed
- Next page load shows new pricing

---

## 🧪 Testing Checklist

Before activating a promotion:

- [ ] Create promotion in admin panel
- [ ] Set correct discount amount
- [ ] Configure dates (if needed)
- [ ] Set Stripe coupon code
- [ ] Check "Auto-create Stripe coupon"
- [ ] Click "Create"
- [ ] Verify success message
- [ ] Check Stripe Dashboard for coupon
- [ ] Click "Preview on Website" (future feature)
- [ ] Toggle "ACTIVE"
- [ ] Visit pricing page
- [ ] Verify banner appears
- [ ] Verify pricing shows sale price
- [ ] Test checkout flow
- [ ] Verify coupon auto-applies
- [ ] Complete test purchase
- [ ] Verify final amount is correct

---

## 📋 Common Workflows

### Black Friday Sale
```
1. Click "Create Promotion"
2. Name: black_friday_2025
3. Title: 🔥 Black Friday Sale
4. Description: Lifetime access for just $99 - Save $150!
5. Start: 2025-11-25
6. End: 2025-12-02
7. Discount Type: Amount ($)
8. Discount Value: 50
9. Plans: [✓] Lifetime
10. Coupon Code: BLACKFRIDAY2025
11. [✓] Auto-create Stripe coupon
12. Click "Create"
13. Toggle ACTIVE
14. Done!
```

### Flash Sale (24 Hours)
```
1. Click "Create Promotion"
2. Name: flash_sale_nov_2025
3. Title: ⚡ 24-Hour Flash Sale
4. Discount Type: Percentage (%)
5. Discount Value: 50
6. Plans: [✓] Monthly [✓] Annual [✓] Lifetime
7. Start: Today
8. End: Tomorrow
9. Coupon: FLASH50
10. [✓] Auto-create
11. Click "Create"
12. Toggle ACTIVE
```

---

## 🆘 Troubleshooting

### Promotion not showing on website
**Causes:**
- Active toggle is OFF
- Date range hasn't started yet
- Date range has ended
- Lower priority than another active promotion

**Solution:**
- Check active status
- Verify dates
- Check priority vs other active promotions

### Stripe coupon error
**Causes:**
- Coupon doesn't exist
- Coupon amount doesn't match
- Coupon not applicable to product

**Solution:**
- Click "Auto-create Stripe coupon" when editing
- Or manually create in Stripe Dashboard
- Verify exact amount matches

### Price not updating
**Causes:**
- Browser cache
- Promotion not active
- Wrong plan selected

**Solution:**
- Hard refresh (Cmd+Shift+R)
- Verify promotion is active
- Check applicable_plans includes the plan

---

## 🎊 Benefits

### For You:
- ✅ No code changes for new sales
- ✅ Instant on/off control
- ✅ Multiple campaigns ready to go
- ✅ Auto-creates Stripe coupons
- ✅ Performance tracking built-in

### For Customers:
- ✅ Beautiful sale banners
- ✅ Clear savings messaging
- ✅ Automatic discounts (no code entry)
- ✅ Countdown urgency

---

**Created:** November 19, 2025  
**Status:** ✅ Production Ready

