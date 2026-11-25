import { describe, expect, it } from 'vitest';
import { apiErrorMessage, failureMessage, NETWORK_ERROR_MESSAGE, TIMEOUT_ERROR_MESSAGE } from './errorMessage';

const FB = 'fallback';

describe('apiErrorMessage', () => {
  it('returns the server error verbatim', () => {
    expect(apiErrorMessage({ status: 400, data: { error: 'price must be in whole cents' } }, FB)).toBe('price must be in whole cents');
    expect(apiErrorMessage({ status: 403, data: { error: 'Forbidden' } }, FB)).toBe('Forbidden');
    expect(apiErrorMessage({ status: 500, data: { error: 'Internal server error' } }, FB)).toBe('Internal server error');
  });
  it('maps network and timeout failures', () => {
    expect(apiErrorMessage({ status: 'FETCH_ERROR', error: 'Failed to fetch' }, FB)).toBe(NETWORK_ERROR_MESSAGE);
    expect(apiErrorMessage({ status: 'TIMEOUT_ERROR' }, FB)).toBe(TIMEOUT_ERROR_MESSAGE);
  });
  it('falls back for non-error shapes', () => {
    for (const v of [null, undefined, {}, new Error('boom'), 'x', { status: 'PARSING_ERROR', data: '<html>' }]) {
      expect(apiErrorMessage(v, FB)).toBe(FB);
    }
  });
  it('rejects markup', () => {
    expect(apiErrorMessage({ status: 400, data: { error: '<script>alert(1)</script>' } }, FB)).toBe(FB);
  });
  it('truncates long messages', () => {
    const out = apiErrorMessage({ status: 400, data: { error: 'a'.repeat(500) } }, FB);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(310);
  });
  it('uses data.message and joins field errors', () => {
    expect(apiErrorMessage({ status: 400, data: { message: 'bad' } }, FB)).toBe('bad');
    expect(
      apiErrorMessage({ status: 400, data: { error: [{ field: 'price', message: 'too low' }, { field: 'name', message: 'required' }] } }, FB),
    ).toBe('price: too low, name: required');
  });
  it('falls back to the status code when the body has nothing', () => {
    expect(apiErrorMessage({ status: 502, data: {} }, FB)).toBe('502');
  });
});

describe('failureMessage', () => {
  it('appends the reason, or just the prefix', () => {
    expect(failureMessage("Couldn't save.", { status: 404, data: { error: 'Product not found' } })).toBe("Couldn't save. Product not found");
    expect(failureMessage("Couldn't save.", null)).toBe("Couldn't save.");
  });
});
