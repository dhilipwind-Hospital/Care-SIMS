import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import { useSocket } from '../../context/SocketContext';
import api from '../../lib/api';

const PAGE_SIZE = 20;

const TYPE_ICONS: Record<string, string> = {
  QUEUE: '🔔', LAB_RESULT: '🧪', MEDICATION: '💊', APPOINTMENT: '📅',
  CRITICAL: '🚨', SYSTEM: '⚙️', BILLING: '💰',
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: 'border-l-red-500', NORMAL: 'border-l-gray-200', LOW: 'border-l-gray-100',
};

const ALL_TYPES = ['QUEUE', 'LAB_RESULT', 'MEDICATION', 'APPOINTMENT', 'CRITICAL', 'SYSTEM', 'BILLING'];

export default function NotificationsPage() {
  const { subscribe } = useSocket();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState<'' | 'unread' | 'read'>('');
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const [nRes, uRes] = await Promise.all([
        api.get('/notifications', { params: { limit: 200 } }),
        api.get('/notifications/unread-count'),
      ]);
      setNotifs(nRes.data.data || []);
      setUnread(uRes.data.count || 0);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const unsub = subscribe('notification:new', (notif: any) => {
      setNotifs(prev => [notif, ...prev]);
      setUnread(prev => prev + 1);
    });
    return unsub;
  }, [subscribe]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [typeFilter, readFilter]);

  const markRead = async (id: string) => {
    try { await api.patch(`/notifications/${id}/read`); loadData(); } catch { toast.error('Failed'); }
  };

  const markAllRead = async () => {
    try { await api.patch('/notifications/mark-all-read'); toast.success('All notifications marked as read'); loadData(); } catch { toast.error('Failed'); }
  };

  const filtered = notifs.filter(n => {
    if (typeFilter && n.type !== typeFilter) return false;
    if (readFilter === 'unread' && n.isRead) return false;
    if (readFilter === 'read' && !n.isRead) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Notifications" subtitle={`${unread} unread`}
        actions={
          unread > 0 ? (
            <button onClick={markAllRead} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
              <CheckCheck size={14} /> Mark all read
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {([['', 'All Types'], ...ALL_TYPES.map(t => [t, t.replace(/_/g, ' ')])]) .map(([v, l]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${typeFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
              {v && TYPE_ICONS[v] ? `${TYPE_ICONS[v]} ` : ''}{l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-2">
          {[['', 'All'], ['unread', 'Unread'], ['read', 'Read']].map(([v, l]) => (
            <button key={v} onClick={() => setReadFilter(v as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${readFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
              {l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="hms-card p-12 text-center text-gray-400">Loading…</div>
        ) : paginated.length === 0 ? (
          <div className="hms-card p-12 text-center">
            <Bell size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">{typeFilter || readFilter ? 'No notifications match the current filters' : 'No notifications'}</p>
          </div>
        ) : paginated.map(n => (
          <div key={n.id}
            className={`hms-card border-l-4 p-4 flex items-start gap-3 transition-all ${PRIORITY_COLOR[n.priority] || 'border-l-gray-200'} ${!n.isRead ? 'bg-teal-50/30' : ''}`}>
            <div className="text-2xl flex-shrink-0">{TYPE_ICONS[n.type] || '📢'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{n.title}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{n.message}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleString()}</span>
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)}
                      className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium whitespace-nowrap">
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {n.priority === 'HIGH' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">HIGH PRIORITY</span>}
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{(n.type || '').replace(/_/g, ' ')}</span>
                {!n.isRead && <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full"><span className="w-2 h-2 rounded-full bg-teal-500" />New</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}
