// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PauseOrdersDialog } from './PauseOrdersDialog';

const mocks = vi.hoisted(() => ({ updateShop: vi.fn() }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../../services/api', () => ({
  useUpdateShopMutation: () => [mocks.updateShop, { isLoading: false }],
}));

describe('PauseOrdersDialog', () => {
  beforeEach(() => {
    mocks.updateShop.mockReset();
    mocks.updateShop.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });
  afterEach(cleanup);

  it('sends only the pause by default', async () => {
    const onPaused = vi.fn();
    render(<PauseOrdersDialog shopId="s1" onClose={vi.fn()} onPaused={onPaused} />);
    fireEvent.click(screen.getByText('shops.pauseOrdersConfirm'));
    await waitFor(() => expect(onPaused).toHaveBeenCalled());
    expect(mocks.updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { ordersPaused: true, ordersPausedFor: 'minutes_30' } });
  });

  it('also switches the shop online with alsoGoOnline', async () => {
    const onPaused = vi.fn();
    render(<PauseOrdersDialog shopId="s1" alsoGoOnline onClose={vi.fn()} onPaused={onPaused} />);
    fireEvent.click(screen.getByLabelText('shops.pauseFor.rest_of_day'));
    fireEvent.click(screen.getByText('shops.pauseOrdersConfirm'));
    await waitFor(() => expect(onPaused).toHaveBeenCalled());
    expect(mocks.updateShop).toHaveBeenCalledWith({
      shopId: 's1',
      body: { isPaused: false, ordersPaused: true, ordersPausedFor: 'rest_of_day' },
    });
  });

  it('is an accessible modal dialog that closes on Escape', () => {
    const onClose = vi.fn();
    render(<PauseOrdersDialog shopId="s1" onClose={onClose} onPaused={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'shops.pauseOrdersTitle' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
