import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { GitBranch, Plus, X } from 'lucide-react';
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
                          <button className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button>
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
                          <button className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button>
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
