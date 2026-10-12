import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useGetOrderDocumentMutation, type IntakeOrder, type RejectReason } from '../../services/ordersApi';
import { REJECT_REASONS, formatCountdown, prepChoices, scheduledReadyMs, type SlotLoad } from '../../features/orders/intake';
import { orderTiming } from '../../features/orders/orderView';
import { nextActionLabelKey } from '../../features/orders/useOrderActions';
import { canRefund, chargedCents } from '../../features/orders/refunds';
import { downloadBase64File } from '../../features/files/downloadBase64';
import { useToast } from '../../contexts/ToastContext';
import { formatCents } from '../../utils/money';
import { ModeBadge, StateBadge } from './OrderBadges';
import { RefundPanel } from './RefundPanel';

export type DetailKind = 'live' | 'upcoming' | 'history';

interface Actions {
  accept: (order: IntakeOrder, prepMinutes: number) => Promise<boolean>;
  reject: (order: IntakeOrder, reason: RejectReason) => Promise<boolean>;
  advance: (order: IntakeOrder) => Promise<boolean>;
  isWorking: (orderId: string) => boolean;
}

interface Props {
  shopId: string;
  order: IntakeOrder;
  kind: DetailKind;
  nowMs: number;
  timeZone: string;
  defaultPrepMinutes: number;
  permissions: readonly string[];
  /** Live and upcoming orders only */
  actions?: Actions;
  pendingAccept?: boolean;
  /** Upcoming orders: how full the booked time is, and whether it is outside opening hours */
  slotLoad?: SlotLoad | null;
  outsideHours?: boolean;
  /** Small screens show the detail over the list; this closes it */
  onClose?: () => void;
}

function paymentKey(order: IntakeOrder): string {
  const closed = order.state === 'REJECTED' || order.state === 'CANCELLED';
  if (closed && order.paymentStatus === 'authorized') return 'orders.releasePending';
  if (closed && order.paymentStatus === 'paid') return 'orders.refundPending';
  return `orders.payment.${order.paymentStatus}`;
}

interface Line {
  key: string;
  quantity: number;
  name: string;
  detail: string;
  cents: number;
}

/** Order lines as the kitchen reads them: a combo is one line with its dishes underneath. */
function linesOf(items: IntakeOrder['items']): Line[] {
  const lines: Line[] = [];
  const combos = new Map<number, Line>();
  items.forEach((item, i) => {
    const extra = [item.selectedVariantOptionName, ...(item.selectedAddonOptionNames ?? []).map((n) => `+ ${n}`)]
      .filter(Boolean)
      .join(' · ');
    if (item.combo) {
      const dish = extra ? `${item.productName} (${extra})` : item.productName;
      const existing = combos.get(item.combo.line);
      if (existing) {
        existing.detail = `${existing.detail} · ${dish}`;
        existing.cents += item.lineTotalCents;
        return;
      }
      const line = { key: `c${item.combo.line}`, quantity: item.quantity, name: item.combo.name, detail: dish, cents: item.lineTotalCents };
      combos.set(item.combo.line, line);
      lines.push(line);
      return;
    }
    lines.push({ key: `i${i}`, quantity: item.quantity, name: item.productName, detail: extra, cents: item.lineTotalCents });
  });
  return lines;
}

/**
 * OrderDetail — the right-hand column of the orders page: what to cook, for whom, how it is paid,
 * and the one or two buttons that move the order on. History orders show invoices and refunds.
 */
export function OrderDetail({
  shopId,
  order,
  kind,
  nowMs,
  timeZone,
  defaultPrepMinutes,
  permissions,
  actions,
  pendingAccept = false,
  slotLoad,
  outsideHours,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [getDocument] = useGetOrderDocumentMutation();
  const [prep, setPrep] = useState(defaultPrepMinutes);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RejectReason | null>(null);

  const money = (cents: number) => formatCents(cents, order.currency, i18n.language);
  const time = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', timeZone });
  const dateTime = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone });

  const live = kind === 'live';
  const timing = live ? orderTiming(order, nowMs) : null;
  const working = actions?.isWorking(order.id) ?? false;
  const nextKey = live ? nextActionLabelKey(order) : null;
  const canReject =
    !!actions &&
    (live ? order.state === 'PLACED' : kind === 'upcoming' && order.state !== 'REJECTED' && order.state !== 'CANCELLED');
  const placedAgo = Math.max(0, Math.floor((nowMs - Date.parse(order.createdAt)) / 60000));

  const downloadDocument = async (documentId: string) => {
    try {
      const file = await getDocument({ shopId, orderId: order.id, documentId }).unwrap();
      downloadBase64File(file.fileName, file.contentBase64, file.contentType);
    } catch {
      toast.error(t('orders.documentDownloadFailed'));
    }
  };

  const confirmReject = async () => {
    if (!actions || !reason) return;
    if (await actions.reject(order, reason)) {
      setRejecting(false);
      setReason(null);
    }
  };

  const chip = (on: boolean) =>
    `h-10 rounded-full border text-[13px] font-semibold transition-colors ${
      on ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
    }`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-line bg-white">
      {/* Header: number, state, how it is fulfilled, the clock that matters */}
      <div className="flex flex-col gap-2.5 border-b border-line-soft px-5 pt-[18px] pb-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-[26px] font-semibold">#{order.orderRef}</h2>
          <StateBadge order={order} />
          <span className="ml-auto text-[13px] text-muted">
            {order.state === 'PLACED' && live ? t('orders.placedAgo', { minutes: placedAgo }) : dateTime(order.createdAt)}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('orders.live.closeDetail')}
              className="-mr-1 rounded-full p-1.5 text-muted hover:bg-sand xl:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ModeBadge order={order} large />
          {order.scheduledFor && (
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-[13px] font-semibold text-[#4a413b]">
              {t('orders.live.scheduledFor', { time: dateTime(order.scheduledFor) })}
            </span>
          )}
          {order.autoAccepted && (
            <span className="rounded-full bg-[#e6f3ea] px-2.5 py-0.5 text-[13px] font-semibold text-[#1d5a32]">
              {t('orders.autoAccepted')}
            </span>
          )}
          {slotLoad && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
                slotLoad.full ? 'bg-[#fdeceb] text-[#b42318]' : 'bg-sand text-[#4a413b]'
              }`}
            >
              {t(slotLoad.full ? 'orders.slotFull' : 'orders.slotPlaces', { taken: slotLoad.taken, perSlot: slotLoad.perSlot })}
            </span>
          )}
          {outsideHours && (
            <span className="rounded-full bg-[#fff6e0] px-2.5 py-0.5 text-[13px] font-semibold text-[#8a5a00]">
              {t('orders.upcomingOutsideHours')}
            </span>
          )}
        </div>
        {timing && (timing.kind === 'reject' || timing.kind === 'due') && (
          <div className="flex flex-col gap-1.5">
            <div className={`flex justify-between text-[13px] font-bold ${timing.urgent ? 'text-[#b42318]' : 'text-ink'}`}>
              {timing.kind === 'reject' ? (
                <>
                  <span>{t('orders.live.autoRejectIn')}</span>
                  <span>{formatCountdown(timing.seconds)}</span>
                </>
              ) : (
                <>
                  <span>
                    {timing.minutes < 0
                      ? t('orders.live.late', { minutes: -timing.minutes })
                      : t(timing.delivery ? 'orders.live.deliverIn' : 'orders.live.readyIn', { minutes: timing.minutes })}
                  </span>
                  {order.readyAt && (
                    <span>{t(timing.delivery ? 'orders.deliverBy' : 'orders.readyAt', { time: time(order.readyAt) })}</span>
                  )}
                </>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#efe7de]">
              <div
                className={`h-full rounded-full ${
                  timing.kind === 'reject' ? 'bg-[#c2410c]' : timing.urgent ? 'bg-[#b42318]' : 'bg-[#2f8a4c]'
                }`}
                style={{ width: `${Math.round(timing.progress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* What to cook */}
      <ul className="flex flex-col gap-2.5 border-b border-line-soft px-5 py-3.5">
        {linesOf(order.items).map((line) => (
          <li key={line.key} className="flex items-start gap-3">
            <span className="flex h-7 min-w-8 items-center justify-center rounded-lg bg-sand px-1.5 text-[15px] font-bold">
              {line.quantity}×
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-bold">{line.name}</span>
              {line.detail && <span className="text-[13px] text-muted">{line.detail}</span>}
            </span>
            <span className="text-sm font-semibold whitespace-nowrap">{money(line.cents)}</span>
          </li>
        ))}
      </ul>

      {/* For whom, and how it is paid */}
      <div className="flex flex-col gap-2.5 px-5 py-3.5 text-sm">
        {order.customerNotes && (
          <div className="rounded-[10px] border border-[#f1dfae] bg-[#fff6e0] px-3 py-2.5 text-[#5c3c00]">
            <strong className="block text-xs tracking-[0.06em] uppercase">{t('orders.notes')}</strong>
            {order.customerNotes}
          </div>
        )}
        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[#3a322d]">
          <dt className="text-muted">{t('orders.live.guest')}</dt>
          <dd>
            {order.customerName}
            {order.customerPhone && (
              <>
                {' · '}
                <a href={`tel:${order.customerPhone}`} className="font-semibold text-ink underline">
                  {order.customerPhone}
                </a>
              </>
            )}
          </dd>
          {order.deliveryAddress && (
            <>
              <dt className="text-muted">{t('orders.deliverTo')}</dt>
              <dd>
                {order.deliveryAddress.street}, {order.deliveryAddress.postcode} {order.deliveryAddress.city}
              </dd>
            </>
          )}
          <dt className="text-muted">{t('orders.live.payment')}</dt>
          <dd>{t(paymentKey(order))}</dd>
          {order.discount && (
            <>
              <dt className="text-muted">{t('orders.live.discount')}</dt>
              <dd>
                {order.discount.code} −{money(order.discount.cents)}
              </dd>
            </>
          )}
          {order.fulfilmentMode === 'delivery' && order.deliveryFeeCents != null && (
            <>
              <dt className="text-muted">{t('orders.live.deliveryFee')}</dt>
              <dd>{money(order.deliveryFeeCents)}</dd>
            </>
          )}
          <dt className="text-muted">{t('orders.live.total')}</dt>
          <dd className="font-bold">{money(chargedCents(order))}</dd>
        </dl>
        {order.refunds.map((refund, i) => (
          <p key={i} className="text-[13px] text-muted">
            {t('orders.refundLine', { amount: money(refund.amountCents), date: dateTime(refund.at), reason: refund.reason })}
          </p>
        ))}
        {order.releaseFailure && (
          <p className="text-[13px] text-[#b42318]">{t('orders.releaseFailed', { message: order.releaseFailure.message })}</p>
        )}
        {order.loyaltyVoucherSent && <p className="text-[13px] text-muted">{t('orders.loyaltyVoucherSent')}</p>}
        {canRefund(order, permissions) && <RefundPanel shopId={shopId} order={order} />}
      </div>

      {/* The buttons that move it on */}
      <div className="mt-auto flex flex-col gap-2.5 border-t border-line-soft px-5 pt-3.5 pb-[18px]">
        {live && order.state === 'PLACED' && actions && !rejecting && (
          <div className="flex flex-col gap-2.5">
            {order.scheduledFor ? (
              <button
                type="button"
                disabled={working}
                onClick={() => void actions.accept(order, defaultPrepMinutes)}
                className="h-12 rounded-full bg-ink text-[15px] font-bold text-white disabled:opacity-50"
              >
                {t('orders.acceptScheduled', {
                  time: time(new Date(scheduledReadyMs(order.scheduledFor, nowMs, defaultPrepMinutes)).toISOString()),
                })}
              </button>
            ) : (
              <>
                <span className="text-[13px] font-semibold text-[#4a413b]">{t('orders.live.readyInLabel')}</span>
                <div role="group" aria-label={t('orders.live.readyInLabel')} className="grid grid-cols-4 gap-1.5">
                  {prepChoices(defaultPrepMinutes).map((minutes) => (
                    <button key={minutes} type="button" aria-pressed={prep === minutes} className={chip(prep === minutes)} onClick={() => setPrep(minutes)}>
                      {t('orders.live.minutes', { minutes })}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={working}
                onClick={() => setRejecting(true)}
                className="h-12 rounded-full border border-[#e3d9ce] bg-white px-[18px] text-sm font-semibold text-[#b42318] disabled:opacity-50"
              >
                {t('orders.reject')}
              </button>
              {!order.scheduledFor && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void actions.accept(order, prep)}
                  className="h-12 flex-1 rounded-full bg-ink text-[15px] font-bold text-white disabled:opacity-50"
                >
                  {t('orders.live.acceptReadyIn', { minutes: prep })}
                </button>
              )}
            </div>
          </div>
        )}

        {canReject && actions && (rejecting || kind === 'upcoming') && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-semibold text-[#4a413b]">{t('orders.live.rejectWhy')}</span>
            <div role="group" aria-label={t('orders.live.rejectWhy')} className="grid grid-cols-2 gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button key={r} type="button" aria-pressed={reason === r} className={chip(reason === r)} onClick={() => setReason(r)}>
                  {t(`orders.rejectReason.${r}`)}
                </button>
              ))}
            </div>
            {reason && <p className="text-[13px] text-muted">{t('orders.rejectConfirm', { ref: order.orderRef })}</p>}
            <div className="flex gap-2">
              {kind === 'live' && (
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setReason(null);
                  }}
                  className="h-12 rounded-full border border-[#e3d9ce] bg-white px-[18px] text-sm font-semibold"
                >
                  {t('orders.cancel')}
                </button>
              )}
              <button
                type="button"
                disabled={!reason || working}
                onClick={() => void confirmReject()}
                className="h-12 flex-1 rounded-full bg-[#b42318] text-[15px] font-bold text-white disabled:opacity-40"
              >
                {t('orders.live.rejectOrder')}
              </button>
            </div>
          </div>
        )}

        {pendingAccept && <p className="text-[13px] text-muted">{t('orders.acceptPending')}</p>}
        {nextKey && actions && (
          <button
            type="button"
            disabled={working || pendingAccept}
            onClick={() => void actions.advance(order)}
            className="h-12 rounded-full bg-ink text-[15px] font-bold text-white disabled:opacity-50"
          >
            {t(nextKey)}
          </button>
        )}

        {(order.documents.length > 0 || order.customerPhone) && (
          <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px]">
            {order.documents.map((doc) => (
              <button key={doc.id} type="button" onClick={() => void downloadDocument(doc.id)} className="text-[#5c524b] underline">
                {t(`orders.document.${doc.kind}`, { number: doc.number })}
              </button>
            ))}
            {order.customerPhone && (
              <a href={`tel:${order.customerPhone}`} className="text-[#5c524b] underline">
                {t('orders.live.callGuest')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
