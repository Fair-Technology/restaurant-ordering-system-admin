import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateLoyaltyMutation, type LoyaltyRuleDto } from '../../services/promotionsApi';
import { useToast } from '../../contexts/ToastContext';
import { parseAmountToCents } from '../../features/orders/refunds';
import { MyButton } from '../ui/MyButton';
import { MyCard } from '../ui/MyCard';
import { MyInput } from '../ui/MyInput';

interface LoyaltyCardProps {
  shopId: string;
  shop: ShopResponse;
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
    ? new Date(loyalty.since).toLocaleDateString(i18n.language.startsWith('de') ? 'de-DE' : 'en-GB', {
        timeZone: shop.timezone ?? 'Europe/Berlin',
      })
    : null;

  return (
    <MyCard className="p-6 space-y-4" id="loyalty">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-gray-900">{t('promotions.loyaltyTitle')}</h2>
        <p className="text-sm text-gray-600">{t('promotions.loyaltyHelp')}</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t('promotions.loyaltyEnabled')}
      </label>
      <div className="grid grid-cols-3 gap-3">
        <MyInput label={t('promotions.everyOrders')} value={everyOrders} onChange={(e) => setEveryOrders(e.target.value)} />
        <MyInput label={t('promotions.reward')} value={reward} onChange={(e) => setReward(e.target.value)} />
        <MyInput label={t('promotions.validDays')} value={validDays} onChange={(e) => setValidDays(e.target.value)} />
      </div>
      {since && <p className="text-xs text-gray-500">{t('promotions.loyaltySince', { date: since })}</p>}
      {invalid && <p className="text-sm text-red-600">{t('promotions.loyaltyInvalid')}</p>}
      <MyButton disabled={isLoading} onClick={save}>
        {t('promotions.loyaltySave')}
      </MyButton>
    </MyCard>
  );
}
