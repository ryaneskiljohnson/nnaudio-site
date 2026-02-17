import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME } from '@/utils/facebook/api';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');
    
    // Development mode: return mock ad sets
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      const mockAdSets = [
        {
          id: "adset_1",
          name: "Desktop Users 25-45",
          campaignId: campaignId || "1",
          status: "active",
          budget: 500,
          spent: 123.45,
          impressions: 6225,
          clicks: 156,
          conversions: 12,
          ctr: 2.51,
          cpc: 0.79,
          cpm: 19.85,
          targeting: {
            ageMin: 25,
            ageMax: 45,
            genders: ["male", "female"],
            locations: ["United States"],
            interests: ["Technology", "Music Production"]
          },
          placements: ["facebook_feeds", "instagram_feeds"],
          createdAt: "2024-01-20"
        },
        {
          id: "adset_2",
          name: "Mobile Users 18-35",
          campaignId: campaignId || "1",
          status: "active",
          budget: 300,
          spent: 67.89,
          impressions: 3420,
          clicks: 89,
          conversions: 7,
          ctr: 2.60,
          cpc: 0.76,
          cpm: 19.85,
          targeting: {
            ageMin: 18,
            ageMax: 35,
            genders: ["male", "female"],
            locations: ["United States", "Canada"],
            interests: ["Music", "Electronic Music", "Audio Equipment"]
          },
          placements: ["instagram_feeds", "instagram_stories"],
          createdAt: "2024-01-20"
        }
      ];

      const filteredAdSets = campaignId 
        ? mockAdSets.filter(adSet => adSet.campaignId === campaignId)
        : mockAdSets;

      return NextResponse.json({
        success: true,
        adSets: filteredAdSets,
        isDevelopmentMode: true
      });
    }

    const mockAdAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID || '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(mockAdAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const adSets = await facebookAPI.getAdSets(campaignId || undefined);

    return NextResponse.json({
      success: true,
      adSets
    });
  } catch (error) {
    console.error('Error fetching ad sets:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ad sets'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Development mode: simulate ad set creation
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      const body = await request.json();
      
      // Simulate ad set creation delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockAdSet = {
        id: `adset_mock_${Date.now()}`,
        name: body.name,
        campaignId: body.campaignId,
        status: body.status?.toLowerCase() || 'paused',
        budget: body.dailyBudget || 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        targeting: body.targeting || {},
        placements: body.placements || [],
        createdAt: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        adSet: mockAdSet,
        message: 'Ad set created successfully (Development Mode)',
        isDevelopmentMode: true
      });
    }

    const mockAdAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID || '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(mockAdAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        success: false,
        error: 'Not connected to Facebook Ads'
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      campaignId, 
      status, 
      dailyBudget, 
      targeting, 
      optimizationGoal,
      billingEvent,
      startTime,
      endTime
    } = body;

    // Validate required fields
    if (!name || !campaignId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, campaignId, status'
      }, { status: 400 });
    }

    // Create ad set
    const adSet = await facebookAPI.createAdSet({
      name,
      campaign_id: campaignId,
      status: status.toUpperCase(),
      daily_budget: dailyBudget,
      targeting: targeting || {},
      optimization_goal: optimizationGoal || 'LINK_CLICKS',
      billing_event: billingEvent || 'LINK_CLICKS',
      start_time: startTime,
      end_time: endTime
    });

    return NextResponse.json({
      success: true,
      adSet: {
        id: adSet.id,
        name: adSet.name,
        campaignId: adSet.campaign_id,
        status: adSet.status.toLowerCase(),
        createdAt: adSet.created_time
      }
    });
  } catch (error) {
    console.error('Error creating ad set:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create ad set'
    }, { status: 500 });
  }
} 