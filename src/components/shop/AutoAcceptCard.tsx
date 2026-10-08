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
import { MyCard } from '../ui/MyCard';
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
    <MyCard className="p-6 space-y-4" id="auto-accept">
      <h2 className="text-base font-semibold text-gray-900">{t('shops.autoAcceptTitle')}</h2>
      <p className="text-sm text-gray-600">{t('shops.autoAcceptHelp')}</p>
      <div className="space-y-2">
        {AUTO_ACCEPT_CHOICES.map((c) => (
          <label key={c} className="flex items-center gap-3 text-sm text-gray-800">
            <input
              type="radio"
              name="autoAcceptChoice"
              className="h-4 w-4"
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
        <p className={`text-sm ${message.kind === 'saved' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      <div className="border-t border-gray-200 pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.autoAcceptSave')}
        </MyButton>
      </div>
    </MyCard>
  );
}
