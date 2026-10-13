import type { ReferenceListsResponse, ShopResponse } from '../../services/api';
import type { DeliveryZoneDto, UpdateOrderSettingsBody, WeeklyHoursDto } from '../../services/ordersApi';
import { DELIVERY_TAX_CLASS_ID, formatRate, labelFor } from '../menu/foodInfo';
import { weekOf } from './kitchenSettings';

export interface DeliveryForm {
  delivery: boolean;
  ownHours: boolean;
  hours: WeeklyHoursDto;
  zones: DeliveryZoneDto[];
}

export const MAX_ZONES = 200;

export function normalisePostcode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function deliveryFormOf(s: ShopResponse['orderSettings']): DeliveryForm {
  return {
    delivery: s?.delivery ?? false,
    ownHours: !!s?.deliveryHours,
    hours: weekOf(s?.deliveryHours),
    zones: (s?.deliveryZones ?? []).map((z) => ({ ...z })),
  };
}

export function deliveryBody(f: DeliveryForm): UpdateOrderSettingsBody {
  return {
    delivery: f.delivery,
    deliveryHours: f.ownHours ? f.hours : null,
    deliveryZones: f.zones.map((z) => ({
      postcode: normalisePostcode(z.postcode),
      feeCents: z.feeCents,
      minOrderCents: z.minOrderCents,
    })),
    // The fee's tax class is country-wide (set by superadmin); owners never send one.
  };
}

/** Row indexes whose postcode is malformed for the country or repeats an earlier row. */
export function invalidZoneRows(zones: readonly DeliveryZoneDto[], countryCode: string): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  zones.forEach((z, i) => {
    const p = normalisePostcode(z.postcode);
    const ok = countryCode.toUpperCase() === 'DE' ? /^\d{5}$/.test(p) : /^[A-Z0-9-]{3,10}$/.test(p);
    if (!ok || seen.has(p)) out.push(i);
    seen.add(p);
  });
  return out;
}

/** The tax class delivery fees are charged at: the active Delivery class, else the country default class. */
export function defaultDeliveryFeeTaxClassId(
  refs: Pick<ReferenceListsResponse, 'taxClasses' | 'defaultTaxClassId'>,
): string | null {
  return refs.taxClasses.some((c) => c.id === DELIVERY_TAX_CLASS_ID && c.isActive)
    ? DELIVERY_TAX_CLASS_ID
    : refs.defaultTaxClassId;
}

/** Class name and delivery rate for the read-only "Delivery fee VAT" line; null when the lists name no fee class. */
export function deliveryFeeVat(
  refs: Pick<ReferenceListsResponse, 'taxClasses' | 'defaultTaxClassId' | 'currentTaxRates'>,
  language: string,
): { name: string; rate: string } | null {
  const id = defaultDeliveryFeeTaxClassId(refs);
  const cls = refs.taxClasses.find((c) => c.id === id);
  if (!cls) return null;
  const bp = refs.currentTaxRates.find((r) => r.taxClassId === cls.id)?.rates.delivery ?? null;
  if (bp === null) return { name: labelFor(cls.labels, language), rate: formatRate(null) };
  const de = language.startsWith('de');
  const percent = new Intl.NumberFormat(de ? 'de-DE' : 'en-GB', { maximumFractionDigits: 2 }).format(bp / 100);
  return { name: labelFor(cls.labels, language), rate: `${percent}${de ? ' %' : '%'}` };
}
