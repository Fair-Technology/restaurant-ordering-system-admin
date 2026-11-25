import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useDeleteOptionGroupMutation,
  useGetOptionGroupsQuery,
  useGetShopByIdQuery,
  useSetOptionAvailabilityMutation,
} from '../services/api';
import type { ShopOptionGroupDto } from '../services/api';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';
import { MySwitch } from '../components/ui/MySwitch';
import { useToast } from '../contexts/ToastContext';
import { EmptyNote, PageHeader, Section } from '../components/layout/Page';
import { badgeClass } from '../components/layout/pageStyles';
import { OptionGroupDialog } from '../components/menu/OptionGroupDialog';
import { formatCents } from '../utils/money';
import { usePageTitle } from '../features/layout/usePageTitle';
import {
  defaultGroupOpen,
  filterGroupsByKind,
  parseKindFilter,
  unavailableOptionCount,
  type OptionGroupKindFilter,
} from '../features/menu/optionGroupLibrary';

const tabClass = (on: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold underline-offset-4 transition-colors ${
    on ? 'text-ink underline decoration-2' : 'text-[#6b625c] hover:bg-sand hover:text-ink'
  }`;

const errorMessage = (err: unknown): string | undefined => (err as { data?: { error?: string } })?.data?.error;

// ── One library group ──────────────────────────────────────────────────────────

function GroupCard({
  shopId,
  group,
  currency,
  open,
  onToggleOpen,
  onEdit,
}: {
  shopId: string;
  group: ShopOptionGroupDto;
  currency: string;
  open: boolean;
  onToggleOpen: () => void;
  onEdit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [setAvailability] = useSetOptionAvailabilityMutation();
  const [deleteGroup, { isLoading: deleting }] = useDeleteOptionGroupMutation();
  const [inFlight, setInFlight] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const optionsListId = `option-group-options-${group.id}`;
  const unavailable = unavailableOptionCount(group.options);

  const toggle = async (optionId: string, current: boolean) => {
    setInFlight((s) => new Set(s).add(optionId));
    try {
      await setAvailability({
        shopId,
        groupId: group.id,
        optionId,
        body: { isAvailable: !current },
      }).unwrap();
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
        <button
          type="button"
          aria-expanded={open}
          aria-controls={optionsListId}
          onClick={onToggleOpen}
          className="flex min-w-0 items-center gap-2 rounded-md text-left"
        >
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          <h2 className="text-[15px] font-bold">{group.name}</h2>
          <span className={badgeClass.neutral}>{t(`optionGroups.kind.${group.kind}`)}</span>
          {group.kind === 'addon' && (
            <span className="text-[13px] font-normal text-muted">
              {t('optionGroups.selectHint', {
                min: group.minSelectable,
                max: group.maxSelectable,
              })}
            </span>
          )}
          <span className="text-[13px] font-normal text-muted">{t('optionGroups.optionCount', { count: group.options.length })}</span>
          {unavailable > 0 && <span className={badgeClass.warn}>{t('optionGroups.unavailableCount', { count: unavailable })}</span>}
        </button>
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
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 border-b border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]"
        >
          <p className="min-w-0 flex-1">{t('optionGroups.deleteWarning')}</p>
          <MyButton variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
            {t('optionGroups.cancel')}
          </MyButton>
          <MyButton variant="danger" size="sm" onClick={remove} isPending={deleting}>
            {t('optionGroups.confirmDelete')}
          </MyButton>
        </div>
      )}

      {open && (
        <ul id={optionsListId}>
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
      )}
    </Section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function OptionGroupsPage() {
  usePageTitle('nav.optionGroups');
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseKindFilter(searchParams.get('kind'));
  const visible = filterGroupsByKind(groups, activeTab);
  const variantCount = filterGroupsByKind(groups, 'variant').length;
  const extraCount = filterGroupsByKind(groups, 'addon').length;
  // Explicit open/closed per group id; absent ids use the option-count default
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({});
  const isOpen = (g: ShopOptionGroupDto) => expandedOverride[g.id] ?? defaultGroupOpen(g.options.length);
  const setAllOpen = (open: boolean) =>
    setExpandedOverride((s) => ({
      ...s,
      ...Object.fromEntries(visible.map((g) => [g.id, open])),
    }));
  const pickTab = (kind: OptionGroupKindFilter) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (kind === 'all') next.delete('kind');
        else next.set('kind', kind);
        return next;
      },
      { replace: true },
    );
  const tabs: Array<{ kind: OptionGroupKindFilter; label: string }> = [
    { kind: 'all', label: t('optionGroups.tabAll') },
    {
      kind: 'variant',
      label: `${t('optionGroups.tabVariants')} (${variantCount})`,
    },
    { kind: 'addon', label: `${t('optionGroups.tabExtras')} (${extraCount})` },
  ];

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
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]"
        >
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
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label={t('optionGroups.tabsLabel')} className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.kind}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.kind}
                  className={tabClass(activeTab === tab.kind)}
                  onClick={() => pickTab(tab.kind)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <MyButton variant="secondary" size="sm" onClick={() => setAllOpen(true)} disabled={visible.length === 0}>
                {t('optionGroups.expandAll')}
              </MyButton>
              <MyButton variant="secondary" size="sm" onClick={() => setAllOpen(false)} disabled={visible.length === 0}>
                {t('optionGroups.collapseAll')}
              </MyButton>
            </div>
          </div>
          {visible.length === 0 ? (
            <Section>
              <EmptyNote>{t(activeTab === 'variant' ? 'optionGroups.emptyVariants' : 'optionGroups.emptyExtras')}</EmptyNote>
            </Section>
          ) : (
            visible.map((g) => (
              <GroupCard
                key={g.id}
                shopId={shopId!}
                group={g}
                currency={currency}
                open={isOpen(g)}
                onToggleOpen={() => setExpandedOverride((s) => ({ ...s, [g.id]: !isOpen(g) }))}
                onEdit={() => setDialog(g.id)}
              />
            ))
          )}
        </>
      )}

      {(dialog === 'new' || editing) && (
        <OptionGroupDialog
          key={editing?.id ?? 'new'}
          shopId={shopId!}
          group={editing}
          currency={currency}
          defaultKind={dialog === 'new' && activeTab !== 'all' ? activeTab : undefined}
          onClose={close}
        />
      )}
    </>
  );
}
