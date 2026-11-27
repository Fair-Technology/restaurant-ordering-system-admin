// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ProductDto } from '../../services/api';
import { ScheduleOfferModal } from './ScheduleOfferModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../../services/api', () => ({
  useUpdateProductMutation: () => [vi.fn(), { isLoading: false }],
}));

describe('ScheduleOfferModal a11y', () => {
  afterEach(cleanup);

  it('is an accessible modal dialog that closes on Escape', () => {
    const onClose = vi.fn();
    const product = { id: 'p1', shopId: 's1', name: 'Pizza', price: 10 } as ProductDto;
    render(<ScheduleOfferModal product={product} currencySymbol="€" onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'products.scheduleModalTitle' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
