import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, Users, Edit2, Trash2, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const DEPT_TYPE_COLOR: Record<string, string> = {
  CLINICAL: 'bg-blue-50 text-blue-700',
  ADMINISTRATIVE: 'bg-amber-50 text-amber-700',
  DIAGNOSTIC: 'bg-purple-50 text-purple-700',
  SUPPORT: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { name: '', code: '', type: 'CLINICAL' };

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Escape key to close modals
  useEscapeClose(showModal, () => setShowModal(false));
  useEscapeClose(!!deleteConfirm, () => setDeleteConfirm(null));

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/org/departments', { params: { limit: 200 } });
      setDepts(data.data || data || []);
    } catch (err) { toast.error('Failed to load departments'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDepts(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code, type: dept.type || 'CLINICAL' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError('Name and code are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/org/departments/${editing.id}`, form);
        toast.success('Department updated successfully');
      } else {
        await api.post('/org/departments', form);
        toast.success('Department created successfully');
      }
      setShowModal(false);
      fetchDepts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save department');
      toast.error(err.response?.data?.message || 'Failed to save department');
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async (dept: any) => {
    try {
      await api.put(`/org/departments/${dept.id}`, { isActive: !dept.isActive });
      toast.success(`Department ${dept.isActive ? 'deactivated' : 'activated'}`);
      fetchDepts();
    } catch (err) { toast.error('Failed to toggle department status'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/org/departments/${id}`);
      toast.success('Department deleted');
      setDeleteConfirm(null);
      fetchDepts();
    } catch (err) { toast.error('Failed to delete department'); }
  };

  const clinical = depts.filter(d => d.type === 'CLINICAL').length;
  const admin = depts.filter(d => d.type === 'ADMINISTRATIVE').length;
  const diagnostic = depts.filter(d => d.type === 'DIAGNOSTIC').length;
  const active = depts.filter(d => d.isActive).length;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Departments" subtitle="Manage hospital departments"
        actions={
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Add Department
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Departments" value={depts.length} icon={Building2} color="#0F766E" />
        <KpiCard label="Active" value={active} icon={Building2} color="#10B981" />
        <KpiCard label="Clinical" value={clinical} icon={Users} color="#3B82F6" />
        <KpiCard label="Administrative" value={admin + diagnostic} icon={Building2} color="#F59E0B" />
      </div>

      {/* Departments Table */}
      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">All Departments</h3>
          <p className="text-xs text-gray-400 mt-0.5">Manage clinical and administrative departments</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading departments…</div>
        ) : depts.length === 0 ? (
          <EmptyState
            icon={<Building2 size={40} />}
            title="No departments configured"
            description="Add your first department to get started"
            action={
              <button onClick={openAdd}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                <Plus size={14} /> Add Department
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Department', 'Code', 'Type', 'Staff', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {depts.slice((page - 1) * 20, page * 20).map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50 ${!d.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className={d.isActive ? 'text-teal-600' : 'text-gray-400'} />
                        <span className="font-semibold text-sm text-gray-900">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{d.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${DEPT_TYPE_COLOR[d.type] || 'bg-gray-100 text-gray-600'}`}>
                        {d.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d._count?.users || 0}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(d)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                          d.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={d.isActive ? 'Click to deactivate' : 'Click to activate'}>
                        {d.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {d.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(d)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium">
                          <Edit2 size={11} /> Edit
                        </button>
                        <button onClick={() => setDeleteConfirm(d.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={Math.ceil(depts.length / 20)} onPageChange={setPage} totalItems={depts.length} pageSize={20} />
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editing ? 'Edit Department' : 'Add Department'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editing ? `Editing: ${editing.name}` : 'Create a new department'}
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department Name <span className="text-red-500">*</span></label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cardiology"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code <span className="text-red-500">*</span></label>
                <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. CARD-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {['CLINICAL', 'ADMINISTRATIVE', 'DIAGNOSTIC', 'SUPPORT'].map(t => (
                    <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  <Save size={14} />
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Department?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will deactivate the department. Staff assigned to it will need to be reassigned.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold bg-red-500 hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
