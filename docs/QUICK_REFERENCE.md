# 🚀 Quick Reference Card

## Add to `.env.local`

```bash
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
META_CONVERSIONS_API_TOKEN=your_token_here
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX          # Optional
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX          # Optional
```

## Run Migration

```bash
npx supabase migration apply
```

## Track Conversions

```typescript
import { trackMetaConversion } from '@/utils/analytics';

// Purchase
await trackMetaConversion('Purchase', {
  email: user.email,
  value: 99.99,
  currency: 'USD',
  transactionId: order.id,
});

// Sign Up
await trackMetaConversion('CompleteRegistration', {
  email, firstName, lastName, country,
});

// Lead / Form
await trackMetaConversion('Lead', {
  email, phone, firstName, lastName,
});

// Page View
await trackMetaConversion('PageView', {
  email: user?.email,
  customData: { page_title: 'Pricing' },
});

// Add to Cart
await trackMetaConversion('AddToCart', {
  email, value, currency: 'USD',
  contentIds: [...], numItems: 2,
});
```

## All Event Types

```
Purchase              • CompleteRegistration
Lead                  • Contact
ViewContent           • Search
AddToCart             • AddToWishlist
InitiateCheckout      • AddPaymentInfo
Subscribe             • Donate
FindLocation          • ViewCart
StartTrial            • SubmitApplication
Customize Product
```

## Test It

1. Add `testEventCode: 'TEST123'` to call
2. Go to https://business.facebook.com/events_manager2
3. Go to "Test Events" tab
4. Should see event within 5 seconds

## Check Status

**Browser Network Tab:**
- Filter: `/api/meta/events`
- Should be 200 status

**Supabase:**
```sql
SELECT * FROM meta_conversion_events 
ORDER BY created_at DESC LIMIT 10;
```

**Server Logs:**
```
📤 Sending Meta conversion event: Purchase
✅ Event(s) sent to Meta successfully
```

## Common Integrations

### Stripe Webhook
```typescript
if (event.type === 'charge.succeeded') {
  const charge = event.data.object;
  await trackMetaConversion('Purchase', {
    email: charge.billing_details.email,
    value: charge.amount / 100,
    currency: charge.currency.toUpperCase(),
    transactionId: charge.id,
  });
}
```

### Form Submit
```typescript
const handleSubmit = async (formData) => {
  await trackMetaConversion('Lead', {
    email: formData.email,
    phone: formData.phone,
    firstName: formData.firstName,
    lastName: formData.lastName,
  });
};
```

### Component Mount
```typescript
useEffect(() => {
  trackMetaConversion('ViewContent', {
    email: user?.email,
    contentIds: [product.id],
    customData: {
      product_name: product.name,
    },
  });
}, [product]);
```

## Docs

| Quick | Full | Examples | Troubleshoot |
|-------|------|----------|--------------|
| [5 min](docs/META_CAPI_QUICK_START.md) | [30 min](docs/MARKETING_ANALYTICS_SETUP.md) | [Code](docs/INTEGRATION_EXAMPLES.md) | [FAQ](docs/META_CONVERSIONS_API.md) |

## Environment Check

```bash
# Verify env vars loaded
echo $META_CONVERSIONS_API_TOKEN
echo $NEXT_PUBLIC_META_PIXEL_ID

# Server logs should show:
# 📤 Sending Meta conversion event: [EventName]
# ✅ Event(s) sent to Meta successfully
```

## Troubleshoot 101

**Nothing in Meta?**
- Check token is valid
- Verify Pixel ID matches
- Use testEventCode to test
- Check /api/meta/events in Network tab (should be 200)

**Rate limited (429)?**
- Wait 60 seconds and retry
- Normal if aggressive testing

**Events not in Supabase?**
- Check migration was applied
- Check table exists: `\dt meta_conversion_events`

See docs/META_CONVERSIONS_API.md for complete troubleshooting.

---

**🎉 You're ready to go!**




