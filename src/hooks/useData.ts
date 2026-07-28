import { useState, useEffect, useCallback } from 'react';
import { fetchUser, fetchBoard, queryItems, fetchRecentTemplates, MondayUser, ClaimEntry, RecentTemplate } from '../services/api';
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

export function useClaims(
    weekStart: Date,
    boardId: string,
    groupId: string,
    userId: number | null,
    customDates?: Date[]
) {
    const [claims, setClaims] = useState<ClaimEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadClaims = useCallback(async () => {
        if (!boardId || !groupId || !userId) return;
        setLoading(true);
        try {
            const dates = customDates || getWeekDates(weekStart);
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
    }, [weekStart, boardId, groupId, userId, customDates]);

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

export function useMonthlyL104(boardId: string, groupId: string, userId: number | null) {
    const [l104Total, setL104Total] = useState<number>(0);
    const [vacationTotal, setVacationTotal] = useState<number>(0);
    const L104_MAX = 24;

    useEffect(() => {
        if (!boardId || !groupId || !userId) return;

        // Query without date filter — get all items and filter client-side
        queryItems(boardId, groupId, userId)
            .then((data) => {
                const items = data?.data?.boards?.[0]?.groups?.[0]?.items_page?.items || [];
                const entries = items
                    .map(itemToClaimEntry)
                    .filter((e: ClaimEntry | null): e is ClaimEntry => e !== null);

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const thisMonth = entries.filter((e) => {
                    const d = new Date(e.date + 'T00:00:00');
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                const l104 = thisMonth
                    .filter((e) => e.activityType === 'l104')
                    .reduce((sum, e) => sum + e.hours, 0);
                const vacation = thisMonth
                    .filter((e) => e.activityType === 'vacation')
                    .reduce((sum, e) => sum + e.hours, 0);
                setL104Total(l104);
                setVacationTotal(vacation);
            })
            .catch(() => { });
    }, [boardId, groupId, userId]);

    return { l104Total, vacationTotal, l104Max: L104_MAX };
}

export function useRecentTemplates(
    boardId: string,
    groupId: string,
    userId: number | null,
    lookbackWeeks: number = 4
) {
    const [templates, setTemplates] = useState<RecentTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const days = lookbackWeeks * 7;

    const load = useCallback(async () => {
        if (!boardId || !groupId || !userId) return;
        setLoading(true);
        try {
            const data = await fetchRecentTemplates(boardId, groupId, userId, days);
            setTemplates(data);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [boardId, groupId, userId, days]);

    useEffect(() => {
        load();
    }, [load]);

    return { templates, loading, error, refresh: load };
}
