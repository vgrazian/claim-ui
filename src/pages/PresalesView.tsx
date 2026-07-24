import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Tile,
    Tag,
    Button,
    InlineLoading,
} from '@carbon/react';
import { Copy } from '@carbon/icons-react';
import { MondayUser, queryItems, ClaimEntry } from '../services/api';
import {
    itemToClaimEntry,
    formatDate,
    getWeekStart,
    getWeekDates,
} from '../services/claims';
import { useWeekNavigation } from '../hooks/useData';

const PRESALES_OPPORTUNITY_HOURS_LIMIT = 40;

interface Props {
    user: MondayUser;
    boardId: string;
    groupId: string;
}

interface DayEntry {
    date: string;
    hours: number;
}

interface OppRow {
    opportunity: string;
    days: Map<string, number>;
    totalHours: number;
    entries: DayEntry[];
}

export default function PresalesView({ user, boardId, groupId }: Props) {
    const { t } = useTranslation();
    const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekNavigation();
    const [claims, setClaims] = useState<ClaimEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedOpp, setCopiedOpp] = useState<string | null>(null);

    const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

    const loadClaims = useCallback(async () => {
        setLoading(true);
        try {
            const dateFilter = weekDates.map((d) => formatDate(d));
            const data = await queryItems(boardId, groupId, user.id, dateFilter);

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
    }, [boardId, groupId, user.id, weekDates]);

    useEffect(() => {
        loadClaims();
    }, [loadClaims]);

    // Pivot: rows by opportunity (comment), columns by day
    const { oppRows, grandTotal } = useMemo(() => {
        const presales = claims.filter((c) => c.activityType === 'presales');

        // Group by comment (opportunity number)
        const map = new Map<string, OppRow>();
        presales.forEach((c) => {
            const opp = (c.comment || c.customer || 'No opportunity #').trim();
            if (!map.has(opp)) {
                map.set(opp, {
                    opportunity: opp,
                    days: new Map(),
                    totalHours: 0,
                    entries: [],
                });
            }
            const row = map.get(opp)!;
            row.totalHours += c.hours;
            row.days.set(c.date, (row.days.get(c.date) || 0) + c.hours);
            row.entries.push({ date: c.date, hours: c.hours });
        });

        const rows = Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
        const total = rows.reduce((s, r) => s + r.totalHours, 0);

        return { oppRows: rows, grandTotal: total };
    }, [claims]);

    const copyOpp = async (opp: string) => {
        try {
            await navigator.clipboard.writeText(opp);
            setCopiedOpp(opp);
            setTimeout(() => setCopiedOpp(null), 2000);
        } catch {}
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('presales.title')}</h2>
                <div className="page-header__actions">
                    <Button kind="ghost" onClick={goToPreviousWeek}>{t('week.previousWeek')}</Button>
                    <Button kind="ghost" onClick={goToNextWeek}>{t('week.nextWeek')}</Button>
                </div>
            </div>

            {loading && <InlineLoading description={t('app.loading')} />}
            {error && <Tile>{t('app.error')}: {error}</Tile>}

            {!loading && !error && (
                <>
                    <Tile className="mb-4">
                        <strong>{t('presales.totalHours')}:</strong> {grandTotal.toFixed(1)}h
                    </Tile>

                    {oppRows.length === 0 ? (
                        <Tile>{t('presales.noData')}</Tile>
                    ) : (
                        <div className="presales-table-wrap">
                            <table className="presales-custom-table">
                                <thead>
                                    <tr>
                                        <th>{t('presales.opportunity')}</th>
                                        <th>Dates & Hours</th>
                                        <th className="presales-total-col">{t('presales.totalHours')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {oppRows.map((row) => {
                                        const sortedEntries = [...row.entries].sort(
                                            (a, b) => a.date.localeCompare(b.date)
                                        );
                                        const isError = row.totalHours > 24;
                                        return (
                                            <tr
                                                key={row.opportunity}
                                                className={isError ? 'presales-row--error' : ''}
                                            >
                                                <td>
                                                    <div className="presales-opp-cell">
                                                        <span>{row.opportunity}</span>
                                                        <Button
                                                            kind="ghost"
                                                            size="sm"
                                                            hasIconOnly
                                                            renderIcon={Copy}
                                                            iconDescription="Copy"
                                                            onClick={() => copyOpp(row.opportunity)}
                                                        />
                                                        {copiedOpp === row.opportunity && (
                                                            <Tag type="green" size="sm">Copied</Tag>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="presales-dates-list">
                                                        {sortedEntries.map((e, i) => (
                                                            <span key={i} className="presales-date-item">
                                                                {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                })}
                                                                : {e.hours}h
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Tag type={isError ? 'red' : 'blue'} size="sm">
                                                        {row.totalHours}h
                                                    </Tag>
                                                    {isError && (
                                                        <Tag type="red" size="sm" className="presales-error-label">
                                                            &gt;24h
                                                        </Tag>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
