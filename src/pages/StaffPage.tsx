import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetShopByIdQuery,
  useListStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useResetStaffPasswordMutation,
  useDeleteStaffMutation,
} from '../services/api';
import type { StaffAccountDto, StaffRole } from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';

function serverErrorText(err: unknown): string {
  return (err as { data?: { error?: string } })?.data?.error ?? '';
}

// ── Add-login form ───────────────────────────────────────────────────────────

function AddStaffForm({ shopId, canGrantManager }: { shopId: string; canGrantManager: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [createStaff, { isLoading }] = useCreateStaffMutation();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createStaff({
        shopId,
        createStaffRequest: {
          username,
          password,
          role,
          displayName: displayName.trim() || null,
        },
      }).unwrap();
      toast.success(t('staff.title'));
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('staff');
    } catch (err) {
      setError(t('staff.saveFailed', { error: serverErrorText(err) }));
    }
  };

  return (
    <MyCard className="p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MyInput
            type="text"
            required
            label={t('staff.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <MyInput
            type="text"
            label={t('staff.displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <MyInput
            type="password"
            required
            label={t('staff.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('staff.role')}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
            >
              {canGrantManager && <option value="manager">{t('staff.roleManager')}</option>}
              <option value="staff">{t('staff.roleStaff')}</option>
            </select>
          </div>
        </div>
        <MyButton type="submit" disabled={isLoading} className="self-start">
          {t('staff.add')}
        </MyButton>
      </form>
    </MyCard>
  );
}

// ── Staff row ─────────────────────────────────────────────────────────────────

function StaffRow({ acc, shopId }: { acc: StaffAccountDto; shopId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateStaff] = useUpdateStaffMutation();
  const [resetStaffPassword] = useResetStaffPasswordMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  const [error, setError] = useState<string | null>(null);

  const handleToggleActive = async () => {
    setError(null);
    try {
      await updateStaff({
        shopId,
        staffId: acc.id,
        updateStaffRequest: { isActive: !acc.isActive },
      }).unwrap();
    } catch (err) {
      setError(t('staff.saveFailed', { error: serverErrorText(err) }));
    }
  };

  const handleResetPassword = async () => {
    const password = window.prompt(t('staff.password'));
    if (!password) return;
    setError(null);
    try {
      await resetStaffPassword({ shopId, staffId: acc.id, resetStaffPasswordRequest: { password } }).unwrap();
      toast.success(t('staff.resetPassword'));
    } catch (err) {
      setError(t('staff.saveFailed', { error: serverErrorText(err) }));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('staff.confirmDelete'))) return;
    setError(null);
    try {
      await deleteStaff({ shopId, staffId: acc.id }).unwrap();
    } catch (err) {
      setError(t('staff.saveFailed', { error: serverErrorText(err) }));
    }
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {acc.displayName ?? acc.username}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {acc.username} &middot; {acc.role === 'manager' ? t('staff.roleManager') : t('staff.roleStaff')}
          </p>
        </div>
        {acc.isLocked && (
          <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            {t('staff.locked')}
          </span>
        )}
        {!acc.isActive && (
          <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
            {t('staff.inactive')}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <MyButton variant="secondary" size="sm" onClick={handleResetPassword}>
            {t('staff.resetPassword')}
          </MyButton>
          <MyButton variant="secondary" size="sm" onClick={handleToggleActive}>
            {acc.isActive ? t('staff.deactivate') : t('staff.activate')}
          </MyButton>
          <MyButton variant="danger" size="sm" onClick={handleDelete}>
            {t('staff.delete')}
          </MyButton>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function StaffPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const { data, isLoading, isError } = useListStaffQuery({ shopId: shopId! });

  if (isLoading) return <MySpinner label={t('staff.title')} />;
  if (isError || !data) return <p className="text-red-500">{t('staff.loadError')}</p>;

  const canGrantManager = shop?.callerRole !== 'manager';
  const loginUrl = shop?.slug ? `${window.location.origin}/${shop.slug}/staff` : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{t('staff.title')}</h1>
        {data.limit !== null && data.limit !== -1 && (
          <span className="text-sm text-gray-500">
            {t('staff.usage', { count: data.activeCount, limit: data.limit })}
          </span>
        )}
      </div>

      {loginUrl && <p className="text-sm text-gray-500">{t('staff.loginUrl', { url: loginUrl })}</p>}

      {shopId && <AddStaffForm shopId={shopId} canGrantManager={canGrantManager} />}

      <MyCard>
        {data.staff.length === 0 ? (
          <p className="p-5 text-gray-400 text-sm">{t('staff.empty')}</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {data.staff.map((acc) => (
              <StaffRow key={acc.id} acc={acc} shopId={shopId!} />
            ))}
          </div>
        )}
      </MyCard>
    </div>
  );
}
