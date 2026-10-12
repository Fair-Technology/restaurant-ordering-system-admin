import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import type { WeeklyHoursDto } from '../../services/ordersApi';
import {
  AUTO_ACCEPT_CHOICES,
  autoAcceptBody,
  autoAcceptChoiceOf,
  weekOf,
  type AutoAcceptChoice,
} from '../../features/shops/kitchenSettings';
import { Section } from '../layout/Page';
import { MyButton } from '../ui/MyButton';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

export function AutoAcceptCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [choiceState, setChoiceState] = useState<AutoAcceptChoice | null>(null);
  const [weekState, setWeekState] = useState<WeeklyHoursDto | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const choice = choiceState ?? autoAcceptChoiceOf(shop.orderSettings);
  const week = weekState ?? weekOf(shop.orderSettings?.autoAcceptHours);

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateOrderSettings({ shopId: shop.id, body: autoAcceptBody(choice, week) }).unwrap();
      setChoiceState(null);
      setWeekState(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.autoAcceptSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.autoAcceptFailed') });
    }
  };

  return (
    <Section id="auto-accept" className="scroll-mt-[72px]! lg:scroll-mt-6!" title={t('shops.autoAcceptTitle')} description={t('shops.autoAcceptHelp')} padded>
      <div className="space-y-4">
      <div className="space-y-2">
        {AUTO_ACCEPT_CHOICES.map((c) => (
          <label key={c} className="flex items-center gap-3 text-sm text-ink">
            <input
              type="radio"
              name="autoAcceptChoice"
              className="h-4 w-4 accent-ink"
              checked={choice === c}
              onChange={() => setChoiceState(c)}
            />
            <span>{t(`shops.autoAcceptChoice.${c}`)}</span>
          </label>
        ))}
      </div>
      {choice === 'scheduled' && (
        <WeeklyHoursEditor
          week={week}
          onChange={setWeekState}
          emptyLabel={t('shops.autoAcceptNoTimes')}
          removeLabel={t('shops.autoAcceptRemove')}
        />
      )}
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-[#1d5a32]' : 'text-[#b42318]'}`}>{message.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.autoAcceptSave')}
        </MyButton>
      </div>
      </div>
    </Section>
  );
}
