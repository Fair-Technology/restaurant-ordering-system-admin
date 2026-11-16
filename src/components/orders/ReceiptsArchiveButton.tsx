import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { useLazyGetInvoiceArchiveQuery } from '../../services/ordersApi';
import {
  canDownloadMonthlyReceipts,
  receiptMonthIn,
  receiptsArchiveErrorKind,
  type ReceiptsArchiveErrorKind,
} from '../../features/orders/receipts';
import { downloadBase64File } from '../../features/files/downloadBase64';
import { useToast } from '../../contexts/ToastContext';
import { MyButton } from '../ui/MyButton';

interface Props {
  shopId: string;
  /** The restaurant's time zone, so "this month" is its local month. */
  timeZone: string;
  callerRole: Parameters<typeof canDownloadMonthlyReceipts>[0];
}

/**
 * Downloads every invoice and correction invoice issued in one month as a ZIP.
 * Owner only (the backend refuses anyone else too), so it hides itself for staff.
 */
export function ReceiptsArchiveButton({ shopId, timeZone, callerRole }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [getArchive, { isFetching }] = useLazyGetInvoiceArchiveQuery();
  const [month, setMonth] = useState(() => receiptMonthIn(timeZone, new Date()));
  const [errorKind, setErrorKind] = useState<ReceiptsArchiveErrorKind | null>(null);

  if (!canDownloadMonthlyReceipts(callerRole)) return null;

  const download = async () => {
    setErrorKind(null);
    try {
      const file = await getArchive({ shopId, month }).unwrap();
      downloadBase64File(file.fileName, file.contentBase64, file.contentType);
    } catch (error) {
      const kind = receiptsArchiveErrorKind(error);
      if (kind === 'failed') toast.error(t('orders.receipts.downloadFailed'));
      setErrorKind(kind);
    }
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <span className="text-sm font-semibold text-ink">{t('orders.receipts.title')}</span>
      <label className="flex items-center gap-1.5 text-[13px] text-muted">
        {t('orders.receipts.month')}
        <input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setErrorKind(null);
          }}
          className="h-9 rounded-full border border-[#e3d9ce] bg-white px-3 text-[13px] font-semibold text-ink outline-none focus-visible:border-ink"
        />
      </label>
      <MyButton
        variant="secondary"
        size="sm"
        className="ml-auto gap-2"
        disabled={!month}
        isPending={isFetching}
        onClick={() => void download()}
      >
        <Download size={16} aria-hidden="true" />
        {isFetching ? t('orders.receipts.downloading') : t('orders.receipts.download')}
      </MyButton>
      <p className="w-full text-xs text-[#8a7f77]">{t('orders.receipts.hint')}</p>
      {(errorKind === 'empty' || errorKind === 'forbidden') && (
        <p role="status" className="w-full text-sm text-[#b42318]">
          {t(`orders.receipts.${errorKind}`)}
        </p>
      )}
    </div>
  );
}
