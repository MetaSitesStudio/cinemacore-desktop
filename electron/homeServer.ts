import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const PORT = 17890;
let server: http.Server | null = null;
let currentPairingCode: string = '';
let pairingInterval: NodeJS.Timeout | null = null;

export function getCurrentPairingCode(): string {
  return currentPairingCode;
}

function isLanIp(ip: string | undefined): boolean {
  if (!ip) return false;
  if (ip === '::1') return true;
  if (ip === '127.0.0.1') return true;
  
  // IPv6 ULA (fc00::/7) - starts with fc or fd
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;
  
  const cleanIp = ip.replace(/^::ffff:/, '');
  const parts = cleanIp.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

function generatePairingCode() {
  currentPairingCode = crypto.randomInt(1000, 9999).toString();
  // In a real app, we would broadcast this or show it in UI
  // console.log('[HomeServer] New Pairing Code:', currentPairingCode);
}

export interface DeviceToken {
  token: string;
  createdAt: string;
  lastSeenAt: string;
  userAgent?: string;
  deviceName?: string;
}

export function getDeviceTokens(db: Database.Database): DeviceToken[] {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'remote_tokens'").get() as { value: string } | undefined;
    if (!row) return [];
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed)) return [];
    
    // Migration: if array of strings, convert to objects
    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      return parsed.map((t: string) => ({
        token: t,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        deviceName: 'Legacy Device'
      }));
    }
    return parsed;
  } catch {
    return [];
  }
}

function saveDeviceTokens(db: Database.Database, tokens: DeviceToken[]) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('remote_tokens', JSON.stringify(tokens));
}

export function revokeDevice(db: Database.Database, tokenPrefix: string) {
  const tokens = getDeviceTokens(db);
  const newTokens = tokens.filter(t => !t.token.startsWith(tokenPrefix));
  saveDeviceTokens(db, newTokens);
}

export function renameDevice(db: Database.Database, tokenPrefix: string, newName: string) {
  const tokens = getDeviceTokens(db);
  const device = tokens.find(t => t.token.startsWith(tokenPrefix));
  if (device) {
    device.deviceName = newName;
    saveDeviceTokens(db, tokens);
  }
}

export function revokeAllDevices(db: Database.Database) {
  saveDeviceTokens(db, []);
}

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    return (
      hostname === 'localhost' ||
      hostname === 'cinemacore.app' ||
      hostname.endsWith('.cinemacore.app') ||
      isLanIp(hostname)
    );
  } catch {
    return false;
  }
}

export function startHomeServer(db: Database.Database) {
  if (server) return;

  generatePairingCode();
  pairingInterval = setInterval(generatePairingCode, 60000);

  server = http.createServer(async (req, res) => {
    // CORS
    const origin = req.headers.origin;
    
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin!);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // LAN Check
    const remoteIp = req.socket.remoteAddress;
    if (!isLanIp(remoteIp)) {
      res.writeHead(403);
      res.end('Forbidden: LAN only');
      return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);

    // Public: Ping
    if (req.method === 'GET' && url.pathname === '/api/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, server: "cinemacore", version: 1 }));
      return;
    }

    // Public: Pair
    if (req.method === 'POST' && url.pathname === '/api/pair') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.code === currentPairingCode) {
            const token = crypto.randomBytes(32).toString('base64url');
            
            const newToken: DeviceToken = {
                token,
                createdAt: new Date().toISOString(),
                lastSeenAt: new Date().toISOString(),
                userAgent: req.headers['user-agent'],
                deviceName: data.deviceName || 'Unknown Device'
            };
            
            const tokens = getDeviceTokens(db);
            tokens.push(newToken);
            saveDeviceTokens(db, tokens);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid code' }));
          }
        } catch (e) {
          res.writeHead(400);
          res.end('Bad Request');
        }
      });
      return;
    }

    // Protected Routes
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (url.searchParams.has('token')) {
      token = url.searchParams.get('token') || '';
    }

    if (!token) {
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    const tokens = getDeviceTokens(db);
    const device = tokens.find(t => t.token === token);
    
    if (!device) {
      res.writeHead(403);
      res.end('Forbidden: Invalid Token');
      return;
    }

    // Update lastSeenAt
    device.lastSeenAt = new Date().toISOString();
    saveDeviceTokens(db, tokens);

    // GET /api/devices
    if (req.method === 'GET' && url.pathname === '/api/devices') {
        const safeList = tokens.map(t => ({
            id: t.token.substring(0, 8),
            createdAt: t.createdAt,
            lastSeenAt: t.lastSeenAt,
            userAgent: t.userAgent,
            deviceName: t.deviceName
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, devices: safeList }));
        return;
    }

    // POST /api/devices/revoke
    if (req.method === 'POST' && url.pathname === '/api/devices/revoke') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.token) {
                    // Allow revoking by full token (self-revoke) or prefix (if we supported it here, but let's stick to token for self)
                    // Actually, if I am authenticated, I can revoke myself.
                    // Or if I pass an ID?
                    // The prompt says "POST /api/devices/revoke with { token }".
                    // It implies revoking a specific token.
                    revokeDevice(db, data.token);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } else {
                    res.writeHead(400);
                    res.end('Missing token');
                }
            } catch {
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
        return;
    }

    // POST /api/devices/revoke-all
    if (req.method === 'POST' && url.pathname === '/api/devices/revoke-all') {
        revokeAllDevices(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    if (req.method === 'GET' && url.pathname === '/api/library') {
      try {
        const movies = db.prepare(`
          SELECT 
            id, 
            COALESCE(json_extract(metadata, '$.title'), guessedTitle, fileName) as title,
            COALESCE(json_extract(metadata, '$.year'), guessedYear) as year,
            COALESCE(tmdbPosterUrl, json_extract(metadata, '$.posterUrl')) as poster,
            json_extract(metadata, '$.genres') as genres,
            COALESCE(json_extract(metadata, '$.cast'), json_extract(metadata, '$.credits.cast')) as cast,
            'movie' as mediaType
          FROM movie_files
          WHERE isHidden = 0 AND (mediaType = 'movie' OR mediaType IS NULL)
          ORDER BY title ASC
        `).all().map((m: any) => ({
          ...m,
          genres: m.genres ? JSON.parse(m.genres) : [],
          cast: m.cast ? JSON.parse(m.cast) : []
        }));

        const series = db.prepare(`
          SELECT 
            MIN(id) as id,
            seriesTitle as title,
            MAX(COALESCE(tmdbPosterUrl, json_extract(metadata, '$.posterUrl'))) as poster,
            json_extract(metadata, '$.genres') as genres,
            COALESCE(json_extract(metadata, '$.cast'), json_extract(metadata, '$.credits.cast')) as cast,
            'series' as mediaType
          FROM movie_files
          WHERE isHidden = 0 AND mediaType = 'episode' AND seriesTitle IS NOT NULL
          GROUP BY seriesTitle
          ORDER BY seriesTitle ASC
        `).all().map((s: any) => ({
          ...s,
          genres: s.genres ? JSON.parse(s.genres) : [],
          cast: s.cast ? JSON.parse(s.cast) : []
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ movies, series }));
      } catch (e) {
        console.error("Library API error:", e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
      return;
    }

    // GET /api/series?title=...
    if (req.method === 'GET' && url.pathname === '/api/series') {
      const title = url.searchParams.get('title');
      if (!title) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing title parameter' }));
        return;
      }

      try {
        const episodes = db.prepare(`
          SELECT 
            id,
            seasonNumber as season,
            episodeNumber as episode,
            COALESCE(episodeTitle, json_extract(metadata, '$.title'), fileName) as title,
            COALESCE(tmdbPosterUrl, json_extract(metadata, '$.posterUrl')) as poster
          FROM movie_files
          WHERE isHidden = 0 AND mediaType = 'episode' AND seriesTitle = ?
          ORDER BY seasonNumber ASC, episodeNumber ASC
        `).all(title);

        // Get series poster from the first episode or aggregate
        const seriesInfo = db.prepare(`
          SELECT 
            seriesTitle as title,
            MAX(COALESCE(tmdbPosterUrl, json_extract(metadata, '$.posterUrl'))) as poster
          FROM movie_files
          WHERE isHidden = 0 AND mediaType = 'episode' AND seriesTitle = ?
          GROUP BY seriesTitle
        `).get(title);

        if (!seriesInfo) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Series not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...seriesInfo, episodes }));
      } catch (e) {
        console.error("Series API error:", e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
      return;
    }

    // GET /api/item/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/item/')) {
      const id = url.pathname.split('/').pop();
      if (!id) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
      }

      try {
        const row = db.prepare(`
          SELECT 
            id,
            mediaType,
            fileName,
            metadata,
            COALESCE(json_extract(metadata, '$.title'), guessedTitle, fileName) as title,
            COALESCE(tmdbPosterUrl, json_extract(metadata, '$.posterUrl')) as poster,
            COALESCE(json_extract(metadata, '$.year'), guessedYear) as year,
            seriesTitle,
            seasonNumber,
            episodeNumber
          FROM movie_files
          WHERE id = ? AND isHidden = 0
        `).get(id) as any;

        if (!row) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Item not found' }));
          return;
        }

        let parsedMetadata = null;
        try {
          if (row.metadata) parsedMetadata = JSON.parse(row.metadata);
        } catch {}

        const item = {
          ...row,
          metadata: parsedMetadata
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(item));
      } catch (e) {
        console.error("Item API error:", e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
      return;
    }

    // GET /api/trailer/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/trailer/')) {
      const id = url.pathname.split('/').pop();
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request' }));
        return;
      }

      try {
        const row = db.prepare("SELECT metadata, mediaType FROM movie_files WHERE id = ?").get(id) as any;
        if (!row) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Item not found' }));
          return;
        }

        const apiKeyRow = db.prepare("SELECT value FROM settings WHERE key = 'tmdbApiKey' OR key = 'TMDB_API_KEY'").get() as { value: string } | undefined;
        const apiKey = apiKeyRow?.value;

        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'TMDB key missing' }));
          return;
        }

        let metadata: any = {};
        try { metadata = JSON.parse(row.metadata); } catch {}
        
        const tmdbId = metadata.tmdbId || metadata.id || (metadata.tmdb && metadata.tmdb.id);
        
        if (!tmdbId) {
           res.writeHead(404, { 'Content-Type': 'application/json' });
           res.end(JSON.stringify({ ok: false, error: 'NO_TMDB_ID' }));
           return;
        }

        if (row.mediaType === 'episode') {
             res.writeHead(200, { 'Content-Type': 'application/json' });
             res.end(JSON.stringify({ ok: false, error: 'EPISODES_NOT_SUPPORTED' }));
             return;
        }

        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${apiKey}`;
        const tmdbRes = await fetch(tmdbUrl);
        
        if (!tmdbRes.ok) {
             res.writeHead(tmdbRes.status, { 'Content-Type': 'application/json' });
             res.end(JSON.stringify({ ok: false, error: 'TMDB_ERROR' }));
             return;
        }

        const data = await tmdbRes.json();
        const results = data.results || [];
        const youtubeVideos = results.filter((v: any) => v.site === 'YouTube');
        
        if (youtubeVideos.length === 0) {
             res.writeHead(200, { 'Content-Type': 'application/json' });
             res.end(JSON.stringify({ ok: false, error: 'NO_TRAILER' }));
             return;
        }

        const best = youtubeVideos.sort((a: any, b: any) => {
            const typeScore = (v: any) => v.type === 'Trailer' ? 2 : (v.type === 'Teaser' ? 1 : 0);
            const officialScore = (v: any) => v.official ? 1 : 0;
            return (typeScore(b) * 10 + officialScore(b)) - (typeScore(a) * 10 + officialScore(a));
        })[0];

        if (best) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, youtubeKey: best.key, name: best.name }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'NO_TRAILER' }));
        }

      } catch (e) {
        console.error("Trailer API error:", e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
      return;
    }

    // GET /api/stream/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/stream/')) {
      const id = url.pathname.split('/').pop();
      if (!id) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
      }

      try {
        const row = db.prepare("SELECT filePath FROM movie_files WHERE id = ? AND isHidden = 0").get(id) as { filePath: string } | undefined;
        if (!row || !row.filePath) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        const filePath = row.filePath;
        if (!fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end('File not found on disk');
          return;
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'video/mp4';
        if (ext === '.mkv') contentType = 'video/x-matroska';
        if (ext === '.avi') contentType = 'video/x-msvideo';
        if (ext === '.mov') contentType = 'video/quicktime';
        if (ext === '.webm') contentType = 'video/webm';

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const file = fs.createReadStream(filePath, { start, end });
          const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
          };
          res.writeHead(206, head);
          file.pipe(res);
        } else {
          const head = {
            'Content-Length': fileSize,
            'Content-Type': contentType,
          };
          res.writeHead(200, head);
          fs.createReadStream(filePath).pipe(res);
        }
      } catch (e) {
        console.error("Stream error:", e);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HomeServer] Listening on 0.0.0.0:${PORT}`);
  });
}

export function stopHomeServer() {
  if (pairingInterval) clearInterval(pairingInterval);
  if (server) {
    server.close();
    server = null;
  }
}
