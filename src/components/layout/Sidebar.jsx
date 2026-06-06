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
  ChartLineUp 
} from '@phosphor-icons/react';

export const Sidebar = () => {
  const { user } = useAuthStore();
  const role = user?.role || 'Admin'; // Defaulting to Admin for demonstration

  const allLinks = [
    { to: '/erp/dashboard', label: 'Dashboard', icon: <SquaresFour size={20} />, roles: ['Admin', 'Manager', 'Procurement Officer', 'Vendor'] },
    { to: '/erp/vendors', label: 'Vendors', icon: <Users size={20} />, roles: ['Admin', 'Manager'] },
    { to: '/erp/rfqs', label: 'RFQs', icon: <FileText size={20} />, roles: ['Admin', 'Procurement Officer', 'Vendor'] },
    { to: '/erp/quotations', label: 'Quotations', icon: <Files size={20} />, roles: ['Admin', 'Vendor', 'Procurement Officer'] },
    { to: '/erp/approvals', label: 'Approvals', icon: <CheckSquareOffset size={20} />, roles: ['Admin', 'Manager', 'Approver'] },
    { to: '/erp/orders', label: 'Purchase Orders', icon: <ShoppingCart size={20} />, roles: ['Admin', 'Manager', 'Procurement Officer'] },
    { to: '/erp/logs', label: 'Activity Logs', icon: <Receipt size={20} />, roles: ['Admin'] },
    { to: '/erp/reports', label: 'Reports', icon: <ChartLineUp size={20} />, roles: ['Admin', 'Manager'] },
  ];

  const visibleLinks = allLinks.filter(link => link.roles.includes(role));

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
    </aside>
  );
};
