import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '../context/SettingsContext';

// Mock fetch for the health check
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ status: 'ok', hasApiKey: true }),
});

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.limit) return `Limit: ${options.limit}h`;
      return key;
    },
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
}));

import SettingsView from '../pages/SettingsView';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <SettingsProvider>
        {ui}
      </SettingsProvider>
    </BrowserRouter>
  );
}

describe('SettingsView', () => {
  it('should render settings title', () => {
    renderWithProviders(<SettingsView />);
    expect(screen.getByText('settings.title')).toBeDefined();
  });

  it('should render language dropdown', () => {
    renderWithProviders(<SettingsView />);
    // The heading and dropdown both have "settings.language" text
    const headings = screen.getAllByText('settings.language');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('should render API key status section', () => {
    renderWithProviders(<SettingsView />);
    expect(screen.getByText('settings.apiKey')).toBeDefined();
  });

  it('should render theme toggle', () => {
    renderWithProviders(<SettingsView />);
    expect(screen.getByText('settings.theme')).toBeDefined();
  });
});
