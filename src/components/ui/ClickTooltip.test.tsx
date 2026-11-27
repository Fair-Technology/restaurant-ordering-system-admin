// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClickTooltip } from './ClickTooltip';

afterEach(cleanup);
const ref = { current: null };
const renderTip = (extra = {}) =>
  render(
    <MemoryRouter>
      <ClickTooltip id="t" message="Blocked" onDismiss={vi.fn()} containerRef={ref} {...extra} />
    </MemoryRouter>,
  );

describe('ClickTooltip', () => {
  it('renders no link without linkTo', () => {
    renderTip();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Blocked');
  });
  it('renders a tabbable link when linkTo and linkLabel are given', () => {
    renderTip({ linkTo: '/shops/s1/go-live', linkLabel: 'Checklist' });
    const link = screen.getByRole('link', { name: 'Checklist' });
    expect(link.getAttribute('href')).toBe('/shops/s1/go-live');
    expect(link.getAttribute('tabindex')).toBeNull();
  });
});
