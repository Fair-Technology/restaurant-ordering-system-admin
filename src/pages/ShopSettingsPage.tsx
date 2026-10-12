import { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetShopByIdQuery,
  useGenerateShopLogoUploadUrlMutation,
  useSetShopLogoMutation,
  useGenerateShopCoverImageUploadUrlMutation,
  useSetShopCoverImageMutation,
  useRemoveShopCoverImageMutation,
  useUpdateShopMutation,
  useRequestShopNameChangeMutation,
  useCancelShopNameChangeMutation,
} from '../services/api';
import { checkCoverImageFile, uploadCoverImage } from '../features/shops/coverImage';
import { COVER_IMAGE_RULE, isWrongSizeError } from '../features/images/imageRules';
import { ImageCropDialog } from '../components/ui/ImageCropDialog';
import { MySwitch } from '../components/ui/MySwitch';
import { bannerShownOf, brandingWithBanner } from '../features/shops/bannerSwitch';
import { MyCard } from '../components/ui/MyCard';
import { PageHeader, Section } from '../components/layout/Page';
import { badgeClass } from '../components/layout/pageStyles';
import { SettingsNav } from '../components/shop/SettingsNav';
import { canDeleteShop } from '../features/shops/deleteShop';
import { MySpinner } from '../components/ui/MySpinner';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { useToast } from '../contexts/ToastContext';
import { PaymentsCard } from '../components/shop/PaymentsCard';
import { OrderAlertsCard } from '../components/shop/OrderAlertsCard';
import { AutoAcceptCard } from '../components/shop/AutoAcceptCard';
import { KitchenTimingCard } from '../components/shop/KitchenTimingCard';
import { DeliveryCard } from '../components/shop/DeliveryCard';
import { ScheduledOrdersCard } from '../components/shop/ScheduledOrdersCard';
import { DeleteShopCard } from '../components/shop/DeleteShopCard';
import { ShopStatusCard } from '../components/shop/ShopStatusCard';
import { DineInCard } from '../components/shop/DineInCard';
import { accentContrastOnWhite, contrastRatio } from '../utils/contrast';
import { useShopReferenceLists } from '../features/menu/useShopReferenceLists';
import { formatRate, labelFor } from '../features/menu/foodInfo';
import type { MenuLanguage } from '../services/api';
import { menuLanguagesOf } from '../features/menu/translations';

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

/** Anchor targets sit below the 56px phone header; on desktop the page scrolls from the top. */
const SCROLL_TARGET_CLASS = 'scroll-mt-[72px]! lg:scroll-mt-6!';
const GROUP_CLASS = `${SCROLL_TARGET_CLASS} pt-2`;
const GROUP_LABEL_CLASS = 'mb-2.5 px-1 text-[12px] font-bold tracking-wide text-[#8a7f77] uppercase';
const FOOTER_CLASS = 'mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4';
const ERROR_CLASS = 'text-sm text-[#b42318]';
const FILE_INPUT_CLASS =
  'block w-full min-w-0 cursor-pointer text-sm text-muted file:mr-3 file:h-8 file:cursor-pointer file:rounded-full file:border file:border-solid file:border-[#e3d9ce] file:bg-white file:px-3 file:text-xs file:font-semibold file:text-ink hover:file:bg-cream';

export function ShopSettingsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data: shop, isLoading, isError, refetch } = useGetShopByIdQuery(
    { shopId: shopId! },
    { refetchOnMountOrArgChange: true },
  );

  useEffect(() => {
    if (!shop) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [shop]);
  const [generateShopLogoUploadUrl] = useGenerateShopLogoUploadUrlMutation();
  const [setShopLogo] = useSetShopLogoMutation();
  const [generateShopCoverImageUploadUrl] = useGenerateShopCoverImageUploadUrlMutation();
  const [setShopCoverImage] = useSetShopCoverImageMutation();
  const [removeShopCoverImage] = useRemoveShopCoverImageMutation();
  const [updateShop] = useUpdateShopMutation();
  const [requestShopNameChange] = useRequestShopNameChangeMutation();
  const [cancelShopNameChange] = useCancelShopNameChangeMutation();
  const { refs } = useShopReferenceLists(shopId!);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  const [detailsState, setDetailsState] = useState<{
    minOrderAmountCents: number;
  } | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

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

  const currentDetails = detailsState ?? {
    minOrderAmountCents: shop.minOrderAmountCents ?? 0,
  };

  const currentAddress = addressState ?? {
    street: shop.address?.street ?? '',
    city: shop.address?.city ?? '',
    state: shop.address?.state ?? '',
    postcode: shop.address?.postcode ?? '',
    country: shop.address?.country ?? '',
  };

  const originalLanguage: MenuLanguage = menuLanguagesOf(shop)[0];
  const currentLanguages = languagesState ?? menuLanguagesOf(shop);

  const handleSaveLanguages = async () => {
    setIsSavingLanguages(true);
    try {
      await updateShop({
        shopId: shopId!,
        updateShopRequest: { menuLanguages: currentLanguages },
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
        updateShopRequest: { openingHours: currentHours },
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
        updateShopRequest: {
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

  const handleSaveDetails = async () => {
    setIsSavingDetails(true);
    setDetailsError(null);
    try {
      const cents = currentDetails.minOrderAmountCents > 0 ? currentDetails.minOrderAmountCents : undefined;
      await updateShop({
        shopId: shopId!,
        updateShopRequest: {
          ...(cents != null && { minOrderAmountCents: cents }),
        },
      }).unwrap();
      toast.success(t('shops.detailsSaved'));
      refetch();
    } catch {
      setDetailsError(t('shops.detailsFailedToSave'));
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleRequestNameChange = async () => {
    if (!nameChangeState || nameChangeState.requestedName.trim().length < 3) {
      setNameChangeError(t('shops.nameChangeMinLength'));
      return;
    }
    setIsRequestingNameChange(true);
    setNameChangeError(null);
    try {
      await requestShopNameChange({
        shopId: shopId!,
        requestedName: nameChangeState.requestedName.trim(),
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
    setIsSavingAddress(true);
    setAddressError(null);
    try {
      await updateShop({
        shopId: shopId!,
        updateShopRequest: { address: currentAddress },
      }).unwrap();
      toast.success(t('shops.addressSaved'));
      refetch();
    } catch {
      setAddressError(t('shops.addressFailedToSave'));
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
        generateShopLogoUploadUrlRequest: { contentType },
      }).unwrap();
      await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
        body: logoFile,
      });
      await setShopLogo({
        shopId: shopId!,
        setShopLogoRequest: { imageId: uploadData.imageId, url: uploadData.blobUrl },
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
        updateShopRequest: { branding: brandingWithBanner(shop.branding, show) },
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
            generateShopCoverImageUploadUrlRequest: { contentType },
          }).unwrap(),
        putBlob: (uploadUrl, file, contentType) =>
          fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
            body: file,
          }),
        setCoverImage: (imageId, url) =>
          setShopCoverImage({
            shopId: shopId!,
            setShopCoverImageRequest: { imageId, url },
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
    { label: t('shops.labelId'), value: shop.id, mono: true },
    { label: t('shops.labelSlug'), value: `/${previewSlug}`, mono: true },
  ];

  const currentLogoUrl = shop.branding?.logoUrl;
  const currentCoverUrl = shop.branding?.heroImageUrl || null;
  const bannerShown = bannerShownOf(shop.branding);

  const navItems = [
    { id: 'shop-status', label: t('shops.shopStatusTitle') },
    { id: 'settings-general', label: t('shops.settingsPage.groupGeneral') },
    { id: 'settings-look', label: t('shops.settingsPage.groupLook') },
    { id: 'opening-hours', label: t('shops.openingHours') },
    { id: 'settings-orders', label: t('shops.settingsPage.groupOrders') },
    { id: 'settings-payments', label: t('shops.settingsPage.groupPayments') },
    ...(canDeleteShop(shop.callerRole) ? [{ id: 'settings-danger', label: t('shops.settingsPage.groupDanger') }] : []),
  ];

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.group.shop')}
        title={t('nav.settings')}
        description={t('shops.settingsPage.intro')}
      />
      <SettingsNav label={t('shops.settingsPage.navLabel')} items={navItems} />

      <div className="max-w-3xl">
        <ShopStatusCard shop={shop} onRefetch={refetch} />

        <div id="settings-general" className={GROUP_CLASS}>
          <p className={GROUP_LABEL_CLASS}>{t('shops.settingsPage.groupGeneral')}</p>

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
                <MyButton variant="secondary" size="sm" onClick={handleCancelNameChange}>
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
                    disabled={isRequestingNameChange || nameChangeState.requestedName.trim().length < 3}
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

            <div className="mt-4">
              <CurrencyInput
                label={t('shops.detailsMinOrder')}
                valueCents={currentDetails.minOrderAmountCents}
                onChange={(cents) => setDetailsState({ ...currentDetails, minOrderAmountCents: cents })}
              />
            </div>
            {detailsError && <p className={`mt-3 ${ERROR_CLASS}`}>{detailsError}</p>}
            <div className={FOOTER_CLASS}>
              <MyButton onClick={handleSaveDetails} disabled={isSavingDetails}>
                {isSavingDetails ? t('shops.detailsSaving') : t('shops.detailsSave')}
              </MyButton>
              {detailsState && (
                <MyButton
                  variant="ghost"
                  onClick={() => { setDetailsState(null); setDetailsError(null); }}
                  disabled={isSavingDetails}
                >
                  {t('shops.detailsCancel')}
                </MyButton>
              )}
            </div>
          </Section>

          <Section
            title={t('shops.addressTitle')}
            description={t('shops.settingsPage.addressDescription')}
            padded
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MyInput
                  label={t('shops.addressStreet')}
                  value={currentAddress.street}
                  onChange={(e) => setAddressState({ ...currentAddress, street: e.target.value })}
                />
              </div>
              <MyInput
                label={t('shops.addressPostcode')}
                value={currentAddress.postcode}
                onChange={(e) => setAddressState({ ...currentAddress, postcode: e.target.value })}
              />
              <MyInput
                label={t('shops.addressCity')}
                value={currentAddress.city}
                onChange={(e) => setAddressState({ ...currentAddress, city: e.target.value })}
              />
              <MyInput
                label={t('shops.addressState')}
                value={currentAddress.state}
                onChange={(e) => setAddressState({ ...currentAddress, state: e.target.value })}
              />
              <MyInput
                label={t('shops.addressCountry')}
                value={currentAddress.country}
                onChange={(e) => setAddressState({ ...currentAddress, country: e.target.value })}
              />
            </div>
            {addressError && <p className={`mt-3 ${ERROR_CLASS}`}>{addressError}</p>}
            <div className={FOOTER_CLASS}>
              <MyButton onClick={handleSaveAddress} disabled={isSavingAddress}>
                {isSavingAddress ? t('shops.addressSaving') : t('shops.addressSave')}
              </MyButton>
            </div>
          </Section>

          <Section title="QR Code" description={t('shops.settingsPage.qrDescription')} padded>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-line bg-white p-2">
                <QRCodeCanvas ref={qrRef} value={shopUrl} size={160} marginSize={1} />
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <p className="font-mono text-xs break-all text-muted">{shopUrl}</p>
                <MyButton type="button" variant="secondary" size="sm" onClick={handleDownloadQr}>
                  Download PNG
                </MyButton>
              </div>
            </div>
          </Section>
        </div>

        <div id="settings-look" className={GROUP_CLASS}>
          <p className={GROUP_LABEL_CLASS}>{t('shops.settingsPage.groupLook')}</p>

          <Section title={t('shops.logo')} description={t('shops.settingsPage.logoDescription')} padded>
            <div className="flex items-center gap-4">
              {currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt="Shop logo"
                  className="h-24 w-auto max-w-full rounded-xl border border-line object-contain"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-line bg-sand">
                  <span className="text-xs text-muted">{t('shops.logoPlaceholder')}</span>
                </div>
              )}
            </div>
            {uploadError && <p className={`mt-3 ${ERROR_CLASS}`}>{uploadError}</p>}
            <form onSubmit={handleLogoUpload} className="mt-4">
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] ?? null);
                    setUploadError(null);
                  }}
                  className={FILE_INPUT_CLASS}
                />
                {logoFile && <p className="text-xs text-muted">{logoFile.name}</p>}
              </div>
              <div className={FOOTER_CLASS}>
                <MyButton type="submit" disabled={!logoFile || isUploading}>
                  {isUploading ? t('shops.uploadingLogo') : t('shops.uploadLogo')}
                </MyButton>
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
                disabled={isSavingBanner}
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
                  disabled={isRemovingCover || isUploadingCover}
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
              <button
                type="button"
                disabled
                className="h-10 rounded-full px-4 text-sm font-semibold"
                style={{ backgroundColor: currentAccent, color: accentOnColor }}
              >
                {t('shops.colorsSave')}
              </button>
            </div>
            {accentCheck && !accentCheck.ok && (
              <p className={`mt-3 ${ERROR_CLASS}`}>
                {t('shops.accentTooLight', { ratio: accentCheck.ratio.toFixed(2) })}
              </p>
            )}
            {colorsError && <p className={`mt-3 ${ERROR_CLASS}`}>{colorsError}</p>}
            <div className={FOOTER_CLASS}>
              <MyButton onClick={handleSaveColors} disabled={isSavingColors || !accentCheck?.ok}>
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
              <MyButton onClick={handleSaveLanguages} disabled={isSavingLanguages}>
                {isSavingLanguages ? t('shops.menuLanguagesSaving') : t('shops.menuLanguagesSave')}
              </MyButton>
            </div>
          </Section>
        </div>

        <Section
          id="opening-hours"
          className={SCROLL_TARGET_CLASS}
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
                            onChange={(e) => updateSlot(key, idx, 'open', e.target.value)}
                            className={`${inputClass} w-28`}
                          />
                          <span className="text-xs text-muted">{t('shops.ohTo')}</span>
                          <input
                            type="time"
                            value={slot.close}
                            onChange={(e) => updateSlot(key, idx, 'close', e.target.value)}
                            className={`${inputClass} w-28`}
                          />
                          {slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlot(key, idx)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-base leading-none text-[#8a7f77] transition-colors hover:bg-[#fdeceb] hover:text-[#b42318]"
                              aria-label="Remove slot"
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
            <MyButton onClick={handleSaveHours} disabled={isSavingHours}>
              {isSavingHours ? t('shops.ohSavingHours') : t('shops.ohSaveHours')}
            </MyButton>
          </div>
        </Section>

        <div id="settings-orders" className={GROUP_CLASS}>
          <p className={GROUP_LABEL_CLASS}>{t('shops.settingsPage.groupOrders')}</p>
          <OrderAlertsCard shop={shop} onRefetch={refetch} />
          <AutoAcceptCard shop={shop} onRefetch={refetch} />
          <KitchenTimingCard shop={shop} onRefetch={refetch} />
          <ScheduledOrdersCard shop={shop} onRefetch={refetch} />
          <DeliveryCard shop={shop} refs={refs} onRefetch={refetch} />
          <DineInCard shop={shop} onRefetch={refetch} />
        </div>

        <div id="settings-payments" className={GROUP_CLASS}>
          <p className={GROUP_LABEL_CLASS}>{t('shops.settingsPage.groupPayments')}</p>
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
        </div>

        {canDeleteShop(shop.callerRole) && (
          <div id="settings-danger" className={GROUP_CLASS}>
            <p className={`${GROUP_LABEL_CLASS} text-[#b42318]`}>{t('shops.settingsPage.groupDanger')}</p>
            <DeleteShopCard shopId={shop.id ?? shopId!} shopName={shop.name ?? ''} callerRole={shop.callerRole} />
          </div>
        )}

        <details className="mt-2 rounded-2xl border border-line bg-white">
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold text-[#8a7f77]">Debug</summary>
          <pre className="overflow-x-auto border-t border-line-soft p-4 text-xs whitespace-pre-wrap text-[#8a7f77]">
            {JSON.stringify(shop, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
