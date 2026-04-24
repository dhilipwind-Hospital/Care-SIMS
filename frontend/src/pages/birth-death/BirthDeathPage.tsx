import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Baby, Skull, Plus, X, Loader2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function BirthDeathPage() {
  const [tab, setTab] = useState<'births' | 'deaths'>('births');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});

  // Birth form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ motherPatientId: '', fatherName: '', dateOfBirth: '', timeOfBirth: '', gender: 'MALE', weightGrams: '', deliveryType: 'NORMAL', apgarScore1min: '', apgarScore5min: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  // Death form
  const [showDeathForm, setShowDeathForm] = useState(false);
  const [deathForm, setDeathForm] = useState({ patientId: '', dateOfDeath: '', timeOfDeath: '', causeOfDeath: '', mannerOfDeath: 'NATURAL', postMortemRequired: false, notes: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get(`/vital-records/${tab}`, { params: { page, limit: 20 } }),
        api.get('/vital-records/dashboard'),
      ]);
      setRecords(list.data.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab, page]);

  const handleBirthSubmit = async () => {
    if (!form.motherPatientId || !form.dateOfBirth || !form.gender) { toast.error('Fill required fields'); return; }
    setSubmitting(true);
    try {
      const payload: any = { ...form };
      if (payload.weightGrams) payload.weightGrams = Number(payload.weightGrams);
      if (payload.apgarScore1min) payload.apgarScore1min = Number(payload.apgarScore1min);
      if (payload.apgarScore5min) payload.apgarScore5min = Number(payload.apgarScore5min);
      await api.post('/vital-records/births', payload);
      toast.success('Birth registered'); setShowForm(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDeathSubmit = async () => {
    if (!deathForm.patientId || !deathForm.dateOfDeath || !deathForm.causeOfDeath) { toast.error('Fill required fields'); return; }
    setSubmitting(true);
    try {
      await api.post('/vital-records/deaths', deathForm);
      toast.success('Death registered'); setShowDeathForm(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Birth & Death Registry" subtitle="Vital statistics registration" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Births" value={dashboard.totalBirths || 0} icon={Baby} color="#EC4899" />
        <KpiCard label="Total Deaths" value={dashboard.totalDeaths || 0} icon={Skull} color="#6B7280" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {[['births', 'Birth Registry'], ['deaths', 'Death Registry']].map(([val, label]) => (
            <button key={val} onClick={() => { setTab(val as any); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => tab === 'births' ? setShowForm(true) : setShowDeathForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Register {tab === 'births' ? 'Birth' : 'Death'}
        </button>
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {tab === 'births'
                  ? ['Date', 'Gender', 'Weight', 'Delivery', 'APGAR 1m', 'APGAR 5m', 'Birth Order', 'Cert Issued'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)
                  : ['Date', 'Cause of Death', 'Manner', 'ICD Code', 'PM Required', 'PM Done', 'Cert Issued'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)
                }
              </tr>
            </thead>
            <tbody>
              {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={tab === 'births' ? 8 : 7} />)}</>
              : records.length === 0 ? <tr><td colSpan={8}><EmptyState icon={tab === 'births' ? <Baby size={36} /> : <Skull size={36} />} title={`No ${tab} records`} description="Register records to see them here" /></td></tr>
              : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                  {tab === 'births' ? (<>
                    <td className="px-4 py-3 text-sm">{formatDate(r.dateOfBirth)}</td>
                    <td className="px-4 py-3 text-sm">{r.gender}</td>
                    <td className="px-4 py-3 text-sm">{r.weightGrams ? `${r.weightGrams}g` : '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.deliveryType}</td>
                    <td className="px-4 py-3 text-sm">{r.apgarScore1min ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.apgarScore5min ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.birthOrder}</td>
                    <td className="px-4 py-3 text-sm">{r.birthCertIssued ? '✅' : '—'}</td>
                  </>) : (<>
                    <td className="px-4 py-3 text-sm">{formatDate(r.dateOfDeath)}</td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">{r.causeOfDeath}</td>
                    <td className="px-4 py-3 text-sm">{r.mannerOfDeath}</td>
                    <td className="px-4 py-3 text-xs font-mono">{r.icdCode || '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.postMortemRequired ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm">{r.postMortemDone ? '✅' : '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.deathCertIssued ? '✅' : '—'}</td>
                  </>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Birth Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Register Birth</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Mother Patient ID *</label><input className="hms-input w-full" placeholder="Patient UUID" value={form.motherPatientId} onChange={e => setForm({ ...form, motherPatientId: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Father Name</label><input className="hms-input w-full" value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date of Birth *</label><input type="date" className="hms-input w-full" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Time</label><input type="time" className="hms-input w-full" value={form.timeOfBirth} onChange={e => setForm({ ...form, timeOfBirth: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Gender *</label><select className="hms-input w-full" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>MALE</option><option>FEMALE</option><option>AMBIGUOUS</option></select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Weight (g)</label><input type="number" className="hms-input w-full" placeholder="e.g. 3200" value={form.weightGrams} onChange={e => setForm({ ...form, weightGrams: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Delivery Type</label><select className="hms-input w-full" value={form.deliveryType} onChange={e => setForm({ ...form, deliveryType: e.target.value })}>{['NORMAL', 'LSCS', 'FORCEPS', 'VACUUM', 'BREECH'].map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 1 min</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgarScore1min} onChange={e => setForm({ ...form, apgarScore1min: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 5 min</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgarScore5min} onChange={e => setForm({ ...form, apgarScore5min: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><textarea className="hms-input w-full" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleBirthSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Register Birth
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Death Form Modal */}
      {showDeathForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Register Death</h2>
              <button onClick={() => setShowDeathForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID *</label><input className="hms-input w-full" placeholder="Patient UUID" value={deathForm.patientId} onChange={e => setDeathForm({ ...deathForm, patientId: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date of Death *</label><input type="date" className="hms-input w-full" value={deathForm.dateOfDeath} onChange={e => setDeathForm({ ...deathForm, dateOfDeath: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Time</label><input type="time" className="hms-input w-full" value={deathForm.timeOfDeath} onChange={e => setDeathForm({ ...deathForm, timeOfDeath: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Cause of Death *</label><textarea className="hms-input w-full" rows={2} value={deathForm.causeOfDeath} onChange={e => setDeathForm({ ...deathForm, causeOfDeath: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Manner</label><select className="hms-input w-full" value={deathForm.mannerOfDeath} onChange={e => setDeathForm({ ...deathForm, mannerOfDeath: e.target.value })}>{['NATURAL', 'ACCIDENT', 'SUICIDE', 'HOMICIDE', 'UNDETERMINED'].map(m => <option key={m}>{m}</option>)}</select></div>
                <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer pb-2"><input type="checkbox" checked={deathForm.postMortemRequired} onChange={e => setDeathForm({ ...deathForm, postMortemRequired: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm">Post-mortem required</span></label></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowDeathForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleDeathSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Register Death
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
