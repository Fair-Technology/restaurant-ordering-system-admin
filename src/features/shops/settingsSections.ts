import type { TFunction } from 'i18next';
import type { GetShopResultDto } from '../../services/api';
import { autoAcceptChoiceOf } from './kitchenSettings';
import { bannerShownOf } from './bannerSwitch';
import { shopLiveState } from './shopStatus';

export const SETTINGS_SECTION_KEYS = ['status', 'details', 'look', 'hours', 'orders', 'pay', 'danger'] as const;
export type SettingsSectionKey = (typeof SETTINGS_SECTION_KEYS)[number];

export interface SettingsSectionItem {
  key: SettingsSectionKey;
  title: string;
  status?: string;
  danger?: boolean;
}

/** The section named in `?section=`; anything missing or unknown falls back to the first. */
export function parseSettingsSection(raw: string | null): SettingsSectionKey {
  return (SETTINGS_SECTION_KEYS as readonly string[]).includes(raw ?? '') ? (raw as SettingsSectionKey) : 'status';
}

const P = 'shops.settingsPage.';

/** One-line summary under each section title, derived from data the page already holds. */
export function buildSettingsSections(opts: {
  shop: GetShopResultDto;
  openDays: number;
  nowMs: number;
  t: TFunction;
  showDanger: boolean;
}): SettingsSectionItem[] {
  const { shop, openDays, nowMs, t, showDanger } = opts;
  const live = shopLiveState(shop, nowMs);
  const liveStatus = t(live === 'offline' ? `${P}statusOffline` : live === 'ordersPaused' ? `${P}statusPaused` : `${P}statusOnline`);

  const choice = autoAcceptChoiceOf(shop.orderSettings);
  const accept = t(choice === 'always' ? `${P}acceptAuto` : choice === 'scheduled' ? `${P}acceptScheduled` : `${P}acceptManual`);
  const ordersStatus = shop.orderSettings?.delivery ? t(`${P}withDelivery`, { status: accept }) : accept;

  const stripe = shop.stripe?.connectOnboardingStatus;
  const payStatus = t(stripe === 'complete' ? `${P}stripeConnected` : stripe === 'pending' ? `${P}stripePending` : `${P}stripeNotConnected`);

  const items: SettingsSectionItem[] = [
    { key: 'status', title: t(`${P}sections.status`), status: liveStatus },
    { key: 'details', title: t(`${P}sections.details`), status: `${shop.name} · /${shop.slug}` },
    { key: 'look', title: t(`${P}sections.look`), status: t(bannerShownOf(shop.branding) ? `${P}bannerOn` : `${P}bannerOff`) },
    { key: 'hours', title: t(`${P}sections.hours`), status: t(`${P}daysOpen`, { count: openDays }) },
    { key: 'orders', title: t(`${P}sections.orders`), status: ordersStatus },
    { key: 'pay', title: t(`${P}sections.pay`), status: payStatus },
  ];
  if (showDanger) items.push({ key: 'danger', title: t(`${P}sections.danger`), danger: true });
  return items;
}
