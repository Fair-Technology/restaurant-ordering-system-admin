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
import { MyCard } from '../components/ui/MyCard';
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

function StatCard({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <MyCard className="p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-semibold text-gray-900">{value}</p>
      {help && <p className="text-xs text-gray-400 mt-2">{help}</p>}
    </MyCard>
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
  if (!allowed) return <p className="text-gray-500">{t('reports.accessDenied')}</p>;

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
  const th = 'text-xs font-medium text-gray-400 uppercase tracking-wider py-2';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">{t('reports.title')}</h1>

      <div className="flex flex-wrap items-end gap-2">
        {REPORT_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => choosePreset(p)}
            className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
              preset === p
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t(PRESET_LABELS[p])}
          </button>
        ))}
        <label className="text-xs text-gray-500 flex flex-col gap-1">
          {t('reports.from')}
          <input
            type="date"
            value={range.from}
            onChange={(e) => changeDate('from', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">
          {t('reports.to')}
          <input
            type="date"
            value={range.to}
            onChange={(e) => changeDate('to', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
          />
        </label>
      </div>
      {!valid && <p className="text-sm text-red-500">{t('reports.rangeInvalid')}</p>}

      {valid && isError && <p className="text-red-500">{t('reports.loadError')}</p>}
      {valid && !report && !isError && <MySpinner label={t('reports.loading')} />}

      {valid && report && (
        <div className={`space-y-6 ${isFetching ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('reports.takings')} value={money(report.totals.takingsCents)} help={t('reports.takingsHelp')} />
            <StatCard label={t('reports.orders')} value={String(report.totals.orderCount)} />
            <StatCard
              label={t('reports.refunds')}
              value={money(report.totals.refundCents)}
              help={t('reports.stripeRefundsNote')}
            />
            <StatCard label={t('reports.discounts')} value={money(report.totals.discountCents)} />
          </div>
          <p className="text-sm text-gray-500">
            {t('reports.gross')}: {money(report.totals.grossCents)} · {t('reports.deliveryFees')}:{' '}
            {money(report.totals.deliveryFeeCents)}
          </p>
          {limit && (
            <p className="text-sm text-gray-700">
              {limit.limit === null
                ? t('reports.monthToDateUnlimited', { count: limit.acceptedOrderCount })
                : t('reports.monthToDate', { count: limit.acceptedOrderCount, limit: limit.limit })}
            </p>
          )}

          {report.totals.orderCount === 0 && report.totals.refundCents === 0 ? (
            <p className="text-gray-500">{t('reports.empty')}</p>
          ) : (
            <>
              <MyCard className="p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('reports.byDay')}</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={th}>{t('reports.date')}</th>
                      <th className={`${th} text-right`}>{t('reports.orders')}</th>
                      <th className={`${th} text-right`}>{t('reports.gross')}</th>
                      <th className={`${th} text-right`}>{t('reports.refunds')}</th>
                      <th className={`${th} text-right`}>{t('reports.takings')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.days.map((d) => (
                      <tr key={d.date} className="border-t border-gray-100">
                        <td className="py-2">{dayText(d.date)}</td>
                        <td className="py-2 text-right">{d.orderCount}</td>
                        <td className="py-2 text-right">{money(d.grossCents)}</td>
                        <td className="py-2 text-right">{money(d.refundCents)}</td>
                        <td className="py-2 text-right font-medium">{money(d.takingsCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MyCard>

              <MyCard className="p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('reports.byRate')}</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className={th}>{t('reports.rate')}</th>
                      <th className={`${th} text-right`}>{t('reports.gross')}</th>
                      <th className={`${th} text-right`}>{t('reports.vat')}</th>
                      <th className={`${th} text-right`}>{t('reports.net')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.totals.byRate.map((r) => (
                      <tr key={r.rateBasisPoints} className="border-t border-gray-100">
                        <td className="py-2">{rateText(r.rateBasisPoints)}</td>
                        <td className="py-2 text-right">{money(r.grossCents)}</td>
                        <td className="py-2 text-right">{money(r.taxCents)}</td>
                        <td className="py-2 text-right">{money(r.netCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MyCard>

              <MyCard className="p-5">
                <h2 className="text-sm font-semibold text-gray-700">{t('reports.byHour')}</h2>
                <p className="text-xs text-gray-400 mb-3">{t('reports.byHourHelp')}</p>
                <div className="flex items-end gap-1 h-32">
                  {report.byHour.map((n, hour) => (
                    <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${hour}:00 · ${n}`}>
                      <div className="w-full bg-gray-900 rounded-t" style={{ height: `${(n / maxHour) * 100}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {report.byHour.map((_, hour) => (
                    <span key={hour} className="flex-1 text-center text-[10px] text-gray-400">
                      {hour % 3 === 0 ? hour : ''}
                    </span>
                  ))}
                </div>
              </MyCard>

              <MyCard className="p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('reports.byMode')}</h2>
                <ul className="text-sm divide-y divide-gray-100">
                  {report.byMode.map((m) => (
                    <li key={m.mode} className="flex justify-between py-2">
                      <span>{t(MODE_LABELS[m.mode])}</span>
                      <span>
                        {m.orderCount} · {money(m.grossCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </MyCard>

              <MyCard className="p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('reports.topDishes')}</h2>
                <ul className="text-sm divide-y divide-gray-100">
                  {report.topDishes.map((d) => (
                    <li key={d.productId} className="flex justify-between gap-4 py-2">
                      <span>{d.name}</span>
                      <span className="text-gray-500">
                        {t('reports.quantity')}: {d.quantity} · {money(d.grossCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </MyCard>
            </>
          )}

          <MyButton variant="secondary" onClick={() => download(report)} className="gap-2">
            <Download size={16} />
            {t('reports.downloadCsv')}
          </MyButton>
        </div>
      )}
    </div>
  );
}
