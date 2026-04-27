import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Baby, Plus, X, Loader2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function NicuPage() {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', gestationalWeeks: '', birthWeightGrams: '', apgar1min: '', apgar5min: '', diagnosis: '', feedType: 'BREAST', ventilatorSupport: 'NONE' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([api.get('/nicu', { params: { page, limit: 20 } }), api.get('/nicu/dashboard')]); setAdmissions(list.data.data || []); setTotal(list.data.meta?.total || 0); setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSubmit = async () => { if (!form.patientId) { toast.error('Patient ID required'); return; } setSubmitting(true); try { await api.post('/nicu', { ...form, gestationalWeeks: form.gestationalWeeks ? Number(form.gestationalWeeks) : undefined, birthWeightGrams: form.birthWeightGrams ? Number(form.birthWeightGrams) : undefined, apgar1min: form.apgar1min ? Number(form.apgar1min) : undefined, apgar5min: form.apgar5min ? Number(form.apgar5min) : undefined }); toast.success('NICU admission created'); setShowForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="NICU — Neonatal ICU" subtitle="Neonatal intensive care management" actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Admission</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active" value={dashboard.active || 0} icon={Baby} color="#EC4899" />
        <KpiCard label="Total" value={dashboard.total || 0} icon={Baby} color="#3B82F6" />
        <KpiCard label="Discharged" value={dashboard.discharged || 0} icon={Baby} color="#10B981" />
      </div>
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['Admitted', 'Gest. Weeks', 'Birth Wt', 'APGAR 1/5', 'Feed', 'Ventilator', 'Status'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
        : admissions.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<Baby size={36} />} title="No NICU admissions" /></td></tr>
        : admissions.map(a => (
          <tr key={a.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm">{formatDate(a.admissionDate)}</td>
            <td className="px-4 py-3 text-sm font-medium">{a.gestationalWeeks ? `${a.gestationalWeeks}w` : '—'}</td>
            <td className="px-4 py-3 text-sm font-medium">{a.birthWeightGrams ? `${a.birthWeightGrams}g` : '—'}</td>
            <td className="px-4 py-3 text-sm">{a.apgar1min ?? '—'}/{a.apgar5min ?? '—'}</td>
            <td className="px-4 py-3 text-xs">{a.feedType || '—'}</td>
            <td className="px-4 py-3"><StatusBadge status={a.ventilatorSupport || 'NONE'} /></td>
            <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
          </tr>))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
      {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">NICU Admission</h2><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div><div className="p-6 space-y-4">
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID *</label><input className="hms-input w-full" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Gest. Weeks</label><input type="number" className="hms-input w-full" value={form.gestationalWeeks} onChange={e => setForm({ ...form, gestationalWeeks: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Birth Wt (g)</label><input type="number" className="hms-input w-full" value={form.birthWeightGrams} onChange={e => setForm({ ...form, birthWeightGrams: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Feed Type</label><select className="hms-input w-full" value={form.feedType} onChange={e => setForm({ ...form, feedType: e.target.value })}>{['BREAST', 'FORMULA', 'NGT', 'TPN', 'MIXED'].map(t => <option key={t}>{t}</option>)}</select></div></div>
        <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 1m</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgar1min} onChange={e => setForm({ ...form, apgar1min: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 5m</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgar5min} onChange={e => setForm({ ...form, apgar5min: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Ventilator</label><select className="hms-input w-full" value={form.ventilatorSupport} onChange={e => setForm({ ...form, ventilatorSupport: e.target.value })}>{['NONE', 'CPAP', 'HFNC', 'MECHANICAL'].map(v => <option key={v}>{v}</option>)}</select></div></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Diagnosis</label><input className="hms-input w-full" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Admit</button></div></div></div>)}
    </div>
  );
}
