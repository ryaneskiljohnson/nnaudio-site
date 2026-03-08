import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, CAMPAIGN_OBJECTIVES, FACEBOOK_TOKEN_COOKIE_NAME, FACEBOOK_AD_ACCOUNT_COOKIE_NAME } from '@/utils/facebook/api';

export async function GET(request: NextRequest) {
  try {
    // Development mode: return enhanced mock data
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      const mockCampaigns = [
        {
          id: "1",
          name: "Cymasphere Launch Campaign",
          status: "active",
          objective: "TRAFFIC",
          platform: "facebook",
          budget: 1000,
          spent: 245.50,
          impressions: 12450,
          clicks: 312,
          conversions: 24,
          createdAt: "2024-01-20",
          ctr: 2.51,
          cpc: 0.78,
          cpm: 19.72,
          adSets: 2,
          ads: 4
        },
        {
          id: "2", 
          name: "Instagram Promotion",
          status: "paused",
          objective: "ENGAGEMENT",
          platform: "instagram",
          budget: 500,
          spent: 89.25,
          impressions: 5680,
          clicks: 156,
          conversions: 8,
          createdAt: "2024-01-18",
          ctr: 2.75,
          cpc: 0.57,
          cpm: 15.71,
          adSets: 1,
          ads: 2
        },
        {
          id: "3",
          name: "Brand Awareness Drive",
          status: "active",
          objective: "BRAND_AWARENESS",
          platform: "facebook",
          budget: 750,
          spent: 156.80,
          impressions: 8900,
          clicks: 198,
          conversions: 12,
          createdAt: "2024-01-15",
          ctr: 2.22,
          cpc: 0.79,
          cpm: 17.62,
          adSets: 1,
          ads: 3
        }
      ];

      return NextResponse.json({
        success: true,
        campaigns: mockCampaigns,
        isDevelopmentMode: true
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const campaigns = await facebookAPI.getCampaigns();
    
    // Transform Facebook campaigns to our format
    const transformedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: (campaign.status ?? '').toString().toLowerCase(),
      objective: campaign.objective,
      platform: 'facebook', // Could be determined by placement or other factors
      budget: campaign.daily_budget ? parseInt(campaign.daily_budget) / 100 : 0,
      spent: 0, // Would need to fetch insights for this
      impressions: 0, // Would need to fetch insights
      clicks: 0, // Would need to fetch insights
      conversions: 0, // Would need to fetch insights
      createdAt: campaign.created_time,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      adSets: 0,
      ads: 0
    }));

    return NextResponse.json({
      success: true,
      campaigns: transformedCampaigns
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch campaigns'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Development mode: simulate campaign creation
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      const body = await request.json();
      
      // Simulate campaign creation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockCampaign = {
        id: `mock_${Date.now()}`,
        name: body.name,
        status: body.status?.toLowerCase() || 'paused',
        objective: body.objective,
        platform: body.platforms?.facebook ? 'facebook' : 'instagram',
        budget: body.dailyBudget || body.lifetimeBudget || 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        createdAt: new Date().toISOString(),
        ctr: 0,
        cpc: 0,
        cpm: 0,
        adSets: 0,
        ads: 0
      };

      return NextResponse.json({
        success: true,
        campaign: mockCampaign,
        message: 'Campaign created successfully (Development Mode)',
        isDevelopmentMode: true
      });
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? request.cookies.get(FACEBOOK_AD_ACCOUNT_COOKIE_NAME)?.value ?? '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(adAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const body = await request.json();
    const { name, objective, status, dailyBudget, lifetimeBudget, startTime, endTime } = body;

    // Validate required fields
    if (!name || !objective || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, objective, status'
      }, { status: 400 });
    }

    // Validate objective
    if (!Object.keys(CAMPAIGN_OBJECTIVES).includes(objective)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid campaign objective'
      }, { status: 400 });
    }

    // Create campaign
    const campaign = await facebookAPI.createCampaign({
      name,
      objective,
      status: status.toUpperCase(),
      daily_budget: dailyBudget,
      lifetime_budget: lifetimeBudget,
      start_time: startTime,
      end_time: endTime
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: (campaign.status ?? status ?? 'PAUSED').toString().toLowerCase(),
        objective: campaign.objective,
        createdAt: campaign.created_time
      }
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create campaign'
    }, { status: 500 });
  }
} 