import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Skull, Clock, CheckCircle, FileText, Pencil, Trash2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function MortuaryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ deceasedName: '', age: '', gender: 'MALE', dateOfDeath: '', timeOfDeath: '', causeOfDeath: '', deathCertificateNo: '', policeNotified: false, autopsyRequired: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [releaseForm, setReleaseForm] = useState({ releasedTo: '', releasedToRelation: '', releasedToId: '' });

  const fetchData = async () => { setLoading(true); try { const [r, d] = await Promise.all([api.get('/mortuary'), api.get('/mortuary/dashboard/stats')]); setRecords(r.data.data || r.data || []); setDashboard(d.data.data || d.data || {}); } catch (err) { toast.error('Failed to load mortuary data'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const defaultForm = { deceasedName: '', age: '', gender: 'MALE', dateOfDeath: '', timeOfDeath: '', causeOfDeath: '', deathCertificateNo: '', policeNotified: false, autopsyRequired: false };
  const resetForm = () => { setForm(defaultForm); setEditingId(null); setShowForm(false); setFormError(''); };

  const editRecord = (record: any) => {
    setForm({
      deceasedName: record.deceasedName || '',
      age: record.age ? String(record.age) : '',
      gender: record.gender || 'MALE',
      dateOfDeath: record.dateOfDeath ? record.dateOfDeath.slice(0, 10) : '',
      timeOfDeath: record.timeOfDeath || '',
      causeOfDeath: record.causeOfDeath || '',
      deathCertificateNo: record.deathCertificateNo || '',
      policeNotified: record.policeNotified || false,
      autopsyRequired: record.autopsyRequired || false,
    });
    setEditingId(record.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async () => {
    if (!form.deceasedName.trim()) { setFormError('Deceased name is required'); return; }
    if (!form.dateOfDeath) { setFormError('Date of death is required'); return; }
    setFormError('');
    const payload = { ...form, age: form.age ? Number(form.age) : undefined };
    try {
      if (editingId) {
        await api.patch(`/mortuary/${editingId}`, payload);
        toast.success('Mortuary record updated');
      } else {
        await api.post('/mortuary', payload);
        toast.success('Mortuary record added');
      }
      resetForm();
      fetchData();
    } catch (err) { toast.error(editingId ? 'Failed to update mortuary record' : 'Failed to add mortuary record'); }
  };
  const handleDelete = async (id: string) => { if (!confirm('Delete this mortuary record?')) return; try { await api.delete(`/mortuary/${id}`); toast.success('Mortuary record deleted'); fetchData(); } catch (err) { toast.error('Failed to delete mortuary record'); } };
  const handleRelease = (id: string) => { setReleaseId(id); setReleaseForm({ releasedTo: '', releasedToRelation: '', releasedToId: '' }); };
  const confirmRelease = async () => { if (!releaseId || !releaseForm.releasedTo.trim()) return; try { await api.patch(`/mortuary/${releaseId}/release`, releaseForm); toast.success('Body released successfully'); fetchData(); } catch (err) { toast.error('Failed to release record'); } finally { setReleaseId(null); setReleaseForm({ releasedTo: '', releasedToRelation: '', releasedToId: '' }); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Mortuary" subtitle="Manage mortuary records and releases" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="In Custody" value={dashboard.inCustody || 0} icon={Skull} color="#6B7280" />
          <KpiCard label="Released" value={dashboard.released || 0} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Autopsy Pending" value={records.filter(r => r.autopsyRequired && r.autopsyStatus !== 'COMPLETED').length} icon={Clock} color="#F59E0B" />
          <KpiCard label="Total" value={dashboard.total || 0} icon={FileText} color="#3B82F6" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => { if (editingId) { setEditingId(null); setForm(defaultForm); setFormError(''); } else { setShowForm(!showForm); } }} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ New Record</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">{editingId ? 'Edit Mortuary Record' : 'New Mortuary Record'}</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Deceased Name *" value={form.deceasedName} onChange={e => setForm({ ...form, deceasedName: e.target.value })} />
            <input className="hms-input" type="number" placeholder="Age" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
            <select className="hms-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
            <input className="hms-input" type="date" value={form.dateOfDeath} onChange={e => setForm({ ...form, dateOfDeath: e.target.value })} />
            <input className="hms-input" type="time" value={form.timeOfDeath} onChange={e => setForm({ ...form, timeOfDeath: e.target.value })} />
            <input className="hms-input" placeholder="Cause of Death" value={form.causeOfDeath} onChange={e => setForm({ ...form, causeOfDeath: e.target.value })} />
            <input className="hms-input" placeholder="Death Certificate No." value={form.deathCertificateNo} onChange={e => setForm({ ...form, deathCertificateNo: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.policeNotified} onChange={e => setForm({ ...form, policeNotified: e.target.checked })} /> Police Notified</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autopsyRequired} onChange={e => setForm({ ...form, autopsyRequired: e.target.checked })} /> Autopsy Required</label>
          </div><div className="flex gap-2"><button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>{editingId ? 'Update' : 'Save'}</button><button onClick={resetForm} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Record #</th><th className="text-left p-3 font-medium text-gray-600">Name</th><th className="text-left p-3 font-medium text-gray-600">Age</th><th className="text-left p-3 font-medium text-gray-600">Gender</th><th className="text-left p-3 font-medium text-gray-600">Date of Death</th><th className="text-left p-3 font-medium text-gray-600">Cause</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
      ) : records.length === 0 ? (
        <tr><td colSpan={8}><EmptyState icon={<Skull size={24} className="text-gray-400" />} title="No mortuary records" description="Records will appear when added" /></td></tr>
      ) : records.map(r => (
        <tr key={r.id} className="border-b hover:bg-gray-50">
          <td className="p-3 font-medium text-teal-700">{r.recordNumber}</td>
          <td className="p-3">{r.deceasedName}</td>
          <td className="p-3">{r.age || '—'}</td><td className="p-3">{r.gender}</td>
          <td className="p-3">{new Date(r.dateOfDeath).toLocaleDateString()}</td>
          <td className="p-3 max-w-[120px] truncate">{r.causeOfDeath || '—'}</td>
          <td className="p-3"><StatusBadge status={r.status} /></td>
          <td className="p-3 flex gap-1">{r.status !== 'RELEASED' && <button onClick={() => editRecord(r)} className="text-xs p-1 text-gray-500 hover:text-teal-700 rounded-md hover:bg-gray-100" title="Edit"><Pencil size={14} /></button>}{r.status === 'IN_CUSTODY' && <button onClick={() => handleRelease(r.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">Release</button>}<button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete record"><Trash2 size={14} /></button></td>
        </tr>
      ))}</tbody></table></div>
      {releaseId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Release Body</h3>
            <div className="space-y-3 mb-4">
              <input className="w-full border rounded-lg p-2" value={releaseForm.releasedTo} onChange={e => setReleaseForm({ ...releaseForm, releasedTo: e.target.value })} placeholder="Released to (name) *" />
              <input className="w-full border rounded-lg p-2" value={releaseForm.releasedToRelation} onChange={e => setReleaseForm({ ...releaseForm, releasedToRelation: e.target.value })} placeholder="Relationship" />
              <input className="w-full border rounded-lg p-2" value={releaseForm.releasedToId} onChange={e => setReleaseForm({ ...releaseForm, releasedToId: e.target.value })} placeholder="ID number" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setReleaseId(null); setReleaseForm({ releasedTo: '', releasedToRelation: '', releasedToId: '' }); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmRelease} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
