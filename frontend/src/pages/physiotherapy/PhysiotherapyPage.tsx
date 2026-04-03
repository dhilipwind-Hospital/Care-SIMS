import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Dumbbell, Clock, Activity, CheckCircle, Eye, X, Trash2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function PhysiotherapyPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', doctorId: '', diagnosis: '', treatmentPlan: '', frequency: '', totalSessions: '10', startDate: '' });
  const [formError, setFormError] = useState('');
  const [sessionsModal, setSessionsModal] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/physiotherapy/orders'); setOrders(data.data || data || []); } catch (err) { toast.error('Failed to load physiotherapy orders'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.patientId.trim() || !form.doctorId.trim()) { setFormError('Patient ID and Doctor ID are required'); return; }
    if (!form.diagnosis.trim()) { setFormError('Diagnosis is required'); return; }
    if (!form.treatmentPlan.trim()) { setFormError('Treatment plan is required'); return; }
    setFormError('');
    try { await api.post('/physiotherapy/orders', { ...form, totalSessions: Number(form.totalSessions) }); toast.success('Physiotherapy order created'); setShowForm(false); setForm({ patientId: '', doctorId: '', diagnosis: '', treatmentPlan: '', frequency: '', totalSessions: '10', startDate: '' }); fetchData(); } catch (err) { toast.error('Failed to create physiotherapy order'); }
  };

  const addSession = async (orderId: string) => {
    try { await api.post(`/physiotherapy/orders/${orderId}/sessions`, { notes: 'Session completed' }); toast.success('Session recorded'); fetchData(); } catch (err) { toast.error('Failed to record session'); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete this physiotherapy order?')) return; try { await api.delete(`/physiotherapy/orders/${id}`); toast.success('Physiotherapy order deleted'); fetchData(); } catch (err) { toast.error('Failed to delete physiotherapy order'); } };

  const viewSessions = async (orderId: string, orderNumber: string) => {
    setSessionsModal({ orderId, orderNumber });
    setSessionsLoading(true);
    setSessions([]);
    try {
      const { data } = await api.get(`/physiotherapy/orders/${orderId}/sessions`);
      setSessions(data.data || data || []);
    } catch (err) { console.error('Failed to load sessions:', err); toast.error('Failed to load sessions'); } finally { setSessionsLoading(false); }
  };

  const active = orders.filter(o => o.status === 'ACTIVE').length;
  const completed = orders.filter(o => o.status === 'COMPLETED').length;
  const totalSessions = orders.reduce((s: number, o: any) => s + (o.completedSessions || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Physiotherapy" subtitle="Manage physiotherapy orders and sessions" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Active Orders" value={active} icon={Dumbbell} color="#3B82F6" />
          <KpiCard label="Total Sessions" value={totalSessions} icon={Activity} color="#8B5CF6" />
          <KpiCard label="Completed" value={completed} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Pending" value={orders.filter(o => o.status === 'ACTIVE' && o.completedSessions < o.totalSessions).length} icon={Clock} color="#F59E0B" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ New Order</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">New PT Order</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Patient ID *" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
            <input className="hms-input" placeholder="Doctor ID *" value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} />
            <input className="hms-input" placeholder="Diagnosis *" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
            <input className="hms-input" placeholder="Treatment Plan *" value={form.treatmentPlan} onChange={e => setForm({ ...form, treatmentPlan: e.target.value })} />
            <input className="hms-input" placeholder="Frequency (e.g. 3x/week)" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} />
            <input className="hms-input" type="number" placeholder="Total Sessions" value={form.totalSessions} onChange={e => setForm({ ...form, totalSessions: e.target.value })} />
            <input className="hms-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Create</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Order #</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Diagnosis</th><th className="text-left p-3 font-medium text-gray-600">Frequency</th><th className="text-left p-3 font-medium text-gray-600">Progress</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
      ) : orders.length === 0 ? (
        <tr><td colSpan={7}><EmptyState icon={<Dumbbell size={24} className="text-gray-400" />} title="No physiotherapy orders" description="Create an order to start tracking sessions" /></td></tr>
      ) : orders.map(o => (
        <tr key={o.id} className="border-b hover:bg-gray-50">
          <td className="p-3 font-medium text-teal-700">{o.orderNumber}</td>
          <td className="p-3">{o.patientId}</td><td className="p-3">{o.diagnosis}</td>
          <td className="p-3">{o.frequency}</td>
          <td className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, ((o.completedSessions || 0) / (o.totalSessions || 1)) * 100)}%` }} />
              </div>
              <span className="text-xs text-gray-500">{o.completedSessions}/{o.totalSessions}</span>
            </div>
          </td>
          <td className="p-3"><StatusBadge status={o.status} /></td>
          <td className="p-3">
            <div className="flex gap-1.5">
              <button onClick={() => viewSessions(o.id, o.orderNumber)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium inline-flex items-center gap-1"><Eye size={12} />Sessions</button>
              {o.status === 'ACTIVE' && o.completedSessions < o.totalSessions && (
                <button onClick={() => addSession(o.id)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">+ Session</button>
              )}
              <button onClick={() => handleDelete(o.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete order"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
      ))}</tbody></table></div>

      {/* Sessions Modal */}
      {sessionsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSessionsModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Session History</h3>
                <p className="text-xs text-gray-500 mt-0.5">Order {sessionsModal.orderNumber}</p>
              </div>
              <button onClick={() => setSessionsModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
                  <th className="text-left p-3 font-medium text-gray-600">#</th>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Treatment</th>
                  <th className="text-left p-3 font-medium text-gray-600">Pain (Before/After)</th>
                  <th className="text-left p-3 font-medium text-gray-600">Response</th>
                  <th className="text-left p-3 font-medium text-gray-600">Notes</th>
                </tr></thead>
                <tbody>
                  {sessionsLoading ? (
                    <>{Array.from({ length: 3 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                  ) : sessions.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No sessions recorded yet</td></tr>
                  ) : sessions.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-teal-700">{s.sessionNumber}</td>
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : '—'}</td>
                      <td className="p-3 max-w-[180px] truncate">{s.treatmentGiven || '—'}</td>
                      <td className="p-3">
                        {s.painBefore != null || s.painAfter != null ? (
                          <span className="text-xs">
                            <span className="text-red-600 font-medium">{s.painBefore ?? '—'}</span>
                            {' / '}
                            <span className="text-green-600 font-medium">{s.painAfter ?? '—'}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-xs max-w-[140px] truncate">{s.patientResponse || '—'}</td>
                      <td className="p-3 text-xs text-gray-500 max-w-[140px] truncate">{s.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
