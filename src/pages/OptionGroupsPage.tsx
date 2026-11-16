import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  useCreateOptionGroupMutation,
  useDeleteOptionGroupMutation,
  useGetOptionGroupsQuery,
  useGetShopByIdQuery,
  useSetOptionAvailabilityMutation,
  useUpdateOptionGroupMutation,
} from '../services/api';
import type { ShopOptionGroupDto } from '../services/api';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { MySwitch } from '../components/ui/MySwitch';
import { useToast } from '../contexts/ToastContext';
import { EmptyNote, PageHeader, Section } from '../components/layout/Page';
import { badgeClass } from '../components/layout/pageStyles';
import {
  emptyGroupForm,
  groupFormFromLibrary,
  newOptionRow,
  optionGroupBodyFromForm,
  validateGroupForm,
  type OptionGroupForm,
  type OptionGroupKind,
} from '../features/menu/optionGroupLibrary';
import { formatCents } from '../utils/money';

const errorMessage = (err: unknown): string | undefined => (err as { data?: { error?: string } })?.data?.error;

// ── Create / edit dialog ───────────────────────────────────────────────────────

function GroupDialog({
  shopId,
  group,
  currency,
  onClose,
}: {
  shopId: string;
  /** The group being edited; absent when creating */
  group?: ShopOptionGroupDto;
  currency: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [createGroup, { isLoading: creating }] = useCreateOptionGroupMutation();
  const [updateGroup, { isLoading: updating }] = useUpdateOptionGroupMutation();
  const [form, setForm] = useState<OptionGroupForm>(() => (group ? groupFormFromLibrary(group) : emptyGroupForm()));
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const busy = creating || updating;
  const symbol = formatCents(0, currency, 'en').replace(/[\d.,\s]/g, '');

  useEffect(() => {
    document.getElementById('option-group-name')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patch = (p: Partial<OptionGroupForm>) => setForm((f) => ({ ...f, ...p }));
  const patchOption = (key: string, p: Partial<OptionGroupForm['options'][number]>) =>
    setForm((f) => ({ ...f, options: f.options.map((o) => (o.key === key ? { ...o, ...p } : o)) }));
  const has = (key: string) => errors.includes(key);
  const fieldError = (key: string) =>
    has(key) ? <p role="alert" className="mt-1 text-xs text-[#b42318]">{t(`optionGroups.${key}`)}</p> : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateGroupForm(form);
    setErrors(found);
    setServerError(null);
    if (found.length > 0) return;
    const body = optionGroupBodyFromForm(form);
    try {
      if (group) {
        // `kind` is fixed once a group exists
        await updateGroup({ shopId, groupId: group.id, body }).unwrap();
        toast.success(t('optionGroups.saved'));
      } else {
        await createGroup({ shopId, body: { kind: form.kind, ...body } }).unwrap();
        toast.success(t('optionGroups.created'));
      }
      onClose();
    } catch (err) {
      setServerError(errorMessage(err) ?? t('optionGroups.failedToSave'));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#1f1a17]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="option-group-dialog-title"
          className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 pt-5 pb-4">
            <h2 id="option-group-dialog-title" className="font-display text-[22px] leading-tight font-semibold">
              {group ? t('optionGroups.editGroup') : t('optionGroups.newGroup')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('optionGroups.cancel')}
              className="rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {serverError && (
                <p role="alert" className="rounded-xl border border-[#f5c2bd] bg-[#fdeceb] p-3 text-sm text-[#b42318]">
                  {serverError}
                </p>
              )}

              {!group && (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-[13px] font-semibold text-[#4a413b]">{t('optionGroups.kindLabel')}</legend>
                  <div className="flex gap-2">
                    {(['variant', 'addon'] as OptionGroupKind[]).map((k) => (
                      <label
                        key={k}
                        className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold ${
                          form.kind === k ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-ink hover:bg-cream'
                        }`}
                      >
                        <input
                          type="radio"
                          name="option-group-kind"
                          className="sr-only"
                          checked={form.kind === k}
                          onChange={() => patch({ kind: k })}
                        />
                        {t(`optionGroups.kind.${k}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div>
                <MyInput
                  id="option-group-name"
                  aria-label={t('optionGroups.groupName')}
                  label={t('optionGroups.name')}
                  placeholder={t('optionGroups.namePlaceholder')}
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
                {fieldError('nameRequired')}
              </div>

              {form.kind === 'addon' && (
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <MyInput
                      type="number"
                      min={0}
                      step={1}
                      label={t('optionGroups.minSelectable')}
                      value={form.minSelectable}
                      onChange={(e) => patch({ minSelectable: e.target.valueAsNumber })}
                    />
                    <MyInput
                      type="number"
                      min={0}
                      step={1}
                      label={t('optionGroups.maxSelectable')}
                      value={form.maxSelectable}
                      onChange={(e) => patch({ maxSelectable: e.target.valueAsNumber })}
                    />
                  </div>
                  {fieldError('rangeInvalid')}
                </div>
              )}

              <div>
                <h3 className="mb-2 text-[13px] font-semibold text-[#4a413b]">{t('optionGroups.options')}</h3>
                <ul className="space-y-2">
                  {form.options.map((o) => (
                    <li key={o.key} className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <MyInput
                          aria-label={t('optionGroups.optionName')}
                          placeholder={t('optionGroups.namePlaceholder')}
                          value={o.name}
                          onChange={(e) => patchOption(o.key, { name: e.target.value })}
                        />
                      </div>
                      <div className="w-28 flex-shrink-0">
                        <CurrencyInput
                          label={`${t('optionGroups.priceDelta')} (${symbol})`}
                          valueCents={o.priceDelta}
                          onChange={(cents) => patchOption(o.key, { priceDelta: cents })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, options: f.options.filter((x) => x.key !== o.key) }))}
                        aria-label={t('optionGroups.removeOption')}
                        className="mb-1 flex-shrink-0 rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                {fieldError('optionRequired')}
                {fieldError('optionNameRequired')}
                {fieldError('priceInvalid')}
                <MyButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => setForm((f) => ({ ...f, options: [...f.options, newOptionRow()] }))}
                >
                  <Plus size={14} aria-hidden="true" />
                  {t('optionGroups.addOption')}
                </MyButton>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-4">
              <MyButton type="button" variant="secondary" onClick={onClose}>
                {t('optionGroups.cancel')}
              </MyButton>
              <MyButton type="submit" isPending={busy}>
                {busy ? t('optionGroups.saving') : t('optionGroups.save')}
              </MyButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── One library group ──────────────────────────────────────────────────────────

function GroupCard({
  shopId,
  group,
  currency,
  onEdit,
}: {
  shopId: string;
  group: ShopOptionGroupDto;
  currency: string;
  onEdit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [setAvailability] = useSetOptionAvailabilityMutation();
  const [deleteGroup, { isLoading: deleting }] = useDeleteOptionGroupMutation();
  const [inFlight, setInFlight] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const toggle = async (optionId: string, current: boolean) => {
    setInFlight((s) => new Set(s).add(optionId));
    try {
      await setAvailability({ shopId, groupId: group.id, optionId, body: { isAvailable: !current } }).unwrap();
    } catch {
      toast.error(t('optionGroups.availabilityFailed'));
    } finally {
      setInFlight((s) => {
        const n = new Set(s);
        n.delete(optionId);
        return n;
      });
    }
  };

  const remove = async () => {
    try {
      await deleteGroup({ shopId, groupId: group.id }).unwrap();
    } catch (err) {
      toast.error(errorMessage(err) ?? t('optionGroups.failedToDelete'));
      setConfirming(false);
    }
  };

  return (
    <Section className="mb-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft px-4 py-3">
        <h2 className="text-[15px] font-bold">{group.name}</h2>
        <span className={badgeClass.neutral}>{t(`optionGroups.kind.${group.kind}`)}</span>
        {group.kind === 'addon' && (
          <span className="text-[13px] text-muted">
            {t('optionGroups.selectHint', { min: group.minSelectable, max: group.maxSelectable })}
          </span>
        )}
        <span className="text-[13px] text-muted">{t('optionGroups.optionCount', { count: group.options.length })}</span>
        <div className="ml-auto flex items-center gap-2">
          <MyButton variant="secondary" size="sm" className="gap-1.5" onClick={onEdit}>
            <Pencil size={13} aria-hidden="true" />
            {t('optionGroups.edit')}
          </MyButton>
          <MyButton variant="danger" size="sm" className="gap-1.5" onClick={() => setConfirming(true)} disabled={confirming}>
            <Trash2 size={13} aria-hidden="true" />
            {t('optionGroups.delete')}
          </MyButton>
        </div>
      </div>

      {confirming && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]">
          <p className="min-w-0 flex-1">{t('optionGroups.deleteWarning')}</p>
          <MyButton variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
            {t('optionGroups.cancel')}
          </MyButton>
          <MyButton variant="danger" size="sm" onClick={remove} isPending={deleting}>
            {t('optionGroups.confirmDelete')}
          </MyButton>
        </div>
      )}

      <ul>
        {group.options.map((o) => {
          const labelId = `option-name-${o.id}`;
          return (
            <li key={o.id} className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0">
              <span id={labelId} className={`min-w-0 flex-1 truncate text-sm font-semibold ${o.isAvailable ? '' : 'text-[#8a7f77]'}`}>
                {o.name}
              </span>
              <span className="flex-shrink-0 text-[13px] text-muted">
                {o.priceDelta > 0 ? `+${formatCents(o.priceDelta, currency, i18n.language)}` : '–'}
              </span>
              <MySwitch
                checked={o.isAvailable}
                onChange={() => toggle(o.id, o.isAvailable)}
                isPending={inFlight.has(o.id)}
                labelledBy={labelId}
              />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function OptionGroupsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data, isLoading, isFetching, isError, refetch } = useGetOptionGroupsQuery({ shopId: shopId! });
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const currency = shop?.currency ?? 'EUR';
  const groups = data ?? [];
  // `null` = closed, `'new'` = creating, otherwise the id of the group being edited
  const [dialog, setDialog] = useState<null | 'new' | string>(null);
  const editing = dialog && dialog !== 'new' ? groups.find((g) => g.id === dialog) : undefined;
  const close = () => setDialog(null);

  return (
    <>
      <PageHeader
        eyebrow={t('nav.group.menu')}
        title={t('optionGroups.title')}
        count={t('optionGroups.count', { count: groups.length })}
        description={t('optionGroups.subtitle')}
        actions={
          <MyButton size="lg" className="gap-2" onClick={() => setDialog('new')}>
            <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
            {t('optionGroups.add')}
          </MyButton>
        }
      />

      {isLoading ? (
        <MySpinner label={t('optionGroups.loading')} />
      ) : isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]">
          <span>{t('optionGroups.failedToLoad')}</span>
          <MyButton variant="secondary" size="sm" isPending={isFetching} onClick={() => refetch()}>
            {t('optionGroups.retry')}
          </MyButton>
        </div>
      ) : groups.length === 0 ? (
        <Section>
          <EmptyNote>{t('optionGroups.empty')}</EmptyNote>
        </Section>
      ) : (
        groups.map((g) => (
          <GroupCard key={g.id} shopId={shopId!} group={g} currency={currency} onEdit={() => setDialog(g.id)} />
        ))
      )}

      {(dialog === 'new' || editing) && (
        <GroupDialog key={editing?.id ?? 'new'} shopId={shopId!} group={editing} currency={currency} onClose={close} />
      )}
    </>
  );
}
