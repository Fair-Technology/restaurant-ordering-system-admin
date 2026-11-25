import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GetShopResultDto } from '../../services/api';
import { useUpdateLoyaltyMutation, type LoyaltyRuleDto } from '../../services/promotionsApi';
import { useToast } from '../../contexts/ToastContext';
import { parseAmountToCents } from '../../features/orders/refunds';
import { MyButton } from '../ui/MyButton';
import { Section } from '../layout/Page';
import { MySwitch } from '../ui/MySwitch';
import { formatCents } from '../../utils/money';
import { loyaltyStatus } from '../../features/promotions/promotions';
import { MyInput } from '../ui/MyInput';
import { formatShopDate } from '../../utils/locale';

interface LoyaltyCardProps {
  shopId: string;
  shop: GetShopResultDto;
  loyalty: LoyaltyRuleDto;
}

// whole number inside [lo, hi], else null
function wholeBetween(text: string, lo: number, hi: number): number | null {
  const s = text.trim();
  return /^\d+$/.test(s) && Number(s) >= lo && Number(s) <= hi ? Number(s) : null;
}

export function LoyaltyCard({ shopId, shop, loyalty }: LoyaltyCardProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [updateLoyalty, { isLoading }] = useUpdateLoyaltyMutation();
  const decimalSeparator = i18n.language.startsWith('de') ? ',' : '.';
  const [enabled, setEnabled] = useState(loyalty.enabled);
  const [everyOrders, setEveryOrders] = useState(String(loyalty.everyOrders));
  const [reward, setReward] = useState((loyalty.rewardCents / 100).toFixed(2).replace('.', decimalSeparator));
  const [validDays, setValidDays] = useState(String(loyalty.validDays));
  const [invalid, setInvalid] = useState(false);

  const save = async () => {
    const every = wholeBetween(everyOrders, 2, 20);
    const rewardCents = parseAmountToCents(reward);
    const days = wholeBetween(validDays, 7, 365);
    if (every === null || rewardCents === null || rewardCents < 100 || rewardCents > 5000 || days === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    try {
      await updateLoyalty({
        shopId,
        body: { enabled, everyOrders: every, rewardCents, validDays: days },
      }).unwrap();
      toast.success(t('promotions.loyaltySaved'));
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? t('promotions.saveFailed'));
    }
  };

  const since = loyalty.since
    ? formatShopDate(loyalty.since, i18n.language, shop.countryCode, undefined, shop.timezone ?? 'Europe/Berlin')
    : null;

  const status = loyaltyStatus(loyalty);
  const currency = shop.currency ?? 'EUR';

  return (
    <Section
      id="loyalty"
      title={t('promotions.loyaltyTitle')}
      hint={
        status.enabled
          ? t('promotions.loyaltyStatusOn', {
              every: status.every,
              amount: formatCents(status.rewardCents, currency, i18n.language),
            })
          : t('promotions.loyaltyStatusOff')
      }
      actions={
        <div className="flex items-center gap-2">
          <span id="loyalty-enabled-label" className="text-sm font-semibold">
            {t('promotions.loyaltyEnabled')}
          </span>
          <MySwitch checked={enabled} onChange={setEnabled} labelledBy="loyalty-enabled-label" />
        </div>
      }
      description={t('promotions.loyaltyHelp')}
      padded
    >
      <div className="space-y-4">
        {enabled ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MyInput label={t('promotions.everyOrders')} hint={t('promotions.everyOrdersHint')} value={everyOrders} onChange={(e) => setEveryOrders(e.target.value)} />
              <MyInput label={t('promotions.reward')} hint={t('promotions.rewardHint')} value={reward} onChange={(e) => setReward(e.target.value)} />
              <MyInput label={t('promotions.validDays')} hint={t('promotions.validDaysHint')} value={validDays} onChange={(e) => setValidDays(e.target.value)} />
            </div>
            {since && <p className="text-xs text-muted">{t('promotions.loyaltySince', { date: since })}</p>}
            <p className="text-[13px] text-muted">{t('promotions.loyaltyConsentNote')}</p>
          </>
        ) : (
          <p className="text-[13px] text-muted">{t('promotions.loyaltyOffNote')}</p>
        )}
        {invalid && <p role="alert" className="text-sm text-[#b42318]">{t('promotions.loyaltyInvalid')}</p>}
        <MyButton type="button" isPending={isLoading} onClick={save}>
          {t('promotions.loyaltySave')}
        </MyButton>
      </div>
    </Section>
  );
}
