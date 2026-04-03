import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield, User, ArrowLeft, Mail } from 'lucide-react';
import api from '../lib/api';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error,      setError]      = useState('');
  const [touched,    setTouched]    = useState<{ email?: boolean; password?: boolean }>({});

  // Forgot password state
  const [showForgot,      setShowForgot]      = useState(false);
  const [forgotEmail,     setForgotEmail]     = useState('');
  const [forgotLoading,   setForgotLoading]   = useState(false);
  const [forgotSent,      setForgotSent]      = useState(false);
  const [forgotError,     setForgotError]     = useState('');

  // Success message from password reset redirect
  const resetSuccess = searchParams.get('reset') === 'success';

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = !password || password.length >= 6;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSent(true);
    } catch (err) {
      // Always show success to not reveal if email exists
      console.error('Forgot password request failed:', err);
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 6) return;
    setError('');
    try {
      const needsOrgSelect = await login(email.trim(), password.trim(), 'auto');
      if (needsOrgSelect) {
        window.location.replace('/doctor/select-org');
      } else {
        window.location.replace('/app');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--hms-bg)' }}>

      {/* ── TOP BAR — matches .pen topBar: height 80, gradient fill ── */}
      <div
        className="flex items-center justify-between px-10"
        style={{ background: 'linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)', height: 80 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-white/70 rounded flex items-center justify-center">
            <div className="w-3 h-3 border border-white/90 rounded-sm" />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">Hospital Management System</span>
        </div>
        <span className="text-white/60 text-xs">v1.0</span>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[480px]">

          {/* Card — matches .pen loginCard: cornerRadius 20, shadow blur 20 */}
          <div className="bg-white border overflow-hidden" style={{ borderRadius: 20, borderColor: 'var(--hms-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-10 py-8">

              {showForgot ? (
                /* ── FORGOT PASSWORD VIEW ── */
                <>
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#E6FAF8' }}>
                      <Mail size={28} className="text-teal-600" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="text-center mb-7">
                    <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                    <p className="text-sm text-gray-400 mt-1">Enter your email to receive a reset link</p>
                  </div>

                  {forgotSent ? (
                    <div className="space-y-4">
                      <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-lg text-sm">
                        If an account exists with that email, we've sent a password reset link. Please check your inbox.
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowForgot(false); setForgotSent(false); }}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold text-teal-700 border border-teal-300 hover:bg-teal-50 flex items-center justify-center gap-2 transition-all"
                      >
                        <ArrowLeft size={15} />
                        Back to Sign In
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="Enter your registered email"
                          autoComplete="email"
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:border-teal-500 focus:ring-teal-500/10 transition-all"
                        />
                      </div>

                      {forgotError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
                          {forgotError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(90deg, #0F766E, #14B8A6)' }}
                      >
                        {forgotLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending…
                          </>
                        ) : 'Send Reset Link'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowForgot(false)}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold text-teal-700 border border-teal-300 hover:bg-teal-50 flex items-center justify-center gap-2 transition-all"
                      >
                        <ArrowLeft size={15} />
                        Back to Sign In
                      </button>
                    </form>
                  )}
                </>
              ) : (
                /* ── LOGIN VIEW ── */
                <>
                  {/* User icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#E6FAF8' }}>
                      <User size={28} className="text-teal-600" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Heading */}
                  <div className="text-center mb-7">
                    <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                    <p className="text-sm text-gray-400 mt-1">Access your HMS account</p>
                  </div>

                  {/* Reset success banner */}
                  {resetSuccess && (
                    <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2.5 rounded-lg text-sm mb-4">
                      Your password has been reset successfully. Please sign in with your new password.
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, email: true }))}
                        placeholder="Enter your email address"
                        autoComplete="email"
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${touched.email && !emailValid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-teal-500 focus:ring-teal-500/10'}`}
                      />
                      {touched.email && !emailValid && (
                        <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onBlur={() => setTouched(t => ({ ...t, password: true }))}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          minLength={6}
                          className={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${touched.password && !passwordValid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-teal-500 focus:ring-teal-500/10'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(s => !s)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {touched.password && !passwordValid && (
                        <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                      )}
                    </div>

                    {/* Remember me + Forgot password */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-600">Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => { setShowForgot(true); setForgotSent(false); setForgotError(''); setForgotEmail(''); }}
                        className="text-sm text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                      style={{ background: 'linear-gradient(90deg, #0F766E, #14B8A6)' }}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Signing in…
                        </>
                      ) : 'Sign In'}
                    </button>
                  </form>

                  {/* Don't have access note */}
                  <div className="mt-5 flex items-center gap-2 justify-center bg-gray-50 rounded-lg px-4 py-2.5">
                    <Shield size={13} className="text-teal-500 flex-shrink-0" />
                    <p className="text-xs text-gray-500">Don't have access? Contact your administrator</p>
                  </div>
                </>
              )}

            </div>

            {/* Footer inside card */}
            <div className="px-10 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5">
              <Shield size={11} className="text-gray-400" />
              <p className="text-xs text-gray-400">Secured with 256-bit encryption · HIPAA compliant · Audit trail</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
