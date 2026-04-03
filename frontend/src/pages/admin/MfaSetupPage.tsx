import { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Smartphone, KeyRound } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

type Step = 'intro' | 'qr' | 'verify' | 'done';

export default function MfaSetupPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isMfaEnabled = user?.mfaEnabled;

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/mfa/setup');
      setQrCodeUrl(data.qrCodeUrl || data.qrCode || data.otpauthUrl || '');
      setSecret(data.secret || data.base32 || '');
      setStep('qr');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/mfa/activate', { code });
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Multi-Factor Authentication" subtitle="Add an extra layer of security to your account" />

      <div className="max-w-2xl mx-auto">
        {/* Status card */}
        <div className={`hms-card p-5 flex items-center gap-4 mb-6 ${isMfaEnabled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-amber-500'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isMfaEnabled ? 'bg-green-100' : 'bg-amber-100'}`}>
            <Shield size={24} className={isMfaEnabled ? 'text-green-600' : 'text-amber-600'} />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{isMfaEnabled ? 'MFA is Enabled' : 'MFA is Not Enabled'}</div>
            <div className="text-sm text-gray-500">
              {isMfaEnabled
                ? 'Your account is protected with two-factor authentication.'
                : 'Enable MFA to add an extra layer of security to your account.'}
            </div>
          </div>
          {isMfaEnabled && (
            <CheckCircle size={24} className="ml-auto text-green-500" />
          )}
        </div>

        {/* Step: Intro */}
        {step === 'intro' && !isMfaEnabled && (
          <div className="hms-card p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Setup Two-Factor Authentication</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-teal-700">1</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Install an authenticator app</div>
                  <div className="text-sm text-gray-500">Download Google Authenticator, Authy, or Microsoft Authenticator on your phone.</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-teal-700">2</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Scan the QR code</div>
                  <div className="text-sm text-gray-500">Use your authenticator app to scan the QR code we'll show you.</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-teal-700">3</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Enter the verification code</div>
                  <div className="text-sm text-gray-500">Type the 6-digit code from your authenticator app to confirm setup.</div>
                </div>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
            >
              <Smartphone size={16} />
              {loading ? 'Setting up…' : 'Begin Setup'}
            </button>
          </div>
        )}

        {/* Step: QR Code */}
        {step === 'qr' && (
          <div className="hms-card p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Scan QR Code</h2>
            <p className="text-sm text-gray-500">Open your authenticator app and scan this QR code to add your account.</p>

            <div className="flex justify-center p-6 bg-white rounded-xl border-2 border-dashed border-gray-200">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                  QR code loading…
                </div>
              )}
            </div>

            {secret && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Can't scan? Enter this key manually:</div>
                <code className="text-sm font-mono font-bold text-gray-800 tracking-widest select-all">{secret}</code>
              </div>
            )}

            <button
              onClick={() => setStep('verify')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
            >
              <KeyRound size={16} /> I've scanned the code
            </button>
          </div>
        )}

        {/* Step: Verify */}
        {step === 'verify' && (
          <div className="hms-card p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Verify Setup</h2>
            <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app to verify the setup.</p>

            <div className="flex justify-center">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="000000"
                className="w-48 text-center text-3xl font-mono font-bold tracking-[0.5em] border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('qr'); setError(''); setCode(''); }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleActivate}
                disabled={loading || code.length !== 6}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                <Shield size={16} />
                {loading ? 'Verifying…' : 'Activate MFA'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="hms-card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">MFA Activated!</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Your account is now protected with two-factor authentication. You'll be asked for a verification code each time you log in.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 max-w-sm mx-auto">
              <strong>Important:</strong> Keep your authenticator app accessible. If you lose access, contact your administrator to reset MFA.
            </div>
          </div>
        )}

        {/* Already enabled info */}
        {isMfaEnabled && step === 'intro' && (
          <div className="hms-card p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Shield size={28} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Two-Factor Authentication is Active</h3>
            <p className="text-sm text-gray-500">Your account requires a verification code at each login. To disable MFA, contact your administrator.</p>
          </div>
        )}
      </div>
    </div>
  );
}
