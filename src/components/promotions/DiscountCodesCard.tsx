import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GetShopResultDto } from '../../services/api';
import {
  useCreateDiscountCodeMutation,
  useSetDiscountCodeActiveMutation,
  type PromotionsDto,
} from '../../services/promotionsApi';
import { useToast } from '../../contexts/ToastContext';
import { formatCents } from '../../utils/money';
import {
  EMPTY_CODE_FORM,
  activeCodeCount,
  codeFormToBody,
  codeStatus,
  codeValueLabel,
  codesLimitReached,
  isCodeFormDirty,
  shopToday,
  type CodeForm,
  type CodeFormError,
} from '../../features/promotions/promotions';
import { STATUS_TONE } from './statusTone';
import { MyButton } from '../ui/MyButton';
import { PillSwitch } from '../ui/PillSwitch';
import { Row, Section } from '../layout/Page';
import { badgeClass, chipClass } from '../layout/pageStyles';
import { MyInput } from '../ui/MyInput';

// dates are stored as YYYY-MM-DD; German owners read DD.MM.YYYY
function showDate(date: string | null, language: string): string {
  if (!date) return '…';
  if (!language.startsWith('de')) return date;
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

interface DiscountCodesCardProps {
  shopId: string;
  shop: GetShopResultDto;
  data: PromotionsDto;
}

export function DiscountCodesCard({ shopId, shop, data }: DiscountCodesCardProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [createDiscountCode, { isLoading: creating }] = useCreateDiscountCodeMutation();
  const [setDiscountCodeActive, { isLoading: switching, originalArgs: switchingArgs }] = useSetDiscountCodeActiveMutation();
  const [form, setForm] = useState<CodeForm>(EMPTY_CODE_FORM);
  const [formError, setFormError] = useState<CodeFormError | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const limitReached = codesLimitReached(data.codes.length);

  const closeForm = () => {
    if (isCodeFormDirty(form) && !window.confirm(t('promotions.discardCodeConfirm'))) return;
    setShowForm(false);
    setForm(EMPTY_CODE_FORM);
    setFormError(null);
  };
  const toggleForm = () => (showForm ? closeForm() : setShowForm(true));

  const submit = async () => {
    const body = codeFormToBody(form);
    if ('error' in body) {
      setFormError(body.error);
      return;
    }
    setFormError(null);
    try {
      await createDiscountCode({ shopId, body }).unwrap();
      setForm(EMPTY_CODE_FORM);
      setShowForm(false);
      toast.success(t('promotions.codeCreated'));
    } catch (err) {
      toast.error(serverMessage(err));
    }
  };

  return (
    <Section
      id="discount-codes"
      title={t('promotions.codesTitle')}
      hint={t('promotions.activeCodesCount', { count: activeCodeCount(data.codes, today) })}
      description={t('promotions.codesHelp')}
      actions={
        <MyButton type="button" disabled={limitReached} aria-expanded={showForm} onClick={toggleForm}>
          {t('promotions.newCode')}
        </MyButton>
      }
    >
      {data.codes.length === 0 ? (
        <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream p-4">
          <p className="text-sm text-[#8a7f77]">{t('promotions.noCodes')}</p>
          <MyButton type="button" onClick={() => setShowForm(true)}>
            {t('promotions.newCode')}
          </MyButton>
        </div>
      ) : (
        data.codes.map((c) => {
          const status = codeStatus(c, today);
          return (
            <Row key={c.id} className="flex-wrap">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-bold">{c.code}</span>
                  <span className="text-[15px] font-semibold">{codeValueLabel(c, currency, i18n.language)}</span>
                  <span className={badgeClass[STATUS_TONE[status]]}>{t(`promotions.status.${status}`)}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted">
                  {c.minSubtotalCents > 0 && <span>{t('promotions.minOrder', { amount: money(c.minSubtotalCents) })}</span>}
                  {(c.validFrom || c.validUntil) && (
                    <span>
                      {t('promotions.validRange', {
                        from: showDate(c.validFrom, i18n.language),
                        until: showDate(c.validUntil, i18n.language),
                      })}
                    </span>
                  )}
                  <span>
                    {c.totalLimit !== null
                      ? t('promotions.usesOf', { uses: c.uses, limit: c.totalLimit })
                      : t('promotions.uses', { count: c.uses })}
                  </span>
                  {c.perEmailLimit !== null && <span>{t('promotions.perDiner', { n: c.perEmailLimit })}</span>}
                </div>
              </div>
              <PillSwitch
                className="ml-auto"
                checked={c.active}
                label={t(c.active ? 'promotions.switchOffNamed' : 'promotions.switchOnNamed', { code: c.code })}
                isPending={switching && switchingArgs?.codeId === c.id}
                disabled={switching}
                onChange={(on) => toggle(c.id, on)}
              />
            </Row>
          );
        })
      )}

      {limitReached && <p className="border-t border-line-soft px-4 py-3 text-[13px] text-muted">{t('promotions.codesLimitReached')}</p>}

      {showForm && (
      <div className="m-4 space-y-3 rounded-xl border border-line p-4 sm:p-5">
        <h3 className="text-[15px] font-bold">{t('promotions.newCode')}</h3>
        <MyInput label={t('promotions.code')} hint={t('promotions.codeHint')} value={form.code} onChange={(e) => set({ code: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={chipClass(form.kind === 'percent')}
            aria-pressed={form.kind === 'percent'}
            onClick={() => set({ kind: 'percent' })}
          >
            {t('promotions.kindPercent')}
          </button>
          <button
            type="button"
            className={chipClass(form.kind === 'amount')}
            aria-pressed={form.kind === 'amount'}
            onClick={() => set({ kind: 'amount' })}
          >
            {t('promotions.kindAmount')}
          </button>
        </div>
        <MyInput
          label={form.kind === 'percent' ? t('promotions.valuePercent') : t('promotions.valueAmount')}
          hint={form.kind === 'percent' ? t('promotions.valuePercentHint') : t('promotions.valueAmountHint')}
          value={form.value}
          onChange={(e) => set({ value: e.target.value })}
        />
        <p className="text-[13px] text-muted">{t('promotions.minimumChargeHint')}</p>
        <MyInput
          label={t('promotions.minOrderLabel')}
          hint={t('promotions.minOrderLabelHint')}
          value={form.minOrder}
          onChange={(e) => set({ minOrder: e.target.value })}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MyInput
            type="date"
            label={t('promotions.validFrom')}
            hint={t('promotions.validFromHint')}
            value={form.validFrom}
            onChange={(e) => set({ validFrom: e.target.value })}
          />
          <MyInput
            type="date"
            label={t('promotions.validUntil')}
            hint={t('promotions.validUntilHint')}
            value={form.validUntil}
            onChange={(e) => set({ validUntil: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MyInput
            label={t('promotions.totalLimit')}
            hint={t('promotions.totalLimitHint')}
            value={form.totalLimit}
            onChange={(e) => set({ totalLimit: e.target.value })}
          />
          <MyInput
            label={t('promotions.perEmailLimit')}
            hint={t('promotions.perEmailLimitHint')}
            value={form.perEmailLimit}
            onChange={(e) => set({ perEmailLimit: e.target.value })}
          />
        </div>
        {formError && <p role="alert" className="text-sm text-[#b42318]">{t(`promotions.formError.${formError}`)}</p>}
        <div className="flex flex-wrap gap-2">
          <MyButton type="button" isPending={creating} onClick={submit}>
            {t('promotions.create')}
          </MyButton>
          <MyButton type="button" variant="secondary" disabled={creating} onClick={closeForm}>
            {t('common.cancel')}
          </MyButton>
        </div>
      </div>
      )}
    </Section>
  );
}
