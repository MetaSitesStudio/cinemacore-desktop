import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import Database from 'better-sqlite3';
import { pathToFileURL } from 'url';
import { parseMovieFilename } from '../src/utils/filenameParser';
import { ScanJob, MovieFile, PlaybackSettings, LibraryFolder, DuplicateGroup } from '../src/types';
import { fetchTmdbArtworkForImdbId } from './services/tmdbArtworkService';
import { fetchTmdbMetadata } from './services/tmdbMetadataService';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

// --- Database Setup ---
function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'library.db');
  console.log('Initializing database at:', dbPath);
  
  db = new Database(dbPath);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create tables
  db.prepare(`
    CREATE TABLE IF NOT EXISTS library_folders (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE,
      displayName TEXT,
      createdAt TEXT,
      isActive INTEGER DEFAULT 1
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS movie_files (
      id TEXT PRIMARY KEY,
      fullPath TEXT UNIQUE,
      fileName TEXT,
      fileSizeBytes INTEGER,
      extension TEXT,
      createdAt TEXT,
      modifiedAt TEXT,
      lastSeenAt TEXT,
      folderId TEXT,
      videoResolution TEXT,
      mediaType TEXT,
      seriesTitle TEXT,
      seasonNumber INTEGER,
      episodeNumber INTEGER,
      episodeTitle TEXT,
      guessedTitle TEXT,
      guessedYear INTEGER,
      parsingConfidence REAL,
      isFavorite INTEGER DEFAULT 0,
      isHidden INTEGER DEFAULT 0,
      metadata JSON,
      metadataSource TEXT,
      linkedMovieId TEXT,
      tmdbBackdropUrl TEXT,
      tmdbPosterUrl TEXT,
      FOREIGN KEY(folderId) REFERENCES library_folders(id)
    )
  `).run();

  // Migration: Add columns if they don't exist (for existing DBs)
  try {
    db.prepare("ALTER TABLE movie_files ADD COLUMN folderId TEXT REFERENCES library_folders(id)").run();
  } catch (e) { /* ignore if exists */ }
  try {
    db.prepare("ALTER TABLE movie_files ADD COLUMN lastSeenAt TEXT").run();
  } catch (e) { /* ignore if exists */ }
  try {
    db.prepare("ALTER TABLE movie_files ADD COLUMN tmdbBackdropUrl TEXT").run();
  } catch (e) { /* ignore if exists */ }
  try {
    db.prepare("ALTER TABLE movie_files ADD COLUMN tmdbPosterUrl TEXT").run();
  } catch (e) { /* ignore if exists */ }
  try {
    db.prepare("ALTER TABLE movie_files ADD COLUMN metadata JSON").run();
  } catch (e) { /* ignore if exists */ }
  try {
    db.prepare("ALTER TABLE movie_files ADD COLUMN metadataSource TEXT").run();
  } catch (e) { /* ignore if exists */ }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();
}

// --- Helper Functions ---

export { getTmdbApiKey };

function getTmdbApiKey(): string | undefined {
  if (!db) return undefined;
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'tmdbApiKey'").get() as { value: string } | undefined;
    return row?.value;
  } catch (e) {
    console.error("Error reading TMDB API key:", e);
    return undefined;
  }
}

function getOmdbApiKey(): string | undefined {
  if (!db) return undefined;
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'omdbApiKey'").get() as { value: string } | undefined;
    return row?.value;
  } catch (e) {
    console.error("Error reading OMDb API key:", e);
    return undefined;
  }
}

async function fetchOmdb(title: string, year: string | undefined, apiKey: string) {
  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      t: title,
      y: year || '',
      plot: 'short'
    });
    const response = await net.fetch(`https://www.omdbapi.com/?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json() as any;
    if (data.Response === 'False') return null;

    // Ensure Poster is extracted
    const posterUrl = data.Poster && data.Poster !== "N/A" ? data.Poster : null;
    
    return {
      ...data,
      posterUrl // Explicitly add this field for easier access
    };
  } catch (e) {
    console.error("OMDb fetch failed:", e);
    return null;
  }
}

async function deleteFileToTrash(filePath: string): Promise<boolean> {
  try {
    console.log(`Attempting to delete file: ${filePath}`);
    
    // Check if file exists first
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch (e) {
      console.error(`File not found: ${filePath}`);
      return false;
    }

    if (shell && shell.trashItem) {
      try {
        await shell.trashItem(filePath);
        console.log(`Successfully moved to trash: ${filePath}`);
        return true;
      } catch (trashErr) {
        console.warn(`shell.trashItem failed for ${filePath}, trying fs.unlink. Error:`, trashErr);
      }
    }

    // Fallback: unlink (permanent delete)
    await fs.promises.unlink(filePath);
    console.log(`Successfully permanently deleted: ${filePath}`);
    return true;
  } catch (err) {
    console.error("Failed to delete file:", filePath, err);
    return false;
  }
}

// --- Scanning Logic ---

const scanJobs = new Map<string, ScanJob>();
const scanResults = new Map<string, MovieFile[]>();

const MIN_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const ALLOWED_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v'];

async function scanDirectory(dirPath: string, jobId: string): Promise<void> {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, jobId);
      } else if (entry.isFile()) {
        const job = scanJobs.get(jobId);
        if (!job) return; // Job cancelled or missing

        // Increment total scanned count (all files seen)
        job.totalFilesFound = (job.totalFilesFound || 0) + 1;
        scanJobs.set(jobId, job);

        const ext = path.extname(entry.name).toLowerCase();
        
        // Filter by extension
        if (ALLOWED_EXTENSIONS.includes(ext)) {
          const stats = await fs.promises.stat(fullPath);

          // Filter by size
          if (stats.size >= MIN_FILE_SIZE_BYTES) {
            // Parse filename
            const parsed = parseMovieFilename(entry.name);

            const movieFile: MovieFile = {
              id: Math.random().toString(36).substr(2, 9), // Simple ID generation
              fullPath: fullPath,
              fileName: entry.name,
              fileSizeBytes: stats.size,
              extension: ext,
              createdAt: stats.birthtime.toISOString(),
              modifiedAt: stats.mtime.toISOString(),
              // videoResolution: "Unknown", // We'd need ffprobe for this
              guessedTitle: parsed.guessedTitle || undefined,
              guessedYear: parsed.guessedYear || undefined,
              parsingConfidence: parsed.confidence,
              mediaType: parsed.mediaType,
              seriesTitle: parsed.seriesTitle,
              seasonNumber: parsed.seasonNumber,
              episodeNumber: parsed.episodeNumber
            };

            // Update results
            const currentResults = scanResults.get(jobId) || [];
            currentResults.push(movieFile);
            scanResults.set(jobId, currentResults);

            // Update job status - kept files
            job.totalFilesKept = (job.totalFilesKept || 0) + 1;
            scanJobs.set(jobId, job);
          }
        }
        
        // Update processed count (we processed this file, whether kept or not)
        job.filesProcessed = (job.filesProcessed || 0) + 1;
        scanJobs.set(jobId, job);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    // We could add error logging to the job here
  }
}

// --- IPC Handlers ---

ipcMain.handle('cinemacore:startScan', async (event, paths: string[]) => {
  const jobId = Math.random().toString(36).substr(2, 9);
  const newJob: ScanJob = {
    id: jobId,
    status: 'running',
    startedAt: new Date().toISOString(),
    totalFilesFound: 0,
    totalFilesKept: 0,
    filesProcessed: 0
  };

  scanJobs.set(jobId, newJob);
  scanResults.set(jobId, []);

  // Start scanning in background
  (async () => {
    for (const dirPath of paths) {
      await scanDirectory(dirPath, jobId);
    }
    
    const job = scanJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
      scanJobs.set(jobId, job);
    }
  })();

  return newJob;
});

ipcMain.handle('cinemacore:getScanJob', async (event, jobId: string) => {
  return scanJobs.get(jobId) || null;
});

ipcMain.handle('cinemacore:getScanResults', async (event, jobId: string) => {
  return scanResults.get(jobId) || [];
});

ipcMain.handle('cinemacore:chooseFolders', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections']
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("cinemacore:deleteFile", async (_event, filePath: string) => {
  return await deleteFileToTrash(filePath);
});

// --- Database IPC Handlers ---

ipcMain.handle("cinemacore:db:getAllFiles", () => {
  if (!db) return [];
  const rows = db.prepare("SELECT * FROM movie_files WHERE isHidden = 0").all();
  return rows.map((row: any) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    isFavorite: Boolean(row.isFavorite),
    isHidden: Boolean(row.isHidden)
  }));
});

ipcMain.handle("cinemacore:db:upsertFile", async (_event, file: MovieFile) => {
  if (!db) return;

  // Check for path collision with a different ID
  try {
    const existing = db.prepare("SELECT id FROM movie_files WHERE fullPath = ?").get(file.fullPath) as { id: string } | undefined;
    if (existing && existing.id !== file.id) {
      console.warn(`Upsert collision: Path ${file.fullPath} already exists for ID ${existing.id}, but tried to upsert with ID ${file.id}. Using existing ID.`);
      file.id = existing.id;
    }
  } catch (e) {
    console.error("Error checking for existing file:", e);
  }

  // TMDB Artwork Fetching
  if (file.metadata && file.metadata.imdbId) {
    const apiKey = getTmdbApiKey();
    if (apiKey) {
      const { backdropUrl, posterUrl } = await fetchTmdbArtworkForImdbId(file.metadata.imdbId, apiKey);
      if (backdropUrl) file.tmdbBackdropUrl = backdropUrl;
      if (posterUrl) file.tmdbPosterUrl = posterUrl;
    } else {
      console.warn("Skipping TMDB artwork fetch: No API key configured.");
    }
  }

  // console.log('[SCAN] writing metadata', {
  //   fullPath: file.fullPath,
  //   title: file.metadata?.title,
  //   imdbId: file.metadata?.imdbId,
  //   posterUrl: file.metadata?.posterUrl,
  //   tmdbPosterUrl: file.tmdbPosterUrl,
  //   tmdbBackdropUrl: file.tmdbBackdropUrl,
  // });
  
  const stmt = db.prepare(`
    INSERT INTO movie_files (
      id, fullPath, fileName, fileSizeBytes, extension, createdAt, modifiedAt,
      videoResolution, mediaType, seriesTitle, seasonNumber, episodeNumber, episodeTitle,
      guessedTitle, guessedYear, parsingConfidence,
      isFavorite, isHidden, metadata, metadataSource, linkedMovieId,
      tmdbBackdropUrl, tmdbPosterUrl
    ) VALUES (
      @id, @fullPath, @fileName, @fileSizeBytes, @extension, @createdAt, @modifiedAt,
      @videoResolution, @mediaType, @seriesTitle, @seasonNumber, @episodeNumber, @episodeTitle,
      @guessedTitle, @guessedYear, @parsingConfidence,
      @isFavorite, @isHidden, @metadata, @metadataSource, @linkedMovieId,
      @tmdbBackdropUrl, @tmdbPosterUrl
    )
    ON CONFLICT(id) DO UPDATE SET
      fullPath=excluded.fullPath,
      fileName=excluded.fileName,
      fileSizeBytes=excluded.fileSizeBytes,
      extension=excluded.extension,
      createdAt=excluded.createdAt,
      modifiedAt=excluded.modifiedAt,
      videoResolution=excluded.videoResolution,
      mediaType=excluded.mediaType,
      seriesTitle=excluded.seriesTitle,
      seasonNumber=excluded.seasonNumber,
      episodeNumber=excluded.episodeNumber,
      episodeTitle=excluded.episodeTitle,
      guessedTitle=excluded.guessedTitle,
      guessedYear=excluded.guessedYear,
      parsingConfidence=excluded.parsingConfidence,
      metadata=excluded.metadata,
      metadataSource=excluded.metadataSource,
      linkedMovieId=excluded.linkedMovieId,
      tmdbBackdropUrl=COALESCE(excluded.tmdbBackdropUrl, movie_files.tmdbBackdropUrl),
      tmdbPosterUrl=COALESCE(excluded.tmdbPosterUrl, movie_files.tmdbPosterUrl)
  `);

  stmt.run({
    id: file.id,
    fullPath: file.fullPath,
    fileName: file.fileName,
    fileSizeBytes: file.fileSizeBytes ?? null,
    extension: file.extension ?? null,
    createdAt: file.createdAt ?? null,
    modifiedAt: file.modifiedAt ?? null,
    videoResolution: file.videoResolution ?? null,
    mediaType: file.mediaType ?? null,
    seriesTitle: file.seriesTitle ?? null,
    seasonNumber: file.seasonNumber ?? null,
    episodeNumber: file.episodeNumber ?? null,
    episodeTitle: file.episodeTitle ?? null,
    guessedTitle: file.guessedTitle ?? null,
    guessedYear: file.guessedYear ?? null,
    parsingConfidence: file.parsingConfidence ?? null,
    isFavorite: file.isFavorite ? 1 : 0,
    isHidden: file.isHidden ? 1 : 0,
    metadata: file.metadata ? JSON.stringify(file.metadata) : null,
    metadataSource: file.metadataSource ?? null,
    linkedMovieId: file.linkedMovieId ?? null,
    tmdbBackdropUrl: file.tmdbBackdropUrl ?? null,
    tmdbPosterUrl: file.tmdbPosterUrl ?? null
  });
});

ipcMain.handle("cinemacore:db:hideFile", (_event, id: string) => {
  if (!db) return;
  db.prepare("UPDATE movie_files SET isHidden = 1 WHERE id = ?").run(id);
});

ipcMain.handle("cinemacore:db:toggleFavorite", (_event, id: string) => {
  if (!db) return;
  db.prepare("UPDATE movie_files SET isFavorite = 1 - isFavorite WHERE id = ?").run(id);
});

// --- Player & Settings IPC Handlers ---

ipcMain.handle("cinemacore:selectCustomPlayer", async () => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose your media player",
    properties: ["openFile"],
    filters: process.platform === "win32"
      ? [{ name: "Executables", extensions: ["exe"] }]
      : undefined,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const fullPath = result.filePaths[0];
  const label = path.basename(fullPath);

  return {
    canceled: false,
    path: fullPath,
    label,
  };
});

ipcMain.handle("cinemacore:playWithSystemDefaultPlayer", async (_event, filePath: string) => {
  const result = await shell.openPath(filePath);
  if (result) {
    console.error("Failed to open system default player:", result);
    throw new Error(result);
  }
});

ipcMain.handle("cinemacore:playWithCustomPlayer", async (_event, playerPath: string, filePath: string) => {
  try {
    const child = spawn(playerPath, [filePath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (err) {
    console.error("Failed to start custom player", err);
    throw err;
  }
});

ipcMain.handle("cinemacore:getPlaybackSettings", () => {
  if (!db) return { playbackMode: "systemDefault", customPlayerPath: null, customPlayerLabel: null };
  
  const row = db.prepare("SELECT value FROM settings WHERE key = 'playbackSettings'").get() as { value: string } | undefined;
  if (row) {
    return JSON.parse(row.value);
  }
  return { playbackMode: "systemDefault", customPlayerPath: null, customPlayerLabel: null };
});

ipcMain.handle("cinemacore:savePlaybackSettings", (_event, settings: PlaybackSettings) => {
  if (!db) return;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('playbackSettings', ?)").run(JSON.stringify(settings));
});

ipcMain.handle("cinemacore:saveSetting", (_event, key: string, value: string) => {
  if (!db) return;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
});

ipcMain.handle("cinemacore:getSetting", (_event, key: string) => {
  if (!db) return null;
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? row.value : null;
});

// --- Library Management IPC Handlers ---

ipcMain.handle("cinemacore:library:getFolders", () => {
  if (!db) return [];
  return db.prepare("SELECT * FROM library_folders ORDER BY createdAt DESC").all();
});

ipcMain.handle("cinemacore:library:reset", () => {
  if (!db) return;
  db.prepare("DELETE FROM movie_files").run();
  // We keep the folders so the user doesn't have to re-add them
  console.log("[Library] Database cleared (files only).");
});

ipcMain.handle("cinemacore:library:addFolder", async () => {
  if (!mainWindow || !db) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const folderPath = result.filePaths[0];
  const id = Math.random().toString(36).substr(2, 9);
  const displayName = path.basename(folderPath);
  const createdAt = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO library_folders (id, path, displayName, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(id, folderPath, displayName, createdAt);
    
    return db.prepare("SELECT * FROM library_folders ORDER BY createdAt DESC").all();
  } catch (err) {
    console.error("Failed to add library folder:", err);
    throw err;
  }
});

ipcMain.handle("cinemacore:library:removeFolder", (_event, folderId: string, deleteFiles: boolean) => {
  if (!db) return;
  
  const deleteFolder = db.transaction(() => {
    if (deleteFiles) {
      db!.prepare("DELETE FROM movie_files WHERE folderId = ?").run(folderId);
    }
    db!.prepare("DELETE FROM library_folders WHERE id = ?").run(folderId);
  });

  deleteFolder();
  return db.prepare("SELECT * FROM library_folders ORDER BY createdAt DESC").all();
});

async function scanFolderRecursive(
  dirPath: string, 
  folderId: string, 
  foundFiles: Map<string, { path: string, size: number, mtime: Date }>,
  onProgress?: (filePath: string) => void
) {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await scanFolderRecursive(fullPath, folderId, foundFiles, onProgress);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        const stats = await fs.promises.stat(fullPath);
        if (stats.size >= MIN_FILE_SIZE_BYTES) {
          foundFiles.set(fullPath, { path: fullPath, size: stats.size, mtime: stats.mtime });
          onProgress?.(fullPath);
        }
      }
    }
  }
}

ipcMain.handle("cinemacore:library:rescanFolder", async (_event, folderId: string) => {
  if (!db) return { new: 0, updated: 0, removed: 0 };

  const sendProgress = (payload: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("cinemacore:library:scanProgress", payload);
    }
  };

  const folder = db.prepare("SELECT path FROM library_folders WHERE id = ?").get(folderId) as { path: string } | undefined;
  if (!folder) throw new Error("Folder not found");

  sendProgress({ type: 'start' });
  sendProgress({ type: 'log', message: `Scanning folder: ${folder.path}` });

  const foundFiles = new Map<string, { path: string, size: number, mtime: Date }>();
  try {
    await scanFolderRecursive(folder.path, folderId, foundFiles, (filePath) => {
      sendProgress({ type: 'file', filePath });
    });
  } catch (err) {
    console.error("Error scanning folder:", err);
    sendProgress({ type: 'error', message: `Error scanning folder: ${err}` });
  }

  sendProgress({ type: 'log', message: `Found ${foundFiles.size} files. Preparing database update...` });

  const existingFiles = db.prepare("SELECT * FROM movie_files WHERE folderId = ?").all(folderId) as MovieFile[];
  const existingMap = new Map(existingFiles.map(f => [f.fullPath, f]));
  
  // Check global existence to avoid re-fetching metadata for moved files
  const checkGlobalStmt = db.prepare("SELECT * FROM movie_files WHERE fullPath = ?");

  const filesToUpsert: any[] = [];
  const now = new Date().toISOString();
  
  const omdbKey = getOmdbApiKey();
  const tmdbKey = getTmdbApiKey();

  if (!tmdbKey) {
    sendProgress({ type: 'log', message: 'WARNING: TMDB API Key is missing! Metadata (Cast, Crew, Genres) will not be fetched.' });
  } else {
    sendProgress({ type: 'log', message: 'TMDB API Key found. Fetching rich metadata...' });
  }

  // 1. Prepare Data (Async Phase)
  let processedCount = 0;
  for (const [filePath, stats] of foundFiles) {
    processedCount++;
    if (processedCount % 5 === 0) {
       sendProgress({ type: 'log', message: `Processing metadata ${processedCount}/${foundFiles.size}...` });
    }

    const existing = existingMap.get(filePath);
    
    if (existing) {
      // Existing in this folder
      let metadataStr = existing.metadata as unknown as string | null;
      let tmdbBackdropUrl = existing.tmdbBackdropUrl;
      let tmdbPosterUrl = existing.tmdbPosterUrl;
      let metadataSource = existing.metadataSource;

      // Parse existing metadata to check for imdbID
      let currentMeta: any = null;
      try {
        if (metadataStr && metadataStr !== 'null') currentMeta = JSON.parse(metadataStr);
      } catch (e) {}

      // FORCE UPDATE: If we have an IMDB ID but no TMDB artwork, try to fetch it
      if (currentMeta?.imdbID && tmdbKey && (!tmdbPosterUrl || !tmdbBackdropUrl)) {
          console.log(`[Scan] Fetching missing TMDB artwork for ${existing.fileName} (IMDb: ${currentMeta.imdbID})`);
          try {
             const artwork = await fetchTmdbArtworkForImdbId(currentMeta.imdbID, tmdbKey);
             if (artwork.backdropUrl) tmdbBackdropUrl = artwork.backdropUrl;
             if (artwork.posterUrl) tmdbPosterUrl = artwork.posterUrl;
          } catch (e) {
             console.warn(`[Scan] Failed to backfill TMDB for ${existing.fileName}`, e);
          }
      }

      // Backfill metadata if missing
      if ((!metadataStr || metadataStr === 'null')) {
          const parsed = parseMovieFilename(path.basename(filePath));
          if (parsed.guessedTitle) {
            // Try TMDB First
            if (tmdbKey) {
               try {
                 const mediaType = parsed.mediaType === 'episode' ? 'tv' : 'movie';
                 const tmdbData = await fetchTmdbMetadata(parsed.guessedTitle, parsed.guessedYear ?? undefined, mediaType, tmdbKey);
                 if (tmdbData) {
                   metadataStr = JSON.stringify(tmdbData);
                   metadataSource = 'tmdb';
                   tmdbPosterUrl = tmdbData.posterUrl;
                   tmdbBackdropUrl = tmdbData.backdropUrl;
                   console.log(`[Scan] Backfilled TMDB metadata for ${parsed.guessedTitle}`);
                 }
               } catch (e) { /* ignore */ }
            }

            // Fallback to OMDb
            if ((!metadataStr || metadataStr === 'null') && omdbKey) {
                try {
                    const omdbData = await fetchOmdb(parsed.guessedTitle, parsed.guessedYear?.toString(), omdbKey);
                    if (omdbData) {
                        metadataStr = JSON.stringify(omdbData);
                        metadataSource = 'omdb';
                        if (tmdbKey && omdbData.imdbID) {
                            const artwork = await fetchTmdbArtworkForImdbId(omdbData.imdbID, tmdbKey);
                            if (artwork.backdropUrl) tmdbBackdropUrl = artwork.backdropUrl;
                            if (artwork.posterUrl) tmdbPosterUrl = artwork.posterUrl;
                        }
                        console.log(`[Scan] Backfilled OMDb metadata for ${parsed.guessedTitle}`);
                    }
                } catch (e) { /* ignore */ }
            }
          }
      }

      console.log('[SCAN][SERIES] artwork', {
        title: existing.fileName,
        imdbId: currentMeta?.imdbID,
        tmdbPosterUrl,
        tmdbBackdropUrl,
      });

      filesToUpsert.push({
        ...existing,
        lastSeenAt: now,
        fileSizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        metadata: metadataStr,
        metadataSource,
        tmdbBackdropUrl,
        tmdbPosterUrl
      });
    } else {
      // Not in this folder. Check global.
      const globalMatch = checkGlobalStmt.get(filePath) as MovieFile | undefined;
      
      if (globalMatch) {
        // Moved file (exists globally). Update folderId and timestamps.
        filesToUpsert.push({
          ...globalMatch,
          fullPath: filePath,
          folderId: folderId,
          lastSeenAt: now,
          fileSizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          isGlobalUpdate: true
        });
      } else {
        // Truly New File
        const parsed = parseMovieFilename(path.basename(filePath));
        let metadata: any = null;
        let tmdbBackdropUrl: string | null = null;
        let tmdbPosterUrl: string | null = null;
        let metadataSource: string | null = null;

        // Fetch Metadata
        // Priority: TMDB -> OMDb
        if (parsed.guessedTitle) {
          // Try TMDB First if key exists
          if (tmdbKey) {
             try {
               const mediaType = parsed.mediaType === 'episode' ? 'tv' : 'movie';
                 const tmdbData = await fetchTmdbMetadata(parsed.guessedTitle, parsed.guessedYear ?? undefined, mediaType, tmdbKey);               if (tmdbData) {
                 metadata = tmdbData;
                 metadataSource = 'tmdb';
                 tmdbPosterUrl = tmdbData.posterUrl;
                 tmdbBackdropUrl = tmdbData.backdropUrl;
                 console.log(`[Scan] Fetched full TMDB metadata for ${parsed.guessedTitle}`);
               }
             } catch (e) {
               console.warn(`[Scan] TMDB fetch failed for ${parsed.guessedTitle}`, e);
             }
          }

          // Fallback to OMDb if no metadata yet
          if (!metadata && omdbKey) {
            try {
               const omdbData = await fetchOmdb(parsed.guessedTitle, parsed.guessedYear?.toString(), omdbKey);
               if (omdbData) {
                 metadata = omdbData;
                 metadataSource = 'omdb';
                 
                 // Fetch TMDB Artwork if we have IMDb ID
                 if (tmdbKey && omdbData.imdbID) {
                   const artwork = await fetchTmdbArtworkForImdbId(omdbData.imdbID, tmdbKey);
                   if (artwork.backdropUrl) tmdbBackdropUrl = artwork.backdropUrl;
                   if (artwork.posterUrl) tmdbPosterUrl = artwork.posterUrl;
                 }
               }
            } catch (e) {
              console.warn(`Metadata fetch failed for ${parsed.guessedTitle}:`, e);
            }
          }
        }

        console.log('[SCAN][SERIES] artwork', {
          title: parsed.guessedTitle,
          imdbId: metadata?.imdbID,
          tmdbPosterUrl,
          tmdbBackdropUrl,
        });

        filesToUpsert.push({
          id: Math.random().toString(36).substr(2, 9),
          fullPath: filePath,
          fileName: path.basename(filePath),
          fileSizeBytes: stats.size,
          extension: path.extname(filePath).toLowerCase(),
          createdAt: new Date().toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          lastSeenAt: now,
          folderId: folderId,
          guessedTitle: parsed.guessedTitle,
          guessedYear: parsed.guessedYear,
          parsingConfidence: parsed.confidence,
          mediaType: parsed.mediaType,
          seriesTitle: parsed.seriesTitle,
          seasonNumber: parsed.seasonNumber,
          episodeNumber: parsed.episodeNumber,
          metadata: metadata ? JSON.stringify(metadata) : null,
          metadataSource,
          tmdbBackdropUrl,
          tmdbPosterUrl
        });
        
        if (metadata) {
            console.log(`[Scan] Fetched metadata for ${parsed.guessedTitle}`, { tmdbBackdropUrl, tmdbPosterUrl });
        }
      }
    }
  }

  sendProgress({ type: 'log', message: `Updating database with ${filesToUpsert.length} records...` });

  // 2. Write to DB (Sync Transaction)
  // We use ON CONFLICT(fullPath) to handle both updates and inserts safely
  const upsertStmt = db.prepare(`
    INSERT INTO movie_files (
      id, fullPath, fileName, fileSizeBytes, extension, createdAt, modifiedAt, lastSeenAt, folderId,
      guessedTitle, guessedYear, parsingConfidence, mediaType, seriesTitle, seasonNumber, episodeNumber,
      metadata, metadataSource, tmdbBackdropUrl, tmdbPosterUrl
    ) VALUES (
      @id, @fullPath, @fileName, @fileSizeBytes, @extension, @createdAt, @modifiedAt, @lastSeenAt, @folderId,
      @guessedTitle, @guessedYear, @parsingConfidence, @mediaType, @seriesTitle, @seasonNumber, @episodeNumber,
      @metadata, @metadataSource, @tmdbBackdropUrl, @tmdbPosterUrl
    )
    ON CONFLICT(fullPath) DO UPDATE SET
      lastSeenAt=excluded.lastSeenAt,
      fileSizeBytes=excluded.fileSizeBytes,
      modifiedAt=excluded.modifiedAt,
      folderId=excluded.folderId,
      metadata=excluded.metadata,
      metadataSource=excluded.metadataSource,
      tmdbBackdropUrl=excluded.tmdbBackdropUrl,
      tmdbPosterUrl=excluded.tmdbPosterUrl
  `);

  let numNew = 0;
  let numUpdated = 0;
  let numRemoved = 0;

  const transaction = db.transaction(() => {
    for (const file of filesToUpsert) {
      try {
        // Ensure all params are present (even if null)
        upsertStmt.run({
            id: file.id,
            fullPath: file.fullPath,
            fileName: file.fileName || path.basename(file.fullPath),
            fileSizeBytes: file.fileSizeBytes,
            extension: file.extension || path.extname(file.fullPath),
            createdAt: file.createdAt || now,
            modifiedAt: file.modifiedAt || now,
            lastSeenAt: file.lastSeenAt,
            folderId: file.folderId,
            guessedTitle: file.guessedTitle || null,
            guessedYear: file.guessedYear || null,
            parsingConfidence: file.parsingConfidence || null,
            mediaType: file.mediaType || null,
            seriesTitle: file.seriesTitle || null,
            seasonNumber: file.seasonNumber || null,
            episodeNumber: file.episodeNumber || null,
            metadata: file.metadata || null,
            metadataSource: file.metadataSource || null,
            tmdbBackdropUrl: file.tmdbBackdropUrl || null,
            tmdbPosterUrl: file.tmdbPosterUrl || null
        });
        
        if (file.isGlobalUpdate || existingMap.has(file.fullPath)) {
            numUpdated++;
        } else {
            numNew++;
        }
      } catch (e) {
        console.error(`Failed to upsert ${file.fullPath}:`, e);
      }
    }

    // Delete missing files (only from this folder)
    // We need to know which files were in this folder but NOT in the scan
    // existingMap initially contained all files in folder.
    // We didn't remove from existingMap in the loop above (unlike previous version).
    // So we need to check which ones were NOT processed.
    
    const processedPaths = new Set(filesToUpsert.map(f => f.fullPath));
    const deleteStmt = db!.prepare("DELETE FROM movie_files WHERE id = ?");
    
    for (const [path, file] of existingMap) {
        if (!processedPaths.has(path)) {
            deleteStmt.run(file.id);
            numRemoved++;
        }
    }
  });

  transaction();

  sendProgress({ type: 'log', message: `Scan complete. New: ${numNew}, Updated: ${numUpdated}, Removed: ${numRemoved}` });
  sendProgress({ type: 'done' });

  return { new: numNew, updated: numUpdated, removed: numRemoved };
});

ipcMain.handle("cinemacore:library:getDuplicates", () => {
  if (!db) return [];
  
  // Find duplicates by (normalized filename, size)
  // We use lower(fileName) as a simple normalization
  const duplicates = db.prepare(`
    SELECT lower(fileName) as normalizedName, fileSizeBytes, COUNT(*) as count
    FROM movie_files
    WHERE isHidden = 0
    GROUP BY lower(fileName), fileSizeBytes
    HAVING count > 1
  `).all() as { normalizedName: string, fileSizeBytes: number }[];

  const result: DuplicateGroup[] = [];

  for (const dup of duplicates) {
    const files = db.prepare(`
      SELECT * FROM movie_files 
      WHERE lower(fileName) = ? AND fileSizeBytes = ? AND isHidden = 0
    `).all(dup.normalizedName, dup.fileSizeBytes) as MovieFile[];
    
    result.push({
      normalizedName: dup.normalizedName,
      fileSize: dup.fileSizeBytes,
      files: files.map(f => ({
        ...f,
        metadata: f.metadata ? JSON.parse(f.metadata as any) : undefined,
        isFavorite: Boolean(f.isFavorite),
        isHidden: Boolean(f.isHidden)
      }))
    });
  }

  return result;
});

ipcMain.handle("cinemacore:library:searchMedia", async (_, payload: any) => {
  if (!db) throw new Error("Database not initialized");
  
  const { query, mediaType, yearFrom, yearTo, folderId, limit = 200 } = payload;
  
  // Note: We use json_extract for metadata fields. 
  // Ensure your SQLite version supports ->> operator or use json_extract(metadata, '$.field')
  let sql = `
    SELECT 
      id, mediaType, 
      COALESCE(json_extract(metadata, '$.title'), guessedTitle, fileName) as title,
      seriesTitle, seasonNumber, episodeNumber,
      COALESCE(json_extract(metadata, '$.year'), guessedYear) as year,
      json_extract(metadata, '$.posterUrl') as posterUrl,
      json_extract(metadata, '$.rating') as rating,
      folderId, fullPath as filePath
    FROM movie_files
    WHERE isHidden = 0
  `;
  
  const params: any[] = [];
  
  if (query && query.trim().length > 0) {
    const likeQuery = `%${query.trim()}%`;
    sql += ` AND (
      title LIKE ? OR 
      seriesTitle LIKE ? OR 
      episodeTitle LIKE ? OR
      fileName LIKE ?
    )`;
    params.push(likeQuery, likeQuery, likeQuery, likeQuery);
  }
  
  if (mediaType === 'movie') {
    sql += ` AND (mediaType = 'movie' OR mediaType IS NULL)`;
  } else if (mediaType === 'series') {
    sql += ` AND mediaType = 'episode'`;
  }
  
  if (yearFrom) {
    sql += ` AND year >= ?`;
    params.push(yearFrom);
  }
  
  if (yearTo) {
    sql += ` AND year <= ?`;
    params.push(yearTo);
  }
  
  if (folderId) {
    sql += ` AND folderId = ?`;
    params.push(folderId);
  }
  
  // Ordering
  if (mediaType === 'series') {
    sql += ` ORDER BY seriesTitle ASC, seasonNumber ASC, episodeNumber ASC`;
  } else {
    sql += ` ORDER BY year DESC, title ASC`;
  }
  
  sql += ` LIMIT ?`;
  params.push(limit);
  
  try {
    const results = db.prepare(sql).all(...params);
    return results;
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
});

ipcMain.handle("cinemacore:library:removeFile", (_event, fileId: string) => {
  if (!db) return;
  db.prepare("DELETE FROM movie_files WHERE id = ?").run(fileId);
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Check if we are in development mode
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
};

app.on('ready', () => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
