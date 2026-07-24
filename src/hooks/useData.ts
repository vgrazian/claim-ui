import { useState, useEffect, useCallback } from 'react';
import { fetchUser, fetchBoard, queryItems, MondayUser, ClaimEntry } from '../services/api';
import { itemToClaimEntry, getWeekStart, getWeekDates, formatDate } from '../services/claims';
import { useSettings } from '../context/SettingsContext';

export function useUser() {
    const [user, setUser] = useState<MondayUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUser()
            .then(setUser)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return { user, loading, error };
}

export function useBoard(boardId: string) {
    const [board, setBoard] = useState<{ groups: Array<{ id: string; title: string }> } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!boardId) return;
        setLoading(true);
        fetchBoard(boardId)
            .then(setBoard)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [boardId]);

    return { board, loading, error };
}

export function useClaims(weekStart: Date, boardId: string, groupId: string, userId: number | null) {
    const [claims, setClaims] = useState<ClaimEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadClaims = useCallback(async () => {
        if (!boardId || !groupId || !userId) return;
        setLoading(true);
        try {
            const dates = getWeekDates(weekStart);
            const dateFilter = dates.map((d) => formatDate(d));
            const data = await queryItems(boardId, groupId, userId, dateFilter);

            const items = data?.data?.boards?.[0]?.groups?.[0]?.items_page?.items || [];
            const entries = items
                .map(itemToClaimEntry)
                .filter((e: ClaimEntry | null): e is ClaimEntry => e !== null);

            setClaims(entries);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [weekStart, boardId, groupId, userId]);

    useEffect(() => {
        loadClaims();
    }, [loadClaims]);

    return { claims, loading, error, refresh: loadClaims };
}

export function useWeekNavigation(initialDate?: Date) {
    const [weekStart, setWeekStart] = useState(() => getWeekStart(initialDate || new Date()));

    const goToPreviousWeek = useCallback(() => {
        setWeekStart((prev) => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 7);
            return d;
        });
    }, []);

    const goToNextWeek = useCallback(() => {
        setWeekStart((prev) => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 7);
            return d;
        });
    }, []);

    const goToToday = useCallback(() => {
        setWeekStart(getWeekStart(new Date()));
    }, []);

    return { weekStart, setWeekStart, goToPreviousWeek, goToNextWeek, goToToday };
}
