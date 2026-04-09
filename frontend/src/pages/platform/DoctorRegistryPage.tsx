import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserCheck, Search, Plus, CheckCircle, XCircle, Eye, X, AlertCircle, ChevronRight, Building2, Edit2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const STATUS_STYLE: Record<string, string> = {
  VERIFIED:  'bg-green-100 text-green-700',
  PENDING:   'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  REJECTED:  'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', gender: 'MALE',
  dateOfBirth: '', primaryDegree: '', specialties: '', medicalCouncil: '',
  registrationNo: '', registrationDate: '', registrationExpiry: '', bio: '',
};

const EMPTY_AFFILIATION = {
  locationId: '', departmentName: '', designation: '', employmentType: 'VISITING',
  consultationFee: '', availableDays: '' as string, slotDurationMinutes: '15', maxPatientsPerDay: '30',
};

const DAYS_OF_WEEK = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

export default function DoctorRegistryPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [kpiCounts, setKpiCounts] = useState({ verified: 0, pending: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]       = useState(1);

  // Add modal
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  // Detail panel
  const [selected, setSelected]     = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  // Edit profile
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ firstName: '', lastName: '', email: '', phone: '', specialties: '', primaryDegree: '', experienceYears: '' });
  const [editProfileSubmitting, setEditProfileSubmitting] = useState(false);
  const [editProfileError, setEditProfileError] = useState('');

  // Affiliation management
  const [showAffiliationForm, setShowAffiliationForm] = useState(false);
  const [affForm, setAffForm] = useState(EMPTY_AFFILIATION);
  const [affError, setAffError] = useState('');
  const [affSubmitting, setAffSubmitting] = useState(false);
  const [editAffiliation, setEditAffiliation] = useState<any>(null);
  const [editAffForm, setEditAffForm] = useState(EMPTY_AFFILIATION);
  const [editAffError, setEditAffError] = useState('');
  const [editAffSubmitting, setEditAffSubmitting] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/platform/doctors', {
        params: { q: search || undefined, status: statusFilter || undefined, page, limit: 20 },
      });
      setDoctors(data.data || []);
      setTotal(data.meta?.total || 0);
      setKpiCounts({ verified: data.meta?.verified ?? 0, pending: data.meta?.pending ?? 0, suspended: data.meta?.suspended ?? 0 });
    } catch (err) { console.error('Failed to load doctors:', err); toast.error('Failed to load doctors'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDoctors(); }, [search, statusFilter, page]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelected({ id });
    setShowAffiliationForm(false);
    setEditAffiliation(null);
    try {
      const { data } = await api.get(`/doctors/${id}`);
      setSelected(data);
    } catch (err) { console.error('Failed to load doctor details:', err); toast.error('Failed to load doctor details'); setSelected(null); }
    finally { setDetailLoading(false); }
  };

  const handleVerify = async (id: string) => {
    try {
      const { data } = await api.patch(`/platform/doctors/${id}/verify`);
      setVerifySuccess(`Dr. ${data.firstName} ${data.lastName} has been verified. Login credentials have been activated — they can now log in at /login using their registered email.`);
      setTimeout(() => setVerifySuccess(null), 7000);
      fetchDoctors();
      if (selected?.id === id) openDetail(id);
    } catch (err: any) {
      toast.error('Failed to verify doctor');
      setVerifySuccess(null);
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await api.patch(`/platform/doctors/${id}/reject`, { reason: 'Suspended by platform admin' });
      fetchDoctors();
      if (selected?.id === id) openDetail(id);
    } catch (err) { toast.error('Failed to suspend doctor'); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    await api.patch(`/platform/doctors/${id}/reject`, { reason: rejectReason });
    setRejectReason(''); setShowRejectInput(false);
    fetchDoctors();
    if (selected?.id === id) openDetail(id);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setFormError('');
    try {
      const payload = {
        ...form,
        specialties: form.specialties ? form.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      await api.post('/doctors/register', payload);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchDoctors();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to register doctor');
    } finally { setSubmitting(false); }
  };

  // Affiliation handlers
  const handleAddAffiliation = async () => {
    if (!selected) return;
    setAffError('');
    if (!affForm.locationId.trim()) { setAffError('Location ID is required.'); return; }
    setAffSubmitting(true);
    try {
      const payload: any = {
        doctorId: selected.id,
        locationId: affForm.locationId,
        departmentName: affForm.departmentName || undefined,
        designation: affForm.designation || undefined,
        employmentType: affForm.employmentType,
        consultationFee: affForm.consultationFee ? Number(affForm.consultationFee) : undefined,
        availableDays: affForm.availableDays ? affForm.availableDays.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        slotDurationMinutes: affForm.slotDurationMinutes ? Number(affForm.slotDurationMinutes) : 15,
        maxPatientsPerDay: affForm.maxPatientsPerDay ? Number(affForm.maxPatientsPerDay) : 30,
      };
      await api.post('/doctors/affiliations', payload);
      toast.success('Affiliation added');
      setShowAffiliationForm(false);
      setAffForm(EMPTY_AFFILIATION);
      openDetail(selected.id);
    } catch (err: any) {
      setAffError(err.response?.data?.message || 'Failed to add affiliation');
    } finally { setAffSubmitting(false); }
  };

  const openEditAffiliation = (aff: any) => {
    setEditAffiliation(aff);
    setEditAffForm({
      locationId: aff.locationId || '',
      departmentName: aff.departmentName || '',
      designation: aff.designation || '',
      employmentType: aff.employmentType || 'VISITING',
      consultationFee: aff.consultationFee != null ? String(aff.consultationFee) : '',
      availableDays: (aff.availableDays || []).join(', '),
      slotDurationMinutes: aff.slotDurationMinutes != null ? String(aff.slotDurationMinutes) : '15',
      maxPatientsPerDay: aff.maxPatientsPerDay != null ? String(aff.maxPatientsPerDay) : '30',
    });
    setEditAffError('');
  };

  const handleUpdateAffiliation = async () => {
    if (!editAffiliation) return;
    setEditAffError('');
    setEditAffSubmitting(true);
    try {
      const payload: any = {
        departmentName: editAffForm.departmentName || undefined,
        designation: editAffForm.designation || undefined,
        employmentType: editAffForm.employmentType,
        consultationFee: editAffForm.consultationFee ? Number(editAffForm.consultationFee) : undefined,
        availableDays: editAffForm.availableDays ? editAffForm.availableDays.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        slotDurationMinutes: editAffForm.slotDurationMinutes ? Number(editAffForm.slotDurationMinutes) : 15,
        maxPatientsPerDay: editAffForm.maxPatientsPerDay ? Number(editAffForm.maxPatientsPerDay) : 30,
      };
      await api.patch(`/doctors/affiliations/${editAffiliation.id}`, payload);
      toast.success('Affiliation updated');
      setEditAffiliation(null);
      openDetail(selected.id);
    } catch (err: any) {
      setEditAffError(err.response?.data?.message || 'Failed to update affiliation');
    } finally { setEditAffSubmitting(false); }
  };

  const openEditProfile = () => {
    if (!selected) return;
    setEditProfileForm({
      firstName: selected.firstName || '',
      lastName: selected.lastName || '',
      email: selected.email || '',
      phone: selected.phone || '',
      specialties: (selected.specialties || []).join(', '),
      primaryDegree: selected.primaryDegree || '',
      experienceYears: selected.experienceYears != null ? String(selected.experienceYears) : '',
    });
    setEditProfileError('');
    setShowEditProfile(true);
  };

  const handleEditProfile = async () => {
    if (!selected) return;
    if (!editProfileForm.firstName.trim() || !editProfileForm.lastName.trim()) {
      setEditProfileError('First and last name are required');
      return;
    }
    setEditProfileSubmitting(true);
    setEditProfileError('');
    try {
      await api.put(`/doctors/${selected.id}`, {
        firstName: editProfileForm.firstName,
        lastName: editProfileForm.lastName,
        email: editProfileForm.email,
        phone: editProfileForm.phone,
        specialties: editProfileForm.specialties ? editProfileForm.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
        primaryDegree: editProfileForm.primaryDegree,
        experienceYears: editProfileForm.experienceYears ? Number(editProfileForm.experienceYears) : undefined,
      });
      toast.success('Doctor profile updated');
      setShowEditProfile(false);
      fetchDoctors();
      openDetail(selected.id);
    } catch (err: any) {
      setEditProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setEditProfileSubmitting(false);
    }
  };

  const verified  = kpiCounts.verified;
  const pending   = kpiCounts.pending;
  const suspended = kpiCounts.suspended;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Doctor Registry" subtitle="Platform-wide doctor verification and management"
        actions={
          <button onClick={() => { setShowAdd(true); setFormError(''); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Add Doctor
          </button>
        }
      />

      {verifySuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{verifySuccess}</p>
          <button onClick={() => setVerifySuccess(null)} className="ml-auto text-green-400 hover:text-green-600 flex-shrink-0"><XCircle size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Doctors" value={total}     icon={UserCheck}    color="#0F766E" />
        <KpiCard label="Verified"      value={verified}  icon={CheckCircle}  color="#10B981" />
        <KpiCard label="Pending"       value={pending}   icon={AlertCircle}  color="#F59E0B" />
        <KpiCard label="Suspended"     value={suspended} icon={XCircle}      color="#EF4444" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['','All'],['PENDING','Pending'],['VERIFIED','Verified'],['REJECTED','Rejected'],['SUSPENDED','Suspended']].map(([v,l]) => (
          <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter===v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-400'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Doctor Registry</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email or reg no..."
              className="pl-8 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-64" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>{['Doctor','Specialties','Reg No.','Council','Status','Actions'].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
              ) : doctors.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <UserCheck size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No doctors found</p>
                  <p className="text-gray-400 text-xs mt-1">Doctors registered via the Ayphen portal or added manually will appear here</p>
                </td></tr>
              ) : doctors.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(d.id)}>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-semibold text-gray-900">Dr. {d.firstName} {d.lastName}</div>
                    <div className="text-xs text-gray-400">{d.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[160px]">
                    <div className="flex flex-wrap gap-1">
                      {(d.specialties || []).slice(0,3).map((s: string) => (
                        <span key={s} className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                      {(d.specialties || []).length > 3 && <span className="text-xs text-gray-400">+{d.specialties.length-3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{d.registrationNo || '--'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.medicalCouncil || '--'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_STYLE[d.ayphenStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {d.ayphenStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => openDetail(d.id)}
                        className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg" title="View">
                        <Eye size={14} />
                      </button>
                      {d.ayphenStatus === 'PENDING' && (
                        <button onClick={() => handleVerify(d.id)}
                          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-semibold">
                          Verify
                        </button>
                      )}
                      {d.ayphenStatus === 'PENDING' && (
                        <button onClick={() => { setSelected(d); setShowRejectInput(true); }}
                          className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-semibold">
                          Reject
                        </button>
                      )}
                      {d.ayphenStatus === 'VERIFIED' && (
                        <button onClick={() => handleSuspend(d.id)}
                          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-semibold">
                          Suspend
                        </button>
                      )}
                      {(d.ayphenStatus === 'REJECTED' || d.ayphenStatus === 'SUSPENDED') && (
                        <button onClick={() => handleVerify(d.id)}
                          className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-semibold">
                          Re-verify
                        </button>
                      )}
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {((page-1)*20)+1}--{Math.min(page*20, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*20>=total}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD DOCTOR MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-base font-bold text-gray-900">Register Doctor</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add a doctor to the Ayphen platform registry</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: 'firstName', label: 'First Name',    req: true,  type: 'text'  },
                  { key: 'lastName',  label: 'Last Name',     req: true,  type: 'text'  },
                  { key: 'email',     label: 'Email Address', req: true,  type: 'email' },
                  { key: 'phone',     label: 'Phone Number',  req: false, type: 'text'  },
                ] as { key: keyof typeof form; label: string; req: boolean; type: string }[]).map(({ key, label, req, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label} {req && <span className="text-red-500">*</span>}</label>
                    <input required={req} value={form[key]} type={type}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['MALE','FEMALE','OTHER'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                  <input required type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Primary Degree <span className="text-red-500">*</span></label>
                  <input required value={form.primaryDegree} placeholder="MBBS, MD, MS..."
                    onChange={e => setForm(f => ({ ...f, primaryDegree: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Specialties <span className="text-xs text-gray-400">(comma-separated)</span></label>
                  <input value={form.specialties} placeholder="Cardiology, Internal Medicine"
                    onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Medical Council <span className="text-red-500">*</span></label>
                  <input required value={form.medicalCouncil} placeholder="Tamil Nadu Medical Council"
                    onChange={e => setForm(f => ({ ...f, medicalCouncil: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Registration No. <span className="text-red-500">*</span></label>
                  <input required value={form.registrationNo} placeholder="TN/MED/12345"
                    onChange={e => setForm(f => ({ ...f, registrationNo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Registration Date <span className="text-red-500">*</span></label>
                  <input required type="date" value={form.registrationDate}
                    onChange={e => setForm(f => ({ ...f, registrationDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Registration Expiry</label>
                  <input type="date" value={form.registrationExpiry}
                    onChange={e => setForm(f => ({ ...f, registrationExpiry: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bio / Professional Summary</label>
                  <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Brief professional summary..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {submitting ? 'Registering...' : 'Register Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECT REASON MODAL ── */}
      {showRejectInput && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 mb-1">Reject Doctor Registration</h3>
            <p className="text-sm text-gray-500 mb-4">
              Rejecting Dr. {selected.firstName} {selected.lastName}. Please provide a reason.
            </p>
            <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleReject(selected.id)} disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-50">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCTOR DETAIL PANEL ── */}
      {selected && !showRejectInput && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelected(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">Doctor Profile</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            {detailLoading ? (
              <div className="p-12 text-center text-gray-400">Loading profile...</div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl font-black text-teal-600 flex-shrink-0">
                    {selected.firstName?.[0]}{selected.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 text-lg">Dr. {selected.firstName} {selected.lastName}</div>
                    <div className="text-sm text-gray-500">{selected.email}</div>
                    {selected.phone && <div className="text-sm text-gray-500">{selected.phone}</div>}
                    <div className="mt-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLE[selected.ayphenStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {selected.ayphenStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Profile Button */}
                <button onClick={openEditProfile}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-semibold w-fit">
                  <Edit2 size={12} /> Edit Profile
                </button>

                {/* Edit Profile Inline Form */}
                {showEditProfile && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Edit Doctor Profile</h4>
                    {editProfileError && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{editProfileError}</div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">First Name <span className="text-red-500">*</span></label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={editProfileForm.firstName}
                          onChange={e => setEditProfileForm({ ...editProfileForm, firstName: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Last Name <span className="text-red-500">*</span></label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={editProfileForm.lastName}
                          onChange={e => setEditProfileForm({ ...editProfileForm, lastName: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={editProfileForm.email}
                          onChange={e => setEditProfileForm({ ...editProfileForm, email: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={editProfileForm.phone}
                          onChange={e => setEditProfileForm({ ...editProfileForm, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Specialties <span className="text-xs text-gray-400">(comma-separated)</span></label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Cardiology, Internal Medicine"
                          value={editProfileForm.specialties}
                          onChange={e => setEditProfileForm({ ...editProfileForm, specialties: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Primary Degree</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="MBBS, MD, MS..."
                          value={editProfileForm.primaryDegree}
                          onChange={e => setEditProfileForm({ ...editProfileForm, primaryDegree: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Experience (years)</label>
                        <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={editProfileForm.experienceYears}
                          onChange={e => setEditProfileForm({ ...editProfileForm, experienceYears: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => setShowEditProfile(false)} className="px-3 py-1.5 rounded-lg border text-gray-600 text-xs">Cancel</button>
                      <button onClick={handleEditProfile} disabled={editProfileSubmitting}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                        {editProfileSubmitting ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Specialties */}
                {selected.specialties?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Specialties</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.specialties.map((s: string) => (
                        <span key={s} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registration */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Registration Details</p>
                  {[
                    ['Medical Council', selected.medicalCouncil],
                    ['Registration No.', selected.registrationNo],
                    ['Primary Degree', selected.primaryDegree],
                    ['Registration Date', selected.registrationDate ? new Date(selected.registrationDate).toLocaleDateString('en-IN') : null],
                    ['Registration Expiry', selected.registrationExpiry ? new Date(selected.registrationExpiry).toLocaleDateString('en-IN') : null],
                    ['Experience', selected.experienceYears ? `${selected.experienceYears} years` : null],
                  ].filter(([,v]) => v).map(([label, value]) => (
                    <div key={String(label)} className="flex items-start justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Affiliations - Enhanced */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hospital Affiliations</p>
                    <button onClick={() => { setShowAffiliationForm(true); setAffForm(EMPTY_AFFILIATION); setAffError(''); }}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-semibold">
                      <Plus size={12} /> Add Affiliation
                    </button>
                  </div>

                  {/* Add Affiliation Form */}
                  {showAffiliationForm && (
                    <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 mb-3 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">New Affiliation</h4>
                      {affError && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{affError}</div>}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Location ID <span className="text-red-500">*</span></label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Location UUID" value={affForm.locationId}
                            onChange={e => setAffForm({ ...affForm, locationId: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Department</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g. Cardiology" value={affForm.departmentName}
                            onChange={e => setAffForm({ ...affForm, departmentName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Designation</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g. Senior Consultant" value={affForm.designation}
                            onChange={e => setAffForm({ ...affForm, designation: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Employment Type</label>
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            value={affForm.employmentType} onChange={e => setAffForm({ ...affForm, employmentType: e.target.value })}>
                            <option value="VISITING">Visiting</option>
                            <option value="FULL_TIME">Full Time</option>
                            <option value="PART_TIME">Part Time</option>
                            <option value="CONTRACT">Contract</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Consultation Fee</label>
                          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="500" value={affForm.consultationFee}
                            onChange={e => setAffForm({ ...affForm, consultationFee: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Slot Duration (min)</label>
                          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            value={affForm.slotDurationMinutes}
                            onChange={e => setAffForm({ ...affForm, slotDurationMinutes: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Max Patients/Day</label>
                          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            value={affForm.maxPatientsPerDay}
                            onChange={e => setAffForm({ ...affForm, maxPatientsPerDay: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Available Days</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {DAYS_OF_WEEK.map(day => {
                              const selected_days = affForm.availableDays ? affForm.availableDays.split(',').map(s => s.trim()).filter(Boolean) : [];
                              const isSelected = selected_days.includes(day);
                              return (
                                <button key={day} type="button"
                                  onClick={() => {
                                    const newDays = isSelected ? selected_days.filter(d => d !== day) : [...selected_days, day];
                                    setAffForm({ ...affForm, availableDays: newDays.join(', ') });
                                  }}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                  {day.slice(0, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setShowAffiliationForm(false)} className="px-3 py-1.5 rounded-lg border text-gray-600 text-xs">Cancel</button>
                        <button onClick={handleAddAffiliation} disabled={affSubmitting}
                          className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                          {affSubmitting ? 'Adding...' : 'Add Affiliation'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Affiliation List */}
                  {selected.affiliations?.length > 0 ? (
                    <div className="space-y-2">
                      {selected.affiliations.map((a: any) => (
                        <div key={a.id}>
                          {editAffiliation?.id === a.id ? (
                            /* Edit Affiliation Inline Form */
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                              <h4 className="text-sm font-semibold text-gray-900">Edit Affiliation</h4>
                              {editAffError && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{editAffError}</div>}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Department</label>
                                  <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editAffForm.departmentName}
                                    onChange={e => setEditAffForm({ ...editAffForm, departmentName: e.target.value })} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Designation</label>
                                  <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editAffForm.designation}
                                    onChange={e => setEditAffForm({ ...editAffForm, designation: e.target.value })} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Employment Type</label>
                                  <select className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editAffForm.employmentType} onChange={e => setEditAffForm({ ...editAffForm, employmentType: e.target.value })}>
                                    <option value="VISITING">Visiting</option>
                                    <option value="FULL_TIME">Full Time</option>
                                    <option value="PART_TIME">Part Time</option>
                                    <option value="CONTRACT">Contract</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Consultation Fee</label>
                                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editAffForm.consultationFee}
                                    onChange={e => setEditAffForm({ ...editAffForm, consultationFee: e.target.value })} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Slot Duration (min)</label>
                                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editAffForm.slotDurationMinutes}
                                    onChange={e => setEditAffForm({ ...editAffForm, slotDurationMinutes: e.target.value })} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Max Patients/Day</label>
                                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={editAffForm.maxPatientsPerDay}
                                    onChange={e => setEditAffForm({ ...editAffForm, maxPatientsPerDay: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-xs text-gray-500 mb-1">Available Days</label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {DAYS_OF_WEEK.map(day => {
                                      const selected_days = editAffForm.availableDays ? editAffForm.availableDays.split(',').map(s => s.trim()).filter(Boolean) : [];
                                      const isSelected = selected_days.includes(day);
                                      return (
                                        <button key={day} type="button"
                                          onClick={() => {
                                            const newDays = isSelected ? selected_days.filter(d => d !== day) : [...selected_days, day];
                                            setEditAffForm({ ...editAffForm, availableDays: newDays.join(', ') });
                                          }}
                                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                          {day.slice(0, 3)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button onClick={() => setEditAffiliation(null)} className="px-3 py-1.5 rounded-lg border text-gray-600 text-xs">Cancel</button>
                                <button onClick={handleUpdateAffiliation} disabled={editAffSubmitting}
                                  className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                                  {editAffSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Affiliation Display Card */
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
                              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                                <Building2 size={14} className="text-teal-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900">{a.location?.name || a.locationId?.slice(0, 8) || 'Unknown Location'}</div>
                                <div className="text-xs text-gray-500">
                                  {a.employmentType?.replace(/_/g, ' ')} {a.designation ? `· ${a.designation}` : ''}
                                  {a.departmentName ? ` · ${a.departmentName}` : ''}
                                </div>
                                <div className="flex gap-2 mt-1 text-xs text-gray-400">
                                  {a.consultationFee != null && <span>Fee: Rs.{a.consultationFee}</span>}
                                  {a.slotDurationMinutes && <span>{a.slotDurationMinutes}min slots</span>}
                                  {a.maxPatientsPerDay && <span>Max {a.maxPatientsPerDay}/day</span>}
                                </div>
                                {a.availableDays?.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {a.availableDays.map((d: string) => (
                                      <span key={d} className="text-[10px] bg-teal-50 text-teal-600 px-1 py-0.5 rounded">{d.slice(0, 3)}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {a.status}
                                </span>
                                <button onClick={() => openEditAffiliation(a)}
                                  className="p-1 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Edit affiliation">
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : !showAffiliationForm && (
                    <p className="text-xs text-gray-400 italic">No affiliations yet. Click "Add Affiliation" to link this doctor to a hospital.</p>
                  )}
                </div>

                {/* Bio */}
                {selected.bio && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bio</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{selected.bio}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  {selected.ayphenStatus === 'PENDING' && (
                    <>
                      <button onClick={() => handleVerify(selected.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold bg-green-500 hover:bg-green-600">
                        <CheckCircle size={15} /> Verify
                      </button>
                      <button onClick={() => setShowRejectInput(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold bg-red-500 hover:bg-red-600">
                        <XCircle size={15} /> Reject
                      </button>
                    </>
                  )}
                  {selected.ayphenStatus === 'VERIFIED' && (
                    <button onClick={() => handleSuspend(selected.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50">
                      <XCircle size={15} /> Suspend
                    </button>
                  )}
                  {(selected.ayphenStatus === 'REJECTED' || selected.ayphenStatus === 'SUSPENDED') && (
                    <button onClick={() => handleVerify(selected.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold bg-teal-600 hover:bg-teal-700">
                      <CheckCircle size={15} /> Re-verify
                    </button>
                  )}
                {selected.ayphenStatus === 'VERIFIED' && (
                  <div className="w-full mt-2 bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
                    <strong>Credentials Active:</strong> Doctor can log in at /login using their registered email and the password set during registration.
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
