import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Clock, Activity, CheckCircle, Stethoscope } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DoctorQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/queue/doctor/${user?.sub}`, { params: { limit: 50 } });
      const result = data?.data ?? data;
      setTokens(Array.isArray(result) ? result : []);
    } catch (err) { toast.error('Failed to load queue'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { fetchQueue(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const waiting = tokens.filter(t => t.status === 'WAITING').length;
  const inProgress = tokens.filter(t => t.status === 'IN_PROGRESS').length;
  const completed = tokens.filter(t => t.status === 'COMPLETED').length;

  const [actionId, setActionId] = useState<string | null>(null);

  const startConsult = async (token: any) => {
    setActionId(token.id);
    try {
      await api.patch(`/queue/${token.id}/status`, { status: 'IN_PROGRESS' });
      navigate(`/app/doctor/consultation?patientId=${token.patientId}&tokenId=${token.id}`);
    } catch (err) { toast.error('Failed to start consultation'); fetchQueue(); }
    finally { setActionId(null); }
  };

  const markNoShow = async (id: string) => {
    setActionId(id);
    try {
      await api.patch(`/queue/${id}/no-show`);
      toast.success('Marked as no-show');
      fetchQueue();
    } catch (err) { toast.error('Failed to mark no-show'); }
    finally { setActionId(null); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="My Patient Queue" subtitle="Patients assigned to you today" />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="My Patients Today" value={tokens.length} icon={Users} color="#0F766E" />
          <KpiCard label="Waiting" value={waiting} icon={Clock} color="#F59E0B" />
          <KpiCard label="In Consultation" value={inProgress} icon={Activity} color="#3B82F6" />
          <KpiCard label="Completed" value={completed} icon={CheckCircle} color="#10B981" />
        </div>
      )}

      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Patient Queue</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Token','Patient','Age/Gender','Chief Complaint','Wait Time','Priority','Status','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              ) : tokens.length === 0 ? (
                <tr><td colSpan={8} className="p-0"><EmptyState title="No patients in queue" description="The queue is empty. Patients will appear here when checked in." /></td></tr>
              ) : tokens.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50 ${t.priorityLevel === 'EMERGENCY' ? 'bg-red-50/50' : t.priorityLevel === 'URGENT' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3 text-sm font-bold text-teal-700">
                    <div className="flex items-center gap-2">
                      {t.tokenNumber}
                      {t.priorityLevel === 'EMERGENCY' && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full leading-none">EMERGENCY</span>}
                      {t.priorityLevel === 'URGENT' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">URGENT</span>}
                      {(!t.priorityLevel || t.priorityLevel === 'ROUTINE' || t.priorityLevel === 'NORMAL') && <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">ROUTINE</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{t.patient?.firstName} {t.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">{t.patient?.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.patient?.age}y / {t.patient?.gender?.[0]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{t.chiefComplaint || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.waitMins ? `${t.waitMins}m` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.priorityLevel || 'NORMAL'} /></td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(t.status === 'WAITING' || t.status === 'IN_PROGRESS') && (
                        <button onClick={() => startConsult(t)} disabled={actionId === t.id}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium disabled:opacity-50">
                          <Stethoscope size={11} /> {actionId === t.id ? 'Starting...' : 'Consult'}
                        </button>
                      )}
                      {t.status === 'WAITING' && (
                        <button onClick={() => markNoShow(t.id)} disabled={actionId === t.id}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium disabled:opacity-50">
                          {actionId === t.id ? 'Marking...' : 'No-Show'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
