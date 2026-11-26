// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import en from '../../public/locales/en/common.json';
import { ActivityPage } from './ActivityPage';

function translate(key: string, opts?: Record<string, unknown>): unknown {
  const lookup = (k: string) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], en);
  let value = lookup(key);
  if (value === undefined && typeof opts?.count === 'number') value = lookup(`${key}_${opts.count === 1 ? 'one' : 'other'}`);
  if (opts?.returnObjects && value && typeof value === 'object') return value;
  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts?.[name] ?? ''));
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'en' } }),
}));
vi.mock('../features/layout/usePageTitle', () => ({ usePageTitle: () => {} }));

const m = vi.hoisted(() => ({
  shop: { current: { data: undefined as unknown } },
  audit: { current: { data: undefined as unknown, isLoading: false, isFetching: false, isError: false } },
  query: vi.fn(),
}));
vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => m.shop.current,
  useGetAuditEntriesQuery: (args: unknown, opts: unknown) => {
    m.query(args, opts);
    return m.audit.current;
  },
}));

const entry = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  shopId: 's1',
  timestamp: '2020-01-05T10:00:00Z',
  actorType: 'owner',
  actorId: 'u1',
  action: 'product.update',
  entityType: 'product',
  entityId: 'p1',
  entityName: `Dish ${id}`,
  ...over,
});

const result = (over: Record<string, unknown> = {}) => ({
  entries: [
    entry('e1', { changes: [{ field: 'refundedCents', from: 900, to: 1000 }, { field: 'available', from: false, to: true }] }),
    entry('e2'),
  ],
  total: 45,
  page: 1,
  pageSize: 20,
  actorLabels: { 'owner:u1': 'Anna' },
  actors: [
    { key: 'owner:u1', label: 'Anna' },
    { key: 'system:system', label: 'System' },
  ],
  ...over,
});

function Where() {
  const l = useLocation();
  return <div data-testid="loc">{l.search}</div>;
}

const renderPage = (url = '/shops/s1/activity') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Where />
      <Routes>
        <Route path="/shops/:shopId/activity" element={<ActivityPage />} />
      </Routes>
    </MemoryRouter>,
  );

const lastArgs = () => m.query.mock.calls.at(-1)![0] as Record<string, unknown>;
const loc = () => screen.getByTestId('loc').textContent;

beforeEach(() => {
  m.query.mockReset();
  m.shop.current = { data: { id: 's1', currency: 'EUR', timezone: 'Europe/Berlin', callerPermissions: ['view_audit'] } };
  m.audit.current = { data: result(), isLoading: false, isFetching: false, isError: false };
});
afterEach(cleanup);

describe('ActivityPage', () => {
  it('queries with no filter params by default', () => {
    renderPage();
    expect(lastArgs()).toEqual({ shopId: 's1', page: 1, pageSize: 20 });
    expect(screen.getByText('Showing 1–20 of 45')).toBeTruthy();
  });

  it('area chip sends area, writes the URL and resets page to 1', () => {
    renderPage('/shops/s1/activity?page=3');
    expect(lastArgs().page).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(lastArgs()).toEqual({ shopId: 's1', page: 1, pageSize: 20, area: 'menu' });
    expect(loc()).toBe('?area=menu');
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(lastArgs()).not.toHaveProperty('area');
    expect(loc()).toBe('');
  });

  it('who select sends actor, resets page, and translates generic labels', () => {
    renderPage('/shops/s1/activity?page=2');
    const select = screen.getByRole('combobox', { name: 'Who' });
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Everyone', 'Anna', 'System']);
    fireEvent.change(select, { target: { value: 'system:system' } });
    expect(lastArgs()).toEqual({ shopId: 's1', page: 1, pageSize: 20, actor: 'system:system' });
    expect(loc()).toBe('?actor=system%3Asystem');
    fireEvent.change(select, { target: { value: '' } });
    expect(lastArgs()).not.toHaveProperty('actor');
  });

  it('restores filters and page from the URL, and the pager writes page', () => {
    renderPage('/shops/s1/activity?area=staff&actor=staff:abc&page=2');
    expect(lastArgs()).toEqual({ shopId: 's1', page: 2, pageSize: 20, area: 'staff', actor: 'staff:abc' });
    expect(screen.getByRole('button', { name: 'Staff' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(lastArgs().page).toBe(3);
    expect(loc()).toContain('page=3');
    expect(loc()).toContain('area=staff');
  });

  it('shows noMatch when there are no entries', () => {
    m.audit.current = { data: result({ entries: [], total: 0 }), isLoading: false, isFetching: false, isError: false };
    renderPage();
    expect(screen.getByText('No activity matches these filters.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders loading, error and access-denied states', () => {
    m.audit.current = { data: undefined, isLoading: true, isFetching: true, isError: false };
    const { unmount } = renderPage();
    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    unmount();

    m.audit.current = { data: undefined, isLoading: false, isFetching: false, isError: true };
    const second = renderPage();
    expect(screen.getByText('Could not load activity.')).toBeTruthy();
    second.unmount();

    m.shop.current = { data: { id: 's1', callerPermissions: [] } };
    renderPage();
    expect(screen.getByText(/don't have permission to view/)).toBeTruthy();
    expect(m.query.mock.calls.at(-1)![1]).toEqual({ skip: true });
  });

  it('dims the old rows while refetching', () => {
    m.audit.current = { data: result(), isLoading: false, isFetching: true, isError: false };
    renderPage();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('table').closest('[aria-busy="true"]')).toBeTruthy();
  });

  it('groups by day and toggles the change details', () => {
    renderPage();
    expect(screen.getByText(/Sunday.*5 January 2020/)).toBeTruthy();
    expect(screen.getByText('No details')).toBeTruthy();
    const btn = screen.getByRole('button', { name: '2 changes' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Before')).toBeNull();
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Field')).toBeTruthy();
    expect(screen.getByText('Before')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
    expect(screen.getByText('€9.00')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});
