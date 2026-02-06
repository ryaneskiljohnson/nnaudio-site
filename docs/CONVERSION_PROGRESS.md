# API Routes to Server Functions Conversion Progress

## Status: In Progress

### ✅ Completed: Tutorial Server Actions

Created server actions in `app/actions/tutorials/`:

1. **`videos.ts`** - Video management
   - ✅ `getVideos(params)` - Get videos with filters
   - ✅ `getVideo(videoId)` - Get single video
   - ✅ `updateVideo(videoId, updates)` - Update video (admin)
   - ✅ `getVideoScript(videoId)` - Get video script
   - ✅ `getVideosWithDurations(videoIds?)` - Get videos with cached durations

2. **`playlists.ts`** - Playlist management
   - ✅ `getPlaylists()` - Get all playlists
   - ✅ `getPlaylist(playlistId)` - Get single playlist

3. **`progress.ts`** - Progress tracking
   - ✅ `getVideoProgress(userId, videoId?)` - Get progress
   - ✅ `updateVideoProgress(videoId, progress)` - Update progress

4. **`user-profile.ts`** - User profile management
   - ✅ `getUserProfile(userId)` - Get user profile
   - ✅ `updateUserProfile(userId, profile)` - Update user profile

### 🔄 Remaining Tutorial Routes to Convert

- `generate-playlist` - Complex playlist generation logic
- `playlists/[id]/videos` - Get playlist videos
- `playlists/[id]/progress` - Get playlist progress
- `playlists/[id]-progress/progress` - Alternative progress endpoint
- `refresh-durations` - Admin function to refresh video durations
- `user-analytics` - User analytics data

### 📝 Next Steps

1. **Update Client Components** - Replace `fetch()` calls with server function calls
   - Example: `app/(private)/(admin)/admin/tutorial-center/videos/page.tsx`
   - Replace: `fetch('/api/tutorials/videos?${params}')`
   - With: `getVideos({ category, theoryLevel, techLevel, appMode, search })`

2. **Convert Remaining Tutorial Routes** - Complete tutorial conversion
   - Generate playlist route
   - Remaining playlist endpoints
   - Analytics routes

3. **Convert Email Campaign Routes** - Next priority
   - Similar pattern to tutorials
   - All admin-only routes

4. **Convert Stripe Routes** - Billing/pricing
   - Prices endpoint
   - Checkout endpoint
   - Check customer endpoint

### Example: Client Component Update

**Before (API Route):**
```typescript
const response = await fetch(`/api/tutorials/videos?${params}`);
const data = await response.json();
setVideos(data.videos);
```

**After (Server Function):**
```typescript
import { getVideos } from '@/app/actions/tutorials';

const data = await getVideos({
  category: filters.category,
  theoryLevel: filters.theoryLevel,
  techLevel: filters.techLevel,
  appMode: filters.appMode,
  search: filters.search
});
setVideos(data.videos);
```

### Benefits Achieved

1. ✅ Type safety - Full TypeScript support
2. ✅ Simpler code - No fetch/JSON parsing
3. ✅ Better error handling - Native try/catch
4. ✅ Reduced bundle size - Server-only code
5. ✅ Better security - No client exposure

