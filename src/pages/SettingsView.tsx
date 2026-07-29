import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Tile,
    Dropdown,
    Toggle,
    Tag,
    TextInput,
    Button,
    InlineNotification,
    NumberInput,
} from '@carbon/react';
import { useSettings } from '../context/SettingsContext';

// Capture the browser's beforeinstallprompt event so we can replay it on demand.
// The event fires once on page load; we must store it before it is consumed.
let deferredInstallPrompt: Event & { prompt?: () => void } | null = null;
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e as Event & { prompt?: () => void };
    });
}

export default function SettingsView() {
    const { t } = useTranslation();
    const {
        settings,
        updateSettings,
        apiKeyStatus,
        setApiKey,
        apiUserName,
        apiUserEmail,
    } = useSettings();
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [savingKey, setSavingKey] = useState(false);
    const [keyError, setKeyError] = useState<string | null>(null);
    const [keySuccess, setKeySuccess] = useState(false);
    const [installPromptAvailable, setInstallPromptAvailable] = useState(!!deferredInstallPrompt);

    // Track when the deferred prompt becomes available after component mounts
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            deferredInstallPrompt = e as Event & { prompt?: () => void };
            setInstallPromptAvailable(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const languageItems = [
        { id: 'en', text: 'English' },
        { id: 'it', text: 'Italiano' },
    ];

    const handleSaveKey = async () => {
        if (!apiKeyInput.trim()) {
            setKeyError('Please enter an API key.');
            return;
        }
        setSavingKey(true);
        setKeyError(null);
        setKeySuccess(false);
        const result = await setApiKey(apiKeyInput.trim());
        setSavingKey(false);
        if (result.success) {
            setKeySuccess(true);
            setApiKeyInput('');
            setTimeout(() => setKeySuccess(false), 3000);
        } else {
            setKeyError(result.error || 'Failed to save API key.');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('settings.title')}</h2>
            </div>

            <div className="settings-grid">
                <Tile className="settings-tile">
                    <h3>{t('settings.language')}</h3>
                    <Dropdown
                        id="settings-language"
                        titleText={t('settings.language')}
                        label={languageItems.find((l) => l.id === settings.language)?.text || 'English'}
                        items={languageItems}
                        selectedItem={languageItems.find((l) => l.id === settings.language)}
                        itemToString={(item) => (item ? item.text : '')}
                        onChange={({ selectedItem }) => {
                            if (selectedItem) {
                                updateSettings({ language: selectedItem.id });
                            }
                        }}
                    />
                </Tile>

                <Tile className="settings-tile">
                    <h3>{t('settings.apiKey')}</h3>
                    <div className="settings-api-status">
                        <span>{t('settings.apiKeyStatus')}:</span>
                        {apiKeyStatus === 'loading' && <Tag type="gray">...</Tag>}
                        {apiKeyStatus === 'found' && (
                            <Tag type="green">{t('settings.apiKeyFound')}</Tag>
                        )}
                        {apiKeyStatus === 'not_found' && (
                            <Tag type="red">{t('settings.apiKeyNotFound')}</Tag>
                        )}
                    </div>

                    {keySuccess && (
                        <InlineNotification
                            kind="success"
                            title={t('settings.apiKeySaved')}
                            subtitle={t('settings.apiKeySavedHint')}
                            lowContrast
                            onClose={() => setKeySuccess(false)}
                        />
                    )}
                    {keyError && (
                        <InlineNotification
                            kind="error"
                            title={t('settings.apiKeyError')}
                            subtitle={keyError}
                            lowContrast
                            onClose={() => setKeyError(null)}
                        />
                    )}

                    <div className="settings-key-form">
                        <TextInput
                            id="settings-api-key"
                            labelText={t('settings.setApiKey')}
                            placeholder={t('settings.apiKeyPlaceholder')}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            type="password"
                            disabled={savingKey}
                        />
                        <Button
                            kind="primary"
                            size="sm"
                            onClick={handleSaveKey}
                            disabled={savingKey || !apiKeyInput.trim()}
                        >
                            {savingKey ? t('settings.validating') : t('settings.saveKey')}
                        </Button>
                    </div>
                </Tile>

                <Tile className="settings-tile">
                    <h3>{t('settings.user')}</h3>
                    <p className="settings-hint">
                        {t('settings.userHint')}
                    </p>
                    <TextInput
                        id="settings-username"
                        labelText={t('settings.userName')}
                        value={settings.userNameOverride || apiUserName || ''}
                        onChange={(e) => {
                            const val = e.target.value || null;
                            updateSettings({ userNameOverride: val });
                            fetch('/api/config', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userNameOverride: val }),
                            }).catch(() => { });
                        }}
                    />
                    <TextInput
                        id="settings-email"
                        labelText={t('settings.userEmail')}
                        value={apiUserEmail || ''}
                        readOnly
                        className="mt-2"
                    />
                </Tile>

                <Tile className="settings-tile">
                    <h3>{t('settings.theme')}</h3>
                    <Toggle
                        id="settings-theme"
                        labelA={t('settings.light')}
                        labelB={t('settings.dark')}
                        toggled={settings.theme === 'dark'}
                        onToggle={(checked) => {
                            updateSettings({ theme: checked ? 'dark' : 'light' });
                        }}
                    />
                </Tile>

                <Tile className="settings-tile">
                    <h3>{t('settings.weekendDefault')}</h3>
                    <p className="settings-hint">
                        {t('settings.weekendDefaultHint')}
                    </p>
                    <Toggle
                        id="settings-weekends"
                        labelA={t('settings.weekendsHidden')}
                        labelB={t('settings.weekendsShown')}
                        toggled={settings.showWeekendsDefault}
                        onToggle={(checked) => {
                            updateSettings({ showWeekendsDefault: checked });
                        }}
                    />
                </Tile>

                <Tile className="settings-tile">
                    <h3>{t('settings.quickFillLookback')}</h3>
                    <p className="settings-hint">
                        {t('settings.quickFillLookbackHint')}
                    </p>
                    <NumberInput
                        id="settings-lookback"
                        label={t('settings.weeksLookback')}
                        value={settings.recentWeeksLookback}
                        min={1}
                        max={52}
                        step={1}
                        onChange={(_, { value }) => {
                            updateSettings({ recentWeeksLookback: value });
                        }}
                    />
                </Tile>

                <Tile className="settings-tile">
                    <h3>{t('settings.installApp')}</h3>
                    {installPromptAvailable ? (
                        <>
                            <p className="settings-hint">
                                {t('settings.installAppReady')}
                            </p>
                            <Button
                                kind="tertiary"
                                size="sm"
                                onClick={() => {
                                    if (deferredInstallPrompt?.prompt) {
                                        deferredInstallPrompt.prompt();
                                        deferredInstallPrompt = null;
                                        setInstallPromptAvailable(false);
                                    }
                                }}
                            >
                                {t('settings.installAppButton')}
                            </Button>
                        </>
                    ) : (
                        <p className="settings-hint">
                            {t('settings.installAppManual')}
                        </p>
                    )}
                </Tile>

                <Tile className="settings-tile">
                    <h3>{t('settings.about')}</h3>
                    <p className="settings-hint">{t('settings.version')}: <strong>v{__APP_VERSION__}</strong></p>
                    <p className="settings-hint">{t('settings.buildDate')}: <strong>{__APP_BUILD_DATE__}</strong></p>
                </Tile>
            </div>
        </div>
    );
}
