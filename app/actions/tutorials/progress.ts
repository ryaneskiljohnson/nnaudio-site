"use server";

import { createClient } from '@/utils/supabase/server';

/**
 * Calculate total progress percentage
 */
function calculateTotalProgress(progressData: any): number {
  const videos = Object.keys(progressData);
  if (videos.length === 0) return 0;
  
  const completedVideos = videos.filter(videoId => progressData[videoId].completed);
  return Math.round((completedVideos.length / videos.length) * 100);
}

/**
 * Get video progress for a user
 * Matches logic from app/api/tutorials/progress/route.ts exactly
 * Uses user_tutorial_paths table with JSON progress_data field
 */
export async function getVideoProgress(
  userId: string
): Promise<{
  progress: Record<string, any>;
  totalProgress: number;
  userPath?: {
    theoryLevel: string;
    techLevel: string;
    appMode: string;
    musicalGoals: string[];
  };
}> {
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

    // Get user progress from user_tutorial_paths table
    const { data: userPath, error: pathError } = await supabase
      .from('user_tutorial_paths')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (pathError) {
      if (pathError.code === 'PGRST116') {
        // No user path exists, return empty progress
        return { progress: {}, totalProgress: 0 };
      }
      console.error('Error fetching user progress:', pathError);
      throw new Error('Failed to fetch user progress');
    }

    const progressData = (userPath.progress_data || {}) as Record<string, any>;
    const totalProgress = calculateTotalProgress(progressData);

    return { 
      progress: progressData,
      totalProgress,
      userPath: {
        theoryLevel: userPath.theory_level,
        techLevel: userPath.tech_level,
        appMode: userPath.app_mode,
        musicalGoals: userPath.musical_goals ?? []
      }
    };
  } catch (error) {
    console.error('Unexpected error in getVideoProgress:', error);
    throw error;
  }
}

/**
 * Update video progress
 * Matches logic from app/api/tutorials/progress/route.ts exactly
 * Uses user_tutorial_paths table with JSON progress_data field
 */
export async function updateVideoProgress(
  userId: string,
  videoId: string,
  progress: {
    progress?: number;
    completed?: boolean;
  }
): Promise<{
  success: boolean;
  progress: any;
  totalProgress: number;
}> {
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

    if (!userId || !videoId) {
      throw new Error('User ID and Video ID are required');
    }

    // Get or create user tutorial path
    let { data: userPath, error: pathError } = await supabase
      .from('user_tutorial_paths')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (pathError && pathError.code !== 'PGRST116') {
      console.error('Error fetching user path:', pathError);
      throw new Error('Failed to fetch user path');
    }

    // If no user path exists, create one
    if (!userPath) {
      const { data: newPath, error: createError } = await supabase
        .from('user_tutorial_paths')
        .insert({
          user_id: userId,
          theory_level: 'beginner', // Default values
          tech_level: 'new_to_daws',
          app_mode: 'both',
          musical_goals: ['composition'],
          progress_data: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user path:', createError);
        throw new Error('Failed to create user path');
      }

      userPath = newPath;
    }

    // Update progress data
    const currentProgress = (userPath.progress_data || {}) as Record<string, any>;
    const videoProgress = {
      videoId,
      progress: progress.progress || 0,
      completed: progress.completed || false,
      lastWatched: new Date().toISOString(),
      ...(progress.completed && { completedAt: new Date().toISOString() })
    };

    (currentProgress as Record<string, unknown>)[videoId] = videoProgress;

    // Update user path with new progress
    const { error: updateError } = await supabase
      .from('user_tutorial_paths')
      .update({
        progress_data: currentProgress,
        updated_at: new Date().toISOString()
      })
      .eq('id', userPath.id);

    if (updateError) {
      console.error('Error updating progress:', updateError);
      throw new Error('Failed to update progress');
    }

    return { 
      success: true, 
      progress: videoProgress,
      totalProgress: calculateTotalProgress(currentProgress)
    };
  } catch (error) {
    console.error('Unexpected error in updateVideoProgress:', error);
    throw error;
  }
}

