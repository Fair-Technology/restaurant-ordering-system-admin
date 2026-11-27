// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IconPickerInline } from './IconPicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

afterEach(cleanup);

describe('IconPickerInline', () => {
  it('names the trigger with the translated label, not the ⊞ glyph, when no icon is chosen', () => {
    render(<IconPickerInline value={null} onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: 'categories.chooseIcon' });
    expect(trigger.getAttribute('title')).toBe('categories.chooseIcon');
    expect(screen.queryByRole('button', { name: '⊞' })).toBeNull();
  });

  it('opens, reports the picked icon and closes', () => {
    const onChange = vi.fn();
    render(<IconPickerInline value={null} onChange={onChange} />);
    expect(screen.queryByTitle('Flame')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'categories.chooseIcon' }));
    fireEvent.click(screen.getByTitle('Flame'));
    expect(onChange).toHaveBeenCalledWith('Flame');
    expect(screen.queryByTitle('Flame')).toBeNull();
  });

  it('keeps the translated trigger name when an icon is set and shows a translated remove button', () => {
    const onChange = vi.fn();
    render(<IconPickerInline value="Flame" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'categories.chooseIcon' }));
    fireEvent.click(screen.getByRole('button', { name: 'categories.removeIcon' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.queryByRole('button', { name: 'categories.removeIcon' })).toBeNull();
  });

  it('does not show the remove button when no icon is set', () => {
    render(<IconPickerInline value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'categories.chooseIcon' }));
    expect(screen.queryByRole('button', { name: 'categories.removeIcon' })).toBeNull();
  });
});
