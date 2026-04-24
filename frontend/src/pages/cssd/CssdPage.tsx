import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Package, Plus, X, Loader2, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/format';

export default function CssdPage() {
  const [tab, setTab] = useState<'batches' | 'sets'>('batches');
  const [batches, setBatches] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});

  // Create batch form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ loadType: 'AUTOCLAVE', machineId: '', items: [{ instrumentName: '', instrumentSetId: '', departmentId: '' }] });
  const [submitting, setSubmitting] = useState(false);

  // Complete batch
  const [completeBatch, setCompleteBatch] = useState<any>(null);
  const [completeForm, setCompleteForm] = useState({ biologicalIndicator: 'PASS', chemicalIndicator: 'PASS' });

  // Create set form
  const [showSetForm, setShowSetForm] = useState(false);
  const [setForm2, setSetForm2] = useState({ setName: '', department: '', items: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        tab === 'batches' ? api.get('/cssd/batches', { params: { page, limit: 20 } }) : api.get('/cssd/instrument-sets'),
        api.get('/cssd/dashboard'),
      ]);
      if (tab === 'batches') { setBatches(list.data.data || []); setTotal(list.data.meta?.total || 0); }
      else { setSets(list.data.data || list.data || []); }
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load CSSD data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab, page]);

  const handleCreateBatch = async () => {
    const items = form.items.filter(i => i.instrumentName.trim());
    if (!items.length) { toast.error('Add at least one instrument'); return; }
    setSubmitting(true);
    try {
      await api.post('/cssd/batches', { loadType: form.loadType, machineId: form.machineId || undefined, items });
      toast.success('Batch created'); setShowForm(false); fetchData();
      setForm({ loadType: 'AUTOCLAVE', machineId: '', items: [{ instrumentName: '', instrumentSetId: '', departmentId: '' }] });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleStartBatch = async (id: string) => {
    try { await api.patch(`/cssd/batches/${id}/start`, { temperature: 134, pressure: 2.1, durationMins: 18 }); toast.success('Batch started'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const handleCompleteBatch = async () => {
    if (!completeBatch) return;
    try { await api.patch(`/cssd/batches/${completeBatch.id}/complete`, completeForm); toast.success('Batch completed'); setCompleteBatch(null); fetchData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCreateSet = async () => {
    if (!setForm2.setName.trim()) { toast.error('Set name required'); return; }
    setSubmitting(true);
    try {
      const items = setForm2.items ? setForm2.items.split(',').map(i => ({ name: i.trim(), quantity: 1 })).filter(i => i.name) : [];
      await api.post('/cssd/instrument-sets', { setName: setForm2.setName, department: setForm2.department, items });
      toast.success('Instrument set created'); setShowSetForm(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { instrumentName: '', instrumentSetId: '', departmentId: '' }] });

  return (
    <div className="p-6 space-y-6">
      <TopBar title="CSSD — Central Sterile Supply" subtitle="Sterilization batch management and instrument tracking" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Today's Batches" value={dashboard.todayBatches || 0} icon={Package} color="#0F766E" />
        <KpiCard label="Pending Items" value={dashboard.pendingItems || 0} icon={Shield} color="#F59E0B" />
        <KpiCard label="Sterilized Ready" value={dashboard.sterilizedItems || 0} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Failed Batches" value={dashboard.failedBatches || 0} icon={AlertTriangle} color="#EF4444" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {[['batches', 'Sterilization Batches'], ['sets', 'Instrument Sets']].map(([val, label]) => (
            <button key={val} onClick={() => { setTab(val as any); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => tab === 'batches' ? setShowForm(true) : setShowSetForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> {tab === 'batches' ? 'New Batch' : 'New Set'}
        </button>
      </div>

      {tab === 'batches' && (
        <div className="hms-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10"><tr>
                {['Batch #', 'Load Type', 'Items', 'BI', 'CI', 'Status', 'Created', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
              </tr></thead>
              <tbody>
                {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
                : batches.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<Package size={36} />} title="No batches" description="Create sterilization batches" /></td></tr>
                : batches.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 border-t border-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-teal-700">{b.batchNumber}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.loadType} /></td>
                    <td className="px-4 py-3 text-sm">{b.items?.length || 0}</td>
                    <td className="px-4 py-3">{b.biologicalIndicator ? <StatusBadge status={b.biologicalIndicator === 'PASS' ? 'COMPLETED' : 'CRITICAL'} label={b.biologicalIndicator} /> : '—'}</td>
                    <td className="px-4 py-3">{b.chemicalIndicator ? <StatusBadge status={b.chemicalIndicator === 'PASS' ? 'COMPLETED' : 'CRITICAL'} label={b.chemicalIndicator} /> : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {b.status === 'PENDING' && <button onClick={() => handleStartBatch(b.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium flex items-center gap-1"><ArrowRight size={11} /> Start</button>}
                        {b.status === 'IN_PROGRESS' && <button onClick={() => { setCompleteBatch(b); setCompleteForm({ biologicalIndicator: 'PASS', chemicalIndicator: 'PASS' }); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Complete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
        </div>
      )}

      {tab === 'sets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <div className="col-span-3 hms-card p-12 text-center text-gray-400">Loading...</div>
          : sets.length === 0 ? <div className="col-span-3 hms-card"><EmptyState icon={<Shield size={36} />} title="No instrument sets" description="Create instrument sets for tracking" /></div>
          : sets.map((s: any) => (
            <div key={s.id} className="hms-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{s.setName}</h4>
                <StatusBadge status={s.condition} />
              </div>
              <div className="text-sm text-gray-500 mb-2">{s.department || 'General'}</div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Total sterilizations: <span className="font-medium text-gray-700">{s.totalSterilizations}</span></div>
                {s.lastSterilizedAt && <div>Last sterilized: <span className="font-medium text-gray-700">{formatDateTime(s.lastSterilizedAt)}</span></div>}
                {s.items?.length > 0 && <div>Items: {(s.items as any[]).map((i: any) => i.name).join(', ')}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Batch Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">New Sterilization Batch</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Load Type *</label>
                  <select className="hms-input w-full" value={form.loadType} onChange={e => setForm({ ...form, loadType: e.target.value })}>{['AUTOCLAVE', 'ETO', 'PLASMA', 'CHEMICAL'].map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Machine ID</label>
                  <input className="hms-input w-full" placeholder="e.g. AC-001" value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Instruments *</label>
                  <button onClick={addItem} className="text-xs text-teal-600 hover:underline font-medium">+ Add item</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className="hms-input flex-1" placeholder="Instrument name" value={item.instrumentName}
                      onChange={e => { const items = [...form.items]; items[i].instrumentName = e.target.value; setForm({ ...form, items }); }} />
                    {form.items.length > 1 && <button onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500"><X size={14} /></button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleCreateBatch} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Create Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Batch Modal */}
      {completeBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Complete Batch {completeBatch.batchNumber}</h2>
            <p className="text-xs text-gray-400 mb-4">Record sterilization test results</p>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Biological Indicator (BI)</label>
                <select className="hms-input w-full" value={completeForm.biologicalIndicator} onChange={e => setCompleteForm({ ...completeForm, biologicalIndicator: e.target.value })}><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="PENDING">PENDING</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Chemical Indicator (CI)</label>
                <select className="hms-input w-full" value={completeForm.chemicalIndicator} onChange={e => setCompleteForm({ ...completeForm, chemicalIndicator: e.target.value })}><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="PENDING">PENDING</option></select></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setCompleteBatch(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleCompleteBatch} className="btn-primary px-4 py-2">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Set Modal */}
      {showSetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">New Instrument Set</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Set Name *</label><input className="hms-input w-full" placeholder="e.g. Appendectomy Set" value={setForm2.setName} onChange={e => setSetForm2({ ...setForm2, setName: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Department</label><input className="hms-input w-full" placeholder="e.g. Surgery" value={setForm2.department} onChange={e => setSetForm2({ ...setForm2, department: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Items (comma-separated)</label><textarea className="hms-input w-full" rows={2} placeholder="Scalpel, Forceps, Scissors, Retractor..." value={setForm2.items} onChange={e => setSetForm2({ ...setForm2, items: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowSetForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleCreateSet} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
