import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('admin@clinic.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.access_token, res.user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h1 className="text-base font-medium leading-5 text-gray-900 text-center mb-4">
          Вход в систему
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-xs text-gray-700 bg-gray-100 px-2 py-1.5 rounded">{error}</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-gray-500">
          По умолчанию: admin@clinic.local / admin123
        </p>
      </div>
    </div>
  );
}
