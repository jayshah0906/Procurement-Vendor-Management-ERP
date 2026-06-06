import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  SquaresFour,
  Users,
  FileText,
  Files,
  CheckSquareOffset,
  ShoppingCart,
  Receipt,
  Invoice,
  ChartLineUp,
} from '@phosphor-icons/react';

// Exact role names as returned by the backend
const ROLES = {
  PROCUREMENT_MANAGER: 'Procurement Manager',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  VENDOR: 'Vendor',
  APPROVER: 'Approver',
};

export const Sidebar = () => {
  const { user } = useAuthStore();
  const role = user?.role || '';

  const allLinks = [
    {
      to: '/erp/dashboard',
      label: 'Dashboard',
      icon: <SquaresFour size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.VENDOR, ROLES.APPROVER],
    },
    {
      to: '/erp/vendors',
      label: 'Vendors',
      icon: <Users size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER],
    },
    {
      to: '/erp/rfqs',
      label: 'RFQs',
      icon: <FileText size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER],
    },
    {
      to: '/erp/quotations',
      label: 'Quotations',
      icon: <Files size={20} />,
      // Managers see the list; vendors are redirected via logic in the page
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.VENDOR],
    },
    {
      to: '/erp/compare',
      label: 'Compare Bids',
      icon: <ChartLineUp size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER],
    },
    {
      to: '/erp/approvals',
      label: 'Approvals',
      icon: <CheckSquareOffset size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.APPROVER],
    },
    {
      to: '/erp/orders',
      label: 'Purchase Orders',
      icon: <ShoppingCart size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER],
    },
    {
      to: '/erp/invoices',
      label: 'Invoices',
      icon: <Invoice size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.VENDOR],
    },
    {
      to: '/erp/reports',
      label: 'Reports',
      icon: <ChartLineUp size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER],
    },
    {
      to: '/erp/logs',
      label: 'Activity',
      icon: <Receipt size={20} />,
      roles: [ROLES.PROCUREMENT_MANAGER],
    },
  ];

  const visibleLinks = allLinks.filter((link) => link.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all h-full z-10 hidden md:flex">
      <div className="p-6 border-b border-gray-200">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-xl text-[var(--color-royal-blue)]">
          <span className="text-2xl">∞</span>
          VendorBridge
        </NavLink>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-pale-blue)] text-[var(--color-royal-blue)]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--color-royal-blue)]'
              }`
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Role badge at the bottom */}
      {role && (
        <div className="p-4 border-t border-gray-100">
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400 font-medium">Signed in as</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{role}</p>
          </div>
        </div>
      )}
    </aside>
  );
};
