import { IMovieService, ILibraryService } from '../interfaces';
import { Movie } from '@/types';

export class LibraryMovieService implements IMovieService {
  constructor(private libraryService: ILibraryService) {}

  async getAllMovies(): Promise<Movie[]> {
    const files = await this.libraryService.getAllFiles();
    
    const movies = files
      .filter(f => (f.mediaType === 'movie' || !f.mediaType) && !f.isHidden);

    console.log(`[LibraryMovieService] getAllMovies: Found ${files.length} total files, returning ${movies.length} movies.`);
    
    if (movies.length > 0) {
        console.log('[LibraryMovieService] First movie metadata:', movies[0].metadata);
    }

    return movies.map(f => ({
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
        // @ts-ignore
        cast: f.metadata?.cast || [],
        // @ts-ignore
        director: f.metadata?.crew?.find((c: any) => c.job === 'Director')?.name,
        isWatched: false, // Not tracked yet
        fullPath: f.fullPath,
        isFavorite: f.isFavorite,
        isHidden: f.isHidden
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

    // Prefer movies with a backdrop
    const moviesWithBackdrop = movies.filter(m => m.tmdbBackdropUrl || m.backdropUrl);
    
    if (moviesWithBackdrop.length > 0) {
        return moviesWithBackdrop[Math.floor(Math.random() * moviesWithBackdrop.length)];
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
