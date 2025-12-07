import { net, app } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

function getTmdbApiKey(): string | undefined {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'library.db');
    // Open read-only connection to avoid locking issues
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const row = db.prepare("SELECT value FROM settings WHERE key = 'tmdbApiKey'").get() as { value: string } | undefined;
    db.close();
    return row?.value || process.env.TMDB_API_KEY;
  } catch (e) {
    console.error("[TMDB] Failed to read API key from DB:", e);
    return process.env.TMDB_API_KEY;
  }
}

// Cache: imdbId -> { backdropUrl, posterUrl }
const artworkCache = new Map<string, { backdropUrl?: string; posterUrl?: string }>();

let hasLoggedKey = false;

// Rate Limiting
const REQUEST_DELAY_MS = 350; // ~3 requests per second
let lastRequestTime = 0;
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) {
      const now = Date.now();
      const timeSinceLast = now - lastRequestTime;
      if (timeSinceLast < REQUEST_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLast));
      }
      
      try {
        await task();
      } catch (e) {
        console.error("[TMDB] Queue task error:", e);
      }
      lastRequestTime = Date.now();
    }
  }

  isProcessingQueue = false;
}

function scheduleRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    processQueue();
  });
}

async function throttledFetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  return scheduleRequest(async () => {
    let response = await net.fetch(url, options);
    
    if (response.status === 429) {
      console.warn("[TMDB] Rate limit hit (429). Retrying in 2s...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      response = await net.fetch(url, options);
    }

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch (e) {}
      console.error(`[TMDB] Request failed. URL: ${url.replace(/api_key=[^&]+/, 'api_key=***')}`);
      console.error(`[TMDB] Status: ${response.status}, Body: ${errBody}`);
      throw new Error(`TMDB API request failed: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  });
}

interface TmdbFindResponse {
  movie_results: Array<{ id: number; media_type: string }>;
  tv_results: Array<{ id: number; media_type: string }>;
  tv_episode_results: Array<{ id: number; show_id: number; media_type: string }>;
}

interface TmdbImagesResponse {
  backdrops: Array<{ file_path: string }>;
  posters: Array<{ file_path: string }>;
}

export async function fetchTmdbArtworkForImdbId(
  imdbId: string, 
  _providedKey?: string
): Promise<{ backdropUrl?: string; posterUrl?: string }> {
  // 1. Get the raw key
  let apiKey = _providedKey || getTmdbApiKey();

  if (!apiKey) {
    console.warn('[TMDB] No API key configured');
    return {};
  }

  // 2. CLEAN THE KEY: Remove whitespace/newlines which often happen when copying
  apiKey = apiKey.trim();

  if (!hasLoggedKey) {
    console.log('[TMDB] Using v3 API Key. Prefix:', apiKey.slice(0, 6));
    hasLoggedKey = true;
  }

  if (!imdbId) return {};

  // Check cache
  if (artworkCache.has(imdbId)) {
    return artworkCache.get(imdbId)!;
  }

  try {
    // 3. STRICT v3 MODE: No headers, just query param
    // Note: We use encodeURIComponent just in case, though hex keys don't need it.
    const findUrl = `${TMDB_BASE_URL}/find/${encodeURIComponent(imdbId)}?api_key=${apiKey}&external_source=imdb_id`;
    
    const findResponse = await throttledFetchJson<TmdbFindResponse>(findUrl);

    let tmdbId: number | undefined;
    let mediaType: 'movie' | 'tv' | undefined;

    if (findResponse.movie_results && findResponse.movie_results.length > 0) {
      tmdbId = findResponse.movie_results[0].id;
      mediaType = 'movie';
    } else if (findResponse.tv_results && findResponse.tv_results.length > 0) {
      tmdbId = findResponse.tv_results[0].id;
      mediaType = 'tv';
    } else if (findResponse.tv_episode_results && findResponse.tv_episode_results.length > 0) {
      // If we found an episode, we want the Series artwork (poster/backdrop)
      // so we use the show_id and treat it as a 'tv' lookup
      tmdbId = findResponse.tv_episode_results[0].show_id;
      mediaType = 'tv';
      console.log(`[TMDB] Resolved Episode ID ${imdbId} to TV Show ID ${tmdbId}`);
    }

    if (!tmdbId || !mediaType) {
      console.warn(`[TMDB] No results found for IMDb ID: ${imdbId}`);
      artworkCache.set(imdbId, {}); 
      return {};
    }

    // 2. Get Images
    const imagesUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/images?api_key=${apiKey}&include_image_language=en,null`;
    const imagesResponse = await throttledFetchJson<TmdbImagesResponse>(imagesUrl);

    let backdropUrl: string | undefined;
    let posterUrl: string | undefined;

    if (imagesResponse.backdrops && imagesResponse.backdrops.length > 0) {
      backdropUrl = `${TMDB_IMAGE_BASE}w1280${imagesResponse.backdrops[0].file_path}`;
    }

    if (imagesResponse.posters && imagesResponse.posters.length > 0) {
      posterUrl = `${TMDB_IMAGE_BASE}w500${imagesResponse.posters[0].file_path}`;
    }

    const result = { backdropUrl, posterUrl };
    artworkCache.set(imdbId, result);
    
    console.log('[TMDB] artwork result', { imdbId, posterUrl, backdropUrl });
    return result;

  } catch (error) {
    console.warn('[TMDB] Unexpected error', error);
    return {};
  }
}
