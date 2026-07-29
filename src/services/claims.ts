// Re-export the canonical activity type definitions from the shared module.
// The server imports the same file, keeping both in sync automatically.
export { ACTIVITY_TYPES } from '../shared/activityTypes.mjs';
import { ACTIVITY_TYPES as _AT } from '../shared/activityTypes.mjs';

export const ACTIVITY_TYPE_KEYS = Object.keys(_AT);

export function getActivityValue(name: string): number {
    return (_AT as Record<string, number>)[name] ?? 0;
}

export function getActivityName(value: number): string {
    for (const [key, val] of Object.entries(_AT)) {
        if (val === value) return key;
    }
    return 'billable';
}

export function extractDateFromItem(item: { column_values?: Array<{ id?: string; value?: string; text?: string }> }): string | null {
    if (!item.column_values) return null;
    const dateCol = item.column_values.find((c) => c.id === 'date4');
    if (!dateCol?.value) return null;
    try {
        const parsed = JSON.parse(dateCol.value);
        return parsed?.date || null;
    } catch {
        return null;
    }
}

export function extractCustomerFromItem(item: { column_values?: Array<{ id?: string; value?: string; text?: string }> }): string {
    if (!item.column_values) return '';
    const col = item.column_values.find((c) => c.id === 'text__1');
    return col?.text || '';
}

export function extractWorkItemFromItem(item: { column_values?: Array<{ id?: string; value?: string; text?: string }> }): string {
    if (!item.column_values) return '';
    const col = item.column_values.find((c) => c.id === 'text8__1');
    return col?.text || '';
}

export function extractHoursFromItem(item: { column_values?: Array<{ id?: string; value?: string; text?: string }> }): number {
    if (!item.column_values) return 0;
    const col = item.column_values.find((c) => c.id === 'numbers__1');
    if (!col?.value) return 0;
    try {
        const parsed = JSON.parse(col.value);
        return parseFloat(parsed) || 0;
    } catch {
        return parseFloat(col.text || '0') || 0;
    }
}

export function extractCommentFromItem(item: { column_values?: Array<{ id?: string; value?: string; text?: string }> }): string | null {
    if (!item.column_values) return null;
    const col = item.column_values.find((c) => c.id === 'text2__1' || c.id === 'long_text');
    return col?.text || null;
}

export function extractActivityValueFromItem(item: { column_values?: Array<{ id?: string; value?: string; text?: string }> }): number {
    if (!item.column_values) return 0;
    const col = item.column_values.find((c) => c.id === 'status');
    if (!col?.value) return 0;
    try {
        const parsed = JSON.parse(col.value);
        return parseInt(parsed?.index, 10) || 0;
    } catch {
        return 0;
    }
}

export function itemToClaimEntry(item: {
    id?: string;
    column_values?: Array<{ id?: string; value?: string; text?: string }>;
}): {
    id: string;
    date: string;
    activityType: string;
    activityValue: number;
    customer: string;
    workItem: string;
    hours: number;
    comment: string | null;
} | null {
    const date = extractDateFromItem(item);
    if (!date) return null;

    const activityValue = extractActivityValueFromItem(item);
    return {
        id: item.id || '',
        date,
        activityType: getActivityName(activityValue),
        activityValue,
        customer: extractCustomerFromItem(item),
        workItem: extractWorkItemFromItem(item),
        hours: extractHoursFromItem(item),
        comment: extractCommentFromItem(item),
    };
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getWeekDates(weekStart: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });
}

export function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Returns the calendar-grid dates for the month containing `date`.
 * The grid starts on the Monday of the week that contains the 1st of the month,
 * and ends on the last day of the month (not padded to a full week).
 */
export function getMonthGridDates(date: Date): Date[] {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const day = first.getDay();
    const start = new Date(first);
    start.setDate(first.getDate() - (day === 0 ? 6 : day - 1));
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const dates: Date[] = [];
    for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
    }
    return dates;
}

export function formatDisplayDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
