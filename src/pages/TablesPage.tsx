import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useGetShopByIdQuery } from '../services/api';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { Download } from 'lucide-react';
import { EmptyNote, PageHeader, Row, Section } from '../components/layout/Page';
import { pillClass } from '../components/layout/pageStyles';
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
  if (isError || !shop) return <p className="text-[#b42318]">{t('shops.failedToLoadShop')}</p>;

  const permissions = shop.callerPermissions ?? [];
  if (!permissions.includes('manage_menu')) {
    return (
      <div className="max-w-3xl">
        <PageHeader eyebrow={t('nav.group.shop')} title={t('tables.title')} />
        <Section padded>
          <p className="text-sm text-[#4a413b]">{t('tables.accessDenied')}</p>
        </Section>
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
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={t('nav.group.shop')}
        title={t('tables.title')}
        count={parsed.valid.length > 0 ? parsed.valid.length : undefined}
        description={t('tables.help')}
        actions={
          <MyButton
            type="button"
            size="lg"
            className="gap-2"
            disabled={parsed.valid.length === 0}
            onClick={() => downloadCards(parsed.valid, `${slug}-tische.pdf`)}
          >
            <Download size={16} strokeWidth={2.4} aria-hidden="true" />
            {t('tables.downloadAll')}
          </MyButton>
        }
      />

      {!(shop.orderSettings?.dineIn ?? false) && (
        <div className="mb-[18px] space-y-1.5 rounded-2xl border border-[#f1dfae] bg-[#fff6e0] px-4 py-3 text-sm text-[#8a5a00]">
          <p>{t('tables.dineInOff')}</p>
          {permissions.includes('manage_shop') && (
            <Link to={`/shops/${shopId}/settings`} className="font-bold underline">
              {t('tables.goToSettings')}
            </Link>
          )}
        </div>
      )}

      <Section title={t('tables.listTitle')} count={parsed.valid.length}>
        <div className="space-y-1.5 border-b border-line-soft p-4 sm:p-5">
          <MyInput label={t('tables.numbersLabel')} value={input} onChange={(e) => setInput(e.target.value)} />
          <p className="text-xs text-muted">{t('tables.numbersHint')}</p>
          {parsed.invalid.length > 0 && (
            <p className="text-sm text-[#b42318]">{t('tables.invalid', { list: parsed.invalid.join(', ') })}</p>
          )}
          {parsed.tooMany && <p className="text-sm text-[#8a5a00]">{t('tables.tooMany')}</p>}
        </div>

        {parsed.valid.length === 0 ? (
          <EmptyNote>{t('tables.empty')}</EmptyNote>
        ) : (
          parsed.valid.map((label) => {
            const url = tableUrl(base, slug, label);
            return (
              <Row key={label} className="flex-wrap">
                <div className="max-w-full min-w-14 font-display text-[26px] leading-none font-semibold break-words">{label}</div>
                <div className="flex-shrink-0 rounded-lg border border-line-soft bg-white p-1.5">
                  <QRCodeSVG value={url} size={72} />
                </div>
                <div className="min-w-0 flex-1 basis-48 space-y-2">
                  <p className="font-mono text-xs break-all text-muted">{url}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={pillClass(false)} onClick={() => copyLink(url)}>
                      {t('tables.copyLink')}
                    </button>
                    <button type="button" className={pillClass(false)} onClick={() => downloadPng(label, url)}>
                      {t('tables.downloadPng')}
                    </button>
                    <button
                      type="button"
                      className={pillClass(true)}
                      onClick={() => downloadCards([label], `${slug}-tisch-${label}.pdf`)}
                    >
                      {t('tables.downloadPdf')}
                    </button>
                  </div>
                </div>
              </Row>
            );
          })
        )}
      </Section>
    </div>
  );
}
