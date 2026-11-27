import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { GetShopResultDto } from '../../services/api';
import { buildSettingsSections, parseSettingsSection } from './settingsSections';
import en from '../../../public/locales/en/common.json';

const t = ((key: string, opts?: Record<string, unknown>) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], en) as string;
  return v.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k]));
}) as unknown as TFunction;

const base = { id: 's1', name: 'Pasta Place', slug: 'pasta', isPaused: false } as unknown as GetShopResultDto;
const status = (shop: Partial<GetShopResultDto>, openDays = 5, showDanger = true) =>
  Object.fromEntries(
    buildSettingsSections({ shop: { ...base, ...shop } as GetShopResultDto, openDays, nowMs: 0, t, showDanger }).map((s) => [s.key, s.status]),
  );

describe('settings section status lines', () => {
  it('lists the seven sections, danger last without a status', () => {
    const list = buildSettingsSections({ shop: base, openDays: 0, nowMs: 0, t, showDanger: true });
    expect(list.map((s) => s.key)).toEqual(['status', 'details', 'look', 'hours', 'orders', 'pay', 'danger']);
    expect(list[6].danger).toBe(true);
    expect(list[6].status).toBeUndefined();
  });
  it('shows the live state', () => {
    expect(status({}).status).toBe('Online');
    expect(status({ ordersPaused: true } as never).status).toBe('Paused');
    expect(status({ isPaused: true }).status).toBe('Offline');
  });
  it('shows details, banner and days open', () => {
    const s = status({ branding: { showHero: false } as never }, 3);
    expect(s.details).toBe('Pasta Place · /pasta');
    expect(s.look).toBe('Banner off');
    expect(s.hours).toBe('3 of 7 days open');
    expect(status({}).look).toBe('Banner on');
  });
  it('shows the accept mode, with delivery appended', () => {
    expect(status({}).orders).toBe('Auto-accept');
    expect(status({ orderSettings: { autoAccept: false } } as never).orders).toBe('Manual accept');
    expect(status({ orderSettings: { autoAccept: true, autoAcceptHours: {} } } as never).orders).toBe('Auto-accept at set times');
    expect(status({ orderSettings: { autoAccept: false, delivery: true } } as never).orders).toBe('Manual accept · delivery');
  });
  it('shows the Stripe state', () => {
    expect(status({ stripe: { connectOnboardingStatus: 'complete' } } as never).pay).toBe('Stripe connected');
    expect(status({ stripe: { connectOnboardingStatus: 'pending' } } as never).pay).toBe('Stripe pending');
    expect(status({}).pay).toBe('Stripe not connected');
  });
  it('falls back to status for a missing or unknown section', () => {
    expect(parseSettingsSection(null)).toBe('status');
    expect(parseSettingsSection('nope')).toBe('status');
    expect(parseSettingsSection('orders')).toBe('orders');
  });
});
