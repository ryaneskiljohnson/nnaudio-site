# Google Analytics Setup - Next Steps

## ✅ Current Status
- GTM: ✅ Configured (`GTM-MJSV92T9`)
- Meta Pixel: ✅ Configured (`915245002872239`)
- Google Analytics: ⏳ **Next Step**

## 🎯 Step 1: Create Google Analytics 4 Property

1. **Go to Google Analytics**: https://analytics.google.com
2. **Sign in** with your Google account
3. **Create Account** (if you don't have one):
   - Click "Admin" (gear icon) → "Create Account"
   - Account Name: `Cymasphere` (or your company name)
   - Click "Next"
4. **Create Property**:
   - Property Name: `Cymasphere Website` (or `Production`)
   - Reporting Time Zone: Select your timezone
   - Currency: USD (or your currency)
   - Click "Next"
5. **Business Information** (optional):
   - Fill out or skip
   - Click "Create"
6. **Get your Measurement ID**:
   - Format: `G-XXXXXXXXXX` (e.g., `G-ABC123XYZ`)
   - You'll see it in the top right or under Admin → Data Streams

## 🎯 Step 2: Configure GA4 in GTM (Recommended)

**This is the recommended approach** - no code changes needed!

1. **In GTM Dashboard**:
   - Go to your container: `GTM-MJSV92T9`
   - Click **"Tags"** → **"New"**

2. **Create GA4 Configuration Tag**:
   - **Tag Name**: `GA4 - Configuration`
   - **Tag Type**: Select **"Google Analytics: GA4 Configuration"**
   - **Measurement ID**: Enter your GA4 ID (e.g., `G-XXXXXXXXXX`)
   - **Triggering**: Click **"Triggering"** → Select **"All Pages"**
   - Click **"Save"**

3. **Create GA4 Event Tag** (for custom events):
   - Click **"Tags"** → **"New"**
   - **Tag Name**: `GA4 - Events`
   - **Tag Type**: Select **"Google Analytics: GA4 Event"**
   - **Configuration Tag**: Select your `GA4 - Configuration` tag
   - **Event Name**: `{{Event}}` (from dataLayer)
   - **Triggering**: Click **"Triggering"** → **"+"** → **"Custom Event"**
     - Event name: `custom_event` (or whatever event name you use)
   - Click **"Save"**

4. **Publish GTM Container**:
   - Click **"Submit"** in GTM
   - Version name: `Add GA4 Configuration`
   - Click **"Publish"**

## 🎯 Step 3: Invite Team Members to GA

1. **Go to GA Dashboard**:
   - Click **"Admin"** (gear icon)
   - Under **"Property"**, click **"Property Access Management"**

2. **Add Users**:
   - Click **"+"** → **"Add users"**
   - Add these emails with **"Viewer"** or **"Editor"** permissions:
     - `willradio08@gmail.com`
     - `matterandrew@gmail.com`
   - Click **"Add"**

## 🎯 Step 4: Test GA4 Integration

1. **Use GTM Preview Mode**:
   - In GTM, click **"Preview"**
   - Enter your site URL: `http://localhost:3000` (or production URL)
   - Click **"Connect"**

2. **Verify GA4 Tag Fires**:
   - Navigate your site
   - In GTM Preview, you should see:
     - `GA4 - Configuration` tag firing on page load
     - Events firing when you interact with the site

3. **Check Real-Time Reports**:
   - In GA4 dashboard, go to **"Reports"** → **"Realtime"**
   - You should see active users and events

## ✅ Alternative: Direct GA Integration (If Not Using GTM)

If you prefer to load GA directly (not through GTM):

1. **Get your Measurement ID** (from Step 1)
2. **Add to environment variables**:
   ```bash
   # .env.local
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
3. **Add to Vercel**:
   ```bash
   vercel env add NEXT_PUBLIC_GA_ID production
   vercel env add NEXT_PUBLIC_GA_ID preview
   vercel env add NEXT_PUBLIC_GA_ID development
   ```

**Note**: If you use GTM for GA, you don't need `NEXT_PUBLIC_GA_ID` - GA will load through GTM automatically.

## 📋 Checklist

- [ ] GA4 property created
- [ ] Measurement ID copied (`G-XXXXXXXXXX`)
- [ ] GA4 Configuration tag created in GTM
- [ ] GA4 Event tag created in GTM (optional)
- [ ] GTM container published
- [ ] Team members invited to GA4
- [ ] GA4 tested in GTM Preview mode
- [ ] Real-time reports showing data

## 🚀 Quick Summary

**Recommended Flow:**
1. Create GA4 property → Get Measurement ID
2. Configure GA4 tag in GTM (no code needed!)
3. Publish GTM container
4. Invite team members
5. Test and verify

This way, all GA configuration happens in GTM - no code deployments needed for future changes!




