import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Tile,
    Dropdown,
    Toggle,
    Tag,
    TextInput,
    Button,
    InlineNotification,
} from '@carbon/react';
import { useSettings } from '../context/SettingsContext';

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
                            title="API key saved"
                            subtitle="Your API key has been validated and saved."
                            lowContrast
                            onClose={() => setKeySuccess(false)}
                        />
                    )}
                    {keyError && (
                        <InlineNotification
                            kind="error"
                            title="Error"
                            subtitle={keyError}
                            lowContrast
                            onClose={() => setKeyError(null)}
                        />
                    )}

                    <div className="settings-key-form">
                        <TextInput
                            id="settings-api-key"
                            labelText="Set / Update API Key"
                            placeholder="Enter new API key..."
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
                            {savingKey ? 'Validating...' : 'Save Key'}
                        </Button>
                    </div>
                </Tile>

                <Tile className="settings-tile">
                    <h3>User</h3>
                    <p className="settings-hint">
                        User info retrieved from Monday.com API.
                    </p>
                    <TextInput
                        id="settings-username"
                        labelText="Name"
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
                        labelText="Email"
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
                    <h3>Weekend Display Default</h3>
                    <p className="settings-hint">
                        When enabled, Saturday and Sunday are shown by default in the week view.
                        You can still toggle them on/off in the week view header.
                    </p>
                    <Toggle
                        id="settings-weekends"
                        labelA="Weekends hidden by default"
                        labelB="Weekends shown by default"
                        toggled={settings.showWeekendsDefault}
                        onToggle={(checked) => {
                            updateSettings({ showWeekendsDefault: checked });
                        }}
                    />
                </Tile>
            </div>
        </div>
    );
}
