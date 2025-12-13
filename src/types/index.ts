export interface Movie {
  id: string;
  title: string;
  year: number;
  description: string; // mapped to overview
  overview?: string;
  posterUrl: string;
  backdropUrl: string;
  tmdbPosterUrl?: string;
  tmdbBackdropUrl?: string;
  rating: number;
  runtime: number; // minutes
  genres: string[];
  isWatched?: boolean;
  isInContinueWatching?: boolean;
  isRecentlyAdded?: boolean;
  fullPath?: string;
  isFavorite?: boolean;
  isHidden?: boolean;
}

export type MediaType = "movie" | "episode";

export interface MovieFile {
  id: string;
  fullPath: string;
  fileName: string;
  fileSizeBytes?: number;
  extension?: string;
  createdAt?: string;
  modifiedAt?: string;
  lastSeenAt?: string;
  folderId?: string;
  videoResolution?: string; // e.g. "1080p", "4K"
  audioLanguageCodes?: string[];
  subtitleLanguageCodes?: string[];
  linkedMovieId?: string | null; // FK to Movie
  
  // Parsed Info
  guessedTitle?: string;
  guessedYear?: number;
  parsingConfidence?: number; // 0.0 - 1.0

  // Media Type Info
  mediaType?: MediaType;          // "movie" (default) or "episode"
  seriesTitle?: string | null;    // for episodes, the series/show name
  seasonNumber?: number | null;   // Sxx
  episodeNumber?: number | null;  // Exx
  episodeTitle?: string | null;   // from metadata later

  // Metadata
  metadata?: {
    title: string;
    year: number | null;
    plot: string | null;
    posterUrl: string | null;
    genres: string[];
    runtimeMinutes: number | null;
    imdbId: string | null;
    rating: string | null;
    cast?: Array<{ id: number; name: string; character: string; profilePath: string | null }>;
    crew?: Array<{ id: number; name: string; job: string; department: string; profilePath: string | null }>;
  };
  
  metadataSource?: "omdb" | "manual" | "tmdb";

  // TMDB Artwork
  tmdbBackdropUrl?: string | null;
  tmdbPosterUrl?: string | null;

  // User preferences
  isFavorite?: boolean;
  isHidden?: boolean;
}

export interface LibraryFolder {
  id: string;
  path: string;
  displayName?: string;
  createdAt: string;
  isActive: boolean;
}

export interface DuplicateGroup {
  normalizedName: string;
  fileSize: number;
  files: MovieFile[];
}

export interface ScanJob {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "completed" | "error";
  totalFilesFound?: number;
  totalFilesKept?: number;
  filesProcessed?: number;
  errorMessage?: string;
}

export interface Series {
  id: string;
  title: string;
  year: number; // Start year
  description: string;
  posterUrl: string;
  backdropUrl: string;
  tmdbPosterUrl?: string;
  tmdbBackdropUrl?: string;
  rating: number;
  seasons: number;
  genres: string[];
  isWatched?: boolean;
  fullPath?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface PlaybackSettings {
  playbackMode: "systemDefault" | "custom";
  customPlayerPath: string | null;
  customPlayerLabel: string | null;
}

export interface SearchMediaRequest {
  query: string;
  mediaType: "all" | "movie" | "series";
  yearFrom?: number;
  yearTo?: number;
  folderId?: string;
  limit?: number;
}

export interface MediaSearchResult {
  id: string;
  mediaType: "movie" | "episode";
  title: string;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  year?: number;
  posterUrl?: string;
  folderId: string;
  filePath: string;
  rating?: number;
}
