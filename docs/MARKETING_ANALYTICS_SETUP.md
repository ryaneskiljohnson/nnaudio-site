# Marketing & Analytics Integration Guide

This document outlines the marketing and analytics tools integrated into the NNAudio website.

## ✅ Integrated Tools

### 1. Google Tag Manager (GTM)
**Status**: ✅ Integrated  
**Purpose**: Central tag management system for all marketing and analytics scripts  
**Required for**: Meta Conversions API (cAPI) via Stape.io

### 2. Google Analytics
**Status**: ✅ Integrated  
**Purpose**: Website analytics and user behavior tracking  
**Can be loaded**: Directly or through GTM (recommended)

### 3. Meta Pixel (Facebook Pixel)
**Status**: ✅ Integrated  
**Purpose**: Facebook and Instagram ad tracking, conversion tracking  
**Required for**: Meta ad campaigns and Conversions API

## 🔧 Setup Instructions

### Step 1: Environment Variables

Add the following environment variables to your `.env.local` file (for local development) and your production environment:

```bash
# Google Tag Manager Container ID (e.g., GTM-XXXXXXX)
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX

# Google Analytics Measurement ID (e.g., G-XXXXXXXXXX)
# Optional if using GTM - you can configure GA through GTM instead
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Meta Pixel ID (e.g., 123456789012345)
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

### Step 2: Google Tag Manager Setup

1. **Create a GTM Container** (if you haven't already):
   - Go to https://tagmanager.google.com
   - Create a new container for your website
   - Copy your Container ID (format: `GTM-XXXXXXX`)

2. **Add Environment Variable**:
   ```bash
   NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
   ```

3. **Invite Team Members** (as per requirements):
   - Go to GTM → Admin → User Management
   - Add users with **"Edit"** container permissions (or "Publish" if they need to publish):
     - matterandrew@gmail.com
     - willradio08@gmail.com
     - maciej.raszke@gmail.com
   - **Note**: "User" at account level is fine, but they need "Edit" or "Publish" at container level to configure tags

### Step 3: Google Analytics Setup

**Option A: Through GTM (Recommended)**
- Configure Google Analytics tag in GTM
- No need to set `NEXT_PUBLIC_GA_ID` environment variable
- Easier to manage and update without code changes

**Option B: Direct Integration**
- Create a Google Analytics 4 property
- Copy your Measurement ID (format: `G-XXXXXXXXXX`)
- Add environment variable:
  ```bash
  NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
  ```

3. **Invite Team Members**:
   - Go to GA → Admin → Property Access Management
   - Add users with "Viewer" or "Editor" permissions:
     - willradio08@gmail.com
     - matterandrew@gmail.com

### Step 4: Meta Pixel Setup

1. **Create Meta Pixel**:
   - Go to Meta Events Manager: https://business.facebook.com/events_manager2
   - Create a new Pixel
   - Copy your Pixel ID (numeric, e.g., `123456789012345`)

2. **Add Environment Variable**:
   ```bash
   NEXT_PUBLIC_META_PIXEL_ID=123456789012345
   ```

3. **Verify Installation**:
   - Use Meta Pixel Helper Chrome extension to verify pixel is firing
   - Check Events Manager → Test Events to see real-time events

### Step 5: Meta Conversions API (cAPI) Setup

**Important**: This is the "trickiest" part as mentioned in the requirements.

1. **Sign up for Stape.io**:
   - Go to https://stape.io/
   - Create an account (paid service, small monthly fee)
   - This service bridges your website to Meta's Conversions API

2. **Connect Stape.io to GTM**:
   - Follow Stape.io's integration guide
   - Configure the Stape.io tag in Google Tag Manager
   - This will handle the server-side tracking for Meta

3. **Verify cAPI Integration**:
   - Check Meta Events Manager → Test Events
   - Look for events marked as "Conversions API" (not just "Browser Pixel")
   - Both should appear for complete tracking

## 📊 How It Works

### Component Structure

The analytics are loaded through the `Analytics` component (`components/analytics/Analytics.tsx`), which:

1. **Conditionally loads scripts** based on environment variables
2. **Prioritizes GTM** - If GTM is configured, it loads first
3. **Falls back to direct GA** - Only loads GA directly if GTM is not used
4. **Loads Meta Pixel independently** - Works alongside GTM/GA

### Loading Order

1. GTM DataLayer initialization
2. GTM Container script
3. Google Analytics (if not using GTM)
4. Meta Pixel

### Custom Event Tracking

You can track custom events using the dataLayer (when GTM is enabled) or directly:

```typescript
// If using GTM (recommended)
if (typeof window !== 'undefined' && window.dataLayer) {
  window.dataLayer.push({
    event: 'custom_event_name',
    event_category: 'engagement',
    event_label: 'button_click',
    value: 1
  });
}

// For Meta Pixel
if (typeof window !== 'undefined' && window.fbq) {
  window.fbq('track', 'CustomEvent', {
    content_name: 'Product Name',
    content_category: 'Category'
  });
}
```

## 🧪 Testing

### Test GTM Installation

1. Install Google Tag Assistant Chrome extension
2. Visit your website
3. Check that GTM container loads correctly
4. Verify tags fire on page load

### Test Google Analytics

1. Go to GA4 → Reports → Realtime
2. Visit your website
3. You should see your visit appear in real-time

### Test Meta Pixel

1. Install Meta Pixel Helper Chrome extension
2. Visit your website
3. Click the extension icon
4. Verify pixel fires and shows PageView event

### Test Conversions API

1. Go to Meta Events Manager → Test Events
2. Perform actions on your website (page views, purchases, etc.)
3. Verify events appear with "Conversions API" source
4. Both Browser Pixel and Conversions API events should appear

## 📝 Notes

- **GTM is Required** for Meta cAPI integration via Stape.io
- **Google Analytics** can be configured through GTM (recommended) or directly
- **Meta Pixel** loads independently and works alongside GTM
- All scripts are loaded conditionally - if environment variables aren't set, scripts won't load
- Scripts use Next.js `Script` component with `afterInteractive` strategy for optimal performance

## 🔒 Privacy & Compliance

- All tracking scripts respect user privacy settings
- Consider implementing cookie consent banner if required by your jurisdiction
- Review GDPR/CCPA compliance requirements for your region

## 🆘 Troubleshooting

### Scripts Not Loading

1. Check environment variables are set correctly
2. Verify variable names match exactly (case-sensitive)
3. Restart development server after adding env vars
4. Check browser console for errors

### GTM Not Working

1. Verify Container ID format: `GTM-XXXXXXX`
2. Check GTM container is published
3. Use Tag Assistant to debug

### Meta Pixel Not Firing

1. Verify Pixel ID is numeric (not alphanumeric)
2. Check Meta Pixel Helper extension
3. Verify pixel is active in Events Manager

### Conversions API Not Working

1. Verify Stape.io account is active and paid
2. Check Stape.io configuration in GTM
3. Verify server-side events in Meta Events Manager

## 📞 Support

For issues with:
- **GTM/GA Setup**: Contact your marketing team
- **Meta Pixel/cAPI**: Contact Meta support or your marketing agency
- **Code Integration**: Check this documentation or contact development team

