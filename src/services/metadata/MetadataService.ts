import { MovieFile } from '@/types';
import { OmdbClient } from '../omdb/OmdbClient';

export interface MetadataResult {
  title: string;
  year: number | null;
  plot: string | null;
  posterUrl: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  imdbId: string | null;
  rating: string | null;
}

export class MetadataService {
  private omdbClient: OmdbClient;

  constructor(omdbClient: OmdbClient) {
    this.omdbClient = omdbClient;
  }

  async findBestMatchForFile(movieFile: MovieFile): Promise<MetadataResult | null> {
    // Handle Episodes
    if (movieFile.mediaType === 'episode' && movieFile.seriesTitle && movieFile.seasonNumber != null && movieFile.episodeNumber != null) {
      const result = await this.omdbClient.getEpisodeBySeriesAndNumber(
        movieFile.seriesTitle,
        movieFile.seasonNumber,
        movieFile.episodeNumber
      );

      if (result) {
        return this.mapOmdbResult(result);
      }
      // Fallback: if episode fetch fails, maybe try searching as a movie? 
      // Or just return null. For now, return null.
      return null;
    }

    // Handle Movies
    if (!movieFile.guessedTitle) {
      return null;
    }

    const result = await this.omdbClient.searchByTitleAndYear(
      movieFile.guessedTitle,
      movieFile.guessedYear || undefined
    );

    if (!result) {
      return null;
    }

    return this.mapOmdbResult(result);
  }

  private mapOmdbResult(result: any): MetadataResult {
    // Parse runtime "148 min" -> 148
    let runtime = 0;
    if (result.Runtime && result.Runtime !== 'N/A') {
      runtime = parseInt(result.Runtime.split(' ')[0], 10) || 0;
    }

    // Parse year "2010" -> 2010
    let year = 0;
    if (result.Year) {
      year = parseInt(result.Year.substring(0, 4), 10) || 0;
    }

    return {
      title: result.Title,
      year: year || null,
      plot: result.Plot !== 'N/A' ? result.Plot : null,
      posterUrl: result.Poster !== 'N/A' ? result.Poster : null,
      genres: result.Genre ? result.Genre.split(',').map((g: string) => g.trim()) : [],
      runtimeMinutes: runtime || null,
      imdbId: result.imdbID || null,
      rating: result.Rated !== 'N/A' ? result.Rated : null
    };
  }
}
