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
import { MyCard } from '../components/ui/MyCard';
import { MySpinner } from '../components/ui/MySpinner';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { useToast } from '../contexts/ToastContext';
import { PaymentsCard } from '../components/shop/PaymentsCard';
import { OrderAlertsCard } from '../components/shop/OrderAlertsCard';
import { DineInCard } from '../components/shop/DineInCard';
import { accentContrastOnWhite, contrastRatio } from '../utils/contrast';
import { useShopReferenceLists } from '../features/menu/useShopReferenceLists';
import { formatRate, labelFor } from '../features/menu/foodInfo';
import type { MenuLanguage } from '../services/api';

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

const inputClass = 'w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400';

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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const [hoursState, setHoursState] = useState<OpeningHoursState | null>(null);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);

  const [statusState, setStatusState] = useState<{
    isPaused: boolean;
    pausedMessage: string;
  } | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

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
  if (isError || !shop) return <p className="text-red-500">{t('shops.failedToLoadShop')}</p>;

  const canManageShop = (shop.callerPermissions ?? []).includes('manage_shop');

  if (!canManageShop) {
    return (
      <div className="max-w-lg">
        <MyCard className="p-5">
          <p className="text-sm text-gray-600">{t('shops.membersAccessDenied')}</p>
        </MyCard>
      </div>
    );
  }

  const currentHours = hoursState ?? buildInitialHours(shop.openingHours as Record<string, unknown> | undefined);

  const currentStatus = statusState ?? {
    isPaused: shop.isPaused ?? false,
    pausedMessage: shop.pausedMessage ?? '',
  };

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

  const originalLanguage: MenuLanguage = shop.menuLanguages?.[0] ?? 'de';
  const currentLanguages = languagesState ?? shop.menuLanguages ?? [originalLanguage];

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

  const handleSaveStatus = async () => {
    setIsSavingStatus(true);
    setStatusError(null);
    try {
      await updateShop({
        shopId: shopId!,
        updateShopRequest: {
          isPaused: currentStatus.isPaused,
          pausedMessage: currentStatus.pausedMessage || undefined,
        },
      }).unwrap();
      toast.success(t('shops.statusSaved'));
      refetch();
    } catch {
      setStatusError(t('shops.statusFailedToSave'));
    } finally {
      setIsSavingStatus(false);
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
            logoUrl: shop.branding?.logoUrl ?? undefined,
            heroImageUrl: shop.branding?.heroImageUrl ?? undefined,
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
    } catch (err: any) {
      setNameChangeError(err?.data?.error ?? t('shops.nameChangeFailed'));
    } finally {
      setIsRequestingNameChange(false);
    }
  };

  const handleCancelNameChange = async () => {
    try {
      await cancelShopNameChange({ shopId: shopId! }).unwrap();
      toast.success(t('shops.nameChangeCancelled'));
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error ?? t('shops.nameChangeCancelFailed'));
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

  const handleCoverUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverFile) return;
    const fileError = checkCoverImageFile(coverFile);
    if (fileError) {
      setCoverError(t(`shops.${fileError}`));
      return;
    }
    setIsUploadingCover(true);
    setCoverError(null);
    try {
      await uploadCoverImage(coverFile, {
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
    } catch {
      setCoverError(t('shops.failedToUploadCoverImage'));
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
  const coverFileError = coverFile ? checkCoverImageFile(coverFile) : null;

  return (
    <div className="max-w-lg space-y-4">
      <MyCard>
        {infoRows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-5 py-4 ${
              i > 0 ? 'border-t border-gray-200' : ''
            }`}
          >
            <span className="text-sm text-gray-400">{row.label}</span>
            <span className={`text-sm text-gray-900 ${row.mono ? 'font-mono' : 'font-medium'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </MyCard>

      <MyCard className="p-5 flex flex-col items-center gap-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide self-start">
          QR Code
        </p>
        <QRCodeCanvas
          ref={qrRef}
          value={shopUrl}
          size={160}
          marginSize={1}
        />
        <p className="text-xs text-gray-400 font-mono break-all text-center">{shopUrl}</p>
        <MyButton type="button" variant="secondary" size="sm" onClick={handleDownloadQr}>
          Download PNG
        </MyButton>
      </MyCard>

      <MyCard className="p-5 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.detailsTitle')}
        </p>
        <div className="space-y-3">
          {/* Shop name — read-only; changes require a request */}
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('shops.detailsName')}</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-900 font-medium">{shop.name}</p>
              {!shop.pendingNameChange && !nameChangeState && (
                <MyButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setNameChangeState({ requestedName: '' })}
                >
                  {t('shops.nameChangeRequest')}
                </MyButton>
              )}
            </div>
          </div>

          {/* Pending name change banner */}
          {shop.pendingNameChange && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-start justify-between gap-3">
              <p className="text-sm text-yellow-800">
                {t('shops.nameChangePending', { name: shop.pendingNameChange.requestedName })}
              </p>
              <MyButton
                variant="ghost"
                size="sm"
                onClick={handleCancelNameChange}
              >
                {t('shops.nameChangeCancelRequest')}
              </MyButton>
            </div>
          )}

          {/* Inline name change request form */}
          {nameChangeState && !shop.pendingNameChange && (
            <div className="space-y-2 rounded-lg border border-gray-200 p-3">
              <MyInput
                label={t('shops.nameChangeRequestedName')}
                value={nameChangeState.requestedName}
                placeholder={t('shops.detailsName')}
                onChange={(e) => {
                  setNameChangeState({ requestedName: e.target.value });
                  setNameChangeError(null);
                }}
              />
              {nameChangeError && <p className="text-sm text-red-600">{nameChangeError}</p>}
              <div className="flex gap-2">
                <MyButton
                  onClick={handleRequestNameChange}
                  disabled={isRequestingNameChange || nameChangeState.requestedName.trim().length < 3}
                >
                  {isRequestingNameChange ? t('shops.nameChangeSubmitting') : t('shops.nameChangeSubmit')}
                </MyButton>
                <MyButton
                  variant="ghost"
                  onClick={() => { setNameChangeState(null); setNameChangeError(null); }}
                  disabled={isRequestingNameChange}
                >
                  {t('shops.detailsCancel')}
                </MyButton>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1">{t('shops.detailsCurrency')}</p>
            <p className="text-sm text-gray-700">{shop.currency ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('shops.detailsTimezone')}</p>
            <p className="text-sm text-gray-700">{shop.timezone ?? '—'}</p>
          </div>
          <CurrencyInput
            label={t('shops.detailsMinOrder')}
            valueCents={currentDetails.minOrderAmountCents}
            onChange={(cents) => setDetailsState({ ...currentDetails, minOrderAmountCents: cents })}
          />
        </div>
        {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
        <div className="border-t border-gray-200 pt-4 flex gap-2">
          {detailsState && (
            <MyButton
              variant="ghost"
              onClick={() => { setDetailsState(null); setDetailsError(null); }}
              disabled={isSavingDetails}
            >
              {t('shops.detailsCancel')}
            </MyButton>
          )}
          <MyButton onClick={handleSaveDetails} disabled={isSavingDetails}>
            {isSavingDetails ? t('shops.detailsSaving') : t('shops.detailsSave')}
          </MyButton>
        </div>
      </MyCard>

      <MyCard className="p-5 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.logo')}
        </p>
        <div className="flex items-center gap-4">
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt="Shop logo"
              className="w-24 h-24 rounded-xl object-cover border border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-400">{t('shops.logoPlaceholder')}</span>
            </div>
          )}
        </div>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        <form onSubmit={handleLogoUpload} className="space-y-3">
          <div className="flex flex-col gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                setLogoFile(e.target.files?.[0] ?? null);
                setUploadError(null);
              }}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
            />
            {logoFile && <p className="text-xs text-gray-400">{logoFile.name}</p>}
          </div>
          <MyButton type="submit" disabled={!logoFile || isUploading}>
            {isUploading ? t('shops.uploadingLogo') : t('shops.uploadLogo')}
          </MyButton>
        </form>
      </MyCard>

      <MyCard className="p-5 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.coverImage')}
        </p>
        <p className="text-sm text-gray-500">{t('shops.coverImageHelp')}</p>
        {currentCoverUrl ? (
          <img
            src={currentCoverUrl}
            alt={t('shops.coverImage')}
            className="w-full aspect-[3/1] rounded-xl object-cover border border-gray-200"
          />
        ) : (
          <div className="w-full aspect-[3/1] rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center px-4 text-center">
            <span className="text-xs text-gray-400">{t('shops.coverImagePlaceholder')}</span>
          </div>
        )}
        {coverError && <p className="text-sm text-red-600">{coverError}</p>}
        <form onSubmit={handleCoverUpload} className="space-y-3">
          <div className="flex flex-col gap-1">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setCoverFile(f);
                const err = f ? checkCoverImageFile(f) : null;
                setCoverError(err ? t(`shops.${err}`) : null);
              }}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
            />
            {coverFile && <p className="text-xs text-gray-400">{coverFile.name}</p>}
          </div>
          <div className="flex gap-2">
            <MyButton
              type="submit"
              disabled={!coverFile || coverFileError !== null || isUploadingCover || isRemovingCover}
            >
              {isUploadingCover ? t('shops.uploadingCoverImage') : t('shops.uploadCoverImage')}
            </MyButton>
            {currentCoverUrl && (
              <MyButton
                type="button"
                variant="ghost"
                onClick={handleCoverRemove}
                disabled={isRemovingCover || isUploadingCover}
              >
                {isRemovingCover ? t('shops.removingCoverImage') : t('shops.removeCoverImage')}
              </MyButton>
            )}
          </div>
        </form>
      </MyCard>

      <MyCard className="p-5 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.accentTitle')}
        </p>
        <p className="text-sm text-gray-500">{t('shops.accentHelp')}</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={currentAccent}
            onChange={(e) => setAccentState(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
          />
          <input
            type="text"
            value={currentAccent}
            maxLength={7}
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
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: currentAccent, color: accentOnColor }}
          >
            {t('shops.colorsSave')}
          </button>
        </div>
        {accentCheck && !accentCheck.ok && (
          <p className="text-sm text-red-600">
            {t('shops.accentTooLight', { ratio: accentCheck.ratio.toFixed(2) })}
          </p>
        )}
        {colorsError && <p className="text-sm text-red-600">{colorsError}</p>}
        <div className="border-t border-gray-200 pt-4">
          <MyButton onClick={handleSaveColors} disabled={isSavingColors || !accentCheck?.ok}>
            {isSavingColors ? t('shops.colorsSaving') : t('shops.colorsSave')}
          </MyButton>
        </div>
      </MyCard>

      <MyCard className="p-5 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.addressTitle')}
        </p>
        <div className="space-y-3">
          <MyInput
            label={t('shops.addressStreet')}
            value={currentAddress.street}
            onChange={(e) => setAddressState({ ...currentAddress, street: e.target.value })}
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
            label={t('shops.addressPostcode')}
            value={currentAddress.postcode}
            onChange={(e) => setAddressState({ ...currentAddress, postcode: e.target.value })}
          />
          <MyInput
            label={t('shops.addressCountry')}
            value={currentAddress.country}
            onChange={(e) => setAddressState({ ...currentAddress, country: e.target.value })}
          />
        </div>
        {addressError && <p className="text-sm text-red-600">{addressError}</p>}
        <div className="border-t border-gray-200 pt-4">
          <MyButton onClick={handleSaveAddress} disabled={isSavingAddress}>
            {isSavingAddress ? t('shops.addressSaving') : t('shops.addressSave')}
          </MyButton>
        </div>
      </MyCard>

      {/* Payments card */}
      <PaymentsCard shop={shop} onRefetch={refetch} />

      {/* Order alerts card */}
      <OrderAlertsCard shop={shop} onRefetch={refetch} />

      {/* Dine in card */}
      <DineInCard shop={shop} onRefetch={refetch} />

      {/* Menu languages card */}
      <MyCard className="p-5 space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.menuLanguagesTitle')}
        </p>
        <p className="text-sm text-gray-700">
          {t('shops.menuLanguagesOriginal', { language: t(`shops.languageName.${originalLanguage}`) })}
        </p>
        <div className="space-y-2">
          {MENU_LANGUAGES.filter((lang) => lang !== originalLanguage).map((lang) => (
            <label key={lang} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
                className="accent-gray-900"
              />
              {t(`shops.languageName.${lang}`)}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {t('shops.menuLanguagesHelp', { original: t(`shops.languageName.${originalLanguage}`) })}
        </p>
        <div className="border-t border-gray-200 pt-4">
          <MyButton onClick={handleSaveLanguages} disabled={isSavingLanguages}>
            {isSavingLanguages ? t('shops.menuLanguagesSaving') : t('shops.menuLanguagesSave')}
          </MyButton>
        </div>
      </MyCard>

      {/* Tax classes card */}
      <MyCard className="p-5 space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.taxClassesTitle')}
        </p>
        {!refs || refs.taxClasses.filter((c) => c.isActive).length === 0 ? (
          <p className="text-sm text-gray-400">{t('shops.taxClassesEmpty', { country: shop.countryCode ?? '' })}</p>
        ) : refs.taxRatesUniformAcrossModes ? (
          <div className="space-y-0">
            {refs.taxClasses.filter((c) => c.isActive).map((c) => {
              const rates = refs.currentTaxRates.find((r) => r.taxClassId === c.id)?.rates;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-t border-gray-200 py-2.5 first:border-t-0 first:pt-0"
                >
                  <span className="text-sm text-gray-700">{labelFor(c.labels, i18n.language)}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
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
                <tr className="text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-medium py-1.5" />
                  <th className="text-right font-medium py-1.5">{t('shops.taxModeCollection')}</th>
                  <th className="text-right font-medium py-1.5">{t('shops.taxModeDelivery')}</th>
                  <th className="text-right font-medium py-1.5">{t('shops.taxModeDineIn')}</th>
                </tr>
              </thead>
              <tbody>
                {refs.taxClasses.filter((c) => c.isActive).map((c) => {
                  const rates = refs.currentTaxRates.find((r) => r.taxClassId === c.id)?.rates;
                  return (
                    <tr key={c.id} className="border-t border-gray-200">
                      <td className="py-2 text-gray-700">{labelFor(c.labels, i18n.language)}</td>
                      <td className="py-2 text-right font-mono text-xs text-gray-500">{formatRate(rates?.collection ?? null)}</td>
                      <td className="py-2 text-right font-mono text-xs text-gray-500">{formatRate(rates?.delivery ?? null)}</td>
                      <td className="py-2 text-right font-mono text-xs text-gray-500">{formatRate(rates?.dine_in ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {shop.countryCode && (
          <p className="text-xs text-gray-400">
            {t('shops.taxClassesNote', { country: shop.countryCode })}
          </p>
        )}
      </MyCard>

      <MyCard className="p-5 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('shops.statusTitle')}
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('shops.statusPaused')}</span>
            <div className="flex gap-1.5">
              <MyButton
                variant={currentStatus.isPaused ? 'primary' : 'ghost'}
                onClick={() => setStatusState({ ...currentStatus, isPaused: true })}
              >
                {t('shops.statusYes')}
              </MyButton>
              <MyButton
                variant={!currentStatus.isPaused ? 'primary' : 'ghost'}
                onClick={() => setStatusState({ ...currentStatus, isPaused: false })}
              >
                {t('shops.statusNo')}
              </MyButton>
            </div>
          </div>
          {currentStatus.isPaused && (
            <div className="space-y-1.5">
              <span className="text-sm text-gray-600">{t('shops.statusPauseMessage')}</span>
              <MyInput
                value={currentStatus.pausedMessage}
                placeholder={t('shops.statusPauseMessagePlaceholder')}
                onChange={(e) => setStatusState({ ...currentStatus, pausedMessage: e.target.value })}
              />
            </div>
          )}
        </div>
        {statusError && <p className="text-sm text-red-600">{statusError}</p>}
        <div className="border-t border-gray-200 pt-4">
          <MyButton onClick={handleSaveStatus} disabled={isSavingStatus}>
            {isSavingStatus ? t('shops.statusSaving') : t('shops.statusSave')}
          </MyButton>
        </div>
      </MyCard>

      <MyCard className="p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          {t('shops.openingHours')}
        </p>
        <div className="space-y-0">
          {DAYS.map(({ key, label }) => {
            const slots = currentHours[key];
            const isOpen = slots.length > 0;
            return (
              <div key={key} className="border-t border-gray-200 pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-28 shrink-0">{label}</span>
                  <button
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      isOpen
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                    }`}
                  >
                    {isOpen ? t('shops.ohOpen') : t('shops.ohClosed')}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-2.5 space-y-2 pl-0">
                    {slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.open}
                          onChange={(e) => updateSlot(key, idx, 'open', e.target.value)}
                          className={`${inputClass} w-28`}
                        />
                        <span className="text-xs text-gray-400">{t('shops.ohTo')}</span>
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
                            className="text-sm text-gray-300 hover:text-red-500 transition-colors px-1 leading-none"
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
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors mt-1"
                    >
                      {t('shops.ohAddSlot')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {hoursError && <p className="text-sm text-red-600 mt-2">{hoursError}</p>}
        <div className="mt-4 border-t border-gray-200 pt-4">
          <MyButton onClick={handleSaveHours} disabled={isSavingHours}>
            {isSavingHours ? t('shops.ohSavingHours') : t('shops.ohSaveHours')}
          </MyButton>
        </div>
      </MyCard>

      <MyCard className="p-4">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Debug</p>
        <pre className="text-gray-500 text-xs whitespace-pre-wrap">
          {JSON.stringify(shop, null, 2)}
        </pre>
      </MyCard>
    </div>
  );
}
