import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, CheckCheck } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import { useSocket } from '../../context/SocketContext';
import api from '../../lib/api';

export default function NotificationsPage() {
  const { subscribe } = useSocket();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const [nRes, uRes] = await Promise.all([
        api.get('/notifications', { params: { limit: 50 } }),
        api.get('/notifications/unread-count'),
      ]);
      setNotifs(nRes.data.data || []);
      setUnread(uRes.data.count || 0);
    } catch (err) { console.error('Failed to load notifications:', err); toast.error('Failed to load notifications'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  // Real-time: prepend new notifications as they arrive
  useEffect(() => {
    const unsub = subscribe('notification:new', (notif: any) => {
      setNotifs(prev => [notif, ...prev]);
      setUnread(prev => prev + 1);
    });
    return unsub;
  }, [subscribe]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    fetch();
  };

  const markAllRead = async () => {
    await api.patch('/notifications/mark-all-read');
    fetch();
  };

  const typeIcon: Record<string, string> = {
    QUEUE: '🔔', LAB_RESULT: '🧪', MEDICATION: '💊', APPOINTMENT: '📅',
    CRITICAL: '🚨', SYSTEM: '⚙️', BILLING: '💰',
  };

  const priorityColor: Record<string, string> = {
    HIGH: 'border-l-red-500', NORMAL: 'border-l-gray-200', LOW: 'border-l-gray-100',
  };

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

      <div className="space-y-2">
        {loading ? (
          <div className="hms-card p-12 text-center text-gray-400">Loading…</div>
        ) : notifs.length === 0 ? (
          <div className="hms-card p-12 text-center">
            <Bell size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">No notifications</p>
          </div>
        ) : notifs.map(n => (
          <div key={n.id}
            className={`hms-card border-l-4 p-4 flex items-start gap-3 transition-all ${priorityColor[n.priority] || 'border-l-gray-200'} ${!n.isRead ? 'bg-teal-50/30' : ''}`}>
            <div className="text-2xl flex-shrink-0">{typeIcon[n.type] || '📢'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{n.title}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{n.message}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)}
                      className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {n.priority === 'HIGH' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">HIGH PRIORITY</span>}
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{n.type.replace(/_/g,' ')}</span>
                {!n.isRead && <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full" aria-label="Unread"><span className="w-2 h-2 rounded-full bg-teal-500" />New</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
