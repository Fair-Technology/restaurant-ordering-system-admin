import { describe, expect, it } from 'vitest';
import { slotCapacityFromInput, slotCapacityInputOf } from './scheduledSettings';

describe('orders-for-later settings helpers', () => {
  it('reads the stored limit for the field', () => {
    expect(slotCapacityInputOf(undefined)).toBe('');
    expect(slotCapacityInputOf({ autoRejectMinutes: 10, alertEmail: null, slotCapacity: null })).toBe('');
    expect(slotCapacityInputOf({ autoRejectMinutes: 10, alertEmail: null, slotCapacity: 4 })).toBe('4');
  });

  it('reads what the owner typed', () => {
    expect(slotCapacityFromInput('')).toBeNull();
    expect(slotCapacityFromInput('  ')).toBeNull();
    expect(slotCapacityFromInput(' 4 ')).toBe(4);
    expect(slotCapacityFromInput('1')).toBe(1);
    expect(slotCapacityFromInput('50')).toBe(50);
    for (const bad of ['0', '51', '2.5', '-1', 'abc']) expect(slotCapacityFromInput(bad)).toBe('invalid');
  });
});
