// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MyInput, MyTextarea } from './MyInput';

afterEach(cleanup);

const HINT = '3–20 characters';

describe.each([
  ['MyInput', () => <MyInput label="Code" hint={HINT} value="" onChange={() => {}} />],
  ['MyTextarea', () => <MyTextarea label="Code" hint={HINT} value="" onChange={() => {}} />],
])('%s', (_name, renderIt) => {
  it('links the label to the control', () => {
    render(renderIt());
    expect(screen.getByLabelText('Code')).toBeTruthy();
  });

  it('keeps the hint out of the accessible name but in the description', () => {
    render(renderIt());
    expect(screen.queryByLabelText(`Code ${HINT}`)).toBeNull();
    const control = screen.getByLabelText('Code');
    const describedBy = control.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toContain(HINT);
  });

  // jsdom implements label activation (forwarding the click to the labelled control) but does
  // not move focus like real browsers do, so assert the association that causes focus in a browser.
  it('activates the control when the label is clicked', () => {
    render(renderIt());
    const control = screen.getByLabelText('Code');
    let clicks = 0;
    control.addEventListener('click', () => clicks++);
    const label = screen.getByText('Code') as HTMLLabelElement;
    expect(label.control).toBe(control);
    fireEvent.click(label);
    expect(clicks).toBe(1);
  });
});
