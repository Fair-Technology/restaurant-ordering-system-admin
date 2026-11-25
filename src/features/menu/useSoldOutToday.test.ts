// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useSoldOutToday } from './useSoldOutToday';

const mocks = vi.hoisted(() => ({
  unwrap: vi.fn(),
  mutate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../services/api', () => ({
  useUpdateProductAvailabilityMutation: () => [mocks.mutate],
}));
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}));

beforeEach(() => {
  mocks.unwrap.mockReset().mockResolvedValue({});
  mocks.mutate.mockReset().mockImplementation(() => ({ unwrap: mocks.unwrap }));
  mocks.success.mockReset();
  mocks.error.mockReset();
});
afterEach(cleanup);

const setup = () => renderHook(() => useSoldOutToday('shop1', 'Europe/Berlin'));

describe('useSoldOutToday', () => {
  it('toasts soldOutMarked on a successful mark', async () => {
    const { result } = setup();
    const onDone = vi.fn();
    await act(() => result.current.markSoldOutToday('p1', onDone));
    expect(mocks.success).toHaveBeenCalledWith('dishes.soldOutMarked');
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('toasts soldOutRestored on a successful clear', async () => {
    const { result } = setup();
    await act(() => result.current.clearSoldOut('p1'));
    expect(mocks.success).toHaveBeenCalledWith('dishes.soldOutRestored');
  });

  it('shows no success toast for the plain availability switch', async () => {
    const { result } = setup();
    await act(() => result.current.setAvailable('p1', false));
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("shows the server's reason on failure", async () => {
    mocks.unwrap.mockRejectedValueOnce({ status: 400, data: { error: 'Some reason' } });
    const { result } = setup();
    const onDone = vi.fn();
    await act(() => result.current.markSoldOutToday('p1', onDone));
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(mocks.error.mock.calls[0][0]).toContain('Some reason');
    expect(mocks.error.mock.calls[0][0]).toContain('dishes.soldOutFailed');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith(false);
  });

  it('clears pending after a failure and allows another call', async () => {
    mocks.unwrap.mockRejectedValueOnce({ status: 500, data: { message: 'boom' } });
    const { result } = setup();
    await act(() => result.current.markSoldOutToday('p1'));
    expect(result.current.isPending('p1')).toBe(false);
    await act(() => result.current.markSoldOutToday('p1'));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.success).toHaveBeenCalledWith('dishes.soldOutMarked');
  });

  it('ignores a second call for the same product while one is in flight', async () => {
    let release!: () => void;
    mocks.unwrap.mockReturnValueOnce(new Promise<void>((r) => (release = r)));
    const { result } = setup();
    let first!: Promise<void>;
    act(() => {
      first = result.current.markSoldOutToday('p1');
    });
    expect(result.current.isPending('p1')).toBe(true);
    await act(() => result.current.markSoldOutToday('p1'));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
      await first;
    });
    expect(result.current.isPending('p1')).toBe(false);
  });
});
