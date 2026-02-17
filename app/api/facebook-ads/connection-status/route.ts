import { NextRequest, NextResponse } from 'next/server';
import { createFacebookAPI, FACEBOOK_TOKEN_COOKIE_NAME } from '@/utils/facebook/api';

export async function GET(request: NextRequest) {
  try {
    // Development mode: mock connection if Facebook app is not ready
    const isDevelopment = process.env.NODE_ENV === 'development';
    const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
    
    if (isDevelopment && mockConnection) {
      return NextResponse.json({
        connected: true,
        user: {
          id: 'mock_user_123',
          name: 'Development User',
          email: 'dev@example.com'
        },
        message: 'Connected to Facebook Ads (Development Mode)',
        isDevelopmentMode: true
      });
    }

    // Get stored Facebook token from user session/database
    // For now, we'll check if a token exists in a mock way
    // In production, this would check the database for stored tokens
    
    const mockAdAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID || '123456789';
    const getToken = () => request.cookies.get(FACEBOOK_TOKEN_COOKIE_NAME)?.value ?? null;
    const facebookAPI = createFacebookAPI(mockAdAccountId, getToken);
    
    if (!facebookAPI) {
      return NextResponse.json({
        connected: false,
        message: 'No Facebook access token found'
      });
    }

    // Test the connection
    const connectionTest = await facebookAPI.testConnection();
    
    if (connectionTest.success) {
      return NextResponse.json({
        connected: true,
        user: connectionTest.user,
        message: 'Connected to Facebook Ads'
      });
    } else {
      return NextResponse.json({
        connected: false,
        message: connectionTest.error || 'Failed to connect to Facebook'
      });
    }
  } catch (error) {
    console.error('Error checking Facebook connection:', error);
    return NextResponse.json({
      connected: false,
      message: 'Error checking connection status'
    }, { status: 500 });
  }
} 