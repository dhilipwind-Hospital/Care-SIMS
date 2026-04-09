import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserCheck, Bed, LogOut, Activity, Plus, X, Search, ArrowRightLeft, Eye } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const PAGE_SIZE = 20;

const EMPTY_ADMIT = {
  patientId: '', wardId: '', bedId: '', admittingDoctorId: '',
  diagnosisOnAdmission: '', admissionType: 'PLANNED',
};

const EMPTY_TRANSFER = { newBedId: '', newWardId: '', reason: '' };

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Admit modal
  const [showAdmit, setShowAdmit] = useState(false);
  const [admitForm, setAdmitForm] = useState(EMPTY_ADMIT);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPatientLabel, setSelectedPatientLabel] = useState('');

  // Ward / bed selection
  const [wards, setWards] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [bedsLoading, setBedsLoading] = useState(false);

  // Doctors
  const [doctors, setDoctors] = useState<any[]>([]);

  // Transfer modal
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER);
  const [transferBeds, setTransferBeds] = useState<any[]>([]);
  const [transferBedsLoading, setTransferBedsLoading] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // View detail
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Escape key to close modals
  useEscapeClose(showAdmit, () => setShowAdmit(false));
  useEscapeClose(showTransfer, () => setShowTransfer(false));
  useEscapeClose(showDetail, () => setShowDetail(false));

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admissions', { params: { page, limit: PAGE_SIZE } });
      setAdmissions(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load admissions'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmissions(); }, [page]);

  const active = admissions.filter(a => a.status === 'ACTIVE').length;
  const discharged = admissions.filter(a => a.status === 'DISCHARGED').length;

  const [dischargeId, setDischargeId] = useState<string | null>(null);

  const discharge = async (id: string) => {
    setDischargeId(id);
    try {
      await api.patch(`/admissions/${id}/discharge`, { dischargeType: 'ROUTINE', dischargeSummary: '' });
      toast.success('Patient discharged successfully');
      fetchAdmissions();
    } catch (err) {
      toast.error('Failed to discharge patient');
    } finally { setDischargeId(null); }
  };

  // ---------- Patient search ----------
  const searchPatients = async (q: string) => {
    if (!q.trim()) { setPatients([]); return; }
    setPatientLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { q, limit: 8 } });
      setPatients(data.data || []);
    } catch (err) { console.error('Patient search failed:', err); toast.error('Patient search failed'); } finally { setPatientLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // ---------- Fetch wards + doctors when admit modal opens ----------
  const openAdmitModal = async () => {
    setShowAdmit(true);
    setAdmitForm(EMPTY_ADMIT);
    setFormError('');
    setPatientSearch('');
    setSelectedPatientLabel('');
    setBeds([]);
    try {
      const [wRes, dRes] = await Promise.all([
        api.get('/wards'),
        api.get('/doctors/affiliations/tenant'),
      ]);
      setWards(wRes.data.data || wRes.data || []);
      setDoctors(dRes.data.data || dRes.data || []);
    } catch (err) { console.error('Failed to fetch wards/doctors:', err); }
  };

  // ---------- Fetch beds when ward changes ----------
  const fetchBeds = async (wardId: string) => {
    if (!wardId) { setBeds([]); return; }
    setBedsLoading(true);
    try {
      const { data } = await api.get(`/wards/${wardId}/beds`);
      setBeds((data.data || data || []).filter((b: any) => b.status === 'AVAILABLE'));
    } catch (err) { console.error('Failed to load beds:', err); toast.error('Failed to load beds'); } finally { setBedsLoading(false); }
  };

  const handleWardChange = (wardId: string) => {
    setAdmitForm(f => ({ ...f, wardId, bedId: '' }));
    fetchBeds(wardId);
  };

  // ---------- Submit admission ----------
  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitForm.patientId) { setFormError('Please select a patient'); return; }
    if (!admitForm.wardId) { setFormError('Please select a ward'); return; }
    if (!admitForm.bedId) { setFormError('Please select a bed'); return; }
    if (!admitForm.admittingDoctorId) { setFormError('Please select an admitting doctor'); return; }
    setSubmitting(true); setFormError('');
    try {
      await api.post('/admissions', admitForm);
      toast.success('Patient admitted successfully');
      setShowAdmit(false);
      fetchAdmissions();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to admit patient');
    } finally { setSubmitting(false); }
  };

  // ---------- Transfer ----------
  const openTransferModal = (admission: any) => {
    setTransferId(admission.id);
    setTransferForm(EMPTY_TRANSFER);
    setTransferBeds([]);
    setShowTransfer(true);
    // Load wards if not already loaded
    if (wards.length === 0) {
      api.get('/wards').then(res => setWards(res.data.data || res.data || [])).catch((err) => { console.error('Failed to fetch wards:', err); });
    }
  };

  const fetchTransferBeds = async (wardId: string) => {
    if (!wardId) { setTransferBeds([]); return; }
    setTransferBedsLoading(true);
    try {
      const { data } = await api.get(`/wards/${wardId}/beds`);
      setTransferBeds((data.data || data || []).filter((b: any) => b.status === 'AVAILABLE'));
    } catch (err) { console.error('Failed to load transfer beds:', err); toast.error('Failed to load beds'); } finally { setTransferBedsLoading(false); }
  };

  const handleTransferWardChange = (wardId: string) => {
    setTransferForm(f => ({ ...f, newWardId: wardId, newBedId: '' }));
    fetchTransferBeds(wardId);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.newBedId) { toast.error('Please select a bed'); return; }
    setTransferSubmitting(true);
    try {
      await api.patch(`/admissions/${transferId}/transfer-bed`, { newBedId: transferForm.newBedId });
      toast.success('Patient transferred successfully');
      setShowTransfer(false);
      fetchAdmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally { setTransferSubmitting(false); }
  };

  // ---------- View detail ----------
  const openDetail = async (id: string) => {
    setShowDetail(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await api.get(`/admissions/${id}`);
      setDetail(data);
    } catch (err) { console.error('Failed to load admission details:', err); toast.error('Failed to load admission details'); setShowDetail(false); }
    finally { setDetailLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Admissions" subtitle="Manage inpatient admissions" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Admissions" value={admissions.length} icon={UserCheck} color="#0F766E" />
        <KpiCard label="Currently Admitted" value={active} icon={Bed} color="#3B82F6" />
        <KpiCard label="Discharged" value={discharged} icon={LogOut} color="#10B981" />
        <KpiCard label="Avg LOS" value="—" icon={Activity} color="#F59E0B" sub="days" />
      </div>

      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Inpatient List</h3>
          <button onClick={openAdmitModal}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={14} /> Admit Patient
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Admission #','Patient','Doctor','Ward/Bed','Admitted On','Admission Type','Status','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              ) : admissions.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={<Bed size={24} className="text-gray-400" />}
                    title="No admissions"
                    description="No active admissions found."
                  />
                </td></tr>
              ) : admissions.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-teal-700">{a.admissionNumber}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{a.patient?.firstName} {a.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">{a.patient?.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.doctor ? `Dr. ${a.doctor.firstName}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.ward?.name || '—'} / {a.bed?.bedNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.admissionDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a.admissionType}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openDetail(a.id)}
                        className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 font-medium"
                        title="View details">
                        <Eye size={13} />
                      </button>
                      {a.status === 'ACTIVE' && (
                        <>
                          <button onClick={() => openTransferModal(a)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium"
                            title="Transfer bed">
                            <ArrowRightLeft size={13} />
                          </button>
                          <button onClick={() => discharge(a.id)} disabled={dischargeId === a.id}
                            className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium disabled:opacity-50">
                            {dischargeId === a.id ? 'Discharging...' : 'Discharge'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
      </div>

      {/* ========== ADMIT PATIENT MODAL ========== */}
      {showAdmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">Admit Patient</h2>
                <p className="text-xs text-gray-400 mt-0.5">Create a new inpatient admission</p>
              </div>
              <button type="button" onClick={() => setShowAdmit(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdmit} className="p-6 space-y-5">
              {/* Patient search */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient <span className="text-red-500">*</span></label>
                {admitForm.patientId ? (
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                    <span className="text-sm font-medium text-teal-800">{selectedPatientLabel}</span>
                    <button type="button" onClick={() => { setAdmitForm(f => ({ ...f, patientId: '' })); setSelectedPatientLabel(''); }} className="text-teal-600 hover:text-red-500"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                      placeholder="Search by name, phone or patient ID..."
                      className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    {patients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-48 overflow-y-auto">
                        {patientLoading ? <div className="p-3 text-sm text-gray-400">Searching...</div> : patients.map(p => (
                          <button key={p.id} type="button" onClick={() => {
                            setAdmitForm(f => ({ ...f, patientId: p.id }));
                            setSelectedPatientLabel(`${p.firstName} ${p.lastName} — ${p.patientId}`);
                            setPatients([]);
                            setPatientSearch('');
                          }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                            <span className="font-medium">{p.firstName} {p.lastName}</span>
                            <span className="text-gray-400 ml-2">{p.patientId} · {p.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ward and Bed */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ward <span className="text-red-500">*</span></label>
                  <select value={admitForm.wardId} onChange={e => handleWardChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select ward</option>
                    {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bed <span className="text-red-500">*</span></label>
                  <select value={admitForm.bedId} onChange={e => setAdmitForm(f => ({ ...f, bedId: e.target.value }))}
                    disabled={!admitForm.wardId || bedsLoading}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50">
                    <option value="">{bedsLoading ? 'Loading beds...' : beds.length === 0 && admitForm.wardId ? 'No available beds' : 'Select bed'}</option>
                    {beds.map(b => <option key={b.id} value={b.id}>Bed {b.bedNumber} ({b.type || 'General'})</option>)}
                  </select>
                </div>
              </div>

              {/* Admitting Doctor */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Admitting Doctor <span className="text-red-500">*</span></label>
                <select value={admitForm.admittingDoctorId} onChange={e => setAdmitForm(f => ({ ...f, admittingDoctorId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select doctor</option>
                  {doctors.map((d: any) => (
                    <option key={d.id || d.doctorId} value={d.id || d.doctorId}>
                      Dr. {d.firstName || d.doctor?.firstName} {d.lastName || d.doctor?.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Diagnosis + Admission Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Diagnosis on Admission</label>
                  <input value={admitForm.diagnosisOnAdmission} onChange={e => setAdmitForm(f => ({ ...f, diagnosisOnAdmission: e.target.value }))}
                    placeholder="e.g. Acute appendicitis"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Admission Type</label>
                  <select value={admitForm.admissionType} onChange={e => setAdmitForm(f => ({ ...f, admissionType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['PLANNED', 'EMERGENCY', 'TRANSFER', 'OBSERVATION'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {formError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowAdmit(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {submitting ? 'Admitting...' : 'Admit Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== TRANSFER BED MODAL ========== */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">Transfer Bed</h2>
                <p className="text-xs text-gray-400 mt-0.5">Move patient to a different ward/bed</p>
              </div>
              <button type="button" onClick={() => setShowTransfer(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Ward <span className="text-red-500">*</span></label>
                <select value={transferForm.newWardId} onChange={e => handleTransferWardChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select ward</option>
                  {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Bed <span className="text-red-500">*</span></label>
                <select value={transferForm.newBedId} onChange={e => setTransferForm(f => ({ ...f, newBedId: e.target.value }))}
                  disabled={!transferForm.newWardId || transferBedsLoading}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50">
                  <option value="">{transferBedsLoading ? 'Loading beds...' : transferBeds.length === 0 && transferForm.newWardId ? 'No available beds' : 'Select bed'}</option>
                  {transferBeds.map(b => <option key={b.id} value={b.id}>Bed {b.bedNumber} ({b.type || 'General'})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reason for Transfer</label>
                <input value={transferForm.reason} onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Patient requires isolation"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowTransfer(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={transferSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {transferSubmitting ? 'Transferring...' : 'Transfer Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== VIEW DETAIL MODAL ========== */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">Admission Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">{detail?.admissionNumber || ''}</p>
              </div>
              <button type="button" onClick={() => setShowDetail(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6">
              {detailLoading ? (
                <div className="py-12 text-center text-sm text-gray-400">Loading details...</div>
              ) : detail ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['Patient', `${detail.patient?.firstName || ''} ${detail.patient?.lastName || ''}`],
                      ['Patient ID', detail.patient?.patientId || '—'],
                      ['Ward', detail.ward?.name || '—'],
                      ['Bed', detail.bed?.bedNumber || '—'],
                      ['Admission Date', detail.admissionDate ? new Date(detail.admissionDate).toLocaleDateString() : '—'],
                      ['Admission Type', detail.admissionType || '—'],
                      ['Status', detail.status || '—'],
                      ['Diagnosis', detail.diagnosisOnAdmission || '—'],
                    ].map(([lbl, val]) => (
                      <div key={lbl}>
                        <p className="text-xs text-gray-400">{lbl}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                  {detail.dischargeDate && (
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Discharge Date</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{new Date(detail.dischargeDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Discharge Type</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{detail.dischargeType || '—'}</p>
                      </div>
                      {detail.dischargeSummary && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400">Discharge Summary</p>
                          <p className="text-sm text-gray-700 mt-0.5">{detail.dischargeSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">No details available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
