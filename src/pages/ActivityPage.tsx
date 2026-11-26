import { Fragment, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetAuditEntriesQuery, useGetShopByIdQuery } from '../services/api';
import type { AuditEntry } from '../services/api';
import { EmptyNote, PageHeader, Pager, Section, Toolbar } from '../components/layout/Page';
import { badgeClass, chipClass } from '../components/layout/pageStyles';
import { MySpinner } from '../components/ui/MySpinner';
import { formatShopDate } from '../utils/locale';
import { resolveActionLabel, resolveActorDisplayLabel } from '../features/activity/activityLabels';
import {
  ACTIVITY_PAGE_SIZE,
  AREA_FILTERS,
  areaOfAction,
  formatChangeValue,
  groupEntriesByDay,
  parseArea,
  parsePage,
  resolveChangeFieldLabel,
  showingRange,
  type ChangeValueContext,
  type DayGroup,
} from '../features/activity/activity';
import { isListRefreshing } from '../features/menu/productListStatus';
import { usePageTitle } from '../features/layout/usePageTitle';

const COLUMNS = ['time', 'who', 'what', 'item', 'details'] as const;
const th = 'px-4 py-2.5 text-left text-xs font-semibold text-muted whitespace-nowrap';

export function ActivityPage() {
  usePageTitle('nav.activity');
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [nowMs] = useState(() => Date.now());

  const area = parseArea(searchParams.get('area'));
  const actor = searchParams.get('actor') ?? '';
  const page = parsePage(searchParams.get('page'));

  const updateParams = (patch: Record<string, string | null>) => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') n.delete(k);
        else n.set(k, v);
      }
      return n;
    });
  };
  // changing a filter always goes back to the first page
  const setArea = (next: string) => updateParams({ area: next === 'all' ? null : next, page: null });
  const setActor = (next: string) => updateParams({ actor: next, page: null });
  const setPage = (next: number) => updateParams({ page: next <= 1 ? null : String(next) });

  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const canView = (shop?.callerPermissions ?? []).includes('view_audit');
  const { data, isLoading, isFetching, isError } = useGetAuditEntriesQuery(
    {
      shopId: shopId!,
      page,
      pageSize: ACTIVITY_PAGE_SIZE,
      ...(area !== 'all' ? { area } : {}),
      ...(actor ? { actor } : {}),
    },
    { skip: !canView },
  );
  const isRefreshing = isListRefreshing({ isLoading, isFetching });

  if (shop && !canView) {
    return (
      <div>
        <PageHeader eyebrow={t('nav.group.business')} title={t('activity.title')} />
        <Section padded>
          <p className="text-sm text-[#4a413b]">{t('activity.accessDenied')}</p>
        </Section>
      </div>
    );
  }

  if (isLoading) return <MySpinner label={t('activity.title')} />;
  if (isError) return <p className="text-sm text-[#b42318]">{t('activity.loadError')}</p>;

  const entries = data?.entries ?? [];
  const actorLabels = data?.actorLabels ?? {};
  const actors = data?.actors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ACTIVITY_PAGE_SIZE);
  const timeZone = shop?.timezone ?? 'Europe/Berlin';
  const countryCode = shop?.countryCode;
  const ctx: ChangeValueContext = { language: i18n.language, currency: shop?.currency ?? 'EUR', countryCode, timeZone };
  const groups = groupEntriesByDay(entries, timeZone, nowMs);
  const range = showingRange(page, ACTIVITY_PAGE_SIZE, total);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const dayTitle = (g: DayGroup<AuditEntry>) => {
    if (g.label.kind === 'today') return t('activity.day.today');
    if (g.label.kind === 'yesterday') return t('activity.day.yesterday');
    return formatShopDate(
      g.label.timestamp,
      i18n.language,
      countryCode,
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      timeZone,
    );
  };

  const renderEntry = (entry: AuditEntry) => {
    const actorKey = `${entry.actorType}:${entry.actorId}`;
    const actorLabel = resolveActorDisplayLabel(actorLabels[actorKey] ?? entry.actorId, entry.actorType, t);
    const changes = entry.changes ?? [];
    const open = expanded.has(entry.id);
    const detailsId = `activity-details-${entry.id}`;
    return (
      <Fragment key={entry.id}>
        <tr className="border-b border-line-soft align-top">
          <td className="px-4 py-3 whitespace-nowrap text-[#4a413b]">
            {formatShopDate(entry.timestamp, i18n.language, countryCode, { hour: '2-digit', minute: '2-digit' }, timeZone)}
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sand text-xs font-bold text-[#4a413b]"
              >
                {actorLabel.charAt(0).toUpperCase() || '?'}
              </span>
              <div className="min-w-0">
                <div className="font-bold">{actorLabel}</div>
                <div className="text-xs text-muted">{t(`activity.role.${entry.actorType}`)}</div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <span className={`${badgeClass.neutral} mr-2 whitespace-nowrap`}>{t(`activity.area.${areaOfAction(entry.action)}`)}</span>
            <span>{resolveActionLabel(entry.action, t)}</span>
          </td>
          <td className="px-4 py-3 font-semibold break-words">{entry.entityName}</td>
          <td className="px-4 py-1.5">
            {changes.length > 0 ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={detailsId}
                onClick={() => toggle(entry.id)}
                className="inline-flex min-h-11 items-center rounded-full border border-[#e3d9ce] bg-white px-3.5 text-[13px] font-bold whitespace-nowrap hover:bg-sand focus-visible:outline-2 focus-visible:outline-ink"
              >
                {t('activity.changesCount', { count: changes.length })}
              </button>
            ) : (
              <span className="text-muted">{t('activity.noDetails')}</span>
            )}
          </td>
        </tr>
        {open && changes.length > 0 && (
          <tr id={detailsId} className="border-b border-line-soft bg-cream">
            <td colSpan={COLUMNS.length} className="px-4 py-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th scope="col" className={th}>{t('activity.changeField')}</th>
                      <th scope="col" className={th}>{t('activity.changeBefore')}</th>
                      <th scope="col" className={th}>{t('activity.changeAfter')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c, i) => (
                      <tr key={`${c.field}-${i}`} className="border-t border-line-soft align-top">
                        <td className="px-4 py-2 font-semibold">{resolveChangeFieldLabel(c.field, t)}</td>
                        <td className="px-4 py-2 break-words text-muted">{formatChangeValue(c.from, c.field, ctx, t)}</td>
                        <td className="px-4 py-2 break-words">{formatChangeValue(c.to, c.field, ctx, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.group.business')}
        title={t('activity.title')}
        count={data ? t('activity.count', { count: total }) : undefined}
        description={t('activity.subtitle')}
      />

      <Section title={t('activity.listTitle')}>
        <div className="px-4 pt-3">
          <Toolbar>
            {AREA_FILTERS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={area === a}
                className={`${chipClass(area === a)} min-h-11`}
                onClick={() => setArea(a)}
              >
                {t(`activity.area.${a}`)}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-[13px] font-semibold text-[#4a413b]">
              {t('activity.who')}
              <select
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className="h-11 max-w-[220px] rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm font-normal"
              >
                <option value="">{t('activity.whoEveryone')}</option>
                {actors.map((a) => (
                  <option key={a.key} value={a.key}>
                    {resolveActorDisplayLabel(a.label, a.key.split(':')[0], t)}
                  </option>
                ))}
              </select>
            </label>
          </Toolbar>
        </div>

        <div className={`relative ${isRefreshing ? 'opacity-60' : ''}`} aria-busy={isRefreshing}>
          {isRefreshing && (
            <div className="absolute inset-x-0 top-6 z-10 flex justify-center">
              <div
                role="status"
                aria-label={t('activity.title')}
                className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600"
              />
            </div>
          )}
          {entries.length === 0 ? (
            <EmptyNote>{t('activity.noMatch')}</EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line-soft">
                    {COLUMNS.map((c) => (
                      <th key={c} scope="col" className={th}>{t(`activity.column.${c}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <Fragment key={g.key}>
                      <tr className="border-b border-line-soft bg-cream">
                        <th scope="colgroup" colSpan={COLUMNS.length} className="px-4 py-2 text-left text-xs font-bold text-[#4a413b]">
                          {dayTitle(g)}
                        </th>
                      </tr>
                      {g.entries.map(renderEntry)}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-2 border-t border-line-soft px-4 py-3">
            <p className="text-[13px] text-muted">
              {t('activity.showingRange', { from: range.from, to: range.to, total })}
            </p>
            <Pager page={page} totalPages={totalPages} onPage={setPage} />
          </div>
        )}
      </Section>
    </div>
  );
}
