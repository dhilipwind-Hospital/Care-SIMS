import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff, CheckCircle, User, Phone, Calendar, Droplets } from 'lucide-react';
import api from '../../lib/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', dateOfBirth: '', gender: '', bloodGroup: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.phone.trim() && !/^[6-9]\d{9}$/.test(form.phone.trim())) { setError('Enter a valid 10-digit Indian mobile number (starting with 6-9)'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    try {
      await api.post('/auth/patient/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f0fdfa,#e0f2fe)' }}>
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Account Created!</h2>
          <p className="text-gray-500 text-sm mb-8">
            Your patient account is ready. Sign in to book appointments, view records, and connect with hospitals on Ayphen.
          </p>
          <button onClick={() => navigate('/patient/login')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            Sign In to Your Account →
          </button>
          <button onClick={() => navigate('/')} className="mt-3 w-full py-2.5 text-sm text-gray-500 hover:text-teal-600">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'linear-gradient(135deg,#f0fdfa,#e0f2fe)' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Ayphen <span className="text-teal-600">Patient Portal</span></span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Your Health Account</h1>
          <p className="text-gray-500 text-sm mt-1">Register once — book appointments at any Ayphen hospital</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">First Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required value={form.firstName} onChange={set('firstName')} placeholder="Rajan"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Last Name <span className="text-red-500">*</span></label>
              <input required value={form.lastName} onChange={set('lastName')} placeholder="Kumar"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email Address <span className="text-red-500">*</span></label>
            <input required type="email" value={form.email} onChange={set('email')} placeholder="rajan@email.com"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              <Phone size={12} className="inline mr-1" />Mobile Number <span className="text-red-500">*</span>
            </label>
            <input required type="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                <Calendar size={12} className="inline mr-1" />Date of Birth
              </label>
              <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Gender</label>
              <select value={form.gender} onChange={set('gender')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">Select…</option>
                {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              <Droplets size={12} className="inline mr-1" />Blood Group
            </label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map(bg => (
                <button key={bg} type="button" onClick={() => setForm(f => ({ ...f, bloodGroup: bg }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    form.bloodGroup === bg ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-400'
                  }`}>{bg}</button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input required type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
            <input required type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
              placeholder="Re-enter password"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            {submitting ? 'Creating Account…' : 'Create Patient Account →'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/patient/login')} className="text-teal-600 font-semibold hover:underline">
              Sign In
            </button>
          </p>
          <p className="text-center text-xs text-gray-400">
            Are you a doctor?{' '}
            <button type="button" onClick={() => navigate('/doctors/register')} className="text-blue-500 hover:underline">
              Register as a Doctor
            </button>
          </p>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">Ayphen HMS © 2026 — HIPAA-grade Secure Platform</p>
      </div>
    </div>
  );
}
