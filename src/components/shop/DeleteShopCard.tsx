import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeleteShopMutation } from '../../services/api';
import { canDeleteShop, deleteShopErrorKind, isShopNameMatch } from '../../features/shops/deleteShop';
import type { DeleteShopErrorKind } from '../../features/shops/deleteShop';
import { MyCard } from '../ui/MyCard';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  shopId: string;
  shopName: string;
  callerRole: Parameters<typeof canDeleteShop>[0];
}

/** Danger card at the bottom of Shop Settings. Owner only. */
export function DeleteShopCard({ shopId, shopName, callerRole }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [deleteShop, { isLoading }] = useDeleteShopMutation();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [errorKind, setErrorKind] = useState<DeleteShopErrorKind | null>(null);

  if (!canDeleteShop(callerRole)) return null;

  const close = () => {
    if (isLoading) return;
    setOpen(false);
    setTyped('');
    setErrorKind(null);
  };

  const handleDelete = async () => {
    setErrorKind(null);
    try {
      await deleteShop({ shopId }).unwrap();
      toast.success(t('shops.deleteShop.deleted'));
      navigate('/shops');
    } catch (err) {
      setErrorKind(deleteShopErrorKind(err));
    }
  };

  return (
    <>
      <MyCard className="p-5 border-red-200">
        <h2 className="text-base font-semibold text-red-700">{t('shops.deleteShop.title')}</h2>
        <p className="text-sm text-gray-600 mt-2">{t('shops.deleteShop.explain')}</p>
        <div className="mt-4">
          <MyButton variant="danger" onClick={() => setOpen(true)}>
            {t('shops.deleteShop.open')}
          </MyButton>
        </div>
      </MyCard>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={close} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('shops.deleteShop.modalTitle')}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            >
              <h2 className="text-base font-semibold text-gray-900">{t('shops.deleteShop.modalTitle')}</h2>
              <p className="text-sm text-gray-600">{t('shops.deleteShop.explain')}</p>
              <MyInput
                label={t('shops.deleteShop.typeName', { name: shopName })}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={shopName}
                autoFocus
              />
              {errorKind === 'openOrders' && (
                <p className="text-sm text-red-600">
                  {t('shops.deleteShop.openOrders')}{' '}
                  <Link to={`/shops/${shopId}/orders`} className="underline">
                    {t('shops.deleteShop.goToOrders')}
                  </Link>
                </p>
              )}
              {errorKind === 'forbidden' && (
                <p className="text-sm text-red-600">{t('shops.deleteShop.forbidden')}</p>
              )}
              {errorKind === 'generic' && (
                <p className="text-sm text-red-600">{t('shops.deleteShop.failed')}</p>
              )}
              <div className="flex justify-end gap-2">
                <MyButton variant="secondary" onClick={close} disabled={isLoading}>
                  {t('shops.deleteShop.cancel')}
                </MyButton>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!isShopNameMatch(typed, shopName) || isLoading}
                  className="inline-flex items-center justify-center font-medium px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 border border-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('shops.deleteShop.deleting') : t('shops.deleteShop.confirm')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
