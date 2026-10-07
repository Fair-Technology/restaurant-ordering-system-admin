import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStaffLoginMutation } from '../services/api';
import { useDispatch } from 'react-redux';
import { readStaffSession } from '../features/staff/staffSession';
import { startStaffSession } from '../features/staff/startStaffSession';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';

export function StaffLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [staffLogin, { isLoading }] = useStaffLoginMutation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const existingSession = readStaffSession();
  if (existingSession && existingSession.shopSlug === slug) {
    return <Navigate to={`/shops/${existingSession.shopId}/orders`} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await staffLogin({
        staffLoginRequest: { shopSlug: slug ?? '', username, password },
      }).unwrap();
      startStaffSession(dispatch, result);
      navigate(`/shops/${result.shopId}/orders`, { replace: true });
    } catch (err) {
      const code = (err as { data?: { error?: string } })?.data?.error;
      setError(
        code === 'ACCOUNT_LOCKED'
          ? t('staffLogin.locked')
          : code === 'SEAT_SUSPENDED'
            ? t('staffLogin.seatSuspended')
            : t('staffLogin.failed'),
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <MyCard className="p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-gray-900">{t('staffLogin.title')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <MyInput
              type="text"
              autoComplete="username"
              required
              label={t('staff.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <MyInput
              type="password"
              autoComplete="current-password"
              required
              label={t('staff.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <MyButton type="submit" className="w-full" disabled={isLoading}>
              {t('staffLogin.submit')}
            </MyButton>
          </form>
        </MyCard>
      </div>
    </div>
  );
}
