import { MovieFile, MediaType } from '../types';

export interface ParsedFilename {
  raw: string;
  baseName: string;
  guessedTitle: string | null;
  guessedYear: number | null;
  confidence: number;      // 0.0 to 1.0
  mediaType: MediaType;
  seriesTitle?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

const NOISE_TOKENS = [
  // Resolutions
  '480p', '576p', '720p', '1080p', '2160p', '4k', 'uhd', 'hd',
  // Sources
  'bluray', 'brrip', 'bdrip', 'dvdrip', 'webrip', 'web-dl', 'webdl', 'hdtv', 'tvrip', 'camrip', 'ts', 'tc',
  // Codecs
  'x264', 'x265', 'h264', 'h265', 'hevc', 'divx', 'xvid', 'avc',
  // Audio
  'aac', 'ac3', 'dts', 'ddp5.1', 'dd5.1', 'atmos', 'truehd', 'flac', 'mp3',
  // Editions/Flags
  'extended', 'directors', 'cut', 'remastered', 'unrated', 'theatrical', 'edition', 'complete', 'internal',
  // Groups/Other
  'galaxyrg', 'yify', 'fgt', 'rarbg', 'etrg', 'teamhb', 'psa', 'evo'
];

export function parseMovieFilename(fileName: string): ParsedFilename {
  const raw = fileName;
  // 1. Remove extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

  // 2. Normalize: Replace dots, underscores with spaces
  let normalized = baseName.replace(/[._]/g, ' ');
  
  // 2.5 Check for Series/Episode patterns
  // S01E07, S1E7, 1x07, 1x7
  const sxeRegex = /S(\d{1,2})E(\d{1,2})/i;
  const xRegex = /(\d{1,2})x(\d{1,2})/;
  
  let mediaType: MediaType = 'movie';
  let seriesTitle: string | null = null;
  let seasonNumber: number | null = null;
  let episodeNumber: number | null = null;

  const sxeMatch = normalized.match(sxeRegex);
  const xMatch = normalized.match(xRegex);

  if (sxeMatch) {
    mediaType = 'episode';
    seasonNumber = parseInt(sxeMatch[1], 10);
    episodeNumber = parseInt(sxeMatch[2], 10);
    // Title is everything before the match
    seriesTitle = normalized.substring(0, sxeMatch.index).trim();
  } else if (xMatch) {
    mediaType = 'episode';
    seasonNumber = parseInt(xMatch[1], 10);
    episodeNumber = parseInt(xMatch[2], 10);
    seriesTitle = normalized.substring(0, xMatch.index).trim();
  }

  // 3. Identify Year (1900-2030)
  // Look for 4 digits surrounded by word boundaries or spaces
  const yearRegex = /\b(19|20)\d{2}\b/;
  const yearMatch = normalized.match(yearRegex);
  
  let guessedYear: number | null = null;
  let titlePart = normalized;

  if (mediaType === 'episode' && seriesTitle) {
    // For episodes, the "title part" we clean up is the series title
    titlePart = seriesTitle;
    // We might still find a year in the series title (e.g. "Doctor Who 2005")
    // But usually the year in filename refers to the show start year or episode air year
    // Let's try to extract year from the series title part if present
    const seriesYearMatch = titlePart.match(yearRegex);
    if (seriesYearMatch) {
      guessedYear = parseInt(seriesYearMatch[0], 10);
      // Remove year from series title for cleaner lookup
      titlePart = titlePart.replace(seriesYearMatch[0], '').trim();
    }
  } else if (yearMatch) {
    guessedYear = parseInt(yearMatch[0], 10);
    // Everything before the year is likely the title
    const yearIndex = normalized.indexOf(yearMatch[0]);
    titlePart = normalized.substring(0, yearIndex);
  }

  // 4. Clean Title Part
  // Split into tokens
  let tokens = titlePart.split(/\s+/).filter(t => t.length > 0);
  
  // Filter out noise tokens from the title part (in case year wasn't found or noise appears before year - rare but possible)
  // Also, if no year was found, we stop at the first noise token.
  
  const cleanedTokens: string[] = [];
  
  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    
    // Check if it's a noise token
    // We check if the token *contains* a noise token if it's a release group attached with hyphen?
    // The prompt says "Replace dots/underscores with spaces". It didn't explicitly say hyphens.
    // But "x264-GalaxyRG" -> if we didn't replace hyphens, this is one token.
    // Let's handle hyphens in the token check or pre-normalization.
    // Prompt: "Replace dots/underscores with spaces."
    // Prompt: "Identify and remove common 'noise' tokens... release group tags at the end (e.g. '-GalaxyRG')"
    
    // If we encounter a noise token, we assume the title has ended (especially if no year was found).
    // If a year WAS found, we already sliced before the year, so we are just cleaning up potential garbage before the year.
    
    // Check for exact match or partial match for some noise
    const isNoise = NOISE_TOKENS.some(noise => {
        // Exact match
        if (lowerToken === noise) return true;
        // Check for hyphenated noise (e.g. x264-GalaxyRG)
        if (lowerToken.includes('-') && lowerToken.split('-').some(part => part === noise)) return true;
        return false;
    });

    if (isNoise) {
        // If we hit noise, stop adding to title
        break;
    }
    
    // Also check for release group pattern at the end if it wasn't caught
    if (token.startsWith('-')) {
        break;
    }

    cleanedTokens.push(token);
  }

  // 5. Reassemble Title
  let guessedTitle: string | null = null;
  if (cleanedTokens.length > 0) {
    // Capitalize
    guessedTitle = cleanedTokens.map(t => {
        // Simple capitalization: First letter upper, rest lower (unless it looks like an acronym? Prompt says "simple way")
        // "Capitalize words in a simple way (first letter upper, rest lower)."
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    }).join(' ');
  }

  // 6. Calculate Confidence
  let confidence = 0.0;
  if (guessedTitle) confidence += 0.4;
  if (guessedYear) confidence += 0.4;
  if (mediaType === 'episode' && seasonNumber != null && episodeNumber != null) confidence += 0.2;
  else if (mediaType === 'movie' && guessedTitle && guessedTitle.length > 2) confidence += 0.1;

  return {
    raw,
    baseName,
    guessedTitle,
    guessedYear,
    confidence: Math.min(confidence, 1.0),
    mediaType,
    seriesTitle: mediaType === 'episode' ? guessedTitle : null,
    seasonNumber,
    episodeNumber
  };
}

export function formatGuessedTitle(input: MovieFile | ParsedFilename): string {
  // Handle MovieFile with mediaType
  if ('mediaType' in input && input.mediaType === 'episode' && input.seriesTitle) {
    const s = input.seasonNumber?.toString().padStart(2, '0') || '??';
    const e = input.episodeNumber?.toString().padStart(2, '0') || '??';
    return `${input.seriesTitle} S${s}E${e}`;
  }
  
  const title = input.guessedTitle;
  const year = input.guessedYear;
  
  if (title) {
    return year ? `${title} (${year})` : title;
  }
  
  // Fallback
  if ('baseName' in input) {
      // It is ParsedFilename
      return input.baseName;
  } else {
      // It is MovieFile
      const fName = input.fileName;
      const lastDot = fName.lastIndexOf('.');
      return lastDot !== -1 ? fName.substring(0, lastDot) : fName;
  }
}

/*
Examples:
1. "The.Godfather.1972.REMASTERED.BluRay.1080p.x264-GalaxyRG.mkv"
   -> Title: "The Godfather", Year: 1972, Confidence: 0.95

2. "Avatar.EXTENDED.CUT.UHD.4K.HDR.x265-TEAMHB.mkv"
   -> Title: "Avatar", Year: null, Confidence: 0.7

3. "Top.Gun.Maverick.2022.2160p.WEBRip.DDP5.1.Atmos.x265.mkv"
   -> Title: "Top Gun Maverick", Year: 2022, Confidence: 0.95
*/
