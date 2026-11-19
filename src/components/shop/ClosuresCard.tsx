import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUpdateShopMutation, type GetShopResultDto } from '../../services/api';
import {
  CLOSURE_REASON_MAX_LENGTH,
  closureRequest,
  dayClosure,
  formatClosureRange,
  upcomingClosures,
  type ShopClosure,
} from '../../features/shops/closures';
import { Section } from '../layout/Page';
import { MyInput } from '../ui/MyInput';
import { MyButton } from '../ui/MyButton';

interface Props {
  shop: GetShopResultDto;
  onRefetch: () => void;
}

export function ClosuresCard({ shop, onRefetch }: Props) {
  const { t, i18n } = useTranslation();
  const { shopId } = useParams<{ shopId: string }>();
  const [entries, setEntries] = useState<ShopClosure[] | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateShop, { isLoading: isSaving }] = useUpdateShopMutation();

  const now = new Date();
  const stored = (shop.closures ?? []) as ShopClosure[];
  const current = entries ?? upcomingClosures(stored, now);
  const pastHidden = stored.length > upcomingClosures(stored, now).length;

  const addDisabled =
    !dateInput || Date.parse(dayClosure(dateInput, undefined, shop.timezone).end) <= now.getTime();

  const handleAdd = () => {
    if (addDisabled) return;
    setEntries(upcomingClosures([...current, dayClosure(dateInput, reasonInput, shop.timezone)], now));
    setDateInput('');
    setReasonInput('');
    setMessage(null);
  };

  const handleRemove = (index: number) => {
    setEntries(current.filter((_, i) => i !== index));
    setMessage(null);
  };

  const handleSave = async () => {
    setMessage(null);
    try {
      await updateShop({ shopId: shop.id ?? shopId!, body: { closures: closureRequest(current, now) } }).unwrap();
      setEntries(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.closuresSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.closuresFailed') });
    }
  };

  return (
    <Section id="closures" className="scroll-mt-[72px]! lg:scroll-mt-6!" title={t('shops.closuresTitle')} description={t('shops.closuresHelp')} padded>
      <div className="space-y-4">
        {current.length === 0 ? (
          <p className="text-sm text-muted">{t('shops.closuresEmpty')}</p>
        ) : (
          <ul className="divide-y divide-line-soft rounded-[10px] border border-line-soft">
            {current.map((entry, index) => (
              <li key={entry.id ?? `${entry.start}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{formatClosureRange(entry, shop.timezone, i18n.language)}</p>
                  {entry.reason && <p className="truncate text-[13px] text-muted">{entry.reason}</p>}
                </div>
                <button
                  type="button"
                  aria-label={t('shops.closuresRemove')}
                  className="h-8 w-8 shrink-0 rounded-full text-lg leading-none text-muted hover:bg-sand hover:text-ink"
                  onClick={() => handleRemove(index)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {pastHidden && <p className="text-xs text-muted">{t('shops.closuresPastHidden')}</p>}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#4a413b]">{t('shops.closuresDateLabel')}</span>
            <input
              type="date"
              aria-label={t('shops.closuresDateLabel')}
              className="rounded-[10px] border border-[#e3d9ce] bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </label>
          <div className="min-w-[200px] flex-1">
            <MyInput
              label={t('shops.closuresReasonLabel')}
              placeholder={t('shops.closuresReasonPlaceholder')}
              maxLength={CLOSURE_REASON_MAX_LENGTH}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
            />
          </div>
          <MyButton variant="secondary" onClick={handleAdd} disabled={addDisabled}>
            {t('shops.closuresAdd')}
          </MyButton>
        </div>
        {message && (
          <p className={`text-sm ${message.kind === 'saved' ? 'text-[#1d5a32]' : 'text-[#b42318]'}`}>{message.text}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          <MyButton onClick={handleSave} isPending={isSaving}>
            {t('shops.closuresSave')}
          </MyButton>
        </div>
      </div>
    </Section>
  );
}
