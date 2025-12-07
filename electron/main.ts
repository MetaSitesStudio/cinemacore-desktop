import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import Database from 'better-sqlite3';
import { pathToFileURL } from 'url';
import { parseMovieFilename } from '../src/utils/filenameParser';
import { ScanJob, MovieFile, PlaybackSettings } from '../src/types';

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
    CREATE TABLE IF NOT EXISTS movie_files (
      id TEXT PRIMARY KEY,
      fullPath TEXT UNIQUE,
      fileName TEXT,
      fileSizeBytes INTEGER,
      extension TEXT,
      createdAt TEXT,
      modifiedAt TEXT,
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
      linkedMovieId TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();
}

// --- Helper Functions ---

async function deleteFileToTrash(filePath: string): Promise<boolean> {
  try {
    if (shell && shell.trashItem) {
      await shell.trashItem(filePath);
    } else {
      // Fallback: unlink (permanent delete) – but only if really necessary
      await fs.promises.unlink(filePath);
    }
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

ipcMain.handle("cinemacore:db:upsertFile", (_event, file: MovieFile) => {
  if (!db) return;
  
  const stmt = db.prepare(`
    INSERT INTO movie_files (
      id, fullPath, fileName, fileSizeBytes, extension, createdAt, modifiedAt,
      videoResolution, mediaType, seriesTitle, seasonNumber, episodeNumber, episodeTitle,
      guessedTitle, guessedYear, parsingConfidence,
      isFavorite, isHidden, metadata, metadataSource, linkedMovieId
    ) VALUES (
      @id, @fullPath, @fileName, @fileSizeBytes, @extension, @createdAt, @modifiedAt,
      @videoResolution, @mediaType, @seriesTitle, @seasonNumber, @episodeNumber, @episodeTitle,
      @guessedTitle, @guessedYear, @parsingConfidence,
      @isFavorite, @isHidden, @metadata, @metadataSource, @linkedMovieId
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
      linkedMovieId=excluded.linkedMovieId
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
    linkedMovieId: file.linkedMovieId ?? null
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
