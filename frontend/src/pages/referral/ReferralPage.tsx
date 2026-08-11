import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitBranch, Clock, CheckCircle, Users, GitPullRequest, Pencil, Trash2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import SearchableSelect from '../../components/ui/SearchableSelect';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { patientId: '', toDepartmentId: '', toDepartmentName: '', toDoctorId: '', toDoctorName: '',
  reason: '', urgency: 'ROUTINE', clinicalNotes: '',
  // Columns the schema always had but nothing ever wrote.
  referralType: 'INTERNAL', diagnosis: '', toLocationId: '', extFacility: '', extDoctor: '' };

export default function ReferralPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  // Deep link from the doctor's consultation: /app/referral?patientId=…&patientName=…
  // opens the form with the patient already chosen, so a doctor doesn't have to
  // leave the consult and search for them again.
  const [searchParams] = useSearchParams();
  const linkedPatientId = searchParams.get('patientId') || '';
  const linkedPatientName = searchParams.get('patientName') || '';

  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  // Decline and Complete both PATCHed with no body, so declinedReason and
  // consultationNotes were always stored null even though the columns and the
  // service support them. Capture the outcome before sending.
  const [outcome, setOutcome] = useState<{ id: string; mode: 'decline' | 'complete' } | null>(null);
  const [outcomeText, setOutcomeText] = useState('');
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  // Referral.appointmentId existed from the start but nothing ever wrote it,
  // so a referral could not be tied to the visit it produced.
  const [apptLink, setApptLink] = useState<any>(null);
  const [apptOptions, setApptOptions] = useState<any[]>([]);
  const [apptChoice, setApptChoice] = useState('');
  const [apptSaving, setApptSaving] = useState(false);

  const openApptLink = async (r: any) => {
    setApptLink(r); setApptChoice(r.appointmentId || ''); setApptOptions([]);
    try {
      const { data } = await api.get('/appointments', { params: { patientId: r.patientId, limit: 50 } });
      setApptOptions(data.data || []);
    } catch { toast.error('Could not load appointments for this patient'); }
  };

  const saveApptLink = async () => {
    if (!apptLink) return;
    setApptSaving(true);
    try {
      await api.patch(`/referrals/${apptLink.id}/appointment`, { appointmentId: apptChoice || null });
      toast.success(apptChoice ? 'Appointment linked' : 'Appointment unlinked');
      setApptLink(null); fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to link appointment');
    } finally { setApptSaving(false); }
  };

  const handlePrintReferral = (r: any) => {
    const urgencyColor = (u: string) => u === 'EMERGENCY' ? '#DC2626' : u === 'URGENT' ? '#EA580C' : '#16A34A';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Referral Letter</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px;}h1,h2{margin:0;}table{width:100%;border-collapse:collapse;}td,th{padding:7px 10px;border:1px solid #ddd;}th{background:#f3f4f6;font-weight:600;text-align:left;}@media print{body{padding:20px;}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div><h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1><h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">REFERRAL LETTER</h2></div>
      <div style="text-align:right;font-size:11px;color:#555;">Printed: ${new Date().toLocaleString()}</div>
    </div>
    <hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div style="border:1px solid #e5e7eb;border-radius:4px;padding:12px;">
        <div style="font-weight:700;color:#0F766E;margin-bottom:6px;font-size:12px;text-transform:uppercase;">To,</div>
        <div style="font-weight:600;">${r.referredTo || r.toDoctorId || '—'}</div>
        <div style="color:#555;font-size:12px;">${r.specialty || r.toDepartmentId || '—'}</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:4px;padding:12px;">
        <div style="font-weight:700;color:#0F766E;margin-bottom:6px;font-size:12px;text-transform:uppercase;">From,</div>
        <div style="font-weight:600;">${r.referringDoctor || r.fromDoctorId || '—'}</div>
        <div style="color:#555;font-size:12px;">${r.fromDepartment || r.fromDepartmentId || '—'}</div>
        <div style="color:#555;font-size:12px;">Date: ${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
      </div>
    </div>
    <table style="margin-bottom:16px;">
      <tr><td style="width:25%;background:#f9fafb;font-weight:600;">Referral #</td><td>${r.referralNumber || (r.id || '').slice(0,8).toUpperCase()}</td><td style="width:25%;background:#f9fafb;font-weight:600;">Date</td><td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Patient Name</td><td>${r.patientName || '—'}</td><td style="background:#f9fafb;font-weight:600;">Patient ID</td><td>${r.patientMrn || '—'}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Referred To</td><td>${[r.referredToDeptName, r.referredToDoctorName].filter(Boolean).join(' — ') || '—'}${r.referredToLocationName ? ` (${r.referredToLocationName})` : ''}</td><td style="background:#f9fafb;font-weight:600;">Type</td><td>${r.referralType === 'EXTERNAL' ? 'External' : 'Internal'}${r.urgency && r.urgency !== 'ROUTINE' ? ` · ${r.urgency}` : ''}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Diagnosis</td><td colspan="3">${r.diagnosis || '—'}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Age / Gender</td><td>${r.patientAge != null ? r.patientAge + 'y' : '—'}${r.patient?.gender ? ' / ' + r.patient.gender : ''}</td><td style="background:#f9fafb;font-weight:600;">Contact</td><td>${r.patient?.mobile || '—'}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Diagnosis</td><td>${r.diagnosis || '—'}</td><td style="background:#f9fafb;font-weight:600;">Urgency</td><td><span style="color:${urgencyColor(r.urgency)};font-weight:700;">${r.urgency || 'ROUTINE'}</span></td></tr>
    </table>
    <div style="font-weight:700;margin-bottom:6px;color:#0F766E;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Reason for Referral</div>
    <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:4px;padding:10px;margin-bottom:14px;">${r.reason || '—'}</div>
    ${r.clinicalNotes ? `<div style="font-weight:700;margin-bottom:6px;color:#0F766E;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Clinical Summary / Notes</div><div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:4px;padding:10px;margin-bottom:14px;">${r.clinicalNotes}</div>` : ''}
    ${r.currentMedications ? `<div style="font-weight:700;margin-bottom:6px;color:#0F766E;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Current Medications</div><div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:4px;padding:10px;margin-bottom:14px;">${r.currentMedications}</div>` : ''}
    ${r.investigationsDone ? `<div style="font-weight:700;margin-bottom:6px;color:#0F766E;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Investigations Done</div><div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:4px;padding:10px;margin-bottom:14px;">${r.investigationsDone}</div>` : ''}
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;padding:12px;margin-bottom:14px;"><strong>Request:</strong> Please review and manage this patient for ${r.reason || 'the referred condition'}.</div>
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;border-top:1px solid #ddd;padding-top:20px;">
      <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Referring Doctor</div></div>
      <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Date</div></div>
      <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Stamp</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

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

  useEffect(() => {
    if (!linkedPatientId) return;
    setForm(f => ({ ...f, patientId: linkedPatientId }));
    setShowForm(true);
  }, [linkedPatientId]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setFormError('');
  };

  const editRecord = (r: any) => {
    setForm({
      patientId: r.patientId || '',
      toDepartmentId: r.referredToDeptId || '',
      toDepartmentName: r.referredToDeptName || '',
      toDoctorId: r.referredToDoctorId || '',
      toDoctorName: r.referredToDoctorName || '',
      reason: r.reason || '',
      urgency: r.urgency || 'ROUTINE',
      clinicalNotes: r.clinicalSummary || '',
      referralType: r.referralType || 'INTERNAL',
      diagnosis: r.diagnosis || '',
      toLocationId: r.referredToLocationId || '',
      extFacility: r.referralType === 'EXTERNAL' ? (r.referredToDeptName || '') : '',
      extDoctor: r.referralType === 'EXTERNAL' ? (r.referredToDoctorName || '') : '',
    });
    setEditingId(r.id);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async () => {
    const isExternal = form.referralType === 'EXTERNAL';
    if (!form.patientId) { setFormError('Please select a patient'); return; }
    // An external referral goes to a facility outside this organisation, so
    // there is no department id to pick — the destination is free text.
    if (!isExternal && !form.toDepartmentId) { setFormError('Please select a department'); return; }
    if (isExternal && !form.extFacility.trim()) { setFormError('Please name the facility or department being referred to'); return; }
    if (!form.reason.trim()) { setFormError('Reason is required'); return; }
    setFormError('');
    // Map UI field names to the backend's referral schema (referredToDept*/clinicalSummary).
    const payload: Record<string, any> = {
      patientId: form.patientId,
      referralType: form.referralType,
      // External destinations have no ids — only names.
      referredToDeptId: isExternal ? undefined : (form.toDepartmentId || undefined),
      referredToDeptName: isExternal ? form.extFacility.trim() : (form.toDepartmentName || undefined),
      referredToDoctorId: isExternal ? undefined : (form.toDoctorId || undefined),
      referredToDoctorName: isExternal ? (form.extDoctor.trim() || undefined) : (form.toDoctorName || undefined),
      referredToLocationId: isExternal ? null : (form.toLocationId || null),
      reason: form.reason,
      urgency: form.urgency,
      diagnosis: form.diagnosis.trim() || undefined,
      clinicalSummary: form.clinicalNotes || undefined,
    };
    try {
      if (editingId) {
        await api.patch(`/referrals/${editingId}`, payload);
        toast.success('Referral updated successfully');
      } else {
        await api.post('/referrals', { ...payload, referringDoctorId: user?.sub, referringDoctorName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') });
        toast.success('Referral created successfully');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(editingId ? 'Failed to update referral' : 'Failed to create referral');
    }
  };

  const acceptReferral = async (id: string) => { try { await api.patch(`/referrals/${id}/accept`); toast.success('Referral accepted'); fetchData(); } catch (err) { toast.error('Failed to accept referral'); } };
  const submitOutcome = async () => {
    if (!outcome) return;
    const text = outcomeText.trim();
    // A decline that records no reason is not auditable; an outcome note on a
    // completed referral is useful but not mandatory.
    if (outcome.mode === 'decline' && !text) { toast.error('Please give a reason for declining'); return; }
    setOutcomeSaving(true);
    try {
      if (outcome.mode === 'decline') {
        await api.patch(`/referrals/${outcome.id}/decline`, { reason: text });
        toast.success('Referral declined');
      } else {
        await api.patch(`/referrals/${outcome.id}/complete`, { consultationNotes: text || undefined });
        toast.success('Referral completed');
      }
      setOutcome(null); setOutcomeText('');
      fetchData();
    } catch (err) {
      toast.error(outcome.mode === 'decline' ? 'Failed to decline referral' : 'Failed to complete referral');
    } finally { setOutcomeSaving(false); }
  };
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
          {/* Internal = another department in this organisation. External = a
              facility outside it, which has no ids to pick, only names. */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Referral type</span>
            {(['INTERNAL', 'EXTERNAL'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm({ ...form, referralType: t })}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  form.referralType === t ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-400'}`}>
                {t === 'INTERNAL' ? 'Internal' : 'External'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect
              value={form.patientId}
              onChange={(id) => setForm({ ...form, patientId: id })}
              placeholder="Search patient…"
              initialLabel={linkedPatientName || undefined}
              label="Patient"
              required
              endpoint="/patients"
              searchParam="q"
              mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })}
            />
            {form.referralType === 'EXTERNAL' ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Facility / Department<span className="text-red-500 ml-0.5">*</span></label>
                <input className="hms-input w-full" placeholder="e.g. Apollo Cardiology"
                  value={form.extFacility} onChange={e => setForm({ ...form, extFacility: e.target.value })} />
              </div>
            ) : (
            <SearchableSelect
              value={form.toDepartmentId}
              onChange={(id, opt) => setForm({ ...form, toDepartmentId: id, toDepartmentName: opt?.label || '' })}
              placeholder="Select department…"
              label="To Department"
              required
              endpoint="/org/departments"
              mapOption={(d: any) => ({ id: d.id, label: d.name, sub: d.code })}
            />)}
            {form.referralType === 'EXTERNAL' ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">External Doctor</label>
                <input className="hms-input w-full" placeholder="e.g. Dr. S. Menon"
                  value={form.extDoctor} onChange={e => setForm({ ...form, extDoctor: e.target.value })} />
              </div>
            ) : (
            <SearchableSelect
              value={form.toDoctorId}
              onChange={(id, opt) => setForm({ ...form, toDoctorId: id, toDoctorName: opt?.label || '' })}
              placeholder="Select doctor…"
              label="To Doctor"
              endpoint="/doctors"
              searchParam="q"
              mapOption={(d: any) => ({ id: d.id, label: `Dr. ${d.firstName} ${d.lastName}`, sub: d.pgSpecialization || d.specialization })}
            />)}
            {form.referralType === 'INTERNAL' && (
              <SearchableSelect
                value={form.toLocationId}
                onChange={(id) => setForm({ ...form, toLocationId: id })}
                placeholder="Same site…"
                label="To Location"
                endpoint="/org/locations"
                mapOption={(l: any) => ({ id: l.id, label: l.name, sub: l.city || l.code })}
              />
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Diagnosis</label>
              <input className="hms-input w-full" placeholder="Working diagnosis"
                value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
            </div>
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
          {/* r.patientId is the Patient PK (a UUID) — it used to be rendered
              raw here. The API now resolves the name and MRN alongside it. */}
          <td className="p-3">
            <div className="font-medium text-gray-900">{r.patientName || '—'}</div>
            {r.patientMrn && <div className="text-xs text-gray-400">{r.patientMrn}</div>}
          </td>
          <td className="p-3">
            <div>{r.referredToDeptName || r.referredToDeptId || '—'}</div>
            <div className="text-xs text-gray-400">
              {r.referralType === 'EXTERNAL' && <span className="text-cyan-700 font-medium">External</span>}
              {r.referralType === 'EXTERNAL' && r.referredToLocationName ? ' · ' : ''}
              {r.referredToLocationName || ''}
            </div>
          </td>
          <td className="p-3 max-w-[150px] truncate">{r.reason}</td>
          <td className="p-3"><StatusBadge status={r.urgency || 'ROUTINE'} /></td>
          <td className="p-3"><StatusBadge status={r.status} /></td>
          <td className="p-3">
            <div className="flex gap-1.5">
              {r.status === 'PENDING' && <>
                <button onClick={() => editRecord(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium" title="Edit referral"><Pencil size={13} className="inline mr-0.5" />Edit</button>
                <button onClick={() => acceptReferral(r.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Accept</button>
                <button onClick={() => { setOutcome({ id: r.id, mode: 'decline' }); setOutcomeText(''); }} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">Decline</button>
                <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete referral"><Trash2 size={14} /></button>
              </>}
              {r.status === 'ACCEPTED' && (
                <button onClick={() => { setOutcome({ id: r.id, mode: 'complete' }); setOutcomeText(''); }} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Complete</button>
              )}
              {['PENDING', 'ACCEPTED'].includes(r.status) && (
                <button onClick={() => openApptLink(r)}
                  className="text-xs px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 font-medium">
                  {r.appointmentId ? 'Appt \u2713' : 'Link Appt'}
                </button>
              )}
              <button onClick={() => handlePrintReferral(r)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} />Print</button>
            </div>
          </td>
        </tr>
      ))}</tbody></table>
      {apptLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
             role="dialog" aria-modal="true" aria-label="Link appointment">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Link appointment</h3>
            <p className="text-sm text-gray-500">
              Tie {apptLink.referralNumber} to the appointment booked for {apptLink.patientName || 'this patient'}.
            </p>
            {apptOptions.length === 0 ? (
              <p className="text-sm text-gray-400">No appointments found for this patient.</p>
            ) : (
              <select className="hms-input w-full" value={apptChoice} onChange={e => setApptChoice(e.target.value)}>
                <option value="">&mdash; Not linked &mdash;</option>
                {apptOptions.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.appointmentDate).toLocaleDateString()} {a.appointmentTime || ''} · {a.status}
                  </option>
                ))}
              </select>
            )}
            <div className="flex justifyate-end gap-2 justify-end">
              <button onClick={() => setApptLink(null)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
              <button onClick={saveApptLink} disabled={apptSaving}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-60" style={{ background: 'var(--accent)' }}>
                {apptSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {outcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
             role="dialog" aria-modal="true" aria-label={outcome.mode === 'decline' ? 'Decline referral' : 'Complete referral'}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">
              {outcome.mode === 'decline' ? 'Decline referral' : 'Complete referral'}
            </h3>
            <p className="text-sm text-gray-500">
              {outcome.mode === 'decline'
                ? 'Record why this referral is being declined. This is stored on the referral record.'
                : 'Add the consultation outcome for this referral. Optional.'}
            </p>
            <textarea
              autoFocus
              rows={4}
              value={outcomeText}
              onChange={e => setOutcomeText(e.target.value)}
              placeholder={outcome.mode === 'decline' ? 'Reason for declining *' : 'Consultation notes'}
              className="hms-input w-full"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setOutcome(null); setOutcomeText(''); }}
                className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
              <button onClick={submitOutcome} disabled={outcomeSaving}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-60"
                style={{ background: outcome.mode === 'decline' ? '#B91C1C' : 'var(--accent)' }}>
                {outcomeSaving ? 'Saving…' : outcome.mode === 'decline' ? 'Decline' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={Math.ceil(referrals.length / 20)} onPageChange={setPage} totalItems={referrals.length} pageSize={20} />
      </div>
    </div>
  );
}
