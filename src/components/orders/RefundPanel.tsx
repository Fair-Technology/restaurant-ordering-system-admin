import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCents } from '../../utils/money';
import { useRefundOrderMutation, type IntakeOrder } from '../../services/ordersApi';
import { useToast } from '../../contexts/ToastContext';
import {
  itemSelectionCents,
  parseAmountToCents,
  refundableCents,
  remainingQuantities,
  selectionToItems,
} from '../../features/orders/refunds';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';

type Mode = 'items' | 'amount';

interface RefundPanelProps {
  shopId: string;
  order: IntakeOrder;
}

export function RefundPanel({ shopId, order }: RefundPanelProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [refundOrder, { isLoading }] = useRefundOrderMutation();
  const formatMoney = (cents: number) => formatCents(cents, order.currency, i18n.language);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('items');
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const max = refundableCents(order);
  const left = remainingQuantities(order);
  const defaultAmount = (max / 100).toFixed(2).replace('.', i18n.language.startsWith('de') ? ',' : '.');
  const amountText = amountOverride ?? defaultAmount;
  const parsedAmount = parseAmountToCents(amountText, i18n.language);
  const amountValid = parsedAmount !== null && parsedAmount <= max;
  const itemsTotal = itemSelectionCents(order, selection);

  const total = mode === 'items' ? itemsTotal : (parsedAmount ?? 0);
  const canSubmit =
    !isLoading && reason.trim() !== '' && (mode === 'items' ? itemsTotal > 0 && itemsTotal <= max : amountValid);

  const setQuantity = (index: number, quantity: number) =>
    setSelection((prev) => ({ ...prev, [index]: Math.min(Math.max(0, quantity), left[index] ?? 0) }));

  const submit = async () => {
    if (!canSubmit) return;
    if (!window.confirm(t('orders.refundConfirm', { amount: formatMoney(total), ref: order.orderRef }))) return;
    const base = { shopId, orderId: order.id, reason: reason.trim() };
    try {
      await refundOrder(
        mode === 'items'
          ? { ...base, items: selectionToItems(selection) }
          : { ...base, amountCents: parsedAmount ?? 0 },
      ).unwrap();
      toast.success(`${t('orders.refundDone', { amount: formatMoney(total) })} ${t('orders.refundCorrectionIssued')}`);
      setOpen(false);
      setSelection({});
      setAmountOverride(null);
      setReason('');
    } catch (err) {
      const message = (err as { data?: { error?: string } })?.data?.error ?? '';
      toast.error(t('orders.refundFailedToast', { message }));
    }
  };

  if (!open) {
    return (
      <div className="mt-3">
        <MyButton variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {t('orders.refund')}
        </MyButton>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex gap-2">
        <MyButton
          variant={mode === 'items' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={mode === 'items'}
          onClick={() => setMode('items')}
        >
          {t('orders.refundModeItems')}
        </MyButton>
        <MyButton
          variant={mode === 'amount' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={mode === 'amount'}
          onClick={() => setMode('amount')}
        >
          {t('orders.refundModeAmount')}
        </MyButton>
      </div>
      <p className="text-xs text-gray-500">{t('orders.refundModeHelp')}</p>

      {mode === 'items' ? (
        <div className="space-y-2">
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {order.items.map((item, i) => {
              const quantity = selection[i] ?? 0;
              const available = left[i] ?? 0;
              return (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-700">
                      {item.productName} @ {formatMoney(item.unitPriceCents)}
                    </span>
                    {item.selectedVariantOptionName && (
                      <span className="text-xs text-gray-400">{item.selectedVariantOptionName}</span>
                    )}
                    {item.selectedAddonOptionNames && item.selectedAddonOptionNames.length > 0 && (
                      <span className="text-xs text-gray-400">+ {item.selectedAddonOptionNames.join(', ')}</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {t('orders.refundItemLeft', { left: available, quantity: item.quantity })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <MyButton
                      variant="secondary"
                      size="sm"
                      aria-label="-"
                      disabled={available === 0 || quantity === 0}
                      onClick={() => setQuantity(i, quantity - 1)}
                    >
                      &minus;
                    </MyButton>
                    <span className="w-6 text-center font-medium tabular-nums">{quantity}</span>
                    <MyButton
                      variant="secondary"
                      size="sm"
                      aria-label="+"
                      disabled={available === 0 || quantity >= available}
                      onClick={() => setQuantity(i, quantity + 1)}
                    >
                      +
                    </MyButton>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm font-medium text-gray-900">
            {t('orders.refundItemsTotal', { amount: formatMoney(itemsTotal) })}
          </p>
          {itemsTotal === 0 && <p className="text-xs text-gray-500">{t('orders.refundItemsNone')}</p>}
        </div>
      ) : (
        <div className="space-y-1">
          <MyInput
            label={t('orders.refundAmount')}
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountOverride(e.target.value)}
          />
          {!amountValid && (
            <p className="text-xs text-red-600">{t('orders.refundInvalidAmount', { max: formatMoney(max) })}</p>
          )}
        </div>
      )}

      <MyInput label={t('orders.refundReason')} value={reason} onChange={(e) => setReason(e.target.value)} />

      <div className="flex gap-2">
        <MyButton size="sm" disabled={!canSubmit} onClick={submit}>
          {t('orders.refundConfirmButton', { amount: formatMoney(total) })}
        </MyButton>
        <MyButton variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t('orders.cancel')}
        </MyButton>
      </div>
    </div>
  );
}
