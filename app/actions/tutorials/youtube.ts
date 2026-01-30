"use server";

import { createClient } from '@/utils/supabase/server';

export interface GetYouTubeDurationResponse {
  duration: number;
  cached: boolean;
  lastUpdated: string;
}

export interface GetYouTubeDurationError {
  error: string;
}

/**
 * Get YouTube video duration (with caching)
 * Matches logic from app/api/youtube/duration/route.ts exactly
 */
export async function getYouTubeDuration(
  videoId: string,
  forceRefresh?: boolean
): Promise<GetYouTubeDurationResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Authentication required');
    }

    if (!videoId) {
      throw new Error('Missing video ID');
    }

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const { data: cachedVideo, error: cacheError } = await supabase
        .from('tutorial_videos')
        .select('youtube_duration_cached, youtube_duration_last_updated')
        .eq('youtube_video_id', videoId)
        .single();

      if (!cacheError && cachedVideo?.youtube_duration_cached && cachedVideo.youtube_duration_last_updated) {
        const lastUpdated = new Date(cachedVideo.youtube_duration_last_updated);
        const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        // Use cached duration if it's less than 24 hours old
        if (hoursSinceUpdate < 24) {
          console.log(`Using cached duration for ${videoId}: ${cachedVideo.youtube_duration_cached}s`);
          return { 
            duration: cachedVideo.youtube_duration_cached,
            cached: true,
            lastUpdated: cachedVideo.youtube_duration_last_updated
          };
        }
      }
    }

    console.log(`Fetching fresh duration for ${videoId}${forceRefresh ? ' (forced refresh)' : ''}`);

    // Fetch YouTube video page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('Video not found');
    }

    const html = await response.text();
    
    // Extract duration from the HTML
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    if (durationMatch) {
      const duration = parseInt(durationMatch[1], 10);
      
      // Cache the duration in the database
      await cacheDuration(supabase, videoId, duration);
      
      return { 
        duration,
        cached: false,
        lastUpdated: new Date().toISOString()
      };
    }

    // Try alternative pattern
    const altMatch = html.match(/"approxDurationMs":"(\d+)"/);
    if (altMatch) {
      const durationMs = parseInt(altMatch[1], 10);
      const duration = Math.floor(durationMs / 1000);
      
      // Cache the duration in the database
      await cacheDuration(supabase, videoId, duration);
      
      return { 
        duration,
        cached: false,
        lastUpdated: new Date().toISOString()
      };
    }

    throw new Error('Duration not found');
  } catch (error) {
    console.error('Error fetching YouTube duration:', error);
    throw error;
  }
}

// Helper function to cache duration in database
async function cacheDuration(supabase: any, videoId: string, duration: number) {
  try {
    const { error } = await supabase
      .from('tutorial_videos')
      .update({
        youtube_duration_cached: duration,
        youtube_duration_last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('youtube_video_id', videoId);

    if (error) {
      console.error('Error caching duration:', error);
    } else {
      console.log(`Cached duration for ${videoId}: ${duration}s`);
    }
  } catch (error) {
    console.error('Error caching duration:', error);
  }
}

