import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Circle } from 'lucide-react';
import type { ShopResponse } from '../../services/api';
import {
  useLazyGetGoLiveStatusQuery,
  useDisconnectStripeAccountMutation,
} from '../../services/api';
import { Section } from '../layout/Page';
import { badgeClass } from '../layout/pageStyles';
import { MyButton } from '../ui/MyButton';
import { StripeOnboardingModal } from './StripeOnboardingModal';

const PENDING_RECHECK_MS = 30_000;

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

  // Sync live Stripe status into the DB before refetching the shop
  const syncStatus = useCallback(async () => {
    if (shop.id) {
      await fetchGoLiveStatus({ shopId: shop.id });
    }
    onRefetch();
  }, [shop.id, fetchGoLiveStatus, onRefetch]);

  const handleClose = async () => {
    setModalOpen(false);
    await syncStatus();
  };

  // Stripe often finishes verifying after the form is submitted — seconds in test mode, up to days
  // for real restaurants. While pending, keep checking so a page left open doesn't go on offering
  // "Continue setup" for an account that is already connected.
  useEffect(() => {
    if (status !== 'pending' || modalOpen) return;
    const interval = window.setInterval(() => void syncStatus(), PENDING_RECHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, modalOpen, syncStatus]);

  const handleDisconnect = async () => {
    if (!shop.id) return;
    await disconnectStripe({ shopId: shop.id });
    setConfirmDisconnect(false);
    onRefetch();
  };

  const badge = (() => {
    if (status === 'complete') {
      return (
        <span className={`inline-flex items-center gap-1 ${badgeClass.good}`}>
          <CheckCircle size={12} />
          {t('shops.paymentsComplete')}
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className={`inline-flex items-center gap-1 ${badgeClass.warn}`}>
          <AlertCircle size={12} />
          {t('shops.paymentsPending')}
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 ${badgeClass.neutral}`}>
        <Circle size={12} />
        {t('shops.paymentsNotConnected')}
      </span>
    );
  })();

  return (
    <>
      <Section
        id="payments"
        className="scroll-mt-[72px]! lg:scroll-mt-6!"
        title={t('shops.paymentsTitle')}
        actions={badge}
        description={t('shops.paymentsOnlineOnly')}
        padded
      >

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
          <div className="mt-4 rounded-xl border border-[#f5c2bd] bg-[#fdeceb] p-4 text-sm text-[#b42318]">
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
      </Section>

      {modalOpen && (
        <StripeOnboardingModal shopId={shop.id!} purpose={modalPurpose} onClose={handleClose} />
      )}
    </>
  );
}
