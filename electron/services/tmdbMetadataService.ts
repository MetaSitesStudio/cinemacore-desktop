const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

// Simple in-memory cache to avoid hitting rate limits on re-scans
const metadataCache = new Map<string, any>();

// Helper for throttled requests
async function throttledFetchJson<T>(url: string): Promise<T> {
  // Basic 250ms delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 250));
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface TmdbMetadata {
  title: string;
  year: number | null;
  plot: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  imdbId: string | null;
  tmdbId: number;
  rating: string | null;
  // Extended info
  tagline?: string;
  status?: string;
  releaseDate?: string;
  budget?: number;
  revenue?: number;
  originalLanguage?: string;
  cast?: Array<{
    id: number;
    name: string;
    character: string;
    profilePath: string | null;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profilePath: string | null;
  }>;
  productionCompanies?: string[];
}

export async function fetchTmdbMetadata(
  title: string, 
  year?: number, 
  mediaType: 'movie' | 'tv' = 'movie',
  apiKey?: string
): Promise<TmdbMetadata | null> {
  if (!apiKey) return null;

  const cacheKey = `${mediaType}:${title}:${year}`;
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
  }

  try {
    // 1. Search
    const searchUrl = `${TMDB_BASE_URL}/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    const searchRes = await throttledFetchJson<{ results: any[] }>(searchUrl);
    
    if (!searchRes.results || searchRes.results.length === 0) {
      return null;
    }

    const match = searchRes.results[0];
    const tmdbId = match.id;

    // 2. Get Details with Credits
    const detailsUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids`;
    const details = await throttledFetchJson<any>(detailsUrl);

    // 3. Map to our format
    const result: TmdbMetadata = {
      title: mediaType === 'movie' ? details.title : details.name,
      year: new Date(details.release_date || details.first_air_date).getFullYear() || null,
      plot: details.overview,
      posterUrl: details.poster_path ? `${TMDB_IMAGE_BASE}w500${details.poster_path}` : null,
      backdropUrl: details.backdrop_path ? `${TMDB_IMAGE_BASE}w1280${details.backdrop_path}` : null,
      genres: details.genres?.map((g: any) => g.name) || [],
      runtimeMinutes: mediaType === 'movie' ? details.runtime : (details.episode_run_time?.[0] || 0),
      imdbId: details.external_ids?.imdb_id || details.imdb_id || null,
      tmdbId: details.id,
      rating: details.vote_average?.toFixed(1) || null,
      
      tagline: details.tagline,
      status: details.status,
      releaseDate: details.release_date || details.first_air_date,
      budget: details.budget,
      revenue: details.revenue,
      originalLanguage: details.original_language,
      
      cast: details.credits?.cast?.slice(0, 10).map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? `${TMDB_IMAGE_BASE}w185${c.profile_path}` : null
      })) || [],
      
      crew: details.credits?.crew?.filter((c: any) => 
        ['Director', 'Screenplay', 'Writer', 'Producer'].includes(c.job)
      ).slice(0, 5).map((c: any) => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profilePath: c.profile_path ? `${TMDB_IMAGE_BASE}w185${c.profile_path}` : null
      })) || [],

      productionCompanies: details.production_companies?.map((c: any) => c.name) || []
    };

    metadataCache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error(`[TMDB] Failed to fetch metadata for ${title}`, error);
    return null;
  }
}
