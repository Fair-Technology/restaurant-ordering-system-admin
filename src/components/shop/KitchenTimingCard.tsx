import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import { kitchenTimingBody, kitchenTimingOf } from '../../features/shops/kitchenSettings';
import { Section } from '../layout/Page';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

const DEFAULT_FIXED_LAST_ORDERS = 20;

export function KitchenTimingCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [collectionState, setCollectionState] = useState<string | null>(null);
  const [deliveryState, setDeliveryState] = useState<string | null>(null);
  const [dineInState, setDineInState] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<string | null>(null);
  const [fixedState, setFixedState] = useState<boolean | null>(null);
  const [lastOrdersState, setLastOrdersState] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const loaded = kitchenTimingOf(shop.orderSettings);
  const collection = collectionState ?? String(loaded.collection);
  const delivery = deliveryState ?? String(loaded.delivery);
  const dineIn = dineInState ?? String(loaded.dineIn);
  const busy = busyState ?? String(loaded.busyExtraMinutes);
  const fixed = fixedState ?? loaded.lastOrdersMinutes !== null;
  const lastOrders = lastOrdersState ?? String(loaded.lastOrdersMinutes ?? DEFAULT_FIXED_LAST_ORDERS);

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateOrderSettings({
        shopId: shop.id,
        body: kitchenTimingBody({
          collection: Number(collection),
          delivery: Number(delivery),
          dineIn: Number(dineIn),
          lastOrdersMinutes: fixed ? Number(lastOrders) : null,
          busyExtraMinutes: Number(busy),
        }),
      }).unwrap();
      setCollectionState(null);
      setDeliveryState(null);
      setDineInState(null);
      setBusyState(null);
      setFixedState(null);
      setLastOrdersState(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.kitchenSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.kitchenFailed') });
    }
  };

  return (
    <Section id="kitchen-timing" className="scroll-mt-[72px]! lg:scroll-mt-6!" title={t('shops.kitchenTitle')} description={t('shops.kitchenHelp')} padded>
      <div className="space-y-4">
      <MyInput
        type="number"
        min={5}
        max={120}
        step={1}
        label={t('shops.kitchenPrepCollection')}
        value={collection}
        onChange={(e) => setCollectionState(e.target.value)}
      />
      <MyInput
        type="number"
        min={5}
        max={120}
        step={1}
        label={t('shops.kitchenPrepDelivery')}
        value={delivery}
        onChange={(e) => setDeliveryState(e.target.value)}
      />
      <MyInput
        type="number"
        min={5}
        max={120}
        step={1}
        label={t('shops.kitchenPrepDineIn')}
        value={dineIn}
        onChange={(e) => setDineInState(e.target.value)}
      />
      <MyInput
        type="number"
        min={5}
        max={120}
        step={1}
        label={t('shops.kitchenBusyMinutes')}
        value={busy}
        onChange={(e) => setBusyState(e.target.value)}
      />
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-[#4a413b]">{t('shops.kitchenLastOrders')}</p>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="radio"
            name="kitchenLastOrders"
            className="h-4 w-4 accent-ink"
            checked={!fixed}
            onChange={() => setFixedState(false)}
          />
          <span>{t('shops.kitchenLastOrdersPrep')}</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="radio"
            name="kitchenLastOrders"
            className="h-4 w-4 accent-ink"
            checked={fixed}
            onChange={() => setFixedState(true)}
          />
          <span>{t('shops.kitchenLastOrdersFixed')}</span>
        </label>
        {fixed && (
          <MyInput
            type="number"
            min={0}
            max={120}
            step={1}
            label={t('shops.kitchenLastOrdersMinutes')}
            value={lastOrders}
            onChange={(e) => setLastOrdersState(e.target.value)}
          />
        )}
      </div>
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-[#1d5a32]' : 'text-[#b42318]'}`}>{message.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.kitchenSave')}
        </MyButton>
      </div>
      </div>
    </Section>
  );
}
