import { useState, useCallback, useEffect } from 'react';
import { createItem, updateItem, deleteItem } from '../services/api';
import { getActivityValue, formatDate } from '../services/claims';

interface FormValues {
    date: string;
    activityType: string;
    customer: string;
    workItem: string;
    hours: number;
    comment: string;
}

const defaultFormValues: FormValues = {
    date: formatDate(new Date()),
    activityType: 'billable',
    customer: '',
    workItem: '',
    hours: 8,
    comment: '',
};

export function useEntryForm(
    boardId: string,
    groupId: string,
    userId: number,
    onSuccess: (submitted: FormValues) => void,
    editEntry?: { id: string } & FormValues | null,
    initialDate?: string
) {
    const [values, setValues] = useState<FormValues>(() => {
        if (editEntry) return editEntry;
        if (initialDate) return { ...defaultFormValues, date: initialDate };
        return defaultFormValues;
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Re-sync form values when the entry being edited changes (e.g. user opens
    // a different entry without closing and re-opening the modal).
    useEffect(() => {
        if (editEntry) {
            setValues(editEntry);
        }
    }, [editEntry?.id]);

    // When initialDate changes (user clicked a different day), sync it into
    // the form values — but only when not editing an existing entry.
    useEffect(() => {
        if (initialDate && !editEntry) {
            setValues((prev) => ({ ...prev, date: initialDate }));
        }
    }, [initialDate, editEntry]);

    const setField = useCallback((field: keyof FormValues, value: string | number) => {
        setValues((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'activityType') {
                // Auto-set workItem for time-off types
                if (value === 'vacation' || value === 'work_reduction' || value === 'l104') {
                    if (!prev.workItem || prev.workItem === 'M.00556') {
                        next.workItem = 'M.00556';
                    }
                }
                // Auto-set customer for presales — keeps Monday.com data consistent
                if (value === 'presales') {
                    next.customer = 'PRESALES';
                    if (!prev.workItem || prev.workItem === '') {
                        next.workItem = 'M.00556';
                    }
                }
                // Clear the auto-set customer if switching away from presales
                if (value !== 'presales' && prev.customer === 'PRESALES') {
                    next.customer = '';
                }
            }
            return next;
        });
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const reset = useCallback(() => {
        if (editEntry) {
            setValues(editEntry);
        } else {
            setValues({ ...defaultFormValues, ...(initialDate ? { date: initialDate } : {}) });
        }
        setError(null);
    }, [editEntry, initialDate]);

    const submit = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const activityValue = getActivityValue(values.activityType);
            const columnValues = {
                date4: { date: values.date },
                status: { index: activityValue },
                text__1: values.customer,
                text8__1: values.workItem,
                numbers__1: values.hours,
                text2__1: values.comment || '',
            };

            const itemName = `${values.customer || 'Unknown'} - ${values.workItem || 'N/A'} - ${values.hours}h`;

            if (editEntry?.id) {
                await updateItem(editEntry.id, boardId, columnValues);
            } else {
                await createItem(boardId, groupId, itemName, columnValues);
            }
            onSuccess(values);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }, [values, boardId, groupId, editEntry, onSuccess]);

    const handleDelete = useCallback(async (itemId: string) => {
        setSaving(true);
        setError(null);
        try {
            await deleteItem(itemId);
            // For delete the caller handles the optimistic patch; pass empty sentinel.
            onSuccess({ date: '', activityType: '', customer: '', workItem: '', hours: 0, comment: '' });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }, [onSuccess]);

    return { values, setField, saving, error, clearError, submit, reset, handleDelete };
}
