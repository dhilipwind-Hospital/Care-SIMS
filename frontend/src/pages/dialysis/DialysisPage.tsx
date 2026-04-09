import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HeartPulse, Clock, Play, CheckCircle, Edit2, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

export default function DialysisPage() {
  const [tab, setTab] = useState<'sessions'|'machines'>('sessions');
  const [sessions, setSessions] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', doctorId: '', machineId: '', scheduledDate: '', scheduledTime: '', dialysisType: 'HEMODIALYSIS' });
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);

  // Machine edit state
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [machineForm, setMachineForm] = useState({ machineNumber: '', brand: '', model: '', serialNumber: '', status: 'AVAILABLE' });
  const [machineEditError, setMachineEditError] = useState('');
  const [machineEditSaving, setMachineEditSaving] = useState(false);

  const fetchData = async () => { setLoading(true); try { const [s, m, d] = await Promise.all([api.get('/dialysis/sessions'), api.get('/dialysis/machines'), api.get('/dialysis/dashboard')]); setSessions(s.data.data || s.data || []); setMachines(m.data.data || m.data || []); setDashboard(d.data.data || d.data || {}); } catch (err) { toast.error('Failed to load dialysis data'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.patientId.trim() || !form.doctorId.trim()) { setFormError('Patient ID and Doctor ID are required'); return; }
    if (!form.machineId) { setFormError('Please select a machine'); return; }
    if (!form.scheduledDate) { setFormError('Please select a date'); return; }
    setFormError('');
    try { await api.post('/dialysis/sessions', form); toast.success('Dialysis session scheduled'); setShowForm(false); setForm({ patientId: '', doctorId: '', machineId: '', scheduledDate: '', scheduledTime: '', dialysisType: 'HEMODIALYSIS' }); fetchData(); } catch (err) { toast.error('Failed to schedule session'); }
  };
  const startSession = async (id: string) => { try { await api.patch(`/dialysis/sessions/${id}/start`); toast.success('Session started'); fetchData(); } catch (err) { toast.error('Failed to start session'); } };
  const endSession = async (id: string) => { try { await api.patch(`/dialysis/sessions/${id}/end`, {}); toast.success('Session ended'); fetchData(); } catch (err) { toast.error('Failed to end session'); } };

  const openMachineEdit = (m: any) => {
    setEditingMachine(m);
    setMachineForm({ machineNumber: m.machineNumber || '', brand: m.brand || '', model: m.model || '', serialNumber: m.serialNumber || '', status: m.status || 'AVAILABLE' });
    setMachineEditError('');
  };

  const handleMachineEdit = async () => {
    if (!machineForm.machineNumber.trim()) { setMachineEditError('Machine number is required'); return; }
    setMachineEditSaving(true); setMachineEditError('');
    try {
      await api.patch(`/dialysis/machines/${editingMachine.id}`, machineForm);
      toast.success('Machine updated successfully');
      setEditingMachine(null);
      fetchData();
    } catch (err: any) { setMachineEditError(err.response?.data?.message || 'Failed to update machine'); toast.error('Failed to update machine'); }
    finally { setMachineEditSaving(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Dialysis" subtitle="Manage dialysis sessions and machines" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Today's Sessions" value={dashboard.todaySessions || 0} icon={HeartPulse} color="#3B82F6" />
          <KpiCard label="Machines Available" value={dashboard.available || 0} icon={CheckCircle} color="#10B981" />
          <KpiCard label="In Progress" value={dashboard.inProgress || 0} icon={Play} color="#8B5CF6" />
          <KpiCard label="Total Machines" value={dashboard.totalMachines || 0} icon={Clock} color="#F59E0B" />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => { setTab('sessions'); setPage(1); }} className={`px-4 py-2 rounded-lg font-medium ${tab === 'sessions' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'sessions' ? { background: 'var(--accent)' } : {}}>Sessions</button>
        <button onClick={() => { setTab('machines'); setPage(1); }} className={`px-4 py-2 rounded-lg font-medium ${tab === 'machines' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'machines' ? { background: 'var(--accent)' } : {}}>Machines</button>
        {tab === 'sessions' && <button onClick={() => setShowForm(!showForm)} className="ml-auto px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Schedule Session</button>}
      </div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Schedule Dialysis Session</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Patient ID *" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
            <input className="hms-input" placeholder="Doctor ID *" value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} />
            <select className="hms-input" value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })}><option value="">Select Machine *</option>{machines.filter(m => m.status === 'AVAILABLE').map(m => <option key={m.id} value={m.id}>{m.machineNumber}</option>)}</select>
            <input className="hms-input" type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
            <input className="hms-input" type="time" value={form.scheduledTime} onChange={e => setForm({ ...form, scheduledTime: e.target.value })} />
            <select className="hms-input" value={form.dialysisType} onChange={e => setForm({ ...form, dialysisType: e.target.value })}><option value="HEMODIALYSIS">Hemodialysis</option><option value="PERITONEAL">Peritoneal</option></select>
          </div><div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Schedule</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      {tab === 'sessions' && (
        <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Session #</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Machine</th><th className="text-left p-3 font-medium text-gray-600">Date</th><th className="text-left p-3 font-medium text-gray-600">Time</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
        <tbody>{loading ? (
          <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
        ) : sessions.length === 0 ? (
          <tr><td colSpan={7}><EmptyState icon={<HeartPulse size={24} className="text-gray-400" />} title="No dialysis sessions" description="Schedule a session to get started" /></td></tr>
        ) : sessions.slice((page - 1) * 20, page * 20).map(s => (
          <tr key={s.id} className="border-b hover:bg-gray-50">
            <td className="p-3 font-medium text-teal-700">{s.sessionNumber}</td>
            <td className="p-3">{s.patientId}</td>
            <td className="p-3">{s.machine?.machineNumber}</td>
            <td className="p-3">{new Date(s.scheduledDate).toLocaleDateString()}</td>
            <td className="p-3">{s.scheduledTime}</td>
            <td className="p-3"><StatusBadge status={s.status} /></td>
            <td className="p-3">
              <div className="flex gap-1.5">
                {s.status === 'SCHEDULED' && <button onClick={() => startSession(s.id)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Start</button>}
                {s.status === 'IN_PROGRESS' && <button onClick={() => endSession(s.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">End</button>}
              </div>
            </td>
          </tr>
        ))}</tbody></table>
        <Pagination page={page} totalPages={Math.ceil(sessions.length / 20)} onPageChange={setPage} totalItems={sessions.length} pageSize={20} />
        </div>
      )}
      {tab === 'machines' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{machines.length === 0 ? (
          <div className="col-span-4"><EmptyState icon={<HeartPulse size={24} className="text-gray-400" />} title="No machines registered" description="Dialysis machines will appear once configured" /></div>
        ) : machines.slice((page - 1) * 20, page * 20).map(m => (
          <div key={m.id} className={`hms-card p-4 border-l-4 ${m.status === 'AVAILABLE' ? 'border-l-green-500' : m.status === 'IN_USE' ? 'border-l-purple-500' : 'border-l-yellow-500'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold">{m.machineNumber}</div><div className="text-sm text-gray-500">{m.brand} {m.model}</div>
                {m.serialNumber && <div className="text-xs text-gray-400 mt-0.5">S/N: {m.serialNumber}</div>}
              </div>
              <button onClick={() => openMachineEdit(m)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-teal-600 transition-colors" title="Edit machine">
                <Edit2 size={13} />
              </button>
            </div>
            <div className="mt-2"><StatusBadge status={m.status} /></div>
          </div>
        ))}
        {machines.length > 0 && (
          <div className="col-span-4"><Pagination page={page} totalPages={Math.ceil(machines.length / 20)} onPageChange={setPage} totalItems={machines.length} pageSize={20} /></div>
        )}
        </div>
      )}

      {/* Machine Edit Modal */}
      {editingMachine && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Edit Machine</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editingMachine.machineNumber}</p>
              </div>
              <button onClick={() => setEditingMachine(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {machineEditError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{machineEditError}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Machine Number *</label>
                <input value={machineForm.machineNumber} onChange={e => setMachineForm(f => ({ ...f, machineNumber: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                  <input value={machineForm.brand} onChange={e => setMachineForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <input value={machineForm.model} onChange={e => setMachineForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
                <input value={machineForm.serialNumber} onChange={e => setMachineForm(f => ({ ...f, serialNumber: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={machineForm.status} onChange={e => setMachineForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_USE">In Use</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OUT_OF_ORDER">Out of Order</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setEditingMachine(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleMachineEdit} disabled={machineEditSaving}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {machineEditSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
