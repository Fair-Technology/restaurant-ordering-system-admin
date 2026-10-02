import type { IntakeOrder } from '../../services/ordersApi';

export const REJECT_REASONS = ['too_busy', 'item_unavailable', 'closing_soon', 'other'] as const;

export function groupQueue(orders: IntakeOrder[]): {
  waiting: IntakeOrder[];
  inProgress: IntakeOrder[];
  ready: IntakeOrder[];
} {
  return {
    waiting: orders.filter((o) => o.displayState === 'PLACED'),
    inProgress: orders.filter((o) => o.displayState === 'ACCEPTED' || o.displayState === 'IN_PREPARATION'),
    ready: orders.filter((o) => o.displayState === 'READY'),
  };
}

export function hasWaitingOrders(orders: IntakeOrder[]): boolean {
  return orders.some((o) => o.state === 'PLACED');
}

export function secondsUntil(iso: string | null, nowMs: number): number | null {
  if (iso === null) return null;
  return Math.max(0, Math.ceil((Date.parse(iso) - nowMs) / 1000));
}

export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function prepChoices(defaultMinutes: number): number[] {
  return [defaultMinutes, defaultMinutes + 10, defaultMinutes + 20, defaultMinutes + 30];
}

export type ConnectionState = 'connecting' | 'connected' | 'offline';

export function connectionState(input: {
  lastSuccessAt: number | undefined;
  isError: boolean;
  nowMs: number;
}): ConnectionState {
  if (input.isError) return 'offline';
  if (input.lastSuccessAt === undefined) return 'connecting';
  return input.nowMs - input.lastSuccessAt > 30000 ? 'offline' : 'connected';
}
