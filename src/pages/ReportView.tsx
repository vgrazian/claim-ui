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
    Button,
    Tag,
    InlineLoading,
} from '@carbon/react';
import { Copy, TrashCan } from '@carbon/icons-react';
import { MondayUser, queryItems, ClaimEntry } from '../services/api';
import { itemToClaimEntry, getWeekStart, getWeekDates, formatDate } from '../services/claims';
import { useWeekNavigation } from '../hooks/useData';

interface Props {
    user: MondayUser;
    boardId: string;
    groupId: string;
}

interface ReportRow {
    customer: string;
    workItem: string;
    days: Map<string, number>;
    totalHours: number;
}

export default function ReportView({ user, boardId, groupId }: Props) {
    const { t } = useTranslation();
    const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekNavigation();
    const [claims, setClaims] = useState<ClaimEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
    }, [weekStart, boardId, groupId, user.id, weekDates]);

    useEffect(() => {
        loadClaims();
    }, [loadClaims]);

    const { reportRows, grandTotal, dailyTotals } = useMemo(() => {
        const map = new Map<string, ReportRow>();
        const dayTotals: Record<string, number> = {};
        claims.forEach((c) => {
            const key = `${c.customer}::${c.workItem}`;
            if (!map.has(key)) {
                map.set(key, { customer: c.customer, workItem: c.workItem, days: new Map(), totalHours: 0 });
            }
            const row = map.get(key)!;
            row.totalHours += c.hours;
            row.days.set(c.date, (row.days.get(c.date) || 0) + c.hours);
            dayTotals[c.date] = (dayTotals[c.date] || 0) + c.hours;
        });
        const rows = Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
        const total = rows.reduce((s, r) => s + r.totalHours, 0);
        return { reportRows: rows, grandTotal: total, dailyTotals: dayTotals };
    }, [claims]);

    const dayColumns = weekDates.map((d) => formatDate(d));
    const tableRows = reportRows.map((r, i) => ({
        id: `${r.customer}::${r.workItem}`,
        index: i,
        customer: r.customer,
        workItem: r.workItem,
        ...Object.fromEntries(dayColumns.map((d) => [d, r.days.get(d) || 0])),
        totalHours: r.totalHours,
    }));

    const headers = [
        { key: 'customer', header: t('report.customer') },
        { key: 'workItem', header: t('report.workItem') },
        ...dayColumns.map((d) => ({
            key: d,
            header: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })),
        { key: 'totalHours', header: t('report.totalHours') },
    ];

    const copyToClipboard = async (idx: number) => {
        const row = reportRows[idx];
        if (!row) return;
        const text = `${row.customer} - ${row.workItem}: ${row.totalHours}h`;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(idx);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch { }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('report.title')}</h2>
                <div className="page-header__actions">
                    <Button kind="ghost" onClick={goToPreviousWeek}>{t('week.previousWeek')}</Button>
                    <Button kind="ghost" onClick={goToNextWeek}>{t('week.nextWeek')}</Button>
                </div>
            </div>

            {loading && <InlineLoading description={t('app.loading')} />}
            {error && <Tile>{t('app.error')}: {error}</Tile>}

            {!loading && !error && reportRows.length === 0 && (
                <Tile>{t('report.noData')}</Tile>
            )}

            {reportRows.length > 0 && (
                <>
                    <Tile className="mb-4">
                        <strong>{t('report.totalHours')}:</strong> {grandTotal}h
                    </Tile>

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
                                                    className={header.key === 'totalHours' ? 'presales-total-col' : ''}
                                                >
                                                    {header.header}
                                                </TableHeader>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row) => {
                                            const idx = (row as any).index;
                                            return (
                                                <TableRow {...getRowProps({ row })} key={row.id}>
                                                    {row.cells.map((cell: any) => {
                                                        const isTotal = cell.info?.header === 'totalHours';
                                                        const isDay = dayColumns.includes(cell.info?.header);
                                                        return (
                                                            <TableCell key={cell.id}>
                                                                {isTotal ? (
                                                                    <div className="report-cell-actions">
                                                                        <Tag type="blue" size="sm">{cell.value}h</Tag>
                                                                        <Button
                                                                            kind="ghost"
                                                                            size="sm"
                                                                            hasIconOnly
                                                                            renderIcon={Copy}
                                                                            iconDescription={t('app.copy')}
                                                                            onClick={() => copyToClipboard(idx)}
                                                                        />
                                                                        {copiedIndex === idx && (
                                                                            <Tag type="green" size="sm">{t('app.copied')}</Tag>
                                                                        )}
                                                                    </div>
                                                                ) : isDay && cell.value > 0 ? (
                                                                    <span>{cell.value}h</span>
                                                                ) : isDay ? (
                                                                    <span className="presales-zero">-</span>
                                                                ) : (
                                                                    cell.value
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                    <tfoot>
                                        <TableRow className="report-totals-row">
                                            <TableCell colSpan={2}>
                                                <strong>{t('report.totalHours')}</strong>
                                            </TableCell>
                                            {dayColumns.map((d) => (
                                                <TableCell key={d}>
                                                    <strong>{dailyTotals[d] || 0}h</strong>
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <Tag type="blue">{grandTotal}h</Tag>
                                            </TableCell>
                                        </TableRow>
                                    </tfoot>
                                </Table>
                            )}
                        </DataTable>
                    </div>
                </>
            )}
        </div>
    );
}
