import type { ShopResponse } from '../../services/api';
import type { DeliveryZoneDto, UpdateOrderSettingsBody, WeeklyHoursDto } from '../../services/ordersApi';
import { weekOf } from './kitchenSettings';

export interface DeliveryForm {
  delivery: boolean;
  ownHours: boolean;
  hours: WeeklyHoursDto;
  zones: DeliveryZoneDto[];
  feeTaxClassId: string | null;
}

export const MAX_ZONES = 200;

export function normalisePostcode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function deliveryFormOf(s: ShopResponse['orderSettings'], defaultTaxClassId: string | null): DeliveryForm {
  return {
    delivery: s?.delivery ?? false,
    ownHours: !!s?.deliveryHours,
    hours: weekOf(s?.deliveryHours),
    zones: (s?.deliveryZones ?? []).map((z) => ({ ...z })),
    feeTaxClassId: s?.deliveryFeeTaxClassId ?? defaultTaxClassId,
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
    deliveryFeeTaxClassId: f.feeTaxClassId,
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
