import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Exact role names as returned by the backend JWT payload
export const ROLES = {
  PROCUREMENT_MANAGER: 'Procurement Manager',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  VENDOR: 'Vendor',
  APPROVER: 'Approver',
};

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to dashboard if role is not permitted
    return <Navigate to="/erp/dashboard" replace />;
  }

  return <Outlet />;
};
