import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { StripeConnectInstance } from '@stripe/connect-js';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import {
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js';
import { useCreateStripeAccountSessionMutation } from '../../services/api';

interface Props {
  shopId: string;
  purpose?: 'onboarding' | 'management';
  onClose: () => void;
}

export function StripeOnboardingModal({ shopId, purpose = 'onboarding', onClose }: Props) {
  const { t } = useTranslation();
  const [createSession] = useCreateStripeAccountSessionMutation();

  const stripeConnectInstance = useMemo<StripeConnectInstance>(() => {
    return loadConnectAndInitialize({
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
      fetchClientSecret: async () => {
        const result = await createSession({ shopId, body: { purpose } }).unwrap();
        return result.clientSecret;
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, purpose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {t('shops.paymentsTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            {purpose === 'management' ? (
              <ConnectAccountManagement />
            ) : (
              <ConnectAccountOnboarding onExit={onClose} />
            )}
          </ConnectComponentsProvider>
        </div>
      </div>
    </div>
  );
}
