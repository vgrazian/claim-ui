import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Button,
    Tile,
    DataTable,
    Table,
    TableHead,
    TableRow,
    TableHeader,
    TableBody,
    TableCell,
    Tag,
    Modal,
    InlineLoading,
} from '@carbon/react';
import {
    ArrowLeft,
    ArrowRight,
    Add,
    Edit,
    TrashCan,
    Renew,
    View,
    ViewOff,
    List,
    Grid,
} from '@carbon/icons-react';
import { MondayUser } from '../services/api';
import { useWeekNavigation, useClaims, useBoard, useMonthlyL104 } from '../hooks/useData';
import { useEntryForm } from '../hooks/useEntryForm';
import { getWeekDates, formatDate, getActivityName, ACTIVITY_TYPE_KEYS } from '../services/claims';
import { useSettings } from '../context/SettingsContext';
import EntryFormModal from '../components/EntryFormModal';

interface Props {
    user: MondayUser;
    boardId: string;
    groupId: string;
}

export default function WeekView({ user, boardId, groupId }: Props) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { weekStart, goToPreviousWeek, goToNextWeek, goToToday } = useWeekNavigation();
    const { claims, loading, error, refresh } = useClaims(
        weekStart, boardId, groupId, user.id,
        monthView ? monthDates : undefined
    );
    const { l104Total, vacationTotal, l104Max } = useMonthlyL104(boardId, groupId, user.id);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
    const [editEntry, setEditEntry] = useState<any>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showWeekends, setShowWeekends] = useState(settings.showWeekendsDefault);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [monthView, setMonthView] = useState(false);

    const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
    const monthDates = useMemo(() => {
        const now = new Date(weekStart);
        const year = now.getFullYear();
        const month = now.getMonth();
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const dates: Date[] = [];
        for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }
        return dates;
    }, [weekStart]);

    const queryDates = monthView ? monthDates : weekDates;

    const claimsByDate = useMemo(() => {
        const map: Record<string, typeof claims> = {};
        queryDates.forEach((d) => {
            map[formatDate(d)] = [];
        });
        claims.forEach((c) => {
            if (map[c.date] !== undefined) {
                map[c.date].push(c);
            }
        });
        return map;
    }, [claims, queryDates]);

    const visibleDates = useMemo(
        () => showWeekends ? queryDates : queryDates.filter((d) => d.getDay() !== 0 && d.getDay() !== 6),
        [queryDates, showWeekends]
    );

    const onFormSuccess = useCallback(() => {
        setFormMode(null);
        setEditEntry(null);
        refresh();
    }, [refresh]);

    // Recent entries for quick-select
    const recentEntries = useMemo(() => {
        const seen = new Set<string>();
        const result: Array<{ customer: string; workItem: string }> = [];
        for (const c of [...claims].reverse()) {
            if (!c.customer || !c.workItem) continue;
            const key = `${c.customer}::${c.workItem}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push({ customer: c.customer, workItem: c.workItem });
            }
        }
        return result.slice(0, 10);
    }, [claims]);

    const { values, setField, saving, error: formError, submit, handleDelete } = useEntryForm(
        boardId,
        groupId,
        user.id,
        onFormSuccess,
        editEntry
    );

    const dayLabels = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const visibleDates = useMemo(
        () => showWeekends ? weekDates : weekDates.slice(0, 5),
        [weekDates, showWeekends]
    );

    // Summary: hours per activity type for the week
    const activitySummary = useMemo(() => {
        const summary: Record<string, number> = {};
        claims.forEach((c) => {
            summary[c.activityType] = (summary[c.activityType] || 0) + c.hours;
        });
        return Object.entries(summary)
            .filter(([, hours]) => hours > 0)
            .sort(([, a], [, b]) => b - a);
    }, [claims]);

    const weekTotalHours = useMemo(
        () => claims.reduce((sum, c) => sum + c.hours, 0),
        [claims]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (formMode) return;
            switch (e.key) {
                case 'ArrowLeft':
                    goToPreviousWeek();
                    break;
                case 'ArrowRight':
                    goToNextWeek();
                    break;
                case 'a':
                    setFormMode('add');
                    setEditEntry(null);
                    break;
                case 't':
                    goToToday();
                    break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [goToPreviousWeek, goToNextWeek, goToToday, formMode]);

    if (error) {
        return (
            <div className="page-container">
                <Tile>{t('app.error')}: {error}</Tile>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('week.title')}</h2>
                <div className="page-header__actions">
                    <Button kind="ghost" renderIcon={ArrowLeft} onClick={goToPreviousWeek}>
                        {t('week.previousWeek')}
                    </Button>
                    <Button kind="ghost" onClick={goToToday}>{t('week.today')}</Button>
                    <Button kind="ghost" renderIcon={ArrowRight} onClick={goToNextWeek}>
                        {t('week.nextWeek')}
                    </Button>
                    <Button
                        kind="ghost"
                        onClick={() => setMonthView((v) => !v)}
                    >
                        {monthView ? 'Week view' : 'Month view'}
                    </Button>
                    <Button
                        kind="ghost"
                        renderIcon={viewMode === 'grid' ? List : Grid}
                        onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
                    >
                        {viewMode === 'grid' ? 'List view' : 'Grid view'}
                    </Button>
                    <Button
                        kind="ghost"
                        renderIcon={showWeekends ? ViewOff : View}
                        onClick={() => setShowWeekends((v) => !v)}
                    >
                        {showWeekends ? 'Hide weekends' : 'Show weekends'}
                    </Button>
                    <Button kind="tertiary" renderIcon={Renew} onClick={refresh}>
                        {t('app.refresh')}
                    </Button>
                    <Button
                        renderIcon={Add}
                        onClick={() => {
                            setFormMode('add');
                            setEditEntry(null);
                            setSelectedDate(formatDate(new Date()));
                        }}
                    >
                        {t('app.add')}
                    </Button>
                </div>
            </div>

            {loading && <InlineLoading description={t('app.loading')} />}

            {/* Activity summary */}
            {activitySummary.length > 0 && (
                <Tile className="week-summary">
                    <div className="week-summary__items">
                        {activitySummary.map(([type, hours]) => (
                            <div key={type} className="week-summary__item">
                                <Tag type="green" size="sm">
                                    {t(`entry.activityTypes.${type}`, type)}
                                </Tag>
                                <span className="week-summary__hours">{hours}h</span>
                            </div>
                        ))}
                        <div className="week-summary__item week-summary__total">
                            <strong>{t('week.totalHours')}</strong>
                            <span className="week-summary__hours">{weekTotalHours}h</span>
                        </div>
                        <div className="week-summary__item week-summary__l104">
                            <Tag type="teal" size="sm">Vacation</Tag>
                            <span className="week-summary__hours">{vacationTotal}h</span>
                        </div>
                        <div className="week-summary__item week-summary__l104">
                            <Tag type={l104Total > l104Max ? 'red' : 'teal'} size="sm">
                                L.104
                            </Tag>
                            <span className="week-summary__hours">
                                {l104Total}/{l104Max}h
                            </span>
                        </div>
                    </div>
                </Tile>
            )}

            <div className={`week-grid week-grid--${showWeekends ? '7' : '5'}cols ${viewMode === 'list' ? 'week-grid--list' : ''} ${monthView ? 'week-grid--month' : ''}`}>
                {visibleDates.map((date, i) => {
                    const dateStr = formatDate(date);
                    const dayClaims = claimsByDate[dateStr] || [];
                    const totalHours = dayClaims.reduce((sum, c) => sum + c.hours, 0);
                    const isToday = dateStr === formatDate(new Date());

                    return (
                        <Tile
                            key={dateStr}
                            className={`week-day-tile ${isToday ? 'week-day-tile--today' : ''}`}
                        >
                            <div className="week-day-header">
                                <span className="week-day-label">{t(`week.${dayLabels[i]}`)}</span>
                                <span className="week-day-date">
                                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                {totalHours > 0 && (
                                    <Tag type="blue" size="sm">{totalHours}h</Tag>
                                )}
                            </div>
                            <div className="week-day-entries">
                                {dayClaims.length === 0 ? (
                                    <p className="week-day-empty">{t('week.noEntries')}</p>
                                ) : (
                                    dayClaims.map((claim) => (
                                        <div key={claim.id} className="week-entry">
                                            <div className="week-entry__row">
                                                <div className="week-entry__info">
                                                    <Tag type="green" size="sm">
                                                        {t(`entry.activityTypes.${claim.activityType}`, claim.activityType)}
                                                    </Tag>
                                                    <span className="week-entry__customer">{claim.customer}</span>
                                                    <span className="week-entry__hours">{claim.hours}h</span>
                                                </div>
                                                <div className="week-entry__actions">
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        renderIcon={Edit}
                                                        iconDescription={t('app.edit')}
                                                        onClick={() => {
                                                            setEditEntry({
                                                                id: claim.id,
                                                                date: claim.date,
                                                                activityType: claim.activityType,
                                                                customer: claim.customer,
                                                                workItem: claim.workItem,
                                                                hours: claim.hours,
                                                                comment: claim.comment || '',
                                                            });
                                                            setFormMode('edit');
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        renderIcon={TrashCan}
                                                        iconDescription={t('app.delete')}
                                                        onClick={() => setDeleteConfirmId(claim.id)}
                                                    />
                                                </div>
                                            </div>
                                            {claim.comment && (
                                                <div className="week-entry__comment" title={claim.comment}>
                                                    {claim.comment}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <Button
                                kind="ghost"
                                size="sm"
                                className="week-day-add"
                                onClick={() => {
                                    setFormMode('add');
                                    setEditEntry(null);
                                    setSelectedDate(dateStr);
                                }}
                            >
                                + {t('app.add')}
                            </Button>
                        </Tile>
                    );
                })}
            </div>

            {formMode && (
                <EntryFormModal
                    mode={formMode}
                    values={values}
                    setField={setField}
                    recentEntries={recentEntries}
                    saving={saving}
                    error={formError}
                    onSubmit={submit}
                    onClose={() => {
                        setFormMode(null);
                        setEditEntry(null);
                    }}
                />
            )}

            {deleteConfirmId && (
                <Modal
                    open
                    modalHeading={t('entry.deleteTitle')}
                    primaryButtonText={t('app.delete')}
                    secondaryButtonText={t('app.cancel')}
                    danger
                    onRequestClose={() => setDeleteConfirmId(null)}
                    onRequestSubmit={() => {
                        handleDelete(deleteConfirmId);
                        setDeleteConfirmId(null);
                    }}
                >
                    <p>{t('entry.deleteConfirm')}</p>
                </Modal>
            )}
        </div>
    );
}
