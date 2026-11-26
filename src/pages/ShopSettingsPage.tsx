import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetShopByIdQuery,
  useGenerateShopLogoUploadUrlMutation,
  useSetShopLogoMutation,
  useRemoveShopLogoMutation,
  useGenerateShopCoverImageUploadUrlMutation,
  useSetShopCoverImageMutation,
  useRemoveShopCoverImageMutation,
  useUpdateShopMutation,
  useRequestShopNameChangeMutation,
  useRejectShopNameChangeMutation,
} from '../services/api';
import { checkCoverImageFile, uploadCoverImage } from '../features/shops/coverImage';
import { COVER_IMAGE_RULE, isWrongSizeError } from '../features/images/imageRules';
import { ImageCropDialog } from '../components/ui/ImageCropDialog';
import { MySwitch } from '../components/ui/MySwitch';
import { bannerShownOf, brandingWithBanner } from '../features/shops/bannerSwitch';
import { MyCard } from '../components/ui/MyCard';
import { PageHeader, Section } from '../components/layout/Page';
import { badgeClass } from '../components/layout/pageStyles';
import { SettingsSectionNav } from '../components/shop/SettingsSectionNav';
import { buildSettingsSections, parseSettingsSection, type SettingsSectionKey } from '../features/shops/settingsSections';
import { useNow } from '../features/orders/useNow';
import { canDeleteShop } from '../features/shops/deleteShop';
import { MySpinner } from '../components/ui/MySpinner';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySelect } from '../components/ui/MySelect';
import { stateFieldFor } from '../features/shops/addressState';
import { useToast } from '../contexts/ToastContext';
import { PaymentsCard } from '../components/shop/PaymentsCard';
import { OrderAlertsCard } from '../components/shop/OrderAlertsCard';
import { AutoAcceptCard } from '../components/shop/AutoAcceptCard';
import { KitchenTimingCard } from '../components/shop/KitchenTimingCard';
import { DeliveryCard } from '../components/shop/DeliveryCard';
import { MinOrderCard } from '../components/shop/MinOrderCard';
import { ClosuresCard } from '../components/shop/ClosuresCard';
import { ScheduledOrdersCard } from '../components/shop/ScheduledOrdersCard';
import { DeleteShopCard } from '../components/shop/DeleteShopCard';
import { ShopStatusCard } from '../components/shop/ShopStatusCard';
import { DineInCard } from '../components/shop/DineInCard';
import { accentContrastOnWhite, contrastRatio } from '../utils/contrast';
import { useShopReferenceLists } from '../features/menu/useShopReferenceLists';
import { formatRate, labelFor } from '../features/menu/foodInfo';
import type { MenuLanguage } from '../services/api';
import { menuLanguagesOf } from '../features/menu/translations';
import { nameChangeValidationError, SHOP_NAME_MAX_LENGTH } from '../features/shops/nameChange';
import { usePageTitle } from '../features/layout/usePageTitle';

const MENU_LANGUAGES: MenuLanguage[] = ['de', 'en'];

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type TimeSlot = { open: string; close: string };
type OpeningHoursState = Record<DayKey, TimeSlot[]>;

const ALL_DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DEFAULT_SLOT: TimeSlot = { open: '09:00', close: '17:00' };

function buildInitialHours(shopHours: Record<string, unknown> | undefined): OpeningHoursState {
  const result = {} as OpeningHoursState;
  for (const day of ALL_DAYS) {
    const slots = shopHours?.[day];
    result[day] = Array.isArray(slots) ? (slots as TimeSlot[]) : [];
  }
  return result;
}

const inputClass = 'h-10 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';

const FOOTER_CLASS = 'mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4';
const ERROR_CLASS = 'text-sm text-[#b42318]';
const FILE_INPUT_CLASS =
  'block w-full min-w-0 cursor-pointer text-sm text-muted file:mr-3 file:h-8 file:cursor-pointer file:rounded-full file:border file:border-solid file:border-[#e3d9ce] file:bg-white file:px-3 file:text-xs file:font-semibold file:text-ink hover:file:bg-cream';

export function ShopSettingsPage() {
  usePageTitle('nav.settings');
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data: shop, isLoading, isError, refetch } = useGetShopByIdQuery(
    { shopId: shopId! },
    { refetchOnMountOrArgChange: true },
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const nowMs = useNow(30_000);
  const [generateShopLogoUploadUrl] = useGenerateShopLogoUploadUrlMutation();
  const [setShopLogo] = useSetShopLogoMutation();
  const [removeShopLogo] = useRemoveShopLogoMutation();
  const [generateShopCoverImageUploadUrl] = useGenerateShopCoverImageUploadUrlMutation();
  const [setShopCoverImage] = useSetShopCoverImageMutation();
  const [removeShopCoverImage] = useRemoveShopCoverImageMutation();
  const [updateShop] = useUpdateShopMutation();
  const [requestShopNameChange] = useRequestShopNameChangeMutation();
  const [cancelShopNameChange, { isLoading: isCancellingNameChange }] = useRejectShopNameChangeMutation();
  const { refs } = useShopReferenceLists(shopId!);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [logoRemoveError, setLogoRemoveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isRemovingCover, setIsRemovingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const [hoursState, setHoursState] = useState<OpeningHoursState | null>(null);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);

  const [accentState, setAccentState] = useState<string | null>(null);
  const [isSavingColors, setIsSavingColors] = useState(false);
  const [colorsError, setColorsError] = useState<string | null>(null);

  const [nameChangeState, setNameChangeState] = useState<{ requestedName: string } | null>(null);
  const [isRequestingNameChange, setIsRequestingNameChange] = useState(false);
  const [nameChangeError, setNameChangeError] = useState<string | null>(null);

  const [addressState, setAddressState] = useState<{
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  } | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [languagesState, setLanguagesState] = useState<MenuLanguage[] | null>(null);
  const [isSavingLanguages, setIsSavingLanguages] = useState(false);

  if (isLoading) return <MySpinner label={t('shops.loadingSettings')} />;
  if (isError || !shop) return <p className="text-[#b42318]">{t('shops.failedToLoadShop')}</p>;

  const canManageShop = (shop.callerPermissions ?? []).includes('manage_shop');

  if (!canManageShop) {
    return (
      <div className="max-w-3xl">
        <PageHeader eyebrow={t('nav.group.shop')} title={t('nav.settings')} />
        <MyCard className="p-5">
          <p className="text-sm text-[#4a413b]">{t('shops.membersAccessDenied')}</p>
        </MyCard>
      </div>
    );
  }

  const currentHours = hoursState ?? buildInitialHours(shop.openingHours as Record<string, unknown> | undefined);

  const currentAccent = accentState ?? shop.branding?.accentColor ?? '#C2410C';
  const accentCheck = accentContrastOnWhite(currentAccent);
  const accentOnColor = accentCheck && contrastRatio(currentAccent, '#000000') > contrastRatio(currentAccent, '#FFFFFF')
    ? '#000000'
    : '#FFFFFF';

  const currentAddress = addressState ?? {
    street: shop.address?.street ?? '',
    city: shop.address?.city ?? '',
    state: shop.address?.state ?? '',
    postcode: shop.address?.postcode ?? '',
    country: shop.address?.country ?? '',
  };

  const originalLanguage: MenuLanguage = menuLanguagesOf(shop)[0];
  // The backend go-live gate keys the state rule off shop.countryCode, not the free-text country.
  const stateField = stateFieldFor(shop.countryCode, currentAddress.state);
  const currentLanguages = languagesState ?? menuLanguagesOf(shop);

  const handleSaveLanguages = async () => {
    setIsSavingLanguages(true);
    try {
      await updateShop({
        shopId: shopId!,
        body: { menuLanguages: currentLanguages },
      }).unwrap();
      refetch();
      toast.success(t('shops.menuLanguagesSaved'));
    } catch {
      toast.error(t('shops.menuLanguagesFailed'));
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const DAYS: { key: DayKey; label: string }[] = [
    { key: 'mon', label: t('shops.ohMon') },
    { key: 'tue', label: t('shops.ohTue') },
    { key: 'wed', label: t('shops.ohWed') },
    { key: 'thu', label: t('shops.ohThu') },
    { key: 'fri', label: t('shops.ohFri') },
    { key: 'sat', label: t('shops.ohSat') },
    { key: 'sun', label: t('shops.ohSun') },
  ];

  function toggleDay(day: DayKey) {
    const next = { ...currentHours };
    next[day] = next[day].length > 0 ? [] : [{ ...DEFAULT_SLOT }];
    setHoursState(next);
  }

  function updateSlot(day: DayKey, idx: number, field: 'open' | 'close', value: string) {
    const next = { ...currentHours };
    next[day] = next[day].map((slot, i) => (i === idx ? { ...slot, [field]: value } : slot));
    setHoursState(next);
  }

  function addSlot(day: DayKey) {
    const next = { ...currentHours };
    next[day] = [...next[day], { ...DEFAULT_SLOT }];
    setHoursState(next);
  }

  function removeSlot(day: DayKey, idx: number) {
    const next = { ...currentHours };
    next[day] = next[day].filter((_, i) => i !== idx);
    setHoursState(next);
  }

  const handleSaveHours = async () => {
    const hasOpenDay = ALL_DAYS.some((d) => currentHours[d].length > 0);
    if (!hasOpenDay) {
      setHoursError(t('shops.ohAtLeastOneDay'));
      return;
    }
    setIsSavingHours(true);
    setHoursError(null);
    try {
      await updateShop({
        shopId: shopId!,
        body: { openingHours: currentHours },
      }).unwrap();
      toast.success(t('shops.ohHoursSaved'));
      refetch();
    } catch {
      setHoursError(t('shops.ohFailedToSave'));
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleSaveColors = async () => {
    setIsSavingColors(true);
    setColorsError(null);
    try {
      await updateShop({
        shopId: shopId!,
        body: {
          branding: {
            ...brandingWithBanner(shop.branding, bannerShownOf(shop.branding)),
            accentColor: currentAccent,
          },
        },
      }).unwrap();
      toast.success(t('shops.colorsSaved'));
      refetch();
    } catch {
      setColorsError(t('shops.colorsFailedToSave'));
    } finally {
      setIsSavingColors(false);
    }
  };

  const handleRequestNameChange = async () => {
    if (!nameChangeState) return;
    const nameError = nameChangeValidationError(nameChangeState.requestedName, shop.name);
    if (nameError) {
      setNameChangeError(t(nameError));
      return;
    }
    setIsRequestingNameChange(true);
    setNameChangeError(null);
    try {
      await requestShopNameChange({
        shopId: shopId!,
        body: { requestedName: nameChangeState.requestedName.trim() },
      }).unwrap();
      setNameChangeState(null);
      toast.success(t('shops.nameChangeSubmitted'));
      refetch();
    } catch (err) {
      setNameChangeError((err as { data?: { error?: string } })?.data?.error ?? t('shops.nameChangeFailed'));
    } finally {
      setIsRequestingNameChange(false);
    }
  };

  const handleCancelNameChange = async () => {
    try {
      await cancelShopNameChange({ shopId: shopId! }).unwrap();
      toast.success(t('shops.nameChangeCancelled'));
      refetch();
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? t('shops.nameChangeCancelFailed'));
    }
  };

  const handleSaveAddress = async () => {
    setAddressError(null);
    if (stateField.kind === 'select' && !currentAddress.state.trim()) {
      setAddressError(t('shops.addressStateRequired'));
      return;
    }
    // Same completeness rule as the backend: once complete, the address locks on save.
    const willLock =
      !!currentAddress.street.trim() &&
      !!currentAddress.city.trim() &&
      !!currentAddress.postcode.trim() &&
      !!currentAddress.country.trim() &&
      (stateField.kind !== 'select' || !!currentAddress.state.trim());
    if (willLock && !window.confirm(t('shops.addressConfirmLock'))) return;
    setIsSavingAddress(true);
    try {
      await updateShop({
        shopId: shopId!,
        body: { address: currentAddress },
      }).unwrap();
      toast.success(t('shops.addressSaved'));
      refetch();
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code;
      setAddressError(code === 'SHOP_ADDRESS_LOCKED' ? t('shops.addressLockedError') : t('shops.addressFailedToSave'));
      // A stale editable view corrects itself once the server reports the address as locked.
      refetch();
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleLogoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const contentType = logoFile.type as 'image/jpeg' | 'image/png' | 'image/webp';
      const uploadData = await generateShopLogoUploadUrl({
        shopId: shopId!,
        body: { contentType },
      }).unwrap();
      await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
        body: logoFile,
      });
      await setShopLogo({
        shopId: shopId!,
        body: { imageId: uploadData.imageId, url: uploadData.blobUrl },
      }).unwrap();
      setLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(t('shops.logoSaved'));
      refetch();
    } catch {
      setUploadError(t('shops.failedToUploadLogo'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleBannerSwitch = async (show: boolean) => {
    setIsSavingBanner(true);
    setCoverError(null);
    try {
      await updateShop({
        shopId: shopId!,
        body: { branding: brandingWithBanner(shop.branding, show) },
      }).unwrap();
      toast.success(t(show ? 'shops.bannerShownSaved' : 'shops.bannerHiddenSaved'));
      refetch();
    } catch {
      setCoverError(t('shops.bannerFailedToSave'));
    } finally {
      setIsSavingBanner(false);
    }
  };

  const closeCoverDialog = () => {
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleCoverUpload = async (cropped: Blob) => {
    setIsUploadingCover(true);
    setCoverError(null);
    try {
      await uploadCoverImage(cropped, {
        generateUploadUrl: (contentType) =>
          generateShopCoverImageUploadUrl({
            shopId: shopId!,
            body: { contentType },
          }).unwrap() as Promise<{ imageId: string; uploadUrl: string; blobUrl: string }>,
        putBlob: (uploadUrl, file, contentType) =>
          fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
            body: file,
          }),
        setCoverImage: (imageId, url) =>
          setShopCoverImage({
            shopId: shopId!,
            body: { imageId, url },
          }).unwrap(),
      });
      setCoverFile(null);
      if (coverInputRef.current) coverInputRef.current.value = '';
      toast.success(t('shops.coverImageSaved'));
      refetch();
    } catch (err) {
      setCoverError(t(isWrongSizeError(err) ? 'shops.coverImageWrongSize' : 'shops.failedToUploadCoverImage'));
      closeCoverDialog();
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCoverRemove = async () => {
    setIsRemovingCover(true);
    setCoverError(null);
    try {
      await removeShopCoverImage({ shopId: shopId! }).unwrap();
      toast.success(t('shops.coverImageRemoved'));
      refetch();
    } catch {
      setCoverError(t('shops.failedToRemoveCoverImage'));
    } finally {
      setIsRemovingCover(false);
    }
  };

  const handleLogoRemove = async () => {
    setIsRemovingLogo(true);
    setLogoRemoveError(null);
    try {
      await removeShopLogo({ shopId: shopId! }).unwrap();
      toast.success(t('shops.logoRemoved'));
      refetch();
    } catch {
      setLogoRemoveError(t('shops.failedToRemoveLogo'));
    } finally {
      setIsRemovingLogo(false);
    }
  };

  const previewSlug = shop.slug;

  const shopUrl = `${import.meta.env.VITE_SHOP_BASE_URL ?? 'https://www.example.com'}/shops/${previewSlug}`;

  const handleDownloadQr = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewSlug}-qr.png`;
    a.click();
  };

  const infoRows = [
    { label: t('shops.labelSlug'), value: `/${previewSlug}`, mono: true },
  ];

  const currentLogoUrl = shop.branding?.logoUrl;
  const currentCoverUrl = shop.branding?.heroImageUrl || null;
  const bannerShown = bannerShownOf(shop.branding);

  const openDays = ALL_DAYS.filter((d) => currentHours[d].length > 0).length;
  const showDanger = canDeleteShop(shop.callerRole);
  const sections = buildSettingsSections({ shop, openDays, nowMs, t, showDanger });
  const requested = parseSettingsSection(searchParams.get('section'));
  const active: SettingsSectionKey = sections.some((s) => s.key === requested) ? requested : 'status';
  const selectSection = (key: SettingsSectionKey) => {
    setSearchParams({ section: key }, { replace: true });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      toast.success(t('shops.settingsPage.linkCopied'));
    } catch {
      toast.error(t('shops.settingsPage.linkCopyFailed'));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.group.shop')}
        title={t('nav.settings')}
        description={t('shops.settingsPage.intro')}
      />
      <div className="md:flex md:items-start md:gap-8">
        <SettingsSectionNav
          label={t('shops.settingsPage.navLabel')}
          sections={sections}
          activeKey={active}
          onSelect={selectSection}
        />
        <div className="flex max-w-[720px] min-w-0 flex-1 flex-col gap-4 [&>section]:mb-0">
          {active === 'status' && (
            <>
              <ShopStatusCard shop={shop} onRefetch={refetch} />
              <Section
                title={t('shops.settingsPage.storefrontLink')}
                description={t('shops.settingsPage.storefrontLinkDescription')}
                padded
              >
                <div className="flex flex-wrap items-center gap-3">
                  <p className="min-w-0 flex-1 font-mono text-xs break-all text-muted">{shopUrl}</p>
                  <MyButton type="button" variant="secondary" size="sm" onClick={handleCopyLink}>
                    {t('shops.settingsPage.copyLink')}
                  </MyButton>
                </div>
              </Section>
            </>
          )}
          {active === 'details' && (
            <>
          <Section
            title={t('shops.detailsTitle')}
            description={t('shops.settingsPage.detailsDescription')}
            padded
          >
            <dl className="divide-y divide-line-soft">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                  <dt className="text-[13px] text-muted">{row.label}</dt>
                  <dd className={`min-w-0 truncate text-sm text-ink ${row.mono ? 'font-mono' : 'font-medium'}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
              {/* Shop name — read-only; changes require a request */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <dt className="text-[13px] text-muted">{t('shops.detailsName')}</dt>
                <dd className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{shop.name}</span>
                  {!shop.pendingNameChange && !nameChangeState && (
                    <MyButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setNameChangeState({ requestedName: '' })}
                    >
                      {t('shops.nameChangeRequest')}
                    </MyButton>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-[13px] text-muted">{t('shops.detailsCurrency')}</dt>
                <dd className="text-sm text-[#4a413b]">{shop.currency ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-[13px] text-muted">{t('shops.detailsTimezone')}</dt>
                <dd className="text-sm text-[#4a413b]">{shop.timezone ?? '—'}</dd>
              </div>
            </dl>

            {/* Pending name change banner */}
            {shop.pendingNameChange && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f1dfae] bg-[#fff6e0] px-4 py-3">
                <p className="text-sm text-[#8a5a00]">
                  {t('shops.nameChangePending', { name: shop.pendingNameChange.requestedName })}
                </p>
                <MyButton variant="secondary" size="sm" isPending={isCancellingNameChange} onClick={handleCancelNameChange}>
                  {t('shops.nameChangeCancelRequest')}
                </MyButton>
              </div>
            )}

            {/* Inline name change request form */}
            {nameChangeState && !shop.pendingNameChange && (
              <div className="mt-3 space-y-3 rounded-xl border border-line bg-cream p-4">
                <MyInput
                  label={t('shops.nameChangeRequestedName')}
                  value={nameChangeState.requestedName}
                  placeholder={t('shops.detailsName')}
                  maxLength={SHOP_NAME_MAX_LENGTH}
                  onChange={(e) => {
                    setNameChangeState({ requestedName: e.target.value });
                    setNameChangeError(null);
                  }}
                />
                {nameChangeError && <p className={ERROR_CLASS}>{nameChangeError}</p>}
                <div className="flex flex-wrap gap-2">
                  <MyButton
                    size="sm"
                    onClick={handleRequestNameChange}
                    isPending={isRequestingNameChange}
                    disabled={nameChangeValidationError(nameChangeState.requestedName, shop.name) !== null}
                  >
                    {isRequestingNameChange ? t('shops.nameChangeSubmitting') : t('shops.nameChangeSubmit')}
                  </MyButton>
                  <MyButton
                    variant="ghost"
                    size="sm"
                    onClick={() => { setNameChangeState(null); setNameChangeError(null); }}
                    disabled={isRequestingNameChange}
                  >
                    {t('shops.detailsCancel')}
                  </MyButton>
                </div>
              </div>
            )}
          </Section>

          <Section
            title={t('shops.addressTitle')}
            description={t('shops.settingsPage.addressDescription')}
            padded
          >
            {!shop.addressLocked && <p className="mb-3 text-xs text-muted">{t('shops.addressOneTimeNotice')}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MyInput
                  label={t('shops.addressStreet')}
                  disabled={shop.addressLocked}
                  value={currentAddress.street}
                  onChange={(e) => setAddressState({ ...currentAddress, street: e.target.value })}
                />
              </div>
              <MyInput
                label={t('shops.addressPostcode')}
                disabled={shop.addressLocked}
                value={currentAddress.postcode}
                onChange={(e) => setAddressState({ ...currentAddress, postcode: e.target.value })}
              />
              <MyInput
                label={t('shops.addressCity')}
                disabled={shop.addressLocked}
                value={currentAddress.city}
                onChange={(e) => setAddressState({ ...currentAddress, city: e.target.value })}
              />
              {stateField.kind === 'select' && (
                <div className="flex flex-col gap-1.5">
                  <MySelect
                    label={t('shops.addressState')}
                    value={stateField.value}
                    disabled={shop.addressLocked}
                    aria-describedby={stateField.isLegacy ? 'address-state-legacy-hint' : undefined}
                    onChange={(e) => setAddressState({ ...currentAddress, state: e.target.value })}
                  >
                    <option value="">{t('shops.addressStatePlaceholder')}</option>
                    {stateField.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </MySelect>
                  {stateField.isLegacy && (
                    <p id="address-state-legacy-hint" className="text-xs text-muted">
                      {t('shops.addressStateLegacy', { state: stateField.value })}
                    </p>
                  )}
                </div>
              )}
              <div className={stateField.kind === 'hidden' ? 'sm:col-span-2' : ''}>
                <MyInput
                  label={t('shops.addressCountry')}
                  value={currentAddress.country}
                  disabled
                />
              </div>
            </div>
            {addressError && <p className={`mt-3 ${ERROR_CLASS}`}>{addressError}</p>}
            {shop.addressLocked ? (
              <p className="mt-3 text-xs text-muted">{t('shops.addressLockedNotice')}</p>
            ) : (
              <div className={FOOTER_CLASS}>
                <MyButton onClick={handleSaveAddress} isPending={isSavingAddress}>
                  {isSavingAddress ? t('shops.addressSaving') : t('shops.addressSave')}
                </MyButton>
              </div>
            )}
          </Section>

          <Section title="QR Code" description={t('shops.settingsPage.qrDescription')} padded>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-line bg-white p-2">
                <QRCodeCanvas ref={qrRef} value={shopUrl} size={160} marginSize={1} />
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <p className="font-mono text-xs break-all text-muted">{shopUrl}</p>
                <MyButton type="button" variant="secondary" size="sm" onClick={handleDownloadQr}>
                  {t('shops.downloadQr')}
                </MyButton>
              </div>
            </div>
          </Section>
            </>
          )}
          {active === 'look' && (
            <>
          <Section title={t('shops.logo')} description={t('shops.settingsPage.logoDescription')} padded>
            <div className="flex items-center gap-4">
              {currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt={t('shops.logoAlt')}
                  className="h-24 w-auto max-w-full rounded-xl border border-line object-contain"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-line bg-sand">
                  <span className="text-xs text-muted">{t('shops.logoPlaceholder')}</span>
                </div>
              )}
            </div>
            {(uploadError || logoRemoveError) && <p className={`mt-3 ${ERROR_CLASS}`}>{uploadError ?? logoRemoveError}</p>}
            <form onSubmit={handleLogoUpload} className="mt-4">
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label={t('shops.uploadLogoFile')}
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isUploading || isRemovingLogo}
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] ?? null);
                    setUploadError(null);
                  }}
                  className={FILE_INPUT_CLASS}
                />
                {logoFile && <p className="text-xs text-muted">{logoFile.name}</p>}
              </div>
              <div className={FOOTER_CLASS}>
                <MyButton type="submit" isPending={isUploading} disabled={!logoFile || isRemovingLogo}>
                  {isUploading ? t('shops.uploadingLogo') : t('shops.uploadLogo')}
                </MyButton>
                {currentLogoUrl && (
                  <MyButton
                    type="button"
                    variant="danger"
                    size="sm"
                    className="ml-auto flex-shrink-0"
                    onClick={handleLogoRemove}
                    isPending={isRemovingLogo}
                    disabled={isUploading}
                  >
                    {isRemovingLogo ? t('shops.removingLogo') : t('shops.removeLogo')}
                  </MyButton>
                )}
              </div>
            </form>
          </Section>

          <Section title={t('shops.coverImage')} description={t('shops.coverImageHelp')} padded>
            <div className="flex items-start justify-between gap-4">
              <span>
                <span id="banner-switch-label" className="block text-sm font-semibold text-ink">{t('shops.bannerShowLabel')}</span>
                <span id="banner-switch-help" className="block text-[13px] text-muted">{t('shops.bannerShowHelp')}</span>
              </span>
              <MySwitch
                checked={bannerShown}
                isPending={isSavingBanner}
                onChange={handleBannerSwitch}
                labelledBy="banner-switch-label"
                describedBy="banner-switch-help"
              />
            </div>
            <div className="relative mt-4">
              {currentCoverUrl ? (
                <img
                  src={currentCoverUrl}
                  alt={t('shops.coverImage')}
                  className={`aspect-[3/1] w-full rounded-xl border border-line object-cover ${bannerShown ? '' : 'opacity-40 grayscale'}`}
                />
              ) : (
                <div className="flex aspect-[3/1] w-full items-center justify-center rounded-xl border border-line bg-sand px-4 text-center">
                  <span className="text-xs text-muted">{t('shops.coverImagePlaceholder')}</span>
                </div>
              )}
              {!bannerShown && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
                    {t('shops.bannerHiddenNote')}
                  </span>
                </span>
              )}
            </div>
            {coverError && <p className={`mt-3 ${ERROR_CLASS}`}>{coverError}</p>}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={t('shops.uploadCoverImage')}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  const err = f ? checkCoverImageFile(f) : null;
                  setCoverError(err ? t(`shops.${err}`) : null);
                  setCoverFile(f && !err ? f : null);
                  if (err && coverInputRef.current) coverInputRef.current.value = '';
                }}
                disabled={isUploadingCover || isRemovingCover}
                className={FILE_INPUT_CLASS}
              />
              {currentCoverUrl && (
                <MyButton
                  type="button"
                  variant="danger"
                  size="sm"
                  className="flex-shrink-0 self-start sm:self-auto"
                  onClick={handleCoverRemove}
                  isPending={isRemovingCover}
                  disabled={isUploadingCover}
                >
                  {isRemovingCover ? t('shops.removingCoverImage') : t('shops.removeCoverImage')}
                </MyButton>
              )}
            </div>
            {coverFile && (
              <ImageCropDialog
                file={coverFile}
                rule={COVER_IMAGE_RULE}
                title={t('shops.coverCropTitle')}
                hint={t('shops.coverCropHint')}
                safeAreaLabel={t('shops.coverVisibleOnPhones')}
                tooSmallMessage={t('shops.coverImageTooSmall')}
                previews={[
                  { label: t('shops.coverPreviewDesktop'), aspect: 3 },
                  { label: t('shops.coverPreviewPhone'), aspect: 2 },
                ]}
                busy={isUploadingCover}
                onCancel={closeCoverDialog}
                onConfirm={handleCoverUpload}
              />
            )}
          </Section>

          <Section title={t('shops.accentTitle')} description={t('shops.accentHelp')} padded>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={currentAccent}
                aria-label={t('shops.accentTitle')}
                onChange={(e) => setAccentState(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-[10px] border border-[#e3d9ce] bg-white p-1"
              />
              <input
                type="text"
                value={currentAccent}
                maxLength={7}
                aria-label={t('shops.accentTitle')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                    setAccentState(val);
                  }
                }}
                className={`${inputClass} w-28 font-mono`}
              />
              <span
                aria-hidden="true"
                className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold"
                style={{ backgroundColor: currentAccent, color: accentOnColor }}
              >
                {t('shops.colorsSave')}
              </span>
            </div>
            {accentCheck && !accentCheck.ok && (
              <p className={`mt-3 ${ERROR_CLASS}`}>
                {t('shops.accentTooLight', { ratio: accentCheck.ratio.toFixed(2) })}
              </p>
            )}
            {colorsError && <p className={`mt-3 ${ERROR_CLASS}`}>{colorsError}</p>}
            <div className={FOOTER_CLASS}>
              <MyButton onClick={handleSaveColors} isPending={isSavingColors} disabled={!accentCheck?.ok}>
                {isSavingColors ? t('shops.colorsSaving') : t('shops.colorsSave')}
              </MyButton>
            </div>
          </Section>

          <Section
            title={t('shops.menuLanguagesTitle')}
            description={t('shops.menuLanguagesOriginal', { language: t(`shops.languageName.${originalLanguage}`) })}
            padded
          >
            <div className="space-y-2">
              {MENU_LANGUAGES.filter((lang) => lang !== originalLanguage).map((lang) => (
                <label key={lang} className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={currentLanguages.includes(lang)}
                    onChange={(e) =>
                      setLanguagesState(
                        e.target.checked
                          ? [...currentLanguages, lang]
                          : currentLanguages.filter((l) => l !== lang),
                      )
                    }
                    className="h-4 w-4 accent-ink"
                  />
                  {t(`shops.languageName.${lang}`)}
                </label>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-muted">
              {t('shops.menuLanguagesHelp', { original: t(`shops.languageName.${originalLanguage}`) })}
            </p>
            <div className={FOOTER_CLASS}>
              <MyButton onClick={handleSaveLanguages} isPending={isSavingLanguages}>
                {isSavingLanguages ? t('shops.menuLanguagesSaving') : t('shops.menuLanguagesSave')}
              </MyButton>
            </div>
          </Section>
            </>
          )}
          {active === 'hours' && (
            <>
        <Section
          title={t('shops.openingHours')}
          description={t('shops.settingsPage.hoursDescription')}
        >
          <div>
            {DAYS.map(({ key, label }) => {
              const slots = currentHours[key];
              const isOpen = slots.length > 0;
              return (
                <div key={key} className="border-b border-line-soft px-4 py-3 last:border-b-0 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-sm ${isOpen ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</span>
                    <button
                      type="button"
                      aria-pressed={isOpen}
                      onClick={() => toggleDay(key)}
                      className={`h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${
                        isOpen
                          ? 'border-ink bg-ink text-white'
                          : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
                      }`}
                    >
                      {isOpen ? t('shops.ohOpen') : t('shops.ohClosed')}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="mt-2.5 space-y-2">
                      {slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot.open}
                            aria-label={t('shops.ohOpenAria', { day: label })}
                            onChange={(e) => updateSlot(key, idx, 'open', e.target.value)}
                            className={`${inputClass} w-28`}
                          />
                          <span className="text-xs text-muted">{t('shops.ohTo')}</span>
                          <input
                            type="time"
                            value={slot.close}
                            aria-label={t('shops.ohCloseAria', { day: label })}
                            onChange={(e) => updateSlot(key, idx, 'close', e.target.value)}
                            className={`${inputClass} w-28`}
                          />
                          {slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlot(key, idx)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-base leading-none text-[#8a7f77] transition-colors hover:bg-[#fdeceb] hover:text-[#b42318]"
                              aria-label={t('shops.ohRemoveSlot')}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSlot(key)}
                        className="text-xs font-semibold text-[#4a413b] underline-offset-2 hover:text-ink hover:underline"
                      >
                        {t('shops.ohAddSlot')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-line-soft p-4 sm:px-5">
            {hoursError && <p className={`mb-3 ${ERROR_CLASS}`}>{hoursError}</p>}
            <MyButton onClick={handleSaveHours} isPending={isSavingHours}>
              {isSavingHours ? t('shops.ohSavingHours') : t('shops.ohSaveHours')}
            </MyButton>
          </div>
        </Section>
              <ClosuresCard shop={shop} onRefetch={refetch} />
            </>
          )}
          {active === 'orders' && (
            <>
          <OrderAlertsCard shop={shop} onRefetch={refetch} />
          <AutoAcceptCard shop={shop} onRefetch={refetch} />
          <KitchenTimingCard shop={shop} onRefetch={refetch} />
          <ScheduledOrdersCard shop={shop} onRefetch={refetch} />
          <MinOrderCard shop={shop} onRefetch={refetch} />
          <DeliveryCard shop={shop} refs={refs} onRefetch={refetch} />
          <DineInCard shop={shop} onRefetch={refetch} />
            </>
          )}
          {active === 'pay' && (
            <>
          <PaymentsCard shop={shop} onRefetch={refetch} />

          <Section
            title={t('shops.taxClassesTitle')}
            description={t('shops.settingsPage.taxClassesDescription')}
            padded
          >
            {!refs || refs.taxClasses.filter((c) => c.isActive).length === 0 ? (
              <p className="text-sm text-[#8a7f77]">{t('shops.taxClassesEmpty', { country: shop.countryCode ?? '' })}</p>
            ) : refs.taxRatesUniformAcrossModes ? (
              <div>
                {refs.taxClasses.filter((c) => c.isActive).map((c) => {
                  const rates = refs.currentTaxRates.find((r) => r.taxClassId === c.id)?.rates;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0"
                    >
                      <span className="text-sm text-ink">{labelFor(c.labels, i18n.language)}</span>
                      <span className={`${badgeClass.neutral} font-mono`}>
                        {formatRate(rates?.collection ?? null)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#8a7f77]">
                      <th className="py-1.5 text-left font-semibold" />
                      <th className="py-1.5 text-right font-semibold">{t('shops.taxModeCollection')}</th>
                      <th className="py-1.5 text-right font-semibold">{t('shops.taxModeDelivery')}</th>
                      <th className="py-1.5 text-right font-semibold">{t('shops.taxModeDineIn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refs.taxClasses.filter((c) => c.isActive).map((c) => {
                      const rates = refs.currentTaxRates.find((r) => r.taxClassId === c.id)?.rates;
                      return (
                        <tr key={c.id} className="border-t border-line-soft">
                          <td className="py-2 text-ink">{labelFor(c.labels, i18n.language)}</td>
                          <td className="py-2 text-right font-mono text-xs text-[#4a413b]">{formatRate(rates?.collection ?? null)}</td>
                          <td className="py-2 text-right font-mono text-xs text-[#4a413b]">{formatRate(rates?.delivery ?? null)}</td>
                          <td className="py-2 text-right font-mono text-xs text-[#4a413b]">{formatRate(rates?.dine_in ?? null)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {shop.countryCode && (
              <p className="mt-3 text-[13px] text-muted">
                {t('shops.taxClassesNote', { country: shop.countryCode })}
              </p>
            )}
          </Section>
            </>
          )}
          {active === 'danger' && showDanger && (
            <DeleteShopCard shopId={shop.id ?? shopId!} shopName={shop.name ?? ''} callerRole={shop.callerRole} />
          )}
        {import.meta.env.DEV && (
          <details className="mt-2 rounded-2xl border border-line bg-white">
            <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold text-[#8a7f77]">{t('shops.debugLabel')}</summary>
            <pre className="overflow-x-auto border-t border-line-soft p-4 text-xs whitespace-pre-wrap text-[#8a7f77]">
              {JSON.stringify(shop, null, 2)}
            </pre>
          </details>
        )}
        </div>
      </div>
    </div>
  );
}
