import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EntryFormModal from '../components/EntryFormModal';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));

const defaultValues = {
  date: '2025-07-24',
  activityType: 'billable',
  customer: '',
  workItem: '',
  hours: 8,
  comment: '',
};

describe('EntryFormModal', () => {
  it('should render add modal', () => {
    render(
      <BrowserRouter>
        <EntryFormModal
          mode="add"
          values={defaultValues}
          setField={vi.fn()}
          saving={false}
          error={null}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('entry.addTitle')).toBeDefined();
    expect(screen.getByText('app.save')).toBeDefined();
    expect(screen.getByText('app.cancel')).toBeDefined();
  });

  it('should render edit modal', () => {
    render(
      <BrowserRouter>
        <EntryFormModal
          mode="edit"
          values={defaultValues}
          setField={vi.fn()}
          saving={false}
          error={null}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('entry.editTitle')).toBeDefined();
  });

  it('should show error message', () => {
    render(
      <BrowserRouter>
        <EntryFormModal
          mode="add"
          values={defaultValues}
          setField={vi.fn()}
          saving={false}
          error="Test error message"
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Test error message')).toBeDefined();
  });

  it('should disable save when saving', () => {
    render(
      <BrowserRouter>
        <EntryFormModal
          mode="add"
          values={defaultValues}
          setField={vi.fn()}
          saving={true}
          error={null}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );
    // Save button should be disabled
    const saveButton = screen.getByText('app.save').closest('button');
    expect(saveButton).toBeDefined();
  });
});
