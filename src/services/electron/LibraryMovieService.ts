import { IMovieService, ILibraryService } from '../interfaces';
import { Movie } from '@/types';

export class LibraryMovieService implements IMovieService {
  constructor(private libraryService: ILibraryService) {}

  async getAllMovies(): Promise<Movie[]> {
    const files = await this.libraryService.getAllFiles();
    
    // DEBUG: Log the first few files to see what's coming from the DB
    if (files.length > 0) {
      console.log('[LibraryMovieService] First 3 files from DB:', files.slice(0, 3).map(f => ({
        title: f.fileName,
        tmdbPosterUrl: f.tmdbPosterUrl,
        metadataPoster: f.metadata?.posterUrl
      })));
    }

    return files
      .filter(f => (f.mediaType === 'movie' || !f.mediaType) && !f.isHidden)
      .map(f => ({
        id: f.id,
        title: f.metadata?.title || f.guessedTitle || f.fileName,
        year: f.metadata?.year || f.guessedYear || 0,
        description: f.metadata?.plot || '',
        // Map DB columns to Movie fields
        posterUrl: f.metadata?.posterUrl || '',
        backdropUrl: '', // Legacy field, usually empty
        tmdbPosterUrl: f.tmdbPosterUrl || undefined,
        tmdbBackdropUrl: f.tmdbBackdropUrl || undefined,
        rating: parseFloat(f.metadata?.rating || '0') || 0,
        runtime: f.metadata?.runtimeMinutes || 0,
        genres: f.metadata?.genres || [],
        isWatched: false // Not tracked yet
      }));
  }

  async getMovieById(id: string): Promise<Movie | undefined> {
    const movies = await this.getAllMovies();
    return movies.find(m => m.id === id);
  }

  async getFeaturedMovie(): Promise<Movie> {
    const movies = await this.getAllMovies();
    if (movies.length === 0) {
      // Return a placeholder if no movies
      return {
        id: 'placeholder',
        title: 'No Movies Found',
        year: new Date().getFullYear(),
        description: 'Scan your library to see movies here.',
        posterUrl: '',
        backdropUrl: '',
        rating: 0,
        runtime: 0,
        genres: []
      };
    }
    // Return random movie
    return movies[Math.floor(Math.random() * movies.length)];
  }

  async getRecentMovies(): Promise<Movie[]> {
    const movies = await this.getAllMovies();
    // Sort by ID or creation date if available (using ID as proxy for now or just reverse)
    return movies.slice(0, 10);
  }

  async getContinueWatching(): Promise<Movie[]> {
    // Not implemented yet
    return [];
  }

  async getMoviesByGenre(genre: string): Promise<Movie[]> {
    const movies = await this.getAllMovies();
    return movies.filter(m => m.genres.includes(genre)).slice(0, 10);
  }
}
