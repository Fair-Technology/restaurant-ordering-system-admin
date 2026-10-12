import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import { Section } from '../layout/Page';
import { MyButton } from '../ui/MyButton';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

export function DineInCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [dineInState, setDineInState] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const dineIn = dineInState ?? shop.orderSettings?.dineIn ?? false;

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateOrderSettings({
        shopId: shop.id,
        body: { dineIn },
      }).unwrap();
      setDineInState(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.dineInSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.dineInFailed') });
    }
  };

  return (
    <Section id="dine-in" className="scroll-mt-[72px]! lg:scroll-mt-6!" title={t('shops.dineInTitle')} description={t('shops.dineInHelp')} padded>
      <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-ink"
          checked={dineIn}
          onChange={(e) => setDineInState(e.target.checked)}
        />
        <span>
          <span className="block font-semibold">{t('shops.dineInLabel')}</span>
          <span className="block text-[13px] text-muted">{t('shops.dineInLabelHelp')}</span>
        </span>
      </label>
      {dineIn && (
        <Link to={`/shops/${shop.id}/tables`} className="inline-block text-[13px] font-semibold text-ink underline underline-offset-2">
          {t('shops.dineInTablesLink')}
        </Link>
      )}
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-[#1d5a32]' : 'text-[#b42318]'}`}>{message.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.dineInSave')}
        </MyButton>
      </div>
      </div>
    </Section>
  );
}
