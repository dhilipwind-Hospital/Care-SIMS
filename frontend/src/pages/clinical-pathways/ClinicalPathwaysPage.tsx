import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { GitBranch, Plus, X, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

type Tab = 'protocols' | 'pathways';

export default function ClinicalPathwaysPage() {
  const [tab, setTab] = useState<Tab>('protocols');
  const [protocols, setProtocols] = useState<any[]>([]);
  const [pathways, setPathways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', diagnosis: '', icdCode: '', department: '', durationDays: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'protocols') {
        const res = await api.get('/clinical-pathways/protocols');
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setProtocols(list);
        setTotal(list.length);
      } else {
        const res = await api.get('/clinical-pathways/pathways', { params: { page, limit: 20 } });
        setPathways(res.data.data || res.data || []);
        setTotal(res.data.meta?.total || 0);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchData(); }, [tab, page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.durationDays) { toast.error('Name and duration are required'); return; }
    setSaving(true);
    try {
      await api.post('/clinical-pathways/protocols', { ...form, durationDays: parseInt(form.durationDays), steps: [] });
      toast.success('Protocol created');
      setShowForm(false);
      setForm({ name: '', diagnosis: '', icdCode: '', department: '', durationDays: '' });
      fetchData();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePrint = (item: any) => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const isProtocol = item._type === 'protocol';
    const stepsHtml = isProtocol && item.steps?.length
      ? `<div class="field full"><label>Steps</label><ol style="margin:4px 0 0 16px">${item.steps.map((s: any) => `<li style="margin:2px 0">${typeof s === 'string' ? s : s.description || JSON.stringify(s)}</li>`).join('')}</ol></div>`
      : '';
    win.document.write(`<!DOCTYPE html><html><head><title>${isProtocol ? 'Care Protocol' : 'Patient Pathway'}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:32px}.header{border-bottom:3px double #0F766E;padding-bottom:16px;margin-bottom:20px;text-align:center}.title{font-size:22px;font-weight:900;color:#0F766E}.subtitle{font-size:13px;color:#555;margin-top:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field label{font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700}.field p{font-size:13px;margin-top:2px}.full{grid-column:1/-1}@media print{body{padding:20px}}</style>
    </head><body>
    <div class="header"><div class="title">AYPHEN HMS</div><div class="subtitle">${isProtocol ? 'Care Protocol' : 'Patient Pathway'}</div></div>
    <div class="grid">
    ${isProtocol ? `
      <div class="field"><label>Protocol Name</label><p>${item.name || '—'}</p></div>
      <div class="field"><label>Status</label><p>${item.isActive ? 'Active' : 'Inactive'}</p></div>
      <div class="field"><label>Diagnosis</label><p>${item.diagnosis || '—'}</p></div>
      <div class="field"><label>ICD Code</label><p>${item.icdCode || '—'}</p></div>
      <div class="field"><label>Department</label><p>${item.department || '—'}</p></div>
      <div class="field"><label>Duration</label><p>${item.durationDays ? item.durationDays + ' days' : '—'}</p></div>
      ${stepsHtml}
    ` : `
      <div class="field"><label>Protocol</label><p>${item.protocol?.name || '—'}</p></div>
      <div class="field"><label>Status</label><p>${item.status || '—'}</p></div>
      <div class="field"><label>Patient</label><p>${item.patientId || '—'}</p></div>
      <div class="field"><label>Current Day</label><p>${item.currentDay ? 'Day ' + item.currentDay : '—'}</p></div>
      <div class="field"><label>Start Date</label><p>${item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN') : '—'}</p></div>
      <div class="field"><label>Deviations</label><p>${Array.isArray(item.deviations) ? item.deviations.length : 0}</p></div>
    `}
    </div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const activeProtocols = protocols.filter(p => p.isActive !== false).length;
  const activePathways = pathways.filter(p => p.status === 'ACTIVE').length;
  const deviatedPathways = pathways.filter(p => p.status === 'DEVIATED').length;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Clinical Pathways" subtitle="Care protocols and patient pathway tracking" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Protocols" value={protocols.length} icon={GitBranch} color="#0F766E" />
        <KpiCard label="Active Protocols" value={activeProtocols} icon={GitBranch} color="#0369A1" />
        <KpiCard label="Active Pathways" value={activePathways} icon={GitBranch} color="#7C3AED" />
        <KpiCard label="Deviated" value={deviatedPathways} icon={GitBranch} color="#DC2626" />
      </div>

      <div className="hms-card">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['protocols', 'pathways'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm rounded-md capitalize font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
          {tab === 'protocols' && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-sm px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700">
              <Plus size={14} /> New Protocol
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {tab === 'protocols' ? (
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['Protocol Name', 'Diagnosis', 'ICD Code', 'Department', 'Duration', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
                  : protocols.length === 0
                    ? <tr><td colSpan={7}><EmptyState icon={<GitBranch size={36} />} title="No protocols yet" description="Create a care protocol to get started" /></td></tr>
                    : protocols.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 border-t border-gray-100">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.diagnosis || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.icdCode || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.department || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.durationDays} days</td>
                        <td className="px-4 py-3"><StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelected({ ...p, _type: 'protocol' })} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['Start Date', 'Protocol', 'Patient', 'Day', 'Status', 'Deviations', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
                  : pathways.length === 0
                    ? <tr><td colSpan={7}><EmptyState icon={<GitBranch size={36} />} title="No patient pathways yet" description="Assign a protocol to a patient to begin tracking" /></td></tr>
                    : pathways.map((pw: any) => (
                      <tr key={pw.id} className="hover:bg-gray-50 border-t border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(pw.startDate)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{pw.protocol?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{pw.patientId?.slice(0, 8) || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">Day {pw.currentDay}</td>
                        <td className="px-4 py-3"><StatusBadge status={pw.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {Array.isArray(pw.deviations) ? pw.deviations.length : 0}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelected({ ...pw, _type: 'pathway' })} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">
                {selected._type === 'protocol' ? 'Care Protocol' : 'Patient Pathway'}
              </h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              {selected._type === 'protocol' ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Protocol Name', selected.name],
                    ['Diagnosis', selected.diagnosis],
                    ['ICD Code', selected.icdCode],
                    ['Department', selected.department],
                    ['Duration', selected.durationDays ? `${selected.durationDays} days` : '—'],
                    ['Status', selected.isActive ? 'Active' : 'Inactive'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                      <p className="text-gray-800 mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                  {selected.steps?.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Steps</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700">
                        {selected.steps.map((s: any, i: number) => (
                          <li key={i}>{typeof s === 'string' ? s : s.description || JSON.stringify(s)}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Protocol', selected.protocol?.name],
                    ['Patient', selected.patientId],
                    ['Start Date', selected.startDate ? formatDate(selected.startDate) : '—'],
                    ['Current Day', selected.currentDay ? `Day ${selected.currentDay}` : '—'],
                    ['Status', selected.status],
                    ['Deviations', Array.isArray(selected.deviations) ? String(selected.deviations.length) : '0'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                      <p className="text-gray-800 mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">New Care Protocol</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Protocol Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="hms-input" placeholder="e.g. Post-op Hip Replacement" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis</label>
                  <input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} className="hms-input" placeholder="Primary diagnosis" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ICD Code</label>
                  <input value={form.icdCode} onChange={e => setForm({ ...form, icdCode: e.target.value })} className="hms-input" placeholder="e.g. Z96.641" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="hms-input" placeholder="e.g. Orthopaedics" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration (days) *</label>
                  <input type="number" min="1" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })} required className="hms-input" placeholder="7" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create Protocol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
