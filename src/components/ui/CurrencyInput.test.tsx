// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CurrencyInput } from './CurrencyInput';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));

afterEach(cleanup);

function setup(start = 0) {
  const onChange = vi.fn();
  function Harness() {
    const [v, setV] = useState(start);
    return <CurrencyInput ariaLabel="price" valueCents={v} onChange={(c) => { onChange(c); setV(c); }} />;
  }
  render(<Harness />);
  const input = screen.getByLabelText('price') as HTMLInputElement;
  const press = (...keys: string[]) => keys.forEach((key) => fireEvent.keyDown(input, { key }));
  return { onChange, press, input, last: () => onChange.mock.calls.at(-1)?.[0] };
}

describe('CurrencyInput', () => {
  it('digits build a positive value', () => {
    const { press, last } = setup();
    press('1', '2', '3');
    expect(last()).toBe(123);
  });

  it('Backspace removes the trailing digit', () => {
    const { press, last } = setup(123);
    press('Backspace');
    expect(last()).toBe(12);
  });

  it('a leading minus is kept: -, 1, 0, 0 gives -100', () => {
    const { press, last, input } = setup();
    press('-', '1', '0', '0');
    expect(last()).toBe(-100);
    expect(input.value).toContain('-');
  });

  it('pressing minus twice flips the sign back to positive', () => {
    const { press, last } = setup();
    press('-', '5', '-');
    expect(last()).toBe(5);
    press('-', '0');
    expect(last()).toBe(-50);
    press('-');
    expect(last()).toBe(50);
  });

  it('backspacing a negative value to 0 does not leave the sign stuck', () => {
    const { press, last } = setup();
    press('-', '7', 'Backspace', '4');
    expect(last()).toBe(4);
  });
});
