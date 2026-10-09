import type { ReportTotalsDto, SalesReportDto } from '../../services/reportsApi';
import { toCsv } from '../legal/csv';
import { centsToDecimal } from '../legal/exportCsv';

export interface ReportCsvLabels {
  date: string;
  orders: string;
  gross: string;
  discounts: string;
  deliveryFees: string;
  refunds: string;
  takings: string;
  total: string;
  grossAt: (rate: string) => string;
  vatAt: (rate: string) => string;
  netAt: (rate: string) => string;
}

/** 700 -> '7 %', 1900 -> '19 %', 550 -> '5,5 %'. */
export function rateText(rateBasisPoints: number): string {
  return `${String(rateBasisPoints / 100).replace('.', ',')} %`;
}

/** One row per day of the range, a total row, and gross/VAT/net columns for every rate present. */
export function buildReportCsv(report: SalesReportDto, labels: ReportCsvLabels): string {
  const rates = report.totals.byRate.map((r) => r.rateBasisPoints);
  const header = [
    labels.date,
    labels.orders,
    labels.gross,
    labels.discounts,
    labels.deliveryFees,
    labels.refunds,
    labels.takings,
    ...rates.flatMap((r) => [labels.grossAt(rateText(r)), labels.vatAt(rateText(r)), labels.netAt(rateText(r))]),
  ];
  const row = (first: string, t: ReportTotalsDto) => [
    first,
    String(t.orderCount),
    centsToDecimal(t.grossCents),
    centsToDecimal(t.discountCents),
    centsToDecimal(t.deliveryFeeCents),
    centsToDecimal(t.refundCents),
    centsToDecimal(t.takingsCents),
    ...rates.flatMap((r) => {
      const e = t.byRate.find((x) => x.rateBasisPoints === r);
      return [centsToDecimal(e?.grossCents ?? 0), centsToDecimal(e?.taxCents ?? 0), centsToDecimal(e?.netCents ?? 0)];
    }),
  ];
  return toCsv(header, [...report.days.map((d) => row(d.date, d)), row(labels.total, report.totals)], {
    plainNumbers: true,
  });
}

export function reportFileName(slug: string, from: string, to: string): string {
  return `${slug}-report-${from}-${to}.csv`;
}
