import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
  Heart, ChevronRight, ChevronLeft, CheckCircle,
  User, Briefcase, Building2, Users
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Personal Details', icon: User },
  { id: 2, label: 'Professional Info', icon: Briefcase },
  { id: 3, label: 'Select Hospital', icon: Building2 },
  { id: 4, label: 'Confirmation', icon: CheckCircle },
];

interface Org {
  id: string;
  legalName: string;
  tradeName: string;
  city: string;
  orgType: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  jobTitle: string;
  experienceYears: string;
  selectedOrgId: string;
  selectedOrgName: string;
  coverNote: string;
}

const INIT: FormData = {
  firstName: '', lastName: '', email: '', phone: '',
  dateOfBirth: '', gender: '',
  jobTitle: '', experienceYears: '',
  selectedOrgId: '', selectedOrgName: '',
  coverNote: '',
};

const ORG_TYPE_LABEL: Record<string, string> = {
  CLINIC: 'Clinic',
  HOSPITAL: 'Hospital',
  MULTISPECIALTY: 'Multi-Specialty Hospital',
};

export default function StaffRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INIT);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormData) => (value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const searchOrgs = async (q: string) => {
    setOrgSearch(q);
    if (q.length < 2) { setOrgs([]); return; }
    setOrgSearchLoading(true);
    try {
      const { data } = await api.get(`/platform/organizations?q=${encodeURIComponent(q)}&status=ACTIVE&limit=10`);
      setOrgs(data.data || data || []);
    } catch (err) {
      toast.error('Failed to search organizations');
      setOrgs([]);
    } finally {
      setOrgSearchLoading(false);
    }
  };

  const selectOrg = (org: Org) => {
    setForm(f => ({ ...f, selectedOrgId: org.id, selectedOrgName: org.tradeName || org.legalName }));
    setOrgSearch(org.tradeName || org.legalName);
    setOrgs([]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/users/self-register', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        jobTitle: form.jobTitle,
        experienceYears: parseInt(form.experienceYears) || 0,
        organizationId: form.selectedOrgId,
        coverNote: form.coverNote,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted!</h2>
          <p className="text-gray-600 mb-2">Your registration request has been sent to</p>
          <p className="font-bold text-teal-700 text-lg mb-4">{form.selectedOrgName}</p>
          <p className="text-gray-500 text-sm bg-teal-50 rounded-xl px-4 py-3 mb-8">
            The hospital administrator will review your request and assign your role within <strong>24 hours</strong>. You'll receive an email once approved.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-100 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{form.selectedOrgName || 'Ayphen HMS'}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Access Request</h1>
          <p className="text-gray-500 text-sm mt-1">Request access to your hospital's HMS</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 hms-card p-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  step > s.id ? 'bg-green-500 text-white' :
                  step === s.id ? 'text-white' :
                  'bg-gray-100 text-gray-400'
                }`} style={step === s.id ? { background: 'linear-gradient(135deg,#0F766E,#14B8A6)' } : {}}>
                  {step > s.id ? <CheckCircle size={16} /> : <s.icon size={16} />}
                </div>
                <span className={`text-xs mt-1 font-medium hidden sm:block ${step === s.id ? 'text-teal-700' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 sm:w-12 mx-1 sm:mx-2 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Step 1 — Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">First Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.firstName} onChange={e => set('firstName')(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Meena" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.lastName} onChange={e => set('lastName')(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Sharma" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                <input type="email" required value={form.email} onChange={e => set('email')(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="meena@hospital.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mobile <span className="text-red-500">*</span></label>
                <input type="tel" required value={form.phone} onChange={e => set('phone')(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="9876543210" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth')(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Gender</label>
                  <select value={form.gender} onChange={e => set('gender')(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value="">Select…</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Professional */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Professional Information</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Job Title / Role <span className="text-red-500">*</span></label>
                <input type="text" required value={form.jobTitle} onChange={e => set('jobTitle')(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Staff Nurse, Receptionist, Lab Technician…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Years of Experience</label>
                <input type="number" min={0} max={50} value={form.experienceYears} onChange={e => set('experienceYears')(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="5" />
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-800">
                <strong>Note:</strong> You cannot choose your own role — the hospital administrator will assign your role upon approval.
              </div>
            </div>
          )}

          {/* Step 3 — Select Hospital */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Select Your Hospital</h3>
              <p className="text-sm text-gray-500">Search for the hospital you work at. Your request will be sent to their administrator for approval.</p>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Search Hospital <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={orgSearch}
                  onChange={e => searchOrgs(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Apollo Hospitals, Fortis…"
                />
                {orgSearchLoading && (
                  <div className="absolute right-3 top-9 text-gray-400 text-xs">Searching…</div>
                )}
                {orgs.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {orgs.map(org => (
                      <button key={org.id} type="button" onClick={() => selectOrg(org)}
                        className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-0">
                        <Building2 size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{org.tradeName || org.legalName}</div>
                          <div className="text-xs text-gray-500">{ORG_TYPE_LABEL[org.orgType] || org.orgType} {org.city ? `• ${org.city}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.selectedOrgId && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800">{form.selectedOrgName}</div>
                    <div className="text-xs text-green-600">Selected — your request will be sent to this hospital's admin</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Cover Note (optional)</label>
                <textarea
                  value={form.coverNote} onChange={e => set('coverNote')(e.target.value)}
                  rows={3} maxLength={300}
                  placeholder="Brief note to the administrator (e.g., department you're joining, reference contact)…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                Don't see your hospital? Contact your HR department — they may need to set up the organization on Ayphen first.
              </div>
            </div>
          )}

          {/* Step 4 — Confirmation */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Review & Submit</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <User size={18} className="text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Name</div>
                    <div className="font-medium text-gray-900">{form.firstName} {form.lastName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <Users size={18} className="text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Email</div>
                    <div className="font-medium text-gray-900">{form.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <Briefcase size={18} className="text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Job Title</div>
                    <div className="font-medium text-gray-900">{form.jobTitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 border border-teal-200">
                  <Building2 size={18} className="text-teal-600" />
                  <div>
                    <div className="text-xs text-teal-600 uppercase tracking-wide font-semibold">Hospital</div>
                    <div className="font-semibold text-teal-900">{form.selectedOrgName}</div>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                By submitting, you confirm that the information provided is accurate. Your request will be reviewed by the hospital administrator within 24 hours.
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => step === 1 ? navigate('/login') : setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <ChevronLeft size={16} />
              {step === 1 ? 'Back to Login' : 'Previous'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && (!form.firstName || !form.lastName || !form.email || !form.phone)) ||
                  (step === 2 && !form.jobTitle) ||
                  (step === 3 && !form.selectedOrgId)
                }
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="text-center mt-4 text-xs text-gray-400">
          {form.selectedOrgName || 'Ayphen HMS'} © 2026 — Secure Medical Platform
        </div>
      </div>
    </div>
  );
}
