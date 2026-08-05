import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { ACTIVITY_TYPES, getActivityName } from '../src/shared/activityTypes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const home = homedir();
const os = platform();

// Cross-platform config path — matches TUI app locations
function getConfigPaths() {
    if (os === 'darwin') {
        return [join(home, 'Library', 'Application Support', 'com.vgrazian.claim', 'config.json')];
    }
    if (os === 'linux') {
        return [join(home, '.config', 'com.vgrazian.claim', 'config.json')];
    }
    if (os === 'win32') {
        return [join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'com.vgrazian.claim', 'config.json')];
    }
    return [join(home, '.config', 'com.vgrazian.claim', 'config.json')];
}

const CONFIG_PATHS = getConfigPaths();
const MONDAY_API = 'https://api.monday.com/v2';
const BOARD_ID = '6500270039';

function findConfigPath() {
    for (const p of CONFIG_PATHS) {
        if (existsSync(p)) return p;
    }
    return CONFIG_PATHS[0]; // default to first path for saving
}

function loadConfig() {
    const configPath = findConfigPath();
    try {
        if (existsSync(configPath)) {
            const raw = readFileSync(configPath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load config:', e.message);
    }
    return {};
}

function loadApiKey() {
    return loadConfig().api_key || null;
}

function saveConfig(config) {
    const configPath = findConfigPath();
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    try {
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save config:', e.message);
        throw e; // re-throw so callers can handle it
    }
}

async function proxyMonday(query, variables = {}) {
    const apiKey = loadApiKey();
    if (!apiKey) {
        throw new Error('No API key configured. Please set up claim TUI first.');
    }

    const res = await fetch(MONDAY_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
        throw new Error(`Monday API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

const app = express();

// Restrict CORS to localhost origins only — the API key proxy must never be
// reachable from arbitrary origins on the network.
const ALLOWED_ORIGINS = [
    `http://localhost:${process.env.PORT || 3001}`,
    `http://127.0.0.1:${process.env.PORT || 3001}`,
    'http://localhost:5173', // Vite dev server
    'http://127.0.0.1:5173',
    `http://[::1]:${process.env.PORT || 3001}`,
    'http://[::1]:5173',
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. same-origin fetch, curl)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    const apiKey = loadApiKey();
    const config = loadConfig();
    res.json({
        status: 'ok',
        hasApiKey: !!apiKey,
        userNameOverride: config.user_name_override || null,
    });
});

// Get/set config (API key, user name override, weekend default)
app.get('/api/config', (req, res) => {
    try {
        const config = loadConfig();
        res.json({
            hasApiKey: !!config.api_key,
            apiKeyMasked: config.api_key
                ? config.api_key.slice(0, 8) + '...' + config.api_key.slice(-4)
                : null,
            userNameOverride: config.user_name_override || null,
            showWeekendsDefault: config.show_weekends_default || false,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        const { apiKey, userNameOverride, showWeekendsDefault } = req.body;
        const config = loadConfig();

        let newApiKey = config.api_key;

        // If a new API key is provided, validate it against Monday.com
        if (apiKey !== undefined && apiKey !== null) {
            if (apiKey === '') {
                newApiKey = '';
            } else {
                // Validate by calling Monday.com API
                try {
                    const validationRes = await fetch(MONDAY_API, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: apiKey,
                        },
                        body: JSON.stringify({ query: 'query { me { id name email } }' }),
                    });
                    if (!validationRes.ok) {
                        return res.status(400).json({ error: 'Invalid API key — Monday.com rejected it.' });
                    }
                    const validationData = await validationRes.json();
                    if (validationData.errors) {
                        return res.status(400).json({
                            error: 'Invalid API key: ' + validationData.errors[0]?.message,
                        });
                    }
                    newApiKey = apiKey;
                } catch (e) {
                    return res.status(400).json({ error: 'Could not validate API key: ' + e.message });
                }
            }
        }

        if (newApiKey !== undefined) {
            config.api_key = newApiKey;
        }
        if (userNameOverride !== undefined) {
            config.user_name_override = userNameOverride || null;
        }
        if (showWeekendsDefault !== undefined) {
            config.show_weekends_default = showWeekendsDefault;
        }

        saveConfig(config);
        const hasKey = !!config.api_key;
        console.log('[server] POST /api/config — saved config, hasApiKey:', hasKey,
            hasKey ? 'masked=' + config.api_key.slice(0, 8) + '...' + config.api_key.slice(-4) : '');
        res.json({
            success: true,
            hasApiKey: hasKey,
            apiKeyMasked: config.api_key
                ? config.api_key.slice(0, 8) + '...' + config.api_key.slice(-4)
                : null,
            userNameOverride: config.user_name_override || null,
            showWeekendsDefault: config.show_weekends_default || false,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Clear stored API key (logout)
app.delete('/api/config', (req, res) => {
    try {
        const config = loadConfig();
        delete config.api_key;
        saveConfig(config);
        console.log('[server] DELETE /api/config — api_key removed from config');
        res.json({ success: true });
    } catch (e) {
        console.error('[server] DELETE /api/config failed:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Get current user
app.get('/api/user', async (req, res) => {
    try {
        const data = await proxyMonday(`query { me { id name email } }`);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get board with groups
app.get('/api/board/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        const query = `
      query($boardId: [ID!]) {
        boards(ids: $boardId) {
          id name
          groups { id title }
        }
      }
    `;
        const data = await proxyMonday(query, { boardId: [parseInt(boardId)] });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Validate that a value is a safe integer (guards GraphQL string interpolation)
function assertUserId(userId) {
    const n = Number(userId);
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`Invalid userId: ${userId}`);
    }
    return n;
}

// Validate that a value is a YYYY-MM-DD date string
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function assertDateString(d) {
    if (typeof d !== 'string' || !DATE_RE.test(d)) {
        throw new Error(`Invalid date value: ${d}`);
    }
    return d;
}

// Query items
app.post('/api/items/query', async (req, res) => {
    try {
        const { boardId, groupId, userId, dateFilter, limit = 500 } = req.body;

        // Build query_params as inline GraphQL (operators are enums, not strings).
        // Values are validated before interpolation to prevent GraphQL injection.
        let queryParamsInline = '';

        if (userId || (dateFilter && dateFilter.length > 0)) {
            const ruleParts = [];

            // User filter
            if (userId) {
                const safeUserId = assertUserId(userId);
                ruleParts.push(`{ column_id: "person", compare_value: ["person-${safeUserId}"], operator: any_of }`);
            }

            // Date filter
            if (dateFilter && dateFilter.length > 0) {
                const dateValues = [];
                dateFilter.forEach((d) => dateValues.push(`"EXACT", "${assertDateString(d)}"`));
                ruleParts.push(`{ column_id: "date4", compare_value: [${dateValues.join(', ')}], operator: any_of }`);
            }

            queryParamsInline = `query_params: { rules: [${ruleParts.join(', ')}], operator: and }`;
        }

        const query = `
      query($boardId: [ID!], $groupId: [String!], $limit: Int!) {
        boards(ids: $boardId) {
          groups(ids: $groupId) {
            items_page(limit: $limit, ${queryParamsInline}) {
              cursor
              items {
                id name
                column_values {
                  id value text
                }
              }
            }
          }
        }
      }
    `;

        const data = await proxyMonday(query, {
            boardId: [parseInt(boardId)],
            groupId: [groupId],
            limit,
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create item
app.post('/api/items', async (req, res) => {
    try {
        const { boardId, groupId, itemName, columnValues } = req.body;
        // Monday.com expects column_values as a JSON-encoded string
        const cvJson = JSON.stringify(columnValues);
        const cvEscaped = cvJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        const query = `
      mutation($boardId: ID!, $groupId: String!, $itemName: String!) {
        create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: "${cvEscaped}") {
          id name
        }
      }
    `;

        const data = await proxyMonday(query, {
            boardId: parseInt(boardId),
            groupId,
            itemName,
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update item
app.put('/api/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { boardId, columnValues } = req.body;
        const cvJson = JSON.stringify(columnValues);
        const cvEscaped = cvJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        const query = `
      mutation($boardId: ID!, $itemId: ID!) {
        change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: "${cvEscaped}") {
          id name
        }
      }
    `;

        const data = await proxyMonday(query, {
            boardId: parseInt(boardId),
            itemId: parseInt(itemId),
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete item
app.delete('/api/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;

        const query = `
      mutation($itemId: ID!) {
        delete_item(item_id: $itemId) { id }
      }
    `;

        const data = await proxyMonday(query, { itemId: parseInt(itemId) });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get recent entries for quick-fill templates (last N days, filtered by user)
app.get('/api/items/recent', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 28; // default 4 weeks
        const boardId = req.query.boardId || BOARD_ID;
        const groupId = req.query.groupId;
        const userId = req.query.userId;

        if (!groupId || !userId) {
            return res.status(400).json({ error: 'groupId and userId are required' });
        }

        // Validate before interpolation into GraphQL string
        const safeUserId = assertUserId(userId);

        // Fetch ALL items for the user (paginated) so presales hours are
        // accurately accumulated regardless of how many entries exist.
        const allItems = [];
        let cursor = null;
        const PAGE_SIZE = 500;
        do {
            const cursorParam = cursor
                ? `cursor: ${JSON.stringify(cursor)},`
                : '';
            const queryParamsInline = `query_params: { rules: [{ column_id: "person", compare_value: ["person-${safeUserId}"], operator: any_of }], operator: and }`;

            const query = `
      query($boardId: [ID!], $groupId: [String!], $limit: Int!) {
        boards(ids: $boardId) {
          groups(ids: $groupId) {
            items_page(limit: $limit, ${cursorParam} ${queryParamsInline}) {
              cursor
              items {
                id name
                column_values {
                  id value text
                }
              }
            }
          }
        }
      }
    `;

            const data = await proxyMonday(query, {
                boardId: [parseInt(boardId)],
                groupId: [groupId],
                limit: PAGE_SIZE,
            });

            const page = data?.data?.boards?.[0]?.groups?.[0]?.items_page;
            const items = page?.items || [];
            allItems.push(...items);
            cursor = page?.cursor;
        } while (cursor);

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        // Filter client-side by date range and extract unique templates.
        //
        // Skip non-billable types that are already covered by quick-presets or
        // have no useful quick-fill data — EXCEPT presales (7), which is included
        // so that opportunity numbers can be surfaced in the entry form.
        //   0=vacation, 4=work_reduction, 6=holiday, 8=illness, 13=l104
        const SKIP_ACTIVITIES = new Set([0, 4, 6, 8, 13]);
        const templates = [];
        const seen = new Set();
        // Presales: track actual hours per opportunity so the client can compute
        // remaining capacity. Keyed by comment (opportunity number).
        const presalesHours = new Map();

        for (const item of allItems) {
            const dateCol = item.column_values?.find((c) => c.id === 'date4');
            if (!dateCol?.value) continue;
            let dateStr = '';
            try { dateStr = JSON.parse(dateCol.value)?.date; } catch { continue; }
            if (!dateStr) continue;

            const statusCol = item.column_values?.find((c) => c.id === 'status');
            let activityIdx = 0;
            try { activityIdx = parseInt(JSON.parse(statusCol?.value || '{}')?.index, 10) || 0; } catch { }

            if (SKIP_ACTIVITIES.has(activityIdx)) continue;

            const customer = item.column_values?.find((c) => c.id === 'text__1')?.text || '';
            const workItem = item.column_values?.find((c) => c.id === 'text8__1')?.text || '';
            const comment = item.column_values?.find((c) => c.id === 'text2__1' || c.id === 'long_text')?.text || '';

            const hoursCol = item.column_values?.find((c) => c.id === 'numbers__1');
            let hours = 8;
            try { hours = parseFloat(hoursCol?.value ? JSON.parse(hoursCol.value) : hoursCol?.text || '8') || 8; } catch { }

            if (activityIdx === ACTIVITY_TYPES.presales) {
                // For presales: dedupe by opportunity (comment) and accumulate real hours.
                // This lets the client compute how many hours are left before the 24h cap.
                // IMPORTANT: Do NOT apply the date cutoff for presales — we need ALL
                // historical entries to accurately compute the 24h cap.
                if (!comment) continue; // no opportunity number — not useful
                presalesHours.set(comment, (presalesHours.get(comment) || 0) + hours);
                const key = `presales::${comment}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    templates.push({
                        activityType: activityIdx,
                        activityTypeName: 'presales',
                        customer,
                        workItem,
                        hours: presalesHours.get(comment), // accumulated total, not single item
                        comment,
                        lastUsed: dateStr,
                    });
                } else {
                    // Update hours on the existing template entry to the running total
                    const existing = templates.find((t) => t.activityTypeName === 'presales' && t.comment === comment);
                    if (existing) {
                        existing.hours = presalesHours.get(comment);
                        if (dateStr > existing.lastUsed) existing.lastUsed = dateStr;
                    }
                }
                continue;
            }

            // Non-presales: apply the date cutoff for recent-templates dedup
            if (dateStr < cutoffStr) continue;

            // Non-presales: skip entries with no useful identifiers
            if (!customer && !workItem) continue;

            // Dedupe by activity + customer + workItem (hours always default to 8)
            const key = `${activityIdx}::${customer}::${workItem}`;
            if (!seen.has(key)) {
                seen.add(key);
                templates.push({
                    activityType: activityIdx,
                    activityTypeName: getActivityName(activityIdx),
                    customer,
                    workItem,
                    hours: 8,
                    comment,
                    lastUsed: dateStr,
                });
            }
        }

        // Filter out presales templates that have already reached the 24h cap
        const filtered = templates.filter((t) => {
            if (t.activityTypeName !== 'presales') return true;
            return t.hours < 24;
        });

        // Sort by most recently used
        filtered.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));

        res.json({ templates: filtered.slice(0, 20) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve static files in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
// Bind to loopback only — never expose the Monday.com proxy to the LAN.
// Listen on both IPv4 and IPv6 loopback so the server is reachable regardless
// of whether the browser resolves "localhost" to 127.0.0.1 or ::1.
const httpServer = createServer(app);
httpServer.listen(PORT, '127.0.0.1', () => {
    console.log(`Claim UI server running on http://127.0.0.1:${PORT}`);
    const apiKey = loadApiKey();
    console.log(`API key: ${apiKey ? 'loaded' : 'NOT FOUND'}`);
});
// Also try IPv6 loopback (fails silently on systems without IPv6 support)
const httpServer6 = createServer(app);
httpServer6.on('error', (err) => {
    if (err.code !== 'EADDRNOTAVAIL') console.error('IPv6 listen error:', err.message);
});
httpServer6.listen(PORT, '::1', () => {
    console.log(`Claim UI server also on http://[::1]:${PORT}`);
});
