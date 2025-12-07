import { IMovieService } from '../interfaces';
import { Movie } from '@/types';
import { MOCK_MOVIES } from './mockData';

export class MockMovieService implements IMovieService {
  async getFeaturedMovie(): Promise<Movie> {
    // Return a random movie as featured
    return MOCK_MOVIES[0];
  }

  async getRecentMovies(): Promise<Movie[]> {
    return MOCK_MOVIES.slice(0, 5);
  }

  async getContinueWatching(): Promise<Movie[]> {
    return MOCK_MOVIES.filter(m => m.isWatched).slice(0, 5);
  }

  async getMoviesByGenre(genre: string): Promise<Movie[]> {
    return MOCK_MOVIES.filter(m => m.genres.includes(genre));
  }

  async getMovieById(id: string): Promise<Movie | undefined> {
    return MOCK_MOVIES.find(m => m.id === id);
  }

  async getAllMovies(): Promise<Movie[]> {
    return MOCK_MOVIES;
  }
}
