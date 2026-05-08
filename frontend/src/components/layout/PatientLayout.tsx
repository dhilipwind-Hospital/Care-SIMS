import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FileText, Pill,
  FlaskConical, CreditCard, Activity, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import { clearAuth, getUser } from '../../lib/auth';
import SessionTimeoutWarning from '../ui/SessionTimeoutWarning';

const NAV = [
  { label: 'Dashboard',      icon: LayoutDashboard, path: '/app/patient/portal' },
  { label: 'Appointments',   icon: Calendar,        path: '/app/patient/appointments' },
  { label: 'Medical Records',icon: FileText,        path: '/app/patient/records' },
  { label: 'Prescriptions',  icon: Pill,            path: '/app/patient/prescriptions' },
  { label: 'Lab Reports',    icon: FlaskConical,    path: '/app/patient/lab' },
  { label: 'Billing',        icon: CreditCard,      path: '/app/patient/billing' },
  { label: 'Vitals',         icon: Activity,        path: '/app/patient/vitals' },
];

export default function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/patient/login', { replace: true });
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'P';

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFB' }}>
      {/* Top navigation bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo + hospital */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <span className="text-white font-black text-xs">A</span>
            </div>
            <span className="hidden sm:block text-sm font-bold text-gray-800 truncate max-w-[160px]">
              {user?.tenantName || 'Patient Portal'}
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}>
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: avatar + logout */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {initials}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{user?.firstName} {user?.lastName}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[160px]">{user?.tenantName}</div>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {NAV.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={active ? 'text-teal-600' : 'text-gray-400'} />
                      {item.label}
                    </div>
                    {active && <ChevronRight size={14} className="text-teal-400" />}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-gray-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Page content */}
      <main className="pt-14 max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <SessionTimeoutWarning />
    </div>
  );
}
