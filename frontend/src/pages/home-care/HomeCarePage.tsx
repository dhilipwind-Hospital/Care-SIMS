import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, Home, Plus, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function HomeCarePage() {
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
        api.get('/home-care', { params: { page, limit: 20 } }),
        api.get('/home-care/dashboard').catch(() => ({ data: {} })),
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
      await api.post('/home-care', form);
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
        title="Home Care"
        subtitle="Domiciliary visit management"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
          >
            <Plus size={16} /> New Visit
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Visits" value={dashboard.total ?? 0} icon={Activity} color="#0F766E" />
        <KpiCard label="Active Patients" value={dashboard.active ?? 0} icon={Home} color="#3B82F6" />
        <KpiCard label="Completed" value={dashboard.completed ?? 0} icon={Activity} color="#10B981" />
        <KpiCard label="Scheduled" value={dashboard.scheduled ?? 0} icon={Activity} color="#F59E0B" />
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Patient Name', 'Visit Date', 'Visit Type', 'Nurse', 'Address', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
                : records.length === 0
                  ? <tr><td colSpan={7}><EmptyState icon={<Home size={36} />} title="No visits yet" description="Home care visits will appear here when created" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.patientName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.visitDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.visitType || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.nurseName || r.nurseId || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{r.address || '—'}</td>
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
              <h3 className="font-semibold text-gray-800">New Home Care Visit</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Patient Name <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={form.patientName || ''} onChange={e => setForm({ ...form, patientName: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelCls}>Visit Date <span className="text-red-500">*</span></label>
                  <input type="date" className={inputCls} value={form.visitDate || ''} onChange={e => setForm({ ...form, visitDate: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Visit Type</label>
                  <select className={inputCls} value={form.visitType || ''} onChange={e => setForm({ ...form, visitType: e.target.value })}>
                    <option value="">Select type</option>
                    <option value="ROUTINE">Routine</option>
                    <option value="WOUND_CARE">Wound Care</option>
                    <option value="MEDICATION">Medication</option>
                    <option value="PHYSIOTHERAPY">Physiotherapy</option>
                    <option value="PALLIATIVE">Palliative</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nurse ID</label>
                  <input type="text" className={inputCls} value={form.nurseId || ''} onChange={e => setForm({ ...form, nurseId: e.target.value })} placeholder="Nurse ID" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Address <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Patient address" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea className={inputCls} rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
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
