// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LegalPage } from './LegalPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
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
    useEraseCustomerMutation: idleMutation,
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

function legalFixture(invoiceLegalExtras: Extras | null) {
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
});

afterEach(() => {
  cleanup();
});

function renderPage(extras: Extras | null) {
  legalState.current = legalFixture(extras);
  render(
    <MemoryRouter initialEntries={['/shops/s1/legal']}>
      <Routes>
        <Route path="/shops/:shopId/legal" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const input = (key: string) => screen.getByLabelText(`legal.f2.${key}`) as HTMLInputElement;

describe('LegalPage invoice extras card', () => {
  it('renders as its own section with a jump chip', () => {
    renderPage(null);
    expect(screen.getByRole('heading', { name: 'legal.invoiceExtrasTitle' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'legal.jump.invoiceExtras' }).getAttribute('href')).toBe('#invoiceExtras');
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
