# Server Function Conversion Example

## Overview
This document shows how to convert API route calls to server function calls using the videos page as an example.

## Before: Using API Routes

```typescript
const fetchVideos = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    if (filters.category !== 'all') params.append('category', filters.category);
    if (filters.theoryLevel !== 'all') params.append('theoryLevel', filters.theoryLevel);
    if (filters.techLevel !== 'all') params.append('techLevel', filters.techLevel);
    if (filters.appMode !== 'all') params.append('appMode', filters.appMode);
    if (filters.search) params.append('search', filters.search);

    const response = await fetch(`/api/tutorials/videos?${params}`);
    if (response.ok) {
      const data = await response.json();
      setVideos(data.videos);
      setCategories(data.categories);
    }
  } catch (error) {
    console.error('Failed to fetch videos:', error);
  } finally {
    setLoading(false);
  }
};
```

## After: Using Server Functions

```typescript
const fetchVideos = async () => {
  setLoading(true);
  try {
    // Import server function
    const { getVideos } = await import('@/app/actions/tutorials');
    
    // Call server function directly with typed parameters
    const data = await getVideos({
      category: filters.category !== 'all' ? filters.category : undefined,
      theoryLevel: filters.theoryLevel !== 'all' ? filters.theoryLevel : undefined,
      techLevel: filters.techLevel !== 'all' ? filters.techLevel : undefined,
      appMode: filters.appMode !== 'all' ? filters.appMode : undefined,
      search: filters.search || undefined,
    });
    
    setVideos(data.videos);
    setCategories(data.categories);
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    // Handle error - could show toast notification here
  } finally {
    setLoading(false);
  }
};
```

## Benefits

1. **Type Safety**: Full TypeScript support with autocomplete
2. **No URL Building**: No need to construct query strings
3. **Direct Function Calls**: No fetch/JSON parsing overhead
4. **Better Error Handling**: Native try/catch with typed errors
5. **Cleaner Code**: More readable and maintainable

## Conversion Pattern

### Step 1: Import the Server Function
```typescript
import { getVideos } from '@/app/actions/tutorials';
// OR use dynamic import if needed:
const { getVideos } = await import('@/app/actions/tutorials');
```

### Step 2: Replace fetch() with Server Function
```typescript
// Before
const response = await fetch(`/api/tutorials/videos?${params}`);
const data = await response.json();

// After
const data = await getVideos({ category, theoryLevel, ... });
```

### Step 3: Handle Errors
```typescript
try {
  const data = await getVideos(params);
  // Use data
} catch (error) {
  // Error is already typed and handled
  console.error('Failed to fetch videos:', error);
}
```

## Available Server Functions

### Tutorials
- `getVideos(params)` - Get videos with filters
- `getVideo(videoId)` - Get single video
- `updateVideo(videoId, updates)` - Update video (admin)
- `getPlaylists()` - Get all playlists
- `getPlaylist(playlistId)` - Get single playlist
- `getPlaylistVideos(playlistId)` - Get playlist videos
- `getPlaylistProgress(playlistId)` - Get playlist progress
- `generatePlaylist(params)` - Generate personalized playlist
- `getVideoProgress(userId, videoId?)` - Get video progress
- `updateVideoProgress(videoId, progress)` - Update progress
- `getUserProfile(userId)` - Get user profile
- `updateUserProfile(userId, profile)` - Update user profile
- `refreshDurations(params?)` - Refresh durations (admin)
- `getDurationCacheStats()` - Get cache stats (admin)

### Email Campaigns
- `getCampaigns(params?)` - Get campaigns (admin)
- `getTemplates(params?)` - Get templates (admin)

## Next Steps

1. Update remaining client components to use server functions
2. Convert remaining API routes to server functions
3. Remove old API routes once all components are updated
4. Add error handling/toast notifications for better UX

