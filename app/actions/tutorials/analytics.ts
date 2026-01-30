"use server";

import { createClient } from '@/utils/supabase/server';

export interface UserAnalytics {
  // Personal Stats
  totalVideosWatched: number;
  totalTimeSpent: string;
  completionRate: number;
  learningStreak: number;
  recentActivity: number;
  
  // Learning Profile
  currentTheoryLevel: string;
  currentTechLevel: string;
  favoriteCategory: string;
  musicalGoals: string[];
  
  // Progress Metrics
  totalAvailableVideos: number;
  videosRemaining: number;
  averageVideoLength: string;
  
  // Skill Progression
  theoryLevelProgress: number;
  techLevelProgress: number;
  
  // Recent Achievements
  achievements: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  
  // Learning Insights
  insights: string[];
}

/**
 * Get user analytics (user can only access their own analytics)
 */
export async function getUserAnalytics(
  userId: string
): Promise<{ analytics: UserAnalytics }> {
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

    // Ensure user can only access their own analytics
    if (userId !== user.id) {
      throw new Error('Forbidden - can only access own analytics');
    }

    // Get user's profile and progress data
    const { data: userPath, error: pathError } = await supabase
      .from('user_tutorial_paths')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (pathError && pathError.code !== 'PGRST116') {
      console.error('Error fetching user path:', pathError);
      throw new Error('Failed to fetch user data');
    }

    // Get user's progress data
    const { data: progressData, error: progressError } = await supabase
      .from('user_tutorial_paths')
      .select('progress_data')
      .eq('user_id', user.id)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress data:', progressError);
    }

    const progress = (progressData?.progress_data || {}) as Record<string, { completed?: boolean; timeSpent?: number; lastWatched?: string; category?: string }>;

    // Get user's completed videos
    const { data: completedVideos, error: completedError } = await supabase
      .from('user_tutorial_paths')
      .select(`
        progress_data,
        tutorial_playlists (
          playlist_videos (
            tutorial_videos (
              id,
              title,
              duration,
              feature_category,
              theory_level_required,
              tech_level_required
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (completedError && completedError.code !== 'PGRST116') {
      console.error('Error fetching completed videos:', completedError);
    }

    // Calculate user-specific metrics
    const completedVideoIds = Object.keys(progress).filter(videoId => progress[videoId]?.completed);
    const totalVideosWatched = completedVideoIds.length;
    const totalTimeSpent = completedVideoIds.reduce((total, videoId) => {
      const videoProgress = progress[videoId];
      return total + (videoProgress?.timeSpent || 0);
    }, 0);

    // Get user's current playlist videos for completion rate calculation
    let totalAvailableVideos = 0;
    let userPlaylistVideos: any[] = [];

    if (userPath) {
      // Get videos from user's current playlist
      const { data: playlistVideos, error: playlistError } = await supabase
        .from('playlist_videos')
        .select(`
          tutorial_videos (
            id,
            title,
            duration,
            feature_category,
            theory_level_required,
            tech_level_required
          )
        `)
        .eq('playlist_id', (userPath as { generated_playlist_id?: string | null }).generated_playlist_id || '2509f80f-477f-4027-b02e-bcdba3c66511'); // Default to first playlist

      if (!playlistError && playlistVideos) {
        userPlaylistVideos = playlistVideos.map(pv => pv.tutorial_videos).filter(Boolean);
        totalAvailableVideos = userPlaylistVideos.length;
      }
    }

    // Calculate completion rate
    const completionRate = totalAvailableVideos > 0 ? Math.round((totalVideosWatched / totalAvailableVideos) * 100) : 0;

    // Get user's learning streak (consecutive days with activity)
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let learningStreak = 0;
    if (progress) {
      const activityDates = Object.values(progress)
        .map((p: any) => p.lastWatched ? new Date(p.lastWatched) : null)
        .filter(Boolean)
        .sort((a, b) => b!.getTime() - a!.getTime());

      // Calculate streak
      let currentStreak = 0;
      let checkDate = new Date(today);
      checkDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 30; i++) { // Check up to 30 days back
        const hasActivity = activityDates.some(date => {
          const activityDate = new Date(date!);
          activityDate.setHours(0, 0, 0, 0);
          return activityDate.getTime() === checkDate.getTime();
        });

        if (hasActivity) {
          currentStreak++;
        } else if (currentStreak > 0) {
          break; // Streak broken
        }

        checkDate.setDate(checkDate.getDate() - 1);
      }

      learningStreak = currentStreak;
    }

    // Get user's favorite categories
    const categoryStats: Record<string, number> = {};
    completedVideoIds.forEach(videoId => {
      const videoProgress = progress[videoId];
      if (videoProgress?.category) {
        categoryStats[videoProgress.category] = (categoryStats[videoProgress.category] || 0) + 1;
      }
    });

    const favoriteCategory = Object.keys(categoryStats).length > 0
      ? Object.keys(categoryStats).reduce((a, b) => categoryStats[a] > categoryStats[b] ? a : b, 'general')
      : 'general';

    // Get recent activity (last 7 days)
    const recentActivity = Object.values(progress)
      .filter((p: any) => {
        if (!p.lastWatched) return false;
        const lastWatched = new Date(p.lastWatched);
        return lastWatched >= sevenDaysAgo;
      })
      .length;

    // Format time spent
    const formatTimeSpent = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    // Get user's skill level progression
    const skillLevels = ['beginner', 'intermediate', 'advanced'];
    const currentTheoryLevel = userPath?.theory_level || 'beginner';
    const currentTechLevel = userPath?.tech_level || 'new_to_daws';
    
    const theoryLevelIndex = skillLevels.indexOf(currentTheoryLevel);
    const techLevelIndex = skillLevels.indexOf(currentTechLevel.replace('_', ''));

    const userAnalytics: UserAnalytics = {
      // Personal Stats
      totalVideosWatched,
      totalTimeSpent: formatTimeSpent(totalTimeSpent),
      completionRate,
      learningStreak,
      recentActivity,
      
      // Learning Profile
      currentTheoryLevel,
      currentTechLevel: currentTechLevel.replace('_', ' '),
      favoriteCategory: favoriteCategory.replace('_', ' '),
      musicalGoals: userPath?.musical_goals || [],
      
      // Progress Metrics
      totalAvailableVideos,
      videosRemaining: Math.max(0, totalAvailableVideos - totalVideosWatched),
      averageVideoLength: totalVideosWatched > 0 ? formatTimeSpent(totalTimeSpent / totalVideosWatched) : '0m',
      
      // Skill Progression
      theoryLevelProgress: Math.round(((theoryLevelIndex + 1) / skillLevels.length) * 100),
      techLevelProgress: Math.round(((techLevelIndex + 1) / skillLevels.length) * 100),
      
      // Recent Achievements
      achievements: [
        ...(totalVideosWatched >= 1 ? [{ title: 'First Video Complete', description: 'Started your learning journey', icon: '🎬' }] : []),
        ...(totalVideosWatched >= 5 ? [{ title: 'Getting Started', description: 'Completed 5 videos', icon: '🚀' }] : []),
        ...(totalVideosWatched >= 10 ? [{ title: 'Dedicated Learner', description: 'Completed 10 videos', icon: '📚' }] : []),
        ...(completionRate >= 50 ? [{ title: 'Halfway There', description: '50% playlist complete', icon: '🎯' }] : []),
        ...(completionRate >= 100 ? [{ title: 'Playlist Master', description: 'Completed entire playlist', icon: '🏆' }] : []),
        ...(learningStreak >= 3 ? [{ title: 'Learning Streak', description: `${learningStreak} day streak`, icon: '🔥' }] : []),
        ...(learningStreak >= 7 ? [{ title: 'Week Warrior', description: '7+ day learning streak', icon: '⚡' }] : [])
      ],
      
      // Learning Insights
      insights: [
        ...(totalVideosWatched > 0 ? [`You've spent ${formatTimeSpent(totalTimeSpent)} learning Cymasphere`] : []),
        ...(completionRate > 0 ? [`You're ${completionRate}% through your personalized playlist`] : []),
        ...(learningStreak > 0 ? [`You're on a ${learningStreak} day learning streak!`] : []),
        ...(recentActivity > 0 ? [`You've been active ${recentActivity} times in the last week`] : []),
        ...(favoriteCategory !== 'general' ? [`Your favorite category is ${favoriteCategory.replace('_', ' ')}`] : [])
      ]
    };

    return { analytics: userAnalytics };
  } catch (error) {
    console.error('Unexpected error in getUserAnalytics:', error);
    throw error;
  }
}

