import { IFileScannerService } from '../interfaces';
import { ScanJob, MovieFile } from '@/types';

export class ElectronFileScannerService implements IFileScannerService {
  async startScan(input: { paths: string[] }): Promise<ScanJob> {
    return window.cinemacore.fileScanner.startScan(input.paths);
  }

  async getScanJob(jobId: string): Promise<ScanJob | null> {
    return window.cinemacore.fileScanner.getScanJob(jobId);
  }

  async getScanResults(jobId: string): Promise<MovieFile[]> {
    return window.cinemacore.fileScanner.getScanResults(jobId);
  }
}
