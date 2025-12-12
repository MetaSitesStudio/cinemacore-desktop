import { MovieFile } from '@/types';

export function matchesSearchQuery(file: MovieFile, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return true;

  const metadata = file.metadata as any; // Loose typing for metadata

  const parts: (string | undefined | null)[] = [
    file.fileName,
    file.guessedTitle,
    file.seriesTitle,
    file.episodeTitle,
    // Year from file or metadata
    file.guessedYear?.toString(),
    metadata?.release_date?.substring(0, 4),
    metadata?.first_air_date?.substring(0, 4),
    // Titles
    metadata?.title,
    metadata?.name,
    metadata?.original_title,
    metadata?.original_name,
    // Overview
    metadata?.overview,
    // Language
    metadata?.original_language,
  ];

  // Genres
  if (metadata?.genres && Array.isArray(metadata.genres)) {
    metadata.genres.forEach((g: any) => {
      if (typeof g === 'string') {
        parts.push(g);
      } else if (g?.name) {
        parts.push(g.name);
      }
    });
  }

  // Cast
  // Check both flattened structure (our app) and raw TMDB structure (just in case)
  const cast = metadata?.cast || metadata?.credits?.cast;
  if (cast && Array.isArray(cast)) {
    cast.forEach((c: any) => {
      if (c?.name) parts.push(c.name);
    });
  }

  // Crew (Directors)
  const crew = metadata?.crew || metadata?.credits?.crew;
  if (crew && Array.isArray(crew)) {
    crew.forEach((c: any) => {
      // In our flattened structure, we filter jobs already. In raw, we need to check.
      // But our flattened structure keeps the 'job' property.
      if (c?.name && (c.job === 'Director' || !c.job)) { 
         // If job is missing (unlikely in our types but possible), we might include it or not. 
         // But safely, let's just include names if we are sure it's the crew list.
         parts.push(c.name);
      }
    });
  }

  // Spoken Languages
  if (metadata?.spoken_languages && Array.isArray(metadata.spoken_languages)) {
    metadata.spoken_languages.forEach((l: any) => {
      if (l?.english_name) parts.push(l.english_name);
      if (l?.name) parts.push(l.name);
    });
  }

  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(q);
}
