import type { OrderLimitStatusDto } from '../../services/subscriptionApi';

export interface LimitBanner {
  level: 80 | 90 | 95 | 100;
  count: number;
  limit: number;
  tone: 'warning' | 'stop';
}

/** What the banner should say, or null when there is nothing to warn about. */
export function limitBannerOf(s: OrderLimitStatusDto | undefined): LimitBanner | null {
  if (!s || s.limit === null || s.warningLevel === 0) return null;
  return { level: s.warningLevel, count: s.acceptedOrderCount, limit: s.limit, tone: s.warningLevel === 100 ? 'stop' : 'warning' };
}
