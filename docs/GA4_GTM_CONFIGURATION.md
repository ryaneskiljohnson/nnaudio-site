# GA4 Configuration in GTM - Setup Instructions

## Your GA4 Details
- **Measurement ID**: `G-TH7Q8MTZDB`
- **Account**: Cymasphere (263339779)
- **Property**: Cymasphere (363772683)
- **Stream**: Cymasphere Website (4890701532)

## 📋 Setup Steps

### Step 1: Create GA4 Configuration Tag in GTM

1. Go to your GTM container: https://tagmanager.google.com
2. Select container: **GTM-MJSV92T9**
3. Click **"Tags"** (left sidebar)
4. Click **"New"** → **"Tag Configuration"**

**Tag Details:**
- **Tag Name**: `GA4 - Configuration`
- **Tag Type**: Search and select **"Google Analytics: GA4 Configuration"**
- **Measurement ID**: Enter `G-TH7Q8MTZDB`
- **Triggering**: Click **"Triggering"** section
  - Click **"+"** to add a trigger
  - Select **"All Pages"** trigger
  - (If "All Pages" doesn't exist, create it: Trigger Type → Page View → All Pages)
- Click **"Save"**

### Step 2: Create GA4 Event Tag (Optional but Recommended)

1. Click **"New"** → **"Tag Configuration"**

**Tag Details:**
- **Tag Name**: `GA4 - Event Tracking`
- **Tag Type**: Search and select **"Google Analytics: GA4 Event"**
- **Measurement ID**: Leave blank (will use the configuration tag)
- **Configuration Tag**: Select **"GA4 - Configuration"** (the tag you just created)
- **Event Name**: `{{Event}}` (this will pull from your dataLayer)
- **Triggering**: 
  - Click **"+"** to add a trigger
  - Trigger Type: **"Custom Event"**
  - Event Name: `custom_event`
  - This will fire whenever you push a custom event to the dataLayer
- Click **"Save"**

### Step 3: Publish GTM Container

1. In GTM, click **"Submit"** (top right)
2. **Version Name**: `Add GA4 Configuration`
3. **Version Description**: `Configure Google Analytics 4 with Measurement ID G-TH7Q8MTZDB`
4. Click **"Publish"**

### Step 4: Test GA4 Integration

**Test in GTM Preview Mode:**
1. Click **"Preview"** in GTM
2. Enter your site URL: `http://localhost:3000` (or `https://www.cymasphere.com`)
3. Click **"Connect"**
4. Navigate your website
5. In GTM Preview panel, you should see:
   - **"GA4 - Configuration"** tag firing
   - Events firing when you interact with the page

**Test in GA4 Real-Time:**
1. Go to GA4 dashboard: https://analytics.google.com
2. Click **"Reports"** (left sidebar)
3. Select **"Realtime"**
4. You should see:
   - Active users
   - Recent events
   - Page views

### Step 5: Invite Team Members to GA4

1. Go to GA4 Dashboard: https://analytics.google.com
2. Click **"Admin"** (gear icon, bottom left)
3. Under **"Property"** section, click **"Property Access Management"**
4. Click **"+"** → **"Add users"**
5. Add these email addresses:
   - `willradio08@gmail.com`
   - `matterandrew@gmail.com`
6. Set permission level: **"Editor"** (recommended)
   - Allows them to create events, modify settings, but not delete
7. Click **"Add"**

**Permission Levels:**
- **Viewer**: Read-only access
- **Editor**: Can create events and modify settings
- **Admin**: Full access (not recommended unless needed)

## ✅ Checklist

- [ ] GA4 Configuration tag created in GTM
- [ ] GA4 Event tag created in GTM (optional)
- [ ] GTM container published
- [ ] GA4 tags firing in GTM Preview mode
- [ ] Real-time data showing in GA4 dashboard
- [ ] Team members invited to GA4
- [ ] Team members have "Editor" access

## 🔗 Useful Links

- **GTM Dashboard**: https://tagmanager.google.com
- **GA4 Dashboard**: https://analytics.google.com
- **GTM Documentation**: https://support.google.com/tagmanager
- **GA4 Guides**: https://support.google.com/analytics

## 📊 Next Steps After Setup

Once GA4 is working through GTM:

1. **Create custom events** in GA4 for:
   - Button clicks
   - Form submissions
   - Purchases
   - Sign-ups

2. **Set up conversions** in GA4:
   - GA4 will auto-track key events
   - Mark important events as conversions in GA4 settings

3. **Monitor real-time data** for first 24-48 hours to verify everything works

4. **Review GA4 reports** after data collection starts (can take 24-48 hours)

---

## Need Help?

If GA4 tags aren't firing:
1. Check GTM Preview mode to see if tags are loading
2. Verify Measurement ID is correct: `G-TH7Q8MTZDB`
3. Make sure triggers are set to "All Pages"
4. Check GA4 dashboard hasn't blocked the data stream




