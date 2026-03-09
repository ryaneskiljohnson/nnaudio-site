# Facebook Ad Manager Integration

A comprehensive Facebook Ads management system built into the Cymasphere admin console. This system allows you to create, manage, and optimize Facebook and Instagram advertising campaigns directly from your admin dashboard.

## 🎯 Implementation Status

### ✅ **COMPLETE - Ready for Production**
- **Main Dashboard**: Statistics overview with quick action buttons
- **Campaign Management**: Full CRUD operations with detailed views
- **Campaign Creation**: Multi-step wizard with validation and preview
- **Campaign Editing**: Individual campaign modification pages with form validation
- **Campaign Actions**: Pause, resume, and delete campaigns with API integration
- **Ad Creation**: Visual ad builder with real-time Facebook-style preview
- **Ad Analytics Dashboard**: Comprehensive performance metrics and charts
- **Audience Management**: Custom audience dashboard with search and filters
- **Settings & Configuration**: Facebook app integration and preferences
- **API Integration**: Complete Facebook Marketing API implementation
- **Action Endpoints**: Campaign pause/resume/delete API endpoints
- **Development Mode**: Comprehensive mock data for testing
- **Responsive Design**: Mobile-optimized interface throughout
- **Error Handling**: Robust error states, validation, and user feedback

### 🔌 **Facebook Integration Ready**
- OAuth authentication flow
- Campaign lifecycle management (create, edit, pause, resume, delete)
- Ad set and individual ad management
- Performance tracking and analytics
- Custom audience API endpoints
- Real-time status synchronization

### 📋 **Future Enhancements** (Optional)
- Advanced analytics dashboard with interactive charts
- A/B testing framework with automated optimization
- Custom audience creation wizard
- Bulk campaign operations and templates
- Advanced reporting and CSV exports
- Real-time performance notifications

## 🚀 Features

### Structure (Meta-aligned)
- **Campaigns**: Objective, buying type (Auction/Reservation), special ad category (None, Housing, Employment, Credit, Social issues), budget level (campaign vs ad set). Create and edit support all of these.
- **Ad sets**: Budget type (daily or lifetime), optional end date (“no end date” = ongoing), targeting (countries), optimization goal, billing event (default Link clicks). Create and edit are aligned.
- **Ads**: Create-ad wizard is Campaign & ad set → Creative → Preview. Hierarchy: Campaign → Ad Set → Ad.
- **Analytics**: Account-level summary and campaign performance; date presets (last 7/30/90 days) from Insights API.

**Recommended flow:** Create Campaign → Create Ad Set (under that campaign) → Create Ad (select campaign & ad set). For funnel, targeting, and optimization playbooks see the Marketing Director skill’s reference (`.cursor/skills/marketing-director/reference.md`).

### Core Functionality
- **Campaign Management**: Create, edit, pause, resume, and delete campaigns
- **Ad Set Management**: Manage targeting, budgets, and scheduling at the ad set level  
- **Ad Creation**: Full creative builder with real-time preview
- **Performance Analytics**: Track impressions, clicks, conversions, CTR, CPC, and CPM
- **Multi-Platform**: Support for both Facebook and Instagram placements
- **Development Mode**: Mock data for testing without live Facebook integration

### User Interface
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Previews**: See how your ads will look before publishing
- **Hierarchical View**: Expandable campaigns showing ad sets and ads
- **Step-by-step Wizards**: Guided campaign and ad creation process
- **Performance Dashboard**: Visual metrics and statistics

## 📁 File Structure

```
app/
├── (private)/(admin)/admin/ad-manager/
│   ├── page.tsx                    # Main Ad Manager dashboard
│   ├── campaigns/
│   │   ├── page.tsx               # All campaigns view
│   │   └── create/
│   │       └── page.tsx           # Campaign creation wizard
│   └── ads/
│       └── create/
│           └── page.tsx           # Ad creation wizard
├── api/facebook-ads/
│   ├── connection-status/
│   │   └── route.ts               # Check Facebook connection
│   ├── connect/
│   │   └── route.ts               # Initiate OAuth flow
│   ├── callback/
│   │   └── route.ts               # Handle OAuth callback
│   ├── campaigns/
│   │   └── route.ts               # Campaign CRUD operations
│   ├── adsets/
│   │   └── route.ts               # Ad Set CRUD operations
│   ├── ads/
│   │   └── route.ts               # Ad CRUD operations
│   └── stats/
│       └── route.ts               # Performance statistics
utils/facebook/
└── api.ts                         # Facebook API utilities and types
```

## 🛠️ Setup Instructions

### 1. Facebook App Configuration

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add the **Marketing API** product
4. Configure the following settings:

#### Required Permissions
```
ads_management
ads_read
business_management
pages_read_engagement
pages_manage_ads
email
```

#### Valid OAuth Redirect URIs
```
http://localhost:3000/api/facebook-ads/callback (development)
https://yourdomain.com/api/facebook-ads/callback (production)
```

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Facebook Ad Manager Configuration
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_AD_ACCOUNT_ID=your_ad_account_id_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Required for creating ads with image + link (Facebook Page linked to your ad account)
META_PAGE_ID=your_facebook_page_id_here

# Development Mode (optional)
FACEBOOK_MOCK_CONNECTION=true
```

### 3. Development Mode

For testing without a live Facebook connection:

```bash
# Enable mock mode
FACEBOOK_MOCK_CONNECTION=true
```

This provides realistic mock data for all API endpoints without requiring Facebook API calls.

## 🔧 API Endpoints

### Connection Management
- `GET /api/facebook-ads/connection-status` - Check if connected to Facebook
- `GET /api/facebook-ads/connect` - Initiate OAuth flow
- `GET /api/facebook-ads/callback` - Handle OAuth callback

### Campaign Management
- `GET /api/facebook-ads/campaigns` - List all campaigns
- `POST /api/facebook-ads/campaigns` - Create new campaign
- `GET /api/facebook-ads/campaigns/{id}` - Get individual campaign
- `PUT /api/facebook-ads/campaigns/{id}` - Update campaign
- `DELETE /api/facebook-ads/campaigns/{id}` - Delete campaign
- `POST /api/facebook-ads/campaigns/{id}/pause` - Pause campaign
- `POST /api/facebook-ads/campaigns/{id}/play` - Resume campaign
- `POST /api/facebook-ads/campaigns/{id}/delete` - Delete campaign (alternative endpoint)

### Ad Set Management
- `GET /api/facebook-ads/adsets?campaignId={id}` - List ad sets for campaign
- `POST /api/facebook-ads/adsets` - Create new ad set

### Ad Management
- `GET /api/facebook-ads/ads?campaignId={id}` - List ads for campaign
- `GET /api/facebook-ads/ads?adSetId={id}` - List ads for ad set
- `POST /api/facebook-ads/ads` - Create new ad

### Analytics
- `GET /api/facebook-ads/stats` - Get account performance statistics

## 📊 Campaign Creation Flow

### 1. Campaign Details
- Campaign name and description
- Campaign objective (Traffic, Conversions, Brand Awareness, etc.)
- Platform selection (Facebook, Instagram, or both)

### 2. Budget & Scheduling
- Budget type: Daily or Lifetime
- Budget amount
- Start and end dates (optional)
- Campaign status (Active/Paused)

### 3. Review & Launch
- Review all settings
- Save as draft or launch immediately

## 🎨 Ad Creation Flow

### 1. Campaign & Ad Set Selection
- Choose existing campaign
- Select target ad set
- View targeting and budget information

### 2. Creative Design
- **Creative Type**: Image or Video
- **Upload Media**: Drag & drop interface
- **Headline**: Up to 40 characters
- **Primary Text**: Up to 125 characters  
- **Call-to-Action**: Predefined options
- **Destination URL**: Landing page link

### 3. Real-time Preview
- Facebook-style preview
- See how ad appears in feed
- Validate character limits
- Test different creative variations

### 4. Review & Launch
- Final review of all settings
- Launch immediately or save as draft

## 🎯 First campaigns (recommended)

Ad copy (headlines, primary text, URLs) should come from the **products reference** file generated by `npm run build:products-for-ads` (see `.cursor/skills/marketing-director/products-reference.md`). Regenerate that file when the product catalog changes.

### Campaign 1: Cymasphere — Sales
- **Objective:** Sales (OUTCOME_SALES). Choose **Sales** in the campaign creation wizard.
- **Ad set A (cold interest):** Target music production, DAW (Ableton, FL Studio, Logic Pro), music composition, beat making; geo = priority markets (e.g. US, UK, CA). Optimization goal: **CONVERSIONS**; conversion event = Purchase or Lead (match Pixel/CAPI). Billing: IMPRESSIONS or LINK_CLICKS. Daily budget to start (e.g. $10–20).
- **Ad set B (optional):** Retargeting (website visitors) or 1% lookalike of purchasers/trial signups; same optimization.
- **Ads:** Use products-reference.md for Cymasphere one-line pitch and differentiators. CTA: "Start free trial" or "Learn more." Landing: `https://nnaud.io/product/cymasphere`.

### Campaign 2: NNAudio — Traffic
- **Objective:** Traffic (OUTCOME_TRAFFIC).
- **Ad set:** Broad music production / plugin / sample pack interests; optimization **LINK_CLICKS**; billing **LINK_CLICKS**; daily budget. Landing: `https://nnaud.io` or `https://nnaud.io/plugins` or `https://nnaud.io/product/cymasphere`.
- **Ads:** Messaging from products reference (e.g. "Plugins, MIDI packs, and intelligent music tools — one place"). CTA: "Browse plugins" or "Try free."

#### Option A (site traffic) — in-app setup
Create in Ad Manager in this order: **Campaign → Ad set → Ad.** Run **active** from **April 1 to June 1** (defaults are pre-filled in the create forms).

1. **Campaign:** Name: **NNAudio — Site Traffic**. Objective: **Traffic**. Daily budget: **$15**. Status: **Active** (use **Create & Launch**; form defaults to schedule Apr 1–Jun 1). Platforms: Facebook + Instagram.
2. **Ad set:** Name: **US — Music producers & creators**. Status: **Active**. Daily budget: **$15**. Optimization: **Link clicks**. Billing: **Link clicks**. Start/end time default to **2025-04-01** and **2025-06-01**. (Targeting is currently US-only in-app; see [META_AD_MANAGER_GAPS.md](META_AD_MANAGER_GAPS.md) for future targeting UI.)
3. **Ad:** In **Create Ad**, select the campaign and ad set above, then use **Create & Launch** so the ad runs active. Creative:
   - **Headline:** Plugins, MIDI packs, and tools. One place.
   - **Primary text:** Instruments, FX, samples, and character—for producers and composers. One hub to browse, try, and own. NNAudio.
   - **CTA:** Shop now or Learn more.
   - **Link:** `https://nnaud.io`

If the ad set dropdown is empty when creating the ad, wait a moment and refresh, or create the ad from the campaign’s **Edit** page → **Ads** tab → **Create ad** (with the same creative).

## 📈 Performance Tracking

### Dashboard Metrics
- Total Campaigns
- Active Campaigns  
- Total Spent
- Total Impressions
- Total Clicks
- Average CTR (Click-Through Rate)

### Campaign-Level Metrics
- Budget vs. Spent
- Impressions, Clicks, Conversions
- CTR, CPC (Cost Per Click), CPM (Cost Per Mille)
- Campaign status and performance trends

### Ad-Level Metrics
- Individual ad performance
- Creative performance comparison
- A/B testing insights

## 🔒 Security & Best Practices

### Environment Security
- Never commit `.env.local` to version control
- Use different Facebook apps for development/production
- Rotate access tokens regularly

### API Rate Limits
- Facebook Marketing API has rate limits
- Implement proper error handling
- Use batch requests for bulk operations

### Data Privacy
- Follow Facebook's data usage policies
- Implement proper user consent flows
- Handle personal data according to GDPR/CCPA

## 🚨 Troubleshooting

### Common Issues

#### "Facebook Login is currently unavailable"
- Check Facebook App status in Developer Console
- Verify app is not in Development Mode for production
- Ensure all required permissions are approved

#### "App ID not configured"
- Verify `FACEBOOK_APP_ID` in environment variables
- Check environment variable loading
- Restart development server after changes

#### "Invalid redirect URI"
- Verify redirect URI in Facebook App settings
- Check `NEXT_PUBLIC_BASE_URL` configuration
- Ensure URL matches exactly (http vs https)

#### Rate Limiting
- Implement exponential backoff
- Cache responses when appropriate
- Use Facebook's batch API for multiple requests

### Development Tips

1. **Use Development Mode**: Enable `FACEBOOK_MOCK_CONNECTION=true` for initial development
2. **Test with Small Budgets**: Use minimal budgets when testing with real Facebook API
3. **Monitor API Usage**: Track Facebook API calls to avoid rate limits
4. **Error Handling**: Implement comprehensive error handling for all API calls

## 🔮 Future Enhancements

### Planned Features
- **Audience Management**: Custom audience creation and management
- **A/B Testing**: Built-in split testing functionality
- **Advanced Analytics**: Deeper performance insights and reporting
- **Automation Rules**: Automatic campaign optimization
- **Creative Templates**: Pre-built ad templates
- **Bulk Operations**: Multi-campaign management tools

### Technical Improvements
- Real-time performance updates via WebSocket
- Advanced caching for better performance
- GraphQL API for more efficient data fetching
- Mobile app for campaign management

## 📞 Support

For technical support or questions about the Ad Manager integration:

1. Check the troubleshooting section above
2. Review Facebook's Marketing API documentation
3. Create an issue in the project repository
4. Contact the development team

---

**Note**: This Ad Manager is designed for programmatic advertising management. Always comply with Facebook's advertising policies and local regulations when creating campaigns. 