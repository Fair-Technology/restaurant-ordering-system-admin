// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { StripeOnboardingModal } from './StripeOnboardingModal';
import { stripeLocaleForUiLanguage } from './stripeLocale';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  load: vi.fn(),
}));

vi.mock('@stripe/connect-js', () => ({ loadConnectAndInitialize: mocks.load }));
vi.mock('@stripe/react-connect-js', () => ({
  ConnectAccountOnboarding: () => null,
  ConnectAccountManagement: () => null,
  ConnectComponentsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../services/api', () => ({
  useCreateStripeAccountSessionMutation: () => [vi.fn()],
}));

beforeEach(async () => {
  mocks.update.mockReset();
  mocks.load.mockReset().mockReturnValue({ update: mocks.update });
  await i18n.use(initReactI18next).init({
    lng: 'de',
    fallbackLng: 'en',
    resources: { en: { translation: {} }, de: { translation: {} } },
  });
});

afterEach(cleanup);

describe('stripeLocaleForUiLanguage', () => {
  it.each([
    ['de', 'de-DE'],
    ['de-DE', 'de-DE'],
    ['en', 'en-GB'],
    ['fr', 'en-GB'],
  ])('%s -> %s', (lang, expected) => {
    expect(stripeLocaleForUiLanguage(lang)).toBe(expected);
  });
});

describe('StripeOnboardingModal locale', () => {
  const mount = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <StripeOnboardingModal shopId="s1" onClose={vi.fn()} />
      </I18nextProvider>,
    );

  it('initialises Stripe Connect with the UI language locale', () => {
    mount();
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(mocks.load).toHaveBeenCalledWith(expect.objectContaining({ locale: 'de-DE' }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates the existing instance when the language changes after mount', async () => {
    mount();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({ locale: 'en-GB' });
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });
});
