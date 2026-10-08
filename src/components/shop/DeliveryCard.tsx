import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReferenceListsResponse, ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import {
  MAX_ZONES,
  deliveryBody,
  deliveryFormOf,
  invalidZoneRows,
  type DeliveryForm,
} from '../../features/shops/deliverySettings';
import { formatRate, labelFor } from '../../features/menu/foodInfo';
import { MyCard } from '../ui/MyCard';
import { MyButton } from '../ui/MyButton';
import { CurrencyInput } from '../ui/CurrencyInput';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';

interface Props {
  shop: ShopResponse;
  refs: ReferenceListsResponse | undefined;
  onRefetch: () => void;
}

export function DeliveryCard({ shop, refs, onRefetch }: Props) {
  const { t, i18n } = useTranslation();
  const [formState, setFormState] = useState<DeliveryForm | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const form = formState ?? deliveryFormOf(shop.orderSettings, refs?.defaultTaxClassId ?? null);
  const badRows = invalidZoneRows(form.zones, shop.countryCode ?? 'DE');
  const change = (patch: Partial<DeliveryForm>) => setFormState({ ...form, ...patch });
  const changeZone = (index: number, patch: Partial<DeliveryForm['zones'][number]>) =>
    change({ zones: form.zones.map((z, i) => (i === index ? { ...z, ...patch } : z)) });

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateOrderSettings({ shopId: shop.id, body: deliveryBody(form) }).unwrap();
      setFormState(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.deliverySaved') });
    } catch (e) {
      const detail = (e as { data?: { error?: string } })?.data?.error;
      setMessage({ kind: 'failed', text: detail ? `${t('shops.deliveryFailed')} ${detail}` : t('shops.deliveryFailed') });
    }
  };

  return (
    <MyCard className="p-6 space-y-4" id="delivery">
      <h2 className="text-base font-semibold text-gray-900">{t('shops.deliveryTitle')}</h2>
      <p className="text-sm text-gray-600">{t('shops.deliveryHelp')}</p>
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={form.delivery}
          onChange={(e) => change({ delivery: e.target.checked })}
        />
        <span>
          <span className="block font-medium">{t('shops.deliveryLabel')}</span>
          <span className="block text-gray-600">{t('shops.deliveryLabelHelp')}</span>
        </span>
      </label>
      {form.delivery && form.zones.length === 0 && (
        <p className="text-sm text-amber-800">{t('shops.deliveryNoZones')}</p>
      )}
      {refs && (
        <div className="space-y-1">
          <select
            aria-label={t('shops.deliveryFeeTaxClass')}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
            value={form.feeTaxClassId ?? ''}
            onChange={(e) => change({ feeTaxClassId: e.target.value || null })}
          >
            {refs.taxClasses
              .filter((c) => c.isActive)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {`${labelFor(c.labels, i18n.language)} (${formatRate(
                    refs.currentTaxRates.find((r) => r.taxClassId === c.id)?.rates.delivery ?? null,
                  )})`}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-500">{t('shops.deliveryFeeTaxClassHelp')}</p>
        </div>
      )}
      <div className="space-y-2">
        {form.zones.length > 0 && (
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>{t('shops.deliveryPostcode')}</span>
            <span>{t('shops.deliveryFee')}</span>
            <span>{t('shops.deliveryMinOrder')}</span>
            <span />
          </div>
        )}
        {form.zones.map((z, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
            <input
              type="text"
              aria-label={t('shops.deliveryPostcode')}
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-900 ${
                badRows.includes(i) ? 'border-red-500' : 'border-gray-200'
              }`}
              value={z.postcode}
              onChange={(e) => changeZone(i, { postcode: e.target.value })}
            />
            <CurrencyInput valueCents={z.feeCents} onChange={(feeCents) => changeZone(i, { feeCents })} />
            <CurrencyInput valueCents={z.minOrderCents} onChange={(minOrderCents) => changeZone(i, { minOrderCents })} />
            <button
              type="button"
              aria-label={t('shops.deliveryRemoveZone')}
              className="px-2 text-gray-500 hover:text-gray-900"
              onClick={() => change({ zones: form.zones.filter((_, j) => j !== i) })}
            >
              ×
            </button>
          </div>
        ))}
        {form.zones.length < MAX_ZONES && (
          <button
            type="button"
            className="text-sm font-medium text-gray-900 underline"
            onClick={() => change({ zones: [...form.zones, { postcode: '', feeCents: 0, minOrderCents: 0 }] })}
          >
            {t('shops.deliveryAddZone')}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-gray-800">
          <input
            type="radio"
            name="deliveryHours"
            className="h-4 w-4"
            checked={!form.ownHours}
            onChange={() => change({ ownHours: false })}
          />
          <span>{t('shops.deliveryHoursSame')}</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-gray-800">
          <input
            type="radio"
            name="deliveryHours"
            className="h-4 w-4"
            checked={form.ownHours}
            onChange={() => change({ ownHours: true })}
          />
          <span>{t('shops.deliveryHoursOwn')}</span>
        </label>
      </div>
      {form.ownHours && (
        <WeeklyHoursEditor
          week={form.hours}
          onChange={(hours) => change({ hours })}
          emptyLabel={t('shops.deliveryHoursClosed')}
          removeLabel={t('shops.autoAcceptRemove')}
        />
      )}
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      <div className="border-t border-gray-200 pt-4">
        <MyButton onClick={handleSave} disabled={isLoading || badRows.length > 0}>
          {t('shops.deliverySave')}
        </MyButton>
      </div>
    </MyCard>
  );
}
