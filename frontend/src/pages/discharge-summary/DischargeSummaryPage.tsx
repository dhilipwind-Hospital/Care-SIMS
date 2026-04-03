import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, CheckCircle, Clock, AlertTriangle, Eye, Edit2, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
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

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total" value={summaries.length} icon={FileText} color="#3B82F6" />
        <KpiCard label="Drafts" value={drafts} icon={Clock} color="#F59E0B" />
        <KpiCard label="Approved" value={approved} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Pending Review" value={summaries.length - drafts - approved} icon={AlertTriangle} color="#EF4444" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>
          + New Discharge Summary
        </button>
      </div>

      {showForm && (
        <div className="hms-card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Create Discharge Summary</h3>
          {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Admission ID *" value={form.admissionId} onChange={e => setForm({ ...form, admissionId: e.target.value })} />
            <input className="hms-input" placeholder="Patient ID *" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
            <input className="hms-input" placeholder="Doctor ID *" value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} />
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
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Create Draft</button>
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
              <button onClick={() => setViewDetail(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
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
                  <div className="grid grid-cols-3 gap-4">
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
                  style={{ background: 'var(--accent)' }}>
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
