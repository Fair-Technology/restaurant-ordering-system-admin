// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateShopModal, ShopsPage } from './ShopsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../services/legalApi', () => ({
  useGetDpaDocumentQuery: () => ({ data: { version: 'v1', title: 'DPA', content: 'x' }, isError: false }),
}));

const api = vi.hoisted(() => ({
  check: vi.fn(),
  create: vi.fn(),
  shops: { state: {} as Record<string, unknown> },
  createState: { isLoading: false, isError: false, error: undefined as unknown },
}));
vi.mock('../services/api', () => ({
  useGetMyShopsQuery: () => api.shops.state,
  useGetShopByIdQuery: () => ({}),
  useGetShopSubscriptionQuery: () => ({}),
  useUpdateShopMutation: () => [vi.fn(), {}],
  useCreateShopMutation: () => [api.create, api.createState],
  useLazyCheckSlugAvailabilityQuery: () => [api.check],
}));

const ok = (available: boolean) => ({ unwrap: () => Promise.resolve({ slug: 'x', available }) });
const fail = (status: number, error: string) => ({ unwrap: () => Promise.reject({ status, data: { error } }) });

const slugInput = () => screen.getByLabelText('shops.shopSlug') as HTMLInputElement;
const typeName = (v: string) => fireEvent.change(screen.getByLabelText('shops.shopName'), { target: { value: v } });
const typeSlug = (v: string) => fireEvent.change(slugInput(), { target: { value: v } });
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(450); });
const status = () => screen.getByTestId('slug-status').textContent;

function fillRest() {
  fireEvent.change(screen.getByLabelText('shops.shopCountry'), { target: { value: 'DE' } });
  fireEvent.click(screen.getByRole('checkbox'));
}
const submit = async () => {
  const form = slugInput().closest('form')!;
  await act(async () => { fireEvent.submit(form); });
};

beforeEach(() => {
  vi.stubEnv('VITE_SHOP_BASE_URL', 'https://www.example.com');
  vi.useFakeTimers();
  api.check.mockReset();
  api.create.mockReset();
  api.createState.isError = false;
  api.createState.error = undefined;
  render(<MemoryRouter><CreateShopModal onClose={vi.fn()} /></MemoryRouter>);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('new shop dialog fields', () => {
  it('has no Industry control', () => {
    expect(screen.queryByLabelText('Industry')).toBeNull();
  });
});

describe('slug pre-fill', () => {
  it('derives from a Latin name incl. umlauts', () => {
    typeName('Bäckerei Müller');
    expect(slugInput().value).toBe('baeckerei-mueller');
    expect(screen.getByTestId('slug-url').textContent).toBe('https://www.example.com/shops/baeckerei-mueller');
  });
  it('stays empty for a non-Latin name', () => {
    typeName('寿司屋');
    expect(slugInput().value).toBe('');
  });
  it('stops following the name once edited directly', () => {
    typeName('Pizza');
    expect(slugInput().value).toBe('pizza');
    typeSlug('my-pizza');
    typeName('Pizza Palace');
    expect(slugInput().value).toBe('my-pizza');
  });
});

describe('availability states', () => {
  it('shows the hint while empty or invalid, without calling the API', async () => {
    expect(status()).toBe('shops.shopSlugHint');
    typeSlug('-bad');
    await settle();
    expect(status()).toBe('shops.shopSlugHint');
    expect(api.check).not.toHaveBeenCalled();
  });
  it('shows checking, then available', async () => {
    api.check.mockReturnValue(ok(true));
    typeSlug('cafe');
    expect(status()).toContain('shops.slugChecking');
    await settle();
    expect(api.check).toHaveBeenCalledWith({ slug: 'cafe' });
    expect(status()).toBe('shops.slugAvailable');
  });
  it('shows taken', async () => {
    api.check.mockReturnValue(ok(false));
    typeSlug('cafe');
    await settle();
    expect(status()).toBe('shops.slugTaken');
  });
  it('shows the backend message for a 400', async () => {
    api.check.mockReturnValue(fail(400, 'Please choose a web address using letters, numbers and hyphens'));
    typeSlug('cafe');
    await settle();
    expect(status()).toBe('Please choose a web address using letters, numbers and hyphens');
  });
  it('debounces and ignores stale responses', async () => {
    api.check.mockReturnValue(ok(true));
    typeSlug('caf');
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    typeSlug('cafe');
    await settle();
    expect(api.check).toHaveBeenCalledTimes(1);
    expect(api.check).toHaveBeenCalledWith({ slug: 'cafe' });
  });
});

describe('submit gating', () => {
  it('blocks while unchecked, invalid or taken; allows once available', async () => {
    typeName('Cafe Luna');
    fillRest();
    await submit(); // slug set but not yet checked
    expect(api.create).not.toHaveBeenCalled();

    api.check.mockReturnValue(ok(false));
    await settle();
    await submit(); // taken
    expect(api.create).not.toHaveBeenCalled();

    typeSlug('-bad');
    await submit(); // invalid
    expect(api.create).not.toHaveBeenCalled();

    api.check.mockReturnValue(ok(true));
    api.create.mockReturnValue({ unwrap: () => Promise.resolve({ id: 's1' }) });
    typeSlug('cafe-luna-2');
    await settle();
    await submit();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0][0].createShopRequestDto.slug).toBe('cafe-luna-2');
  });
});

describe('create 400', () => {
  it('surfaces the backend slug-taken message in the error block', () => {
    cleanup();
    api.createState.isError = true;
    api.createState.error = { status: 400, data: { error: 'This web address is already taken. Please choose another.' } };
    render(<MemoryRouter><CreateShopModal onClose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('This web address is already taken. Please choose another.')).toBeTruthy();
  });
});

describe('ShopsPage empty state', () => {
  const renderPage = (state: Record<string, unknown>) => {
    cleanup(); // drop the CreateShopModal rendered by the file-level beforeEach
    api.shops.state = state;
    render(<MemoryRouter><ShopsPage /></MemoryRouter>);
  };

  it('shows the empty text and no hint with zero shops', () => {
    renderPage({ data: { shops: [] }, isLoading: false, isError: false });
    expect(screen.getByText('shops.empty')).toBeTruthy();
    expect(screen.queryByText('shops.listHint')).toBeNull();
  });
  it('shows the hint and no empty text with at least one shop', () => {
    renderPage({ data: { shops: [{ id: 's1', name: 'Shop One', slug: 'shop-one' }] }, isLoading: false, isError: false });
    expect(screen.getByText('shops.listHint')).toBeTruthy();
    expect(screen.queryByText('shops.empty')).toBeNull();
  });
  it('never flashes the empty text while loading', () => {
    renderPage({ data: undefined, isLoading: true, isError: false });
    expect(screen.queryByText('shops.empty')).toBeNull();
  });
  it('never flashes the empty text on error', () => {
    renderPage({ data: undefined, isLoading: false, isError: true });
    expect(screen.getByText('shops.loadError')).toBeTruthy();
    expect(screen.queryByText('shops.empty')).toBeNull();
  });
});
