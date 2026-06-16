import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, CheckCircle, Clock, AlertTriangle, Eye, Edit2, X, Printer, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import SearchableSelect from '../../components/ui/SearchableSelect';
import api from '../../lib/api';

export default function DischargeSummaryPage() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    admissionId: '', patientId: '', doctorId: '', admissionDate: '', dischargeDate: '',
    diagnosisOnAdmission: '', diagnosisOnDischarge: '', treatmentGiven: '',
    investigationSummary: '', conditionAtDischarge: '', followUpInstructions: '',
    followUpDate: '', dietaryAdvice: '', activityRestrictions: '',
  });
  const [formError, setFormError] = useState('');
  const [admissionMeta, setAdmissionMeta] = useState<any>(null);

  // When the admission picker changes, fetch the admission and auto-fill
  // patient/doctor + dates so the user cannot select a mismatched patient.
  useEffect(() => {
    let cancelled = false;
    if (!form.admissionId) {
      setAdmissionMeta(null);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get(`/admissions/${form.admissionId}`);
        const a = data?.data || data;
        if (cancelled || !a) return;
        setAdmissionMeta(a);
        const isoDate = (v: any) => v ? new Date(v).toISOString().slice(0, 10) : '';
        setForm(f => ({
          ...f,
          patientId: a.patientId || f.patientId,
          doctorId: a.admittingDoctorId || f.doctorId,
          admissionDate: isoDate(a.admissionDate) || f.admissionDate,
          dischargeDate: f.dischargeDate || isoDate(a.dischargeDate),
          diagnosisOnAdmission: f.diagnosisOnAdmission || a.diagnosisOnAdmission || '',
        }));
      } catch (err) {
        if (!cancelled) setAdmissionMeta(null);
      }
    })();
    return () => { cancelled = true; };
  }, [form.admissionId]);

  // AI draft: gemini fills the form fields based on admission data; doctor
  // reviews + edits before clicking Create Draft. Button only shows once
  // an admission has been picked.
  const [aiDrafting, setAiDrafting] = useState(false);
  const aiFillFromAdmission = async () => {
    if (!form.admissionId) { toast.error('Pick an admission first'); return; }
    setAiDrafting(true);
    try {
      const { data } = await api.post(`/discharge-summary/admission/${form.admissionId}/draft-with-ai`);
      const d = data?.draft;
      if (!d) {
        toast.error(data?.warning || 'AI could not produce a structured draft');
        return;
      }
      // Merge AI fields into the form. Dates from BE come as ISO strings;
      // <input type="date"> wants YYYY-MM-DD.
      const isoDate = (v: any) => v ? new Date(v).toISOString().slice(0, 10) : '';
      const meds = Array.isArray(d.dischargeMedications)
        ? d.dischargeMedications.map((m: any) => `${m.drug || ''} — ${m.dosage || ''} ${m.frequency || ''}${m.duration ? ' x ' + m.duration : ''}`).join('\n')
        : '';
      setForm(f => ({
        ...f,
        patientId: d.patientId || f.patientId,
        doctorId: d.doctorId || f.doctorId,
        admissionDate: isoDate(d.admissionDate) || f.admissionDate,
        dischargeDate: isoDate(d.dischargeDate) || f.dischargeDate,
        diagnosisOnAdmission: d.diagnosisOnAdmission || f.diagnosisOnAdmission,
        diagnosisOnDischarge: d.diagnosisOnDischarge || f.diagnosisOnDischarge,
        treatmentGiven: d.treatmentGiven || f.treatmentGiven,
        investigationSummary: d.investigationSummary || f.investigationSummary,
        conditionAtDischarge: d.conditionAtDischarge || f.conditionAtDischarge,
        followUpInstructions: [d.followUpInstructions, meds && `\n\nDischarge medications:\n${meds}`].filter(Boolean).join('') || f.followUpInstructions,
        dietaryAdvice: d.dietaryAdvice || f.dietaryAdvice,
        activityRestrictions: d.activityRestrictions || f.activityRestrictions,
      }));
      toast.success('AI draft applied — review every field before saving');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'AI draft failed');
    } finally {
      setAiDrafting(false);
    }
  };

  // View detail modal
  const [viewDetail, setViewDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit modal
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    diagnosisOnAdmission: '', diagnosisOnDischarge: '', treatmentGiven: '',
    investigationSummary: '', conditionAtDischarge: '', followUpInstructions: '',
    followUpDate: '', dietaryAdvice: '', activityRestrictions: '', dischargeDate: '',
    dischargeMedications: '', proceduresPerformed: '',
  });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handlePrintDischarge = (d: any) => {
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;
    const duration = d.admissionDate && d.dischargeDate
      ? Math.ceil((new Date(d.dischargeDate).getTime() - new Date(d.admissionDate).getTime()) / 86400000)
      : null;
    const html = `<!DOCTYPE html><html><head><title>Discharge Summary</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    .header { text-align: center; border-bottom: 3px double #0F766E; padding-bottom: 16px; margin-bottom: 20px; }
    .hospital-name { font-size: 22px; font-weight: 900; color: #0F766E; letter-spacing: 1px; }
    .doc-title { font-size: 16px; font-weight: 700; letter-spacing: 2px; margin-top: 4px; color: #333; }
    .doc-meta { font-size: 11px; color: #666; margin-top: 6px; }
    .section { margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .section-title { background: #f0fdfa; color: #0F766E; font-weight: 700; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 12px; border-bottom: 1px solid #e5e7eb; }
    .section-body { padding: 10px 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .field label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
    .field p { font-size: 13px; color: #111; margin-top: 2px; }
    .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1px solid #333; margin-bottom: 6px; margin-top: 40px; }
    .sig-label { font-size: 11px; color: #555; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <div class="header">
    <div class="hospital-name">AYPHEN HMS</div>
    <div class="doc-title">DISCHARGE SUMMARY</div>
    <div class="doc-meta">
      Status: ${d.status || '—'} &nbsp;|&nbsp;
      ${d.approvedAt ? 'Approved: ' + new Date(d.approvedAt).toLocaleDateString('en-IN') : 'Draft — Not yet approved'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="section-body grid-3">
      <div class="field"><label>Patient ID</label><p>${d.patientId?.slice(0,8) || '—'}...</p></div>
      <div class="field"><label>Admission Date</label><p>${d.admissionDate ? new Date(d.admissionDate).toLocaleDateString('en-IN') : '—'}</p></div>
      <div class="field"><label>Discharge Date</label><p>${d.dischargeDate ? new Date(d.dischargeDate).toLocaleDateString('en-IN') : '—'}</p></div>
      ${duration !== null ? `<div class="field"><label>Duration</label><p>${duration} day${duration !== 1 ? 's' : ''}</p></div>` : ''}
      <div class="field"><label>Doctor ID</label><p>${d.doctorId?.slice(0,8) || '—'}...</p></div>
      <div class="field"><label>Condition at Discharge</label><p>${d.conditionAtDischarge || '—'}</p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Diagnosis</div>
    <div class="section-body">
      <div class="field" style="margin-bottom:8px"><label>On Admission</label><p>${d.diagnosisOnAdmission || '—'}</p></div>
      <div class="field"><label>On Discharge</label><p>${d.diagnosisOnDischarge || '—'}</p></div>
    </div>
  </div>

  ${d.treatmentGiven || d.proceduresPerformed ? `
  <div class="section">
    <div class="section-title">Treatment & Procedures</div>
    <div class="section-body grid-2">
      ${d.treatmentGiven ? `<div class="field"><label>Treatment Given</label><p style="white-space:pre-line">${d.treatmentGiven}</p></div>` : ''}
      ${d.proceduresPerformed ? `<div class="field"><label>Procedures Performed</label><p style="white-space:pre-line">${d.proceduresPerformed}</p></div>` : ''}
    </div>
  </div>` : ''}

  ${d.investigationSummary ? `
  <div class="section">
    <div class="section-title">Investigation Summary</div>
    <div class="section-body"><div class="field"><p style="white-space:pre-line">${d.investigationSummary}</p></div></div>
  </div>` : ''}

  ${d.dischargeMedications ? `
  <div class="section">
    <div class="section-title">Discharge Medications</div>
    <div class="section-body"><div class="field"><p style="white-space:pre-line">${d.dischargeMedications}</p></div></div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Instructions & Follow-up</div>
    <div class="section-body grid-2">
      ${d.dietaryAdvice ? `<div class="field"><label>Dietary Advice</label><p>${d.dietaryAdvice}</p></div>` : ''}
      ${d.activityRestrictions ? `<div class="field"><label>Activity Restrictions</label><p>${d.activityRestrictions}</p></div>` : ''}
      ${d.followUpInstructions ? `<div class="field"><label>Follow-up Instructions</label><p>${d.followUpInstructions}</p></div>` : ''}
      ${d.followUpDate ? `<div class="field"><label>Follow-up Date</label><p>${new Date(d.followUpDate).toLocaleDateString('en-IN')}</p></div>` : ''}
    </div>
  </div>

  <div class="signature-row">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Doctor's Signature</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Hospital Seal & Authorized Signatory</div></div>
  </div>

  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  };

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/discharge-summary');
      setSummaries(data.data || data || []);
    } catch (err) { toast.error('Failed to load discharge summaries'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSummaries(); }, []);

  const drafts = summaries.filter(s => s.status === 'DRAFT').length;
  const approved = summaries.filter(s => s.status === 'APPROVED').length;

  const handleCreate = async () => {
    setFormError('');
    if (!form.admissionId.trim()) { setFormError('Admission ID is required.'); return; }
    if (!form.patientId.trim()) { setFormError('Patient ID is required.'); return; }
    if (!form.doctorId.trim()) { setFormError('Doctor ID is required.'); return; }
    if (!form.admissionDate) { setFormError('Admission date is required.'); return; }
    if (!form.diagnosisOnAdmission.trim()) { setFormError('Diagnosis on admission is required.'); return; }
    if (form.dischargeDate && form.admissionDate && new Date(form.dischargeDate) < new Date(form.admissionDate)) {
      setFormError('Discharge date cannot be before admission date.'); return;
    }
    if (form.followUpDate && form.dischargeDate && new Date(form.followUpDate) < new Date(form.dischargeDate)) {
      setFormError('Follow-up date should be after discharge date.'); return;
    }
    try {
      await api.post('/discharge-summary', form);
      toast.success('Discharge summary created');
      setShowForm(false);
      setForm({ admissionId: '', patientId: '', doctorId: '', admissionDate: '', dischargeDate: '', diagnosisOnAdmission: '', diagnosisOnDischarge: '', treatmentGiven: '', investigationSummary: '', conditionAtDischarge: '', followUpInstructions: '', followUpDate: '', dietaryAdvice: '', activityRestrictions: '' });
      setAdmissionMeta(null);
      fetchSummaries();
    } catch (err) { toast.error('Failed to create discharge summary'); }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/discharge-summary/${id}/approve`);
      toast.success('Discharge summary approved');
      fetchSummaries();
    } catch (err) { toast.error('Failed to approve discharge summary'); }
  };

  const handleView = async (id: string) => {
    setDetailLoading(true);
    setViewDetail({ id });
    try {
      const { data } = await api.get(`/discharge-summary/${id}`);
      setViewDetail(data.data || data);
    } catch (err) {
      toast.error('Failed to load discharge summary details');
      setViewDetail(null);
    } finally { setDetailLoading(false); }
  };

  const handleOpenEdit = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/discharge-summary/${id}`);
      const d = data.data || data;
      setEditItem(d);
      setEditForm({
        diagnosisOnAdmission: d.diagnosisOnAdmission || '',
        diagnosisOnDischarge: d.diagnosisOnDischarge || '',
        treatmentGiven: d.treatmentGiven || '',
        investigationSummary: d.investigationSummary || '',
        conditionAtDischarge: d.conditionAtDischarge || '',
        followUpInstructions: d.followUpInstructions || '',
        followUpDate: d.followUpDate ? d.followUpDate.slice(0, 10) : '',
        dietaryAdvice: d.dietaryAdvice || '',
        activityRestrictions: d.activityRestrictions || '',
        dischargeDate: d.dischargeDate ? d.dischargeDate.slice(0, 10) : '',
        dischargeMedications: d.dischargeMedications || '',
        proceduresPerformed: d.proceduresPerformed || '',
      });
      setEditError('');
    } catch (err) {
      toast.error('Failed to load discharge summary for editing');
    } finally { setDetailLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setEditError('');
    if (!editForm.diagnosisOnAdmission.trim()) { setEditError('Diagnosis on admission is required.'); return; }
    setEditSubmitting(true);
    try {
      await api.patch(`/discharge-summary/${editItem.id}`, editForm);
      toast.success('Discharge summary updated');
      setEditItem(null);
      fetchSummaries();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update discharge summary');
    } finally { setEditSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Discharge Summaries" subtitle="Prepare and approve patient discharge summaries" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total" value={summaries.length} icon={FileText} color="#3B82F6" />
        <KpiCard label="Drafts" value={drafts} icon={Clock} color="#F59E0B" />
        <KpiCard label="Approved" value={approved} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Pending Review" value={summaries.length - drafts - approved} icon={AlertTriangle} color="#EF4444" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
          + New Discharge Summary
        </button>
      </div>

      {showForm && (
        <div className="hms-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900">Create Discharge Summary</h3>
            {form.admissionId && (
              <button
                type="button"
                onClick={aiFillFromAdmission}
                disabled={aiDrafting}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)' }}
              >
                {aiDrafting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiDrafting ? 'Drafting with AI…' : 'Generate Draft with AI'}
              </button>
            )}
          </div>
          {form.admissionId && !aiDrafting && (
            <div className="text-[11px] text-gray-500 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
              AI uses the patient's consultations, prescriptions and lab orders during this admission to draft the fields. Review every field — the doctor is responsible for the final content.
            </div>
          )}
          {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect value={form.admissionId} onChange={(id) => setForm({ ...form, admissionId: id })} placeholder="Search admission *" endpoint="/admissions" searchParam="q" mapOption={(a: any) => ({ id: a.id, label: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : a.id, sub: `Bed ${a.bed?.bedNumber || '?'}` })} />
            {admissionMeta ? (
              <div className="md:col-span-2 bg-teal-50 border border-teal-100 rounded-lg p-3 text-sm">
                <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 border border-purple-100 rounded px-2 py-0.5 mb-1.5">
                  <CheckCircle2 size={12} /> Auto-filled from admission
                </div>
                <div className="text-gray-800">
                  <span className="font-medium">Patient:</span>{' '}
                  {admissionMeta.patient
                    ? `${admissionMeta.patient.firstName || ''} ${admissionMeta.patient.lastName || ''}`.trim() || '—'
                    : '—'}
                  {' '}&nbsp;•&nbsp;{' '}
                  <span className="font-medium">Admitting Doctor:</span>{' '}
                  {admissionMeta.admittingDoctor
                    ? `Dr ${admissionMeta.admittingDoctor.firstName || ''} ${admissionMeta.admittingDoctor.lastName || ''}`.trim()
                      + (admissionMeta.admittingDoctor.pgSpecialization ? ` · ${admissionMeta.admittingDoctor.pgSpecialization}` : '')
                    : '(linked to this admission)'}
                </div>
              </div>
            ) : (
              <>
                <SearchableSelect value={form.patientId} onChange={(id) => setForm({ ...form, patientId: id })} placeholder="Search patient *" endpoint="/patients" searchParam="q" mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })} />
                <SearchableSelect value={form.doctorId} onChange={(id) => setForm({ ...form, doctorId: id })} placeholder="Search doctor *" endpoint="/doctors/affiliations/tenant" searchParam="q" mapOption={(d: any) => ({ id: d.doctorId || d.id, label: `Dr. ${d.doctor?.firstName || d.firstName || ''} ${d.doctor?.lastName || d.lastName || ''}`, sub: d.doctor?.specialization || d.specialization || '' })} />
              </>
            )}
            <div><label className="text-xs text-gray-500">Admission Date *</label><input className="hms-input w-full" type="date" value={form.admissionDate} onChange={e => setForm({ ...form, admissionDate: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Discharge Date</label><input className="hms-input w-full" type="date" value={form.dischargeDate} onChange={e => setForm({ ...form, dischargeDate: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Follow-up Date</label><input className="hms-input w-full" type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} /></div>
          </div>
          <textarea className="hms-input w-full" placeholder="Diagnosis on Admission *" rows={2} value={form.diagnosisOnAdmission} onChange={e => setForm({ ...form, diagnosisOnAdmission: e.target.value })} />
          <textarea className="hms-input w-full" placeholder="Diagnosis on Discharge" rows={2} value={form.diagnosisOnDischarge} onChange={e => setForm({ ...form, diagnosisOnDischarge: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <textarea className="hms-input" placeholder="Treatment Given" rows={3} value={form.treatmentGiven} onChange={e => setForm({ ...form, treatmentGiven: e.target.value })} />
            <textarea className="hms-input" placeholder="Investigation Summary" rows={3} value={form.investigationSummary} onChange={e => setForm({ ...form, investigationSummary: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <textarea className="hms-input" placeholder="Condition at Discharge" rows={2} value={form.conditionAtDischarge} onChange={e => setForm({ ...form, conditionAtDischarge: e.target.value })} />
            <textarea className="hms-input" placeholder="Follow-up Instructions" rows={2} value={form.followUpInstructions} onChange={e => setForm({ ...form, followUpInstructions: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <textarea className="hms-input" placeholder="Dietary Advice" rows={2} value={form.dietaryAdvice} onChange={e => setForm({ ...form, dietaryAdvice: e.target.value })} />
            <textarea className="hms-input" placeholder="Activity Restrictions" rows={2} value={form.activityRestrictions} onChange={e => setForm({ ...form, activityRestrictions: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>Create Draft</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="hms-card p-12 text-center text-gray-400">Loading...</div>
        ) : summaries.length === 0 ? (
          <div className="hms-card"><EmptyState icon={<FileText size={36} />} title="No discharge summaries" description="Create a discharge summary when a patient is ready for discharge" /></div>
        ) : summaries.map(s => (
          <div key={s.id} className="hms-card p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">Admission: {s.admissionId?.slice(0, 8)}...</h4>
                <div className="text-sm text-gray-500">
                  Admitted: {new Date(s.admissionDate).toLocaleDateString()}
                  {s.dischargeDate && ` → Discharged: ${new Date(s.dischargeDate).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {s.status}
                </span>
                <button onClick={() => handleView(s.id)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg" title="View Details">
                  <Eye size={14} />
                </button>
                {s.status === 'DRAFT' && (
                  <button onClick={() => handleOpenEdit(s.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                    <Edit2 size={14} />
                  </button>
                )}
                {s.status === 'DRAFT' && (
                  <button onClick={() => handleApprove(s.id)} className="text-sm text-green-600 hover:underline">Approve</button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700"><strong>Diagnosis:</strong> {s.diagnosisOnAdmission}</p>
            {s.conditionAtDischarge && <p className="text-sm text-gray-600 mt-1"><strong>Condition:</strong> {s.conditionAtDischarge}</p>}
            {s.followUpInstructions && <p className="text-sm text-gray-600 mt-1"><strong>Follow-up:</strong> {s.followUpInstructions}</p>}
          </div>
        ))}
      </div>

      {/* ── VIEW DETAIL MODAL ── */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Discharge Summary Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {viewDetail.admissionId ? `Admission: ${viewDetail.admissionId.slice(0, 8)}...` : 'Loading...'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintDischarge(viewDetail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                >
                  <Printer size={14} /> Print PDF
                </button>
                <button onClick={() => setViewDetail(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
            </div>
            {detailLoading ? (
              <div className="p-12 text-center text-gray-400">Loading details...</div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Status and dates header */}
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${viewDetail.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {viewDetail.status}
                  </span>
                  {viewDetail.approvedAt && (
                    <span className="text-xs text-gray-400">Approved: {new Date(viewDetail.approvedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Dates */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dates</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Admission Date</p>
                      <p className="text-sm font-medium text-gray-900">{viewDetail.admissionDate ? new Date(viewDetail.admissionDate).toLocaleDateString() : '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Discharge Date</p>
                      <p className="text-sm font-medium text-gray-900">{viewDetail.dischargeDate ? new Date(viewDetail.dischargeDate).toLocaleDateString() : '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Follow-up Date</p>
                      <p className="text-sm font-medium text-gray-900">{viewDetail.followUpDate ? new Date(viewDetail.followUpDate).toLocaleDateString() : '--'}</p>
                    </div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Diagnosis</p>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">On Admission</p>
                      <p className="text-sm text-gray-800">{viewDetail.diagnosisOnAdmission || '--'}</p>
                    </div>
                    {viewDetail.diagnosisOnDischarge && (
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-xs text-green-600 font-medium mb-1">On Discharge</p>
                        <p className="text-sm text-gray-800">{viewDetail.diagnosisOnDischarge}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treatment */}
                {(viewDetail.treatmentGiven || viewDetail.proceduresPerformed) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Treatment & Procedures</p>
                    {viewDetail.treatmentGiven && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-2">
                        <p className="text-xs text-gray-500 font-medium mb-1">Treatment Given</p>
                        <p className="text-sm text-gray-800">{viewDetail.treatmentGiven}</p>
                      </div>
                    )}
                    {viewDetail.proceduresPerformed && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 font-medium mb-1">Procedures Performed</p>
                        <p className="text-sm text-gray-800">{viewDetail.proceduresPerformed}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Medications */}
                {viewDetail.dischargeMedications && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Discharge Medications</p>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-800">{viewDetail.dischargeMedications}</p>
                    </div>
                  </div>
                )}

                {/* Investigation */}
                {viewDetail.investigationSummary && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Investigation Summary</p>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-800">{viewDetail.investigationSummary}</p>
                    </div>
                  </div>
                )}

                {/* Condition & Instructions */}
                <div className="grid grid-cols-2 gap-4">
                  {viewDetail.conditionAtDischarge && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">Condition at Discharge</p>
                      <p className="text-sm text-gray-800">{viewDetail.conditionAtDischarge}</p>
                    </div>
                  )}
                  {viewDetail.followUpInstructions && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">Follow-up Instructions</p>
                      <p className="text-sm text-gray-800">{viewDetail.followUpInstructions}</p>
                    </div>
                  )}
                </div>

                {/* Advice */}
                <div className="grid grid-cols-2 gap-4">
                  {viewDetail.dietaryAdvice && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-xs text-orange-600 font-medium mb-1">Dietary Advice</p>
                      <p className="text-sm text-gray-800">{viewDetail.dietaryAdvice}</p>
                    </div>
                  )}
                  {viewDetail.activityRestrictions && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-xs text-red-600 font-medium mb-1">Activity Restrictions</p>
                      <p className="text-sm text-gray-800">{viewDetail.activityRestrictions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT MODAL (DRAFT ONLY) ── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Edit Discharge Summary</h2>
                <p className="text-xs text-gray-400 mt-0.5">Admission: {editItem.admissionId?.slice(0, 8)}...</p>
              </div>
              <button onClick={() => setEditItem(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {editError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{editError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Discharge Date</label>
                  <input type="date" className="hms-input w-full" value={editForm.dischargeDate} onChange={e => setEditForm({ ...editForm, dischargeDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                  <input type="date" className="hms-input w-full" value={editForm.followUpDate} onChange={e => setEditForm({ ...editForm, followUpDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis on Admission <span className="text-red-500">*</span></label>
                <textarea className="hms-input w-full" rows={2} value={editForm.diagnosisOnAdmission} onChange={e => setEditForm({ ...editForm, diagnosisOnAdmission: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis on Discharge</label>
                <textarea className="hms-input w-full" rows={2} value={editForm.diagnosisOnDischarge} onChange={e => setEditForm({ ...editForm, diagnosisOnDischarge: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Treatment Given</label>
                  <textarea className="hms-input w-full" rows={3} value={editForm.treatmentGiven} onChange={e => setEditForm({ ...editForm, treatmentGiven: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Procedures Performed</label>
                  <textarea className="hms-input w-full" rows={3} value={editForm.proceduresPerformed} onChange={e => setEditForm({ ...editForm, proceduresPerformed: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Investigation Summary</label>
                <textarea className="hms-input w-full" rows={2} value={editForm.investigationSummary} onChange={e => setEditForm({ ...editForm, investigationSummary: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Discharge Medications</label>
                <textarea className="hms-input w-full" rows={2} value={editForm.dischargeMedications} onChange={e => setEditForm({ ...editForm, dischargeMedications: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Condition at Discharge</label>
                  <textarea className="hms-input w-full" rows={2} value={editForm.conditionAtDischarge} onChange={e => setEditForm({ ...editForm, conditionAtDischarge: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Instructions</label>
                  <textarea className="hms-input w-full" rows={2} value={editForm.followUpInstructions} onChange={e => setEditForm({ ...editForm, followUpInstructions: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dietary Advice</label>
                  <textarea className="hms-input w-full" rows={2} value={editForm.dietaryAdvice} onChange={e => setEditForm({ ...editForm, dietaryAdvice: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Activity Restrictions</label>
                  <textarea className="hms-input w-full" rows={2} value={editForm.activityRestrictions} onChange={e => setEditForm({ ...editForm, activityRestrictions: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setEditItem(null)} className="px-4 py-2 rounded-lg border text-gray-600 text-sm">Cancel</button>
                <button onClick={handleUpdate} disabled={editSubmitting}
                  className="px-4 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
