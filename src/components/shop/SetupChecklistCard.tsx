import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GetShopResultDto } from '../../services/api';
import { useGetGoLiveStatusQuery, useUpdateShopMutation } from '../../services/api';
import { Section } from '../layout/Page';
import { MyButton } from '../ui/MyButton';
import { GoLiveChecklist } from './GoLiveChecklist';

interface Props {
  shop: GetShopResultDto;
  onRefetch: () => void;
}

/** Dashboard card: go-live progress for a shop that is still offline. */
export function SetupChecklistCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const shopId = shop.id!;
  const { data: status } = useGetGoLiveStatusQuery({ shopId });
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const [failed, setFailed] = useState(false);

  if (!status) return null;

  const total = status.criteria.length;
  const done = status.criteria.filter((c) => c.met).length;

  const handleSwitchOnline = async () => {
    setFailed(false);
    try {
      await updateShop({ shopId, body: { isPaused: false } }).unwrap();
      onRefetch();
    } catch {
      setFailed(true);
    }
  };

  return (
    <Section title={t('reports.setupChecklist.title')} description={t('reports.setupChecklist.subtitle')} padded>
      <GoLiveChecklist shopId={shopId} status={status} />
      {failed && (
        <p role="alert" className="mt-3 text-xs text-red-500">
          {t('shops.goLive.error')}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-gray-600">
          {status.allMet ? t('shops.goLive.openCountZero') : t('shops.goLive.openCount', { count: total - done })}
        </span>
        <MyButton
          variant="primary"
          size="sm"
          onClick={handleSwitchOnline}
          disabled={!status.allMet || isLoading}
          isPending={isLoading}
        >
          {isLoading ? t('shops.goLive.switchingOnline') : t('shops.goLive.switchOnline')}
        </MyButton>
      </div>
    </Section>
  );
}
