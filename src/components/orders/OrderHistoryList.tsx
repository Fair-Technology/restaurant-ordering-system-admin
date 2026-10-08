import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCents } from '../../utils/money';
import { useGetOrdersByShopQuery, useGetShopByIdQuery } from '../../services/api';
import { useGetOrderDocumentMutation, type IntakeOrder } from '../../services/ordersApi';
import { canRefund, chargedCents } from '../../features/orders/refunds';
import { downloadBase64File } from '../../features/files/downloadBase64';
import { useToast } from '../../contexts/ToastContext';
import { RefundPanel } from './RefundPanel';
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

function paymentLabelKey(order: IntakeOrder): string {
  const closed = order.state === 'REJECTED' || order.state === 'CANCELLED';
  if (closed && order.paymentStatus === 'authorized') return 'orders.releasePending';
  if (closed && order.paymentStatus === 'paid') return 'orders.refundPending';
  return `orders.payment.${order.paymentStatus}`;
}

interface OrderRowProps {
  shopId: string;
  order: IntakeOrder;
  permissions: readonly string[];
}

function OrderRow({ shopId, order, permissions }: OrderRowProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [getDocument] = useGetOrderDocumentMutation();
  const formatCurrency = (cents: number, currency: string) => formatCents(cents, currency, i18n.language);
  const [expanded, setExpanded] = useState(false);

  const downloadDocument = async (documentId: string) => {
    try {
      const file = await getDocument({ shopId, orderId: order.id, documentId }).unwrap();
      downloadBase64File(file.fileName, file.contentBase64, file.contentType);
    } catch {
      toast.error(t('orders.documentDownloadFailed'));
    }
  };
  const address = order.customerAddress;

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
            {order.table && (
              <span className="text-xs text-gray-500">{t('orders.table', { label: order.table.label })}</span>
            )}
            <span className="text-xs text-gray-500">
              {t(paymentLabelKey(order))}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(chargedCents(order), order.currency)}
          </span>
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-sm text-gray-500">
          <span>{[order.customerName, order.customerEmail, order.customerPhone].filter(Boolean).join(' · ')}</span>
          {order.deliveryAddress && (
            <span>
              {t('orders.deliverTo')}: {order.deliveryAddress.street}, {order.deliveryAddress.postcode}{' '}
              {order.deliveryAddress.city}
            </span>
          )}
          {address && <span>{`${address.street}, ${address.postcode} ${address.city}, ${address.country}`}</span>}
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
          {order.refunds.map((refund, i) => (
            <div key={i} className="mt-2 text-xs text-gray-600">
              <p>
                {t('orders.refundLine', {
                  amount: formatCurrency(refund.amountCents, order.currency),
                  date: formatDate(refund.at),
                  reason: refund.reason,
                })}
              </p>
              {refund.lines.length > 0 && (
                <p className="text-gray-500">
                  {t('orders.refundLineItems', {
                    items: refund.lines
                      .map((line) => `${line.quantity} × ${order.items[line.lineIndex]?.productName ?? ''}`)
                      .join(', '),
                  })}
                </p>
              )}
            </div>
          ))}
          {order.releaseFailure && (
            <p className="mt-2 text-xs text-red-600">
              {t('orders.releaseFailed', { message: order.releaseFailure.message })}
            </p>
          )}
          {order.documents.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {order.documents.map((doc) => (
                <MyButton key={doc.id} variant="secondary" size="sm" onClick={() => downloadDocument(doc.id)}>
                  {t(`orders.document.${doc.kind}`, { number: doc.number })}
                </MyButton>
              ))}
            </div>
          )}
          {canRefund(order, permissions) && <RefundPanel shopId={shopId} order={order} />}
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
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const permissions = shop?.callerPermissions ?? [];

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

  // the history endpoint returns the same extended order as the live queue
  const orders = (data?.orders ?? []) as IntakeOrder[];
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
              <OrderRow key={order.id} shopId={shopId} order={order} permissions={permissions} />
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
