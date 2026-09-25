export type OrderDisplayState =
  | 'PLACED'
  | 'ACCEPTED'
  | 'IN_PREPARATION'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export const ORDER_DISPLAY_STATES: readonly OrderDisplayState[] = [
  'PLACED',
  'ACCEPTED',
  'IN_PREPARATION',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export const ORDER_STATE_BADGE: Record<OrderDisplayState, string> = {
  PLACED: 'bg-blue-50 text-blue-700 border border-blue-200',
  ACCEPTED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  IN_PREPARATION: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  READY: 'bg-green-50 text-green-700 border border-green-200',
  OUT_FOR_DELIVERY: 'bg-green-50 text-green-700 border border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border border-gray-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
};
