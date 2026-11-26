import { describe, expect, it } from 'vitest';
import { groupGoLiveCriteria } from './goLiveGroups';

const c = (key: string) => ({ key });

describe('groupGoLiveCriteria', () => {
  it('buckets known keys in fixed group order, keeping server order within a group', () => {
    const groups = groupGoLiveCriteria([c('terms'), c('has_categories'), c('stripe_connected'), c('has_products')]);
    expect(groups.map((g) => g.id)).toEqual(['payments', 'menu', 'legal']);
    expect(groups[1].criteria.map((x) => x.key)).toEqual(['has_categories', 'has_products']);
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
