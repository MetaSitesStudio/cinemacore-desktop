export interface OmdbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Poster: string;
  Plot: string;
  Genre: string;
  Runtime: string;
  Rated: string;
  Ratings: Array<{ Source: string; Value: string }>;
  Response: string;
  Error?: string;
}

export interface OmdbMovieDetail extends OmdbSearchResult {}
export interface OmdbEpisodeDetail extends OmdbSearchResult {}

export class OmdbClient {
  private apiKey: string;
  private baseUrl = 'https://www.omdbapi.com/';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getEpisodeBySeriesAndNumber(seriesTitle: string, season: number, episode: number): Promise<OmdbEpisodeDetail | null> {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        t: seriesTitle,
        Season: season.toString(),
        Episode: episode.toString(),
        plot: 'full'
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      const data: OmdbEpisodeDetail = await response.json();

      if (data.Response === 'False') {
        console.warn('OMDb API Error (Episode):', data.Error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('OMDb Request Failed (Episode):', error);
      return null;
    }
  }

  async searchByTitleAndYear(title: string, year?: number): Promise<OmdbSearchResult | null> {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        t: title,
        plot: 'full'
      });

      if (year) {
        params.append('y', year.toString());
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      const data: OmdbSearchResult = await response.json();

      if (data.Response === 'False') {
        console.warn('OMDb API Error:', data.Error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('OMDb Request Failed:', error);
      return null;
    }
  }

  async getByImdbId(imdbId: string): Promise<OmdbMovieDetail | null> {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        i: imdbId,
        plot: 'full'
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      const data: OmdbMovieDetail = await response.json();

      if (data.Response === 'False') {
        return null;
      }

      return data;
    } catch (error) {
      console.error('OMDb Request Failed:', error);
      return null;
    }
  }
}
