import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import EmptyState from '../../components/ui/EmptyState';
import { useSocket } from '../../context/SocketContext';
import api from '../../lib/api';

export default function OTLiveMonitorPage() {
  const { subscribe } = useSocket();
  const [otStatus, setOtStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const otStatusRef = useRef<any[]>([]);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ot/rooms/live-status');
      const items = data?.data || data || [];
      setOtStatus(items);
      otStatusRef.current = items;
    } catch (err) { console.error('Failed to load OT status:', err); toast.error('Failed to load OT status'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Real-time OT status updates
  useEffect(() => {
    const unsub = subscribe('ot:status:changed', () => { fetchStatus(); });
    return unsub;
  }, [subscribe, fetchStatus]);

  // Elapsed-time ticker: runs once and reads from ref to avoid restarting on otStatus change
  useEffect(() => {
    elapsedIntervalRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = { ...prev };
        otStatusRef.current.forEach(ot => {
          if (ot.status === 'IN_OPERATION' && ot.startTime) {
            next[ot.id] = Math.floor((Date.now() - new Date(ot.startTime).getTime()) / 1000);
          }
        });
        return next;
      });
    }, 1000);
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const statusConfig: Record<string, { bg: string; border: string; badge: string }> = {
    IN_OPERATION: { bg: '#FEE2E208', border: '#EF4444', badge: 'bg-red-100 text-red-700' },
    SETUP: { bg: '#FEF3C708', border: '#F59E0B', badge: 'bg-amber-100 text-amber-700' },
    AVAILABLE: { bg: '#D1FAE508', border: '#10B981', badge: 'bg-green-100 text-green-700' },
    CLEANING: { bg: '#FEF9C308', border: '#EAB308', badge: 'bg-yellow-100 text-yellow-700' },
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="OT Live Monitor" subtitle="Real-time Operation Theatre Status"
        actions={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
            </span>
            <button onClick={fetchStatus} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="hms-card p-12 text-center text-gray-400">Loading OT status…</div>
      ) : otStatus.length === 0 ? (
        <div className="hms-card">
          <EmptyState icon={<Activity size={40} />} title="No OT rooms found" description="Ensure the backend is running and OT rooms are configured" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otStatus.map(ot => {
            const cfg = statusConfig[ot.status] || statusConfig['AVAILABLE'];
            const elapsedSecs = elapsed[ot.id] || 0;
            const expectedSecs = (ot.currentBooking?.expectedDurationMins || 0) * 60;
            const progress = expectedSecs > 0 ? Math.min((elapsedSecs / expectedSecs) * 100, 100) : 0;
            const isOverrun = elapsedSecs > expectedSecs && expectedSecs > 0;

            return (
              <div key={ot.id} className="rounded-2xl border-2 overflow-hidden shadow-card" style={{ borderColor: cfg.border }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: cfg.bg }}>
                  <span className="font-bold text-gray-900 text-sm">{ot.name || ot.roomName}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${cfg.badge}`}>{ot.status?.replace('_', ' ')}</span>
                </div>

                <div className="bg-white p-5">
                  {ot.status === 'IN_OPERATION' && ot.currentBooking ? (
                    <>
                      <div className="space-y-2 text-sm mb-4">
                        <div><span className="text-gray-500">Patient:</span> <span className="font-semibold text-gray-900">{ot.currentBooking.patient?.firstName} {ot.currentBooking.patient?.lastName}</span></div>
                        <div><span className="text-gray-500">Procedure:</span> <span className="font-medium text-gray-700">{ot.currentBooking.procedureName}</span></div>
                        <div><span className="text-gray-500">Surgeon:</span> <span className="font-medium text-gray-700">Dr. {ot.currentBooking.primarySurgeon?.firstName} {ot.currentBooking.primarySurgeon?.lastName}</span></div>
                        <div><span className="text-gray-500">Anesthetist:</span> <span className="font-medium text-gray-700">{ot.currentBooking.anesthetist?.firstName || '—'}</span></div>
                        <div><span className="text-gray-500">Anesthesia:</span> <span className="font-medium text-gray-700">{ot.currentBooking.anesthesiaType || '—'}</span></div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500">Elapsed Time</span>
                          <span className={`text-lg font-mono font-bold ${isOverrun ? 'text-red-600' : 'text-teal-700'}`}>{formatTime(elapsedSecs)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: isOverrun ? '#EF4444' : 'linear-gradient(90deg,#0F766E,#14B8A6)' }} />
                        </div>
                        {isOverrun && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
                            <AlertTriangle size={11} /> Running over estimated time
                          </div>
                        )}
                      </div>

                      <button onClick={async () => { try { await api.patch(`/ot/bookings/${ot.currentBooking.id}/complete`, {}); toast.success('Surgery marked complete'); fetchStatus(); } catch (err) { console.error('Failed to complete surgery:', err); toast.error('Failed to complete surgery'); } }}
                        className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                        Mark Surgery Complete
                      </button>
                    </>
                  ) : ot.status === 'SETUP' && ot.nextBooking ? (
                    <>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="font-medium text-gray-700">Setting up for:</div>
                        <div><span className="text-gray-500">Patient:</span> <span className="font-semibold">{ot.nextBooking.patient?.firstName} {ot.nextBooking.patient?.lastName}</span></div>
                        <div><span className="text-gray-500">Procedure:</span> <span className="font-medium">{ot.nextBooking.procedureName}</span></div>
                        <div><span className="text-gray-500">Scheduled:</span> <span className="font-medium">{ot.nextBooking.scheduledStart || '—'}</span></div>
                      </div>
                      <button onClick={async () => { try { await api.patch(`/ot/bookings/${ot.nextBooking.id}/start`); toast.success('Surgery started'); fetchStatus(); } catch (err) { console.error('Failed to start surgery:', err); toast.error('Failed to start surgery'); } }}
                        className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                        Start Surgery
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                        <Activity size={22} className="text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">No procedure in progress</p>
                      {ot.nextBooking && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 text-left text-sm">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Next Scheduled</div>
                          <div className="font-medium text-gray-900">{ot.nextBooking.procedureName}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{ot.nextBooking.scheduledStart || '—'}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
