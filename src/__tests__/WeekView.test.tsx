import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { changeLanguage: vi.fn(), language: 'en' },
    }),
}));

// Mock settings context
vi.mock('../context/SettingsContext', () => ({
    useSettings: () => ({
        settings: {
            language: 'en',
            boardId: '123',
            theme: 'light',
            showWeekendsDefault: false,
            userNameOverride: null,
        },
        updateSettings: vi.fn(),
        apiKeyStatus: 'found',
        setApiKey: vi.fn(),
        refreshApiKeyStatus: vi.fn(),
        apiKeyMasked: null,
    }),
    SettingsProvider: ({ children }: any) => children,
}));

// Mock the hooks
vi.mock('../hooks/useData', () => ({
    useWeekNavigation: () => ({
        weekStart: new Date(2025, 6, 21, 12),
        goToPreviousWeek: vi.fn(),
        goToNextWeek: vi.fn(),
        goToToday: vi.fn(),
    }),
    useClaims: () => ({
        claims: [
            {
                id: '1',
                date: '2025-07-21',
                activityType: 'billable',
                activityValue: 0,
                customer: 'Test Co',
                workItem: 'WI-001',
                hours: 8,
                comment: null,
            },
        ],
        loading: false,
        error: null,
        refresh: vi.fn(),
    }),
    useUser: () => ({ user: { id: 1, name: 'Test', email: 't@t.com' }, loading: false, error: null }),
    useBoard: () => ({ board: { groups: [{ id: 'g1', title: '2025' }] }, loading: false, error: null }),
}));

import WeekView from '../pages/WeekView';

function renderWithRouter() {
    return render(
        <BrowserRouter>
            <WeekView user={{ id: 1, name: 'Test User', email: 'test@test.com' }} boardId="123" groupId="g1" />
        </BrowserRouter>
    );
}

describe('WeekView', () => {
    it('should render week title', () => {
        renderWithRouter();
        expect(screen.getByText('week.title')).toBeDefined();
    });

    it('should render navigation buttons', () => {
        renderWithRouter();
        expect(screen.getByText('week.previousWeek')).toBeDefined();
        expect(screen.getByText('week.nextWeek')).toBeDefined();
        expect(screen.getByText('week.today')).toBeDefined();
        expect(screen.getByText('app.add')).toBeDefined();
        expect(screen.getByText('app.refresh')).toBeDefined();
    });

    it('should render day labels', () => {
        renderWithRouter();
        expect(screen.getByText('week.monday')).toBeDefined();
        expect(screen.getByText('week.tuesday')).toBeDefined();
        expect(screen.getByText('week.wednesday')).toBeDefined();
    });

    it('should show claim entry', () => {
        renderWithRouter();
        expect(screen.getByText('Test Co')).toBeDefined();
        // The activity type tag appears both in the summary and in entries
        const tags = screen.getAllByText('entry.activityTypes.billable');
        expect(tags.length).toBeGreaterThan(0);
    });
});
