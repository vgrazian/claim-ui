import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tile,
  Dropdown,
  Toggle,
  Tag,
} from '@carbon/react';
import { useSettings } from '../context/SettingsContext';

export default function SettingsView() {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, apiKeyStatus } = useSettings();

  const languageItems = [
    { id: 'en', text: 'English' },
    { id: 'it', text: 'Italiano' },
  ];

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
          <p className="settings-hint">{t('settings.apiKeyHint')}</p>
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
      </div>
    </div>
  );
}
