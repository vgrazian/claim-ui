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
    Tile,
} from '@carbon/react';
import { Calendar, Report, ChartLine, Settings } from '@carbon/icons-react';
import { useUser, useBoard } from './hooks/useData';
import { useSettings } from './context/SettingsContext';
import WeekView from './pages/WeekView';
import ReportView from './pages/ReportView';
import PresalesView from './pages/PresalesView';
import SettingsView from './pages/SettingsView';
import ApiKeySetup from './components/ApiKeySetup';

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="page-container">
            <Tile className="app-error-tile">
                <h3>Connection Error</h3>
                <p>{message}</p>
                <p className="app-error-hint">
                    Make sure the claim TUI is set up with a valid API key, then refresh.
                </p>
            </Tile>
        </div>
    );
}

export default function App() {
    const { t } = useTranslation();
    const { settings, apiKeyStatus } = useSettings();
    const { user, loading: userLoading, error: userError } = useUser();
    const { board, loading: boardLoading, error: boardError } = useBoard(settings.boardId);

    const loading = userLoading || boardLoading;
    const error = userError || boardError;
    const currentYear = new Date().getFullYear().toString();
    const groupId = board?.groups?.find((g) => g.title === currentYear)?.id || '';

    // Show API key setup panel when key is missing
    if (apiKeyStatus === 'not_found') {
        return (
            <Theme theme="g10">
                <ApiKeySetup />
            </Theme>
        );
    }

    return (
        <Theme theme="g10">
            <HeaderContainer
                render={() => (
                    <>
                        <Header aria-label={t('app.title')}>
                            <HeaderName prefix="">{t('app.title')}</HeaderName>
                            <HeaderNavigation aria-label={t('app.title')}>
                                <HeaderMenuItem as={NavLink} to="/week">
                                    <Calendar size={16} /> {t('nav.week')}
                                </HeaderMenuItem>
                                <HeaderMenuItem as={NavLink} to="/report">
                                    <Report size={16} /> {t('nav.report')}
                                </HeaderMenuItem>
                                <HeaderMenuItem as={NavLink} to="/presales">
                                    <ChartLine size={16} /> {t('nav.presales')}
                                </HeaderMenuItem>
                                <HeaderMenuItem as={NavLink} to="/settings">
                                    <Settings size={16} /> {t('nav.settings')}
                                </HeaderMenuItem>
                            </HeaderNavigation>
                        </Header>
                        <Content>
                            {loading ? (
                                <div className="app-loading">
                                    <Loading withOverlay={false} description={t('app.loading')} />
                                </div>
                            ) : error ? (
                                <ErrorBanner message={error} />
                            ) : (
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
                            )}
                        </Content>
                    </>
                )}
            />
        </Theme>
    );
}
