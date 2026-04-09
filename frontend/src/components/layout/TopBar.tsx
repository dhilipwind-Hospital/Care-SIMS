import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/I18nContext';
import { LANGUAGE_OPTIONS, type Language } from '../../lib/i18n';
import api from '../../lib/api';
import Breadcrumb from '../ui/Breadcrumb';

interface Props { title: string; subtitle?: string; actions?: React.ReactNode; }

export default function TopBar({ title, subtitle, actions }: Props) {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const isPlatform = user?.role === 'PLATFORM_OWNER' || user?.role === 'PLATFORM_ADMIN';
  const brandName = isPlatform ? 'Ayphen HMS' : (user?.tenantName || 'Hospital');

  useEffect(() => {
    document.title = `${title} · ${brandName}`;
  }, [title, brandName]);

  useEffect(() => {
    let mounted = true;
    api.get('/notifications', { params: { unreadOnly: true, limit: 1 } })
      .then(({ data }) => {
        if (!mounted) return;
        const count = data?.totalCount ?? data?.total ?? (Array.isArray(data?.data) ? data.data.length : 0);
        setUnreadCount(count);
      })
      .catch((err) => { console.error('Failed to fetch notification count:', err); });
    return () => { mounted = false; };
  }, []);

  // Real-time notification count updates
  useEffect(() => {
    const unsub = subscribe('notification:count', (data: { count: number }) => {
      setUnreadCount(data.count);
    });
    return unsub;
  }, [subscribe]);

  return (
    <div className="space-y-1">
      <Breadcrumb />
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(prev => !prev)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLangMenuOpen(prev => !prev); } }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors text-sm font-medium"
            aria-label="Change language"
            aria-expanded={langMenuOpen}
            aria-haspopup="listbox"
            title="Change language"
          >
            <Globe size={16} aria-hidden="true" />
            <span>{LANGUAGE_OPTIONS.find(l => l.code === language)?.nativeLabel}</span>
          </button>
          {langMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
              <div role="listbox" aria-label="Language options" className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px]">
                {LANGUAGE_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    role="option"
                    aria-selected={language === opt.code}
                    onClick={() => { setLanguage(opt.code as Language); setLangMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                      language === opt.code
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.nativeLabel}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <button
          onClick={() => navigate('/app/notifications')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          title="Notifications"
        >
          <Bell size={18} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/app/profile')}
          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-teal-300 transition-all cursor-pointer"
          role="img"
          aria-label={`${user?.firstName} ${user?.lastName} — My Profile`}
          title="My Profile"
        >
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </button>
      </div>
      </div>
    </div>
  );
}
