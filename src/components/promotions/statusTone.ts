import type { CodeStatus } from '../../features/promotions/promotions';
import type { badgeClass } from '../layout/pageStyles';

/** Which badge colour each discount-code status gets. */
export const STATUS_TONE: Record<CodeStatus, keyof typeof badgeClass> = {
  active: 'good',
  scheduled: 'warn',
  off: 'neutral',
  used_up: 'neutral',
  expired: 'bad',
};
