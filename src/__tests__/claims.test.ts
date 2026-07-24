import { describe, it, expect } from 'vitest';
import {
    getActivityValue,
    getActivityName,
    ACTIVITY_TYPES,
    ACTIVITY_TYPE_KEYS,
    extractDateFromItem,
    extractCustomerFromItem,
    extractWorkItemFromItem,
    extractHoursFromItem,
    extractCommentFromItem,
    extractActivityValueFromItem,
    itemToClaimEntry,
    getWeekStart,
    getWeekDates,
    formatDate,
} from '../services/claims';

describe('Activity Types', () => {
    it('should map activity type names to values', () => {
        expect(getActivityValue('billable')).toBe(0);
        expect(getActivityValue('vacation')).toBe(1);
        expect(getActivityValue('presales')).toBe(7);
        expect(getActivityValue('l104')).toBe(13);
    });

    it('should return 0 for unknown activity type', () => {
        expect(getActivityValue('unknown')).toBe(0);
    });

    it('should map values back to names', () => {
        expect(getActivityName(0)).toBe('billable');
        expect(getActivityName(7)).toBe('presales');
        expect(getActivityName(13)).toBe('l104');
        expect(getActivityName(999)).toBe('billable');
    });

    it('should have all activity type keys', () => {
        expect(ACTIVITY_TYPE_KEYS).toHaveLength(14);
        expect(ACTIVITY_TYPE_KEYS).toContain('billable');
        expect(ACTIVITY_TYPE_KEYS).toContain('l104');
    });
});

describe('Data Extraction', () => {
    const mockItem = {
        id: '123',
        column_values: [
            { id: 'date4', value: '{"date":"2025-07-24"}', text: '2025-07-24' },
            { id: 'text__1', value: null, text: 'Test Customer' },
            { id: 'text8__1', value: null, text: 'WI-001' },
            { id: 'numbers__1', value: '8', text: '8' },
            { id: 'text', value: null, text: 'Test comment' },
            { id: 'status', value: '{"index":0}', text: 'Billable' },
        ],
    };

    it('should extract date from item', () => {
        expect(extractDateFromItem(mockItem)).toBe('2025-07-24');
    });

    it('should extract customer from item', () => {
        expect(extractCustomerFromItem(mockItem)).toBe('Test Customer');
    });

    it('should extract work item from item', () => {
        expect(extractWorkItemFromItem(mockItem)).toBe('WI-001');
    });

    it('should extract hours from item', () => {
        expect(extractHoursFromItem(mockItem)).toBe(8);
    });

    it('should extract comment from item', () => {
        expect(extractCommentFromItem(mockItem)).toBe('Test comment');
    });

    it('should extract activity value from item', () => {
        expect(extractActivityValueFromItem(mockItem)).toBe(0);
    });

    it('should convert item to claim entry', () => {
        const entry = itemToClaimEntry(mockItem);
        expect(entry).not.toBeNull();
        expect(entry!.id).toBe('123');
        expect(entry!.date).toBe('2025-07-24');
        expect(entry!.customer).toBe('Test Customer');
        expect(entry!.hours).toBe(8);
        expect(entry!.activityValue).toBe(0);
    });

    it('should return null for item without date', () => {
        const noDate = { ...mockItem, column_values: mockItem.column_values.filter((c) => c.id !== 'date4') };
        expect(itemToClaimEntry(noDate)).toBeNull();
    });

    it('should handle missing column values gracefully', () => {
        const empty = {};
        expect(extractDateFromItem(empty)).toBeNull();
        expect(extractCustomerFromItem(empty)).toBe('');
        expect(extractWorkItemFromItem(empty)).toBe('');
        expect(extractHoursFromItem(empty)).toBe(0);
        expect(extractCommentFromItem(empty)).toBeNull();
        expect(extractActivityValueFromItem(empty)).toBe(0);
    });

    it('should handle missing column_values array', () => {
        const empty = { column_values: [] };
        expect(extractDateFromItem(empty)).toBeNull();
    });
});

describe('Date Utilities', () => {
    it('should get week start (Monday)', () => {
        // July 24, 2025 is a Thursday - use local-time-safe constructor
        const thursday = new Date(2025, 6, 24, 12);
        const weekStart = getWeekStart(thursday);
        expect(weekStart.getDay()).toBe(1); // Monday
        expect(formatDate(weekStart)).toBe('2025-07-21'); // Monday of that week
    });

    it('should handle Sunday correctly', () => {
        const sunday = new Date(2025, 6, 27, 12);
        const weekStart = getWeekStart(sunday);
        expect(formatDate(weekStart)).toBe('2025-07-21'); // Monday before Sunday
    });

    it('should handle Monday correctly', () => {
        const monday = new Date(2025, 6, 21, 12);
        const weekStart = getWeekStart(monday);
        expect(formatDate(weekStart)).toBe('2025-07-21'); // Same day
    });

    it('should get all 7 week dates', () => {
        const weekStart = new Date(2025, 6, 21, 12);
        const dates = getWeekDates(weekStart);
        expect(dates).toHaveLength(7);
        expect(formatDate(dates[0])).toBe('2025-07-21');
        expect(formatDate(dates[6])).toBe('2025-07-27');
    });

    it('should format date correctly', () => {
        expect(formatDate(new Date(2025, 6, 24, 12))).toBe('2025-07-24');
    });
});
