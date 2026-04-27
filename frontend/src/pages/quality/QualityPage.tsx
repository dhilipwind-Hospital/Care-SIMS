import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, Plus, X, Loader2, Target } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function QualityPage() {
  const [tab, setTab] = useState<'indicators' | 'incidents'>('indicators');
  const [indicators, setIndicators] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [showIncForm, setShowIncForm] = useState(false);
  const [form, setForm] = useState({ indicatorCode: '', name: '', category: 'PATIENT_SAFETY', target: '', value: '', numerator: '', denominator: '' });
  const [incForm, setIncForm] = useState({ incidentType: 'NEAR_MISS', severity: 'MINOR', description: '', patientId: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([tab === 'indicators' ? api.get('/quality/indicators') : api.get('/quality/incidents', { params: { page, limit: 20 } }), api.get('/quality/dashboard')]); if (tab === 'indicators') setIndicators(list.data.data || list.data || []); else { setIncidents(list.data.data || []); setTotal(list.data.meta?.total || 0); } setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [tab, page]);

  const handleAddIndicator = async () => { if (!form.indicatorCode.trim() || !form.name.trim()) { toast.error('Code and name required'); return; } setSubmitting(true); try { await api.post('/quality/indicators', { ...form, target: form.target ? Number(form.target) : undefined, value: form.value ? Number(form.value) : undefined, numerator: form.numerator ? Number(form.numerator) : undefined, denominator: form.denominator ? Number(form.denominator) : undefined }); toast.success('Indicator added'); setShowForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };
  const handleReportIncident = async () => { if (!incForm.description.trim()) { toast.error('Description required'); return; } setSubmitting(true); try { await api.post('/quality/incidents', incForm); toast.success('Incident reported'); setShowIncForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };
  const handleResolve = async (id: string) => { try { await api.patch(`/quality/incidents/${id}`, { status: 'RESOLVED' }); toast.success('Resolved'); fetchData(); } catch { toast.error('Failed'); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Quality Management" subtitle="NABH indicators and incident tracking" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Indicators" value={dashboard.totalIndicators || 0} icon={Target} color="#0F766E" />
        <KpiCard label="Below Target" value={dashboard.belowTarget || 0} icon={AlertTriangle} color="#EF4444" />
        <KpiCard label="Open Incidents" value={dashboard.openIncidents || 0} icon={Shield} color="#F59E0B" />
        <KpiCard label="Total Incidents" value={dashboard.totalIncidents || 0} icon={Shield} color="#3B82F6" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">{[['indicators', 'Quality Indicators'], ['incidents', 'Incidents']].map(([v, l]) => (<button key={v} onClick={() => { setTab(v as any); setPage(1); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{l}</button>))}</div>
        <button onClick={() => tab === 'indicators' ? setShowForm(true) : setShowIncForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> {tab === 'indicators' ? 'Add Indicator' : 'Report Incident'}</button>
      </div>
      {tab === 'indicators' && (
        <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
          {['Code', 'Name', 'Category', 'Target', 'Actual', 'Status'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
        </tr></thead><tbody>
          {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
          : indicators.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<Target size={36} />} title="No indicators" /></td></tr>
          : indicators.map(ind => { const belowTarget = ind.target && ind.value && Number(ind.value) < Number(ind.target); return (
            <tr key={ind.id} className="hover:bg-gray-50 border-t border-gray-50">
              <td className="px-4 py-3 text-sm font-mono font-semibold text-teal-700">{ind.indicatorCode}</td>
              <td className="px-4 py-3 text-sm font-medium">{ind.name}</td>
              <td className="px-4 py-3"><StatusBadge status={ind.category} /></td>
              <td className="px-4 py-3 text-sm text-gray-600">{ind.target ? Number(ind.target).toFixed(1) : '—'}</td>
              <td className={`px-4 py-3 text-sm font-bold ${belowTarget ? 'text-red-600' : 'text-green-600'}`}>{ind.value ? Number(ind.value).toFixed(1) : '—'}</td>
              <td className="px-4 py-3">{belowTarget ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Below Target</span> : ind.value ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">On Target</span> : '—'}</td>
            </tr>); })}
        </tbody></table></div></div>
      )}
      {tab === 'incidents' && (
        <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
          {['Type', 'Severity', 'Description', 'Status', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
        </tr></thead><tbody>
          {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</>
          : incidents.length === 0 ? <tr><td colSpan={5}><EmptyState icon={<AlertTriangle size={36} />} title="No incidents" /></td></tr>
          : incidents.map(inc => (
            <tr key={inc.id} className="hover:bg-gray-50 border-t border-gray-50">
              <td className="px-4 py-3"><StatusBadge status={inc.incidentType} /></td>
              <td className="px-4 py-3"><StatusBadge status={inc.severity} /></td>
              <td className="px-4 py-3 text-sm max-w-[300px] truncate">{inc.description}</td>
              <td className="px-4 py-3"><StatusBadge status={inc.status} /></td>
              <td className="px-4 py-3">{inc.status === 'OPEN' && <button onClick={() => handleResolve(inc.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Resolve</button>}</td>
            </tr>))}
        </tbody></table></div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
      )}
      {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Add Quality Indicator</h2><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div><div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Code *</label><input className="hms-input w-full" placeholder="e.g. HAI_RATE" value={form.indicatorCode} onChange={e => setForm({ ...form, indicatorCode: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label><select className="hms-input w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['PATIENT_SAFETY', 'INFECTION_CONTROL', 'CLINICAL_OUTCOMES', 'OPERATIONAL'].map(c => <option key={c}>{c}</option>)}</select></div></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label><input className="hms-input w-full" placeholder="Hospital Acquired Infection Rate" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Target (%)</label><input type="number" className="hms-input w-full" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Current Value (%)</label><input type="number" className="hms-input w-full" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleAddIndicator} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Add</button></div></div></div>)}
      {showIncForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Report Quality Incident</h2><button onClick={() => setShowIncForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div><div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Type</label><select className="hms-input w-full" value={incForm.incidentType} onChange={e => setIncForm({ ...incForm, incidentType: e.target.value })}>{['NEAR_MISS', 'MEDICATION_ERROR', 'PATIENT_FALL', 'NEEDLE_STICK', 'SSI', 'HAI', 'SENTINEL'].map(t => <option key={t}>{t}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Severity</label><select className="hms-input w-full" value={incForm.severity} onChange={e => setIncForm({ ...incForm, severity: e.target.value })}>{['NEAR_MISS', 'MINOR', 'MODERATE', 'SEVERE', 'SENTINEL'].map(s => <option key={s}>{s}</option>)}</select></div></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label><textarea className="hms-input w-full" rows={3} value={incForm.description} onChange={e => setIncForm({ ...incForm, description: e.target.value })} /></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowIncForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleReportIncident} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Report</button></div></div></div>)}
    </div>
  );
}
