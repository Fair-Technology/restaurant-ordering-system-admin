import { describe, expect, it } from 'vitest';
import { nameChangeValidationError } from './nameChange';

describe('nameChangeValidationError', () => {
  it('accepts a different valid name', () => {
    expect(nameChangeValidationError('Trattoria Nuova', 'Trattoria')).toBeNull();
  });
  it('rejects names that are too short', () => {
    expect(nameChangeValidationError('  ab ', 'Trattoria')).toBe('shops.nameChangeMinLength');
  });
  it('rejects names that are too long', () => {
    expect(nameChangeValidationError('a'.repeat(81), 'Trattoria')).toBe('shops.nameChangeMaxLength');
    expect(nameChangeValidationError('a'.repeat(80), 'Trattoria')).toBeNull();
  });
  it('rejects < and >', () => {
    expect(nameChangeValidationError('<b>Pizza</b>', 'Trattoria')).toBe('shops.nameChangeInvalidChars');
  });
  it('rejects the current name, ignoring case and whitespace', () => {
    expect(nameChangeValidationError('  TRATTORIA ', 'Trattoria')).toBe('shops.nameChangeUnchanged');
  });
});
