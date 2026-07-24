import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Tile,
    DataTable,
    Table,
    TableHead,
    TableRow,
    TableHeader,
    TableBody,
    TableCell,
    Tag,
    Button,
    InlineLoading,
    ProgressBar,
} from '@carbon/react';
import { Copy } from '@carbon/icons-react';
import { MondayUser, queryItems, ClaimEntry } from '../services/api';
import { itemToClaimEntry, formatDate } from '../services/claims';

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
    const [claims, setClaims] = useState<ClaimEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedOpp, setCopiedOpp] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const today = formatDate(new Date());

    const loadClaims = useCallback(async () => {
        setLoading(true);
        try {
            const dates: string[] = [];
            const start = new Date(yearStart);
            const end = new Date(today);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(formatDate(new Date(d)));
            }

            const data = await queryItems(boardId, groupId, user.id, dates);

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
    }, [boardId, groupId, user.id, yearStart, today]);

    useEffect(() => {
        loadClaims();
    }, [loadClaims]);

    // Pivot: rows by opportunity (comment), columns by day
    const { oppRows, allDates, grandTotal } = useMemo(() => {
        const presales = claims.filter((c) => c.activityType === 'presales');

        // Collect unique dates (sorted)
        const dateSet = new Set<string>();
        presales.forEach((c) => dateSet.add(c.date));
        const sortedDates = Array.from(dateSet).sort();

        // Group by comment (opportunity number)
        const map = new Map<string, OppRow>();
        presales.forEach((c) => {
            const opp = (c.comment || c.workItem || c.customer || 'Unknown').trim();
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

        return { oppRows: rows, allDates: sortedDates, grandTotal: total };
    }, [claims]);

    const copyOpp = async (opp: string) => {
        try {
            await navigator.clipboard.writeText(opp);
            setCopiedOpp(opp);
            setTimeout(() => setCopiedOpp(null), 2000);
        } catch { }
    };

    const tableRows = oppRows.map((r) => ({
        id: r.opportunity,
        opportunity: r.opportunity,
        ...Object.fromEntries(allDates.map((d) => [d, r.days.get(d) || 0])),
        totalHours: r.totalHours,
    }));

    const headers = [
        { key: 'opportunity', header: t('presales.opportunity') },
        ...allDates.map((d) => ({
            key: d,
            header: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })),
        { key: 'totalHours', header: t('presales.totalHours') },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('presales.title')}</h2>
            </div>

            {loading && <InlineLoading description={t('app.loading')} />}
            {error && <Tile>{t('app.error')}: {error}</Tile>}

            {!loading && !error && (
                <>
                    <Tile className="mb-4">
                        <strong>{t('presales.totalHours')}:</strong> {grandTotal.toFixed(1)}h{' '}
                        {t('presales.limit', { limit: PRESALES_OPPORTUNITY_HOURS_LIMIT })}
                        <ProgressBar
                            value={Math.min((grandTotal / PRESALES_OPPORTUNITY_HOURS_LIMIT) * 100, 100)}
                            max={100}
                            label={`${grandTotal.toFixed(1)} / ${PRESALES_OPPORTUNITY_HOURS_LIMIT}h`}
                            className="mt-2"
                        />
                    </Tile>

                    {oppRows.length === 0 ? (
                        <Tile>{t('presales.noData')}</Tile>
                    ) : (
                        <div className="presales-table-wrap">
                            <DataTable rows={tableRows} headers={headers}>
                                {({ rows, headers: hdrs, getTableProps, getHeaderProps, getRowProps }) => (
                                    <Table {...getTableProps()} size="sm">
                                        <TableHead>
                                            <TableRow>
                                                {hdrs.map((header) => (
                                                    <TableHeader
                                                        {...getHeaderProps({ header })}
                                                        key={header.key}
                                                        className={
                                                            header.key === 'totalHours'
                                                                ? 'presales-total-col'
                                                                : ''
                                                        }
                                                    >
                                                        {header.header}
                                                    </TableHeader>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((row) => {
                                                const total = (row as any).totalHours;
                                                const isError = total > 24;
                                                return (
                                                    <TableRow
                                                        {...getRowProps({ row })}
                                                        key={row.id}
                                                        className={isError ? 'presales-row--error' : ''}
                                                    >
                                                        {row.cells.map((cell: any) => {
                                                            const val = cell.value;
                                                            const isTotal = cell.info?.header === 'totalHours';
                                                            const isDay = allDates.includes(cell.info?.header);
                                                            return (
                                                                <TableCell key={cell.id}>
                                                                    {cell.info?.header === 'opportunity' ? (
                                                                        <div className="presales-opp-cell">
                                                                            <span>{val}</span>
                                                                            <Button
                                                                                kind="ghost"
                                                                                size="sm"
                                                                                hasIconOnly
                                                                                renderIcon={Copy}
                                                                                iconDescription="Copy"
                                                                                onClick={() => copyOpp(val)}
                                                                            />
                                                                            {copiedOpp === val && (
                                                                                <Tag type="green" size="sm">Copied</Tag>
                                                                            )}
                                                                        </div>
                                                                    ) : isTotal ? (
                                                                        <span className={isError ? 'presales-error-tag' : ''}>
                                                                            <Tag type={isError ? 'red' : 'blue'} size="sm">
                                                                                {val}h
                                                                            </Tag>
                                                                            {isError && (
                                                                                <Tag type="red" size="sm" className="presales-error-label">
                                                                                    &gt;24h
                                                                                </Tag>
                                                                            )}
                                                                        </span>
                                                                    ) : isDay && val > 0 ? (
                                                                        <span>{val}h</span>
                                                                    ) : isDay ? (
                                                                        <span className="presales-zero">-</span>
                                                                    ) : (
                                                                        val
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </DataTable>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
