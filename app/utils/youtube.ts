/**
 * @fileoverview YouTube utility functions for video handling
 * @module YouTubeUtils
 */

/**
 * @brief Extract YouTube video ID from various YouTube URL formats
 * @param url The YouTube URL to parse
 * @returns The video ID or null if not found
 * @example
 * extractYouTubeId('https://youtu.be/dQw4w9WgXcQ') // returns 'dQw4w9WgXcQ'
 * extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') // returns 'dQw4w9WgXcQ'
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Handle youtu.be format
  const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (youtuBeMatch) {
    return youtuBeMatch[1];
  }
  
  // Handle youtube.com/watch format
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    return watchMatch[1];
  }
  
  // Handle youtube.com/embed format
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) {
    return embedMatch[1];
  }

  // Handle youtube.com/shorts format (YouTube Shorts)
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) {
    return shortsMatch[1];
  }
  
  return null;
}

/**
 * @brief Convert any YouTube URL to embed format
 * @param url The YouTube URL to convert
 * @returns The embed URL or original URL if not YouTube
 */
export function convertToEmbedUrl(url: string): string {
  const videoId = extractYouTubeId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
}

/**
 * @brief Get YouTube thumbnail URL for a video
 * @param url The YouTube URL
 * @param quality The thumbnail quality ('default', 'medium', 'high', 'standard', 'maxres')
 * @returns The thumbnail URL or empty string if not YouTube
 */
export function getYouTubeThumbnail(url: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
  const videoId = extractYouTubeId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/${quality === 'medium' ? 'mqdefault' : quality === 'high' ? 'hqdefault' : quality === 'standard' ? 'sddefault' : quality === 'maxres' ? 'maxresdefault' : 'default'}.jpg`;
  }
  return '';
}

/**
 * @brief Check if URL is a YouTube video
 * @param url The URL to check
 * @returns True if it's a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * @brief Check if URL is a Vimeo video
 * @param url The URL to check
 * @returns True if it's a Vimeo URL
 */
export function isVimeoUrl(url: string): boolean {
  return url.includes('vimeo.com');
}

/**
 * @brief Convert Vimeo URL to embed format
 * @param url The Vimeo URL to convert
 * @returns The embed URL or original URL if not Vimeo
 */
export function convertVimeoToEmbedUrl(url: string): string {
  if (isVimeoUrl(url)) {
    return url.replace('vimeo.com/', 'player.vimeo.com/video/');
  }
  return url;
}