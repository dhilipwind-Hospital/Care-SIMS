import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { setAuth } from '../../lib/auth';
import api from '../../lib/api';

export default function PatientLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // If already fully authenticated as patient, skip straight to portal
  useState(() => {
    const token = localStorage.getItem('hms_token');
    const userRaw = localStorage.getItem('hms_user');
    if (token && userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u.role === 'PATIENT' && u.tenantId) {
          navigate('/app/patient/portal', { replace: true });
        }
      } catch (err) { console.error('Failed to parse stored user:', err); }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/patient/login', {
        email: email.trim(),
        password: password.trim(),
      });
      // Check if patient already has a saved hospital preference
      const savedUser = localStorage.getItem('hms_user');
      let savedTenantId = '';
      try { savedTenantId = savedUser ? JSON.parse(savedUser).tenantId : ''; } catch (err) { console.error('Failed to parse saved user tenantId:', err); savedTenantId = ''; }

      const orgs: any[] = data.organizations || [];
      const savedOrg = savedTenantId ? orgs.find((o: any) => o.id === savedTenantId) : null;

      if (savedOrg) {
        // Re-use saved hospital — call select-org directly
        const selRes = await api.post('/auth/patient/select-org', {
          patientAccountId: data.patient.id,
          tenantId: savedOrg.id,
          locationId: savedOrg.locations?.[0]?.id || undefined,
        });
        setAuth(selRes.data.accessToken, {
          sub: data.patient.id,
          id: data.patient.id,
          email: data.patient.email,
          firstName: data.patient.firstName,
          lastName: data.patient.lastName,
          role: 'PATIENT',
          systemRoleId: 'PATIENT',
          tenantId: savedOrg.id,
          locationId: savedOrg.locations?.[0]?.id || '',
          userType: 'patient',
          tenantName: selRes.data.tenantName,
          enabledModules: [],
        });
        navigate('/app/patient/portal', { replace: true });
      } else {
        // No saved hospital — show hospital selector
        sessionStorage.setItem('patient_token', data.accessToken);
        sessionStorage.setItem('patient_info', JSON.stringify(data.patient));
        sessionStorage.setItem('patient_orgs', JSON.stringify(data.organizations));
        navigate('/patient/select-hospital');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#f0fdfa,#e0f2fe)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-center px-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0C4A45 0%,#0F766E 50%,#14B8A6 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Ayphen HMS</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4">
            Your health,<br />your records,<br />
            <span className="text-teal-300">one account.</span>
          </h2>
          <p className="text-teal-100 text-sm leading-relaxed mb-8">
            Sign in to book appointments, access your medical history, lab results, and prescriptions across any Ayphen hospital.
          </p>
          <div className="space-y-3">
            {[
              '📅 Book appointments online',
              '🏥 Choose from multiple hospitals',
              '📋 View prescriptions & lab reports',
              '🔒 HIPAA-grade data security',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                <span className="text-sm text-teal-50">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Ayphen <span className="text-teal-600">HMS</span></span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Top accent */}
            <div className="h-1 rounded-full mb-6 -mx-8 -mt-8 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,#0F766E,#14B8A6)' }} />

            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">Patient Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-6">Sign in to your health account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email Address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoComplete="email"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <input required type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:-translate-y-0.5 shadow-md"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2 text-center">
              <p className="text-sm text-gray-500">
                New to Ayphen?{' '}
                <button onClick={() => navigate('/patient/register')} className="text-teal-600 font-semibold hover:underline">
                  Create a Patient Account
                </button>
              </p>
              <p className="text-xs text-gray-400">
                Are you a doctor or staff?{' '}
                <button onClick={() => navigate('/login')} className="text-teal-600 hover:underline">
                  Staff Login →
                </button>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Ayphen HMS © 2026 — HIPAA-grade Secure Platform
          </p>
        </div>
      </div>
    </div>
  );
}
