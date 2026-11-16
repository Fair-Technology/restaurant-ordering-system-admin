import type { ReactNode } from 'react';
import type { IntakeOrder } from '../../services/ordersApi';
import { itemSummary, type LiveGroupKey } from '../../features/orders/orderView';
import { ModeBadge } from './OrderBadges';

export interface BoardColumnView {
  key: LiveGroupKey;
  title: string;
  empty: string;
  orders: IntakeOrder[];
}

interface Props {
  columns: BoardColumnView[];
  selectedId?: string;
  onSelect: (order: IntakeOrder) => void;
  timeOf: (order: IntakeOrder) => { text: string; urgent: boolean };
  moneyOf: (order: IntakeOrder) => string;
  actionFor: (order: IntakeOrder) => ReactNode;
}

const DOT: Record<LiveGroupKey, string> = { new: 'bg-[#c2410c]', work: 'bg-ink', ready: 'bg-[#2f8a4c]' };

/** The live queue as side-by-side columns. Presentational; every stage change is a button on the card. */
export function OrderBoard({ columns, selectedId, onSelect, timeOf, moneyOf, actionFor }: Props) {
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      {columns.map((column) => (
        <section key={column.key} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
            <span className={`h-[9px] w-[9px] rounded-full ${DOT[column.key]}`} aria-hidden="true" />
            <h2 className="text-[15px] font-bold">{column.title}</h2>
            <span className="text-[13px] text-[#8a7f77]">{column.orders.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {column.orders.length === 0 ? (
              <p className="p-4 text-sm text-[#8a7f77]">{column.empty}</p>
            ) : (
              column.orders.map((order) => {
                const selected = selectedId === order.id;
                const time = timeOf(order);
                return (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => onSelect(order)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSelect(order);
                      }
                    }}
                    className={`cursor-pointer border-b border-line-soft p-3 transition-colors last:border-b-0 hover:bg-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
                      selected ? 'bg-cream shadow-[inset_3px_0_0_#1f1a17]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold tracking-[0.02em]">#{order.orderRef}</span>
                      <ModeBadge order={order} />
                      <span className={`ml-auto text-[13px] font-semibold ${time.urgent ? 'text-[#b42318]' : 'text-[#4a413b]'}`}>{time.text}</span>
                    </div>
                    <div className="mt-1 flex min-w-0 flex-col gap-[3px]">
                      <span className="truncate text-[14px] font-bold">{order.customerName}</span>
                      <span className="truncate text-[13px] text-muted">{itemSummary(order.items)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[15px] font-bold">{moneyOf(order)}</span>
                      <div className="flex justify-end gap-1.5">{actionFor(order)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
