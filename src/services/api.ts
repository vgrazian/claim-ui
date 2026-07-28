const API_BASE = '/api';

export interface MondayUser {
    id: number;
    name: string;
    email: string;
}

export interface ClaimEntry {
    id: string;
    date: string;
    activityType: string;
    activityValue: number;
    customer: string;
    workItem: string;
    hours: number;
    comment: string | null;
}

export interface RecentTemplate {
    activityType: number;
    activityTypeName: string;
    customer: string;
    workItem: string;
    hours: number;
    comment: string;
    lastUsed: string;
}

export async function fetchHealth(): Promise<{ status: string; hasApiKey: boolean }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
}

export async function fetchUser(): Promise<MondayUser> {
    const res = await fetch(`${API_BASE}/user`);
    if (!res.ok) throw new Error('Failed to fetch user');
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API error');
    return data.data.me;
}

export async function fetchBoard(boardId: string) {
    const res = await fetch(`${API_BASE}/board/${boardId}`);
    if (!res.ok) throw new Error('Failed to fetch board');
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API error');
    return data.data.boards[0];
}

export async function queryItems(
    boardId: string,
    groupId: string,
    userId: number,
    dateFilter?: string[],
    limit = 500
) {
    const res = await fetch(`${API_BASE}/items/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, groupId, userId, dateFilter, limit }),
    });
    if (!res.ok) throw new Error('Failed to query items');
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API error');
    return data;
}

export async function createItem(
    boardId: string,
    groupId: string,
    itemName: string,
    columnValues: Record<string, unknown>
) {
    const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, groupId, itemName, columnValues }),
    });
    if (!res.ok) throw new Error('Failed to create item');
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API error');
    return data;
}

export async function updateItem(
    itemId: string,
    boardId: string,
    columnValues: Record<string, unknown>
) {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, columnValues }),
    });
    if (!res.ok) throw new Error('Failed to update item');
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API error');
    return data;
}

export async function deleteItem(itemId: string) {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete item');
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API error');
    return data;
}

export async function fetchRecentTemplates(
    boardId: string,
    groupId: string,
    userId: number,
    days: number = 28
): Promise<RecentTemplate[]> {
    const params = new URLSearchParams({
        boardId,
        groupId,
        userId: String(userId),
        days: String(days),
    });
    const res = await fetch(`${API_BASE}/items/recent?${params}`);
    if (!res.ok) throw new Error('Failed to fetch recent templates');
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API error');
    return data.templates || [];
}
