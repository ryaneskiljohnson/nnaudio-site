# Server Functions vs API Routes Comparison

## Summary

This document compares the newly created server functions with their corresponding API routes to ensure feature parity and identify any discrepancies.

## ✅ Routes That Match Perfectly

### Tutorial Routes

1. **`getVideos()` vs `/api/tutorials/videos` (GET)**

   - ✅ Identical logic
   - ✅ Same filters, query building, and response format

2. **`getVideo()` vs `/api/tutorials/videos/[videoId]` (GET)**

   - ✅ Identical logic
   - ✅ Both fetch video and script

3. **`updateVideo()` vs `/api/tutorials/videos/[videoId]` (PATCH)**

   - ✅ Identical logic
   - ✅ Both include admin checks

4. **`getVideoScript()` vs `/api/tutorials/videos/[videoId]/script`**

   - ✅ Should be identical (not verified in detail, but structure matches)

5. **`getVideosWithDurations()` vs `/api/tutorials/videos-with-durations`**

   - ✅ Identical logic
   - ✅ Same transformation and response format

6. **`getPlaylists()` vs `/api/tutorials/playlists` (GET)**

   - ✅ Identical logic
   - ✅ Same pedagogical sorting and transformation

7. **`getPlaylist()` vs `/api/tutorials/playlists/[id]` (GET)**

   - ✅ Identical logic
   - ✅ Same data fetching and transformation

8. **`getPlaylistVideos()` vs `/api/tutorials/playlists/[id]/videos`**

   - ✅ Identical logic
   - ✅ Same query and transformation

9. **`getPlaylistProgress()` vs `/api/tutorials/playlists/[id]/progress`**

   - ✅ Identical logic
   - ✅ Same progress mapping

10. **`generatePlaylist()` vs `/api/tutorials/generate-playlist`**
    - ✅ Identical logic
    - ✅ Same filtering and playlist generation

### Email Campaign Routes

1. **`getCampaigns()` vs `/api/email-campaigns/campaigns` (GET)**

   - ✅ Identical logic
   - ✅ Same pagination, audience relations, and response format

2. **`getCampaign()` vs `/api/email-campaigns/campaigns/[id]` (GET)**

   - ✅ Identical logic
   - ✅ Same audience relation handling

3. **`getTemplates()` vs `/api/email-campaigns/templates` (GET)**

   - ✅ Identical logic
   - ✅ Same usage stats and audience relations

4. **`getTemplate()` vs `/api/email-campaigns/templates/[id]` (GET)**

   - ✅ Identical logic
   - ✅ Same audience relation transformation

5. **`sendCampaign()` vs `/api/email-campaigns/send`**
   - ✅ Identical logic
   - ✅ **IMPROVEMENT**: Server function directly queries database for excluded audiences instead of making internal API call (lines 281-327 in server function vs lines 244-256 in API route)

## ⚠️ Issues Found

### 1. **Progress API Route Mismatch**

**Location:** `/api/tutorials/progress/route.ts` vs `getVideoProgress()` in `app/actions/tutorials/progress.ts`

**Problem:** These use **different data models**:

- **API Route**: Uses `user_tutorial_paths` table with JSON `progress_data` field
- **Server Function**: Uses `video_progress` table with separate rows

**Note:** There's also `/api/tutorials/videos/[videoId]/progress/route.ts` which uses `video_progress` and matches the server function. It appears there are two different progress systems in use.

**Recommendation:**

- If `video_progress` is the current system, the `/api/tutorials/progress/route.ts` route may be deprecated
- If `user_tutorial_paths` is still in use, the server function needs to be updated
- Clarify which system is the current standard

### 2. **Audiences - Subscriber Count Calculation**

**Location:** `getAudiences()` in `app/actions/email-campaigns/audiences.ts` vs `/api/email-campaigns/audiences` (GET)

**Problem:** The server function has a **simplified subscriber count calculation** for dynamic audiences:

- **Server Function** (lines 171-190): Returns 0 for dynamic audiences with a comment "For dynamic audiences, we need to calculate from filters. This is a simplified version - the full logic is in the API route. For now, return 0 and let it be calculated on-demand."
- **API Route**: Has complex `calculateSubscriberCount()` helper function (lines 7-343) that handles:
  - Subscription rules
  - Status rules
  - Trial status rules
  - Complex joins between profiles and subscribers tables
  - Tags filtering
  - Date range filtering

**Impact:** Dynamic audiences will show 0 subscribers in the server function, while the API route shows accurate counts.

**Recommendation:**

- Extract the `calculateSubscriberCount()` helper function to a shared utility
- Update the server function to use the full calculation logic
- Or, if dynamic audiences aren't used, document this limitation

### 3. **Missing Write Operations**

**Location:** Various API routes have POST/PUT methods that aren't in server functions

**Examples:**

- `/api/email-campaigns/campaigns` (POST) - Create campaign
- `/api/email-campaigns/templates` (POST/PUT) - Create/Update templates
- `/api/tutorials/videos` (POST) - Create video (if exists)
- `/api/tutorials/playlists` (POST/PUT) - Create/Update playlists (if exists)

**Note:** These may be intentionally kept as API routes for write operations, but should be verified.

## 📋 Recommendations

### High Priority

1. **Fix Audiences Subscriber Count**: Implement the full `calculateSubscriberCount()` logic in the server function or extract it to a shared utility.

2. **Clarify Progress System**: Determine which progress system (`video_progress` vs `user_tutorial_paths`) is the current standard and update accordingly.

### Medium Priority

3. **Extract Shared Utilities**: Consider extracting helper functions like `calculateSubscriberCount()`, `generateHtmlFromElements()`, `generateTextFromElements()`, and `personalizeContent()` to shared utility files to avoid duplication.

4. **Document Missing Write Operations**: If write operations are intentionally kept as API routes, document this decision clearly.

### Low Priority

5. **Type Safety**: Ensure all server functions have proper TypeScript interfaces that match the API route responses.

6. **Error Handling**: Verify error handling is consistent between server functions and API routes (some API routes return NextResponse with specific status codes, while server functions throw errors).

## ✅ Verification Checklist

- [x] Tutorial videos routes (GET)
- [x] Tutorial playlists routes (GET)
- [x] Tutorial progress routes (⚠️ needs clarification)
- [x] Tutorial generate playlist
- [x] Email campaigns routes (GET)
- [x] Email templates routes (GET)
- [x] Email audiences routes (GET - ⚠️ subscriber count issue)
- [x] Email send campaign
- [ ] Email subscribers routes (not fully verified)
- [ ] Email analytics routes (not fully verified)
- [ ] Email deliverability routes (not fully verified)
- [ ] Write operations (POST/PUT/DELETE) - intentionally skipped or need conversion?

## Notes

- Most read operations (GET) have been successfully converted and match their API routes
- The send campaign server function actually improves on the API route by avoiding internal API calls
- The main issues are in progress tracking (data model mismatch) and audience subscriber counting (simplified logic)
