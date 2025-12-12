import { ScanJob, MovieFile, PlaybackSettings, LibraryFolder, DuplicateGroup, SearchMediaRequest, MediaSearchResult } from './types';

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
    saveSetting: (key: string, value: string) => Promise<void>;
    getSetting: (key: string) => Promise<string | null>;
  };
  library: {
    getFolders: () => Promise<LibraryFolder[]>;
    addFolder: () => Promise<LibraryFolder[] | null>;
    removeFolder: (folderId: string, deleteFiles: boolean) => Promise<LibraryFolder[]>;
    rescanFolder: (folderId: string) => Promise<{ new: number; updated: number; removed: number }>;
    reset: () => Promise<void>;
    getDuplicates: () => Promise<DuplicateGroup[]>;
    removeFile: (fileId: string) => Promise<void>;
    searchMedia: (payload: SearchMediaRequest) => Promise<MediaSearchResult[]>;
  };
  deleteFile: (filePath: string) => Promise<boolean>;
  db: {
    getAllFiles(): Promise<any[]>;
    upsertFile(file: any): Promise<void>;
    hideFile(id: string): Promise<void>;
    toggleFavorite(id: string): Promise<void>;
  };
  onScanProgress: (callback: (event: any, payload: any) => void) => () => void;
  ping: () => void;
}

declare global {
  interface Window {
    cinemacore: IElectronAPI;
  }
}
