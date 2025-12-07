import { IFileScannerService } from '../interfaces';
import { ScanJob, MovieFile } from '@/types';
import { parseMovieFilename } from '@/utils/filenameParser';

export class MockFileScannerService implements IFileScannerService {
  private jobs: ScanJob[] = [];

  async startScan(input: { paths: string[] }): Promise<ScanJob> {
    console.log('Starting scan for paths:', input.paths);
    const newJob: ScanJob = {
      id: Math.random().toString(36).substr(2, 9),
      status: 'running',
      totalFilesFound: 0,
      totalFilesKept: 0,
      filesProcessed: 0,
      startedAt: new Date().toISOString(),
    };
    this.jobs.push(newJob);
    
    // Simulate scanning process
    this.simulateScan(newJob.id);
    
    return newJob;
  }

  async getScanJob(jobId: string): Promise<ScanJob | null> {
    return this.jobs.find(j => j.id === jobId) || null;
  }

  async getScanResults(jobId: string): Promise<MovieFile[]> {
    console.log('Getting results for job:', jobId);
    
    const mockFiles = [
      {
        id: "file-1",
        fullPath: "C:\\Movies\\Inception.2010.1080p.BluRay.x264.mkv",
        fileName: "Inception.2010.1080p.BluRay.x264.mkv",
        fileSizeBytes: 2500000000,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        extension: ".mkv",
        videoResolution: "1080p"
      },
      {
        id: "file-2",
        fullPath: "C:\\Movies\\The.Dark.Knight.2008.REMASTERED.4K.HDR.mkv",
        fileName: "The.Dark.Knight.2008.REMASTERED.4K.HDR.mkv",
        fileSizeBytes: 3000000000,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        extension: ".mkv",
        videoResolution: "4K"
      },
      {
        id: "file-3",
        fullPath: "C:\\Movies\\Avatar.EXTENDED.CUT.UHD.4K.HDR.x265-TEAMHB.mkv",
        fileName: "Avatar.EXTENDED.CUT.UHD.4K.HDR.x265-TEAMHB.mkv",
        fileSizeBytes: 4500000000,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        extension: ".mkv",
        videoResolution: "4K"
      }
    ];

    return mockFiles.map(file => {
      const parsed = parseMovieFilename(file.fileName);
      return {
        ...file,
        guessedTitle: parsed.guessedTitle || undefined,
        guessedYear: parsed.guessedYear || undefined,
        parsingConfidence: parsed.confidence
      };
    });
  }

  private simulateScan(jobId: string) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;

    job.status = 'running';
    job.totalFilesFound = 10;
    job.totalFilesKept = 3;
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      job.filesProcessed = Math.floor(progress / 10);
      
      if (progress >= 100) {
        job.status = 'completed';
        job.finishedAt = new Date().toISOString();
        clearInterval(interval);
      }
    }, 500);
  }
}
