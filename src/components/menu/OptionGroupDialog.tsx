import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { useCreateOptionGroupMutation, useUpdateOptionGroupMutation } from '../../services/api';
import type { ShopOptionGroupDto } from '../../services/api';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';
import { CurrencyInput } from '../ui/CurrencyInput';
import { useToast } from '../../contexts/ToastContext';
import {
  emptyGroupForm,
  groupFormFromLibrary,
  newOptionRow,
  optionGroupBodyFromForm,
  validateGroupForm,
  type OptionGroupForm,
  type OptionGroupKind,
} from '../../features/menu/optionGroupLibrary';
import { formatCents } from '../../utils/money';

const errorMessage = (err: unknown): string | undefined => (err as { data?: { error?: string } })?.data?.error;

/**
 * Create or edit one library option group. Rendered in a portal so it also works from inside a drawer;
 * Escape closes only this dialog, not the drawer behind it.
 */
export function OptionGroupDialog({
  shopId,
  group,
  currency,
  defaultKind,
  onClose,
  onSaved,
}: {
  shopId: string;
  /** The group being edited; absent when creating */
  group?: ShopOptionGroupDto;
  currency: string;
  /** Kind preselected when creating; ignored when editing. */
  defaultKind?: OptionGroupKind;
  onClose: () => void;
  /** Called with the group's id after a successful create or save. */
  onSaved?: (groupId: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [createGroup, { isLoading: creating }] = useCreateOptionGroupMutation();
  const [updateGroup, { isLoading: updating }] = useUpdateOptionGroupMutation();
  const [form, setForm] = useState<OptionGroupForm>(() => (group ? groupFormFromLibrary(group) : emptyGroupForm(defaultKind)));
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const busy = creating || updating;
  const symbol = formatCents(0, currency, 'en').replace(/[\d.,\s]/g, '');

  useEffect(() => {
    document.getElementById('option-group-name')?.focus();
  }, []);

  // Give focus back to whatever opened the dialog (a drawer button, say) when it closes
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const el = opener.current;
    return () => el?.focus?.();
  }, []);

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
        onSaved?.(group.id);
      } else {
        const created = await createGroup({ shopId, body: { kind: form.kind, ...body } }).unwrap();
        toast.success(t('optionGroups.created'));
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      setServerError(errorMessage(err) ?? t('optionGroups.failedToSave'));
    }
  };

  return createPortal(
    <div
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      onClick={(e) => e.stopPropagation()}
    >
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
                      {form.kind === 'addon' && (
                        <div className="w-32 flex-shrink-0">
                          <MyInput
                            aria-label={t('optionGroups.category')}
                            placeholder={t('optionGroups.categoryPlaceholder')}
                            maxLength={40}
                            value={o.category ?? ''}
                            onChange={(e) => patchOption(o.key, { category: e.target.value })}
                          />
                        </div>
                      )}
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
    </div>,
    document.body,
  );
}

