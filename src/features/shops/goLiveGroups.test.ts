import { describe, expect, it } from 'vitest';
import { groupGoLiveCriteria } from './goLiveGroups';

const c = (key: string) => ({ key });

describe('groupGoLiveCriteria', () => {
  it('buckets known keys in fixed group order, using the fixed group order over server order', () => {
    const groups = groupGoLiveCriteria([c('terms'), c('has_products'), c('stripe_connected'), c('has_categories')]);
    expect(groups.map((g) => g.id)).toEqual(['payments', 'menu', 'legal']);
    expect(groups[1].criteria.map((x) => x.key)).toEqual(['has_categories', 'has_products']);
  });

  it('keeps the fixed order when the server already returns it', () => {
    const groups = groupGoLiveCriteria([c('has_categories'), c('has_products')]);
    expect(groups[0].criteria.map((x) => x.key)).toEqual(['has_categories', 'has_products']);
  });

  it('puts unknown keys in a trailing fallback group in server order', () => {
    const groups = groupGoLiveCriteria([c('zzz'), c('stripe_connected'), c('aaa')]);
    expect(groups.map((g) => g.id)).toEqual(['payments', 'fallback']);
    expect(groups[1].criteria.map((x) => x.key)).toEqual(['zzz', 'aaa']);
  });

  it('omits the fallback group when every key is known', () => {
    expect(groupGoLiveCriteria([c('impressum')]).map((g) => g.id)).toEqual(['legal']);
  });
});
