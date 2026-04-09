import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Users, RefreshCw, Clock, CheckCircle, Activity, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import ExportButton from '../../components/ui/ExportButton';
import { useSocket } from '../../context/SocketContext';
import api from '../../lib/api';

export default function QueueDashboard() {
  const navigate = useNavigate();
  const { subscribe } = useSocket();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/queue', { params: { limit: 50 } });
      setTokens(data.data || []);
    } catch (err) { console.error('Failed to load queue:', err); toast.error('Failed to load queue'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  // Real-time queue updates via WebSocket
  useEffect(() => {
    const unsub = subscribe('queue:updated', () => { fetchQueue(); });
    return unsub;
  }, [subscribe]);

  const waiting = useMemo(() => tokens.filter(t => t.status === 'WAITING').length, [tokens]);
  const inProgress = useMemo(() => tokens.filter(t => t.status === 'IN_PROGRESS').length, [tokens]);
  const completed = useMemo(() => tokens.filter(t => t.status === 'COMPLETED').length, [tokens]);

  const filtered = useMemo(() => tokens.filter(t =>
    !search || t.patient?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    t.tokenNumber?.toLowerCase().includes(search.toLowerCase())
  ), [tokens, search]);

  const [actionId, setActionId] = useState<string | null>(null);

  const callNext = async (id: string) => {
    setActionId(id);
    try {
      await api.patch(`/queue/${id}/status`, { status: 'CALLED' });
      toast.success('Patient called');
      fetchQueue();
    } catch (err) { toast.error('Failed to call patient'); }
    finally { setActionId(null); }
  };

  const complete = async (id: string) => {
    setActionId(id);
    try {
      await api.patch(`/queue/${id}/status`, { status: 'COMPLETED' });
      toast.success('Token completed');
      fetchQueue();
    } catch (err) { toast.error('Failed to complete token'); }
    finally { setActionId(null); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Queue Management" subtitle="Today's Patient Queue · Consultations"
        actions={
          <div className="flex gap-2">
            <ExportButton endpoint="/queue/export" params={{ q: search || undefined }} filename={`queue-${new Date().toISOString().slice(0, 10)}.csv`} />
            <button onClick={fetchQueue} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 font-medium">
              <RefreshCw size={14} /> Refresh Queue
            </button>
            <button
              onClick={() => navigate('/app/patients')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
            >
              <UserPlus size={14} /> Walk-in Registration
            </button>
          </div>
        }
      />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Today" value={tokens.length} icon={Users} color="#0F766E"
            sub={tokens.length > 0 ? `${tokens.length} patient${tokens.length > 1 ? 's' : ''} today` : 'No patients yet'} />
          <KpiCard label="Waiting" value={waiting} icon={Clock} color="#F59E0B"
            sub={waiting > 0 ? `${waiting} in queue` : 'Queue clear'} />
          <KpiCard label="In Progress" value={inProgress} icon={Activity} color="#3B82F6"
            sub={inProgress > 0 ? `${inProgress} with doctor` : 'None active'} />
          <KpiCard label="Completed" value={completed} icon={CheckCircle} color="#10B981"
            sub="Today total" />
        </div>
      )}

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Patient Queue</h3>
          <div className="flex gap-2 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patient…"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-44" />
            <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-600 bg-white">
              <option value="">All Statuses</option>
              <option value="WAITING">Waiting</option>
              <option value="CALLED">Called</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['TOKEN','PATIENT','DOCTOR','STATUS','WAIT TIME','ACTION'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <Clock size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No patients in queue</p>
                  <p className="text-xs text-gray-400 mt-1">Patients will appear when tokens are generated</p>
                </td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-sm font-bold text-teal-700">{t.tokenNumber}</td>
                  <td className="px-4 py-4 text-sm">
                    <div className="font-medium text-gray-900">{t.patient?.firstName} {t.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">
                      {t.patient?.dateOfBirth
                        ? `${new Date().getFullYear() - new Date(t.patient.dateOfBirth).getFullYear()} yrs`
                        : t.patient?.age ? `${t.patient.age} yrs` : ''
                      }
                      {t.patient?.gender ? ` • ${t.patient.gender === 'MALE' ? 'Male' : t.patient.gender === 'FEMALE' ? 'Female' : t.patient.gender}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {t.doctor ? `Dr. ${t.doctor.firstName || ''} ${t.doctor.lastName || ''}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={t.priorityLevel || t.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{t.waitMins ? `${t.waitMins} min` : '—'}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {t.status === 'WAITING' && (
                        <button onClick={() => callNext(t.id)} disabled={actionId === t.id}
                          className="text-xs px-3 py-1.5 rounded-full border border-teal-600 text-teal-700 hover:bg-teal-50 font-medium transition-all disabled:opacity-50">
                          {actionId === t.id ? 'Calling...' : 'Call'}
                        </button>
                      )}
                      {(t.status === 'CALLED' || t.status === 'IN_PROGRESS') && (
                        <button onClick={() => complete(t.id)} disabled={actionId === t.id}
                          className="text-xs px-3 py-1.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 font-medium transition-all disabled:opacity-50">
                          {actionId === t.id ? 'Completing...' : 'View'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Legend row matching .pen design */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-2">Status</span>
          {[
            { dot: 'bg-teal-500',   label: 'Checked-in' },
            { dot: 'bg-amber-500',  label: 'Triage'     },
            { dot: 'bg-gray-400',   label: 'Waiting'    },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-2">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
