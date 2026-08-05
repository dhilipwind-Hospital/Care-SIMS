import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, Search, Eye, X, ArrowLeft, ArrowRightCircle, Pencil, History, Stethoscope, Pill, FlaskConical, BedDouble, FileText, Activity, Camera, Loader2, ScrollText, MapPin } from 'lucide-react';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import ExportButton from '../../components/ui/ExportButton';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { SPECIALTIES } from '../../lib/specialties';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';

const EMPTY_FORM = {
  firstName: '', middleName: '', lastName: '',
  dateOfBirth: '', gender: 'MALE', bloodGroup: '',
  phone: '', email: '', maritalStatus: '',
  addressLine1: '', addressLine2: '', city: '', state: '', pinCode: '',
  idType: '', idNumber: '',
  visitType: 'OPD - Walk-in', department: '',
  preferredDoctorId: '', priority: 'Normal', chiefComplaint: '',
  addToQueue: true,
  knownAllergies: '', preExistingConditions: '', currentMedications: '',
  emergencyContactName: '', emergencyRelationship: '', emergencyPhone: '',
  paymentMode: 'Cash', insuranceProvider: '', policyNumber: '',
  registrationType: 'WALK_IN',
};

const INDIAN_STATES = ['Tamil Nadu','Karnataka','Maharashtra','Delhi','Kerala','Andhra Pradesh','Telangana','Gujarat'];

// Where a patient sits in today's workflow — computed server-side in
// patients.service.withVisitStatus. Drives the reception status pill and
// whether "Advance to Triage" is still actionable.
const VISIT_STAGE: Record<string, { label: string; cls: string }> = {
  AWAITING_TRIAGE: { label: 'Awaiting triage', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  TRIAGED:         { label: 'Triaged',         cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  IN_CONSULTATION: { label: 'With doctor',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED:       { label: 'Completed',       cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

// The API stores `address` as a JSON object; older rows may hold a bare string.
// Normalise either shape into the edit form's flat fields.
function splitAddress(address: any) {
  if (address && typeof address === 'object') {
    return {
      addressLine1: address.line1 || '',
      addressLine2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      pinCode: address.pinCode || '',
    };
  }
  return { addressLine1: typeof address === 'string' ? address : '', addressLine2: '', city: '', state: '', pinCode: '' };
}

// Inverse of splitAddress. Returns null when every part is blank so the API
// clears the column rather than storing an object full of undefineds.
function joinAddress(f: any) {
  const parts = {
    line1: f.addressLine1?.trim() || undefined,
    line2: f.addressLine2?.trim() || undefined,
    city: f.city?.trim() || undefined,
    state: f.state?.trim() || undefined,
    pinCode: f.pinCode?.trim() || undefined,
  };
  return Object.values(parts).some(Boolean) ? parts : null;
}

export default function PatientsPage() {
  const { user } = useAuth();
  // View is derived from the URL, not local state: /app/patients/register
  // shows the form, /app/patients shows the list. Keeping it in state let the
  // two drift apart, so the browser back button did nothing.
  const location = useLocation();
  const navigate = useNavigate();
  const view: 'list' | 'register' = location.pathname.endsWith('/register') ? 'register' : 'list';
  const showList = () => navigate('/app/patients');
  const showRegister = () => { setForm({ ...EMPTY_FORM }); navigate('/app/patients/register'); };
  const [patients, setPatients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Edit modal state
  const [editPatient, setEditPatient] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);

  // History panel state
  const [historyPatient, setHistoryPatient] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState('consultations');

  // Access log panel state
  const [accessLogPatient, setAccessLogPatient] = useState<any>(null);
  const [accessLogData, setAccessLogData] = useState<any[]>([]);
  const [accessLogLoading, setAccessLogLoading] = useState(false);

  // Doctors for the "Preferred Doctor" picker. Reception is already authorised
  // on /doctors/by-location (see doctor-registry.controller). Falls back to the
  // tenant-wide list when the user has no primary location.
  const [doctors, setDoctors] = useState<any[]>([]);
  useEffect(() => {
    if (view !== 'register') return;
    const url = user?.locationId ? `/doctors/by-location/${user.locationId}` : '/doctors/affiliations/tenant';
    api.get(url)
      .then(({ data }) => setDoctors(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setDoctors([]));
  }, [view, user?.locationId]);

  // Only offer departments that actually have a doctor behind them — picking
  // "Cardiology" when no such department exists just creates orphan data.
  const deptOptions = Array.from(
    new Set(doctors.map((d: any) => (d.departmentName || '').trim()).filter(Boolean)),
  ).sort();

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { q: search || undefined, page, limit: 20 } });
      setPatients(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load patients'); } finally { setLoading(false); }
  };

  // Debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { fetchPatients(); }, [search, page]);

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const register = async () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) errs.phone = 'Enter a valid 10-digit Indian mobile number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (form.emergencyPhone && !/^[6-9]\d{9}$/.test(form.emergencyPhone.trim())) errs.emergencyPhone = 'Enter a valid 10-digit mobile number';
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    setSubmitting(true);
    try {
      const { data } = await api.post('/patients', {
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        email: form.email || undefined, gender: form.gender,
        dateOfBirth: form.dateOfBirth || undefined, bloodGroup: form.bloodGroup || undefined,
        addressLine1: form.addressLine1 || undefined, addressLine2: form.addressLine2 || undefined,
        city: form.city || undefined, state: form.state || undefined,
        pinCode: form.pinCode || undefined,
        knownAllergies: form.knownAllergies || undefined,
        // Collected by the form and previously dropped on the floor. Each of
        // these has a working backend path: idNumber -> nationalId,
        // preExistingConditions -> existingConditions[], the emergency and
        // insurance fields fold into their JSON columns.
        preExistingConditions: form.preExistingConditions || undefined,
        currentMedications: form.currentMedications || undefined,
        idNumber: form.idNumber || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyPhone || undefined,
        emergencyRelationship: form.emergencyRelationship || undefined,
        insuranceProvider: form.insuranceProvider || undefined,
        policyNumber: form.policyNumber || undefined,
        registrationType: form.registrationType,
        // Visit details — these used to be collected and silently discarded.
        chiefComplaint: form.chiefComplaint || undefined,
        addToQueue: form.addToQueue,
        preferredDoctorId: form.preferredDoctorId || undefined,
        departmentName: form.department || undefined,
        visitType: form.visitType || undefined,
        priority: form.priority || undefined,
      });
      const token = (data as any)?.queueToken;
      toast.success(
        token
          ? `Registered — queue token #${token.tokenNumber} issued`
          : 'Patient registered successfully',
      );
      setForm({ ...EMPTY_FORM });
      showList();
      fetchPatients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setSubmitting(false); }
  };

  // "Advance to Triage" — issues today's queue token so the patient shows up in
  // the nurse's worklist. Backend is idempotent, but we also disable the button
  // in-flight so an impatient double-click can't fire twice.
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const advanceToTriage = async (p: any) => {
    setAdvancingId(p.id);
    try {
      const { data } = await api.post(`/patients/${p.id}/advance-to-triage`, {});
      toast.success(
        data?.reused
          ? `${p.firstName} is already in today's queue (token #${data.tokenNumber})`
          : `${p.firstName} sent to triage — token #${data?.tokenNumber}`,
      );
      fetchPatients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send to triage');
    } finally { setAdvancingId(null); }
  };

  const openEdit = (p: any) => {
    setEditPatient(p);
    setEditPhotoUrl(p.photoUrl || null);
    setEditForm({
      firstName: p.firstName || '', lastName: p.lastName || '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
      gender: p.gender || 'MALE', bloodGroup: p.bloodGroup || '',
      phone: p.phone || p.mobile || '', email: p.email || '',
      // patient.address is a JSON column ({line1,line2,city,state,pinCode}).
      // Binding the object straight to a text input rendered "[object Object]"
      // and round-tripped that garbage on save — split it into real fields.
      ...splitAddress(p.address ?? p.addressLine1),
      emergencyContactName: p.emergencyContactName || p.emergencyContact?.name || '',
      emergencyContactPhone: p.emergencyContactPhone || p.emergencyContact?.phone || '',
      knownAllergies: p.knownAllergies || (Array.isArray(p.allergies) ? p.allergies.join(', ') : ''),
      existingConditions: p.preExistingConditions || (Array.isArray(p.existingConditions) ? p.existingConditions.join(', ') : ''),
      currentMedications: p.currentMedications || '',
    });
    setEditErrors({});
  };

  const handlePatientPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editPatient) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/uploads/patient/${editPatient.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditPhotoUrl(data.url);
      toast.success('Photo uploaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      if (editPhotoRef.current) editPhotoRef.current.value = '';
    }
  };

  const submitEdit = async () => {
    const errs: Record<string, string> = {};
    if (!editForm.firstName.trim()) errs.firstName = 'First name is required';
    if (!editForm.lastName.trim()) errs.lastName = 'Last name is required';
    if (!editForm.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^[6-9]\d{9}$/.test(editForm.phone.trim())) errs.phone = 'Enter a valid 10-digit mobile number';
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) errs.email = 'Enter a valid email';
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEditErrors({});
    setEditSubmitting(true);
    try {
      await api.put(`/patients/${editPatient.id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        dateOfBirth: editForm.dateOfBirth || undefined,
        gender: editForm.gender,
        bloodGroup: editForm.bloodGroup || undefined,
        mobile: editForm.phone,
        email: editForm.email || undefined,
        address: joinAddress(editForm),
        emergencyContact: editForm.emergencyContactName ? {
          name: editForm.emergencyContactName,
          phone: editForm.emergencyContactPhone,
        } : undefined,
        allergies: editForm.knownAllergies ? editForm.knownAllergies.split(',').map((a: string) => a.trim()) : [],
        existingConditions: editForm.existingConditions ? editForm.existingConditions.split(',').map((c: string) => c.trim()) : [],
        currentMedications: editForm.currentMedications || undefined,
      });
      toast.success('Patient updated successfully');
      setEditPatient(null);
      fetchPatients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setEditSubmitting(false); }
  };

  const openHistory = async (p: any) => {
    setHistoryPatient(p);
    setHistoryData(null);
    setHistoryTab('consultations');
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/patients/${p.id}/history`);
      setHistoryData(data);
    } catch (err) {
      toast.error('Failed to load patient history');
      setHistoryPatient(null);
    } finally { setHistoryLoading(false); }
  };

  const openAccessLog = async (p: any) => {
    setAccessLogPatient(p);
    setAccessLogData([]);
    setAccessLogLoading(true);
    try {
      const { data } = await api.get(`/patients/${p.id}/access-log`);
      setAccessLogData(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load access log');
      setAccessLogPatient(null);
    } finally { setAccessLogLoading(false); }
  };

  const esf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditForm((f: any) => ({ ...f, [k]: e.target.value }));

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  if (view === 'register') {
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ background: '#F5F7FA' }}>
        {/* Page Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patient Registration</h1>
              <p className="text-sm text-gray-400 mt-0.5">Register new patient — OPD Walk-in</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setForm({ ...EMPTY_FORM }); showList(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-teal-600 text-teal-700 text-sm font-semibold hover:bg-teal-50 transition-all">
                <ArrowLeft size={14} /> Cancel
              </button>
              <button onClick={register} disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {submitting ? 'Saving…' : '💾 Save Draft'}
              </button>
            </div>
          </div>
        </div>

        {/* Two-column form */}
        <div className="flex gap-6 p-8 flex-1">
          {/* Left Column */}
          <div className="flex-1 space-y-5">
            {/* Personal Information */}
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className={lbl}>First Name *</label><input placeholder="Enter first name" value={form.firstName} onChange={sf('firstName')} className={`${inp} ${formErrors.firstName ? 'border-red-400 ring-1 ring-red-300' : ''}`} />{formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}</div>
                <div><label className={lbl}>Middle Name</label><input placeholder="Enter middle name" value={form.middleName} onChange={sf('middleName')} className={inp} /></div>
                <div><label className={lbl}>Last Name *</label><input placeholder="Enter last name" value={form.lastName} onChange={sf('lastName')} className={`${inp} ${formErrors.lastName ? 'border-red-400 ring-1 ring-red-300' : ''}`} />{formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}</div>
                <div><label className={lbl}>Date of Birth *</label><input type="date" placeholder="DD/MM/YYYY" value={form.dateOfBirth} onChange={sf('dateOfBirth')} className={inp} /></div>
                <div><label className={lbl}>Gender</label>
                  <select value={form.gender} onChange={sf('gender')} className={inp}>
                    {['MALE','FEMALE','OTHER'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Blood Group</label>
                  <select value={form.bloodGroup} onChange={sf('bloodGroup')} className={inp}>
                    <option value="">Select blood group</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Phone Number *</label><input placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={sf('phone')} className={`${inp} ${formErrors.phone ? 'border-red-400 ring-1 ring-red-300' : ''}`} />{formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}</div>
                <div><label className={lbl}>Email Address</label><input type="email" placeholder="patient@email.com" value={form.email} onChange={sf('email')} className={`${inp} ${formErrors.email ? 'border-red-400 ring-1 ring-red-300' : ''}`} />{formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}</div>
                <div><label className={lbl}>Marital Status</label>
                  <select value={form.maritalStatus} onChange={sf('maritalStatus')} className={inp}>
                    <option value="">Select status</option>
                    {['Single','Married','Divorced','Widowed'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Address & Identification */}
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
                Address &amp; Identification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2"><label className={lbl}>Address Line 1</label><input placeholder="House/Flat No., Street Name" value={form.addressLine1} onChange={sf('addressLine1')} className={inp} /></div>
                <div className="col-span-2"><label className={lbl}>Address Line 2</label><input placeholder="Landmark, Area" value={form.addressLine2} onChange={sf('addressLine2')} className={inp} /></div>
                <div><label className={lbl}>City *</label><input placeholder="Enter city" value={form.city} onChange={sf('city')} className={inp} /></div>
                <div><label className={lbl}>State</label>
                  <select value={form.state} onChange={sf('state')} className={inp}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>PIN Code</label><input placeholder="6-digit PIN" value={form.pinCode} onChange={sf('pinCode')} className={inp} /></div>
                <div><label className={lbl}>ID Type</label>
                  <select value={form.idType} onChange={sf('idType')} className={inp}>
                    <option value="">Aadhaar Card</option>
                    {['Aadhaar Card','PAN Card','Passport','Voter ID','Driving Licence'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className={lbl}>ID Number</label><input placeholder="XXXX XXXX XXXX" value={form.idNumber} onChange={sf('idNumber')} className={inp} /></div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">3</span>
                Visit Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={lbl}>Visit Type</label>
                  <select value={form.visitType} onChange={sf('visitType')} className={inp}>
                    {['OPD - Walk-in','OPD - Appointment','Emergency','IPD'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {/* Departments come from the doctors actually affiliated here,
                    not a hardcoded specialty list — so every option has someone
                    behind it. Falls back to SPECIALTIES only if no doctor has a
                    department recorded. */}
                <div><label className={lbl}>Department</label>
                  <select
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value, preferredDoctorId: '' }))}
                    className={inp}
                  >
                    <option value="">All departments</option>
                    {(deptOptions.length ? deptOptions : SPECIALTIES).map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Preferred Doctor</label>
                  <select value={form.preferredDoctorId} onChange={sf('preferredDoctorId')} className={inp}>
                    <option value="">Select doctor…</option>
                    {doctors
                      .filter((d: any) => !form.department || (d.departmentName || '').trim().toLowerCase() === form.department.toLowerCase())
                      .map((d: any) => (
                        <option key={d.doctorId || d.id} value={d.doctorId || d.id}>
                          Dr. {d.doctor?.firstName || d.firstName} {d.doctor?.lastName || d.lastName}
                          {d.departmentName ? ` — ${d.departmentName}` : ''}
                        </option>
                      ))}
                  </select>
                  {doctors.length === 0 && <p className="text-xs text-gray-400 mt-1">No doctors available at this location</p>}
                </div>
                <div><label className={lbl}>Priority</label>
                  <select value={form.priority} onChange={sf('priority')} className={inp}>
                    {['Normal','Urgent','Emergency'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className={lbl}>Chief Complaint</label>
                  <textarea rows={2} placeholder="Describe the reason for visit…" value={form.chiefComplaint} onChange={sf('chiefComplaint')} className={`${inp} resize-none`} />
                </div>
                {/* The whole point of this section: registration now starts a
                    visit. Unticking it registers the patient record only. */}
                <div className="col-span-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50 border border-teal-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.addToQueue}
                      onChange={e => setForm(f => ({ ...f, addToQueue: e.target.checked }))}
                      className="mt-0.5 accent-teal-600"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-teal-800">Add to today's queue</span>
                      <span className="block text-xs text-teal-700/80 mt-0.5">
                        Issues a queue token so the patient appears in the nurse's triage worklist
                        {form.preferredDoctorId ? " and the selected doctor's queue" : ''}. Untick to register the record only.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="hidden lg:block w-96 flex-shrink-0 space-y-5">
            {/* Medical Information */}
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Medical Information</h3>
              <div className="space-y-3">
                <div><label className={lbl}>Known Allergies</label><input placeholder="e.g. Penicillin, Sulfa" value={form.knownAllergies} onChange={sf('knownAllergies')} className={inp} /></div>
                <div><label className={lbl}>Pre-existing Conditions</label><input placeholder="e.g. Diabetes, Hypertension" value={form.preExistingConditions} onChange={sf('preExistingConditions')} className={inp} /></div>
                <div><label className={lbl}>Current Medications</label><input placeholder="e.g. Metformin 500mg" value={form.currentMedications} onChange={sf('currentMedications')} className={inp} /></div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-red-600 mb-4 flex items-center gap-1.5">
                <span className="text-red-500">★</span> Emergency Contact
              </h3>
              <div className="space-y-3">
                <div><label className={lbl}>Contact Name *</label><input placeholder="Full name" value={form.emergencyContactName} onChange={sf('emergencyContactName')} className={inp} /></div>
                <div><label className={lbl}>Relationship</label>
                  <select value={form.emergencyRelationship} onChange={sf('emergencyRelationship')} className={inp}>
                    <option value="">Select relationship</option>
                    {['Spouse','Parent','Sibling','Child','Friend','Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Phone Number *</label><input placeholder="+91 XXXXXXXXXX" value={form.emergencyPhone} onChange={sf('emergencyPhone')} className={`${inp} ${formErrors.emergencyPhone ? 'border-red-400 ring-1 ring-red-300' : ''}`} />{formErrors.emergencyPhone && <p className="text-xs text-red-500 mt-1">{formErrors.emergencyPhone}</p>}</div>
              </div>
            </div>

            {/* Insurance & Payment */}
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Insurance &amp; Payment</h3>
              <div className="space-y-3">
                <div><label className={lbl}>Payment Mode *</label>
                  <select value={form.paymentMode} onChange={sf('paymentMode')} className={inp}>
                    {['Cash','Card','UPI','Insurance','Corporate'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Insurance Provider</label><input placeholder="e.g. Star Health" value={form.insuranceProvider} onChange={sf('insuranceProvider')} className={inp} /></div>
                <div><label className={lbl}>Policy Number</label><input placeholder="Enter policy number" value={form.policyNumber} onChange={sf('policyNumber')} className={inp} /></div>
              </div>
            </div>

            {/* Register Action Card */}
            <div className="hms-card p-5 space-y-3">
              <div className="bg-teal-50 rounded-lg p-3 text-xs text-teal-700">
                <p className="font-semibold mb-0.5">Registration Type: OPD Walk-in</p>
                <p className="text-teal-600">Token will be automatically generated on save</p>
                <p className="text-teal-600 mt-0.5">Patient ID Auto-assigned on save</p>
              </div>
              <button onClick={register} disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {submitting ? 'Registering…' : '✓ Register Patient & Generate Token'}
              </button>
              <button onClick={() => { setForm({ ...EMPTY_FORM }); showList(); }}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
                Reset Form
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-5" style={{ background: '#F5F7FA', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage patient records · {total} total patients</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton endpoint="/patients/export" params={{ q: search || undefined }} filename={`patients-${new Date().toISOString().slice(0, 10)}.csv`} />
          <button
            onClick={showRegister}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            <UserPlus size={15} /> Register New Patient
          </button>
        </div>
      </div>

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Patient List</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchInput} onChange={e => { setSearchInput(e.target.value); setPage(1); }}
              placeholder="Search by name, phone, ID…"
              className="pl-8 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-60" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Patient ID','Name','Age/Gender','Phone','Blood Group','Type','Today','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              ) : patients.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={<Search size={24} className="text-gray-400" />}
                    title="No patients"
                    description="No patients registered yet. Click 'New Patient' to add one."
                  />
                </td></tr>
              ) : patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-teal-700 font-medium">{p.patientId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.dateOfBirth ? `${new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()}y` : '—'} / {p.gender?.[0]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.bloodGroup || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{p.registrationType}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {VISIT_STAGE[p.visitStatus] ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${VISIT_STAGE[p.visitStatus].cls}`}>
                        {p.queueToken?.tokenNumber != null && <span className="font-bold">#{p.queueToken.tokenNumber}</span>}
                        {VISIT_STAGE[p.visitStatus].label}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Disabled once the patient is already moving through the
                          workflow — re-sending would be a no-op server-side, but
                          a live button implies there's something left to do. */}
                      <button
                        onClick={() => advanceToTriage(p)}
                        disabled={p.visitStatus !== 'NOT_STARTED' || advancingId === p.id}
                        title={p.visitStatus !== 'NOT_STARTED' ? 'Already in today’s workflow' : 'Send to triage'}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                          p.visitStatus !== 'NOT_STARTED'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <ArrowRightCircle size={12} />
                        {advancingId === p.id ? 'Sending…' : 'Triage'}
                      </button>
                      <button onClick={() => setSelectedPatient(p)} className="text-teal-600 hover:text-teal-800" title="View"><Eye size={16} /></button>
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800" title="Edit"><Pencil size={15} /></button>
                      <button onClick={() => openHistory(p)} className="text-purple-600 hover:text-purple-800" title="History"><History size={15} /></button>
                      <button onClick={() => openAccessLog(p)} className="text-gray-500 hover:text-gray-800" title="Access Log"><ScrollText size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Patient Detail Panel */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedPatient(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedPatient.patientId}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Gender', selectedPatient.gender],
                  ['Blood Group', selectedPatient.bloodGroup || '—'],
                  ['Phone', selectedPatient.mobile || selectedPatient.phone || '—'],
                  ['Email', selectedPatient.email || '—'],
                  ['Date of Birth', selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : '—'],
                  ['Age', selectedPatient.dateOfBirth ? `${new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()} yrs` : '—'],
                  ['Type', selectedPatient.registrationType || '—'],
                  ['Registered', selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-semibold text-sm text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
              {selectedPatient.address && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                  <p className="text-sm text-gray-900">
                    {typeof selectedPatient.address === 'string'
                      ? selectedPatient.address
                      : [selectedPatient.address.line1, selectedPatient.address.line2, selectedPatient.address.city, selectedPatient.address.state, selectedPatient.address.pinCode, selectedPatient.address.country]
                          .filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              )}
              {selectedPatient.emergencyContactName && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-amber-600 mb-1 font-medium">Emergency Contact</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedPatient.emergencyContactName}</p>
                  <p className="text-xs text-gray-500">{selectedPatient.emergencyContactPhone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setEditPatient(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h2 className="font-bold text-gray-900">Edit Patient</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{editPatient.patientId}</p>
              </div>
              <button onClick={() => setEditPatient(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={() => editPhotoRef.current?.click()}
                  disabled={photoUploading}
                  className="relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-teal-400 flex items-center justify-center overflow-hidden transition-colors group">
                  {photoUploading ? (
                    <Loader2 size={24} className="text-teal-600 animate-spin" />
                  ) : editPhotoUrl ? (
                    <>
                      <img src={editPhotoUrl} alt="Patient" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera size={20} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                    </div>
                  )}
                </button>
                <input ref={editPhotoRef} type="file" className="hidden"
                  accept="image/jpeg,image/png,image/webp" onChange={handlePatientPhotoUpload} />
                <span className="text-xs text-gray-400">{photoUploading ? 'Uploading...' : 'Click to upload photo'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>First Name *</label>
                  <input value={editForm.firstName} onChange={esf('firstName')} className={`${inp} ${editErrors.firstName ? 'border-red-400 ring-1 ring-red-300' : ''}`} />
                  {editErrors.firstName && <p className="text-xs text-red-500 mt-1">{editErrors.firstName}</p>}
                </div>
                <div>
                  <label className={lbl}>Last Name *</label>
                  <input value={editForm.lastName} onChange={esf('lastName')} className={`${inp} ${editErrors.lastName ? 'border-red-400 ring-1 ring-red-300' : ''}`} />
                  {editErrors.lastName && <p className="text-xs text-red-500 mt-1">{editErrors.lastName}</p>}
                </div>
                <div>
                  <label className={lbl}>Date of Birth</label>
                  <input type="date" value={editForm.dateOfBirth} onChange={esf('dateOfBirth')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <select value={editForm.gender} onChange={esf('gender')} className={inp}>
                    {['MALE', 'FEMALE', 'OTHER'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Blood Group</label>
                  <select value={editForm.bloodGroup} onChange={esf('bloodGroup')} className={inp}>
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Phone *</label>
                  <input value={editForm.phone} onChange={esf('phone')} className={`${inp} ${editErrors.phone ? 'border-red-400 ring-1 ring-red-300' : ''}`} />
                  {editErrors.phone && <p className="text-xs text-red-500 mt-1">{editErrors.phone}</p>}
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Email</label>
                  <input type="email" value={editForm.email} onChange={esf('email')} className={`${inp} ${editErrors.email ? 'border-red-400 ring-1 ring-red-300' : ''}`} />
                  {editErrors.email && <p className="text-xs text-red-500 mt-1">{editErrors.email}</p>}
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Address Line 1</label>
                  <input placeholder="House/Flat No., Street Name" value={editForm.addressLine1} onChange={esf('addressLine1')} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Address Line 2</label>
                  <input placeholder="Landmark, Area" value={editForm.addressLine2} onChange={esf('addressLine2')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>City</label>
                  <input placeholder="Enter city" value={editForm.city} onChange={esf('city')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>State</label>
                  <select value={editForm.state} onChange={esf('state')} className={inp}>
                    <option value="">Select State</option>
                    {/* Keep a stored state that isn't in the shortlist selectable,
                        otherwise opening the modal would silently blank it. */}
                    {Array.from(new Set([...INDIAN_STATES, editForm.state].filter(Boolean)))
                      .map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={lbl}>PIN Code</label>
                  <input placeholder="6-digit PIN" value={editForm.pinCode} onChange={esf('pinCode')} className={inp} />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Medical Info</h4>
                <div className="space-y-3">
                  <div>
                    <label className={lbl}>Known Allergies</label>
                    <input placeholder="Comma-separated" value={editForm.knownAllergies} onChange={esf('knownAllergies')} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Pre-existing Conditions</label>
                    <input placeholder="Comma-separated" value={editForm.existingConditions} onChange={esf('existingConditions')} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Current Medications</label>
                    <input value={editForm.currentMedications} onChange={esf('currentMedications')} className={inp} />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-red-500 mb-3 uppercase tracking-wider">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Contact Name</label>
                    <input value={editForm.emergencyContactName} onChange={esf('emergencyContactName')} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Contact Phone</label>
                    <input value={editForm.emergencyContactPhone} onChange={esf('emergencyContactPhone')} className={inp} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setEditPatient(null)}
                className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={submitEdit} disabled={editSubmitting}
                className="px-5 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient History Panel */}
      {historyPatient && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setHistoryPatient(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <History size={18} className="text-purple-600" />
                  Medical History
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{historyPatient.firstName} {historyPatient.lastName} — {historyPatient.patientId}</p>
              </div>
              <button onClick={() => setHistoryPatient(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-gray-100 overflow-x-auto">
              {[
                { key: 'consultations', label: 'Consultations', icon: <Stethoscope size={14} /> },
                { key: 'prescriptions', label: 'Prescriptions', icon: <Pill size={14} /> },
                { key: 'labOrders', label: 'Lab Orders', icon: <FlaskConical size={14} /> },
                { key: 'vitals', label: 'Vitals', icon: <Activity size={14} /> },
                { key: 'admissions', label: 'Admissions', icon: <BedDouble size={14} /> },
                { key: 'invoices', label: 'Invoices', icon: <FileText size={14} /> },
              ].map(tab => (
                <button key={tab.key} onClick={() => setHistoryTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    historyTab === tab.key
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                  }`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6">
              {historyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-gray-100 rounded-xl h-20 animate-pulse" />
                  ))}
                </div>
              ) : !historyData ? (
                <div className="text-center py-12 text-gray-400 text-sm">Failed to load history</div>
              ) : (
                <>
                  {/* Consultations */}
                  {historyTab === 'consultations' && (
                    <div className="space-y-3">
                      {(historyData.consultations || []).length === 0 ? (
                        <EmptyState icon={<Stethoscope size={24} className="text-gray-400" />} title="No consultations" description="No consultation records found for this patient." />
                      ) : historyData.consultations.map((c: any) => (
                        <div key={c.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">{c.department || 'General'}</span>
                            <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          {c.diagnosis && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Diagnosis:</span> {c.diagnosis}</p>}
                          {c.chiefComplaint && <p className="text-sm text-gray-600"><span className="font-medium">Complaint:</span> {c.chiefComplaint}</p>}
                          {c.notes && <p className="text-sm text-gray-500 mt-1">{c.notes}</p>}
                          {c.status && <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${c.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prescriptions */}
                  {historyTab === 'prescriptions' && (
                    <div className="space-y-3">
                      {(historyData.prescriptions || []).length === 0 ? (
                        <EmptyState icon={<Pill size={24} className="text-gray-400" />} title="No prescriptions" description="No prescription records found for this patient." />
                      ) : historyData.prescriptions.map((rx: any) => (
                        <div key={rx.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">Prescription</span>
                            <span className="text-xs text-gray-400">{new Date(rx.createdAt).toLocaleDateString()}</span>
                          </div>
                          {rx.items && rx.items.length > 0 && (
                            <div className="space-y-1">
                              {rx.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{item.medicineName || item.drugName || 'Medicine'}</span>
                                  <span className="text-gray-500 text-xs">{item.dosage} {item.frequency && `- ${item.frequency}`} {item.duration && `(${item.duration})`}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {rx.status && <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${rx.status === 'DISPENSED' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{rx.status}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Lab Orders */}
                  {historyTab === 'labOrders' && (
                    <div className="space-y-3">
                      {(historyData.labOrders || []).length === 0 ? (
                        <EmptyState icon={<FlaskConical size={24} className="text-gray-400" />} title="No lab orders" description="No lab order records found for this patient." />
                      ) : historyData.labOrders.map((lab: any) => (
                        <div key={lab.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">Lab Order</span>
                            <span className="text-xs text-gray-400">{new Date(lab.orderedAt || lab.createdAt).toLocaleDateString()}</span>
                          </div>
                          {lab.items && lab.items.length > 0 && (
                            <div className="space-y-1">
                              {lab.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{item.testName || item.name || 'Test'}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{item.status || 'Pending'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {lab.status && <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${lab.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{lab.status}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vitals */}
                  {historyTab === 'vitals' && (
                    <div className="space-y-3">
                      {(historyData.vitals || []).length === 0 ? (
                        <EmptyState icon={<Activity size={24} className="text-gray-400" />} title="No vitals" description="No vital sign records found for this patient." />
                      ) : (
                        <>
                          {/* Vital Signs Trend Chart */}
                          {historyData.vitals.length >= 2 && (
                            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-3">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Vital Signs Trend</h4>
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart
                                  data={[...historyData.vitals].reverse().map((v: any) => ({
                                    date: new Date(v.recordedAt || v.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                                    heartRate: v.heartRate ? Number(v.heartRate) : null,
                                    systolic: v.systolicBp ? Number(v.systolicBp) : null,
                                    diastolic: v.diastolicBp ? Number(v.diastolicBp) : null,
                                    spO2: v.spo2 || v.oxygenSaturation ? Number(v.spo2 || v.oxygenSaturation) : null,
                                    temp: v.temperatureC || v.temperature ? Number(v.temperatureC || v.temperature) : null,
                                  }))}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
                                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                  <Legend wrapperStyle={{ fontSize: 11 }} />
                                  <Line type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#EF4444" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                                  <Line type="monotone" dataKey="systolic" name="Sys BP" stroke="#0F766E" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                                  <Line type="monotone" dataKey="diastolic" name="Dia BP" stroke="#14B8A6" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                                  <Line type="monotone" dataKey="spO2" name="SpO2" stroke="#3B82F6" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                          {historyData.vitals.map((v: any) => (
                        <div key={v.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">Vital Signs</span>
                            <span className="text-xs text-gray-400">{new Date(v.recordedAt || v.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {v.temperature && <div className="text-center bg-white rounded-lg p-2"><p className="text-xs text-gray-400">Temp</p><p className="text-sm font-semibold">{v.temperature}°F</p></div>}
                            {v.bloodPressure && <div className="text-center bg-white rounded-lg p-2"><p className="text-xs text-gray-400">BP</p><p className="text-sm font-semibold">{v.bloodPressure}</p></div>}
                            {v.heartRate && <div className="text-center bg-white rounded-lg p-2"><p className="text-xs text-gray-400">HR</p><p className="text-sm font-semibold">{v.heartRate} bpm</p></div>}
                            {v.respiratoryRate && <div className="text-center bg-white rounded-lg p-2"><p className="text-xs text-gray-400">RR</p><p className="text-sm font-semibold">{v.respiratoryRate}/min</p></div>}
                            {v.oxygenSaturation && <div className="text-center bg-white rounded-lg p-2"><p className="text-xs text-gray-400">SpO2</p><p className="text-sm font-semibold">{v.oxygenSaturation}%</p></div>}
                            {v.weight && <div className="text-center bg-white rounded-lg p-2"><p className="text-xs text-gray-400">Weight</p><p className="text-sm font-semibold">{v.weight} kg</p></div>}
                          </div>
                        </div>
                      ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Admissions */}
                  {historyTab === 'admissions' && (
                    <div className="space-y-3">
                      {(historyData.admissions || []).length === 0 ? (
                        <EmptyState icon={<BedDouble size={24} className="text-gray-400" />} title="No admissions" description="No admission records found for this patient." />
                      ) : historyData.admissions.map((a: any) => (
                        <div key={a.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">{a.wardName || a.department || 'Ward'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'DISCHARGED' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{a.status || 'Active'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-400">Admitted:</span> <span className="text-gray-700">{new Date(a.admittedAt || a.createdAt).toLocaleDateString()}</span></div>
                            {a.dischargedAt && <div><span className="text-gray-400">Discharged:</span> <span className="text-gray-700">{new Date(a.dischargedAt).toLocaleDateString()}</span></div>}
                            {a.bedNumber && <div><span className="text-gray-400">Bed:</span> <span className="text-gray-700">{a.bedNumber}</span></div>}
                            {a.reason && <div className="col-span-2"><span className="text-gray-400">Reason:</span> <span className="text-gray-700">{a.reason}</span></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Invoices */}
                  {historyTab === 'invoices' && (
                    <div className="space-y-3">
                      {(historyData.invoices || []).length === 0 ? (
                        <EmptyState icon={<FileText size={24} className="text-gray-400" />} title="No invoices" description="No invoice records found for this patient." />
                      ) : historyData.invoices.map((inv: any) => (
                        <div key={inv.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900 font-mono">{inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                            <span className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">Rs. {inv.totalAmount?.toLocaleString() || inv.amount?.toLocaleString() || '0'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'PAID' ? 'bg-green-50 text-green-700' : inv.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{inv.status || 'Pending'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Record Access Log Panel */}
      {accessLogPatient && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setAccessLogPatient(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <ScrollText size={18} className="text-gray-600" />
                  Record Access Log
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Who viewed this record and when — {accessLogPatient.firstName} {accessLogPatient.lastName} · {accessLogPatient.patientId}</p>
              </div>
              <button onClick={() => setAccessLogPatient(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="p-6">
              {accessLogLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-gray-100 rounded-xl h-16 animate-pulse" />
                  ))}
                </div>
              ) : accessLogData.length === 0 ? (
                <EmptyState icon={<ScrollText size={24} className="text-gray-400" />} title="No access records" description="No access to this patient record has been logged yet." />
              ) : (
                <div className="space-y-3">
                  {accessLogData.map((log: any) => (
                    <div key={log.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{log.actorName || 'Unknown user'}</span>
                        <span className="text-xs text-gray-400">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {log.eventType && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{log.eventType}</span>}
                        {log.actorRole && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{log.actorRole}</span>}
                        {log.isCrossLocation && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                            <MapPin size={11} /> Cross-location
                          </span>
                        )}
                      </div>
                      {log.accessReason && <p className="text-sm text-gray-600 mt-2"><span className="font-medium">Reason:</span> {log.accessReason}</p>}
                      {log.resourceType && <p className="text-xs text-gray-400 mt-1">{log.resourceType}{log.resourceId ? ` · ${log.resourceId}` : ''}</p>}
                      {log.ipAddress && <p className="text-xs text-gray-400 mt-1 font-mono">IP {log.ipAddress}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
