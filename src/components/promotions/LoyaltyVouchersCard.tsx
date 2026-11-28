import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GetShopResultDto } from '../../services/api';
import { useGetLoyaltyVouchersQuery } from '../../services/promotionsApi';
import { EmptyNote, Pager, Section } from '../layout/Page';
import { badgeClass } from '../layout/pageStyles';
import { MySpinner } from '../ui/MySpinner';
import { formatCents } from '../../utils/money';
import { formatShopDate } from '../../utils/locale';
import { showingRange } from '../../features/activity/activity';
import {
  LOYALTY_VOUCHERS_PAGE_SIZE,
  loyaltyVoucherStatus,
  shopToday,
  type LoyaltyVoucherStatus,
} from '../../features/promotions/promotions';

interface LoyaltyVouchersCardProps {
  shopId: string;
  shop: GetShopResultDto;
  loyaltyEnabled: boolean;
}

const COLUMNS = ['code', 'value', 'issued', 'validUntil', 'status', 'order'] as const;
const th = 'px-4 py-2.5 text-left text-xs font-semibold text-muted whitespace-nowrap';
const td = 'px-4 py-2.5 align-middle';

const VOUCHER_TONE: Record<LoyaltyVoucherStatus, keyof typeof badgeClass> = {
  used: 'neutral',
  expired: 'neutral',
  active: 'good',
};

// 'YYYY-MM-DD' shop-local date; German reads DD.MM.YYYY
function showDate(date: string, language: string): string {
  if (!language.startsWith('de')) return date;
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

export function LoyaltyVouchersCard({ shopId, shop, loyaltyEnabled }: LoyaltyVouchersCardProps) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [nowMs] = useState(() => Date.now());
  const { data, isLoading } = useGetLoyaltyVouchersQuery({ shopId, page, pageSize: LOYALTY_VOUCHERS_PAGE_SIZE });

  if (!loyaltyEnabled && (!data || data.total === 0)) return null;

  const timeZone = shop.timezone ?? 'Europe/Berlin';
  const today = shopToday(timeZone, nowMs);
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? LOYALTY_VOUCHERS_PAGE_SIZE;
  const totalPages = Math.ceil(total / pageSize);
  const range = showingRange(page, pageSize, total);

  return (
    <Section id="loyalty-vouchers" title={t('promotions.loyaltyVouchersTitle')}>
      {isLoading || !data ? (
        <MySpinner />
      ) : data.vouchers.length === 0 ? (
        <EmptyNote>{t('promotions.loyaltyVouchersEmpty')}</EmptyNote>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line-soft">
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className={th}>{t(`promotions.loyaltyVoucherColumn.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.vouchers.map(({ code, amountCents, issuedAt, expiresOn, used, orderRef }) => {
                const status = loyaltyVoucherStatus({ used, expiresOn }, today);
                return (
                  <tr key={code} className="border-b border-line-soft last:border-b-0">
                    <td className={`${td} font-mono font-semibold`}>{code}</td>
                    <td className={td}>{formatCents(amountCents, shop.currency ?? 'EUR', i18n.language)}</td>
                    <td className={td}>
                      {formatShopDate(issuedAt, i18n.language, shop.countryCode, undefined, timeZone)}
                    </td>
                    <td className={td}>{showDate(expiresOn, i18n.language)}</td>
                    <td className={td}>
                      <span className={badgeClass[VOUCHER_TONE[status]]}>
                        {t(`promotions.loyaltyVoucherStatus.${status}`)}
                      </span>
                    </td>
                    <td className={td}>
                      {orderRef ?? <span className="text-muted">{t('promotions.loyaltyVoucherNoOrder')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && total > data.pageSize && (
        <div className="flex flex-col gap-2 border-t border-line-soft px-4 py-3">
          <p className="text-[13px] text-muted">
            {t('activity.showingRange', { from: range.from, to: range.to, total })}
          </p>
          <Pager page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      )}
    </Section>
  );
}
