import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HeartPulse, Users, Plus, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function PalliativeCarePage() {
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
        api.get('/palliative-care', { params: { page, limit: 20 } }),
        api.get('/palliative-care/dashboard').catch(() => ({ data: {} })),
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
      await api.post('/palliative-care', {
        ...form,
        painScore: Number(form.painScore),
      });
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
        title="Palliative Care"
        subtitle="End-of-life care management"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
          >
            <Plus size={16} /> New Patient
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Patients" value={dashboard.total ?? 0} icon={HeartPulse} color="#0F766E" />
        <KpiCard label="Active Cases" value={dashboard.active ?? 0} icon={HeartPulse} color="#EF4444" />
        <KpiCard label="Pain Management" value={dashboard.painManagement ?? 0} icon={HeartPulse} color="#F59E0B" />
        <KpiCard label="Family Counseling" value={dashboard.familyCounseling ?? 0} icon={Users} color="#8B5CF6" />
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Patient Name', 'Diagnosis', 'Pain Score', 'Care Plan', 'Support Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
                : records.length === 0
                  ? <tr><td colSpan={7}><EmptyState icon={<HeartPulse size={36} />} title="No records yet" description="Palliative care records will appear here when created" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.patientName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">{r.diagnosis || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{r.painScore ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{r.carePlan || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.supportType || '—'}</td>
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
              <h3 className="font-semibold text-gray-800">New Palliative Care Patient</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Patient Name <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={form.patientName || ''} onChange={e => setForm({ ...form, patientName: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelCls}>Diagnosis <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={form.diagnosis || ''} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="Primary diagnosis" />
                </div>
                <div>
                  <label className={labelCls}>Pain Score (0–10) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} max={10} className={inputCls} value={form.painScore || ''} onChange={e => setForm({ ...form, painScore: e.target.value })} placeholder="0–10" />
                </div>
                <div>
                  <label className={labelCls}>Support Type</label>
                  <select className={inputCls} value={form.supportType || ''} onChange={e => setForm({ ...form, supportType: e.target.value })}>
                    <option value="">Select type</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="PSYCHOLOGICAL">Psychological</option>
                    <option value="SPIRITUAL">Spiritual</option>
                    <option value="SOCIAL">Social</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Primary Nurse</label>
                  <input type="text" className={inputCls} value={form.primaryNurse || ''} onChange={e => setForm({ ...form, primaryNurse: e.target.value })} placeholder="Nurse name" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Care Plan <span className="text-red-500">*</span></label>
                <textarea className={inputCls} rows={3} value={form.carePlan || ''} onChange={e => setForm({ ...form, carePlan: e.target.value })} placeholder="Describe the care plan" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea className={inputCls} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
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
