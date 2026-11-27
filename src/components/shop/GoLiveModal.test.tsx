// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TakeShopOfflineModal } from './GoLiveModal';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../services/api', () => ({
  useUpdateShopMutation: () => [vi.fn(), { isLoading: false }],
}));

describe('TakeShopOfflineModal a11y', () => {
  afterEach(cleanup);

  it('is an accessible modal dialog that closes on Escape', () => {
    const onClose = vi.fn();
    render(<TakeShopOfflineModal shopId="s1" onClose={onClose} onSuccess={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'shops.offlineTitle' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
