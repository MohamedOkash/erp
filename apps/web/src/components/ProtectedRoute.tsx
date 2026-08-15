import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center',
          padding: '2rem',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--status-danger-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--status-danger)',
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2>عذرًا! ليس لديك صلاحية للوصول</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px' }}>
          حسابك الحالي لا يمتلك الصلاحيات المطلوبة لعرض هذه الصفحة. يرجى التواصل مع مدير النظام.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
