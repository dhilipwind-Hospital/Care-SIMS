import { useEffect, useState } from 'react';
import { FileCheck, FileText, Clock, XCircle, Pencil, Trash2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import Pagination from '../../components/ui/Pagination';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const emptyForm = { patientId: '', consentType: 'GENERAL', procedureName: '', description: '', risks: '', alternatives: '', consentGivenBy: '', relationship: '', doctorId: '', doctorName: '', witnessName: '' };

export default function ConsentPage() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/consents'); setConsents(data.data || data || []); } catch (err) { toast.error('Failed to load consent records'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setFormError('');
  };

  const editRecord = (c: any) => {
    setForm({
      patientId: c.patientId || '',
      consentType: c.consentType || 'GENERAL',
      procedureName: c.procedureName || '',
      description: c.description || '',
      risks: c.risks || '',
      alternatives: c.alternatives || '',
      consentGivenBy: c.consentGivenBy || '',
      relationship: c.relationship || '',
      doctorId: c.doctorId || '',
      doctorName: c.doctorName || '',
      witnessName: c.witnessName || '',
    });
    setEditingId(c.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async () => {
    if (!form.patientId.trim()) { setFormError('Patient ID is required'); return; }
    if (!form.consentGivenBy.trim()) { setFormError('Consent given by is required'); return; }
    if (!form.doctorName.trim()) { setFormError('Doctor name is required'); return; }
    if (!form.description.trim()) { setFormError('Description is required'); return; }
    setFormError('');
    try {
      if (editingId) {
        await api.patch(`/consents/${editingId}`, form);
        toast.success('Consent updated successfully');
      } else {
        await api.post('/consents', form);
        toast.success('Consent recorded successfully');
      }
      resetForm();
      fetchData();
    } catch (err) { toast.error(editingId ? 'Failed to update consent' : 'Failed to record consent'); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete this consent record?')) return; try { await api.delete(`/consents/${id}`); toast.success('Consent deleted'); fetchData(); } catch (err) { toast.error('Failed to delete consent'); } };
  const handleRevoke = (id: string) => { setRevokeId(id); setRevokeReason(''); };
  const confirmRevoke = async () => { if (!revokeId || !revokeReason.trim()) return; try { await api.patch(`/consents/${revokeId}/revoke`, { reason: revokeReason }); toast.success('Consent revoked'); fetchData(); } catch (err) { toast.error('Failed to revoke consent'); } finally { setRevokeId(null); setRevokeReason(''); } };

  const handlePrintConsent = (c: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const consentDate = c.consentDate ? new Date(c.consentDate).toLocaleDateString() : '—';
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Patient Consent Form</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 1.5cm; color: #111; }
    h1 { color: #0F766E; font-size: 22px; margin: 0; }
    h2 { font-size: 14px; letter-spacing: 1px; margin: 4px 0 0; color: #333; }
    hr { border: none; border-top: 2px solid #0F766E; margin: 12px 0; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 14px; margin-bottom: 18px; }
    .detail-item { font-size: 12px; }
    .detail-label { font-weight: bold; color: #555; margin-bottom: 2px; }
    .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0F766E; margin: 16px 0 6px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    .section-body { font-size: 12px; color: #333; line-height: 1.6; }
    .patient-statement { background: #f3f3f3; border-left: 4px solid #0F766E; padding: 12px 16px; border-radius: 4px; font-size: 12px; line-height: 1.7; margin: 18px 0; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin: 28px 0 10px; }
    .sig-box { text-align: center; font-size: 12px; }
    .sig-line { border-top: 1px solid #333; margin-bottom: 4px; margin-top: 40px; }
    .sig-name { color: #555; }
    .datetime-row { font-size: 12px; margin-top: 10px; display: flex; gap: 40px; }
    @media print { body { margin: 1.5cm; } }
  </style>
</head>
<body>
  <h1>AYPHEN HMS</h1>
  <h2>PATIENT CONSENT FORM</h2>
  <hr />
  <div class="details-grid">
    <div class="detail-item"><div class="detail-label">Consent Type</div><div>${c.consentType || '—'}</div></div>
    <div class="detail-item"><div class="detail-label">Procedure Name</div><div>${c.procedureName || '—'}</div></div>
    <div class="detail-item"><div class="detail-label">Patient ID</div><div>${c.patientId || '—'}</div></div>
    <div class="detail-item"><div class="detail-label">Doctor Name</div><div>${c.doctorName || '—'}</div></div>
    <div class="detail-item"><div class="detail-label">Consent Given By</div><div>${c.consentGivenBy || '—'}</div></div>
    <div class="detail-item"><div class="detail-label">Relationship</div><div>${c.relationship || '—'}</div></div>
    <div class="detail-item"><div class="detail-label">Witness</div><div>${c.witnessName || '—'}</div></div>
    <div class="detail-item"><div class="detail-label">Date</div><div>${consentDate}</div></div>
  </div>
  <div class="section-title">Description of Procedure</div>
  <div class="section-body">${c.description || '—'}</div>
  <div class="section-title">Risks and Complications</div>
  <div class="section-body">${c.risks || '—'}</div>
  <div class="section-title">Alternatives</div>
  <div class="section-body">${c.alternatives || '—'}</div>
  <div class="patient-statement">
    I, <strong>${c.consentGivenBy || '___________'}</strong>, ${c.relationship ? c.relationship + ' to patient,' : ''} hereby give my informed consent for the procedure described above. I confirm that I have read and understood the above information and have had the opportunity to ask questions.
  </div>
  <div class="sig-grid">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-name">Patient / Guardian Signature<br/>${c.consentGivenBy || ''}</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-name">Doctor Signature<br/>${c.doctorName || ''}</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-name">Witness Signature<br/>${c.witnessName || ''}</div></div>
  </div>
  <div class="datetime-row"><span>Date: ___________</span><span>Time: ___________</span></div>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const active = consents.filter(c => c.status === 'SIGNED').length;
  const revoked = consents.filter(c => c.status === 'REVOKED').length;
  const today = consents.filter(c => new Date(c.consentDate).toDateString() === new Date().toDateString()).length;
  const displayedConsents = consents.slice((page - 1) * 20, page * 20);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Consent Management" subtitle="Track patient consent forms" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Consents" value={consents.length} icon={FileText} color="#3B82F6" />
          <KpiCard label="Active" value={active} icon={FileCheck} color="#10B981" />
          <KpiCard label="Revoked" value={revoked} icon={XCircle} color="#EF4444" />
          <KpiCard label="Today" value={today} icon={Clock} color="#F59E0B" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => { if (showForm && !editingId) { resetForm(); } else { setEditingId(null); setForm({ ...emptyForm }); setFormError(''); setShowForm(true); } }} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ New Consent</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">{editingId ? 'Edit Consent' : 'Record Consent'}</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect value={form.patientId} onChange={(id) => setForm({ ...form, patientId: id })} placeholder="Search patient *" endpoint="/patients" searchParam="q" mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })} />
            <select className="hms-input" value={form.consentType} onChange={e => setForm({ ...form, consentType: e.target.value })}><option value="GENERAL">General</option><option value="SURGICAL">Surgical</option><option value="ANESTHESIA">Anesthesia</option><option value="BLOOD_TRANSFUSION">Blood Transfusion</option><option value="RESEARCH">Research</option></select>
            <input className="hms-input" placeholder="Procedure Name" value={form.procedureName} onChange={e => setForm({ ...form, procedureName: e.target.value })} />
            <input className="hms-input" placeholder="Consent Given By *" value={form.consentGivenBy} onChange={e => setForm({ ...form, consentGivenBy: e.target.value })} />
            <input className="hms-input" placeholder="Relationship" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} />
            <input className="hms-input" placeholder="Doctor Name *" value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} />
            <input className="hms-input" placeholder="Witness Name" value={form.witnessName} onChange={e => setForm({ ...form, witnessName: e.target.value })} />
          </div><textarea className="hms-input w-full" placeholder="Description *" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2"><button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>{editingId ? 'Update' : 'Save'}</button><button onClick={resetForm} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Type</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Procedure</th><th className="text-left p-3 font-medium text-gray-600">Doctor</th><th className="text-left p-3 font-medium text-gray-600">Given By</th><th className="text-left p-3 font-medium text-gray-600">Date</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
      ) : consents.length === 0 ? (
        <tr><td colSpan={8}><EmptyState icon={<FileCheck size={24} className="text-gray-400" />} title="No consent records" description="Record patient consent forms here" /></td></tr>
      ) : displayedConsents.map(c => (
        <tr key={c.id} className="border-b hover:bg-gray-50">
          <td className="p-3"><StatusBadge status={c.consentType} /></td>
          <td className="p-3">{c.patientId}</td><td className="p-3">{c.procedureName || '—'}</td>
          <td className="p-3">{c.doctorName}</td><td className="p-3">{c.consentGivenBy}</td>
          <td className="p-3">{new Date(c.consentDate).toLocaleDateString()}</td>
          <td className="p-3"><StatusBadge status={c.status} /></td>
          <td className="p-3">
            <div className="flex gap-1.5">
              {c.status === 'PENDING' && (
                <button onClick={() => editRecord(c)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium" title="Edit consent"><Pencil size={13} className="inline mr-0.5" />Edit</button>
              )}
              {c.status === 'SIGNED' && <button onClick={() => handleRevoke(c.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">Revoke</button>}
              {(c.status === 'ACTIVE' || c.status === 'SIGNED') && (
                <button onClick={() => handlePrintConsent(c)} className="p-1.5 rounded hover:bg-purple-50 text-purple-500 hover:text-purple-700" title="Print Consent Form"><Printer size={14} /></button>
              )}
              <button onClick={() => handleDelete(c.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete consent"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
      ))}</tbody></table>
        <Pagination page={page} totalPages={Math.ceil(consents.length / 20)} onPageChange={setPage} totalItems={consents.length} pageSize={20} />
      </div>
      {revokeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Revoke Consent</h3>
            <textarea className="w-full border rounded-lg p-2 mb-4" rows={3} value={revokeReason} onChange={e => setRevokeReason(e.target.value)} placeholder="Reason for revocation..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRevokeId(null); setRevokeReason(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmRevoke} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
