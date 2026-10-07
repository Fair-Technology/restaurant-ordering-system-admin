import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import { MyCard } from '../ui/MyCard';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

const DEFAULT_SETTINGS = { autoRejectMinutes: 10, alertEmail: null };

export function OrderAlertsCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [minutesState, setMinutesState] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const loaded = shop.orderSettings ?? DEFAULT_SETTINGS;
  const minutes = minutesState ?? String(loaded.autoRejectMinutes);
  const email = emailState ?? loaded.alertEmail ?? '';

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateOrderSettings({
        shopId: shop.id,
        body: {
          autoRejectMinutes: Number(minutes),
          alertEmail: email.trim() === '' ? null : email.trim(),
        },
      }).unwrap();
      setMinutesState(null);
      setEmailState(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.orderAlertsSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.orderAlertsFailed') });
    }
  };

  return (
    <MyCard className="p-6 space-y-4" id="order-alerts">
      <h2 className="text-base font-semibold text-gray-900">{t('shops.orderAlertsTitle')}</h2>
      <p className="text-sm text-gray-600">{t('shops.orderAlertsHelp')}</p>
      <MyInput
        type="number"
        min={5}
        max={30}
        step={1}
        label={t('shops.orderAlertsMinutes')}
        value={minutes}
        onChange={(e) => setMinutesState(e.target.value)}
      />
      <MyInput
        type="email"
        label={t('shops.orderAlertsEmail')}
        value={email}
        onChange={(e) => setEmailState(e.target.value)}
      />
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      <div className="border-t border-gray-200 pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.orderAlertsSave')}
        </MyButton>
      </div>
    </MyCard>
  );
}
