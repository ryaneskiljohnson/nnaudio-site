# Google Tag Manager - Next Steps Guide

## ✅ What's Already Done

- ✅ GTM code integration in `components/analytics/Analytics.tsx`
- ✅ DataLayer initialization
- ✅ GTM container script loading
- ✅ NoScript fallback for ad blockers
- ✅ Conditional loading based on environment variable

## 🎯 Next Steps

### Step 1: Get Your GTM Container ID

1. **Go to Google Tag Manager**: https://tagmanager.google.com
2. **Sign in** with your Google account
3. **Create a new container** (if you don't have one):
   - Click "Create Account" or "Create Container"
   - Account Name: `Cymasphere` (or your company name)
   - Container Name: `Cymasphere Website` (or `Production`)
   - Target Platform: **Web**
   - Click "Create"
4. **Copy your Container ID**:
   - Format: `GTM-XXXXXXX` (e.g., `GTM-ABC1234`)
   - You'll see it in the top right corner of the GTM interface

### Step 2: Add GTM ID to Environment Variables

**Local Development (.env.local)**:
```bash
# Add this line to your .env.local file
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

**Vercel Production**:
```bash
# Use Vercel CLI or dashboard
vercel env add NEXT_PUBLIC_GTM_ID production
# Enter: GTM-XXXXXXX

vercel env add NEXT_PUBLIC_GTM_ID preview
# Enter: GTM-XXXXXXX

vercel env add NEXT_PUBLIC_GTM_ID development
# Enter: GTM-XXXXXXX
```

### Step 3: Test GTM Installation

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Open your site** in browser: http://localhost:3000

3. **Check GTM is loading**:
   - Open browser DevTools (F12)
   - Go to **Network** tab
   - Filter by "gtm.js"
   - You should see a request to `https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX`
   - Status should be 200 (success)

4. **Verify in Console**:
   - Open **Console** tab
   - Type: `window.dataLayer`
   - Should return an array (not undefined)

5. **Use GTM Preview Mode**:
   - In GTM dashboard, click "Preview"
   - Enter your site URL: `http://localhost:3000`
   - GTM will show you which tags are firing

### Step 4: Set Up Tags in GTM

#### A. Google Analytics Tag (Recommended)

1. **In GTM Dashboard**:
   - Click "Tags" → "New"
   - Tag Name: `GA4 - Page View`
   - Tag Type: **Google Analytics: GA4 Configuration**
   - Measurement ID: Your GA4 ID (e.g., `G-XXXXXXXXXX`)
   - Trigger: **All Pages**

2. **Create GA4 Event Tag** (for custom events):
   - Tag Name: `GA4 - Custom Events`
   - Tag Type: **Google Analytics: GA4 Event**
   - Configuration Tag: Select your GA4 Configuration tag
   - Event Name: `{{Event}}` (from dataLayer)
   - Trigger: **Custom Event** → Event name: `custom_event`

#### B. Meta Pixel Tag (Optional - if not using Stape.io)

1. **Tag Name**: `Meta Pixel - PageView`
2. **Tag Type**: **Custom HTML**
3. **HTML**:
   ```html
   <script>
     !function(f,b,e,v,n,t,s)
     {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
     n.callMethod.apply(n,arguments):n.queue.push(arguments)};
     if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
     n.queue=[];t=b.createElement(e);t.async=!0;
     t.src=v;s=b.getElementsByTagName(e)[0];
     s.parentNode.insertBefore(t,s)}(window, document,'script',
     'https://connect.facebook.net/en_US/fbevents.js');
     fbq('init', 'YOUR_PIXEL_ID');
     fbq('track', 'PageView');
   </script>
   ```
4. **Trigger**: **All Pages**

#### C. Stape.io Tag (For Meta Conversions API)

1. **Sign up for Stape.io**: https://stape.io/
2. **Get your Stape.io API key**
3. **In GTM**:
   - Tag Name: `Stape.io - Meta cAPI`
   - Tag Type: **Custom HTML** or use Stape.io's GTM template
   - Follow Stape.io's integration guide

### Step 5: Invite Team Members

**GTM Access**:
1. Go to GTM → **Admin** → **User Management**
2. Click **+** → **Add users**
3. Add with **"Edit"** container permissions (or "Publish" if they need to publish):
   - `matterandrew@gmail.com`
   - `willradio08@gmail.com`
   - `maciej.raszke@gmail.com`
   - **Note**: Account level can be "User", but container level needs "Edit" or "Publish" to configure tags

**Google Analytics Access** (if using GA):
1. Go to GA → **Admin** → **Property Access Management**
2. Click **+** → **Add users**
3. Add with **Viewer** or **Editor** permissions:
   - `willradio08@gmail.com`
   - `matterandrew@gmail.com`

### Step 6: Publish Your GTM Container

1. **Test everything** in Preview mode first
2. **Click "Submit"** in GTM dashboard
3. **Add version name**: e.g., "Initial setup - GA4 + Meta Pixel"
4. **Click "Publish"**

### Step 7: Test Events

**Test Page View**:
```javascript
// In browser console
window.dataLayer.push({
  event: 'page_view',
  page_path: window.location.pathname,
  page_title: document.title
});
```

**Test Custom Event**:
```javascript
// In browser console
window.dataLayer.push({
  event: 'custom_event',
  event_category: 'engagement',
  event_label: 'test_button_click'
});
```

**Check in GTM Preview Mode**:
- You should see the events firing
- Tags should trigger based on your configuration

## 🔍 Troubleshooting

### GTM Not Loading
- ✅ Check `NEXT_PUBLIC_GTM_ID` is set correctly
- ✅ Verify format: `GTM-XXXXXXX` (not `GTM-XXXXXXX-1`)
- ✅ Check browser console for errors
- ✅ Verify GTM container is published

### Tags Not Firing
- ✅ Use GTM Preview mode to debug
- ✅ Check triggers are configured correctly
- ✅ Verify dataLayer events are being pushed
- ✅ Check tag firing order and priorities

### Events Not Showing in GA
- ✅ Verify GA4 Measurement ID is correct
- ✅ Check GA4 tag is firing in Preview mode
- ✅ Wait 24-48 hours for data to appear in GA (real-time shows immediately)

## 📚 Resources

- **GTM Documentation**: https://support.google.com/tagmanager
- **GA4 Setup Guide**: https://support.google.com/analytics/answer/9304153
- **Stape.io Integration**: https://stape.io/docs
- **GTM Preview Mode**: https://support.google.com/tagmanager/answer/6107056

## ✅ Checklist

- [ ] GTM Container created
- [ ] Container ID copied (`GTM-XXXXXXX`)
- [ ] `NEXT_PUBLIC_GTM_ID` added to `.env.local`
- [ ] `NEXT_PUBLIC_GTM_ID` added to Vercel (all environments)
- [ ] GTM loads on localhost (verified in Network tab)
- [ ] GTM Preview mode works
- [ ] Team members invited to GTM
- [ ] GA4 tag configured (if using GA)
- [ ] Meta Pixel tag configured (if not using Stape.io)
- [ ] Stape.io configured (if using Meta cAPI)
- [ ] GTM container published
- [ ] Events tested and verified

## 🚀 Quick Start Commands

```bash
# 1. Add GTM ID to local env
echo "NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX" >> .env.local

# 2. Add to Vercel
vercel env add NEXT_PUBLIC_GTM_ID production
vercel env add NEXT_PUBLIC_GTM_ID preview  
vercel env add NEXT_PUBLIC_GTM_ID development

# 3. Test locally
npm run dev
# Open http://localhost:3000
# Check Network tab for gtm.js request

# 4. Verify in GTM Preview mode
# Go to GTM → Preview → Enter localhost:3000
```

---

**Ready to start?** Share your GTM Container ID and I'll help you add it to the environment variables!

