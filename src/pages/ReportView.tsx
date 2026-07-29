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
import { itemToClaimEntry, getWeekStart, getWeekDates, formatDate, getMonthGridDates } from '../services/claims';
import { useWeekNavigation } from '../hooks/useData';

interface Props {
    user: MondayUser;
    boardId: string;
    groupId: string;
}

interface ReportRow {
    customer: string;
    workItem: string;
    comment: string;
    days: Map<string, number>;
    totalHours: number;
}

export default function ReportView({ user, boardId, groupId }: Props) {
    const { t } = useTranslation();
    const { weekStart, setWeekStart, goToPreviousWeek, goToNextWeek } = useWeekNavigation();
    const [monthView, setMonthView] = useState(() => {
        return localStorage.getItem('claim-ui-report-month') === 'true';
    });
    const [claims, setClaims] = useState<ClaimEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [markedRows, setMarkedRows] = useState<Set<string>>(new Set());

    const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
    const monthDates = useMemo(() => getMonthGridDates(weekStart), [weekStart]);
    const queryDates = monthView ? monthDates : weekDates;

    const loadClaims = useCallback(async () => {
        setLoading(true);
        try {
            const dateFilter = queryDates.map((d) => formatDate(d));
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
    }, [weekStart, boardId, groupId, user.id, queryDates]);

    useEffect(() => {
        loadClaims();
    }, [loadClaims]);

    const { reportRows, grandTotal, dailyTotals } = useMemo(() => {
        const map = new Map<string, ReportRow>();
        const dayTotals: Record<string, number> = {};
        claims.forEach((c) => {
            const key = `${c.customer}::${c.workItem}::${c.comment || ''}`;
            if (!map.has(key)) {
                map.set(key, { customer: c.customer, workItem: c.workItem, comment: c.comment || '', days: new Map(), totalHours: 0 });
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

    const dayColumns = queryDates.map((d) => formatDate(d));
    const weekendDates = new Set(
        queryDates.filter((d) => d.getDay() === 0 || d.getDay() === 6).map((d) => formatDate(d))
    );
    const toggleMark = (key: string) => {
        setMarkedRows((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const tableRows = reportRows.map((r, i) => ({
        id: `${r.customer}::${r.workItem}::${r.comment}`,
        index: i,
        mark: false,
        customer: r.customer,
        workItem: r.workItem,
        comment: r.comment,
        ...Object.fromEntries(dayColumns.map((d) => [d, r.days.get(d) || 0])),
        totalHours: r.totalHours,
    }));

    const headers = [
        { key: 'mark', header: '' },
        { key: 'customer', header: t('report.customer') },
        { key: 'workItem', header: t('report.workItem') },
        { key: 'comment', header: 'Opp #' },
        ...dayColumns.map((d, i) => {
            const date = queryDates[i];
            const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return {
                key: d,
                header: (
                    <div className="report-header-cell">
                        <span className="report-header-weekday">{weekday}</span>
                        <span className="report-header-date">{dateStr}</span>
                    </div>
                ),
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
            };
        }),
        { key: 'totalHours', header: t('report.totalHours') },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('report.title')}</h2>
                <input
                    type="date"
                    className="quick-date-picker"
                    value={formatDate(weekStart)}
                    onChange={(e) => {
                        const d = new Date(e.target.value + 'T00:00:00');
                        setWeekStart(getWeekStart(d));
                    }}
                    title="Jump to date"
                />
                <div className="page-header__actions">
                    <Button kind="ghost" onClick={goToPreviousWeek}>{t('week.previousWeek')}</Button>
                    <Button kind="ghost" onClick={goToNextWeek}>{t('week.nextWeek')}</Button>
                    <Button
                        kind="ghost"
                        onClick={() => {
                            setMonthView((v) => {
                                const next = !v;
                                localStorage.setItem('claim-ui-report-month', String(next));
                                return next;
                            });
                        }}
                    >
                        {monthView ? t('settings.report.weekView') : t('settings.report.monthView')}
                    </Button>
                    {markedRows.size > 0 && (
                        <Button kind="danger--ghost" onClick={() => setMarkedRows(new Set())}>
                            {t('settings.clearMarks', { count: markedRows.size })}
                        </Button>
                    )}
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
                                            {hdrs.map((header) => {
                                                const isWeekend = (header as any).isWeekend;
                                                return (
                                                    <TableHeader
                                                        {...getHeaderProps({ header })}
                                                        key={header.key}
                                                        className={
                                                            (header.key === 'totalHours' ? 'presales-total-col ' : '') +
                                                            (isWeekend ? 'report-weekend-col' : '')
                                                        }
                                                    >
                                                        {header.header}
                                                    </TableHeader>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row) => {
                                            const idx = (row as any).index;
                                            return (
                                                <TableRow {...getRowProps({ row })} key={row.id}>
                                                    {row.cells.map((cell: any) => {
                                                        const isMark = cell.info?.header === 'mark';
                                                        const isTotal = cell.info?.header === 'totalHours';
                                                        const isWorkItem = cell.info?.header === 'workItem';
                                                        const isComment = cell.info?.header === 'comment';
                                                        const isDay = dayColumns.includes(cell.info?.header);
                                                        const isWeekend = isDay && weekendDates.has(cell.info?.header);
                                                        return (
                                                            <TableCell key={cell.id} className={isWeekend ? 'report-weekend-col' : ''}>
                                                                {isMark ? (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={markedRows.has((row as any).id)}
                                                                        onChange={() => toggleMark((row as any).id)}
                                                                    />
                                                                ) : isTotal ? (
                                                                    <Tag type="blue" size="sm">{cell.value}h</Tag>
                                                                ) : (isWorkItem || isComment) && cell.value ? (
                                                                    <div className="report-cell-actions">
                                                                        <span>{cell.value}</span>
                                                                        <Button
                                                                            kind="ghost"
                                                                            size="sm"
                                                                            hasIconOnly
                                                                            renderIcon={Copy}
                                                                            iconDescription={t('app.copy')}
                                                                            onClick={() => {
                                                                                copyToClipboard(cell.value);
                                                                                setCopiedText(cell.value);
                                                                            }}
                                                                        />
                                                                        {copiedText === cell.value && (
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
                                            <TableCell colSpan={4}>
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
