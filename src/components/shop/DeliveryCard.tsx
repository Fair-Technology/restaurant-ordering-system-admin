import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReferenceListsResponse, ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import {
  MAX_ZONES,
  deliveryBody,
  deliveryFeeVat,
  deliveryFormOf,
  invalidZoneRows,
  type DeliveryForm,
} from '../../features/shops/deliverySettings';
import { Section } from '../layout/Page';
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
  const feeVat = refs ? deliveryFeeVat(refs, i18n.language) : null;
  const [formState, setFormState] = useState<DeliveryForm | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const form = formState ?? deliveryFormOf(shop.orderSettings);
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
    <Section id="delivery" className="scroll-mt-[72px]! lg:scroll-mt-6!" title={t('shops.deliveryTitle')} description={t('shops.deliveryHelp')} padded>
      <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-ink"
          checked={form.delivery}
          onChange={(e) => change({ delivery: e.target.checked })}
        />
        <span>
          <span className="block font-semibold">{t('shops.deliveryLabel')}</span>
          <span className="block text-[13px] text-muted">{t('shops.deliveryLabelHelp')}</span>
        </span>
      </label>
      {form.delivery && form.zones.length === 0 && (
        <p className="rounded-xl border border-[#f1dfae] bg-[#fff6e0] px-3 py-2 text-sm text-[#8a5a00]">{t('shops.deliveryNoZones')}</p>
      )}
      {feeVat && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">
            {t('shops.deliveryFeeVat', { name: feeVat.name, rate: feeVat.rate })}
          </p>
          <p className="text-xs text-muted">{t('shops.deliveryFeeVatHelp')}</p>
        </div>
      )}
      <div className="space-y-2">
        {form.zones.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 text-xs font-semibold text-[#8a7f77]">
            <span>{t('shops.deliveryPostcode')}</span>
            <span>{t('shops.deliveryFee')}</span>
            <span>{t('shops.deliveryMinOrder')}</span>
            <span />
          </div>
        )}
        {form.zones.map((z, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
            <input
              type="text"
              aria-label={t('shops.deliveryPostcode')}
              className={`h-10 w-full min-w-0 rounded-[10px] border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink ${
                badRows.includes(i) ? 'border-[#b42318]' : 'border-[#e3d9ce]'
              }`}
              value={z.postcode}
              onChange={(e) => changeZone(i, { postcode: e.target.value })}
            />
            <CurrencyInput valueCents={z.feeCents} onChange={(feeCents) => changeZone(i, { feeCents })} />
            <CurrencyInput valueCents={z.minOrderCents} onChange={(minOrderCents) => changeZone(i, { minOrderCents })} />
            <button
              type="button"
              aria-label={t('shops.deliveryRemoveZone')}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base leading-none text-[#8a7f77] transition-colors hover:bg-[#fdeceb] hover:text-[#b42318]"
              onClick={() => change({ zones: form.zones.filter((_, j) => j !== i) })}
            >
              ×
            </button>
          </div>
        ))}
        {form.zones.length < MAX_ZONES && (
          <button
            type="button"
            className="text-[13px] font-semibold text-ink underline underline-offset-2"
            onClick={() => change({ zones: [...form.zones, { postcode: '', feeCents: 0, minOrderCents: 0 }] })}
          >
            {t('shops.deliveryAddZone')}
          </button>
        )}
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="radio"
            name="deliveryHours"
            className="h-4 w-4 accent-ink"
            checked={!form.ownHours}
            onChange={() => change({ ownHours: false })}
          />
          <span>{t('shops.deliveryHoursSame')}</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="radio"
            name="deliveryHours"
            className="h-4 w-4 accent-ink"
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
        <p className={`text-sm ${message.kind === 'saved' ? 'text-[#1d5a32]' : 'text-[#b42318]'}`}>{message.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        <MyButton onClick={handleSave} disabled={isLoading || badRows.length > 0}>
          {t('shops.deliverySave')}
        </MyButton>
      </div>
      </div>
    </Section>
  );
}
