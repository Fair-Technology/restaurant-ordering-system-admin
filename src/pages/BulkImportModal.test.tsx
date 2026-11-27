// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildExampleMenuImportFile } from '../features/menu/menuImport';
import { BulkImportModal } from './ProductsPage';

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

const createProductMock = vi.hoisted(() =>
  vi.fn<(arg: unknown) => { unwrap: () => Promise<unknown> }>(() => ({ unwrap: () => Promise.resolve({}) })),
);

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  useGetShopByIdQuery: () => ({ data: { id: 's1', currency: 'EUR' } }),
  useCreateProductMutation: () => [createProductMock, {}],
}));

const onClose = vi.fn();

beforeEach(() => {
  createProductMock.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }));
});

afterEach(() => {
  cleanup();
  onClose.mockClear();
  createProductMock.mockClear();
  vi.restoreAllMocks();
});

/** The full-screen z-50 container: the panel's parent. */
function overlay(): HTMLElement {
  return screen.getByRole('heading', { name: 'Import Products' }).closest('.rounded-2xl')!.parentElement!;
}

function clickOverlay() {
  fireEvent.mouseDown(overlay());
  fireEvent.mouseUp(overlay());
}

async function goToPreview() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([buildExampleMenuImportFile()], 'dishes.json', { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByText(/3 products found/);
}

describe('BulkImportModal close behaviour', () => {
  it('closes on a backdrop click on the upload step', () => {
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    clickOverlay();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the press starts inside the panel and ends on the overlay', () => {
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    fireEvent.mouseDown(screen.getByText(lookup('dishes.importModal.uploadHint')));
    fireEvent.mouseUp(overlay());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when the press starts on the overlay and ends inside the panel', () => {
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    fireEvent.mouseDown(overlay());
    fireEvent.mouseUp(screen.getByText(lookup('dishes.importModal.uploadHint')));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on a click inside the panel', () => {
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    const text = screen.getByText(lookup('dishes.importModal.uploadHint'));
    fireEvent.mouseDown(text);
    fireEvent.mouseUp(text);
    fireEvent.click(text);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape on the upload step', () => {
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores backdrop and Escape while importing', async () => {
    createProductMock.mockImplementation(() => ({ unwrap: () => new Promise(() => {}) }));
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    await goToPreview();
    fireEvent.click(screen.getByRole('button', { name: /Import 3 products/ }));
    await waitFor(() => expect(createProductMock).toHaveBeenCalled());
    await screen.findByText(/Creating product/);
    clickOverlay();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks for confirmation on the preview step and closes only when confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    await goToPreview();

    clickOverlay();
    expect(confirmSpy).toHaveBeenCalledWith(lookup('dishes.importModal.confirmDiscard'));
    expect(onClose).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    clickOverlay();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('routes the X button through the same confirm policy', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    await goToPreview();
    fireEvent.click(screen.getByRole('heading', { name: 'Import Products' }).parentElement!.querySelector('button')!);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('BulkImportModal example download', () => {
  it('downloads the example file without a network call', () => {
    const createObjectURL = vi.fn(() => 'blob:example');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<BulkImportModal shopId="s1" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('download-example-file'));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:example');
    expect(createProductMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
