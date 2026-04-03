import { useEffect, useState } from 'react';
import { Sparkles, Clock, CheckCircle, AlertTriangle, User, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const emptyForm = { roomOrArea: '', taskType: 'CLEANING', priority: 'NORMAL', description: '', requestedByName: '' };

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [tasksRes, dashRes] = await Promise.all([
        api.get('/housekeeping'),
        api.get('/housekeeping/dashboard'),
      ]);
      setTasks(tasksRes.data.data || tasksRes.data || []);
      setStats(dashRes.data);
    } catch (err) { toast.error('Failed to load housekeeping tasks'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setFormError('');
  };

  const editRecord = (t: any) => {
    setForm({
      roomOrArea: t.roomOrArea || '',
      taskType: t.taskType || 'CLEANING',
      priority: t.priority || 'NORMAL',
      description: t.description || '',
      requestedByName: t.requestedByName || '',
    });
    setEditingId(t.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.roomOrArea.trim()) { setFormError('Room/Area is required.'); return; }
    if (!form.taskType) { setFormError('Task type is required.'); return; }
    if (!form.priority) { setFormError('Priority is required.'); return; }
    try {
      if (editingId) {
        await api.patch(`/housekeeping/${editingId}`, form);
        toast.success('Housekeeping task updated');
      } else {
        await api.post('/housekeeping', form);
        toast.success('Housekeeping task created');
      }
      resetForm();
      fetchTasks();
    } catch (err) { toast.error(editingId ? 'Failed to update task' : 'Failed to create task'); }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await api.patch(`/housekeeping/${id}/${action}`);
      toast.success(`Task ${action}ed successfully`);
      fetchTasks();
    } catch (err) { toast.error(`Failed to ${action} task`); }
  };

  const handleAssign = async () => {
    if (!assignModal || !assigneeName.trim()) return;
    try {
      await api.patch(`/housekeeping/${assignModal}/assign`, { assignedToName: assigneeName.trim() });
      toast.success('Task assigned successfully');
      fetchTasks();
    } catch (err) { toast.error('Failed to assign task'); }
    finally { setAssignModal(null); setAssigneeName(''); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete this housekeeping task?')) return; try { await api.delete(`/housekeeping/${id}`); toast.success('Task deleted'); fetchTasks(); } catch (err) { toast.error('Failed to delete task'); } };

  const priorityColor = (p: string) => p === 'URGENT' ? 'text-red-600 bg-red-50' : p === 'HIGH' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 bg-gray-50';
  const statusColor = (s: string) => {
    switch (s) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'VERIFIED': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Housekeeping" subtitle="Manage cleaning and maintenance tasks" />

      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="Pending" value={stats.pending || 0} icon={Clock} color="#F59E0B" />
        <KpiCard label="Assigned" value={stats.assigned || 0} icon={User} color="#3B82F6" />
        <KpiCard label="In Progress" value={stats.inProgress || 0} icon={Sparkles} color="#8B5CF6" />
        <KpiCard label="Completed" value={stats.completed || 0} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Verified" value={stats.verified || 0} icon={AlertTriangle} color="#0F766E" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => { if (showForm && !editingId) { resetForm(); } else { setEditingId(null); setForm({ ...emptyForm }); setFormError(''); setShowForm(true); } }} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>
          + New Task
        </button>
      </div>

      {showForm && (
        <div className="hms-card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Housekeeping Task' : 'Create Housekeeping Task'}</h3>
          {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Room/Area *" value={form.roomOrArea} onChange={e => setForm({ ...form, roomOrArea: e.target.value })} />
            <select className="hms-input" value={form.taskType} onChange={e => setForm({ ...form, taskType: e.target.value })}>
              <option value="CLEANING">Cleaning</option>
              <option value="SANITIZATION">Sanitization</option>
              <option value="LAUNDRY">Laundry</option>
              <option value="WASTE_DISPOSAL">Waste Disposal</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="BED_PREPARATION">Bed Preparation</option>
              <option value="TERMINAL_CLEANING">Terminal Cleaning</option>
            </select>
            <select className="hms-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <textarea className="hms-input w-full" placeholder="Description" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>{editingId ? 'Update' : 'Create'}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="hms-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--surface)' }}>
              <th className="text-left p-3 font-medium text-gray-600">Area</th>
              <th className="text-left p-3 font-medium text-gray-600">Type</th>
              <th className="text-left p-3 font-medium text-gray-600">Priority</th>
              <th className="text-left p-3 font-medium text-gray-600">Assigned To</th>
              <th className="text-left p-3 font-medium text-gray-600">Status</th>
              <th className="text-left p-3 font-medium text-gray-600">Created</th>
              <th className="text-left p-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={<Sparkles size={24} className="text-gray-400" />} title="No housekeeping tasks" description="Create a task to manage cleaning and maintenance" /></td></tr>
            ) : tasks.slice((page - 1) * 20, page * 20).map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{t.roomOrArea || '—'}</td>
                <td className="p-3">{t.taskType?.replace(/_/g, ' ')}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${priorityColor(t.priority)}`}>{t.priority}</span></td>
                <td className="p-3">{t.assignedToName || '—'}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(t.status)}`}>{t.status?.replace(/_/g, ' ')}</span></td>
                <td className="p-3">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex gap-1.5 items-center">
                    {(t.status === 'PENDING' || t.status === 'ASSIGNED') && (
                      <button onClick={() => editRecord(t)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium" title="Edit task"><Pencil size={13} className="inline mr-0.5" />Edit</button>
                    )}
                    {t.status === 'PENDING' && <button onClick={() => { setAssignModal(t.id); setAssigneeName(''); }} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium">Assign</button>}
                    {t.status === 'ASSIGNED' && <button onClick={() => handleAction(t.id, 'start')} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">Start</button>}
                    {t.status === 'IN_PROGRESS' && <button onClick={() => handleAction(t.id, 'complete')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Complete</button>}
                    {t.status === 'COMPLETED' && <button onClick={() => handleAction(t.id, 'verify')} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Verify</button>}
                    <button onClick={() => handleDelete(t.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete task"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(tasks.length / 20)} onPageChange={setPage} totalItems={tasks.length} pageSize={20} />
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Assign Task</h3>
            <input className="w-full border rounded-lg p-2 mb-4" value={assigneeName} onChange={e => setAssigneeName(e.target.value)} placeholder="Assignee name *" autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setAssignModal(null); setAssigneeName(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAssign} disabled={!assigneeName.trim()} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
