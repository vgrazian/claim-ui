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
    onSuccess: () => void,
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

    const setField = useCallback((field: keyof FormValues, value: string | number) => {
        setValues((prev) => {
            const next = { ...prev, [field]: value };
            // Auto-set workItem for vacation/work_reduction
            if (field === 'activityType' && (value === 'vacation' || value === 'work_reduction' || value === 'l104')) {
                if (!prev.workItem || prev.workItem === 'M.00556') {
                    next.workItem = 'M.00556';
                }
            }
            return next;
        });
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const reset = useCallback(() => {
        setValues(editEntry || defaultFormValues);
        setError(null);
    }, [editEntry]);

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
            onSuccess();
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
            onSuccess();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }, [onSuccess]);

    return { values, setField, saving, error, clearError, submit, reset, handleDelete };
}
