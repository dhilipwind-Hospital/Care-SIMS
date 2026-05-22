import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Users, Clock, Activity, CheckCircle, Stethoscope,
  Search, RefreshCw, Bell,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PRIORITY_ORDER: Record<string, number> = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2, NORMAL: 2 };
const PRIORITY_STYLES: Record<string, string> = {
  EMERGENCY: 'bg-red-100 text-red-700',
  URGENT: 'bg-amber-100 text-amber-700',
  ROUTINE: 'bg-gray-100 text-gray-500',
  NORMAL: 'bg-gray-100 text-gray-500',
};

export default function DoctorQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const prevCountRef = useRef<number>(0);

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/queue/doctor/${user?.sub}`, { params: { limit: 100 } });
      // Backend returns { tokens, stats }; fall back to data.data / data array for older shapes.
      const result: any[] = Array.isArray(data?.tokens)
        ? data.tokens
        : Array.isArray(data?.data ?? data) ? (data?.data ?? data) : [];
      // Alert if new patients joined since last fetch
      if (prevCountRef.current > 0 && result.filter(t => t.status === 'WAITING').length > prevCountRef.current) {
        toast('New patient in queue', { icon: '🔔' });
      }
      prevCountRef.current = result.filter((t: any) => t.status === 'WAITING').length;
      // Sort: EMERGENCY first, then URGENT, then by token number.
      // Backend column is `priority`; older code expected `priorityLevel`.
      result.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority || a.priorityLevel] ?? 2;
        const pb = PRIORITY_ORDER[b.priority || b.priorityLevel] ?? 2;
        if (pa !== pb) return pa - pb;
        return (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0);
      });
      setTokens(result);
    } catch { if (!silent) toast.error('Failed to load queue'); }
    finally { if (!silent) setLoading(false); }
  }, [user?.sub]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    const interval = setInterval(() => fetchQueue(true), 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const startConsult = async (token: any) => {
    setActionId(token.id);
    try {
      // Backend uses 'IN_CONSULTATION' (sets consultStart automatically).
      await api.patch(`/queue/${token.id}/status`, { status: 'IN_CONSULTATION' });
      navigate(`/app/doctor/consultation?patientId=${token.patientId}&tokenId=${token.id}`);
    } catch { toast.error('Failed to start consultation'); fetchQueue(); }
    finally { setActionId(null); }
  };

  const markNoShow = async (id: string) => {
    setActionId(id);
    try {
      await api.patch(`/queue/${id}/no-show`);
      toast.success('Marked as no-show');
      fetchQueue(true);
    } catch { toast.error('Failed'); }
    finally { setActionId(null); }
  };

  const markComplete = async (id: string) => {
    setActionId(id);
    try {
      await api.patch(`/queue/${id}/status`, { status: 'COMPLETED' });
      toast.success('Consultation completed');
      fetchQueue(true);
    } catch { toast.error('Failed'); }
    finally { setActionId(null); }
  };

  // Treat both legacy 'IN_PROGRESS' and the schema's 'IN_CONSULTATION'/'CALLED' as "in consult".
  const isInConsult = (s: string) => s === 'IN_CONSULTATION' || s === 'IN_PROGRESS' || s === 'CALLED';
  const getPriority = (t: any) => (t.priority || t.priorityLevel || 'NORMAL') as string;

  const callNext = async () => {
    try {
      // locationId is required by the service's where clause; fall back to user.locationId.
      await api.post('/queue/call-next', { doctorId: user?.sub, locationId: (user as any)?.locationId });
      toast.success('Next patient called');
      fetchQueue(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg?.includes('No waiting')) toast('No waiting patients', { icon: 'ℹ️' });
      else toast.error('Failed to call next patient');
    }
  };

  const waiting = tokens.filter(t => t.status === 'WAITING');
  const inProgress = tokens.filter(t => isInConsult(t.status));
  const completed = tokens.filter(t => t.status === 'COMPLETED');

  const filteredTokens = tokens.filter(t => {
    if (statusFilter) {
      if (statusFilter === 'IN_CONSULTATION') {
        if (!isInConsult(t.status)) return false;
      } else if (t.status !== statusFilter) return false;
    }
    if (priorityFilter && getPriority(t) !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = `${t.patient?.firstName || ''} ${t.patient?.lastName || ''}`.toLowerCase();
      const pid = (t.patient?.patientId || '').toLowerCase();
      const cc = (t.chiefComplaint || '').toLowerCase();
      if (!name.includes(s) && !pid.includes(s) && !cc.includes(s)) return false;
    }
    return true;
  });

  const waitMins = (token: any) => {
    if (token.waitMins) return `${token.waitMins}m`;
    if (token.createdAt) {
      const mins = Math.floor((Date.now() - new Date(token.createdAt).getTime()) / 60000);
      return `${mins}m`;
    }
    return '—';
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="My Patient Queue" subtitle="Patients assigned to you today"
        actions={
          <div className="flex gap-2">
            <button onClick={callNext} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors">
              <Bell size={14} /> Call Next
            </button>
            <button onClick={() => fetchQueue()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-teal-600 transition-colors" title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        }
      />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="My Patients Today" value={tokens.length} icon={Users} color="#0F766E" />
          <KpiCard label="Waiting" value={waiting.length} icon={Clock} color="#F59E0B" />
          <KpiCard label="In Consultation" value={inProgress.length} icon={Activity} color="#3B82F6" />
          <KpiCard label="Completed" value={completed.length} icon={CheckCircle} color="#10B981" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, complaint..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex gap-2">
          {[['', 'All Status'], ['WAITING', 'Waiting'], ['IN_CONSULTATION', 'In Progress'], ['COMPLETED', 'Completed'], ['NO_SHOW', 'No Show']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {[['', 'All Priority'], ['EMERGENCY', '🚨 Emergency'], ['URGENT', '⚡ Urgent'], ['ROUTINE', 'Routine']].map(([v, l]) => (
            <button key={v} onClick={() => setPriorityFilter(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${priorityFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="hms-card">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">{filteredTokens.length} patients{search || statusFilter || priorityFilter ? ' (filtered)' : ''}</span>
          <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Token', 'Patient', 'Age/Gender', 'Chief Complaint', 'Wait Time', 'Priority', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)
              ) : filteredTokens.length === 0 ? (
                <tr><td colSpan={8} className="p-0">
                  <EmptyState title="No patients" description={search || statusFilter || priorityFilter ? 'No matches for current filters' : 'Queue is empty. Patients will appear when checked in.'} />
                </td></tr>
              ) : filteredTokens.map(t => {
                const pri = getPriority(t);
                const inConsult = isInConsult(t.status);
                const age = t.patient?.ageYears ?? t.patient?.age;
                return (
                <tr key={t.id} className={`hover:bg-gray-50 border-t border-gray-50 transition-colors ${pri === 'EMERGENCY' ? 'bg-red-50/60' : pri === 'URGENT' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-teal-700">{t.tokenNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{t.patient?.firstName} {t.patient?.lastName}</div>
                    <div className="text-xs text-gray-400 font-mono">{t.patient?.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {age ? `${age}y` : '—'} / {t.patient?.gender?.[0] || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px]">
                    <span className="truncate block" title={t.chiefComplaint}>{t.chiefComplaint || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {t.status === 'WAITING' ? <span className={parseInt(waitMins(t)) > 30 ? 'text-red-600 font-semibold' : ''}>{waitMins(t)}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${PRIORITY_STYLES[pri]}`}>
                      {pri === 'NORMAL' ? 'ROUTINE' : pri}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(t.status === 'WAITING' || inConsult) && (
                        <button onClick={() => startConsult(t)} disabled={actionId === t.id}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium disabled:opacity-50 whitespace-nowrap">
                          <Stethoscope size={11} /> {actionId === t.id ? '...' : 'Consult'}
                        </button>
                      )}
                      {t.status === 'WAITING' && (
                        <button onClick={() => markNoShow(t.id)} disabled={actionId === t.id}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium disabled:opacity-50">
                          No-Show
                        </button>
                      )}
                      {inConsult && (
                        <button onClick={() => markComplete(t.id)} disabled={actionId === t.id}
                          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium disabled:opacity-50 flex items-center gap-1">
                          <CheckCircle size={11} /> Done
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
