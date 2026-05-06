import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, X, Loader2, Printer, ChevronDown } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/format';

const WASTE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  YELLOW: { bg: 'bg-yellow-400', text: 'text-gray-900', label: 'Yellow — Infectious' },
  RED: { bg: 'bg-red-500', text: 'text-white', label: 'Red — Contaminated Sharps' },
  WHITE: { bg: 'bg-white border border-gray-300', text: 'text-gray-800', label: 'White — Sharp Waste' },
  BLUE: { bg: 'bg-blue-500', text: 'text-white', label: 'Blue — Glassware' },
  BLACK: { bg: 'bg-gray-800', text: 'text-white', label: 'Black — General Waste' },
};

const MANIFEST_STATUSES = ['PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED'] as const;
type ManifestStatus = typeof MANIFEST_STATUSES[number];

const MANIFEST_STYLE: Record<ManifestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const NEXT_STATUS: Partial<Record<ManifestStatus, ManifestStatus>> = {
  PENDING: 'SUBMITTED',
  SUBMITTED: 'ACKNOWLEDGED',
  ACKNOWLEDGED: 'COMPLETED',
};

export default function WasteManagementPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ wasteCategory: 'YELLOW', weightKg: '', disposalMethod: 'INCINERATION', vendorName: '', manifestNumber: '', handedToVendor: false, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/waste-management', { params: { page, limit: 20, category: categoryFilter || undefined } }),
        api.get('/waste-management/dashboard'),
      ]);
      setRecords(list.data.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load waste management data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, categoryFilter]);

  const handleSubmit = async () => {
    if (!form.weightKg) { toast.error('Weight required'); return; }
    setSubmitting(true);
    try {
      await api.post('/waste-management', { ...form, weightKg: Number(form.weightKg) });
      toast.success('Collection recorded');
      setShowForm(false);
      setForm({ wasteCategory: 'YELLOW', weightKg: '', disposalMethod: 'INCINERATION', vendorName: '', manifestNumber: '', handedToVendor: false, notes: '' });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const advanceManifest = async (r: any) => {
    const next = NEXT_STATUS[r.manifestStatus as ManifestStatus];
    if (!next) return;
    setUpdatingId(r.id);
    try {
      await api.patch(`/waste-management/${r.id}/manifest-status`, { manifestStatus: next });
      toast.success(`Manifest status → ${next}`);
      fetchData();
    } catch { toast.error('Failed to update manifest status'); }
    finally { setUpdatingId(null); }
  };

  const markHandedToVendor = async (r: any) => {
    setUpdatingId(r.id);
    try {
      await api.patch(`/waste-management/${r.id}`, { handedToVendor: true });
      toast.success('Marked as handed to vendor');
      fetchData();
    } catch { toast.error('Failed'); }
    finally { setUpdatingId(null); }
  };

  const handlePrintManifest = (r: any) => {
    const categoryColorStyle = r.wasteCategory === 'YELLOW'
      ? 'background:#FACC15;color:#111;'
      : r.wasteCategory === 'RED' ? 'background:#EF4444;color:#fff;'
      : r.wasteCategory === 'WHITE' ? 'background:#fff;color:#111;border:1px solid #ccc;'
      : r.wasteCategory === 'BLUE' ? 'background:#3B82F6;color:#fff;'
      : 'background:#1F2937;color:#fff;';
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>BMW Manifest</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;}
  h1{margin:0;font-size:22px;font-weight:900;color:#0F766E;letter-spacing:1px;}
  h2{margin:4px 0 2px;font-size:16px;font-weight:700;color:#111;}
  h3{margin:2px 0 8px;font-size:12px;font-weight:400;color:#555;}
  hr{border:none;border-top:2px solid #0F766E;margin:12px 0;}
  .banner{background:#B91C1C;color:#fff;padding:8px 16px;font-size:12px;font-weight:700;letter-spacing:1px;text-align:center;border-radius:4px;margin-bottom:16px;}
  .box{border:1px solid #ccc;border-radius:6px;padding:16px;margin-bottom:16px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;}
  .field label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px;}
  .field span{display:block;font-size:13px;font-weight:600;color:#111;margin-top:2px;}
  .badge{display:inline-block;padding:3px 12px;border-radius:99px;font-size:12px;font-weight:700;margin-top:4px;}
  .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px;}
  .sig-box{border-top:2px solid #111;padding-top:8px;text-align:center;font-size:11px;color:#444;}
  .disclaimer{font-size:10px;color:#888;margin-top:20px;text-align:center;}
  @media print{body{padding:16px;}}
</style></head><body>
<h1>AYPHEN HMS</h1>
<h2>BIOMEDICAL WASTE DISPOSAL MANIFEST</h2>
<h3>BMW Rules 2016 — Form 3</h3>
<hr/>
<div class="banner">OFFICIAL BIOMEDICAL WASTE MANIFEST — RETAIN FOR RECORDS</div>
<div class="box">
  <div class="grid">
    <div class="field"><label>Manifest #</label><span>${r.manifestNumber || '—'}</span></div>
    <div class="field"><label>Manifest Status</label><span>${r.manifestStatus || 'PENDING'}</span></div>
    <div class="field"><label>Date / Time</label><span>${r.collectedAt ? new Date(r.collectedAt).toLocaleString() : '—'}</span></div>
    <div class="field"><label>Handed to Vendor</label><span>${r.handedToVendor ? `Yes — ${r.handedAt ? new Date(r.handedAt).toLocaleString() : ''}` : 'No'}</span></div>
    <div class="field"><label>Waste Category</label><span><span class="badge" style="${categoryColorStyle}">${r.wasteCategory}</span></span></div>
    <div class="field"><label>Weight</label><span>${Number(r.weightKg).toFixed(2)} kg</span></div>
    <div class="field"><label>Disposal Method</label><span>${r.disposalMethod || '—'}</span></div>
    <div class="field"><label>Vendor</label><span>${r.vendorName || '—'}</span></div>
    <div class="field"><label>Notes</label><span>${r.notes || '—'}</span></div>
  </div>
</div>
<div class="sig-row">
  <div class="sig-box">Generator Signature</div>
  <div class="sig-box">Transporter Signature</div>
  <div class="sig-box">Treatment Facility</div>
</div>
<div class="disclaimer">This manifest must be retained for 5 years as per BMW Rules 2016.</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    win.document.close();
  };

  const filteredRecords = statusFilter
    ? records.filter(r => (r.manifestStatus || 'PENDING') === statusFilter)
    : records;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Biomedical Waste Management" subtitle="BMW Rules 2016 compliance tracking"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Record Collection
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Collections" value={dashboard.totalCollections || 0} icon={Trash2} color="#0F766E" />
        <KpiCard label="Total Weight" value={`${(dashboard.totalWeightKg || 0).toFixed(1)} kg`} icon={Trash2} color="#3B82F6" />
        <KpiCard label="Handed to Vendor" value={dashboard.handedToVendor || 0} icon={Trash2} color="#10B981" />
        <KpiCard label="Pending Manifests" value={records.filter(r => !r.manifestStatus || r.manifestStatus === 'PENDING').length} icon={Trash2} color="#F59E0B" />
      </div>

      {/* Category weight summary */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(WASTE_COLORS).map(([cat, cfg]) => (
          <div key={cat} className={`${cfg.bg} ${cfg.text} rounded-xl p-4 text-center cursor-pointer transition-opacity ${categoryFilter === cat ? 'ring-2 ring-offset-2 ring-teal-500' : ''}`}
            onClick={() => setCategoryFilter(c => c === cat ? '' : cat)}>
            <div className="text-2xl font-black">{((dashboard.byCategory?.[cat]?.totalKg) || 0).toFixed(1)}</div>
            <div className="text-xs font-medium opacity-80">kg</div>
            <div className="text-xs mt-1 opacity-70">{cfg.label.split('—')[0]}</div>
          </div>
        ))}
      </div>

      {/* Manifest status pipeline */}
      <div className="hms-card p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Manifest Pipeline</div>
        <div className="flex items-center gap-2">
          {MANIFEST_STATUSES.map((s, i) => {
            const count = records.filter(r => (r.manifestStatus || 'PENDING') === s).length;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <button onClick={() => setStatusFilter(f => f === s ? '' : s)}
                  className={`flex-1 rounded-lg p-3 text-center transition-all border-2 ${statusFilter === s ? 'border-teal-500' : 'border-transparent'} ${MANIFEST_STYLE[s]}`}>
                  <div className="text-xl font-black">{count}</div>
                  <div className="text-xs font-semibold mt-0.5">{s}</div>
                </button>
                {i < MANIFEST_STATUSES.length - 1 && <ChevronDown size={16} className="text-gray-300 rotate-[-90deg] shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hms-card">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {filteredRecords.length} records{categoryFilter ? ` — ${categoryFilter}` : ''}{statusFilter ? ` — ${statusFilter}` : ''}
          </span>
          {(categoryFilter || statusFilter) && (
            <button onClick={() => { setCategoryFilter(''); setStatusFilter(''); }} className="text-xs text-teal-600 hover:underline">Clear filters</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Date', 'Category', 'Weight', 'Disposal', 'Vendor', 'Manifest #', 'Manifest Status', 'Handed', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon={<Trash2 size={36} />} title="No waste collections" /></td></tr>
              ) : filteredRecords.map(r => {
                const cfg = WASTE_COLORS[r.wasteCategory] || WASTE_COLORS.BLACK;
                const mStatus = (r.manifestStatus || 'PENDING') as ManifestStatus;
                const nextStatus = NEXT_STATUS[mStatus];
                return (
                  <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(r.collectedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>{r.wasteCategory}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">{Number(r.weightKg).toFixed(2)} kg</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.disposalMethod || '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.vendorName || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono">{r.manifestNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${MANIFEST_STYLE[mStatus]}`}>{mStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.handedToVendor
                        ? <div><span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Handed</span>
                            {r.handedAt && <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(r.handedAt)}</div>}
                          </div>
                        : <button onClick={() => markHandedToVendor(r)} disabled={updatingId === r.id}
                            className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium disabled:opacity-50">
                            Mark Handed
                          </button>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {nextStatus && (
                          <button onClick={() => advanceManifest(r)} disabled={updatingId === r.id}
                            className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium disabled:opacity-50 whitespace-nowrap">
                            → {nextStatus}
                          </button>
                        )}
                        <button onClick={() => handlePrintManifest(r)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                          <Printer size={12} /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Record Waste Collection</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                  <select className="hms-input w-full" value={form.wasteCategory} onChange={e => setForm({ ...form, wasteCategory: e.target.value })}>
                    {['YELLOW', 'RED', 'WHITE', 'BLUE', 'BLACK'].map(c => <option key={c}>{c}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Weight (kg) *</label>
                  <input type="number" step="0.01" className="hms-input w-full" value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Disposal Method</label>
                  <select className="hms-input w-full" value={form.disposalMethod} onChange={e => setForm({ ...form, disposalMethod: e.target.value })}>
                    {['INCINERATION', 'AUTOCLAVE', 'CHEMICAL', 'DEEP_BURIAL', 'RECYCLING'].map(m => <option key={m}>{m}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Vendor</label>
                  <input className="hms-input w-full" value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Manifest #</label>
                <input className="hms-input w-full" value={form.manifestNumber} onChange={e => setForm({ ...form, manifestNumber: e.target.value })} /></div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.handedToVendor} onChange={e => setForm({ ...form, handedToVendor: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm">Handed to disposal vendor</span>
              </label>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea className="hms-input w-full" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {submitting && <Loader2 size={14} className="animate-spin" />} Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
