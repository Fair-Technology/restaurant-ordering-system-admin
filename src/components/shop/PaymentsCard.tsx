import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Circle } from 'lucide-react';
import type { ShopResponse } from '../../services/api';
import {
  useLazyGetGoLiveStatusQuery,
  useDisconnectStripeAccountMutation,
} from '../../services/api';
import { MyCard } from '../ui/MyCard';
import { MyButton } from '../ui/MyButton';
import { StripeOnboardingModal } from './StripeOnboardingModal';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

export function PaymentsCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPurpose, setModalPurpose] = useState<'onboarding' | 'management'>('onboarding');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [fetchGoLiveStatus] = useLazyGetGoLiveStatusQuery();
  const [disconnectStripe, { isLoading: isDisconnecting }] = useDisconnectStripeAccountMutation();

  const status = shop.stripe?.connectOnboardingStatus ?? null;

  const handleClose = async () => {
    setModalOpen(false);
    // Sync live Stripe status into the DB before refetching the shop
    if (shop.id) {
      await fetchGoLiveStatus({ shopId: shop.id });
    }
    onRefetch();
  };

  const handleDisconnect = async () => {
    if (!shop.id) return;
    await disconnectStripe({ shopId: shop.id });
    setConfirmDisconnect(false);
    onRefetch();
  };

  const badge = (() => {
    if (status === 'complete') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <CheckCircle size={12} />
          {t('shops.paymentsComplete')}
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <AlertCircle size={12} />
          {t('shops.paymentsPending')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
        <Circle size={12} />
        {t('shops.paymentsNotConnected')}
      </span>
    );
  })();

  return (
    <>
      <MyCard className="p-6" id="payments">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{t('shops.paymentsTitle')}</h2>
          {badge}
        </div>

        <div className="flex flex-wrap gap-2">
          {status !== 'complete' && (
            <MyButton
              variant="primary"
              size="sm"
              onClick={() => {
                setModalPurpose('onboarding');
                setModalOpen(true);
              }}
            >
              {status === 'pending' ? t('shops.paymentsContinueSetup') : t('shops.paymentsSetup')}
            </MyButton>
          )}

          {status === 'complete' && (
            <MyButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setModalPurpose('management');
                setModalOpen(true);
              }}
            >
              {t('shops.paymentsEdit')}
            </MyButton>
          )}

          {(status === 'pending' || status === 'complete') && !confirmDisconnect && (
            <MyButton
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDisconnect(true)}
            >
              {t('shops.paymentsDisconnect')}
            </MyButton>
          )}
        </div>

        {confirmDisconnect && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <p className="mb-3 font-medium">{t('shops.paymentsDisconnectConfirm')}</p>
            <div className="flex gap-2">
              <MyButton
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? '…' : t('shops.paymentsDisconnectConfirmYes')}
              </MyButton>
              <MyButton
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDisconnect(false)}
                disabled={isDisconnecting}
              >
                {t('shops.paymentsDisconnectCancel')}
              </MyButton>
            </div>
          </div>
        )}

        <p className="mt-5 pt-5 border-t border-gray-200 text-sm text-gray-600">{t('shops.paymentsOnlineOnly')}</p>
      </MyCard>

      {modalOpen && (
        <StripeOnboardingModal shopId={shop.id!} purpose={modalPurpose} onClose={handleClose} />
      )}
    </>
  );
}
