import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeleteShopMutation } from '../../services/api';
import { canDeleteShop, deleteShopErrorKind, isShopNameMatch } from '../../features/shops/deleteShop';
import type { DeleteShopErrorKind } from '../../features/shops/deleteShop';
import { Section } from '../layout/Page';
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
      <Section tone="danger" title={t('shops.deleteShop.title')} padded>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#4a413b]">{t('shops.deleteShop.explain')}</p>
          <MyButton variant="danger" className="flex-shrink-0 self-start sm:self-auto" onClick={() => setOpen(true)}>
            {t('shops.deleteShop.open')}
          </MyButton>
        </div>
      </Section>

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
              <h2 className="font-display text-xl font-semibold text-ink">{t('shops.deleteShop.modalTitle')}</h2>
              <p className="text-sm text-[#4a413b]">{t('shops.deleteShop.explain')}</p>
              <MyInput
                label={t('shops.deleteShop.typeName', { name: shopName })}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={shopName}
                autoFocus
              />
              {errorKind === 'openOrders' && (
                <p className="text-sm text-[#b42318]">
                  {t('shops.deleteShop.openOrders')}{' '}
                  <Link to={`/shops/${shopId}/orders`} className="underline">
                    {t('shops.deleteShop.goToOrders')}
                  </Link>
                </p>
              )}
              {errorKind === 'forbidden' && (
                <p className="text-sm text-[#b42318]">{t('shops.deleteShop.forbidden')}</p>
              )}
              {errorKind === 'generic' && (
                <p className="text-sm text-[#b42318]">{t('shops.deleteShop.failed')}</p>
              )}
              <div className="flex justify-end gap-2">
                <MyButton variant="secondary" onClick={close} disabled={isLoading}>
                  {t('shops.deleteShop.cancel')}
                </MyButton>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!isShopNameMatch(typed, shopName) || isLoading}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#b42318] bg-[#b42318] px-4 text-sm font-semibold text-white hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-40"
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
