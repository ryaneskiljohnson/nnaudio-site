"use server";

import { createClient } from '@/utils/supabase/server';

export interface UserProfile {
  theoryLevel: string;
  techLevel: string;
  appMode: string;
  musicalGoals: string[];
  priorExperience: string;
}

/**
 * Get user tutorial profile
 */
export async function getUserProfile(userId: string): Promise<{ profile: UserProfile | null }> {
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

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user profile
    const { data: userPath, error: pathError } = await supabase
      .from('user_tutorial_paths')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (pathError) {
      if (pathError.code === 'PGRST116') {
        return { profile: null };
      }
      console.error('Error fetching user profile:', pathError);
      throw new Error('Failed to fetch user profile');
    }

    // Transform database format to frontend format
    const profile: UserProfile = {
      theoryLevel: userPath.theory_level,
      techLevel: userPath.tech_level,
      appMode: userPath.app_mode,
      musicalGoals: userPath.musical_goals || [],
      priorExperience: userPath.prior_experience || 'none'
    };

    return { profile };
  } catch (error) {
    console.error('Unexpected error in getUserProfile:', error);
    throw error;
  }
}

/**
 * Update or create user tutorial profile
 */
export async function updateUserProfile(
  userId: string,
  profile: UserProfile
): Promise<{ success: boolean; profile: UserProfile }> {
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

    // Ensure user can only update their own profile
    if (userId !== user.id) {
      throw new Error('Forbidden - can only update own profile');
    }

    if (!userId || !profile) {
      throw new Error('User ID and profile are required');
    }

    // Check if user profile already exists
    const { data: existingPath, error: checkError } = await supabase
      .from('user_tutorial_paths')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Transform frontend format to database format
    const profileData = {
      user_id: userId,
      theory_level: profile.theoryLevel,
      tech_level: profile.techLevel,
      app_mode: profile.appMode,
      musical_goals: profile.musicalGoals,
      prior_experience: profile.priorExperience,
      progress_data: {},
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingPath) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_tutorial_paths')
        .update(profileData)
        .eq('id', existingPath.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        throw new Error('Failed to update user profile');
      }

      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_tutorial_paths')
        .insert({
          ...profileData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        throw new Error('Failed to create user profile');
      }

      result = data;
    }

    return {
      success: true,
      profile: {
        theoryLevel: result.theory_level,
        techLevel: result.tech_level,
        appMode: result.app_mode,
        musicalGoals: result.musical_goals ?? [],
        priorExperience: result.prior_experience ?? ''
      }
    };
  } catch (error) {
    console.error('Unexpected error in updateUserProfile:', error);
    throw error;
  }
}

