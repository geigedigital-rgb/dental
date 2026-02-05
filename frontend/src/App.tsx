import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './shared/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { MaterialsPage } from './features/materials/MaterialsPage';
import { WarehousePage } from './features/warehouse/WarehousePage';
import { SuppliersPage } from './features/suppliers/SuppliersPage';
import { ServicesPage } from './features/services/ServicesPage';
import { SalesPage } from './features/sales/SalesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { LoginPage } from './features/auth/LoginPage';
import { useAuthStore } from './shared/store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#EDF6FE] p-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 max-w-md text-center">
            <p className="font-medium text-gray-900">Что-то пошло не так</p>
            <p className="mt-2 text-sm text-gray-600">Обновите страницу. Если ошибка повторится, откройте консоль браузера (F12) и проверьте сообщения.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-md bg-[#3882EC] text-white text-sm font-medium hover:opacity-90">
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
