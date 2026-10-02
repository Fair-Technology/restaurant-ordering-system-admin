import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCents } from '../../utils/money';
import { useGetOrdersByShopQuery } from '../../services/api';
import type { OrderResponse } from '../../services/api';
import { ORDER_STATE_BADGE } from '../../features/orders/orderState';
import { MyCard } from '../ui/MyCard';
import { MySpinner } from '../ui/MySpinner';
import { MyButton } from '../ui/MyButton';

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface OrderRowProps {
  order: OrderResponse;
}

function OrderRow({ order }: OrderRowProps) {
  const { t, i18n } = useTranslation();
  const formatCurrency = (cents: number, currency: string) => formatCents(cents, currency, i18n.language);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold text-gray-900">{order.orderRef}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATE_BADGE[order.displayState]}`}>
              {t(`orders.state.${order.displayState}`)}
            </span>
            <span className="text-xs text-gray-500">
              {t(`orders.fulfilment.${order.fulfilmentMode}`)}
            </span>
            <span className="text-xs text-gray-500">
              {t(`orders.payment.${order.paymentStatus}`)}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(order.subtotalCents, order.currency)}
          </span>
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-sm text-gray-500">
          <span>{order.customerName} &middot; {order.customerEmail} &middot; {order.customerPhone}</span>
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 bg-gray-50">
          <div className="divide-y divide-gray-200 rounded-xl overflow-hidden border border-gray-200">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between px-4 py-2 text-sm gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-700">
                    {item.productName} &times; {item.quantity} @ {formatCurrency(item.unitPriceCents, order.currency)}
                  </span>
                  {item.selectedVariantOptionName && (
                    <span className="text-xs text-gray-400">
                      {item.selectedVariantOptionName}
                    </span>
                  )}
                  {item.selectedAddonOptionNames && item.selectedAddonOptionNames.length > 0 && (
                    <span className="text-xs text-gray-400">
                      + {item.selectedAddonOptionNames.join(', ')}
                    </span>
                  )}
                </div>
                <span className="text-gray-900 font-medium shrink-0">
                  {formatCurrency(item.lineTotalCents, order.currency)}
                </span>
              </div>
            ))}
          </div>
          {order.customerNotes && (
            <p className="mt-2 text-xs text-gray-400 italic">&ldquo;{order.customerNotes}&rdquo;</p>
          )}
        </div>
      )}
    </>
  );
}

interface OrderHistoryListProps {
  shopId: string;
}

export function OrderHistoryList({ shopId }: OrderHistoryListProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [shopId]);

  const { data, isLoading, isError } = useGetOrdersByShopQuery({
    shopId,
    page,
    pageSize: PAGE_SIZE,
  });

  if (isLoading) return <MySpinner label={t('orders.loading')} />;
  if (isError) return <p className="text-red-500">{t('orders.loadError')}</p>;

  const orders = data?.orders ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const showPagination = data ? data.total > PAGE_SIZE : false;

  return (
    <div className="space-y-4">
      <MyCard>
        {orders.length === 0 ? (
          <p className="p-5 text-gray-400 text-sm">{t('orders.empty')}</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </MyCard>

      {showPagination && (
        <div className="flex items-center justify-between mt-4">
          <MyButton
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('orders.previousPage')}
          </MyButton>
          <span className="text-sm text-gray-500">
            {t('orders.pageInfo', { page, total: totalPages })}
          </span>
          <MyButton
            variant="secondary"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('orders.nextPage')}
          </MyButton>
        </div>
      )}
    </div>
  );
}
