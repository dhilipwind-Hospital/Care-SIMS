import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Heart, Plus, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const WOUND_TYPES = ['PRESSURE_ULCER', 'DIABETIC_ULCER', 'SURGICAL', 'BURN', 'TRAUMA', 'VENOUS'];
const STAGES = ['I', 'II', 'III', 'IV', 'UNSTAGEABLE'];
const EXUDATE = ['NONE', 'SEROUS', 'SANGUINOUS', 'PURULENT'];
const WOUND_BED = ['GRANULATION', 'SLOUGH', 'NECROTIC', 'EPITHELIAL', 'MIXED'];

export default function WoundCarePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    patientId: '', woundType: 'PRESSURE_ULCER', location: '', stage: '',
    lengthCm: '', widthCm: '', depthCm: '', woundBed: '', exudate: '',
    treatment: '', dressingType: '', painScore: '', notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/wound-care', { params: { page, limit: 20 } }),
        api.get('/wound-care/dashboard').catch(() => ({ data: {} })),
      ]);
      setRecords(list.data.data || list.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.location) { toast.error('Patient ID and location are required'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (payload.lengthCm) payload.lengthCm = parseFloat(payload.lengthCm);
      if (payload.widthCm) payload.widthCm = parseFloat(payload.widthCm);
      if (payload.depthCm) payload.depthCm = parseFloat(payload.depthCm);
      if (payload.painScore) payload.painScore = parseInt(payload.painScore);
      Object.keys(payload).forEach(k => payload[k] === '' && delete payload[k]);
      await api.post('/wound-care', payload);
      toast.success('Assessment recorded');
      setShowForm(false);
      setForm({ patientId: '', woundType: 'PRESSURE_ULCER', location: '', stage: '', lengthCm: '', widthCm: '', depthCm: '', woundBed: '', exudate: '', treatment: '', dressingType: '', painScore: '', notes: '' });
      fetchData();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const byType = dashboard.byType || {};
  const topType = Object.entries(byType).sort((a: any, b: any) => b[1] - a[1])[0];

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Wound Care" subtitle="Chronic wound assessment and tracking" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Assessments" value={dashboard.total ?? records.length} icon={Heart} color="#0F766E" />
        <KpiCard label="Most Common" value={topType ? topType[0].replace(/_/g, ' ') : '—'} icon={Heart} color="#DC2626" />
        <KpiCard label="Wound Types" value={Object.keys(byType).length} icon={Heart} color="#7C3AED" />
        <KpiCard label="This Page" value={records.length} icon={Heart} color="#0369A1" />
      </div>

      <div className="hms-card">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-semibold text-gray-800">Wound Assessments</h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700">
            <Plus size={14} /> New Assessment
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Date', 'Wound Type', 'Location', 'Stage', 'Size (cm)', 'Pain', 'Treatment', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)
                : records.length === 0
                  ? <tr><td colSpan={8}><EmptyState icon={<Heart size={36} />} title="No assessments yet" description="Record a wound assessment to get started" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(r.assessedAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.woundType || '—'} /></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.location || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.stage || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {r.lengthCm && r.widthCm ? `${r.lengthCm} × ${r.widthCm}${r.depthCm ? ` × ${r.depthCm}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.painScore != null ? `${r.painScore}/10` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px] truncate">{r.treatment || r.dressingType || '—'}</td>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">New Wound Assessment</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Patient ID *</label>
                  <input value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} required className="hms-input" placeholder="Patient UUID" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Wound Type *</label>
                  <select value={form.woundType} onChange={e => setForm({ ...form, woundType: e.target.value })} className="hms-input">
                    {WOUND_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location *</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required className="hms-input" placeholder="e.g. Left heel" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                  <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className="hms-input">
                    <option value="">— Select —</option>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Length (cm)</label>
                  <input type="number" step="0.1" value={form.lengthCm} onChange={e => setForm({ ...form, lengthCm: e.target.value })} className="hms-input" placeholder="0.0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Width (cm)</label>
                  <input type="number" step="0.1" value={form.widthCm} onChange={e => setForm({ ...form, widthCm: e.target.value })} className="hms-input" placeholder="0.0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Depth (cm)</label>
                  <input type="number" step="0.1" value={form.depthCm} onChange={e => setForm({ ...form, depthCm: e.target.value })} className="hms-input" placeholder="0.0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pain Score (0–10)</label>
                  <input type="number" min="0" max="10" value={form.painScore} onChange={e => setForm({ ...form, painScore: e.target.value })} className="hms-input" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Wound Bed</label>
                  <select value={form.woundBed} onChange={e => setForm({ ...form, woundBed: e.target.value })} className="hms-input">
                    <option value="">— Select —</option>
                    {WOUND_BED.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exudate</label>
                  <select value={form.exudate} onChange={e => setForm({ ...form, exudate: e.target.value })} className="hms-input">
                    <option value="">— Select —</option>
                    {EXUDATE.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Treatment</label>
                  <input value={form.treatment} onChange={e => setForm({ ...form, treatment: e.target.value })} className="hms-input" placeholder="Treatment plan" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dressing Type</label>
                  <input value={form.dressingType} onChange={e => setForm({ ...form, dressingType: e.target.value })} className="hms-input" placeholder="Dressing type" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="hms-input resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
