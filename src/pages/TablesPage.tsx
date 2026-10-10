import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useGetShopByIdQuery } from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';
import { downloadBase64File } from '../features/files/downloadBase64';
import { PNG_DATA_URL_PREFIX, parseTableNumbers, qrPngDataUrl, tableUrl } from '../features/tables/tableLinks';
import { buildTableCardsPdf } from '../features/tables/tableCards';
import { menuLanguagesOf } from '../features/menu/translations';

export function TablesPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const toast = useToast();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const [input, setInput] = useState('');

  if (isLoading) return <MySpinner />;
  if (isError || !shop) return <p className="text-red-500">{t('shops.failedToLoadShop')}</p>;

  const permissions = shop.callerPermissions ?? [];
  if (!permissions.includes('manage_menu')) {
    return (
      <div className="max-w-lg">
        <MyCard className="p-5">
          <p className="text-sm text-gray-600">{t('tables.accessDenied')}</p>
        </MyCard>
      </div>
    );
  }

  const parsed = parseTableNumbers(input);
  const base = import.meta.env.VITE_SHOP_BASE_URL ?? 'https://www.example.com';
  const cardLang: 'de' | 'en' = menuLanguagesOf(shop)[0];
  const slug = shop.slug ?? '';
  const shopName = shop.name ?? '';

  const run = async (download: () => Promise<void>) => {
    try {
      await download();
    } catch {
      toast.error(t('tables.downloadFailed'));
    }
  };

  const downloadCards = (labels: string[], fileName: string) =>
    run(async () => {
      const pdf = await buildTableCardsPdf({
        shopName,
        language: cardLang,
        cards: labels.map((label) => ({ label, url: tableUrl(base, slug, label) })),
      });
      downloadBase64File(fileName, pdf, 'application/pdf');
    });

  const downloadPng = (label: string, url: string) =>
    run(async () => {
      const dataUrl = await qrPngDataUrl(url);
      downloadBase64File(`${slug}-tisch-${label}.png`, dataUrl.slice(PNG_DATA_URL_PREFIX.length), 'image/png');
    });

  const copyLink = (url: string) =>
    run(async () => {
      await navigator.clipboard.writeText(url);
      toast.success(t('tables.linkCopied'));
    });

  return (
    <div className="max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-gray-900">{t('tables.title')}</h1>
        <p className="text-sm text-gray-600">{t('tables.help')}</p>
      </div>

      {!(shop.orderSettings?.dineIn ?? false) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
          <p>{t('tables.dineInOff')}</p>
          {permissions.includes('manage_shop') && (
            <Link to={`/shops/${shopId}/settings`} className="font-medium underline">
              {t('tables.goToSettings')}
            </Link>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <MyInput label={t('tables.numbersLabel')} value={input} onChange={(e) => setInput(e.target.value)} />
        <p className="text-xs text-gray-500">{t('tables.numbersHint')}</p>
        {parsed.invalid.length > 0 && (
          <p className="text-sm text-red-600">{t('tables.invalid', { list: parsed.invalid.join(', ') })}</p>
        )}
        {parsed.tooMany && <p className="text-sm text-amber-700">{t('tables.tooMany')}</p>}
      </div>

      <MyButton
        disabled={parsed.valid.length === 0}
        onClick={() => downloadCards(parsed.valid, `${slug}-tische.pdf`)}
      >
        {t('tables.downloadAll')}
      </MyButton>

      {parsed.valid.length === 0 ? (
        <p className="text-sm text-gray-500">{t('tables.empty')}</p>
      ) : (
        <div className="space-y-3">
          {parsed.valid.map((label) => {
            const url = tableUrl(base, slug, label);
            return (
              <MyCard key={label} className="p-4 flex flex-wrap items-center gap-4">
                <div className="text-3xl font-bold text-gray-900 min-w-16">{label}</div>
                <QRCodeSVG value={url} size={96} />
                <div className="flex-1 min-w-48 space-y-2">
                  <p className="font-mono text-xs text-gray-600 break-all">{url}</p>
                  <div className="flex flex-wrap gap-2">
                    <MyButton size="sm" variant="secondary" onClick={() => copyLink(url)}>
                      {t('tables.copyLink')}
                    </MyButton>
                    <MyButton size="sm" variant="secondary" onClick={() => downloadPng(label, url)}>
                      {t('tables.downloadPng')}
                    </MyButton>
                    <MyButton
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadCards([label], `${slug}-tisch-${label}.pdf`)}
                    >
                      {t('tables.downloadPdf')}
                    </MyButton>
                  </div>
                </div>
              </MyCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
