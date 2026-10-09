import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import { slotCapacityFromInput, slotCapacityInputOf } from '../../features/shops/scheduledSettings';
import { MyCard } from '../ui/MyCard';
import { MyInput } from '../ui/MyInput';
import { MyButton } from '../ui/MyButton';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

export function ScheduledOrdersCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [scheduledState, setScheduledState] = useState<boolean | null>(null);
  const [capacityState, setCapacityState] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const scheduledOrders = scheduledState ?? shop.orderSettings?.scheduledOrders ?? false;
  const capacityText = capacityState ?? slotCapacityInputOf(shop.orderSettings);

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    const slotCapacity = slotCapacityFromInput(capacityText);
    if (slotCapacity === 'invalid') {
      setMessage({ kind: 'failed', text: t('shops.scheduledCapacityError') });
      return;
    }
    try {
      await updateOrderSettings({
        shopId: shop.id,
        body: { scheduledOrders, slotCapacity },
      }).unwrap();
      setScheduledState(null);
      setCapacityState(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.scheduledSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.scheduledFailed') });
    }
  };

  return (
    <MyCard className="p-6 space-y-4" id="orders-for-later">
      <h2 className="text-base font-semibold text-gray-900">{t('shops.scheduledTitle')}</h2>
      <p className="text-sm text-gray-600">{t('shops.scheduledHelp')}</p>
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={scheduledOrders}
          onChange={(e) => setScheduledState(e.target.checked)}
        />
        <span>
          <span className="block font-medium">{t('shops.scheduledLabel')}</span>
          <span className="block text-gray-600">{t('shops.scheduledLabelHelp')}</span>
        </span>
      </label>
      {scheduledOrders && (
        <div className="space-y-1">
          <MyInput
            type="number"
            min={1}
            max={50}
            step={1}
            label={t('shops.scheduledCapacityLabel')}
            placeholder={t('shops.scheduledCapacityPlaceholder')}
            value={capacityText}
            onChange={(e) => setCapacityState(e.target.value)}
          />
          <p className="text-xs text-gray-500">{t('shops.scheduledCapacityHelp')}</p>
        </div>
      )}
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      <div className="border-t border-gray-200 pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.scheduledSave')}
        </MyButton>
      </div>
    </MyCard>
  );
}
