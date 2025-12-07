import { ISeriesService } from '../interfaces';
import { Series } from '@/types';
import { MOCK_SERIES } from './mockSeriesData';

export class MockSeriesService implements ISeriesService {
  async getFeaturedSeries(): Promise<Series> {
    return MOCK_SERIES[0];
  }

  async getRecentSeries(): Promise<Series[]> {
    return MOCK_SERIES;
  }

  async getAllSeries(): Promise<Series[]> {
    return MOCK_SERIES;
  }

  async getSeriesById(id: string): Promise<Series | undefined> {
    return MOCK_SERIES.find(s => s.id === id);
  }
}
