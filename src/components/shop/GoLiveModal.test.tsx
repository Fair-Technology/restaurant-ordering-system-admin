// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { GoLiveCriteriaModal } from './GoLiveModal';
import { goLiveFixLink } from '../../features/shops/goLiveFixLink';
import type { GetGoLiveStatusApiResponse } from '../../services/api';
import en from '../../../public/locales/en/common.json';

const updateShop = vi.hoisted(() => vi.fn());
vi.mock('../../services/api', () => ({
  useUpdateShopMutation: () => [updateShop, { isLoading: false }],
}));

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});
afterEach(() => {
  cleanup();
  updateShop.mockReset();
});

const mk = (criteria: { key: string; met: boolean; description?: string }[]) =>
  ({
    allMet: criteria.every((c) => c.met),
    criteria: criteria.map((c) => ({ description: `RAW ${c.key}`, ...c })),
  }) as unknown as GetGoLiveStatusApiResponse;

const mixed = mk([
  { key: 'stripe_connected', met: false },
  { key: 'has_products', met: true },
  { key: 'has_categories', met: false },
  { key: 'opening_hours', met: true },
  { key: 'impressum', met: false },
  { key: 'some_future_key', met: false, description: 'Future thing to do' },
]);

const renderModal = (
  status = mixed,
  props: { onClose?: () => void; onSuccess?: () => void } = {},
) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <GoLiveCriteriaModal
          shopId="s1"
          status={status}
          onClose={props.onClose ?? vi.fn()}
          onSuccess={props.onSuccess ?? vi.fn()}
        />
      </MemoryRouter>
    </I18nextProvider>,
  );

describe('GoLiveCriteriaModal', () => {
  it('renders every criterion, met and unmet', () => {
    renderModal();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('met rows show Done and no Set up link; unmet rows link to their fix route', () => {
    renderModal();
    const products = screen.getByText('Add a dish').closest('li')!;
    expect(within(products).getByText('Done')).toBeTruthy();
    expect(within(products).queryByRole('link')).toBeNull();

    const stripe = screen.getByText('Connect Stripe').closest('li')!;
    expect(within(stripe).queryByText('Done')).toBeNull();
    const link = within(stripe).getByRole('link', { name: 'Connect Stripe — set up' });
    expect(link.getAttribute('href')).toBe(goLiveFixLink('s1', 'stripe_connected'));
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('groups criteria in fixed order and puts unknown keys under the fallback using the server description', () => {
    renderModal();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Payments', 'Menu', 'Shop', 'Legal and invoices', 'Other']);
    const other = screen.getByRole('region', { name: 'Other' });
    expect(within(other).getByText('Future thing to do')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Menu' })).getByText('1 of 2')).toBeTruthy();
  });

  it('shows progress from the criteria', () => {
    renderModal();
    expect(screen.getByText('2 of 6 done')).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
    expect(bar.getAttribute('aria-valuemax')).toBe('6');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('33%');
    expect(screen.getByText('4 items still open')).toBeTruthy();
  });

  it('disables Switch shop online while anything is unmet', () => {
    renderModal();
    expect((screen.getByRole('button', { name: 'Switch shop online' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables it when all met and calls the mutation then onSuccess', async () => {
    updateShop.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const onSuccess = vi.fn();
    renderModal(mk([{ key: 'stripe_connected', met: true }]), { onSuccess });
    expect(screen.getByText('No items open')).toBeTruthy();
    const btn = screen.getByRole('button', { name: 'Switch shop online' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { isPaused: false } });
  });

  it('shows an error and stays open when the mutation rejects', async () => {
    updateShop.mockReturnValue({ unwrap: () => Promise.reject(new Error('x')) });
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    renderModal(mk([{ key: 'stripe_connected', met: true }]), { onSuccess, onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Switch shop online' }));
    expect((await screen.findByRole('alert')).textContent).toBe(en.shops.goLive.error);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('is an accessible dialog and Escape closes it', () => {
    const onClose = vi.fn();
    renderModal(mixed, { onClose });
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(screen.getByRole('heading', { level: 2 }).id);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
