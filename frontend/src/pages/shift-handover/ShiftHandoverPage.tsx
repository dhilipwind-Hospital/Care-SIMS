import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, AlertTriangle, CheckCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

export default function ShiftHandoverPage() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shiftType: 'MORNING', shiftDate: new Date().toISOString().split('T')[0], handoverFromName: '', handoverToName: '', criticalAlerts: '', pendingTasks: '', medicationNotes: '', equipmentIssues: '', generalNotes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);

  const fetchHandovers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/shift-handover');
      setHandovers(data.data || data || []);
    } catch (err) { toast.error('Failed to load handover records'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchHandovers(); }, []);

  const drafts = handovers.filter(h => h.status === 'DRAFT').length;
  const pending = handovers.filter(h => h.status === 'SUBMITTED').length;
  const acknowledged = handovers.filter(h => h.status === 'ACKNOWLEDGED').length;

  const defaultForm = { shiftType: 'MORNING', shiftDate: new Date().toISOString().split('T')[0], handoverFromName: '', handoverToName: '', criticalAlerts: '', pendingTasks: '', medicationNotes: '', equipmentIssues: '', generalNotes: '' };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setFormError('');
  };

  const editRecord = (h: any) => {
    setForm({
      shiftType: h.shiftType || 'MORNING',
      shiftDate: h.shiftDate ? new Date(h.shiftDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      handoverFromName: h.handoverFromName || '',
      handoverToName: h.handoverToName || '',
      criticalAlerts: Array.isArray(h.criticalAlerts) ? h.criticalAlerts.join('\n') : (h.criticalAlerts || ''),
      pendingTasks: h.pendingTasks?.items ? h.pendingTasks.items.join('\n') : (typeof h.pendingTasks === 'string' ? h.pendingTasks : ''),
      medicationNotes: h.medicationNotes || '',
      equipmentIssues: h.equipmentIssues || '',
      generalNotes: h.generalNotes || '',
    });
    setEditingId(h.id);
    setShowForm(true);
    setFormError('');
  };

  const handleCreate = async () => {
    setFormError('');
    if (!form.shiftDate.trim()) { setFormError('Shift date is required.'); return; }
    if (!form.handoverFromName.trim()) { setFormError('Your name (outgoing nurse) is required.'); return; }
    if (!form.pendingTasks.trim() && !form.criticalAlerts.trim() && !form.generalNotes.trim()) {
      setFormError('Please provide at least some patient updates (critical alerts, pending tasks, or general notes).');
      return;
    }
    const payload = {
      ...form,
      criticalAlerts: form.criticalAlerts ? form.criticalAlerts.split('\n').filter(Boolean) : [],
      pendingTasks: form.pendingTasks ? { items: form.pendingTasks.split('\n').filter(Boolean) } : null,
    };
    try {
      if (editingId) {
        await api.patch(`/shift-handover/${editingId}`, payload);
        toast.success('Handover updated successfully');
      } else {
        await api.post('/shift-handover', payload);
        toast.success('Handover created successfully');
      }
      setShowForm(false);
      resetForm();
      fetchHandovers();
    } catch (err) { toast.error(editingId ? 'Failed to update handover' : 'Failed to create handover'); }
  };

  const handleSubmit = async (id: string) => {
    try {
      await api.patch(`/shift-handover/${id}`, { status: 'SUBMITTED' });
      toast.success('Handover submitted');
      fetchHandovers();
    } catch (err) { toast.error('Failed to submit handover'); }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await api.patch(`/shift-handover/${id}/acknowledge`);
      toast.success('Handover acknowledged');
      fetchHandovers();
    } catch (err) { toast.error('Failed to acknowledge handover'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft handover?')) return;
    try {
      await api.delete(`/shift-handover/${id}`);
      toast.success('Handover deleted');
      fetchHandovers();
    } catch (err) { toast.error('Failed to delete handover'); }
  };

  const shiftLabel = (s: string) => s === 'MORNING' ? 'Morning (6AM-2PM)' : s === 'AFTERNOON' ? 'Afternoon (2PM-10PM)' : 'Night (10PM-6AM)';
  const statusColor = (s: string) => s === 'ACKNOWLEDGED' ? 'bg-green-100 text-green-700' : s === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Shift Handover" subtitle="Manage shift transitions and handover notes" />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Handovers" value={handovers.length} icon={ClipboardList} color="#3B82F6" />
        <KpiCard label="Drafts" value={drafts} icon={Clock} color="#F59E0B" />
        <KpiCard label="Pending Ack." value={pending} icon={AlertTriangle} color="#EF4444" />
        <KpiCard label="Acknowledged" value={acknowledged} icon={CheckCircle} color="#10B981" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => { if (editingId) { resetForm(); setShowForm(true); } else { setShowForm(!showForm); } }} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>
          + New Handover
        </button>
      </div>

      {showForm && (
        <div className="hms-card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Handover' : 'New Handover'}</h3>
          {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" type="date" value={form.shiftDate} onChange={e => setForm({ ...form, shiftDate: e.target.value })} />
            <select className="hms-input" value={form.shiftType} onChange={e => setForm({ ...form, shiftType: e.target.value })}>
              <option value="MORNING">Morning (6AM - 2PM)</option>
              <option value="AFTERNOON">Afternoon (2PM - 10PM)</option>
              <option value="NIGHT">Night (10PM - 6AM)</option>
            </select>
            <input className="hms-input" placeholder="Your Name *" value={form.handoverFromName} onChange={e => setForm({ ...form, handoverFromName: e.target.value })} />
          </div>
          <textarea className="hms-input w-full" placeholder="Critical Alerts (one per line)" rows={3} value={form.criticalAlerts} onChange={e => setForm({ ...form, criticalAlerts: e.target.value })} />
          <textarea className="hms-input w-full" placeholder="Pending Tasks (one per line)" rows={3} value={form.pendingTasks} onChange={e => setForm({ ...form, pendingTasks: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <textarea className="hms-input" placeholder="Medication Notes" rows={2} value={form.medicationNotes} onChange={e => setForm({ ...form, medicationNotes: e.target.value })} />
            <textarea className="hms-input" placeholder="Equipment Issues" rows={2} value={form.equipmentIssues} onChange={e => setForm({ ...form, equipmentIssues: e.target.value })} />
          </div>
          <textarea className="hms-input w-full" placeholder="General Notes" rows={2} value={form.generalNotes} onChange={e => setForm({ ...form, generalNotes: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>{editingId ? 'Update Handover' : 'Create Draft'}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="hms-card p-12 text-center text-gray-400">Loading…</div>
        ) : handovers.length === 0 ? (
          <div className="hms-card"><EmptyState icon={<ClipboardList size={36} />} title="No handover records" description="Create a shift handover to begin documenting transitions" /></div>
        ) : handovers.slice((page - 1) * 20, page * 20).map(h => (
          <div key={h.id} className="hms-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{shiftLabel(h.shiftType)} — {new Date(h.shiftDate).toLocaleDateString()}</h4>
                <div className="text-sm text-gray-500">From: {h.handoverFromName} {h.handoverToName ? `→ To: ${h.handoverToName}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(h.status)}`}>{h.status}</span>
                {h.status === 'DRAFT' && <button onClick={() => editRecord(h)} className="text-sm text-gray-600 hover:text-blue-600" title="Edit"><Pencil size={15} /></button>}
                {h.status === 'DRAFT' && <button onClick={() => handleSubmit(h.id)} className="text-sm text-blue-600 hover:underline">Submit</button>}
                {h.status === 'DRAFT' && <button onClick={() => handleDelete(h.id)} className="text-sm text-red-500 hover:text-red-700" title="Delete draft"><Trash2 size={15} /></button>}
                {h.status === 'SUBMITTED' && <button onClick={() => handleAcknowledge(h.id)} className="text-sm text-green-600 hover:underline">Acknowledge</button>}
              </div>
            </div>
            {h.criticalAlerts?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-medium text-red-600">CRITICAL ALERTS:</span>
                <ul className="ml-4 text-sm text-red-700 list-disc">{h.criticalAlerts.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
            {h.generalNotes && <p className="text-sm text-gray-600">{h.generalNotes}</p>}
          </div>
        ))}
        {!loading && handovers.length > 0 && (
          <Pagination page={page} totalPages={Math.ceil(handovers.length / 20)} onPageChange={setPage} totalItems={handovers.length} pageSize={20} />
        )}
      </div>
    </div>
  );
}
