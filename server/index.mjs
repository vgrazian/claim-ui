import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import express from 'express';
import cors from 'cors';

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

const ACTIVITY_TYPES = {
    vacation: 0,
    billable: 1,
    holding: 2,
    education: 3,
    work_reduction: 4,
    tbd: 5,
    holiday: 6,
    presales: 7,
    illness: 8,
    paid_not_worked: 9,
    intellectual_capital: 10,
    business_development: 11,
    overhead: 12,
    l104: 13,
};

function getActivityName(value) {
    for (const [key, val] of Object.entries(ACTIVITY_TYPES)) {
        if (val === value) return key;
    }
    return 'billable';
}

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
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
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
app.use(cors());
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
        res.json({
            success: true,
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

// Query items
app.post('/api/items/query', async (req, res) => {
    try {
        const { boardId, groupId, userId, dateFilter, limit = 500 } = req.body;

        // Build query_params as inline GraphQL (operators are enums, not strings)
        let queryParamsInline = '';

        if (userId || (dateFilter && dateFilter.length > 0)) {
            const ruleParts = [];

            // User filter
            if (userId) {
                ruleParts.push(`{ column_id: "person", compare_value: ["person-${userId}"], operator: any_of }`);
            }

            // Date filter
            if (dateFilter && dateFilter.length > 0) {
                const dateValues = [];
                dateFilter.forEach((d) => dateValues.push(`"EXACT", "${d}"`));
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
        const columnValuesStr = JSON.stringify(columnValues).replace(/"([^"]+)":/g, '$1:');

        const query = `
      mutation($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
          id name
        }
      }
    `;

        const data = await proxyMonday(query, {
            boardId: parseInt(boardId),
            groupId,
            itemName,
            columnValues,
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
        const columnValuesStr = JSON.stringify(columnValues).replace(/"([^"]+)":/g, '$1:');

        const query = `
      mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
          id name
        }
      }
    `;

        const data = await proxyMonday(query, {
            boardId: parseInt(boardId),
            itemId: parseInt(itemId),
            columnValues,
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

// Get recent entries for quick-fill templates (last N days, no date filter)
app.get('/api/items/recent', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 28; // default 4 weeks
        const boardId = req.query.boardId || BOARD_ID;
        const groupId = req.query.groupId;
        const userId = req.query.userId;

        if (!groupId || !userId) {
            return res.status(400).json({ error: 'groupId and userId are required' });
        }

        // Fetch all items from the group (no date filter — the Monday API
        // returns items sorted by most-recent first, so we can limit)
        const query = `
      query($boardId: [ID!], $groupId: [String!], $limit: Int!) {
        boards(ids: $boardId) {
          groups(ids: $groupId) {
            items_page(limit: $limit) {
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
            limit: 500,
        });

        const items = data?.data?.boards?.[0]?.groups?.[0]?.items_page?.items || [];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        // Filter client-side by date range and extract unique templates
        const templates = [];
        const seen = new Set();

        for (const item of items) {
            const dateCol = item.column_values?.find((c) => c.id === 'date4');
            if (!dateCol?.value) continue;
            let dateStr = '';
            try { dateStr = JSON.parse(dateCol.value)?.date; } catch { continue; }
            if (!dateStr || dateStr < cutoffStr) continue;

            const statusCol = item.column_values?.find((c) => c.id === 'status');
            let activityIdx = 0;
            try { activityIdx = parseInt(JSON.parse(statusCol?.value || '{}')?.index, 10) || 0; } catch { }

            const customer = item.column_values?.find((c) => c.id === 'text__1')?.text || '';
            const workItem = item.column_values?.find((c) => c.id === 'text8__1')?.text || '';
            const hoursCol = item.column_values?.find((c) => c.id === 'numbers__1');
            let hours = 8;
            try { hours = parseFloat(JSON.parse(hoursCol?.value || '{}')) || parseFloat(hoursCol?.text || '8') || 8; } catch { }
            const comment = item.column_values?.find((c) => c.id === 'text2__1' || c.id === 'long_text')?.text || '';

            const key = `${activityIdx}::${customer}::${workItem}::${hours}`;
            if (!seen.has(key)) {
                seen.add(key);
                templates.push({
                    activityType: activityIdx,
                    activityTypeName: getActivityName(activityIdx),
                    customer,
                    workItem,
                    hours,
                    comment,
                    lastUsed: dateStr,
                });
            }
        }

        // Sort by most recently used
        templates.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));

        res.json({ templates: templates.slice(0, 20) });
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
app.listen(PORT, () => {
    console.log(`Claim UI server running on http://localhost:${PORT}`);
    const apiKey = loadApiKey();
    console.log(`API key: ${apiKey ? 'loaded' : 'NOT FOUND'}`);
});
