import { useModalA11y } from '../hooks/useModalA11y';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  useGetMyShopsQuery,
  useGetShopSubscriptionQuery,
  useCreateShopMutation,
  useLazyCheckSlugAvailabilityQuery,
  useUpdateShopMutation,
  useLazyGetGoLiveStatusQuery,
} from '../services/api';
import type { CreateShopRequestDto, MenuLanguage, ShopSummaryDto } from '../services/api';
import { TakeShopOfflineModal } from '../components/shop/GoLiveModal';
import { apiErrorMessage } from '../features/api/errorMessage';
import { ClickTooltip } from '../components/ui/ClickTooltip';
import { isOfflineBySuperadminError } from '../features/shops/shopStatus';
import { visibleShops } from '../features/shops/deleteShop';
import { defaultMenuLanguageForUiLanguage } from '../features/menu/translations';
import { useGetDpaDocumentQuery } from '../services/legalApi';
import { MyButton } from '../components/ui/MyButton';
import { PendingButton } from '../components/ui/PendingButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Section, Row, EmptyNote } from '../components/layout/Page';
import { pillClass } from '../components/layout/pageStyles';
import { ShopLogoBadge } from '../components/shop/ShopLogoBadge';
import { ShopLiveBadge } from '../components/shop/ShopLiveBadge';
import { shopLiveState } from '../features/shops/shopStatus';
import { OPENED_COUNTRIES, openedCountry } from '../features/shops/openedCountries';
import { defaultNewShopForm, newShopFormError, withCountry } from '../features/shops/newShopForm';
import { SLUG_PATTERN, slugFromName } from '../features/shops/slugFromName';
import { usePageTitle } from '../features/layout/usePageTitle';

export function CreateShopModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose, containerRef });
  const toast = useToast();
  const navigate = useNavigate();
  const [createShop, { isLoading, isError, error }] = useCreateShopMutation();
  const { data: dpa, isError: dpaLoadFailed } = useGetDpaDocumentQuery({});
  const [dpaTicked, setDpaTicked] = useState(false);
  const [showDpa, setShowDpa] = useState(false);
  const dpaLang = i18n.language.startsWith('de') ? 'de' : 'en';

  const [countryError, setCountryError] = useState(false);
  const [form, setForm] = useState<Partial<CreateShopRequestDto>>(() => ({
    ...defaultNewShopForm(defaultMenuLanguageForUiLanguage(i18n.language)),
    minOrderAmountCents: 0,
  }));

  const [slugTouched, setSlugTouched] = useState(false);
  const [checkSlug] = useLazyCheckSlugAvailabilityQuery();
  // Result of the last live check, keyed by the exact slug it was for (so stale results are ignored).
  const [slugCheck, setSlugCheck] = useState<{ slug: string; result: 'available' | 'taken' | 'invalid' | 'failed'; message?: string } | null>(null);
  const slug = form.slug ?? '';
  const slugValid = SLUG_PATTERN.test(slug);
  const slugIsAvailable = slugCheck?.slug === slug && slugCheck.result === 'available';
  const slugChecking = slugValid && slugCheck?.slug !== slug;

  useEffect(() => {
    if (!SLUG_PATTERN.test(slug)) return;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlug({ slug }).unwrap();
        if (!stale) setSlugCheck({ slug, result: res.available ? 'available' : 'taken' });
      } catch (err) {
        if (stale) return;
        const status = (err as { status?: number })?.status;
        const message = (err as { data?: { error?: string } })?.data?.error;
        setSlugCheck({ slug, result: status === 400 ? 'invalid' : 'failed', message });
      }
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [slug, checkSlug]);

  const handleNameChange = (name: string) => {
    setForm((f) => (slugTouched ? { ...f, name } : { ...f, name, slug: slugFromName(name) }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: value.trim().toLowerCase() }));
  };

  const shopUrl = `${import.meta.env.VITE_SHOP_BASE_URL ?? 'https://www.example.com'}/shops/${slug}`;

  const handleCountryChange = (code: string) => {
    const country = openedCountry(code);
    if (!country) return;
    setForm((f) =>
      withCountry(f, country, t('shops.countryName.' + country.code, { defaultValue: country.label })),
    );
    setCountryError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = newShopFormError(
      form,
      dpaTicked && !!dpa,
      slugIsAvailable,
    );
    if (problem === 'country') setCountryError(true);
    if (problem || !dpa) return;
    try {
      const shop = await createShop({
        createShopRequestDto: {
          ...form,
          slug,
          acceptDpaVersion: dpa.version,
        } as CreateShopRequestDto,
      }).unwrap();
      toast.success(t('shops.created'));
      onClose();
      navigate(`/shops/${shop.id}`);
    } catch {
      // error shown below
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-shop-title"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          ref={containerRef}
          className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line-soft px-6 pt-5 pb-4">
            <div>
              <h2 id="new-shop-title" className="font-display text-[22px] leading-tight font-semibold">{t('shops.newShop')}</h2>
              <p className="mt-0.5 text-[13px] text-muted">{t('shops.createSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('products.cancel')}
              className="rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              {isError && (
                <div className="rounded-xl border border-[#f5c2bd] bg-[#fdeceb] p-3">
                  <p className="text-sm text-[#b42318]">
                    {(error as { data?: { error?: string } })?.data?.error ?? t('shops.failedToCreate')}
                  </p>
                </div>
              )}

              <MyInput
                label={t('shops.shopName')}
                type="text"
                required
                minLength={3}
                placeholder={t('shops.shopNamePlaceholder')}
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <MyInput
                  id="shop-slug"
                  label={t('shops.shopSlug')}
                  type="text"
                  required
                  maxLength={64}
                  autoComplete="off"
                  spellCheck={false}
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  aria-describedby="shop-slug-status"
                />
                <p className="text-xs text-muted">{t('shops.shopSlugHelp')}</p>
                <p id="shop-slug-status" role="status" data-testid="slug-status" className="text-xs">
                  {!slugValid ? (
                    <span className={slug ? 'text-[#b42318]' : 'text-muted'}>{t('shops.shopSlugHint')}</span>
                  ) : slugChecking ? (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
                      {t('shops.slugChecking')}
                    </span>
                  ) : slugCheck?.result === 'available' ? (
                    <span className="text-[#1d5a32]">{t('shops.slugAvailable')}</span>
                  ) : slugCheck?.result === 'taken' ? (
                    <span className="text-[#b42318]">{t('shops.slugTaken')}</span>
                  ) : slugCheck?.result === 'invalid' ? (
                    <span className="text-[#b42318]">{slugCheck.message ?? t('shops.slugInvalid')}</span>
                  ) : (
                    <span className="text-[#b42318]">{t('shops.slugCheckFailed')}</span>
                  )}
                </p>
                <p className="text-sm font-medium text-ink break-all" data-testid="slug-url">{shopUrl}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="shop-country" className="text-[13px] font-semibold text-[#4a413b]">{t('shops.shopCountry')}</label>
                <select
                  id="shop-country"
                  required
                  value={form.countryCode ?? ''}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="" disabled>{t('shops.shopCountryPlaceholder')}</option>
                  {OPENED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {t('shops.countryName.' + c.code, { defaultValue: c.label })}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">{t('shops.countryHelp')}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="shop-menu-language" className="text-[13px] font-semibold text-[#4a413b]">{t('shops.menuLanguage')}</label>
                <select
                  id="shop-menu-language"
                  value={form.menuLanguage ?? 'en'}
                  onChange={(e) => setForm((f) => ({ ...f, menuLanguage: e.target.value as MenuLanguage }))}
                  className="h-10 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="de">{t('shops.languageName.de')}</option>
                  <option value="en">{t('shops.languageName.en')}</option>
                </select>
                <p className="text-xs text-muted">{t('shops.menuLanguageHelp')}</p>
              </div>

              <div className="space-y-2">
                {dpaLoadFailed && <p className="text-sm text-[#b42318]">{t('shops.dpaLoadError')}</p>}
                <label className="flex items-start gap-2 text-sm text-[#4a413b]">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={dpaTicked}
                    onChange={(e) => setDpaTicked(e.target.checked)}
                  />
                  <span>
                    {t('shops.dpaCheckbox', { version: dpa?.version ?? '' })}{' '}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => setShowDpa((v) => !v)}
                    >
                      {t('shops.dpaRead')}
                    </button>
                  </span>
                </label>
                {showDpa && dpa && (
                  <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-line-soft bg-cream p-3">
                    {dpa.sections[dpaLang].map((sec) => (
                      <div key={sec.heading}>
                        <h4 className="text-sm font-bold text-ink">{sec.heading}</h4>
                        {sec.paragraphs.map((p) => (
                          <p key={p} className="mt-1 text-xs text-[#4a413b]">{p}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {countryError && (
              <p className="px-6 pb-2 text-xs text-muted">{t('shops.countryRequired')}</p>
            )}
            <div className="flex items-center gap-2 border-t border-line-soft px-6 py-4">
              <MyButton type="submit" isPending={isLoading} disabled={!dpaTicked || !dpa || !slugIsAvailable} className="flex-1">
                {isLoading ? t('shops.creating') : t('shops.create')}
              </MyButton>
              <MyButton type="button" variant="secondary" onClick={onClose}>
                {t('products.cancel')}
              </MyButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function ShopAvailabilityToggle({
  shop,
  isPaused,
  setIsPaused,
}: {
  shop: ShopSummaryDto;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const [fetchGoLiveStatus, { isFetching: goLiveChecking }] = useLazyGetGoLiveStatusQuery();
  const [confirmOffline, setConfirmOffline] = useState(false);
  const [blockedTooltipOpen, setBlockedTooltipOpen] = useState(false);
  const toggleRef = useRef<HTMLDivElement>(null);
  const dismissTooltip = useCallback(() => setBlockedTooltipOpen(false), []);
  const tooltipId = `shop-${shop.id}-blocked-tooltip`;
  const showBlockedTooltip = blockedTooltipOpen && isPaused;
  const isOn = !isPaused;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Going offline asks first: diners lose the menu
    if (!isPaused) {
      setConfirmOffline(true);
      return;
    }
    // Going online first runs the go-live checklist; an incomplete one blocks without a request
    try {
      const result = await fetchGoLiveStatus({ shopId: shop.id! }).unwrap();
      if (!result.allMet) {
        setBlockedTooltipOpen(true);
        return;
      }
    } catch {
      toast.error(t('shops.statusFailedToSave'));
      return;
    }
    setBlockedTooltipOpen(false);
    setIsPaused(false);
    try {
      await updateShop({ shopId: shop.id!, body: { isPaused: false } }).unwrap();
    } catch (err) {
      setIsPaused(true);
      toast.error(isOfflineBySuperadminError(err) ? t('nav.offlineBySuperadminToast') : apiErrorMessage(err, t('shops.statusFailedToSave')));
    }
  };

  return (
    <>
      <div
        ref={toggleRef}
        className="relative flex items-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') e.stopPropagation();
        }}
      >
      <PendingButton
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={`${t('shops.statusOnline')}: ${shop.name ?? ''}`}
        onClick={handleClick}
        isPending={isLoading || goLiveChecking}
        aria-describedby={showBlockedTooltip ? tooltipId : undefined}
        // The knob is absolutely positioned; the spinner is drawn below, on the side the knob is not on
        spinner={false}
        disabled={shop.offlineBySuperadmin === true}
        title={t('shops.statusOnline')}
        className={`relative h-5 w-[34px] flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 ${
          isOn ? 'bg-[#2f8a4c]' : 'bg-[#d6cdc4]'
        }`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${isOn ? 'right-0.5' : 'left-0.5'}`} />
        {(isLoading || goLiveChecking) && (
          <span
            data-pending-spinner=""
            aria-hidden="true"
            className={`absolute top-1/2 -mt-[7px] h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-ink ${isOn ? 'left-0.5' : 'right-0.5'}`}
          />
        )}
      </PendingButton>
      {showBlockedTooltip && (
        <ClickTooltip
          id={tooltipId}
          message={t('shops.cannotGoOnlineTooltip')}
          onDismiss={dismissTooltip}
          containerRef={toggleRef}
          linkTo={`/shops/${shop.id}/go-live`}
          linkLabel={t('nav.checklist')}
        />
      )}
      </div>
      {confirmOffline && (
        <div onClick={(e) => e.stopPropagation()}>
          <TakeShopOfflineModal
            shopId={shop.id!}
            onClose={() => setConfirmOffline(false)}
            onSuccess={() => {
              setConfirmOffline(false);
              setIsPaused(true);
            }}
          />
        </div>
      )}
    </>
  );
}

function ShopPlanBadge({ shopId }: { shopId: string }) {
  const { data } = useGetShopSubscriptionQuery({ shopId });
  const navigate = useNavigate();

  if (!data) return null;

  const planName = data.plan?.name ?? 'Free';
  const isActive = data.subscription.status === 'active';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/shops/${shopId}/subscription`);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors ${
        isActive
          ? 'border-[#cfe6d6] bg-[#e6f3ea] text-[#1d5a32] hover:bg-[#d9eee0]'
          : 'border-line bg-sand text-[#4a413b] hover:bg-cream'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#2f8a4c]' : 'bg-[#9a8f86]'}`} aria-hidden="true" />
      {planName}
    </button>
  );
}

/** One shop: logo, name, plan, what diners see, the online switch and a button to open it. */
function ShopRow({ shop }: { shop: ShopSummaryDto }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isPaused, setIsPaused] = useState(shop.isPaused ?? true);
  const open = `/shops/${shop.id}`;

  return (
    <Row onSelect={() => navigate(open)}>
      <ShopLogoBadge shop={shop} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-bold">{shop.name}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <ShopLiveBadge state={shopLiveState({ ...shop, isPaused })} />
          <ShopPlanBadge shopId={shop.id!} />
        </div>
      </div>
      <ShopAvailabilityToggle shop={shop} isPaused={isPaused} setIsPaused={setIsPaused} />
      <Link
        to={open}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className={`hidden items-center sm:inline-flex ${pillClass(false)}`}
      >
        {t('shops.open')}
      </Link>
    </Row>
  );
}

export function ShopsPage() {
  usePageTitle('nav.myShops');
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError } = useGetMyShopsQuery();

  const showModal = searchParams.get('addShop') === '1';
  const openModal = () => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('addShop', '1'); return n; });
  const closeModal = () => setSearchParams((p) => { const n = new URLSearchParams(p); n.delete('addShop'); return n; });

  if (isLoading) return <MySpinner label={t('shops.loading')} />;
  if (isError) return <p className="text-sm text-[#b42318]">{t('shops.loadError')}</p>;

  const shops = visibleShops(data?.shops ?? []);

  return (
    <>
      <div>
        <PageHeader
          title={t('nav.myShops')}
          count={t('shops.count', { count: shops.length })}
          actions={<MyButton onClick={openModal}>{t('shops.newShop')}</MyButton>}
        />

        <Section title={t('shops.title')} count={shops.length} hint={shops.length > 0 ? t('shops.listHint') : undefined}>
          {shops.length === 0 ? (
            <EmptyNote>{t('shops.empty')}</EmptyNote>
          ) : (
            shops.map((shop) => <ShopRow key={shop.id} shop={shop} />)
          )}
        </Section>
      </div>

      {showModal && <CreateShopModal onClose={closeModal} />}
    </>
  );
}
