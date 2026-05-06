import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HeartPulse, Users, Plus, X, CheckCircle, Pencil, Activity } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const SUPPORT_TYPES = ['MEDICAL', 'PSYCHOLOGICAL', 'SPIRITUAL', 'SOCIAL', 'COMBINED'];
const BLANK = { patientName: '', diagnosis: '', painScore: '', supportType: 'MEDICAL', primaryNurse: '', carePlan: '', notes: '', status: 'ACTIVE' };

const painColor = (score: number) => {
  if (score >= 8) return 'text-red-600 font-bold';
  if (score >= 5) return 'text-amber-600 font-semibold';
  return 'text-green-700';
};

export default function PalliativeCarePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [drawer, setDrawer] = useState<any>(null);
  const [actionId, setActionId] = useState<string | null>(null);

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

  const openNew = () => { setForm(BLANK); setEditMode(false); setSelected(null); setShowModal(true); };
  const openEdit = (r: any) => {
    setForm({ patientName: r.patientName || '', diagnosis: r.diagnosis || '', painScore: r.painScore ?? '', supportType: r.supportType || 'MEDICAL', primaryNurse: r.primaryNurse || '', carePlan: r.carePlan || '', notes: r.notes || '', status: r.status || 'ACTIVE' });
    setEditMode(true);
    setSelected(r);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.patientName?.trim() || !form.diagnosis?.trim()) { toast.error('Patient name and diagnosis are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, painScore: form.painScore !== '' ? Number(form.painScore) : undefined };
      if (editMode && selected) {
        await api.patch(`/palliative-care/${selected.id}`, payload);
        toast.success('Record updated');
      } else {
        await api.post('/palliative-care', payload);
        toast.success('Patient enrolled');
      }
      setShowModal(false);
      setSelected(null);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setActionId(id);
    try {
      await api.patch(`/palliative-care/${id}`, { status });
      toast.success(`Status → ${status}`);
      fetchData();
    } catch { toast.error('Failed'); }
    finally { setActionId(null); }
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar title="Palliative Care" subtitle="End-of-life care management"
        actions={
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={16} /> Enrol Patient
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Patients" value={dashboard.total ?? records.length} icon={HeartPulse} color="#0F766E" />
        <KpiCard label="Active Cases" value={dashboard.active ?? records.filter(r => r.status === 'ACTIVE').length} icon={Activity} color="#EF4444" />
        <KpiCard label="Pain ≥ 7" value={records.filter(r => Number(r.painScore) >= 7).length} icon={HeartPulse} color="#F59E0B" />
        <KpiCard label="Family Counseling" value={dashboard.familyCounseling ?? records.filter(r => r.supportType === 'PSYCHOLOGICAL' || r.supportType === 'COMBINED').length} icon={Users} color="#8B5CF6" />
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Patient', 'Diagnosis', 'Pain', 'Support', 'Nurse', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
                : records.length === 0
                  ? <tr><td colSpan={7}><EmptyState icon={<HeartPulse size={36} />} title="No records yet" description="Palliative care records will appear here when created" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className={`hover:bg-gray-50 border-t border-gray-50 cursor-pointer ${Number(r.painScore) >= 8 ? 'bg-red-50/30' : ''}`} onClick={() => setDrawer(r)}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.patientName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px]"><span className="truncate block" title={r.diagnosis}>{r.diagnosis || '—'}</span></td>
                      <td className="px-4 py-3 text-center">
                        {r.painScore != null ? (
                          <span className={`text-sm font-bold ${painColor(Number(r.painScore))}`}>{r.painScore}/10</span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">{r.supportType || '—'}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.primaryNurse || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status || 'ACTIVE'} /></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          {r.status === 'ACTIVE' && (
                            <button onClick={() => updateStatus(r.id, 'DISCHARGED')} disabled={actionId === r.id}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium disabled:opacity-50 flex items-center gap-1">
                              <CheckCircle size={11} /> Discharge
                            </button>
                          )}
                          <button onClick={() => openEdit(r)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1">
                            <Pencil size={11} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Detail Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-gray-900">{drawer.patientName}</h3>
                <p className="text-xs text-gray-400">{drawer.diagnosis}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Pain Score</div>
                  <div className={`text-2xl font-black ${painColor(Number(drawer.painScore))}`}>{drawer.painScore ?? '—'}<span className="text-sm font-normal text-gray-400">/10</span></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <StatusBadge status={drawer.status || 'ACTIVE'} />
                </div>
              </div>
              {[
                ['Support Type', drawer.supportType],
                ['Primary Nurse', drawer.primaryNurse],
              ].map(([label, val]) => val && (
                <div key={label as string}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
                  <div className="text-sm text-gray-800">{val}</div>
                </div>
              ))}
              {drawer.carePlan && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Care Plan</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{drawer.carePlan}</div>
                </div>
              )}
              {drawer.notes && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">{drawer.notes}</div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setDrawer(null); openEdit(drawer); }} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center justify-center gap-1">
                  <Pencil size={13} /> Edit
                </button>
                {drawer.status === 'ACTIVE' && (
                  <button onClick={() => { updateStatus(drawer.id, 'DISCHARGED'); setDrawer(null); }} className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                    Discharge
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editMode ? 'Edit Record' : 'Enrol Palliative Care Patient'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Patient Name *</label>
                  <input className={inp} value={form.patientName} onChange={e => setForm((f: any) => ({ ...f, patientName: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis *</label>
                  <input className={inp} value={form.diagnosis} onChange={e => setForm((f: any) => ({ ...f, diagnosis: e.target.value }))} placeholder="Primary diagnosis" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pain Score (0–10)</label>
                  <input type="number" min={0} max={10} className={inp} value={form.painScore} onChange={e => setForm((f: any) => ({ ...f, painScore: e.target.value }))} placeholder="0–10" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Support Type</label>
                  <select className={inp} value={form.supportType} onChange={e => setForm((f: any) => ({ ...f, supportType: e.target.value }))}>
                    {SUPPORT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Primary Nurse</label>
                  <input className={inp} value={form.primaryNurse} onChange={e => setForm((f: any) => ({ ...f, primaryNurse: e.target.value }))} placeholder="Nurse name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className={inp} value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                    {['ACTIVE', 'DISCHARGED', 'DECEASED', 'ON_HOLD'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Care Plan</label>
                  <textarea className={inp} rows={3} value={form.carePlan} onChange={e => setForm((f: any) => ({ ...f, carePlan: e.target.value }))} placeholder="Describe the care plan…" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea className={inp} rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {saving ? 'Saving...' : editMode ? 'Update' : 'Enrol Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
