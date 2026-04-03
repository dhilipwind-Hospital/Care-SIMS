import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, KeyRound } from 'lucide-react';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      navigate('/login?reset=success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--hms-bg)' }}>
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
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[480px]">
            <div className="bg-white border overflow-hidden" style={{ borderRadius: 20, borderColor: 'var(--hms-border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="px-10 py-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Invalid Reset Link</h2>
                <p className="text-sm text-gray-500 mb-6">This password reset link is invalid or has expired. Please request a new one.</p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(90deg, #0F766E, #14B8A6)' }}
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--hms-bg)' }}>

      {/* Top Bar */}
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

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[480px]">

          <div className="bg-white border overflow-hidden" style={{ borderRadius: 20, borderColor: 'var(--hms-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-10 py-8">

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#E6FAF8' }}>
                  <KeyRound size={28} className="text-teal-600" strokeWidth={1.5} />
                </div>
              </div>

              {/* Heading */}
              <div className="text-center mb-7">
                <h2 className="text-2xl font-bold text-gray-900">Set New Password</h2>
                <p className="text-sm text-gray-400 mt-1">Enter your new password below</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      minLength={6}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:border-teal-500 focus:ring-teal-500/10 transition-all"
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
                  {password && !passwordValid && (
                    <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      minLength={6}
                      className={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${confirmPassword && !passwordsMatch ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-teal-500 focus:ring-teal-500/10'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(s => !s)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
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
                      Resetting…
                    </>
                  ) : 'Reset Password'}
                </button>
              </form>

            </div>

            {/* Footer */}
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
