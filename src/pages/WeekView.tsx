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
import { useWeekNavigation, useClaims, useBoard, useMonthlyL104, useRecentTemplates } from '../hooks/useData';
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
    const { weekStart, setWeekStart, goToPreviousWeek, goToNextWeek, goToToday } = useWeekNavigation();
    const [showWeekends, setShowWeekends] = useState(settings.showWeekendsDefault);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [monthView, setMonthView] = useState(() => {
        return localStorage.getItem('claim-ui-month-view') === 'true';
    });
    const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // Persist month view setting
    useEffect(() => {
        localStorage.setItem('claim-ui-month-view', String(monthView));
    }, [monthView]);

    const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
    const monthDates = useMemo(() => {
        const now = new Date(weekStart);
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        // Start from the Monday of the week containing the 1st
        const day = first.getDay();
        const start = new Date(first);
        start.setDate(first.getDate() - (day === 0 ? 6 : day - 1));
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const dates: Date[] = [];
        for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }
        return dates;
    }, [weekStart]);
    const queryDates = monthView ? monthDates : weekDates;

    const { claims, loading, error, refresh } = useClaims(
        weekStart, boardId, groupId, user.id,
        monthView ? monthDates : undefined
    );
    const { l104Total, vacationTotal, l104Max } = useMonthlyL104(boardId, groupId, user.id);
    const { templates: recentTemplates } = useRecentTemplates(
        boardId, groupId, user.id, settings.recentWeeksLookback
    );
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
    const [editEntry, setEditEntry] = useState<any>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

    const { values, setField, saving, error: formError, submit, handleDelete, reset } = useEntryForm(
        boardId,
        groupId,
        user.id,
        onFormSuccess,
        editEntry
    );

    const dayLabels = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const getDayLabel = (date: Date) => dayLabels[date.getDay() === 0 ? 6 : date.getDay() - 1];

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

    const weekL104Total = useMemo(
        () => claims.filter((c) => c.activityType === 'l104').reduce((sum, c) => sum + c.hours, 0),
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
                <div>
                    <div className="page-header__actions">
                        <Button kind="ghost" renderIcon={ArrowLeft} onClick={goToPreviousWeek}>
                            {t('week.previousWeek')}
                        </Button>
                        <Button kind="ghost" onClick={goToToday}>{t('week.today')}</Button>
                        <Button kind="ghost" renderIcon={ArrowRight} onClick={goToNextWeek}>
                            {t('week.nextWeek')}
                        </Button>
                        <Button kind="tertiary" renderIcon={Renew} onClick={() => { refresh(); setLastRefresh(new Date()); }}>
                            {t('app.refresh')}
                        </Button>
                        <span className="last-updated" title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}>
                            {lastRefresh.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
                    <div className="page-header__actions">
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
                    </div>
                </div>
            </div>

            {loading && <InlineLoading description={t('app.loading')} />}

            {/* Activity summary */}
            {
                activitySummary.length > 0 && (
                    <Tile className="week-summary">
                        <div className="week-summary__items">
                            {activitySummary.filter(([type]) => type !== 'l104').map(([type, hours]) => (
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
                                <div className="week-summary__l104-stack">
                                    <span>week {weekL104Total}h</span>
                                    <span>month {l104Total}/{l104Max}h</span>
                                </div>
                            </div>
                        </div>
                    </Tile>
                )
            }

            <div className={`week-grid week-grid--${showWeekends ? '7' : '5'}cols ${viewMode === 'list' ? 'week-grid--list' : ''} ${monthView ? 'week-grid--month' : ''}`}>
                {visibleDates.map((date, i) => {
                    const dateStr = formatDate(date);
                    const dayClaims = claimsByDate[dateStr] || [];
                    const totalHours = dayClaims.reduce((sum, c) => sum + c.hours, 0);
                    const isToday = dateStr === formatDate(new Date());

                    return (
                        <Tile
                            key={dateStr}
                            className={`week-day-tile ${isToday ? 'week-day-tile--today' : ''} ${monthView ? 'week-day-tile--compact' : ''} ${monthView && selectedDayDetail === dateStr ? 'week-day-tile--selected' : ''}`}
                            onClick={monthView ? () => setSelectedDayDetail(dateStr) : undefined}
                        >
                            <div className="week-day-header">
                                <span className="week-day-label">{t(`week.${getDayLabel(date)}`)}</span>
                                <span className="week-day-date">
                                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                {totalHours > 0 && (
                                    <Tag type="blue" size="sm">{totalHours}h</Tag>
                                )}
                            </div>
                            {!monthView && (
                                <>
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormMode('add');
                                            setEditEntry(null);
                                            setSelectedDate(dateStr);
                                        }}
                                    >
                                        + {t('app.add')}
                                    </Button>
                                </>
                            )}
                        </Tile>
                    );
                })}
            </div>


            {/* Month view: detail panel for clicked day */}
            {monthView && selectedDayDetail && claimsByDate[selectedDayDetail] && (
                <Tile className="month-detail-panel">
                    <div className="month-detail-header">
                        <h4>{new Date(selectedDayDetail + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                        <Button kind="ghost" size="sm" onClick={() => setSelectedDayDetail(null)}>Close</Button>
                    </div>
                    {(claimsByDate[selectedDayDetail] || []).map((claim) => (
                        <div key={claim.id} className="week-entry month-detail-entry">
                            <div className="week-entry__row">
                                <div className="week-entry__info">
                                    <Tag type="green" size="sm">
                                        {t(`entry.activityTypes.${claim.activityType}`, claim.activityType)}
                                    </Tag>
                                    <span>{claim.customer} / {claim.workItem}</span>
                                    <span className="week-entry__hours">{claim.hours}h</span>
                                </div>
                                <div className="week-entry__actions">
                                    <Button kind="ghost" size="sm" hasIconOnly renderIcon={Edit} iconDescription={t('app.edit')}
                                        onClick={() => { setEditEntry({ id: claim.id, date: claim.date, activityType: claim.activityType, customer: claim.customer, workItem: claim.workItem, hours: claim.hours, comment: claim.comment || '' }); setFormMode('edit'); }} />
                                    <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription={t('app.delete')}
                                        onClick={() => setDeleteConfirmId(claim.id)} />
                                </div>
                            </div>
                            {claim.comment && <div className="week-entry__comment">{claim.comment}</div>}
                        </div>
                    ))}
                </Tile>
            )}

            {
                formMode && (
                    <EntryFormModal
                        mode={formMode}
                        values={values}
                        setField={setField}
                        recentTemplates={recentTemplates}
                        saving={saving}
                        error={formError}
                        onSubmit={submit}
                        onClose={() => {
                            setFormMode(null);
                            setEditEntry(null);
                            reset();
                        }}
                    />
                )
            }

            {
                deleteConfirmId && (
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
                )
            }
        </div >
    );
}
