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
import { Copy, Bookmark, BookmarkFilled, TrashCan } from '@carbon/icons-react';
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
  totalHours: number;
  entries: ClaimEntry[];
}

export default function ReportView({ user, boardId, groupId }: Props) {
  const { t } = useTranslation();
  const { weekStart, goToPreviousWeek, goToNextWeek } = useWeekNavigation();
  const [claims, setClaims] = useState<ClaimEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markedItems, setMarkedItems] = useState<Set<string>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const dates = getWeekDates(weekStart);
      const dateFilter = dates.map((d) => formatDate(d));
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
  }, [weekStart, boardId, groupId, user.id]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const reportRows = useMemo(() => {
    const map = new Map<string, ReportRow>();
    claims.forEach((c) => {
      const key = `${c.customer}::${c.workItem}`;
      if (!map.has(key)) {
        map.set(key, { customer: c.customer, workItem: c.workItem, totalHours: 0, entries: [] });
      }
      const row = map.get(key)!;
      row.totalHours += c.hours;
      row.entries.push(c);
    });
    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [claims]);

  const grandTotal = reportRows.reduce((s, r) => s + r.totalHours, 0);

  const toggleMark = (key: string) => {
    setMarkedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const copyToClipboard = async (idx: number) => {
    const row = reportRows[idx];
    if (!row) return;
    const text = `${row.customer} - ${row.workItem}: ${row.totalHours}h\n` +
      row.entries.map((e) => `  ${e.date} - ${e.activityType}: ${e.hours}h`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {}
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t('report.title')}</h2>
        <div className="page-header__actions">
          <Button kind="ghost" onClick={goToPreviousWeek}>{t('week.previousWeek')}</Button>
          <Button kind="ghost" onClick={goToNextWeek}>{t('week.nextWeek')}</Button>
          {markedItems.size > 0 && (
            <Button
              kind="danger--ghost"
              renderIcon={TrashCan}
              onClick={() => setMarkedItems(new Set())}
            >
              {t('report.clearMarks')}
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

          <DataTable
            rows={reportRows.map((r, i) => ({
              ...r,
              id: `${r.customer}::${r.workItem}`,
              index: i,
            }))}
            headers={[
              { key: 'customer', header: t('report.customer') },
              { key: 'workItem', header: t('report.workItem') },
              { key: 'totalHours', header: t('report.totalHours') },
              { key: 'actions', header: '' },
            ]}
          >
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader {...getHeaderProps({ header })} key={header.key}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const idx = (row as any).index;
                    const key = `${row.cells[0].value}::${row.cells[1].value}`;
                    const isMarked = markedItems.has(key);
                    return (
                      <TableRow
                        {...getRowProps({ row })}
                        key={row.id}
                        className={isMarked ? 'report-row--marked' : ''}
                      >
                        <TableCell>{row.cells[0].value}</TableCell>
                        <TableCell>{row.cells[1].value}</TableCell>
                        <TableCell>
                          <Tag type="blue">{row.cells[2].value}h</Tag>
                          <div className="report-daily-breakdown">
                            {reportRows[idx]?.entries.map((e) => (
                              <span key={e.id} className="report-daily-item">
                                {e.date}: {e.hours}h
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="report-actions">
                            <Button
                              kind="ghost"
                              size="sm"
                              hasIconOnly
                              renderIcon={isMarked ? BookmarkFilled : Bookmark}
                              iconDescription={t('report.markItem')}
                              onClick={() => toggleMark(key)}
                            />
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </DataTable>
        </>
      )}
    </div>
  );
}
