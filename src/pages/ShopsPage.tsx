import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  useGetMyShopsQuery,
  useGetShopSubscriptionQuery,
  useCreateShopMutation,
  useUpdateShopMutation,
} from '../services/api';
import type { CreateShopRequest, MenuLanguage, ShopResponse } from '../services/api';
import { visibleShops } from '../features/shops/deleteShop';
import { defaultMenuLanguageForUiLanguage } from '../features/menu/translations';
import { useGetDpaDocumentQuery } from '../services/legalApi';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Section, Row, EmptyNote } from '../components/layout/Page';
import { pillClass } from '../components/layout/pageStyles';
import { ShopLogoBadge } from '../components/shop/ShopLogoBadge';
import { ShopLiveBadge } from '../components/shop/ShopLiveBadge';
import { shopLiveState } from '../features/shops/shopStatus';

const COUNTRY_OPTIONS = [
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'DE', label: 'Germany' },
  { code: 'AT', label: 'Austria' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'SG', label: 'Singapore' },
  { code: 'JP', label: 'Japan' },
] as const;

const INDUSTRY_OPTIONS = [
  'Food & Beverage',
  'Fashion & Apparel',
  'Beauty & Personal Care',
  'Grocery & Essentials',
  'Toys, Kids & Baby',
  'Electronics & Gadgets',
  'Home & Living',
  'Health & Fitness',
  'Pet Supplies',
  'Services & Custom Orders',
  'Other',
] as const;

const COUNTRY_DEFAULTS: Record<string, { currency: string; timezone: string }> = {
  AU: { currency: 'AUD', timezone: 'Australia/Sydney' },
  NZ: { currency: 'NZD', timezone: 'Pacific/Auckland' },
  DE: { currency: 'EUR', timezone: 'Europe/Berlin' },
  AT: { currency: 'EUR', timezone: 'Europe/Vienna' },
  FR: { currency: 'EUR', timezone: 'Europe/Paris' },
  NL: { currency: 'EUR', timezone: 'Europe/Amsterdam' },
  GB: { currency: 'GBP', timezone: 'Europe/London' },
  CH: { currency: 'CHF', timezone: 'Europe/Zurich' },
  US: { currency: 'USD', timezone: 'America/New_York' },
  CA: { currency: 'CAD', timezone: 'America/Toronto' },
  SG: { currency: 'SGD', timezone: 'Asia/Singapore' },
  JP: { currency: 'JPY', timezone: 'Asia/Tokyo' },
};

function CreateShopModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [createShop, { isLoading, isError, error }] = useCreateShopMutation();
  const { data: dpa, isError: dpaLoadFailed } = useGetDpaDocumentQuery({});
  const [dpaTicked, setDpaTicked] = useState(false);
  const [showDpa, setShowDpa] = useState(false);
  const dpaLang = i18n.language.startsWith('de') ? 'de' : 'en';

  const [industryOther, setIndustryOther] = useState('');
  const [form, setForm] = useState<Partial<CreateShopRequest>>({
    name: '',
    countryCode: 'AU',
    menuLanguage: defaultMenuLanguageForUiLanguage(i18n.language),
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    minOrderAmountCents: 0,
    address: { street: '', city: '', state: '', postcode: '', country: 'Australia' },
    openingHours: {
      mon: [{ open: '09:00', close: '17:00' }],
      tue: [{ open: '09:00', close: '17:00' }],
      wed: [{ open: '09:00', close: '17:00' }],
      thu: [{ open: '09:00', close: '17:00' }],
      fri: [{ open: '09:00', close: '17:00' }],
      sat: [],
      sun: [],
    },
  });

  const handleCountryChange = (countryCode: string) => {
    const defaults = COUNTRY_DEFAULTS[countryCode];
    setForm((f) => ({
      ...f,
      countryCode,
      ...(defaults ? { currency: defaults.currency, timezone: defaults.timezone } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedIndustry =
      form.industry === 'Other' ? industryOther.trim() : form.industry;
    if (!resolvedIndustry) return;
    if (!form.name || form.name.trim().length < 3) return;
    if (!dpaTicked || !dpa) return;
    try {
      const shop = await createShop({
        createShopRequest: {
          ...form,
          industry: resolvedIndustry,
          acceptDpaVersion: dpa.version,
        } as CreateShopRequest,
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
        <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line-soft px-6 pt-5 pb-4">
            <div>
              <h2 className="font-display text-[22px] leading-tight font-semibold">{t('shops.newShop')}</h2>
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
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#4a413b]">Industry</label>
                <select
                  required
                  value={form.industry ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  className="h-10 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="" disabled>Select an industry…</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {form.industry === 'Other' && (
                  <input
                    type="text"
                    placeholder="Describe your industry…"
                    value={industryOther}
                    onChange={(e) => setIndustryOther(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#4a413b]">{t('shops.shopCountry')}</label>
                <select
                  required
                  value={form.countryCode ?? 'AU'}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
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
            <div className="flex items-center gap-2 border-t border-line-soft px-6 py-4">
              <MyButton type="submit" disabled={isLoading || !dpaTicked || !dpa} className="flex-1">
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
  shop: ShopResponse;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}) {
  const { t } = useTranslation();
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const isOn = !isPaused;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isPaused;
    setIsPaused(next);
    try {
      await updateShop({
        shopId: shop.id!,
        updateShopRequest: { isPaused: next },
      }).unwrap();
    } catch {
      setIsPaused(isPaused);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={`${t('shops.statusOnline')}: ${shop.name ?? ''}`}
      onClick={handleClick}
      onKeyDown={(e) => e.stopPropagation()}
      disabled={isLoading || shop.offlineBySuperadmin === true}
      title={t('shops.statusOnline')}
      className={`relative h-5 w-[34px] flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 ${
        isOn ? 'bg-[#2f8a4c]' : 'bg-[#d6cdc4]'
      }`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${isOn ? 'right-0.5' : 'left-0.5'}`} />
    </button>
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
function ShopRow({ shop }: { shop: ShopResponse }) {
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

        <Section title={t('shops.title')} count={shops.length} hint={t('shops.listHint')}>
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
