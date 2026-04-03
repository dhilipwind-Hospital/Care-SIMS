import { useEffect, useState } from 'react';
import { Bug, AlertTriangle, Shield, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import SearchableSelect from '../../components/ui/SearchableSelect';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function InfectionControlPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ recordType: 'SURVEILLANCE', organism: '', infectionSite: '', infectionType: '', isolationType: 'NONE', patientId: '', wardId: '', isHai: false, actionsTaken: '' });
  const [formError, setFormError] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');

  const fetchData = async () => { setLoading(true); try { const [r, d] = await Promise.all([api.get('/infection-control'), api.get('/infection-control/dashboard/stats')]); setRecords(r.data.data || r.data || []); setDashboard(d.data.data || d.data || {}); } catch (err) { toast.error('Failed to load infection control data'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.organism.trim()) { setFormError('Organism is required'); return; }
    setFormError('');
    try { await api.post('/infection-control', form); toast.success('Infection record reported successfully'); setShowForm(false); setForm({ recordType: 'SURVEILLANCE', organism: '', infectionSite: '', infectionType: '', isolationType: 'NONE', patientId: '', wardId: '', isHai: false, actionsTaken: '' }); fetchData(); } catch (err) { toast.error('Failed to report infection record'); }
  };
  const handleDelete = async (id: string) => { if (!confirm('Delete this infection record?')) return; try { await api.delete(`/infection-control/${id}`); toast.success('Infection record deleted'); fetchData(); } catch (err) { toast.error('Failed to delete infection record'); } };
  const handleResolve = (id: string) => { setResolveId(id); setOutcome(''); };
  const confirmResolve = async () => { if (!resolveId || !outcome.trim()) return; try { await api.patch(`/infection-control/${resolveId}/resolve`, { outcome }); toast.success('Infection record resolved'); fetchData(); } catch (err) { toast.error('Failed to resolve infection record'); } finally { setResolveId(null); setOutcome(''); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Infection Control" subtitle="Monitor and manage infections" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Active Cases" value={dashboard.active || 0} icon={Bug} color="#EF4444" />
          <KpiCard label="HAI Cases" value={dashboard.hai || 0} icon={AlertTriangle} color="#F59E0B" />
          <KpiCard label="Resolved" value={dashboard.resolved || 0} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Total" value={dashboard.total || 0} icon={Shield} color="#3B82F6" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Report Infection</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Report Infection</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <select className="hms-input" value={form.recordType} onChange={e => setForm({ ...form, recordType: e.target.value })}><option value="SURVEILLANCE">Surveillance</option><option value="OUTBREAK">Outbreak</option><option value="HAI">HAI</option><option value="ALERT">Alert</option></select>
            <input className="hms-input" placeholder="Organism *" value={form.organism} onChange={e => setForm({ ...form, organism: e.target.value })} />
            <input className="hms-input" placeholder="Infection Site" value={form.infectionSite} onChange={e => setForm({ ...form, infectionSite: e.target.value })} />
            <select className="hms-input" value={form.isolationType} onChange={e => setForm({ ...form, isolationType: e.target.value })}><option value="NONE">None</option><option value="CONTACT">Contact</option><option value="DROPLET">Droplet</option><option value="AIRBORNE">Airborne</option></select>
            <SearchableSelect
              value={form.patientId}
              onChange={(id) => setForm({ ...form, patientId: id })}
              placeholder="Search patient…"
              endpoint="/patients"
              searchParam="q"
              mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })}
            />
            <SearchableSelect
              value={form.wardId}
              onChange={(id) => setForm({ ...form, wardId: id })}
              placeholder="Select ward…"
              endpoint="/wards"
              mapOption={(w: any) => ({ id: w.id, label: w.name, sub: w.type })}
            />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isHai} onChange={e => setForm({ ...form, isHai: e.target.checked })} /> Hospital-Acquired Infection (HAI)</label>
          </div><textarea className="hms-input w-full" placeholder="Actions Taken" rows={2} value={form.actionsTaken} onChange={e => setForm({ ...form, actionsTaken: e.target.value })} />
          <div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Report</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Type</th><th className="text-left p-3 font-medium text-gray-600">Organism</th><th className="text-left p-3 font-medium text-gray-600">Site</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Isolation</th><th className="text-left p-3 font-medium text-gray-600">HAI</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
      ) : records.length === 0 ? (
        <tr><td colSpan={8}><EmptyState icon={<Shield size={24} className="text-gray-400" />} title="No infection records" description="Report infections here for tracking and surveillance" /></td></tr>
      ) : records.slice((page - 1) * 20, page * 20).map(r => (
        <tr key={r.id} className={`border-b hover:bg-gray-50 ${r.isHai ? 'bg-red-50/40' : ''}`}>
          <td className="p-3"><StatusBadge status={r.recordType} /></td>
          <td className="p-3">{r.organism || '—'}</td>
          <td className="p-3">{r.infectionSite || '—'}</td>
          <td className="p-3">{r.patientId || '—'}</td>
          <td className="p-3"><StatusBadge status={r.isolationType || 'NONE'} /></td>
          <td className="p-3">{r.isHai ? <span className="text-red-600 font-medium">Yes</span> : 'No'}</td>
          <td className="p-3"><StatusBadge status={r.status} /></td>
          <td className="p-3"><div className="flex gap-1">{r.status === 'ACTIVE' && <button onClick={() => handleResolve(r.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Resolve</button>}<button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete record"><Trash2 size={14} /></button></div></td>
        </tr>
      ))}</tbody></table>
      <Pagination page={page} totalPages={Math.ceil(records.length / 20)} onPageChange={setPage} totalItems={records.length} pageSize={20} />
      </div>
      {resolveId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Resolve Infection</h3>
            <textarea className="w-full border rounded-lg p-2 mb-4" rows={3} value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="Enter outcome..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setResolveId(null); setOutcome(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmResolve} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
