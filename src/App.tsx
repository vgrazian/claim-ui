import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Theme,
    Header,
    HeaderContainer,
    HeaderName,
    HeaderNavigation,
    HeaderMenuItem,
    Content,
    Loading,
} from '@carbon/react';
import { Calendar, Report, ChartLine, Settings } from '@carbon/icons-react';
import { useUser, useBoard } from './hooks/useData';
import { useSettings } from './context/SettingsContext';
import WeekView from './pages/WeekView';
import ReportView from './pages/ReportView';
import PresalesView from './pages/PresalesView';
import SettingsView from './pages/SettingsView';

export default function App() {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { user, loading: userLoading, error: userError } = useUser();
    const { board, loading: boardLoading, error: boardError } = useBoard(settings.boardId);

    const loading = userLoading || boardLoading;
    const error = userError || boardError;

    if (loading) {
        return (
            <Theme theme="g10">
                <div className="app-loading">
                    <Loading withOverlay={false} description={t('app.loading')} />
                </div>
            </Theme>
        );
    }

    if (error) {
        return (
            <Theme theme="g10">
                <div className="app-error">
                    <h2>{t('app.error')}</h2>
                    <p>{error}</p>
                </div>
            </Theme>
        );
    }

    const currentYear = new Date().getFullYear().toString();
    const groupId = board?.groups?.find((g) => g.title === currentYear)?.id || '';

    return (
        <Theme theme="g10">
            <HeaderContainer
                render={({ isSideNavExpanded, onClickSideNavExpand }) => (
                    <>
                        <Header aria-label={t('app.title')}>
                            <HeaderName prefix="">{t('app.title')}</HeaderName>
                            <HeaderNavigation aria-label={t('app.title')}>
                                <HeaderMenuItem as={NavLink} to="/week" isActive={false}>
                                    <Calendar size={16} /> {t('nav.week')}
                                </HeaderMenuItem>
                                <HeaderMenuItem as={NavLink} to="/report" isActive={false}>
                                    <Report size={16} /> {t('nav.report')}
                                </HeaderMenuItem>
                                <HeaderMenuItem as={NavLink} to="/presales" isActive={false}>
                                    <ChartLine size={16} /> {t('nav.presales')}
                                </HeaderMenuItem>
                                <HeaderMenuItem as={NavLink} to="/settings" isActive={false}>
                                    <Settings size={16} /> {t('nav.settings')}
                                </HeaderMenuItem>
                            </HeaderNavigation>
                        </Header>
                        <Content>
                            <Routes>
                                <Route path="/" element={<Navigate to="/week" replace />} />
                                <Route
                                    path="/week"
                                    element={
                                        <WeekView
                                            user={user!}
                                            boardId={settings.boardId}
                                            groupId={groupId}
                                        />
                                    }
                                />
                                <Route
                                    path="/report"
                                    element={
                                        <ReportView
                                            user={user!}
                                            boardId={settings.boardId}
                                            groupId={groupId}
                                        />
                                    }
                                />
                                <Route
                                    path="/presales"
                                    element={
                                        <PresalesView
                                            user={user!}
                                            boardId={settings.boardId}
                                            groupId={groupId}
                                        />
                                    }
                                />
                                <Route path="/settings" element={<SettingsView />} />
                            </Routes>
                        </Content>
                    </>
                )}
            />
        </Theme>
    );
}
