import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Plus, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function WorkOrdersPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/work-orders', { params: { page, limit: 20 } }),
        api.get('/work-orders/dashboard').catch(() => ({ data: {} })),
      ]);
      setRecords(list.data.data || list.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post('/work-orders', form);
      toast.success('Created successfully');
      setShowModal(false);
      setForm({});
      fetchData();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar
        title="Work Orders"
        subtitle="Maintenance request management"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
          >
            <Plus size={16} /> New Work Order
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Open" value={dashboard.open ?? 0} icon={Wrench} color="#F59E0B" />
        <KpiCard label="In Progress" value={dashboard.inProgress ?? 0} icon={Wrench} color="#3B82F6" />
        <KpiCard label="Completed" value={dashboard.completed ?? 0} icon={Wrench} color="#10B981" />
        <KpiCard label="Total" value={dashboard.total ?? 0} icon={Wrench} color="#0F766E" />
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['WO #', 'Date', 'Category', 'Location', 'Priority', 'Description', 'Assigned To', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)}</>
                : records.length === 0
                  ? <tr><td colSpan={9}><EmptyState icon={<Wrench size={36} />} title="No work orders" description="Work orders will appear here when created" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-teal-700">{r.workOrderNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.category || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.location || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.priority || '—'} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{r.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.assignedTo || r.assignedToName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status || '—'} /></td>
                      <td className="px-4 py-3">
                        <button className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">New Work Order</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Title <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Work order title" />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select category</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="HVAC">HVAC</option>
                    <option value="MEDICAL_EQUIPMENT">Medical Equipment</option>
                    <option value="HOUSEKEEPING">Housekeeping</option>
                    <option value="IT">IT</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select className={inputCls} value={form.priority || ''} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="">Select priority</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Location <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ward / room / floor" />
                </div>
                <div>
                  <label className={labelCls}>Assigned To</label>
                  <input type="text" className={inputCls} value={form.assignedTo || ''} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Staff ID or name" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description <span className="text-red-500">*</span></label>
                <textarea className={inputCls} rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
