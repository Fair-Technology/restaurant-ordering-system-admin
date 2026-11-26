// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CoverImageLibraryDialog } from './CoverImageLibraryDialog';
import en from '../../../public/locales/en/common.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], en);
      return typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k])) : key;
    },
  }),
}));

const h = vi.hoisted(() => ({
  list: {} as Record<string, unknown>,
  refetch: null as unknown as ReturnType<typeof vi.fn>,
  use: null as unknown as ReturnType<typeof vi.fn>,
}));
vi.mock('../../services/api', () => ({
  useExecuteListCoverImageLibraryForShopQuery: () => ({ ...h.list, refetch: h.refetch }),
  useExecuteUseLibraryCoverImageForShopMutation: () => [h.use, { isLoading: false }],
}));

const images = [
  { id: 'a', name: 'Pasta', imageUrl: 'https://x/a-full.jpg', cardImageUrl: 'https://x/a-card.jpg', createdAt: '' },
  { id: 'b', name: 'Pizza', imageUrl: 'https://x/b-full.jpg', cardImageUrl: 'https://x/b-card.jpg', createdAt: '' },
];

const setup = () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<CoverImageLibraryDialog shopId="s1" onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
};

beforeEach(() => {
  h.list = { data: { images }, isLoading: false, isError: false };
  h.refetch = vi.fn();
  h.use = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
});
afterEach(cleanup);

describe('CoverImageLibraryDialog', () => {
  it('is an accessible modal with one button per image', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pasta' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pizza' })).toBeTruthy();
  });

  it('shows a spinner while loading', () => {
    h.list = { data: undefined, isLoading: true, isError: false };
    setup();
    expect(screen.getByText(en.shops.loadingSettings)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pasta' })).toBeNull();
  });

  it('shows an error with a working retry', () => {
    h.list = { data: undefined, isLoading: false, isError: true };
    setup();
    expect(screen.getByText(en.shops.coverLibraryLoadFailed)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.shops.coverLibraryRetry }));
    expect(h.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a larger preview when a thumbnail is picked, and can go back', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pizza' }));
    const img = screen.getByAltText('Preview of Pizza') as HTMLImageElement;
    expect(img.src).toBe('https://x/b-full.jpg');
    fireEvent.click(screen.getByRole('button', { name: en.shops.coverLibraryBack }));
    expect(screen.getByRole('button', { name: 'Pasta' })).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('uses the image, then reports success', async () => {
    const { onSaved } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pizza' }));
    fireEvent.click(screen.getByRole('button', { name: en.shops.coverLibraryUse }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(h.use).toHaveBeenCalledWith({ shopId: 's1', body: { libraryImageId: 'b' } });
  });

  it('stays open with an inline error when saving fails', async () => {
    h.use = vi.fn(() => ({ unwrap: () => Promise.reject(new Error('boom')) }));
    const { onSaved, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pasta' }));
    fireEvent.click(screen.getByRole('button', { name: en.shops.coverLibraryUse }));
    expect((await screen.findByRole('alert')).textContent).toBe(en.shops.failedToUseLibraryCoverImage);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: en.shops.coverLibraryUse })).toBeTruthy();
  });
});
