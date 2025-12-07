import { Movie, Series, MovieFile, ScanJob } from '@/types';

export interface IMovieService {
  getFeaturedMovie(): Promise<Movie>;
  getRecentMovies(): Promise<Movie[]>;
  getContinueWatching(): Promise<Movie[]>;
  getMoviesByGenre(genre: string): Promise<Movie[]>;
  getMovieById(id: string): Promise<Movie | undefined>;
  getAllMovies(): Promise<Movie[]>;
}

export interface ISeriesService {
  getFeaturedSeries(): Promise<Series>;
  getRecentSeries(): Promise<Series[]>;
  getAllSeries(): Promise<Series[]>;
  getSeriesById(id: string): Promise<Series | undefined>;
}

export interface IFileScannerService {
  startScan(input: { paths: string[] }): Promise<ScanJob>;
  getScanJob(jobId: string): Promise<ScanJob | null>;
  getScanResults(jobId: string): Promise<MovieFile[]>;
}

export interface ILibraryService {
  addOrUpdateFiles(files: MovieFile[]): Promise<void>;
  linkFileToMovie(fileId: string, movieId: string): Promise<void>;
  getFilesForMovie(movieId: string): Promise<MovieFile[]>;
  getAllFiles(): Promise<MovieFile[]>;
  
  // User actions
  hideFile(id: string): Promise<void>;
  toggleFavorite(id: string, value?: boolean): Promise<void>;
  getFileByPath(path: string): Promise<MovieFile | null>;
  deleteFileFromDisk(file: MovieFile): Promise<boolean>;
}
