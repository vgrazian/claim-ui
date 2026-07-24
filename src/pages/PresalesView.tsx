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
  InlineLoading,
  ProgressBar,
} from '@carbon/react';
import { MondayUser, queryItems, ClaimEntry } from '../services/api';
import { itemToClaimEntry, formatDate } from '../services/claims';

const PRESALES_OPPORTUNITY_HOURS_LIMIT = 40;

interface Props {
  user: MondayUser;
  boardId: string;
  groupId: string;
}

export default function PresalesView({ user, boardId, groupId }: Props) {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<ClaimEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const presalesRows = useMemo(() => {
    const presales = claims.filter((c) => c.activityType === 'presales');
    const map = new Map<string, { opportunity: string; totalHours: number }>();

    presales.forEach((c) => {
      const opp = c.workItem || c.customer || 'Unknown';
      if (!map.has(opp)) {
        map.set(opp, { opportunity: opp, totalHours: 0 });
      }
      map.get(opp)!.totalHours += c.hours;
    });

    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [claims]);

  const grandTotal = presalesRows.reduce((s, r) => s + r.totalHours, 0);

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
            <strong>{t('presales.totalHours')}:</strong> {grandTotal}h{' '}
            {t('presales.limit', { limit: PRESALES_OPPORTUNITY_HOURS_LIMIT })}
            <ProgressBar
              value={Math.min((grandTotal / PRESALES_OPPORTUNITY_HOURS_LIMIT) * 100, 100)}
              max={100}
              label={`${grandTotal} / ${PRESALES_OPPORTUNITY_HOURS_LIMIT}h`}
              className="mt-2"
            />
          </Tile>

          {presalesRows.length === 0 ? (
            <Tile>{t('presales.noData')}</Tile>
          ) : (
            <DataTable
              rows={presalesRows.map((r) => ({ ...r, id: r.opportunity }))}
              headers={[
                { key: 'opportunity', header: t('presales.opportunity') },
                { key: 'totalHours', header: t('presales.totalHours') },
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
                    {rows.map((row) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        <TableCell>{row.cells[0].value}</TableCell>
                        <TableCell>
                          <Tag type="blue">{row.cells[1].value}h</Tag>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          )}
        </>
      )}
    </div>
  );
}
