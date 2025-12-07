import { ILibraryService } from '../interfaces';
import { MovieFile } from '@/types';

export class MockLibraryService implements ILibraryService {
  private files: MovieFile[] = [];

  async addOrUpdateFiles(files: MovieFile[]): Promise<void> {
    files.forEach(incomingFile => {
      // Try to find existing file by path (primary key) or ID
      const existingIndex = this.files.findIndex(f => 
        f.fullPath === incomingFile.fullPath || f.id === incomingFile.id
      );

      if (existingIndex >= 0) {
        const existingFile = this.files[existingIndex];
        
        // If existing file is hidden, do NOT update it and do NOT unhide it
        if (existingFile.isHidden) {
          return;
        }

        // Merge: keep user preferences (favorite/hidden), update other fields
        this.files[existingIndex] = {
          ...incomingFile,
          id: existingFile.id, // Keep original ID if matched by path
          isFavorite: existingFile.isFavorite,
          isHidden: existingFile.isHidden
        };
      } else {
        // New file: initialize user preferences
        this.files.push({
          ...incomingFile,
          isFavorite: false,
          isHidden: false
        });
      }
    });
  }

  async linkFileToMovie(fileId: string, movieId: string): Promise<void> {
    const file = this.files.find(f => f.id === fileId);
    if (file) {
      file.linkedMovieId = movieId;
    }
  }

  async getFilesForMovie(movieId: string): Promise<MovieFile[]> {
    return this.files.filter(f => f.linkedMovieId === movieId && !f.isHidden);
  }

  async getAllFiles(): Promise<MovieFile[]> {
    // Return all files, caller can filter by isHidden if needed, 
    // but typically we want to show only visible ones in the main list.
    // However, for debugging or "Show Hidden" features, we might want all.
    // The requirement says "Default view: Only show MovieFiles where file.isHidden !== true."
    // So we'll return all here and let the UI filter, OR filter here.
    // Let's return all so the service is transparent, but the UI will filter.
    return [...this.files];
  }

  async hideFile(id: string): Promise<void> {
    const file = this.files.find(f => f.id === id);
    if (file) {
      file.isHidden = true;
    }
  }

  async toggleFavorite(id: string, value?: boolean): Promise<void> {
    const file = this.files.find(f => f.id === id);
    if (file) {
      file.isFavorite = value !== undefined ? value : !file.isFavorite;
    }
  }

  async getFileByPath(path: string): Promise<MovieFile | null> {
    return this.files.find(f => f.fullPath === path) || null;
  }

  async deleteFileFromDisk(file: MovieFile): Promise<boolean> {
    if (typeof window === "undefined" || !window.cinemacore?.deleteFile) {
      // Not running in Electron; no disk deletion possible.
      console.warn("deleteFileFromDisk called but not in Electron environment.");
      return false;
    }
  
    const success = await window.cinemacore.deleteFile(file.fullPath);
    if (success) {
      // Also hide/remove from library so it doesn't show up again.
      await this.hideFile(file.id);
    }
    return success;
  }
}
