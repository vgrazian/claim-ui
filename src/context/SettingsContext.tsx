import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Settings {
    language: string;
    boardId: string;
    theme: 'light' | 'dark';
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => void;
    apiKeyStatus: 'loading' | 'found' | 'not_found';
}

const defaultSettings: Settings = {
    language: 'en',
    boardId: '6500270039',
    theme: 'light',
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    updateSettings: () => { },
    apiKeyStatus: 'loading',
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

    const updateSettings = useCallback((partial: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...partial };
            localStorage.setItem('claim-ui-settings', JSON.stringify(next));
            if (partial.language) {
                i18n.changeLanguage(partial.language);
            }
            return next;
        });
    }, [i18n]);

    useEffect(() => {
        i18n.changeLanguage(settings.language);
    }, []);

    useEffect(() => {
        fetch('/api/health')
            .then((r) => r.json())
            .then((data) => {
                setApiKeyStatus(data.hasApiKey ? 'found' : 'not_found');
            })
            .catch(() => setApiKeyStatus('not_found'));
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, apiKeyStatus }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}
