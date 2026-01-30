"use server";

import { createClient } from '@/utils/supabase/server';

export interface PlaylistVideo {
  id: string;
  title: string;
  description: string;
  duration: number;
  feature_category: string;
  theory_level_required: string;
  tech_level_required: string;
  app_mode_applicability: string[];
  musical_context: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  videoCount: number;
  totalDuration: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  targetTheoryLevel: string;
  targetTechLevel: string;
  appModeFilter: string;
  musicalGoal: string;
  estimatedDuration: number;
  difficultyRating: number;
  videos: PlaylistVideo[];
}

export interface GetPlaylistsResponse {
  playlists: Playlist[];
}

function calculateTotalDuration(videos: any[]): string {
  const totalSeconds = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get all tutorial playlists with their videos
 */
export async function getPlaylists(): Promise<GetPlaylistsResponse> {
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

    // Get all playlists with their videos
    const { data: playlists, error: playlistsError } = await supabase
      .from('tutorial_playlists')
      .select(`
        *,
        playlist_videos (
          sequence_order,
          is_optional,
          is_conditional,
          tutorial_videos (
            id,
            title,
            description,
            duration,
            feature_category,
            theory_level_required,
            tech_level_required,
            app_mode_applicability,
            musical_context
          )
        )
      `)
      .order('created_at');

    if (playlistsError) {
      console.error('Error fetching playlists:', playlistsError);
      throw new Error('Failed to fetch playlists');
    }

    // Define pedagogical order for playlists (with numbers)
    const pedagogicalOrder = [
      '1. Getting Started',
      '2. Getting Connected', 
      '3. Music Theory Basics',
      '4. Composition Basics',
      '5. Voicing Settings',
      '6. Sequencer Settings',
      '7. Transport & Timeline',
      '8. AI & Generation',
      '9. MIDI & Routing',
      '10. Notation & Export',
      '11. Workflow & Productivity'
    ];

    // Sort playlists by pedagogical order
    const sortedPlaylists = playlists?.sort((a, b) => {
      const indexA = pedagogicalOrder.indexOf(a.name);
      const indexB = pedagogicalOrder.indexOf(b.name);
      
      // If both playlists are in the pedagogical order, sort by that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the order, sort alphabetically
      return a.name.localeCompare(b.name);
    }) || [];

    // Transform the data to match the expected format
    const transformedPlaylists = sortedPlaylists?.map(playlist => {
      const videos = playlist.playlist_videos
        ?.sort((a, b) => a.sequence_order - b.sequence_order)
        .map(pv => pv.tutorial_videos)
        .filter(Boolean) || [];

      const normalizedVideos: PlaylistVideo[] = videos.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        title: v.title as string,
        description: (v.description as string) ?? '',
        duration: typeof v.duration === 'number' ? v.duration : 0,
        feature_category: v.feature_category as string,
        theory_level_required: v.theory_level_required as string,
        tech_level_required: v.tech_level_required as string,
        app_mode_applicability: typeof v.app_mode_applicability === 'string' ? (v.app_mode_applicability as string).split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(v.app_mode_applicability) ? v.app_mode_applicability as string[] : []),
        musical_context: (v.musical_context as string) ?? '',
      }));
      return {
        id: playlist.id,
        title: playlist.name,
        description: playlist.description ?? '',
        videoCount: normalizedVideos.length,
        totalDuration: calculateTotalDuration(normalizedVideos),
        views: 0, // Placeholder for now
        createdAt: playlist.created_at ?? '',
        updatedAt: playlist.updated_at ?? '',
        targetTheoryLevel: playlist.target_theory_level,
        targetTechLevel: playlist.target_tech_level,
        appModeFilter: playlist.app_mode_filter,
        musicalGoal: playlist.musical_goal,
        estimatedDuration: playlist.estimated_duration ?? 0,
        difficultyRating: playlist.difficulty_rating ?? 0,
        videos: normalizedVideos
      };
    }) || [];

    return { playlists: transformedPlaylists };
  } catch (error) {
    console.error('Unexpected error in getPlaylists:', error);
    throw error;
  }
}

/**
 * Get playlist videos
 */
export async function getPlaylistVideos(playlistId: string): Promise<{
  videos: any[];
  totalCount: number;
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

    // Get all videos in the playlist with their order
    const { data: playlistVideos, error: playlistError } = await supabase
      .from('playlist_videos')
      .select(`
        sequence_order,
        is_optional,
        is_conditional,
        tutorial_videos (
          id,
          title,
          description,
          duration,
          feature_category,
          theory_level_required,
          tech_level_required,
          app_mode_applicability,
          musical_context,
          component_source_file,
          video_order,
          youtube_video_id,
          created_at,
          updated_at
        )
      `)
      .eq('playlist_id', playlistId)
      .order('sequence_order', { ascending: true });

    if (playlistError) {
      console.error('Error fetching playlist videos:', playlistError);
      throw new Error('Failed to fetch playlist videos');
    }

    // Transform the data to flatten the structure
    const videos = playlistVideos?.map(pv => ({
      ...pv.tutorial_videos,
      sequence_order: pv.sequence_order,
      is_optional: pv.is_optional,
      is_conditional: pv.is_conditional
    })) || [];

    return {
      videos,
      totalCount: videos.length
    };
  } catch (error) {
    console.error('Unexpected error in getPlaylistVideos:', error);
    throw error;
  }
}

/**
 * Get playlist progress
 */
export async function getPlaylistProgress(playlistId: string): Promise<{
  progress: any[];
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

    const userId = user.id;

    // Get all videos in the playlist with their progress
    const { data: playlistVideos, error: playlistError } = await supabase
      .from('playlist_videos')
      .select(`
        video_id,
        sequence_order,
        tutorial_videos (
          id,
          title,
          duration,
          youtube_video_id
        )
      `)
      .eq('playlist_id', playlistId)
      .order('sequence_order');

    if (playlistError) {
      console.error('Error fetching playlist videos:', playlistError);
      throw new Error('Failed to fetch playlist videos');
    }

    if (!playlistVideos || playlistVideos.length === 0) {
      return { progress: [] };
    }

    // Get progress for all videos in the playlist
    const videoIds = playlistVideos.map(pv => pv.video_id);
    const { data: progressData, error: progressError } = await supabase
      .from('video_progress')
      .select('*')
      .eq('user_id', userId)
      .in('video_id', videoIds);

    if (progressError) {
      console.error('Error fetching video progress:', progressError);
      throw new Error('Failed to fetch progress');
    }

    // Combine playlist videos with their progress
    const progressMap = new Map(progressData?.map(p => [p.video_id, p]) || []);
    
    const videosWithProgress = playlistVideos.map(pv => ({
      ...pv.tutorial_videos,
      sequence_order: pv.sequence_order,
      progress: progressMap.get(pv.video_id) || {
        watch_percentage: 0,
        is_completed: false,
        total_watch_time: 0,
        last_watched_at: null
      }
    }));

    return { progress: videosWithProgress };
  } catch (error) {
    console.error('Unexpected error in getPlaylistProgress:', error);
    throw error;
  }
}

/**
 * Get a single playlist by ID
 */
export async function getPlaylist(playlistId: string): Promise<Playlist> {
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

    // Get playlist with videos
    const { data: playlist, error: playlistError } = await supabase
      .from('tutorial_playlists')
      .select(`
        *,
        playlist_videos (
          sequence_order,
          is_optional,
          is_conditional,
          tutorial_videos (
            id,
            title,
            description,
            duration,
            feature_category,
            theory_level_required,
            tech_level_required,
            app_mode_applicability,
            musical_context
          )
        )
      `)
      .eq('id', playlistId)
      .single();

    if (playlistError) {
      console.error('Error fetching playlist:', playlistError);
      throw new Error('Playlist not found');
    }

    const videos = playlist.playlist_videos
      ?.sort((a, b) => a.sequence_order - b.sequence_order)
      .map(pv => pv.tutorial_videos)
      .filter(Boolean) || [];

    return {
      id: playlist.id,
      title: playlist.name,
      description: playlist.description ?? '',
      videoCount: videos.length,
      totalDuration: calculateTotalDuration(videos),
      views: 0,
      createdAt: playlist.created_at ?? '',
      updatedAt: playlist.updated_at ?? '',
      targetTheoryLevel: playlist.target_theory_level,
      targetTechLevel: playlist.target_tech_level,
      appModeFilter: playlist.app_mode_filter,
      musicalGoal: playlist.musical_goal,
      estimatedDuration: playlist.estimated_duration ?? 0,
      difficultyRating: playlist.difficulty_rating ?? 0,
      videos: videos.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        title: v.title as string,
        description: (v.description as string) ?? '',
        duration: typeof v.duration === 'number' ? v.duration : 0,
        feature_category: v.feature_category as string,
        theory_level_required: v.theory_level_required as string,
        tech_level_required: v.tech_level_required as string,
        app_mode_applicability: typeof v.app_mode_applicability === 'string' ? (v.app_mode_applicability as string).split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(v.app_mode_applicability) ? v.app_mode_applicability as string[] : []),
        musical_context: (v.musical_context as string) ?? '',
      }))
    };
  } catch (error) {
    console.error('Unexpected error in getPlaylist:', error);
    throw error;
  }
}

