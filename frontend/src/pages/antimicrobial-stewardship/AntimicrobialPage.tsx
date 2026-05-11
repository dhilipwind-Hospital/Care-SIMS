import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pill, ShieldCheck, Plus, X, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function AntimicrobialPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/antimicrobial', { params: { page, limit: 20 } }),
        api.get('/antimicrobial/dashboard').catch(() => ({ data: {} })),
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
      await api.post('/antimicrobial', {
        ...form,
        durationDays: Number(form.durationDays),
      });
      toast.success('Created successfully');
      setShowModal(false);
      setForm({});
      fetchData();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePrint = (r: any) => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Antimicrobial Record</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:32px}.header{border-bottom:3px double #0F766E;padding-bottom:16px;margin-bottom:20px;text-align:center}.title{font-size:22px;font-weight:900;color:#0F766E}.subtitle{font-size:13px;color:#555;margin-top:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}.field label{font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700}.field p{font-size:13px;margin-top:2px}.full{grid-column:1/-1}@media print{body{padding:20px}}</style>
    </head><body>
    <div class="header"><div class="title">AYPHEN HMS</div><div class="subtitle">Antimicrobial Stewardship Record</div></div>
    <div class="grid">
      <div class="field"><label>Drug Name</label><p>${r.drugName || '—'}</p></div>
      <div class="field"><label>Patient</label><p>${r.patientName || r.patientId || '—'}</p></div>
      <div class="field"><label>Route</label><p>${r.route || '—'}</p></div>
      <div class="field"><label>Duration</label><p>${r.durationDays ? r.durationDays + ' days' : '—'}</p></div>
      <div class="field"><label>Prescribed By</label><p>${r.prescribedBy || r.doctorName || '—'}</p></div>
      <div class="field"><label>Status</label><p>${r.status || '—'}</p></div>
      <div class="field full"><label>Indication</label><p>${r.indication || '—'}</p></div>
      ${r.notes ? `<div class="field full"><label>Notes</label><p>${r.notes}</p></div>` : ''}
    </div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar
        title="Antimicrobial Stewardship"
        subtitle="Antibiotic usage monitoring"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
          >
            <Plus size={16} /> New Record
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Records" value={dashboard.total ?? 0} icon={Pill} color="#0F766E" />
        <KpiCard label="Restricted Antibiotics" value={dashboard.restricted ?? 0} icon={Pill} color="#EF4444" />
        <KpiCard label="Under Review" value={dashboard.reviewed ?? 0} icon={ShieldCheck} color="#F59E0B" />
        <KpiCard label="Compliant" value={dashboard.compliant ?? 0} icon={ShieldCheck} color="#10B981" />
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Drug Name', 'Patient', 'Indication', 'Route', 'Duration (days)', 'Prescribed By', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
                : records.length === 0
                  ? <tr><td colSpan={8}><EmptyState icon={<Pill size={36} />} title="No records yet" description="Antimicrobial stewardship records will appear here when created" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.drugName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.patientName || r.patientId || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">{r.indication || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.route || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{r.durationDays ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.prescribedBy || r.doctorName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status || '—'} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelected(r)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">Antimicrobial Record</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Drug Name', selected.drugName],
                  ['Patient', selected.patientName || selected.patientId],
                  ['Route', selected.route],
                  ['Duration', selected.durationDays ? `${selected.durationDays} days` : '—'],
                  ['Prescribed By', selected.prescribedBy || selected.doctorName],
                  ['Status', selected.status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-gray-800 mt-0.5">{value || '—'}</p>
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Indication</p>
                  <p className="text-gray-800 mt-0.5">{selected.indication || '—'}</p>
                </div>
                {selected.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Notes</p>
                    <p className="text-gray-800 mt-0.5">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => handlePrint(selected)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg">
                <Printer size={14} /> Print
              </button>
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">New Antimicrobial Record</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Drug Name <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={form.drugName || ''} onChange={e => setForm({ ...form, drugName: e.target.value })} placeholder="Antibiotic name" />
                </div>
                <div>
                  <label className={labelCls}>Patient <span className="text-red-500">*</span></label>
                  <SearchableSelect value={form.patientId || ''} onChange={(id) => setForm({ ...form, patientId: id })} placeholder="Search patient…" endpoint="/patients" searchParam="q" mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })} />
                </div>
                <div>
                  <label className={labelCls}>Route</label>
                  <select className={inputCls} value={form.route || ''} onChange={e => setForm({ ...form, route: e.target.value })}>
                    <option value="">Select route</option>
                    <option value="ORAL">Oral</option>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="TOPICAL">Topical</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Duration (days) <span className="text-red-500">*</span></label>
                  <input type="number" min={1} className={inputCls} value={form.durationDays || ''} onChange={e => setForm({ ...form, durationDays: e.target.value })} placeholder="Number of days" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Prescribed By <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={form.prescribedBy || ''} onChange={e => setForm({ ...form, prescribedBy: e.target.value })} placeholder="Doctor name" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Indication <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} value={form.indication || ''} onChange={e => setForm({ ...form, indication: e.target.value })} placeholder="Clinical indication" />
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
