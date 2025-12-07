import { ScanJob, MovieFile, PlaybackSettings } from './types';

export interface IElectronAPI {
  fileScanner: {
    startScan: (paths: string[]) => Promise<ScanJob>;
    getScanJob: (jobId: string) => Promise<ScanJob | null>;
    getScanResults: (jobId: string) => Promise<MovieFile[]>;
  };
  dialog: {
    chooseFolders: () => Promise<string[]>;
  };
  media: {
    selectCustomPlayer: () => Promise<{ canceled: boolean; path?: string; label?: string }>;
    playWithSystemDefault: (filePath: string) => Promise<void>;
    playWithCustomPlayer: (playerPath: string, filePath: string) => Promise<void>;
  };
  settings: {
    getPlaybackSettings: () => Promise<PlaybackSettings>;
    savePlaybackSettings: (settings: PlaybackSettings) => Promise<void>;
  };
  deleteFile: (filePath: string) => Promise<boolean>;
  db: {
    getAllFiles(): Promise<any[]>;
    upsertFile(file: any): Promise<void>;
    hideFile(id: string): Promise<void>;
    toggleFavorite(id: string): Promise<void>;
  };
  ping: () => void;
}

declare global {
  interface Window {
    cinemacore: IElectronAPI;
  }
}
