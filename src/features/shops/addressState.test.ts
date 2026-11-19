import { describe, expect, it } from 'vitest';
import { stateFieldFor } from './addressState';
import { COUNTRY_SUBDIVISIONS } from './subdivisions';

function select(country: string | null, state: string | null) {
  const f = stateFieldFor(country, state);
  if (f.kind !== 'select') throw new Error('expected select');
  return f;
}

describe('stateFieldFor', () => {
  it('empty state → select with nothing selected', () => {
    const f = select('DE', '');
    expect(f.options).toHaveLength(16);
    expect(f.value).toBe('');
    expect(f.isLegacy).toBe(false);
  });
  it('known name selects without a legacy option', () => {
    const f = select('DE', 'Bayern');
    expect(f.value).toBe('Bayern');
    expect(f.isLegacy).toBe(false);
    expect(f.options).toHaveLength(16);
  });
  it('code and padded/lower-case variants canonicalise', () => {
    expect(select('DE', 'by').value).toBe('Bayern');
    expect(select('DE', '  bayern  ').value).toBe('Bayern');
  });
  it('unknown saved text is kept as a legacy first option', () => {
    const f = select('DE', 'Oberbayern');
    expect(f.options[0]).toEqual({ value: 'Oberbayern', label: 'Oberbayern' });
    expect(f.value).toBe('Oberbayern');
    expect(f.isLegacy).toBe(true);
    expect(f.options).toHaveLength(17);
  });
  it('countries without a list are hidden', () => {
    expect(stateFieldFor('FR', 'Ile-de-France')).toEqual({ kind: 'hidden' });
    expect(stateFieldFor(null, 'x')).toEqual({ kind: 'hidden' });
  });
  it('mutating returned options does not corrupt module data', () => {
    const first = select('DE', '');
    first.options.push({ value: 'x', label: 'x' });
    expect(select('DE', '').options).toHaveLength(16);
    expect(COUNTRY_SUBDIVISIONS.DE).toHaveLength(16);
  });
});
