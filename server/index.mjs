import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(
    homedir(),
    'Library',
    'Application Support',
    'com.vgrazian.claim',
    'config.json'
);

const MONDAY_API = 'https://api.monday.com/v2';
const BOARD_ID = '6500270039';

function loadApiKey() {
    try {
        if (existsSync(CONFIG_PATH)) {
            const raw = readFileSync(CONFIG_PATH, 'utf-8');
            const config = JSON.parse(raw);
            return config.api_key || null;
        }
    } catch (e) {
        console.error('Failed to load config:', e.message);
    }
    return null;
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
    res.json({ status: 'ok', hasApiKey: !!apiKey });
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

        const dateFilterStr = dateFilter
            ? `{ column: "date4", operator: any, compare_value: [${dateFilter.map((d) => `"${d}"`).join(',')}] }`
            : '';

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
