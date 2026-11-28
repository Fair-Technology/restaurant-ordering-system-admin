import { useState } from 'react';
import { Search, X } from 'lucide-react';
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
  CODE_FILTERS,
  matchesCodeFilter,
  validLabel,
  type CodeFilter,
  codesLimitReached,
  CODES_LIMIT,
  isCodeFormDirty,
  shopToday,
  type CodeForm,
  type CodeFormError,
} from '../../features/promotions/promotions';
import { STATUS_TONE } from './statusTone';
import { MyButton } from '../ui/MyButton';
import { PillSwitch } from '../ui/PillSwitch';
import { Chip, Section, Toolbar } from '../layout/Page';
import { badgeClass, chipClass, searchBoxClass } from '../layout/pageStyles';
import { Drawer } from '../ui/Drawer';
import { MyInput } from '../ui/MyInput';
import { translateServerError } from '../../features/api/serverErrorMessage';

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
  showForm: boolean;
  onOpenForm: () => void;
  onCloseForm: () => void;
}

export function DiscountCodesCard({ shopId, shop, data, showForm, onOpenForm, onCloseForm }: DiscountCodesCardProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [createDiscountCode, { isLoading: creating }] = useCreateDiscountCodeMutation();
  const [setDiscountCodeActive, { isLoading: switching, originalArgs: switchingArgs }] = useSetDiscountCodeActiveMutation();
  const [form, setForm] = useState<CodeForm>(EMPTY_CODE_FORM);
  const [formError, setFormError] = useState<CodeFormError | null>(null);
  const [filter, setFilter] = useState<CodeFilter>('all');
  const [query, setQuery] = useState('');

  const currency = shop.currency ?? 'EUR';
  const [nowMs] = useState(() => Date.now());
  const today = shopToday(shop.timezone ?? 'Europe/Berlin', nowMs);
  const money = (cents: number) => formatCents(cents, currency, i18n.language);
  const set = (patch: Partial<CodeForm>) => setForm((f) => ({ ...f, ...patch }));

  const serverMessage = (err: unknown): string =>
    translateServerError(err, t, t('promotions.saveFailed'), (k) => (k === 'code' ? t('promotions.code') : undefined));

  const toggle = async (codeId: string, active: boolean) => {
    try {
      await setDiscountCodeActive({ shopId, codeId, active }).unwrap();
    } catch {
      toast.error(t('promotions.saveFailed'));
    }
  };

  const limitReached = codesLimitReached(data.codes.length);
  const q = query.trim().toUpperCase();
  const counts = CODE_FILTERS.map((f) => ({ f, n: data.codes.filter((c) => matchesCodeFilter(codeStatus(c, today), f)).length }));
  const visible = data.codes
    .filter((c) => matchesCodeFilter(codeStatus(c, today), filter))
    .filter((c) => !q || c.code.toUpperCase().includes(q));

  const closeForm = () => {
    if (isCodeFormDirty(form) && !window.confirm(t('promotions.discardCodeConfirm'))) return;
    onCloseForm();
    setForm(EMPTY_CODE_FORM);
    setFormError(null);
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
      setForm(EMPTY_CODE_FORM);
      onCloseForm();
      toast.success(t('promotions.codeCreated'));
    } catch (err) {
      toast.error(serverMessage(err));
    }
  };

  const th = 'px-4 py-2.5 text-left text-xs font-semibold text-muted whitespace-nowrap';
  const validText = (c: (typeof data.codes)[number]) => {
    const v = validLabel(c);
    const d = (x: string) => showDate(x, i18n.language);
    switch (v.kind) {
      case 'from':
        return t('promotions.validFromDate', { date: d(v.date) });
      case 'until':
        return t('promotions.validUntilDate', { date: d(v.date) });
      case 'range':
        return t('promotions.validRange', { from: d(v.from), until: d(v.until) });
      default:
        return t('promotions.validAlways');
    }
  };
  const dim = 'text-muted';

  return (
    <Section
      id="discount-codes"
      title={t('promotions.codesTitle')}
      count={<span className="font-semibold text-[#1d5a32]">{t('promotions.activeCodesCount', { count: activeCodeCount(data.codes, today) })}</span>}
      hint={t('promotions.codesCount', { count: data.codes.length, limit: CODES_LIMIT })}
      description={t('promotions.codesHelp')}
    >
      {data.codes.length === 0 ? (
        <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream p-4">
          <p className="text-sm text-[#8a7f77]">{t('promotions.noCodes')}</p>
          <MyButton type="button" onClick={onOpenForm}>
            {t('promotions.newCode')}
          </MyButton>
        </div>
      ) : (
        <>
          <div className="px-4 pt-3">
            <Toolbar>
              <label className={`${searchBoxClass} focus-within:border-ink`}>
                <Search size={16} className="text-[#8a7f77]" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('promotions.search')}
                  aria-label={t('promotions.search')}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              {counts.map(({ f, n }) => (
                <Chip key={f} active={filter === f} count={n} onClick={() => setFilter(f)}>
                  {t(`promotions.filter.${f}`)}
                </Chip>
              ))}
            </Toolbar>
          </div>
          {visible.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-[#8a7f77]">{t('promotions.noMatch')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line-soft">
                    <th scope="col" className={th}>{t('promotions.column.code')}</th>
                    <th scope="col" className={th}>{t('promotions.column.discount')}</th>
                    <th scope="col" className={th}>{t('promotions.column.minOrder')}</th>
                    <th scope="col" className={th}>{t('promotions.column.valid')}</th>
                    <th scope="col" className={th}>{t('promotions.column.uses')}</th>
                    <th scope="col" className={th}>{t('promotions.column.perCustomer')}</th>
                    <th scope="col" className={th}>{t('promotions.column.status')}</th>
                    <th scope="col" className={th}>{t('promotions.column.on')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const status = codeStatus(c, today);
                    const live = status === 'active' || status === 'scheduled';
                    const pct = c.totalLimit ? Math.min(100, Math.round((c.uses / c.totalLimit) * 100)) : 0;
                    return (
                      <tr key={c.id} className={`border-b border-line-soft last:border-b-0 ${live ? '' : dim}`}>
                        <td className="px-4 py-2.5 font-mono text-[15px] font-bold">{c.code}</td>
                        <td className="px-4 py-2.5 font-semibold">{codeValueLabel(c, currency, i18n.language)}</td>
                        <td className={`px-4 py-2.5 ${c.minSubtotalCents > 0 ? '' : dim}`}>
                          {c.minSubtotalCents > 0 ? money(c.minSubtotalCents) : t('promotions.minOrderNone')}
                        </td>
                        <td className={`px-4 py-2.5 whitespace-nowrap ${validLabel(c).kind === 'always' ? dim : ''}`}>{validText(c)}</td>
                        <td className="px-4 py-2.5">
                          {c.totalLimit !== null ? (
                            <>
                              <div>{t('promotions.usesOfShort', { uses: c.uses, limit: c.totalLimit })}</div>
                              <div className="mt-1 h-1 w-full max-w-[100px] rounded-full bg-sand">
                                <div className="h-1 rounded-full bg-ink" style={{ width: `${pct}%` }} />
                              </div>
                            </>
                          ) : (
                            c.uses
                          )}
                        </td>
                        <td className={`px-4 py-2.5 ${c.perEmailLimit === null ? dim : ''}`}>
                          {c.perEmailLimit === null ? t('promotions.perCustomerUnlimited') : c.perEmailLimit}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={badgeClass[STATUS_TONE[status]]}>{t(`promotions.status.${status}`)}</span>
                        </td>
                        <td className="px-4 py-1">
                          <PillSwitch
                            checked={c.active}
                            label={t(c.active ? 'promotions.switchOffNamed' : 'promotions.switchOnNamed', { code: c.code })}
                            isPending={switching && switchingArgs?.codeId === c.id}
                            disabled={switching}
                            onChange={(on) => toggle(c.id, on)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="border-t border-line-soft px-4 py-3 text-[13px] text-muted">
        {limitReached ? t('promotions.codesLimitReached') : t('promotions.codesFooter')}
      </p>

      {showForm && (
        <Drawer label={t('promotions.newCode')} onClose={closeForm} widthClassName="sm:w-[440px]">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <h3 className="text-[15px] font-bold">{t('promotions.newCode')}</h3>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={closeForm}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-sand focus-visible:outline-2 focus-visible:outline-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
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
          </div>
          <div className="flex gap-2 border-t border-line-soft p-4">
            <MyButton type="button" isPending={creating} onClick={submit}>
              {t('promotions.create')}
            </MyButton>
            <MyButton type="button" variant="secondary" disabled={creating} onClick={closeForm}>
              {t('common.cancel')}
            </MyButton>
          </div>
        </Drawer>
      )}
    </Section>
  );
}
