import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Settings {
    language: string;
    boardId: string;
    theme: 'light' | 'dark';
    showWeekendsDefault: boolean;
    userNameOverride: string | null;
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => void;
    apiKeyStatus: 'loading' | 'found' | 'not_found';
    setApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
    refreshApiKeyStatus: () => void;
    apiKeyMasked: string | null;
}

const defaultSettings: Settings = {
    language: 'en',
    boardId: '6500270039',
    theme: 'light',
    showWeekendsDefault: false,
    userNameOverride: null,
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    updateSettings: () => { },
    apiKeyStatus: 'loading',
    setApiKey: async () => ({ success: false }),
    refreshApiKeyStatus: () => { },
    apiKeyMasked: null,
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
            .catch(() => setApiKeyStatus('not_found'));
    }, []);

    const setApiKey = useCallback(async (key: string) => {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: key }),
            });
            const data = await res.json();
            if (data.success === false || data.error) {
                return { success: false, error: data.error || 'Failed to save API key' };
            }
            setApiKeyStatus(data.hasApiKey ? 'found' : 'not_found');
            setApiKeyMasked(data.apiKeyMasked || null);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
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
                refreshApiKeyStatus,
                apiKeyMasked,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}
