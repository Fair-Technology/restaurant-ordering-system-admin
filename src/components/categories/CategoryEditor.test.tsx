// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastContext } from '../../contexts/ToastContext';
import type { CategoryDto } from '../../services/api';
import { CategoryEditor } from './CategoryEditor';

// Resolve keys against the real English bundle so the test also proves the i18n keys exist.
const en = JSON.parse(readFileSync('public/locales/en/common.json', 'utf-8')) as Record<string, unknown>;
const lookup = (key: string): string => {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof value === 'string' ? value : key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      lookup(key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars?.[name] ?? '')),
    i18n: { language: 'en' },
  }),
}));

const category = {
  id: 'c1',
  name: 'Dessert',
  icon: null,
  taxClassId: '',
  nameTranslations: {},
  isAvailable: true,
  schedule: { daysOfWeek: [5], startTime: '17:00', endTime: '21:00' },
} as unknown as CategoryDto;

const updateCategoryMock = vi.hoisted(() => vi.fn<(arg: { body: Record<string, unknown> }) => { unwrap: () => Promise<unknown> }>(() => ({ unwrap: () => Promise.resolve({}) })));

vi.mock('../../services/api', () => ({
  useGetCategoryByIdQuery: () => ({ data: category, isLoading: false, isError: false }),
  useGetShopByIdQuery: () => ({ data: { id: 's1', countryCode: 'DE' } }),
  useGetReferenceListsQuery: () => ({ data: undefined, isError: false }),
  useUpdateCategoryMutation: () => [updateCategoryMock, { isLoading: false, isError: false }],
  useDeleteCategoryMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
  useApplyCategoryTaxClassMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
}));

afterEach(() => {
  cleanup();
  updateCategoryMock.mockClear();
});

function renderEditor() {
  render(
    <ToastContext.Provider value={{ success: () => {}, error: () => {} }}>
      <CategoryEditor shopId="s1" categoryId="c1" onSaved={() => {}} onCancel={() => {}} onDeleted={() => {}} />
    </ToastContext.Provider>,
  );
}

async function save() {
  fireEvent.click(screen.getByRole('button', { name: lookup('categories.saveChanges') }));
  await waitFor(() => expect(updateCategoryMock).toHaveBeenCalledTimes(1));
  return updateCategoryMock.mock.calls[0][0].body;
}

describe('CategoryEditor schedule', () => {
  it('clears the schedule when unticked and saved', async () => {
    renderEditor();
    const checkbox = screen.getByLabelText(new RegExp(lookup('categories.onlyAtTimes'))) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    const body = await save();
    expect(Object.prototype.hasOwnProperty.call(body, 'schedule')).toBe(true);
    expect(body.schedule).toBeNull();
  });

  it('keeps the schedule unchanged when not touched', async () => {
    renderEditor();
    const body = await save();
    expect(body.schedule).toEqual({ daysOfWeek: [5], startTime: '17:00', endTime: '21:00' });
  });
});
