# TMDB Anime Search Issues and Solutions

## Problem Description

### Issue (Task 7)

TMDB API returns 503 (Service Unavailable) errors when searching for anime titles, even though initial searches succeed. This causes failures during folder scanning when attempting to match anime media files.

### Root Cause

- TMDB has limited anime metadata compared to Western media
- TMDB search can be unreliable for anime due to:
  - Japanese titles with multiple romanizations
  - Different naming conventions (English vs Romaji vs Japanese)
  - Incomplete anime database coverage
  - Rate limiting on repeated searches

### Current Backend Implementation

The backend (`TMDBClient.java`) has:

- ✅ Retry logic with exponential backoff (max 3 retries)
- ✅ Timeout handling (30 seconds default)
- ✅ 503 error detection and retry
- ❌ No fallback to alternative anime APIs

## Recommended Solutions

### Short-term Solution (Task 7)

Improve TMDB search for anime:

1. **Increase timeout for anime searches**
   - Anime searches take longer due to multiple naming variations
   - Suggestion: Add anime-specific timeout configuration

2. **Implement search result caching**
   - Cache failed searches to avoid repeated 503 errors
   - Cache successful anime results longer (24h+)

3. **Better query normalization for anime**
   - Remove common anime file tags: [SubGroup], [1080p], [HEVC], etc.
   - Try multiple search strategies:
     - Original title
     - English title
     - Romaji title

### Long-term Solution (Task 8)

Integrate dedicated anime APIs as fallback:

#### Option 1: AniList API (Recommended)

- ✅ Free, no API key required
- ✅ GraphQL API (flexible queries)
- ✅ Comprehensive anime database
- ✅ Multiple language support
- ✅ Rich metadata (episodes, seasons, studios, etc.)
- 🔗 https://anilist.gitbook.io/anilist-apiv2-docs/

#### Option 2: MyAnimeList API

- ✅ Largest anime database
- ⚠️ Requires API key and OAuth
- ✅ Accurate episode counts
- ✅ Good metadata coverage
- 🔗 https://myanimelist.net/apiconfig/references/api/v2

#### Option 3: Jikan API (MyAnimeList Scraper)

- ✅ Free, no API key required
- ✅ REST API (easier integration)
- ⚠️ Rate limited (2 requests/second)
- ✅ Access to MyAnimeList data without OAuth
- 🔗 https://jikan.moe/

## Implementation Plan

### Phase 1: Backend Improvements

1. Create anime detection utility

   ```java
   public static boolean isAnime(String query) {
       // Detect anime keywords in filename
       return query.matches(".*\\[.*\\].*") || // SubGroup tags
              query.contains("Episode") ||
              // Add more patterns
   }
   ```

2. Add anime-specific search strategy
   ```java
   public MediaDetailsWithType<?> searchAnime(String query) {
       // Try TMDB first
       try {
           return postSearchMedia(query, "single", true);
       } catch (TMDBClientException e) {
           // Fallback to AniList
           return aniListService.search(query);
       }
   }
   ```

### Phase 2: AniList Integration

1. Create AniListClient.java
   - GraphQL client implementation
   - Search by title
   - Get anime details
   - Map to internal DTOs

2. Create AniListService.java
   - Business logic layer
   - Result caching
   - Error handling

3. Update MediaController.java
   - Add anime-specific search endpoint
   - Auto-detect anime and route accordingly

### Phase 3: Frontend Updates

1. Update apiService.ts
   - Add anime detection logic
   - Call appropriate backend endpoint

2. Update folderScanService.ts
   - Use anime endpoint for detected anime files
   - Better error handling for failed searches

## Configuration

### Backend (application.yaml)

```yaml
tmdb:
  api:
    timeout: 30
    max-retries: 3
    anime:
      timeout: 45 # Longer timeout for anime
      max-retries: 5

anilist:
  api:
    base-url: https://graphql.anilist.co
    timeout: 30
    cache-duration: 86400 # 24 hours
```

### Frontend

```typescript
// Anime detection patterns
const ANIME_PATTERNS = [
  /\[.*?\]/, // SubGroup tags
  /\(.*?\)/, // Alternative groups
  /Episode\s+\d+/i,
  /E\d{2,3}/i,
];

function isAnimeFile(filename: string): boolean {
  return ANIME_PATTERNS.some((pattern) => pattern.test(filename));
}
```

## Expected Results

### Before

- ❌ 503 errors when scanning anime folders
- ❌ Failed matches for anime series
- ❌ Manual re-matching required

### After

- ✅ Reliable anime matching
- ✅ Automatic fallback to anime API
- ✅ Better metadata for anime content
- ✅ Reduced TMDB load

## Testing Strategy

1. **Test TMDB improvements**
   - Scan folder with mixed content (movies + anime)
   - Verify timeout handling
   - Check retry logic

2. **Test AniList integration**
   - Search for popular anime
   - Search for obscure anime
   - Verify metadata quality

3. **Test fallback mechanism**
   - Force TMDB failures
   - Verify AniList fallback triggers
   - Check result consistency

## References

- TMDB API Docs: https://developers.themoviedb.org/3
- AniList API Docs: https://anilist.gitbook.io/anilist-apiv2-docs/
- Jikan API Docs: https://docs.api.jikan.moe/
