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
  const [autoAcceptState, setAutoAcceptState] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const loaded = shop.orderSettings ?? DEFAULT_SETTINGS;
  const minutes = minutesState ?? String(loaded.autoRejectMinutes);
  const email = emailState ?? loaded.alertEmail ?? '';
  const autoAccept = autoAcceptState ?? shop.orderSettings?.autoAccept ?? true;

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateOrderSettings({
        shopId: shop.id,
        body: {
          autoRejectMinutes: Number(minutes),
          alertEmail: email.trim() === '' ? null : email.trim(),
          autoAccept,
        },
      }).unwrap();
      setMinutesState(null);
      setEmailState(null);
      setAutoAcceptState(null);
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
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={autoAccept}
          onChange={(e) => setAutoAcceptState(e.target.checked)}
        />
        <span>
          <span className="block font-medium">{t('shops.orderAlertsAutoAccept')}</span>
          <span className="block text-gray-600">{t('shops.orderAlertsAutoAcceptHelp')}</span>
        </span>
      </label>
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
