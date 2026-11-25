// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SoldOutTodayButton } from './SoldOutTodayButton';

const en = JSON.parse(readFileSync('public/locales/en/common.json', 'utf-8')) as Record<string, unknown>;
const lookup = (key: string, opts?: Record<string, string>): string => {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  if (typeof value !== 'string') return key;
  return value.replace(/{{(\w+)}}/g, (_, k: string) => opts?.[k] ?? '');
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: lookup, i18n: { language: 'en' } }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SoldOutTodayButton', () => {
  it('idle: reads as an action with a full-sentence title and no status colours', () => {
    render(<SoldOutTodayButton name="Pizza" soldOut={false} onToggle={() => {}} />);
    const btn = screen.getByRole('switch');
    expect(screen.getByText('Mark sold out')).toBeTruthy();
    expect(btn.getAttribute('title')).toBe('Mark Pizza sold out for today');
    expect(btn.getAttribute('aria-label')).toBe('Mark Pizza sold out for today');
    expect(btn.className).toContain('border-dashed');
    expect(btn.className).not.toContain('#fff6e0');
    expect(btn.className).not.toContain('#f1f8f1');
  });

  it('sold out: shows Back on sale with the green accent', () => {
    render(<SoldOutTodayButton name="Pizza" soldOut onToggle={() => {}} />);
    const btn = screen.getByRole('switch');
    expect(screen.getByText('Back on sale')).toBeTruthy();
    expect(btn.getAttribute('title')).toBe('Put Pizza back on the menu now');
    expect(btn.className).toContain('text-[#2f6b3f]');
    expect(btn.className).not.toContain('border-dashed');
  });

  it('busy: disabled, aria-busy, spinner after the delay', () => {
    vi.useFakeTimers();
    const { container } = render(<SoldOutTodayButton name="Pizza" soldOut={false} busy onToggle={() => {}} />);
    const btn = screen.getByRole('switch') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('[data-pending-spinner]')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.querySelector('[data-pending-spinner]')).not.toBeNull();
  });

  it('click calls onToggle once; no call while busy', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SoldOutTodayButton name="Pizza" soldOut={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<SoldOutTodayButton name="Pizza" soldOut={false} busy onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
