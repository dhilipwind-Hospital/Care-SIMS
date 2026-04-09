import { useEffect, useState } from 'react';
import { GitBranch, Clock, CheckCircle, Users, GitPullRequest, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import SearchableSelect from '../../components/ui/SearchableSelect';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

const emptyForm = { patientId: '', toDepartmentId: '', toDoctorId: '', reason: '', urgency: 'ROUTINE', clinicalNotes: '' };

export default function ReferralPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === 'mine' ? '/referrals/my-referrals' : '/referrals';
      const { data } = await api.get(endpoint);
      setReferrals(data.data || data || []);
    } catch (err) { toast.error('Failed to load referrals'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, [viewMode]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setFormError('');
  };

  const editRecord = (r: any) => {
    setForm({
      patientId: r.patientId || '',
      toDepartmentId: r.toDepartmentId || '',
      toDoctorId: r.toDoctorId || '',
      reason: r.reason || '',
      urgency: r.urgency || 'ROUTINE',
      clinicalNotes: r.clinicalNotes || '',
    });
    setEditingId(r.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async () => {
    if (!form.patientId) { setFormError('Please select a patient'); return; }
    if (!form.toDepartmentId) { setFormError('Please select a department'); return; }
    if (!form.reason.trim()) { setFormError('Reason is required'); return; }
    setFormError('');
    try {
      if (editingId) {
        await api.patch(`/referrals/${editingId}`, form);
        toast.success('Referral updated successfully');
      } else {
        await api.post('/referrals', form);
        toast.success('Referral created successfully');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(editingId ? 'Failed to update referral' : 'Failed to create referral');
    }
  };

  const acceptReferral = async (id: string) => { try { await api.patch(`/referrals/${id}/accept`); toast.success('Referral accepted'); fetchData(); } catch (err) { toast.error('Failed to accept referral'); } };
  const declineReferral = async (id: string) => { try { await api.patch(`/referrals/${id}/decline`); toast.success('Referral declined'); fetchData(); } catch (err) { toast.error('Failed to decline referral'); } };
  const completeReferral = async (id: string) => { try { await api.patch(`/referrals/${id}/complete`); toast.success('Referral completed'); fetchData(); } catch (err) { toast.error('Failed to complete referral'); } };
  const handleDelete = async (id: string) => { if (!confirm('Delete this referral?')) return; try { await api.delete(`/referrals/${id}`); toast.success('Referral deleted'); fetchData(); } catch (err) { toast.error('Failed to delete referral'); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Referrals" subtitle="Manage patient referrals between departments" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total" value={referrals.length} icon={GitBranch} color="#3B82F6" />
          <KpiCard label="Pending" value={referrals.filter(r => r.status === 'PENDING').length} icon={Clock} color="#F59E0B" />
          <KpiCard label="Accepted" value={referrals.filter(r => r.status === 'ACCEPTED').length} icon={Users} color="#10B981" />
          <KpiCard label="Completed" value={referrals.filter(r => r.status === 'COMPLETED').length} icon={CheckCircle} color="#6B7280" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => { setViewMode('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${viewMode === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-400'}`}>
            All Referrals
          </button>
          <button onClick={() => { setViewMode('mine'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${viewMode === 'mine' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-400'}`}>
            My Referrals
          </button>
        </div>
        <button onClick={() => { if (showForm && !editingId) { resetForm(); } else { setEditingId(null); setForm({ ...emptyForm }); setFormError(''); setShowForm(true); } }} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ New Referral</button>
      </div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">{editingId ? 'Edit Referral' : 'New Referral'}</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect
              value={form.patientId}
              onChange={(id) => setForm({ ...form, patientId: id })}
              placeholder="Search patient…"
              label="Patient"
              required
              endpoint="/patients"
              searchParam="q"
              mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })}
            />
            <SearchableSelect
              value={form.toDepartmentId}
              onChange={(id) => setForm({ ...form, toDepartmentId: id })}
              placeholder="Select department…"
              label="To Department"
              required
              endpoint="/departments"
              mapOption={(d: any) => ({ id: d.id, label: d.name, sub: d.code })}
            />
            <SearchableSelect
              value={form.toDoctorId}
              onChange={(id) => setForm({ ...form, toDoctorId: id })}
              placeholder="Select doctor…"
              label="To Doctor"
              endpoint="/doctor-registry"
              searchParam="q"
              mapOption={(d: any) => ({ id: d.id, label: `Dr. ${d.firstName} ${d.lastName}`, sub: d.specialization })}
            />
            <select className="hms-input" value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option></select>
            <input className="hms-input col-span-2" placeholder="Reason *" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div><textarea className="hms-input w-full" placeholder="Clinical Notes" rows={2} value={form.clinicalNotes} onChange={e => setForm({ ...form, clinicalNotes: e.target.value })} />
          <div className="flex gap-2"><button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>{editingId ? 'Update' : 'Submit'}</button><button onClick={resetForm} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Ref #</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">To Dept</th><th className="text-left p-3 font-medium text-gray-600">Reason</th><th className="text-left p-3 font-medium text-gray-600">Urgency</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
      ) : referrals.length === 0 ? (
        <tr><td colSpan={7}><EmptyState icon={<GitPullRequest size={24} className="text-gray-400" />} title="No referrals found" description="Create a referral to transfer a patient between departments" /></td></tr>
      ) : referrals.slice((page - 1) * 20, page * 20).map(r => (
        <tr key={r.id} className={`border-b hover:bg-gray-50 ${r.urgency === 'EMERGENCY' ? 'bg-red-50/40' : ''}`}>
          <td className="p-3 font-medium text-teal-700">{r.referralNumber}</td>
          <td className="p-3">{r.patientId}</td><td className="p-3">{r.toDepartmentId}</td>
          <td className="p-3 max-w-[150px] truncate">{r.reason}</td>
          <td className="p-3"><StatusBadge status={r.urgency || 'ROUTINE'} /></td>
          <td className="p-3"><StatusBadge status={r.status} /></td>
          <td className="p-3">
            <div className="flex gap-1.5">
              {r.status === 'PENDING' && <>
                <button onClick={() => editRecord(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium" title="Edit referral"><Pencil size={13} className="inline mr-0.5" />Edit</button>
                <button onClick={() => acceptReferral(r.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Accept</button>
                <button onClick={() => declineReferral(r.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">Decline</button>
                <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete referral"><Trash2 size={14} /></button>
              </>}
              {r.status === 'ACCEPTED' && (
                <button onClick={() => completeReferral(r.id)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Complete</button>
              )}
            </div>
          </td>
        </tr>
      ))}</tbody></table>
      <Pagination page={page} totalPages={Math.ceil(referrals.length / 20)} onPageChange={setPage} totalItems={referrals.length} pageSize={20} />
      </div>
    </div>
  );
}
