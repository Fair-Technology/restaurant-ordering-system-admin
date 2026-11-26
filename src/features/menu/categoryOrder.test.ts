import { describe, expect, it } from 'vitest';
import { applyOrder, sortByCategoryOrder } from './categoryOrder';

type Item = { id: string; name: string; pos?: number };
const orderOf = (i: Item) => i.pos;
const nameOf = (i: Item) => i.name;
const ids = (items: Item[]) => items.map((i) => i.id);

describe('sortByCategoryOrder', () => {
  it('puts positioned items first by position, then the rest by name', () => {
    const items: Item[] = [
      { id: 'a', name: 'Zed' },
      { id: 'b', name: 'Beta', pos: 2 },
      { id: 'c', name: 'Alpha' },
      { id: 'd', name: 'Delta', pos: 1 },
    ];
    expect(ids(sortByCategoryOrder(items, 'c1', orderOf, nameOf))).toEqual(['d', 'b', 'c', 'a']);
  });

  it('falls back to name on equal positions and does not mutate the input', () => {
    const items: Item[] = [
      { id: 'a', name: 'B', pos: 1 },
      { id: 'b', name: 'A', pos: 1 },
    ];
    expect(ids(sortByCategoryOrder(items, 'c1', orderOf, nameOf))).toEqual(['b', 'a']);
    expect(ids(items)).toEqual(['a', 'b']);
  });
});

describe('applyOrder', () => {
  const items: Item[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  it('applies the id order', () => {
    expect(ids(applyOrder(items, ['c', 'a', 'b'], (i) => i.id))).toEqual(['c', 'a', 'b']);
  });
  it('skips missing ids and keeps unlisted items last in their relative order', () => {
    expect(ids(applyOrder(items, ['c', 'gone'], (i) => i.id))).toEqual(['c', 'a', 'b']);
  });
});
