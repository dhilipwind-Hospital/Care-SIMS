import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Video, Clock, Play, CheckCircle, Trash2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function TelemedicinePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', doctorId: '', platform: 'IN_APP', scheduledAt: '', reason: '' });
  const [formError, setFormError] = useState('');

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/telemedicine/sessions'); setSessions(data.data || data || []); } catch (err) { toast.error('Failed to load telemedicine sessions'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.patientId.trim() || !form.doctorId.trim()) { setFormError('Patient ID and Doctor ID are required'); return; }
    if (!form.scheduledAt) { setFormError('Please select a scheduled date/time'); return; }
    setFormError('');
    try { await api.post('/telemedicine/sessions', form); toast.success('Teleconsult session scheduled'); setShowForm(false); setForm({ patientId: '', doctorId: '', platform: 'IN_APP', scheduledAt: '', reason: '' }); fetchData(); } catch (err) { toast.error('Failed to schedule session'); }
  };

  const startSession = async (id: string) => { try { await api.patch(`/telemedicine/sessions/${id}/start`); toast.success('Session started'); fetchData(); } catch (err) { toast.error('Failed to start session'); } };
  const endSession = async (id: string) => { try { await api.patch(`/telemedicine/sessions/${id}/end`); toast.success('Session ended'); fetchData(); } catch (err) { toast.error('Failed to end session'); } };
  const cancelSession = async (id: string) => { try { await api.patch(`/telemedicine/sessions/${id}/cancel`); toast.success('Session cancelled'); fetchData(); } catch (err) { toast.error('Failed to cancel session'); } };
  const handleDelete = async (id: string) => { if (!confirm('Delete this telemedicine session?')) return; try { await api.delete(`/telemedicine/sessions/${id}`); toast.success('Session deleted'); fetchData(); } catch (err) { toast.error('Failed to delete session'); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Telemedicine" subtitle="Virtual consultations and teleconsult sessions" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Sessions" value={sessions.length} icon={Video} color="#3B82F6" />
          <KpiCard label="Scheduled" value={sessions.filter(s => s.status === 'SCHEDULED').length} icon={Clock} color="#F59E0B" />
          <KpiCard label="In Progress" value={sessions.filter(s => s.status === 'IN_PROGRESS').length} icon={Play} color="#8B5CF6" />
          <KpiCard label="Completed" value={sessions.filter(s => s.status === 'COMPLETED').length} icon={CheckCircle} color="#10B981" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ New Session</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Schedule Teleconsult</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Patient ID *" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
            <input className="hms-input" placeholder="Doctor ID *" value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} />
            <select className="hms-input" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}><option value="IN_APP">In-App</option><option value="ZOOM">Zoom</option><option value="GOOGLE_MEET">Google Meet</option></select>
            <input className="hms-input" type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
            <input className="hms-input col-span-2" placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Schedule</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Session ID</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Doctor</th><th className="text-left p-3 font-medium text-gray-600">Platform</th><th className="text-left p-3 font-medium text-gray-600">Scheduled</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
      ) : sessions.length === 0 ? (
        <tr><td colSpan={7}><EmptyState icon={<Video size={24} className="text-gray-400" />} title="No teleconsult sessions" description="Schedule a session to get started" /></td></tr>
      ) : sessions.map(s => (
        <tr key={s.id} className="border-b hover:bg-gray-50">
          <td className="p-3 font-medium text-teal-700">{s.sessionId}</td>
          <td className="p-3">{s.patientId}</td><td className="p-3">{s.doctorId}</td>
          <td className="p-3">{s.platform}</td>
          <td className="p-3">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : '—'}</td>
          <td className="p-3"><StatusBadge status={s.status} /></td>
          <td className="p-3">
            <div className="flex gap-1.5">
              {s.status === 'SCHEDULED' && <>
                <button onClick={() => startSession(s.id)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Start</button>
                <button onClick={() => cancelSession(s.id)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">Cancel</button>
              </>}
              {s.status === 'IN_PROGRESS' && (
                <button onClick={() => endSession(s.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">End Session</button>
              )}
              <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete session"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
      ))}</tbody></table></div>
    </div>
  );
}
