import { describe, expect, it } from 'vitest';

import type { SalesReportDto } from '../../services/reportsApi';
import { buildReportCsv, rateText, reportFileName, type ReportCsvLabels } from './reportCsv';

const REPORT: SalesReportDto = {
  shopId: 'shop-1', from: '2026-10-05', to: '2026-10-06', timezone: 'Europe/Berlin', currency: 'EUR',
  days: [
    {
      date: '2026-10-05', orderCount: 3, grossCents: 2910, discountCents: 140, deliveryFeeCents: 250, refundCents: 1050, takingsCents: 1860,
      byRate: [
        { rateBasisPoints: 700, grossCents: 1195, taxCents: 78, netCents: 1117 },
        { rateBasisPoints: 1900, grossCents: 665, taxCents: 106, netCents: 559 },
      ],
    },
    {
      date: '2026-10-06', orderCount: 1, grossCents: 700, discountCents: 0, deliveryFeeCents: 0, refundCents: 315, takingsCents: 385,
      byRate: [{ rateBasisPoints: 1900, grossCents: 385, taxCents: 62, netCents: 323 }],
    },
  ],
  totals: {
    orderCount: 4, grossCents: 3610, discountCents: 140, deliveryFeeCents: 250, refundCents: 1365, takingsCents: 2245,
    byRate: [
      { rateBasisPoints: 700, grossCents: 1195, taxCents: 78, netCents: 1117 },
      { rateBasisPoints: 1900, grossCents: 1050, taxCents: 168, netCents: 882 },
    ],
  },
  byHour: Array(24).fill(0),
  byMode: [],
  topDishes: [],
};

const LABELS: ReportCsvLabels = {
  date: 'Date', orders: 'Orders', gross: 'Sales', discounts: 'Discounts', deliveryFees: 'Delivery fees',
  refunds: 'Refunds', takings: 'Takings', total: 'Total',
  grossAt: (r) => `Sales ${r}`, vatAt: (r) => `VAT ${r}`, netAt: (r) => `Net ${r}`,
};

describe('reportCsv', () => {
  it('rateText', () => {
    expect(rateText(700)).toBe('7 %');
    expect(rateText(1900)).toBe('19 %');
    expect(rateText(550)).toBe('5,5 %');
  });

  it('one row per day, a total row, per-rate columns', () => {
    expect(buildReportCsv(REPORT, LABELS)).toBe(
      '﻿Date;Orders;Sales;Discounts;Delivery fees;Refunds;Takings;Sales 7 %;VAT 7 %;Net 7 %;Sales 19 %;VAT 19 %;Net 19 %\r\n' +
        '2026-10-05;3;29,10;1,40;2,50;10,50;18,60;11,95;0,78;11,17;6,65;1,06;5,59\r\n' +
        '2026-10-06;1;7,00;0,00;0,00;3,15;3,85;0,00;0,00;0,00;3,85;0,62;3,23\r\n' +
        'Total;4;36,10;1,40;2,50;13,65;22,45;11,95;0,78;11,17;10,50;1,68;8,82\r\n',
    );
  });

  it('negative takings stay numbers', () => {
    const negative = { ...REPORT, days: [REPORT.days[0], { ...REPORT.days[1], takingsCents: -1050 }] };
    const second = buildReportCsv(negative, LABELS).split('\r\n')[2];
    expect(second).toContain(';-10,50;');
    expect(second).not.toContain("'");
  });

  it('file name', () => {
    expect(reportFileName('mapasta', '2026-10-05', '2026-10-06')).toBe('mapasta-report-2026-10-05-2026-10-06.csv');
  });
});
