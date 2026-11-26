import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GetShopResultDto } from '../../services/api';
import { useUpdateShopMutation } from '../../services/api';
import { Section } from '../layout/Page';
import { MyButton } from '../ui/MyButton';
import { CurrencyInput } from '../ui/CurrencyInput';

interface Props {
  shop: GetShopResultDto;
  onRefetch: () => void;
}

export function MinOrderCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [valueCents, setValueCents] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateShop, { isLoading }] = useUpdateShopMutation();

  const current = valueCents ?? shop.minOrderAmountCents ?? 0;

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateShop({ shopId: shop.id, body: { minOrderAmountCents: current } }).unwrap();
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.minOrderSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.minOrderFailed') });
    }
  };

  return (
    <Section title={t('shops.minOrderTitle')} description={t('shops.minOrderHelp')} padded>
      <div className="space-y-4">
        <CurrencyInput
          label={t('shops.minOrderLabel')}
          valueCents={current}
          onChange={(cents) => setValueCents(cents)}
          countryCode={shop.countryCode}
        />
        {message && (
          <p className={`text-sm ${message.kind === 'saved' ? 'text-[#1d5a32]' : 'text-[#b42318]'}`}>{message.text}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          <MyButton onClick={handleSave} isPending={isLoading}>
            {t('shops.minOrderSave')}
          </MyButton>
        </div>
      </div>
    </Section>
  );
}
