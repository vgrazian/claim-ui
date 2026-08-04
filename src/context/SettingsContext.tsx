import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Settings {
    language: string;
    boardId: string;
    theme: 'light' | 'dark';
    showWeekendsDefault: boolean;
    recentWeeksLookback: number;
    userNameOverride: string | null;
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => void;
    apiKeyStatus: 'loading' | 'found' | 'not_found';
    setApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
    clearApiKey: () => Promise<void>;
    refreshApiKeyStatus: () => void;
    apiKeyMasked: string | null;
    apiUserName: string | null;
    apiUserEmail: string | null;
    setApiUser: (name: string, email: string) => void;
}

const defaultSettings: Settings = {
    language: 'en',
    boardId: '6500270039',
    theme: 'light',
    showWeekendsDefault: false,
    recentWeeksLookback: 4,
    userNameOverride: null,
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    updateSettings: () => { },
    apiKeyStatus: 'loading',
    setApiKey: async () => ({ success: false }),
    clearApiKey: async () => { },
    refreshApiKeyStatus: () => { },
    apiKeyMasked: null, apiUserName: null,
    apiUserEmail: null,
    setApiUser: () => { },
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation();
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const stored = localStorage.getItem('claim-ui-settings');
            if (stored) {
                return { ...defaultSettings, ...JSON.parse(stored) };
            }
        } catch { }
        return defaultSettings;
    });
    const [apiKeyStatus, setApiKeyStatus] = useState<'loading' | 'found' | 'not_found'>('loading');
    const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
    const [apiUserName, setApiUserName] = useState<string | null>(null);
    const [apiUserEmail, setApiUserEmail] = useState<string | null>(null);

    const setApiUser = useCallback((name: string, email: string) => {
        setApiUserName(name);
        setApiUserEmail(email);
    }, []);

    const updateSettings = useCallback(
        (partial: Partial<Settings>) => {
            setSettings((prev) => {
                const next = { ...prev, ...partial };
                localStorage.setItem('claim-ui-settings', JSON.stringify(next));
                if (partial.language) {
                    i18n.changeLanguage(partial.language);
                }
                return next;
            });

            // Sync showWeekendsDefault to backend
            if ('showWeekendsDefault' in partial) {
                fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ showWeekendsDefault: partial.showWeekendsDefault }),
                }).catch(() => { });
            }
        },
        [i18n]
    );

    const refreshApiKeyStatus = useCallback(() => {
        let attempt = 0;
        const maxRetries = 3;

        const tryFetch = () => {
            fetch('/api/config')
                .then((r) => r.json())
                .then((data) => {
                    setApiKeyStatus(data.hasApiKey ? 'found' : 'not_found');
                    setApiKeyMasked(data.apiKeyMasked || null);
                    if (data.userNameOverride !== undefined) {
                        setSettings((prev) => ({
                            ...prev,
                            userNameOverride: data.userNameOverride,
                        }));
                    }
                    if (data.showWeekendsDefault !== undefined) {
                        setSettings((prev) => ({
                            ...prev,
                            showWeekendsDefault: data.showWeekendsDefault,
                        }));
                    }
                })
                .catch(() => {
                    attempt++;
                    if (attempt < maxRetries) {
                        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                        console.warn('Config fetch failed, retrying in ' + (delay / 1000) + 's (attempt ' + attempt + '/' + maxRetries + ')');
                        setTimeout(tryFetch, delay);
                    } else {
                        // All retries exhausted — keep current state;
                        // the key may still be valid, the server is just unreachable.
                        console.error('Failed to check API key status after retries');
                    }
                });
        };

        tryFetch();
    }, []);

    const setApiKey = useCallback(async (key: string) => {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: key }),
            });
            const data = await res.json();
            if (data.success === false || data.error || !data.hasApiKey) {
                console.error('[setApiKey] server rejected:', data);
                return { success: false, error: data.error || 'Failed to save API key (server did not persist it)' };
            }
            console.log('[setApiKey] key persisted, hasApiKey=true, masked:', data.apiKeyMasked);
            setApiKeyStatus('found');
            setApiKeyMasked(data.apiKeyMasked || null);
            return { success: true };
        } catch (e: any) {
            console.error('[setApiKey] network error:', e.message);
            return { success: false, error: e.message };
        }
    }, []);

    const clearApiKey = useCallback(async () => {
        try {
            const res = await fetch('/api/config', { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
                console.log('[clearApiKey] server confirmed key removed');
                setApiKeyStatus('not_found');
                setApiKeyMasked(null);
            } else {
                console.error('[clearApiKey] server refused:', { ok: res.ok, data });
            }
        } catch (e) {
            console.error('[clearApiKey] network error:', e);
        }
    }, []);

    useEffect(() => {
        i18n.changeLanguage(settings.language);
    }, []);

    useEffect(() => {
        refreshApiKeyStatus();
    }, [refreshApiKeyStatus]);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                updateSettings,
                apiKeyStatus,
                setApiKey,
                clearApiKey,
                refreshApiKeyStatus,
                apiKeyMasked,
                apiUserName,
                apiUserEmail,
                setApiUser,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}
