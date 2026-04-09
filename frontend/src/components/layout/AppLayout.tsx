import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import SessionTimeoutWarning from '../ui/SessionTimeoutWarning';
import CommandPalette from '../CommandPalette';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPlatform = user?.role === 'PLATFORM_OWNER' || user?.role === 'PLATFORM_ADMIN';
  const brandName = isPlatform ? 'Ayphen HMS' : (user?.tenantName || 'Hospital');

  return (
    <div className="flex h-screen" style={{ background: 'var(--hms-bg)' }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-[280px]">
        {/* Mobile header with hamburger */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{brandName}</span>
        </div>

        <main className="flex-1 overflow-y-auto" role="main">
          <Outlet />
        </main>
      </div>

      <SessionTimeoutWarning />
      <CommandPalette />
    </div>
  );
}
