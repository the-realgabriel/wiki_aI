import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ollama from 'ollama';

const PORT = parseInt(process.env.PORT || '4173', 10);
const HOST = process.env.HOST || '0.0.0.0';
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:3000';
const OLLAMA_TARGET = process.env.OLLAMA_TARGET || 'http://127.0.0.1:11434';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, 'dist');
const STORAGE_DIR = path.resolve(__dirname, 'storage');
const META_DIR = path.resolve(__dirname, 'data');
const META_FILE = path.resolve(META_DIR, 'storage-meta.json');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
};

const ROUTES = [
  { prefix: '/auth', target: API_TARGET },
  { prefix: '/rest', target: API_TARGET },
  { prefix: '/health', target: API_TARGET },
  { prefix: '/realtime', target: API_TARGET },
  { prefix: '/ollama', target: OLLAMA_TARGET, stripPrefix: true },
];

// --- Local Storage ---

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initStorage() {
  ensureDir(STORAGE_DIR);
  ensureDir(META_DIR);
  if (!fs.existsSync(META_FILE)) {
    fs.writeFileSync(META_FILE, '[]');
  }
}

let metaCache = null;
let metaCacheDirty = false;

function readMeta() {
  if (metaCache && !metaCacheDirty) return metaCache;
  try {
    metaCache = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    metaCacheDirty = false;
    return metaCache;
  } catch {
    metaCache = [];
    metaCacheDirty = false;
    return metaCache;
  }
}

function writeMeta(meta) {
  metaCache = meta;
  metaCacheDirty = true;
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  metaCacheDirty = false;
}

function writeMetaAsync(meta) {
  metaCache = meta;
  metaCacheDirty = false;
  return fsp.writeFile(META_FILE, JSON.stringify(meta, null, 2)).catch(() => {});
}

function safePath(filePath) {
  const cleaned = filePath.replace(/\.\./g, '').replaceAll('/', path.sep).replaceAll('\\', path.sep);
  if (cleaned.includes('..')) return null;
  return cleaned;
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(body, contentType) {
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) throw new Error('No boundary found in Content-Type');
  const boundary = boundaryMatch[1].trim();
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];

  let pos = 0;
  while (pos < body.length) {
    const startIdx = body.indexOf(delimiter, pos);
    if (startIdx === -1) break;

    const afterDelim = startIdx + delimiter.length;
    if (body[afterDelim] === 45 && body[afterDelim + 1] === 45) break;

    let partStart = afterDelim;
    if (body[partStart] === 13) partStart += 2;

    const nextBoundary = body.indexOf(Buffer.from('\r\n--'), partStart);
    if (nextBoundary === -1) break;

    const partContent = body.slice(partStart, nextBoundary);
    const headerEnd = partContent.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) { pos = nextBoundary + 2; continue; }

    const headersRaw = partContent.slice(0, headerEnd).toString('utf8');
    const bodyBuf = partContent.slice(headerEnd + 4);
    const nameMatch = headersRaw.match(/name="([^"]*)"/);
    const filenameMatch = headersRaw.match(/filename="([^"]*)"/);

    parts.push({
      name: nameMatch ? nameMatch[1] : null,
      filename: filenameMatch ? filenameMatch[1] : null,
      body: bodyBuf,
    });

    pos = nextBoundary + 2;
  }

  return parts;
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

const ROUTE_META = {
  '/': { title: 'Dashboard — Dataphyte Wiki', description: 'Dashboard overview with recent pages and uploaded files.' },
  '/files': { title: 'Files — Dataphyte Wiki', description: 'Browse and manage uploaded files.' },
  '/knowledge-base': { title: 'Knowledge Base — Dataphyte Wiki', description: 'Wiki pages and uploaded documents.' },
  '/search': { title: 'Search — Dataphyte Wiki', description: 'Search the knowledge base with semantic and keyword modes.' },
  '/calendar': { title: 'Calendar — Dataphyte Wiki', description: 'Calendar view with upcoming events.' },
  '/login': { title: 'Login — Dataphyte Wiki', description: 'Sign in to your account.' },
  '/signup': { title: 'Sign Up — Dataphyte Wiki', description: 'Create a new account.' },
  '/admin': { title: 'Admin — Dataphyte Wiki', description: 'Admin panel for user and file management.' },
};

function getMetaForUrl(url) {
  const u = new URL(url, 'http://localhost');
  const path = u.pathname;

  if (path.startsWith('/file/')) {
    const filename = decodeURIComponent(path.replace('/file/', ''));
    return { title: `${filename} — Dataphyte Wiki`, description: `View file: ${filename}` };
  }
  if (path.startsWith('/knowledge-base/')) {
    const slug = decodeURIComponent(path.replace('/knowledge-base/', ''));
    return { title: `${slug} — Dataphyte Wiki`, description: `Wiki page: ${slug}` };
  }

  const exact = ROUTE_META[path];
  if (exact) return exact;

  return { title: 'Dataphyte Wiki', description: 'AI-powered knowledge base with smart search, file management, and team collaboration.' };
}

function injectMeta(html, url) {
  const meta = getMetaForUrl(url);

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Dataphyte Wiki',
    url: `http://localhost:${PORT}`,
    description: meta.description,
  });

  return html
    .replace('<title>Dataphyte Wiki</title>', `<title>${meta.title}</title>`)
    .replace(
      '<meta name="description" content="VoxWiki',
      `<meta name="description" content="${meta.description}" />\n    <meta name="robots" content="index, follow" />\n    <meta name="twitter:card" content="summary" />\n    <meta property="og:title" content="${meta.title}" />\n    <meta property="og:description" content="${meta.description}" />\n    <meta property="og:url" content="http://localhost:${PORT}${new URL(url, 'http://localhost').pathname}" />\n    <script type="application/ld+json">${jsonld}</script>\n    <link rel="canonical" href="http://localhost:${PORT}${new URL(url, 'http://localhost').pathname}" />\n    <meta name="description" content="VoxWiki`
    );
}

function sendJson(res, status, data) {
  const raw = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    ...securityHeaders(),
  });
  res.end(raw);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.csv', '.json', '.xml', '.yaml', '.yml',
  '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.htm',
  '.sh', '.bat', '.ps1', '.env', '.cfg', '.ini', '.log',
  '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.h',
  '.sql', '.r', '.m', '.swift', '.kt', '.toml',
]);

function isTextFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

// --- Wiki Pages (local JSON storage) ---

const PAGES_FILE = path.resolve(META_DIR, 'pages.json');

function initPages() {
  if (!fs.existsSync(PAGES_FILE)) {
    fs.writeFileSync(PAGES_FILE, '[]');
  }
}

function readPages() {
  try {
    return JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writePages(pages) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2));
}

function handlePagesList(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const order = url.searchParams.get('order') || 'title.asc';
  const limit = parseInt(url.searchParams.get('limit'), 10) || 0;

  let pages = readPages();

  if (order === 'title.asc') {
    pages.sort((a, b) => a.title.localeCompare(b.title));
  } else if (order === 'title.desc') {
    pages.sort((a, b) => b.title.localeCompare(a.title));
  } else if (order === 'created_at.desc') {
    pages.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  } else if (order === 'created_at.asc') {
    pages.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  }

  if (limit > 0) {
    pages = pages.slice(0, limit);
  }

  sendJson(res, 200, pages);
}

function handlePagesGet(req, res) {
  const slug = decodeURIComponent(req.url.replace('/api/pages/', '').split('?')[0]);
  const pages = readPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) return sendError(res, 404, 'Page not found');
  sendJson(res, 200, page);
}

function handlePagesSearch(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const pages = readPages();
  const results = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q))
  );
  sendJson(res, 200, results);
}

async function handlePagesCreate(req, res) {
  try {
    const body = JSON.parse((await collectBody(req)).toString());
    if (!body.slug || !body.title) return sendError(res, 400, 'slug and title are required');

    const pages = readPages();
    if (pages.some((p) => p.slug === body.slug)) return sendError(res, 409, 'Page with this slug already exists');

    const page = {
      slug: body.slug,
      title: body.title,
      content: body.content || '',
      tags: body.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    pages.push(page);
    writePages(pages);
    sendJson(res, 201, page);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

async function handlePagesUpdate(req, res) {
  try {
    const slug = decodeURIComponent(req.url.replace('/api/pages/', '').split('?')[0]);
    const body = JSON.parse((await collectBody(req)).toString());
    const pages = readPages();
    const idx = pages.findIndex((p) => p.slug === slug);
    if (idx === -1) return sendError(res, 404, 'Page not found');

    pages[idx] = {
      ...pages[idx],
      ...body,
      slug: pages[idx].slug, // prevent slug change
      updated_at: new Date().toISOString(),
    };
    writePages(pages);
    sendJson(res, 200, pages[idx]);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

function handlePagesDelete(req, res) {
  const slug = decodeURIComponent(req.url.replace('/api/pages/', '').split('?')[0]);
  const pages = readPages();
  const idx = pages.findIndex((p) => p.slug === slug);
  if (idx === -1) return sendError(res, 404, 'Page not found');
  pages.splice(idx, 1);
  writePages(pages);
  sendJson(res, 200, { success: true });
}

// --- File Search (replaces Supabase wiki_files table) ---

async function handleFilesSearch(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    const meta = readMeta();
    const results = [];

    for (const entry of meta) {
      const storagePath = path.join(STORAGE_DIR, entry.path);
      let content = '';
      try {
        if (isTextFile(entry.name)) {
          content = await fsp.readFile(storagePath, 'utf8');
        }
      } catch {
        // skip unreadable files
      }
      results.push({
        path: entry.path,
        name: entry.name,
        content,
      });
    }

    if (q) {
      const filtered = results.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.content.toLowerCase().includes(q)
      );
      return sendJson(res, 200, filtered);
    }

    sendJson(res, 200, results);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

// --- Calendar Events ---

const EVENTS_FILE = path.resolve(META_DIR, 'events.json');

function initEvents() {
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '[]');
  }
}

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function handleEventsList(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const order = url.searchParams.get('order') || 'date.asc';
  let events = readEvents();

  if (order === 'date.asc') {
    events.sort((a, b) => a.date.localeCompare(b.date));
  } else if (order === 'date.desc') {
    events.sort((a, b) => b.date.localeCompare(a.date));
  }

  sendJson(res, 200, events);
}

async function handleEventsCreate(req, res) {
  try {
    const body = JSON.parse((await collectBody(req)).toString());
    if (!body.date || !body.title) return sendError(res, 400, 'date and title are required');

    const events = readEvents();
    const event = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: body.date,
      title: body.title,
      type: body.type || 'meeting',
      description: body.description || '',
    };
    events.push(event);
    writeEvents(events);
    sendJson(res, 201, event);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

// --- Upload ---

async function handleStorageUpload(req, res) {
  try {
    const body = await collectBody(req);
    const contentType = req.headers['content-type'] || '';
    const parts = parseMultipart(body, contentType);
    const filePart = parts.find((p) => p.name === 'file');

    if (!filePart || !filePart.filename) {
      return sendError(res, 400, 'No file provided');
    }

    const filename = filePart.filename;
    const relPath = safePath(filename);
    if (!relPath) return sendError(res, 400, 'Invalid file path');

    const storagePath = path.join(STORAGE_DIR, relPath);
    ensureDir(path.dirname(storagePath));
    await fsp.writeFile(storagePath, filePart.body);

    const now = new Date().toISOString();
    const meta = readMeta();
    const existing = meta.findIndex((m) => m.path === relPath);
    const entry = {
      name: path.basename(relPath),
      type: 'file',
      path: relPath,
      uploaded_at: now,
    };

    if (existing >= 0) {
      meta[existing] = { ...meta[existing], ...entry };
    } else {
      meta.push(entry);
    }
    await writeMetaAsync(meta);

    sendJson(res, 200, { success: true, file: entry });
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

// --- Browse (flat list with metadata from filesystem) ---

async function handleStorageBrowse(req, res) {
  try {
    const meta = readMeta();
    const results = [];

    for (const entry of meta) {
      const storagePath = path.join(STORAGE_DIR, entry.path);
      try {
        const stat = await fsp.stat(storagePath);
        const ext = path.extname(entry.name).toLowerCase();
        results.push({
          name: entry.name,
          path: entry.path,
          size: stat.size,
          uploaded_at: entry.uploaded_at || stat.birthtime.toISOString(),
          modified_at: stat.mtime.toISOString(),
          type: ext,
          mime: MIME[ext] || 'application/octet-stream',
          category: getFileCategory(ext),
          isText: isTextFile(entry.name),
        });
      } catch {
        // File missing from disk — skip
      }
    }

    results.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    sendJson(res, 200, results);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

function getFileCategory(ext) {
  const image = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
  const code = ['.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.htm', '.json', '.xml', '.yaml', '.yml', '.sh', '.bat', '.ps1', '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.h', '.sql', '.r', '.swift', '.kt', '.toml', '.env', '.cfg', '.ini', '.log'];
  const doc = ['.md', '.txt', '.csv', '.pdf', '.docx', '.xlsx', '.pptx', '.rtf', '.odt', '.ods', '.odp'];
  const audio = ['.mp3', '.ogg', '.wav', '.flac', '.aac', '.wma'];
  const video = ['.mp4', '.webm', '.avi', '.mov', '.mkv'];

  if (image.includes(ext)) return 'image';
  if (code.includes(ext)) return 'code';
  if (doc.includes(ext)) return 'document';
  if (audio.includes(ext)) return 'audio';
  if (video.includes(ext)) return 'video';
  return 'other';
}

// --- Download / Preview (secure file serving) ---

function handleStorageDownload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const filePath = decodeURIComponent(url.pathname.replace('/api/files/download/', ''));
  if (!filePath) {
    return sendError(res, 400, 'Missing file path');
  }

  const cleanPath = safePath(filePath);
  if (!cleanPath) {
    return sendError(res, 400, 'Invalid file path');
  }

  const storagePath = path.resolve(path.join(STORAGE_DIR, cleanPath));
  if (!storagePath.startsWith(path.resolve(STORAGE_DIR))) {
    return sendError(res, 403, 'Forbidden');
  }

  if (!fs.existsSync(storagePath)) {
    return sendError(res, 404, 'File not found');
  }

  const stat = fs.statSync(storagePath);
  if (!stat.isFile()) {
    return sendError(res, 400, 'Not a file');
  }

  const ext = path.extname(cleanPath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const isText = isTextFile(cleanPath);
  const isMedia = ext === '.mp4' || ext === '.webm' || ext === '.mp3' || ext === '.ogg' || ext === '.wav' || ext === '.pdf';
  const isInline = isText || ext === '.pdf' || ext === '.md';

  const headers = {
    'Content-Type': isText ? 'text/plain; charset=utf-8' : contentType,
    'Content-Length': stat.size,
    'Content-Disposition': isInline ? 'inline' : `attachment; filename="${encodeURIComponent(path.basename(cleanPath))}"`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (isMedia) {
    // Support range requests for media streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      headers['Content-Length'] = chunkSize;
      res.writeHead(206, headers);
      fs.createReadStream(storagePath, { start, end }).pipe(res);
      return;
    }
  }

  res.writeHead(200, headers);
  fs.createReadStream(storagePath).pipe(res);
}

// --- Content (for text files, returns content as JSON) ---

async function handleStorageContent(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filePath = url.searchParams.get('path') || '';
    if (!filePath) return sendError(res, 400, 'Missing path parameter');

    const cleanPath = safePath(filePath);
    if (!cleanPath) return sendError(res, 400, 'Invalid file path');

    const meta = readMeta();
    const entry = meta.find((m) => m.path === cleanPath);
    if (!entry) return sendError(res, 404, `File not found: "${filePath}"`);

    const storagePath = path.join(STORAGE_DIR, cleanPath);
    let content = '';

    try {
      await fsp.access(storagePath);
      if (isTextFile(entry.name)) {
        content = await fsp.readFile(storagePath, 'utf8');
      } else {
        content = `[Binary file: ${entry.name}]`;
      }
    } catch {
      content = '';
    }

    sendJson(res, 200, { path: cleanPath, name: entry.name, content });
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

// --- List (legacy, directory-based) ---

function handleStorageList(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parentPath = url.searchParams.get('parent_path') || null;
    const meta = readMeta();

    let filtered = meta;
    if (parentPath && parentPath.startsWith('eq.')) {
      const val = parentPath.slice(3);
      filtered = meta.filter((m) => m.parent_path === val);
    } else if (parentPath === 'is.null') {
      filtered = meta.filter((m) => !m.parent_path);
    }

    filtered.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    sendJson(res, 200, filtered);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

// --- Delete ---

async function handleStorageDelete(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filePath = url.searchParams.get('path') || '';
    if (!filePath) return sendError(res, 400, 'Missing path parameter');

    const cleanPath = safePath(filePath);
    if (!cleanPath) return sendError(res, 400, 'Invalid file path');

    const meta = readMeta();
    const idx = meta.findIndex((m) => m.path === cleanPath);
    if (idx === -1) return sendError(res, 404, `File not found: "${filePath}"`);

    meta.splice(idx, 1);
    await Promise.all([
      writeMetaAsync(meta),
      fsp.unlink(path.join(STORAGE_DIR, cleanPath)).catch(() => {}),
    ]);

    sendJson(res, 200, { success: true });
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

// --- Raw (legacy) ---

function handleStorageRaw(req, res) {
  const filePath = req.url.replace('/api/files/raw/', '');
  if (!filePath) return sendError(res, 400, 'Missing file path');

  const cleanPath = safePath(filePath);
  if (!cleanPath) return sendError(res, 400, 'Invalid file path');

  const storagePath = path.join(STORAGE_DIR, cleanPath);
  if (!fs.existsSync(storagePath)) return sendError(res, 404, 'File not found');

  const ext = path.extname(cleanPath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType, ...securityHeaders() });
  fs.createReadStream(storagePath).pipe(res);
}

// --- AI Chat with Web Search (Tool-Calling Loop) ---

const AI_MODEL = process.env.AI_MODEL || 'gemma4:e2b';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

const AI_SYSTEM_PROMPT = `You are a helpful AI assistant for a wiki knowledge base.
You have access to a web_search tool that can look up live information on the internet.
When asked about current events, real-time data, or anything that might have changed since your training,
use the web_search tool to get accurate, up-to-date information.
When you use web_search, cite your sources by mentioning the domain or title of the results.
Always answer helpfully and accurately.`;

async function handleAiChat(req, res) {
  try {
    const body = JSON.parse((await collectBody(req)).toString());
    const { messages, pageContent } = body;
    if (!messages || !Array.isArray(messages)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'messages array is required' }));
      return;
    }

    const systemMessage = pageContent
      ? { role: 'system', content: `${AI_SYSTEM_PROMPT}\n\nHere is the current page content the user is viewing:\n\n${pageContent}` }
      : { role: 'system', content: AI_SYSTEM_PROMPT };

    const tool = {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for current, real-time information. Use this to answer questions about recent events, live data, or anything requiring up-to-date knowledge.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query to look up on the web' },
          },
          required: ['query'],
        },
      },
    };

    // First pass: send messages with tool definition (non-streaming to inspect tool_calls)
    const firstPass = await ollama.chat({
      model: AI_MODEL,
      messages: [systemMessage, ...messages],
      tools: [tool],
      stream: false,
    });

    const replyMsg = firstPass.message;

    // Check if the model wants to search the web
    if (replyMsg.tool_calls && replyMsg.tool_calls.length > 0) {
      // Set SSE headers for the search + streaming response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      for (const tc of replyMsg.tool_calls) {
        if (tc.function.name === 'web_search') {
          const query = tc.function.arguments.query || '';
          // Notify frontend that we are searching
          res.write(`data: ${JSON.stringify({ type: 'searching', query })}\n\n`);

          let searchResults;
          try {
            searchResults = await ollama.webSearch({ query, maxResults: 5 });
          } catch (searchErr) {
            searchResults = { results: [{ content: `Search failed: ${searchErr.message}` }] };
          }

          // Notify frontend search is complete
          res.write(`data: ${JSON.stringify({ type: 'search_complete', resultCount: searchResults.results?.length || 0 })}\n\n`);

          // Build tool result messages for the second pass
          const searchContent = (searchResults.results || [])
            .map((r) => r.content)
            .filter(Boolean)
            .join('\n\n---\n\n');

          const toolMessages = [
            ...replyMsg.tool_calls.map((tc) => ({
              role: 'tool',
              content: searchContent || 'No results found.',
              tool_name: tc.function.name,
            })),
          ];

          // Second pass: stream the model's synthesis of the search results
          const secondPass = await ollama.chat({
            model: AI_MODEL,
            messages: [
              systemMessage,
              ...messages,
              replyMsg,
              ...toolMessages,
            ],
            stream: true,
          });

          for await (const chunk of secondPass) {
            if (chunk.message?.content) {
              res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.message.content })}\n\n`);
            }
          }
        }
      }
    } else {
      // No tool call — stream the direct response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const stream = await ollama.chat({
        model: AI_MODEL,
        messages: [systemMessage, ...messages],
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.message.content })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    // If headers not sent yet, send error JSON
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }
}

// --- Proxy ---

function proxyRequest(req, res, route) {
  let proxyPath = route.stripPrefix
    ? req.url.replace(/^\/ollama/, '') || '/'
    : req.url;
  const targetUrl = new URL(proxyPath, route.target);
  const proxyOptions = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: { ...req.headers },
  };
  delete proxyOptions.headers['host'];
  if (route.stripPrefix) {
    delete proxyOptions.headers['authorization'];
    delete proxyOptions.headers['cookie'];
  }

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, { ...proxyRes.headers, ...securityHeaders() });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

// --- Static File Server ---

function tryServeFile(res, filePath, ext) {
  const contentType = MIME[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  stream.on('open', () => {
    res.writeHead(200, { 'Content-Type': contentType, ...securityHeaders() });
    stream.pipe(res);
  });
  stream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      serveIndexHtml(res);
    } else {
      res.writeHead(500, securityHeaders());
      res.end('Internal Server Error');
    }
  });
}

function serveIndexHtml(res, reqUrl) {
  fsp.readFile(path.join(DIST, 'index.html'), 'utf8')
    .then((data) => {
      const injected = injectMeta(data, reqUrl || '/');
      res.writeHead(200, { 'Content-Type': 'text/html', ...securityHeaders() });
      res.end(injected);
    })
    .catch(() => {
      res.writeHead(500, securityHeaders());
      res.end('Internal Server Error');
    });
}

function serveStatic(req, res) {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  let ext = path.extname(filePath);
  if (!ext) {
    return serveIndexHtml(res, req.url);
  }
  tryServeFile(res, filePath, ext);
}

// --- Main Server ---

initStorage();
initPages();
initEvents();

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...securityHeaders(),
    });
    res.end();
    return;
  }

  // Agent / crawler routes
  if (req.url === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...securityHeaders() });
    res.end('User-agent: *\nAllow: /\nSitemap: http://localhost:4173/sitemap.xml\n');
    return;
  }

  if (req.url === '/ai.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...securityHeaders() });
    res.end(
      '# AI agent manifest\n' +
      '// This site provides wiki content, file uploads, and AI-powered features.\n' +
      '// Agents should respect robots.txt and prefer JSON-LD structured data.\n' +
      '// Primary content: knowledge-base pages and uploaded files.\n' +
      '// API available at /api/ for programmatic access.\n'
    );
    return;
  }

  if (req.url === '/sitemap.xml') {
    const base = `http://localhost:${PORT}`;
    const urls = Object.keys(ROUTE_META).map((p) =>
      `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`
    ).join('\n');
    res.writeHead(200, { 'Content-Type': 'application/xml', ...securityHeaders() });
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    return;
  }

  // Wiki pages CRUD
  if ((req.url === '/api/pages' || req.url.startsWith('/api/pages?')) && req.method === 'GET') {
    return handlePagesList(req, res);
  }
  if (req.url.startsWith('/api/pages/search') && req.method === 'GET') {
    return handlePagesSearch(req, res);
  }
  if (req.url.startsWith('/api/pages/') && req.method === 'GET') {
    return handlePagesGet(req, res);
  }
  if (req.url === '/api/pages' && req.method === 'POST') {
    return handlePagesCreate(req, res);
  }
  if (req.url.startsWith('/api/pages/') && req.method === 'PUT') {
    return handlePagesUpdate(req, res);
  }
  if (req.url.startsWith('/api/pages/') && req.method === 'DELETE') {
    return handlePagesDelete(req, res);
  }

  // Calendar events
  if (req.url === '/api/events' || req.url.startsWith('/api/events?') && req.method === 'GET') {
    return handleEventsList(req, res);
  }
  if (req.url === '/api/events' && req.method === 'POST') {
    return handleEventsCreate(req, res);
  }

  // AI Chat with web search
  if (req.url === '/api/chat' && req.method === 'POST') {
    return handleAiChat(req, res);
  }

  // File search endpoint (replaces Supabase wiki_files table)
  if (req.url.startsWith('/api/files/search') && req.method === 'GET') {
    return handleFilesSearch(req, res);
  }

  // Browse endpoint — flat global file list with metadata
  if (req.url.startsWith('/api/files/browse') && req.method === 'GET') {
    return handleStorageBrowse(req, res);
  }

  // Download/preview endpoint — secure file serving
  if (req.url.startsWith('/api/files/download/')) {
    return handleStorageDownload(req, res);
  }

  // Legacy routes
  if (req.url.startsWith('/api/upload') && req.method === 'POST') {
    return handleStorageUpload(req, res);
  }
  if (req.url.startsWith('/api/files/raw/')) {
    return handleStorageRaw(req, res);
  }
  if (req.url.startsWith('/api/files/content') && req.method === 'GET') {
    return handleStorageContent(req, res);
  }
  if (req.url.startsWith('/api/files') && req.method === 'DELETE') {
    return handleStorageDelete(req, res);
  }
  if (req.url.startsWith('/api/files') && req.method === 'GET') {
    return handleStorageList(req, res);
  }

  const route = ROUTES.find((r) => req.url.startsWith(r.prefix));
  if (route) return proxyRequest(req, res, route);

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Wiki server running at http://${HOST}:${PORT}`);
  console.log(`  Local storage: ${STORAGE_DIR}`);
  console.log(`  Proxying API → ${API_TARGET}`);
  console.log(`  Proxying Ollama → ${OLLAMA_TARGET}\n`);
});
