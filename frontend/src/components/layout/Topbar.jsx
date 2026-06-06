import { MagnifyingGlass, Bell, UserCircle } from '@phosphor-icons/react';
import { useAuthStore } from '../../store/authStore';

export const Topbar = () => {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10 w-full">
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center w-full h-12 rounded-lg focus-within:shadow-sm bg-gray-50 overflow-hidden border border-transparent focus-within:border-[var(--color-royal-blue)] transition-colors">
          <div className="grid place-items-center h-full w-12 text-gray-400">
            <MagnifyingGlass size={20} />
          </div>
          <input
            className="peer h-full w-full outline-none text-sm text-gray-700 pr-2 bg-transparent"
            type="text"
            id="search"
            placeholder="Search vendors, RFQs, POs..."
          />
        </div>
      </div>
      <div className="flex items-center gap-6 ml-4">
        <button className="relative p-2 text-gray-500 hover:text-[var(--color-royal-blue)] transition-colors">
          <Bell size={24} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[var(--color-eggplant)] rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-900">{user?.name || 'Jane Doe'}</p>
            <p className="text-xs text-gray-500">{user?.role || 'Admin'}</p>
          </div>
          <button onClick={logout} className="p-1 rounded-full text-gray-400 hover:text-[var(--color-eggplant)] transition-colors">
            <UserCircle size={36} weight="fill" />
          </button>
        </div>
      </div>
    </header>
  );
};
