import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
  Heart, ChevronRight, ChevronLeft, CheckCircle,
  User, GraduationCap, FileText, Shield, MapPin, Stethoscope
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Basic Info', icon: User },
  { id: 2, label: 'Qualifications', icon: GraduationCap },
  { id: 3, label: 'Council Reg.', icon: FileText },
  { id: 4, label: 'Identity', icon: Shield },
  { id: 5, label: 'Contact', icon: MapPin },
];

const SPECIALTIES = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics',
  'Gynecology', 'Oncology', 'Psychiatry', 'Radiology', 'Anesthesiology',
  'Gastroenterology', 'Nephrology', 'Pulmonology', 'Ophthalmology',
  'ENT', 'Urology', 'Endocrinology', 'Rheumatology', 'General Surgery',
  'Internal Medicine', 'Emergency Medicine', 'Family Medicine',
];

const PRIMARY_DEGREES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BPT', 'BSMS', 'BUMS'];
const PG_DEGREES = ['MD', 'MS', 'DNB', 'DM', 'MCh', 'MDS', 'MBA (Hospital Management)'];
const STATE_COUNCILS = [
  'Tamil Nadu Medical Council', 'Karnataka Medical Council',
  'Maharashtra Medical Council', 'Delhi Medical Council',
  'Kerala Medical Council', 'Andhra Pradesh Medical Council',
  'Telangana State Medical Council', 'Gujarat Medical Council',
  'Rajasthan Medical Council', 'West Bengal Medical Council',
  'National Medical Commission (NMC)',
];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Urdu'];

interface FormData {
  firstName: string; lastName: string; email: string; phone: string;
  dateOfBirth: string; gender: string;
  primaryDegree: string; yearOfPassing: string; university: string;
  pgDegree: string; pgSpecialization: string; pgUniversity: string;
  specialties: string[]; experienceYears: string;
  medicalCouncil: string; registrationNo: string; registrationDate: string;
  registrationExpiry: string; nmcId: string;
  aadhaarNumber: string;
  professionalAddress: string; city: string; state: string;
  linkedIn: string; languages: string[]; biography: string;
}

const INIT: FormData = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '',
  primaryDegree: '', yearOfPassing: '', university: '', pgDegree: '', pgSpecialization: '',
  pgUniversity: '', specialties: [], experienceYears: '',
  medicalCouncil: '', registrationNo: '', registrationDate: '', registrationExpiry: '', nmcId: '',
  aadhaarNumber: '',
  professionalAddress: '', city: '', state: '', linkedIn: '', languages: [], biography: '',
};

function InputField({ label, type = 'text', required = false, value, onChange, placeholder = '' }: {
  label: string; name?: string; type?: string; required?: boolean;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type} required={required} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function SelectField({ label, required = false, value, onChange, options }: {
  label: string; name?: string; required?: boolean;
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        required={required} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o} type="button" onClick={() => toggle(o)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              selected.includes(o)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 text-xs text-blue-600">{selected.length} selected: {selected.join(', ')}</div>
      )}
    </div>
  );
}

export default function DoctorRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INIT);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormData) => (value: string) => setForm(f => ({ ...f, [field]: value }));
  const setArr = (field: keyof FormData) => (value: string[]) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/doctors/register', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        primaryDegree: form.primaryDegree,
        pgDegree: form.pgDegree || undefined,
        pgSpecialization: form.pgSpecialization || undefined,
        university: form.university,
        yearOfPassing: parseInt(form.yearOfPassing),
        experienceYears: parseInt(form.experienceYears),
        specialties: form.specialties,
        medicalCouncil: form.medicalCouncil,
        registrationNo: form.registrationNo,
        registrationDate: form.registrationDate,
        registrationExpiry: form.registrationExpiry || undefined,
        nmcId: form.nmcId || undefined,
        languages: form.languages,
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Registration Submitted!</h2>
          <p className="text-gray-600 mb-2">Your registration is under review.</p>
          <p className="text-gray-500 text-sm bg-blue-50 rounded-xl px-4 py-3 mb-8">
            Ayphen typically verifies credentials within <strong>24–48 hours</strong>. You will receive an email once verified and can then set your password.
          </p>
          <button
            onClick={() => navigate('/login', { state: { loginType: 'doctor' } })}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#2563EB,#14B8A6)' }}
          >
            Go to Doctor Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563EB,#14B8A6)' }}>
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Ayphen Doctor Registry</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Self-Registration</h1>
          <p className="text-gray-500 text-sm mt-1">Register once — affiliate with multiple hospitals</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 hms-card p-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  step > s.id ? 'bg-green-500 text-white' :
                  step === s.id ? 'bg-blue-600 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.id ? <CheckCircle size={16} /> : <s.icon size={16} />}
                </div>
                <span className={`text-xs mt-1 font-medium hidden sm:block ${step === s.id ? 'text-blue-600' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 sm:w-16 mx-1 sm:mx-2 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="First Name" name="firstName" required value={form.firstName} onChange={set('firstName')} placeholder="Rajan" />
                <InputField label="Last Name" name="lastName" required value={form.lastName} onChange={set('lastName')} placeholder="Kumar" />
              </div>
              <InputField label="Email Address" name="email" type="email" required value={form.email} onChange={set('email')} placeholder="dr.rajan@gmail.com" />
              <InputField label="Mobile Number" name="phone" type="tel" required value={form.phone} onChange={set('phone')} placeholder="9876543210" />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Date of Birth" name="dateOfBirth" type="date" required value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                <SelectField label="Gender" name="gender" required value={form.gender} onChange={set('gender')} options={['Male', 'Female', 'Other']} />
              </div>
            </div>
          )}

          {/* Step 2 — Qualifications */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Medical Qualifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Primary Degree" name="primaryDegree" required value={form.primaryDegree} onChange={set('primaryDegree')} options={PRIMARY_DEGREES} />
                <InputField label="Year of Passing" name="yearOfPassing" type="number" required value={form.yearOfPassing} onChange={set('yearOfPassing')} placeholder="2000" />
              </div>
              <InputField label="University / College" name="university" required value={form.university} onChange={set('university')} placeholder="Madras Medical College" />
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Post-Graduate Degree" name="pgDegree" value={form.pgDegree} onChange={set('pgDegree')} options={PG_DEGREES} />
                <InputField label="PG Specialization" name="pgSpecialization" value={form.pgSpecialization} onChange={set('pgSpecialization')} placeholder="Cardiology" />
              </div>
              <InputField label="Years of Experience" name="experienceYears" type="number" required value={form.experienceYears} onChange={set('experienceYears')} placeholder="24" />
              <MultiSelect label="Specialties (select up to 3)" options={SPECIALTIES} selected={form.specialties} onChange={v => setArr('specialties')(v.slice(0, 3))} />
            </div>
          )}

          {/* Step 3 — Council Registration */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Medical Council Registration</h3>
              <SelectField label="State Medical Council" name="medicalCouncil" required value={form.medicalCouncil} onChange={set('medicalCouncil')} options={STATE_COUNCILS} />
              <InputField label="Registration Number" name="registrationNo" required value={form.registrationNo} onChange={set('registrationNo')} placeholder="TN-12345" />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Registration Date" name="registrationDate" type="date" required value={form.registrationDate} onChange={set('registrationDate')} />
                <InputField label="Expiry Date (if applicable)" name="registrationExpiry" type="date" value={form.registrationExpiry} onChange={set('registrationExpiry')} />
              </div>
              <InputField label="NMC ID (optional)" name="nmcId" value={form.nmcId} onChange={set('nmcId')} placeholder="NMC-XXXXXXXX" />
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <strong>Note:</strong> Your registration number will be verified against the medical council database. Ensure it is accurate.
              </div>
            </div>
          )}

          {/* Step 4 — Identity */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Identity Verification</h3>
              <InputField label="Aadhaar Number" name="aadhaarNumber" required value={form.aadhaarNumber} onChange={set('aadhaarNumber')} placeholder="XXXX XXXX XXXX" />
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                <strong>Document uploads</strong> will be requested via email after your initial registration. Ayphen will contact you to complete verification.
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <CheckCircle size={18} className="text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Aadhaar Card (Front & Back)</div>
                    <div className="text-xs text-gray-500">Will be collected via secure upload link</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <CheckCircle size={18} className="text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Medical Council Registration Certificate</div>
                    <div className="text-xs text-gray-500">PDF or JPG, max 5MB</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <CheckCircle size={18} className="text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Profile Photo</div>
                    <div className="text-xs text-gray-500">JPG/PNG, minimum 200×200px</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Contact & Languages */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Professional Contact & Profile</h3>
              <InputField label="Professional Address" name="professionalAddress" value={form.professionalAddress} onChange={set('professionalAddress')} placeholder="123 MG Road, Clinic Name" />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="City" name="city" value={form.city} onChange={set('city')} placeholder="Chennai" />
                <InputField label="State" name="state" value={form.state} onChange={set('state')} placeholder="Tamil Nadu" />
              </div>
              <InputField label="LinkedIn Profile (optional)" name="linkedIn" value={form.linkedIn} onChange={set('linkedIn')} placeholder="https://linkedin.com/in/drname" />
              <MultiSelect label="Languages Spoken" options={LANGUAGES} selected={form.languages} onChange={setArr('languages')} />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Biography / About</label>
                <textarea
                  value={form.biography} onChange={e => set('biography')(e.target.value)}
                  rows={4} maxLength={500}
                  placeholder="Brief professional summary (shown to patients during self-booking)…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="text-xs text-gray-400 text-right">{form.biography.length}/500</div>
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
              onClick={() => step === 1 ? navigate('/login', { state: { loginType: 'doctor' } }) : setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <ChevronLeft size={16} />
              {step === 1 ? 'Back to Login' : 'Previous'}
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && (!form.firstName || !form.lastName || !form.email || !form.phone || !form.dateOfBirth || !form.gender)) ||
                  (step === 2 && (!form.primaryDegree || !form.university || !form.yearOfPassing || form.specialties.length === 0)) ||
                  (step === 3 && (!form.medicalCouncil || !form.registrationNo || !form.registrationDate)) ||
                  (step === 4 && !form.aadhaarNumber)
                }
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#2563EB,#14B8A6)' }}
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
                style={{ background: 'linear-gradient(135deg,#2563EB,#14B8A6)' }}
              >
                {submitting ? 'Submitting…' : 'Submit Registration'}
                <Heart size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="text-center mt-4 text-xs text-gray-400">
          Ayphen HMS © 2026 — Secure Medical Platform
        </div>
      </div>
    </div>
  );
}
