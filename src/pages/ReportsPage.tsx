import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useGetShopByIdQuery } from '../services/api';
import { useGetSalesReportQuery, type SalesReportDto } from '../services/reportsApi';
import { useGetOrderLimitQuery } from '../services/subscriptionApi';
import { buildReportCsv, rateText, reportFileName } from '../features/reports/reportCsv';
import { isValidRange, rangeFor, REPORT_PRESETS, todayIn, type ReportPreset } from '../features/reports/reportRange';
import { MyButton } from '../components/ui/MyButton';
import { Chip, EmptyNote, PageHeader, Row, Section, Toolbar } from '../components/layout/Page';
import { MySpinner } from '../components/ui/MySpinner';
import { formatCents } from '../utils/money';

function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const PRESET_LABELS: Record<ReportPreset, string> = {
  today: 'reports.presetToday',
  yesterday: 'reports.presetYesterday',
  last7: 'reports.presetLast7',
  thisMonth: 'reports.presetThisMonth',
  lastMonth: 'reports.presetLastMonth',
};

const MODE_LABELS = {
  collection: 'reports.modeCollection',
  delivery: 'reports.modeDelivery',
  dine_in: 'reports.modeDineIn',
} as const;

/** A white tile with a big number and a small label, for the key figures. */
function StatTile({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-white px-4 py-3.5">
      <p className="truncate font-display text-[26px] leading-tight font-semibold text-ink">{value}</p>
      <p className="mt-1 text-[13px] font-semibold text-[#4a413b]">{label}</p>
      {help && <p className="mt-1 text-xs text-[#8a7f77]">{help}</p>}
    </div>
  );
}

export function ReportsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const allowed = shop?.callerPermissions?.includes('view_reports') ?? false;

  const [preset, setPreset] = useState<ReportPreset | 'custom'>('last7');
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const range =
    custom ?? (shop?.timezone ? rangeFor('last7', todayIn(shop.timezone, new Date())) : { from: '', to: '' });
  const valid = isValidRange(range.from, range.to);

  const { data: report, isFetching, isError } = useGetSalesReportQuery(
    { shopId: shopId!, from: range.from, to: range.to },
    { skip: !allowed || !valid },
  );
  const { data: limit } = useGetOrderLimitQuery({ shopId: shopId! }, { skip: !allowed });

  if (!shop) return <MySpinner label={t('reports.loading')} />;
  if (!allowed) return <p className="text-sm text-muted">{t('reports.accessDenied')}</p>;

  const choosePreset = (p: ReportPreset) => {
    setPreset(p);
    setCustom(rangeFor(p, todayIn(shop.timezone ?? 'Europe/Berlin', new Date())));
  };
  const changeDate = (key: 'from' | 'to', value: string) => {
    setPreset('custom');
    setCustom({ ...range, [key]: value });
  };

  const money = (cents: number) => formatCents(cents, report?.currency ?? shop.currency ?? 'EUR', i18n.language);
  const dayText = (date: string) =>
    new Intl.DateTimeFormat(i18n.language.startsWith('de') ? 'de-DE' : 'en-GB', {
      timeZone: 'UTC',
      ...(i18n.language.startsWith('de')
        ? { day: '2-digit', month: '2-digit', year: 'numeric' }
        : { day: 'numeric', month: 'short' }),
    } as Intl.DateTimeFormatOptions).format(new Date(`${date}T00:00:00Z`));

  const download = (r: SalesReportDto) =>
    downloadFile(
      reportFileName(shop.slug ?? 'shop', r.from, r.to),
      buildReportCsv(r, {
        date: t('reports.date'),
        orders: t('reports.orders'),
        gross: t('reports.gross'),
        discounts: t('reports.discounts'),
        deliveryFees: t('reports.deliveryFees'),
        refunds: t('reports.refunds'),
        takings: t('reports.takings'),
        total: t('reports.csvTotal'),
        grossAt: (rate) => t('reports.csvGrossAt', { rate }),
        vatAt: (rate) => t('reports.csvVatAt', { rate }),
        netAt: (rate) => t('reports.csvNetAt', { rate }),
      }),
      'text/csv;charset=utf-8',
    );

  const maxHour = report ? Math.max(1, ...report.byHour) : 1;
  const dateInput =
    'h-9 rounded-full border border-[#e3d9ce] bg-white px-3 text-[13px] font-semibold text-ink outline-none focus-visible:border-ink';
  const th = 'px-4 py-2 text-xs font-semibold text-[#8a7f77]';

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.group.business')}
        title={t('reports.title')}
        actions={
          valid &&
          report && (
            <MyButton variant="secondary" onClick={() => download(report)} className="gap-2">
              <Download size={16} aria-hidden="true" />
              {t('reports.downloadCsv')}
            </MyButton>
          )
        }
      />

      <Toolbar>
        {REPORT_PRESETS.map((p) => (
          <Chip key={p} active={preset === p} onClick={() => choosePreset(p)}>
            {t(PRESET_LABELS[p])}
          </Chip>
        ))}
        <span className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[13px] text-muted">
            {t('reports.from')}
            <input type="date" value={range.from} onChange={(e) => changeDate('from', e.target.value)} className={dateInput} />
          </label>
          <label className="flex items-center gap-1.5 text-[13px] text-muted">
            {t('reports.to')}
            <input type="date" value={range.to} onChange={(e) => changeDate('to', e.target.value)} className={dateInput} />
          </label>
        </span>
      </Toolbar>
      {!valid && <p className="mb-3 text-sm text-[#b42318]">{t('reports.rangeInvalid')}</p>}

      {valid && isError && <p className="text-sm text-[#b42318]">{t('reports.loadError')}</p>}
      {valid && !report && !isError && <MySpinner label={t('reports.loading')} />}

      {valid && report && (
        <div className={isFetching ? 'opacity-60' : ''}>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={t('reports.takings')} value={money(report.totals.takingsCents)} help={t('reports.takingsHelp')} />
            <StatTile label={t('reports.orders')} value={String(report.totals.orderCount)} />
            <StatTile label={t('reports.refunds')} value={money(report.totals.refundCents)} />
            <StatTile label={t('reports.discounts')} value={money(report.totals.discountCents)} />
          </div>
          <div className="mb-[18px] flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            <span>
              {t('reports.gross')}: <span className="font-semibold text-ink">{money(report.totals.grossCents)}</span>
            </span>
            <span>
              {t('reports.deliveryFees')}: <span className="font-semibold text-ink">{money(report.totals.deliveryFeeCents)}</span>
            </span>
            {limit && (
              <span className="text-[#4a413b]">
                {limit.limit === null
                  ? t('reports.monthToDateUnlimited', { count: limit.acceptedOrderCount })
                  : t('reports.monthToDate', { count: limit.acceptedOrderCount, limit: limit.limit })}
              </span>
            )}
          </div>

          {report.totals.orderCount === 0 && report.totals.refundCents === 0 ? (
            <Section>
              <EmptyNote>{t('reports.empty')}</EmptyNote>
            </Section>
          ) : (
            <>
              <Section title={t('reports.byDay')} count={report.days.length}>
                {report.days.map((d) => (
                  <Row key={d.date}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{dayText(d.date)}</div>
                      <div className="mt-0.5 text-xs text-[#8a7f77]">
                        {t('reports.orders')}: {d.orderCount} · {t('reports.gross')}: {money(d.grossCents)}
                        {d.refundCents !== 0 && (
                          <>
                            {' '}
                            · {t('reports.refunds')}: {money(d.refundCents)}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold whitespace-nowrap">{money(d.takingsCents)}</div>
                  </Row>
                ))}
              </Section>

              <div className="grid gap-x-[18px] lg:grid-cols-2">
                <Section title={t('reports.byHour')} hint={t('reports.byHourHelp')} padded>
                  <div className="flex h-32 items-end gap-[3px] border-b border-[#c8bfb6]">
                    {report.byHour.map((n, hour) => (
                      <div key={hour} className="flex h-full flex-1 flex-col items-center justify-end" title={`${hour}:00 · ${n}`}>
                        <div
                          className={`w-full rounded-t-[3px] ${n > 0 ? 'bg-[#1f1a17]' : 'bg-[#c8bfb6]'}`}
                          style={{ height: n > 0 ? `${(n / maxHour) * 100}%` : '2px' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-[3px]">
                    {report.byHour.map((_, hour) => (
                      <span key={hour} className="flex-1 text-center text-[10px] text-[#8a7f77]">
                        {hour % 3 === 0 ? hour : ''}
                      </span>
                    ))}
                  </div>
                </Section>

                <Section title={t('reports.byMode')}>
                  {report.byMode.map((m) => (
                    <Row key={m.mode}>
                      <span className="flex-1 text-sm font-semibold">{t(MODE_LABELS[m.mode])}</span>
                      <span className="text-[13px] text-[#8a7f77]">{m.orderCount}</span>
                      <span className="w-24 text-right text-sm font-bold whitespace-nowrap">{money(m.grossCents)}</span>
                    </Row>
                  ))}
                </Section>
              </div>

              <Section title={t('reports.byRate')}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line-soft text-left">
                        <th className={th}>{t('reports.rate')}</th>
                        <th className={`${th} text-right`}>{t('reports.gross')}</th>
                        <th className={`${th} text-right`}>{t('reports.vat')}</th>
                        <th className={`${th} text-right`}>{t('reports.net')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.totals.byRate.map((r) => (
                        <tr key={r.rateBasisPoints} className="border-b border-line-soft last:border-b-0">
                          <td className="px-4 py-3 font-semibold">{rateText(r.rateBasisPoints)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">{money(r.grossCents)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">{money(r.taxCents)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">{money(r.netCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title={t('reports.topDishes')} count={report.topDishes.length}>
                {report.topDishes.map((d, i) => (
                  <Row key={d.productId}>
                    <span className="w-5 text-[13px] font-bold text-[#8a7f77]">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.name}</span>
                    <span className="text-[13px] whitespace-nowrap text-[#8a7f77]">
                      {t('reports.quantity')}: {d.quantity}
                    </span>
                    <span className="text-right text-sm font-bold whitespace-nowrap">{money(d.grossCents)}</span>
                  </Row>
                ))}
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
