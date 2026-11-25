// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LegalPage } from './LegalPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: Record<string, unknown>) => (o && 'email' in o ? `${key}|${o.email}` : o && 'count' in o && !('total' in o) ? `${key}|${o.count}` : o && 'total' in o ? `${key}|${o.count}/${o.total}` : key),
    i18n: { language: 'en' },
  }),
}));
vi.mock('../services/api', async (importOriginal) => ({
  // legalApi.ts injects endpoints into the real `api`, so keep it.
  ...(await importOriginal<typeof import('../services/api')>()),
  useGetShopByIdQuery: () => ({
    data: {
      callerPermissions: ['manage_shop'],
      countryCode: 'DE',
      slug: 'shop',
      name: 'Test Shop',
      address: {},
    },
  }),
}));

const legalState = vi.hoisted(() => ({
  current: null as unknown,
  trigger: undefined as unknown as ReturnType<typeof vi.fn>,
  erase: undefined as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../services/legalApi', async () => {
  const actual = await vi.importActual<typeof import('../services/legalApi')>('../services/legalApi');
  const idleMutation = () => [vi.fn(), { isLoading: false }];
  return {
    ...actual,
    useGetShopLegalQuery: () => ({ data: legalState.current, isError: false }),
    useUpdateShopLegalMutation: () => [legalState.trigger, { isLoading: false }],
    useAcceptDpaMutation: idleMutation,
    useEraseCustomerMutation: () => [legalState.erase, { isLoading: false }],
    useGetDpaDocumentQuery: () => ({ data: undefined, isFetching: false }),
    useGetPlatformLegalQuery: () => ({ data: undefined }),
    useLazyGetShopDataExportQuery: () => [vi.fn(), { isFetching: false }],
  };
});

type Extras = {
  managingDirector: string;
  court: string;
  registerNumber: string;
  iban: string;
  bic: string;
};

function legalFixture(invoiceLegalExtras: Extras | null, over: Record<string, unknown> = {}) {
  return {
    impressum: null,
    terms: null,
    withdrawal: null,
    privacyAddition: null,
    missingImpressumFields: [],
    completeness: { dpa: false, impressum: false, terms: false, withdrawal: false, privacyNotice: false },
    dpa: { currentVersion: '1', currentIsDraft: false, accepted: null },
    platformIdentityComplete: false,
    callerIsOwner: true,
    taxNumber: '',
    invoiceLegalExtras,
    ...over,
  };
}

const FILLED: Extras = {
  managingDirector: 'Jane Doe',
  court: 'Amtsgericht Berlin',
  registerNumber: 'HRB 12345',
  iban: 'DE89370400440532013000',
  bic: 'DEUTDEFF',
};
const EMPTY: Extras = { managingDirector: '', court: '', registerNumber: '', iban: '', bic: '' };

beforeEach(() => {
  legalState.trigger = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
  legalState.erase = vi.fn(() => ({ unwrap: () => Promise.resolve({ anonymisedOrderCount: 2 }) }));
});

afterEach(() => {
  cleanup();
});

function renderPage(extras: Extras | null, entry = '/shops/s1/legal?section=invoiceExtras', over: Record<string, unknown> = {}) {
  legalState.current = legalFixture(extras, over);
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/shops/:shopId/legal" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const input = (key: string) => screen.getByLabelText(`legal.f2.${key}`) as HTMLInputElement;

describe('LegalPage invoice extras card', () => {
  it('renders as its own section reachable from the nav', () => {
    renderPage(null);
    expect(screen.getByRole('heading', { name: 'legal.invoiceExtrasTitle' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /legal\.sections\.invoiceExtras/ }).getAttribute('aria-current')).toBe('page');
  });

  it('saves invoice extras with all fields filled', async () => {
    renderPage(null);
    for (const [key, v] of Object.entries(FILLED)) fireEvent.change(input(key), { target: { value: v } });
    fireEvent.click(screen.getByRole('button', { name: 'legal.invoiceExtrasSave' }));

    await waitFor(() => expect(legalState.trigger).toHaveBeenCalledTimes(1));
    expect(legalState.trigger).toHaveBeenCalledWith({ shopId: 's1', body: { invoiceLegalExtras: FILLED } });
  });

  it('saves invoice extras with all fields left empty', async () => {
    renderPage(null);
    const save = screen.getByRole('button', { name: 'legal.invoiceExtrasSave' }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    expect(screen.queryByText('legal.ibanFormatHint')).toBeNull();
    expect(screen.queryByText('legal.bicFormatHint')).toBeNull();
    fireEvent.click(save);

    await waitFor(() => expect(legalState.trigger).toHaveBeenCalledTimes(1));
    expect(legalState.trigger).toHaveBeenCalledWith({ shopId: 's1', body: { invoiceLegalExtras: EMPTY } });
  });

  it('displays previously saved invoice extras', () => {
    renderPage(FILLED);
    for (const [key, v] of Object.entries(FILLED)) expect(input(key).value).toBe(v);
  });

  it('warns about a malformed IBAN without blocking save', async () => {
    renderPage(null);
    expect(input('iban').getAttribute('aria-invalid')).toBeNull();
    fireEvent.change(input('iban'), { target: { value: 'not-an-iban' } });

    const hint = screen.getByText('legal.ibanFormatHint');
    expect(hint.id).toBe('iban-hint-error');
    expect(input('iban').getAttribute('aria-invalid')).toBe('true');
    expect(input('iban').getAttribute('aria-describedby')).toBe('iban-hint-error');
    expect(screen.queryByText('legal.bicFormatHint')).toBeNull();

    const save = screen.getByRole('button', { name: 'legal.invoiceExtrasSave' }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(legalState.trigger).toHaveBeenCalledTimes(1));
    expect(legalState.trigger).toHaveBeenCalledWith({
      shopId: 's1',
      body: { invoiceLegalExtras: { ...EMPTY, iban: 'not-an-iban' } },
    });
  });

  it('accepts a spaced IBAN and warns on a malformed BIC with its own hint id', () => {
    renderPage(null);
    fireEvent.change(input('iban'), { target: { value: 'DE89 3704 0044 0532 0130 00' } });
    expect(input('iban').getAttribute('aria-invalid')).toBeNull();

    fireEvent.change(input('bic'), { target: { value: 'xx' } });
    expect(screen.getByText('legal.bicFormatHint').id).toBe('bic-hint-error');
    expect(input('bic').getAttribute('aria-describedby')).toBe('bic-hint-error');
  });
});

describe('LegalPage shell', () => {
  it('shows the go-live summary with clickable missing items that switch section', () => {
    renderPage(null, '/shops/s1/legal', { completeness: { dpa: true, impressum: false, terms: true, withdrawal: true, privacyNotice: false } });
    expect(screen.getByText('legal.summary.title|3/5')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'legal.dpaTitle' })).toBeTruthy();
    const link = screen.getByRole('button', { name: /legal\.sections\.impressum: legal\.status\.impressumMissing/ });
    fireEvent.click(link);
    expect(screen.getByRole('heading', { name: 'legal.impressumTitle' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'legal.dpaTitle' })).toBeNull();
  });

  it('shows Ready when everything required is complete', () => {
    renderPage(null, '/shops/s1/legal', { completeness: { dpa: true, impressum: true, terms: true, withdrawal: true, privacyNotice: true } });
    expect(screen.getByText('legal.summary.ready')).toBeTruthy();
  });

  it('honours ?section= and falls back to dpa for unknown values', () => {
    renderPage(null, '/shops/s1/legal?section=impressum');
    expect(screen.getByRole('heading', { name: 'legal.impressumTitle' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'legal.dpaTitle' })).toBeNull();
    cleanup();
    renderPage(null, '/shops/s1/legal?section=bogus');
    expect(screen.getByRole('heading', { name: 'legal.dpaTitle' })).toBeTruthy();
  });

  it('nav status lines: invoice extras never flagged even with empty iban', () => {
    renderPage(EMPTY, '/shops/s1/legal');
    const nav = screen.getByRole('navigation', { name: 'legal.navLabel' });
    expect(nav.textContent).toContain('legal.status.invoiceOptionalNotSet');
    expect(nav.textContent).toContain('legal.status.dpaNotAccepted');
    expect(nav.textContent).toContain('legal.status.missing');
    expect(nav.textContent).toContain('legal.status.privacyNeedsAttention');
  });

  it('nav status lines for complete states', () => {
    renderPage(FILLED, '/shops/s1/legal', { completeness: { dpa: true, impressum: true, terms: true, withdrawal: true, privacyNotice: true } });
    const nav = screen.getByRole('navigation', { name: 'legal.navLabel' });
    expect(nav.textContent).toContain('legal.status.invoiceIbanSet');
    expect(nav.textContent).not.toContain('legal.status.missing');
  });
});

describe('LegalPage erase flow', () => {
  const open = () => {
    renderPage(null, '/shops/s1/legal?section=data');
    fireEvent.change(screen.getByLabelText('legal.eraseEmail'), { target: { value: 'Jane@Example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'legal.eraseButton' }));
  };

  it('requires typing the email, case-insensitively, and never uses window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    open();
    expect(legalState.erase).not.toHaveBeenCalled();
    const confirmBtn = screen.getByRole('button', { name: 'legal.eraseConfirmButton' }) as HTMLButtonElement;
    const typed = screen.getByLabelText('legal.eraseTypeToConfirm|Jane@Example.com');
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.change(typed, { target: { value: 'other@example.com' } });
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.change(typed, { target: { value: 'jane@example.com' } });
    expect(confirmBtn.disabled).toBe(false);
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(legalState.erase).toHaveBeenCalledWith({ shopId: 's1', email: 'Jane@Example.com' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'legal.eraseConfirmButton' })).toBeNull());
    confirmSpy.mockRestore();
  });

  it('cancel closes the panel without erasing', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'legal.eraseCancel' }));
    expect(screen.queryByRole('button', { name: 'legal.eraseConfirmButton' })).toBeNull();
    expect(legalState.erase).not.toHaveBeenCalled();
  });
});
