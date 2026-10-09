import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import {
  useCreateDiscountCodeMutation,
  useSetDiscountCodeActiveMutation,
  type PromotionsDto,
} from '../../services/promotionsApi';
import { useToast } from '../../contexts/ToastContext';
import { formatCents } from '../../utils/money';
import { codeFormToBody, codeStatus, codeValueLabel, shopToday, type CodeForm, type CodeFormError } from '../../features/promotions/promotions';
import { MyButton } from '../ui/MyButton';
import { MyCard } from '../ui/MyCard';
import { MyInput } from '../ui/MyInput';

const EMPTY_FORM: CodeForm = {
  code: '',
  kind: 'percent',
  value: '',
  minOrder: '',
  validFrom: '',
  validUntil: '',
  totalLimit: '',
  perEmailLimit: '1',
};

// dates are stored as YYYY-MM-DD; German owners read DD.MM.YYYY
function showDate(date: string | null, language: string): string {
  if (!date) return '…';
  if (!language.startsWith('de')) return date;
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

interface DiscountCodesCardProps {
  shopId: string;
  shop: ShopResponse;
  data: PromotionsDto;
}

export function DiscountCodesCard({ shopId, shop, data }: DiscountCodesCardProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [createDiscountCode, { isLoading: creating }] = useCreateDiscountCodeMutation();
  const [setDiscountCodeActive, { isLoading: switching }] = useSetDiscountCodeActiveMutation();
  const [form, setForm] = useState<CodeForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<CodeFormError | null>(null);

  const currency = shop.currency ?? 'EUR';
  const [nowMs] = useState(() => Date.now());
  const today = shopToday(shop.timezone ?? 'Europe/Berlin', nowMs);
  const money = (cents: number) => formatCents(cents, currency, i18n.language);
  const set = (patch: Partial<CodeForm>) => setForm((f) => ({ ...f, ...patch }));

  const serverMessage = (err: unknown): string =>
    (err as { data?: { error?: string } })?.data?.error ?? t('promotions.saveFailed');

  const toggle = async (codeId: string, active: boolean) => {
    try {
      await setDiscountCodeActive({ shopId, codeId, active }).unwrap();
    } catch {
      toast.error(t('promotions.saveFailed'));
    }
  };

  const submit = async () => {
    const body = codeFormToBody(form);
    if ('error' in body) {
      setFormError(body.error);
      return;
    }
    setFormError(null);
    try {
      await createDiscountCode({ shopId, body }).unwrap();
      setForm(EMPTY_FORM);
      toast.success(t('promotions.codeCreated'));
    } catch (err) {
      toast.error(serverMessage(err));
    }
  };

  return (
    <MyCard className="p-6 space-y-4" id="discount-codes">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-gray-900">{t('promotions.codesTitle')}</h2>
        <p className="text-sm text-gray-600">{t('promotions.codesHelp')}</p>
      </div>

      {data.codes.length === 0 ? (
        <p className="text-sm text-gray-500">{t('promotions.noCodes')}</p>
      ) : (
        <div>
          {data.codes.map((c) => (
            <div key={c.id} className="border-b py-2 flex flex-wrap items-center gap-x-3 text-sm">
              <span className="font-mono font-bold text-gray-900">{c.code}</span>
              <span>{codeValueLabel(c, currency, i18n.language)}</span>
              {c.minSubtotalCents > 0 && (
                <span className="text-gray-600">{t('promotions.minOrder', { amount: money(c.minSubtotalCents) })}</span>
              )}
              {(c.validFrom || c.validUntil) && (
                <span className="text-gray-600">
                  {t('promotions.validRange', {
                    from: showDate(c.validFrom, i18n.language),
                    until: showDate(c.validUntil, i18n.language),
                  })}
                </span>
              )}
              <span className="text-gray-600">
                {c.totalLimit !== null
                  ? t('promotions.usesOf', { uses: c.uses, limit: c.totalLimit })
                  : t('promotions.uses', { uses: c.uses })}
              </span>
              {c.perEmailLimit !== null && (
                <span className="text-gray-600">{t('promotions.perDiner', { n: c.perEmailLimit })}</span>
              )}
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                {t(`promotions.status.${codeStatus(c, today)}`)}
              </span>
              <MyButton
                size="sm"
                variant="secondary"
                className="ml-auto"
                disabled={switching}
                onClick={() => toggle(c.id, !c.active)}
              >
                {c.active ? t('promotions.switchOff') : t('promotions.switchOn')}
              </MyButton>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-gray-900">{t('promotions.newCode')}</h3>
        <MyInput label={t('promotions.code')} value={form.code} onChange={(e) => set({ code: e.target.value })} />
        <div className="flex gap-2">
          <MyButton
            size="sm"
            variant={form.kind === 'percent' ? 'primary' : 'secondary'}
            aria-pressed={form.kind === 'percent'}
            onClick={() => set({ kind: 'percent' })}
          >
            {t('promotions.kindPercent')}
          </MyButton>
          <MyButton
            size="sm"
            variant={form.kind === 'amount' ? 'primary' : 'secondary'}
            aria-pressed={form.kind === 'amount'}
            onClick={() => set({ kind: 'amount' })}
          >
            {t('promotions.kindAmount')}
          </MyButton>
        </div>
        <MyInput
          label={form.kind === 'percent' ? t('promotions.valuePercent') : t('promotions.valueAmount')}
          value={form.value}
          onChange={(e) => set({ value: e.target.value })}
        />
        <MyInput
          label={t('promotions.minOrderLabel')}
          value={form.minOrder}
          onChange={(e) => set({ minOrder: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <MyInput
            type="date"
            label={t('promotions.validFrom')}
            value={form.validFrom}
            onChange={(e) => set({ validFrom: e.target.value })}
          />
          <MyInput
            type="date"
            label={t('promotions.validUntil')}
            value={form.validUntil}
            onChange={(e) => set({ validUntil: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MyInput
            label={t('promotions.totalLimit')}
            value={form.totalLimit}
            onChange={(e) => set({ totalLimit: e.target.value })}
          />
          <MyInput
            label={t('promotions.perEmailLimit')}
            value={form.perEmailLimit}
            onChange={(e) => set({ perEmailLimit: e.target.value })}
          />
        </div>
        {formError && <p className="text-sm text-red-600">{t(`promotions.formError.${formError}`)}</p>}
        <MyButton disabled={creating} onClick={submit}>
          {t('promotions.create')}
        </MyButton>
      </div>
    </MyCard>
  );
}
