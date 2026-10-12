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
import { Plus } from 'lucide-react';
import { EmptyNote, PageHeader, Section } from '../components/layout/Page';
import { badgeClass, pillClass } from '../components/layout/pageStyles';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';

function serverErrorText(err: unknown): string {
  return (err as { data?: { error?: string } })?.data?.error ?? '';
}

// ── Add-login form ───────────────────────────────────────────────────────────

function AddStaffForm({ shopId, canGrantManager, onClose }: { shopId: string; canGrantManager: boolean; onClose?: () => void }) {
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
    <Section title={t('staff.add')} padded>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="rounded-xl border border-[#f5c2bd] bg-[#fdeceb] px-3.5 py-2.5 text-sm text-[#8f1c13]">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#4a413b]">{t('staff.role')}</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="h-[38px] w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none"
            >
              {canGrantManager && <option value="manager">{t('staff.roleManager')}</option>}
              <option value="staff">{t('staff.roleStaff')}</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <MyButton type="submit" disabled={isLoading}>
            {t('staff.add')}
          </MyButton>
          {onClose && (
            <MyButton type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </MyButton>
          )}
        </div>
      </form>
    </Section>
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

  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const password = newPassword;
    if (!password) return;
    setError(null);
    setResetting(true);
    try {
      await resetStaffPassword({ shopId, staffId: acc.id, resetStaffPasswordRequest: { password } }).unwrap();
      toast.success(t('staff.resetPassword'));
      setNewPassword('');
      setResetOpen(false);
    } catch (err) {
      setError(t('staff.saveFailed', { error: serverErrorText(err) }));
    } finally {
      setResetting(false);
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

  const name = acc.displayName ?? acc.username;
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';

  return (
    <div className="border-b border-line-soft last:border-b-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
            acc.isActive ? 'bg-ink text-white' : 'bg-sand text-[#8a7f77]'
          }`}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-bold">{name}</span>
            <span className={badgeClass.neutral}>{acc.role === 'manager' ? t('staff.roleManager') : t('staff.roleStaff')}</span>
            {acc.isLocked && <span className={badgeClass.warn}>{t('staff.locked')}</span>}
            {!acc.isActive && <span className={badgeClass.bad}>{t('staff.inactive')}</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-[#8a7f77]">{acc.username}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button
            type="button"
            aria-expanded={resetOpen}
            className={pillClass(false)}
            onClick={() => {
              setResetOpen((v) => !v);
              setNewPassword('');
            }}
          >
            {t('staff.resetPassword')}
          </button>
          <button type="button" className={pillClass(false)} onClick={handleToggleActive}>
            {acc.isActive ? t('staff.deactivate') : t('staff.activate')}
          </button>
          <button
            type="button"
            className="h-[34px] rounded-full border border-[#f5c2bd] bg-white px-3.5 text-[13px] font-bold whitespace-nowrap text-[#b42318] hover:bg-[#fdeceb]"
            onClick={handleDelete}
          >
            {t('staff.delete')}
          </button>
        </div>
      </div>
      {resetOpen && (
        <form onSubmit={handleResetPassword} className="flex flex-wrap items-end gap-2 bg-cream px-4 py-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <MyInput
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              label={t('staff.newPassword', { name })}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={resetting || !newPassword} className={pillClass(true)}>
            {t('staff.savePassword')}
          </button>
          <button type="button" className={pillClass(false)} onClick={() => setResetOpen(false)}>
            {t('common.cancel')}
          </button>
        </form>
      )}
      {error && <p role="alert" className="px-4 pb-3 text-xs text-[#b42318]">{error}</p>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function StaffPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const { data, isLoading, isError } = useListStaffQuery({ shopId: shopId! });
  // null: open the form only while there are no logins yet
  const [showForm, setShowForm] = useState<boolean | null>(null);

  if (isLoading) return <MySpinner label={t('staff.title')} />;
  if (isError || !data) return <p className="text-sm text-[#b42318]">{t('staff.loadError')}</p>;

  const canGrantManager = shop?.callerRole !== 'manager';
  const loginUrl = shop?.slug ? `${window.location.origin}/${shop.slug}/staff` : '';
  const formOpen = showForm ?? data.staff.length === 0;

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.group.business')}
        title={t('staff.title')}
        count={
          data.limit !== null && data.limit !== -1
            ? t('staff.usage', { count: data.activeCount, limit: data.limit })
            : t('staff.count', { count: data.staff.length })
        }
        description={loginUrl ? t('staff.loginUrl', { url: loginUrl }) : undefined}
        actions={
          !formOpen && (
            <MyButton type="button" onClick={() => setShowForm(true)} className="gap-1.5">
              <Plus size={16} aria-hidden="true" />
              {t('staff.add')}
            </MyButton>
          )
        }
      />

      {shopId && formOpen && (
        <div className="max-w-3xl">
          <AddStaffForm
            shopId={shopId}
            canGrantManager={canGrantManager}
            onClose={data.staff.length > 0 ? () => setShowForm(false) : undefined}
          />
        </div>
      )}

      <Section title={t('staff.listTitle')} count={data.staff.length}>
        {data.staff.length === 0 ? (
          <EmptyNote>{t('staff.empty')}</EmptyNote>
        ) : (
          data.staff.map((acc) => <StaffRow key={acc.id} acc={acc} shopId={shopId!} />)
        )}
      </Section>
    </div>
  );
}
