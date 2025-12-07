import { MovieFile } from '@/types';
import { MetadataService } from './MetadataService';
import { ILibraryService } from '../interfaces';

export interface MetadataQueueStats {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  running: boolean;
}

export class MetadataQueueService {
  private metadataService: MetadataService;
  private libraryService: ILibraryService;
  private queue: MovieFile[] = [];
  private stats: MetadataQueueStats = {
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    running: false
  };
  private listeners: ((stats: MetadataQueueStats) => void)[] = [];
  private options: { delayMs: number; concurrency: number };
  private activeWorkers = 0;
  private isPaused = false;

  constructor(
    metadataService: MetadataService, 
    libraryService: ILibraryService, 
    options: { delayMs?: number; concurrency?: number } = {}
  ) {
    this.metadataService = metadataService;
    this.libraryService = libraryService;
    this.options = {
      delayMs: options.delayMs || 200,
      concurrency: options.concurrency || 2
    };
  }

  enqueue(files: MovieFile[]): void {
    // Filter out duplicates already in queue AND files with manual metadata
    const newFiles = files.filter(f => 
      !this.queue.some(q => q.id === f.id) && 
      f.metadataSource !== 'manual'
    );
    
    if (newFiles.length === 0) return;

    this.queue.push(...newFiles);
    this.stats.total += newFiles.length;
    this.notifyListeners();

    if (!this.isPaused && this.stats.running) {
      this.processQueue();
    }
  }

  start(): void {
    this.isPaused = false;
    if (!this.stats.running) {
      this.stats.running = true;
      this.notifyListeners();
      this.processQueue();
    }
  }

  pause(): void {
    this.isPaused = true;
    this.stats.running = false;
    this.notifyListeners();
  }

  clear(): void {
    this.queue = [];
    this.stats = {
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      running: false
    };
    this.notifyListeners();
  }

  getStats(): MetadataQueueStats {
    return { ...this.stats };
  }

  onStatsChanged(listener: (stats: MetadataQueueStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l({ ...this.stats }));
  }

  private async processQueue() {
    if (this.isPaused || this.queue.length === 0 || this.activeWorkers >= this.options.concurrency) {
      if (this.queue.length === 0 && this.activeWorkers === 0) {
        this.stats.running = false;
        this.notifyListeners();
      }
      return;
    }

    this.activeWorkers++;
    const file = this.queue.shift();

    if (file) {
      // Double check manual override before processing
      if (file.metadataSource === 'manual') {
        this.stats.processed++; // Count as processed (skipped)
        this.notifyListeners();
        this.activeWorkers--;
        this.processQueue();
        return;
      }

      try {
        // Process file
        const metadata = await this.metadataService.findBestMatchForFile(file);
        
        if (metadata) {
          const updatedFile: MovieFile = { 
            ...file, 
            metadata,
            metadataSource: 'omdb' // Explicitly mark as OMDb source
          };
          await this.libraryService.addOrUpdateFiles([updatedFile]);
          this.stats.succeeded++;
        } else {
          this.stats.failed++;
        }
      } catch (error) {
        console.error(`Error processing metadata for file ${file.fileName}:`, error);
        this.stats.failed++;
      } finally {
        this.stats.processed++;
        this.notifyListeners();
        
        // Delay before next task
        await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
        
        this.activeWorkers--;
        this.processQueue();
      }
    } else {
      this.activeWorkers--;
    }
    
    // Try to spawn more workers if needed
    if (this.queue.length > 0 && this.activeWorkers < this.options.concurrency) {
      this.processQueue();
    }
  }
}
