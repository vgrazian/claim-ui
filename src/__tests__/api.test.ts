import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHealth, fetchUser, queryItems, createItem, updateItem, deleteItem } from '../services/api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
    mockFetch.mockReset();
});

describe('API Service', () => {
    it('fetchHealth should return health status', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ status: 'ok', hasApiKey: true }),
        });

        const result = await fetchHealth();
        expect(result.status).toBe('ok');
        expect(result.hasApiKey).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/health');
    });

    it('fetchHealth should throw on error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        await expect(fetchHealth()).rejects.toThrow('Health check failed');
    });

    it('fetchUser should return user data', async () => {
        const userData = {
            data: { me: { id: 123, name: 'Test User', email: 'test@test.com' } },
            errors: undefined,
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(userData),
        });

        const result = await fetchUser();
        expect(result.id).toBe(123);
        expect(result.name).toBe('Test User');
    });

    it('fetchUser should throw on API errors', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ errors: [{ message: 'Auth error' }] }),
        });

        await expect(fetchUser()).rejects.toThrow('Auth error');
    });

    it('queryItems should send correct request', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { boards: [] } }),
        });

        await queryItems('123', 'group1', 456, ['2025-07-24'], 100);

        expect(mockFetch).toHaveBeenCalledWith('/api/items/query', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.boardId).toBe('123');
        expect(body.groupId).toBe('group1');
        expect(body.userId).toBe(456);
    });

    it('createItem should send correct request', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { create_item: { id: '999' } } }),
        });

        const columnValues = { date4: { date: '2025-07-24' } };
        await createItem('123', 'group1', 'Test Item', columnValues);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.boardId).toBe('123');
        expect(body.groupId).toBe('group1');
        expect(body.itemName).toBe('Test Item');
    });

    it('updateItem should send correct request', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { change_multiple_column_values: { id: '999' } } }),
        });

        await updateItem('999', '123', { text__1: 'Updated' });

        expect(mockFetch).toHaveBeenCalledWith('/api/items/999', expect.objectContaining({
            method: 'PUT',
        }));
    });

    it('deleteItem should send correct request', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: {} }),
        });

        await deleteItem('999');

        expect(mockFetch).toHaveBeenCalledWith('/api/items/999', expect.objectContaining({
            method: 'DELETE',
        }));
    });
});
