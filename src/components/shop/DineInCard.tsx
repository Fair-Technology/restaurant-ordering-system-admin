import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import { MyCard } from '../ui/MyCard';
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
    <MyCard className="p-6 space-y-4" id="dine-in">
      <h2 className="text-base font-semibold text-gray-900">{t('shops.dineInTitle')}</h2>
      <p className="text-sm text-gray-600">{t('shops.dineInHelp')}</p>
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={dineIn}
          onChange={(e) => setDineInState(e.target.checked)}
        />
        <span>
          <span className="block font-medium">{t('shops.dineInLabel')}</span>
          <span className="block text-gray-600">{t('shops.dineInLabelHelp')}</span>
        </span>
      </label>
      {dineIn && (
        <Link to={`/shops/${shop.id}/tables`} className="block text-sm font-medium text-gray-900 underline">
          {t('shops.dineInTablesLink')}
        </Link>
      )}
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      <div className="border-t border-gray-200 pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.dineInSave')}
        </MyButton>
      </div>
    </MyCard>
  );
}
