// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { GoLiveChecklist } from './GoLiveChecklist';
import { goLiveFixLink } from '../../features/shops/goLiveFixLink';
import type { GetGoLiveStatusApiResponse } from '../../services/api';
import en from '../../../public/locales/en/common.json';

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});
afterEach(cleanup);

const status = {
  allMet: false,
  hasAnyProducts: true,
  criteria: [
    { key: 'stripe_connected', met: false, description: 'RAW' },
    { key: 'has_products', met: true, description: 'RAW' },
    { key: 'some_future_key', met: false, description: 'Future thing to do' },
  ],
} as unknown as GetGoLiveStatusApiResponse;

const renderIt = (st: GetGoLiveStatusApiResponse = status) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <GoLiveChecklist shopId="s1" status={st} />
      </MemoryRouter>
    </I18nextProvider>,
  );

describe('GoLiveChecklist', () => {
  it('shows progress', () => {
    renderIt();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('3');
    expect(screen.getByText('33%')).toBeTruthy();
  });

  it('groups criteria, links unmet rows, and uses the raw description for unknown keys', () => {
    renderIt();
    const sections = screen.getAllByRole('region');
    expect(sections.length).toBeGreaterThanOrEqual(2);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toContain(goLiveFixLink('s1', 'stripe_connected'));
    expect(screen.getByText('Future thing to do')).toBeTruthy();
    expect(within(sections[0]).getByRole('heading', { level: 3 })).toBeTruthy();
    expect(screen.getAllByText(en.shops.goLive.done).length).toBe(1);
  });

  it('has_products Set up link opens the add-dish form when the shop has no dishes', () => {
    renderIt({
      allMet: false,
      hasAnyProducts: false,
      criteria: [{ key: 'has_products', met: false, description: 'RAW' }],
    } as unknown as GetGoLiveStatusApiResponse);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/shops/s1/products?addProduct=1');
  });

  it('has_products Set up link opens the plain list when dishes exist but are incomplete', () => {
    renderIt({
      allMet: false,
      hasAnyProducts: true,
      criteria: [{ key: 'has_products', met: false, description: 'RAW' }],
    } as unknown as GetGoLiveStatusApiResponse);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/shops/s1/products');
  });
});
