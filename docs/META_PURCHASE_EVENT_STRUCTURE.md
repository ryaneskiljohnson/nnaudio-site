# Meta Purchase Event - DataLayer Structure

## Issue
Meta is receiving Purchase events but without `value` and `currency` parameters. The GTM variable paths are incorrectly configured.

## Actual DataLayer Structure

When a purchase is completed, the dataLayer receives this structure:

```javascript
{
  event: 'purchase',
  event_id: 'cs_test_abc123...',  // Stripe session ID
  user: {
    user_id: 'user-uuid-here',
    email_sha256: 'hashed-email-here'
  },
  value: 149.00,              // ⚠️ TOP LEVEL, not purchase.value
  currency: 'USD',            // ⚠️ TOP LEVEL, not purchase.currency
  transaction_id: 'cs_test_abc123...',
  items: [                     // ⚠️ TOP LEVEL ARRAY, not purchase.items
    {
      item_id: 'lifetime',
      item_name: 'Cymasphere Lifetime',  // ⚠️ Inside items[0], not purchase.name
      category: 'software',
      quantity: 1,
      price: 149.00
    }
  ]
}
```

## Correct GTM Variable Paths

**Current (INCORRECT):**
- `purchase.value` ❌
- `purchase.currency` ❌
- `purchase.name` ❌

**Should be:**
- `value` ✅ (top level)
- `currency` ✅ (top level)
- `items[0].item_name` ✅ (first item's name)

## GTM Configuration

### For Meta Pixel Purchase Event Tag:

1. **Value Parameter:**
   - Variable Type: `Data Layer Variable`
   - Data Layer Variable Name: `value`
   - Data Layer Version: `Version 2`

2. **Currency Parameter:**
   - Variable Type: `Data Layer Variable`
   - Data Layer Variable Name: `currency`
   - Data Layer Version: `Version 2`

3. **Content Name Parameter (optional):**
   - Variable Type: `Data Layer Variable`
   - Data Layer Variable Name: `items.0.item_name`
   - Data Layer Version: `Version 2`
   - Or use: `items[0].item_name` (depending on GTM version)

## Example Meta Pixel Purchase Tag Configuration

**Event Name:** `Purchase`

**Parameters:**
```javascript
{
  value: {{value}},                    // Data Layer Variable: value
  currency: {{currency}},              // Data Layer Variable: currency
  content_ids: ['{{items.0.item_id}}'], // Data Layer Variable: items.0.item_id
  contents: [{
    id: '{{items.0.item_id}}',         // Data Layer Variable: items.0.item_id
    quantity: {{items.0.quantity}},     // Data Layer Variable: items.0.quantity
    item_price: {{items.0.price}}       // Data Layer Variable: items.0.price
  }]
}
```

## Additional Issue: Direct Meta Pixel Tracking

Currently, the checkout-success page **only** pushes to dataLayer and relies on GTM to forward to Meta Pixel. If GTM isn't configured correctly, Meta won't receive the parameters.

**Recommendation:** Also fire Meta Pixel directly to ensure parameters are always sent.

## Testing

To verify the dataLayer structure:

1. Open browser DevTools on checkout-success page
2. Go to Console tab
3. Type: `window.dataLayer`
4. Look for the `purchase` event object
5. Verify it has `value`, `currency`, and `items` at the top level

## Code Location

The purchase event is pushed in:
- File: `app/(auth)/checkout-success/page.tsx`
- Lines: 289-300 (for lifetime purchases)
- Lines: 321-332 (for lifetime purchases via API fetch)

