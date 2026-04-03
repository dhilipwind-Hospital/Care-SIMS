import { useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import axios from 'axios';

function getTokenExp(): number | null | 'malformed' {
  const token = localStorage.getItem('hms_token');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return 'malformed';
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch (err) {
    console.error('Token parsing failed (malformed JWT):', err);
    return 'malformed';
  }
}

export default function SessionTimeoutWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const refreshToken = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem('hms_token');
      if (!currentToken) return;
      const { data } = await axios.post('/api/auth/refresh', {}, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      localStorage.setItem('hms_token', data.accessToken);
      setShowWarning(false);
    } catch (err) {
      console.error('Token refresh failed:', err);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const exp = getTokenExp();
      if (!exp) return;
      // If token is malformed, log out gracefully
      if (exp === 'malformed') {
        console.error('Malformed JWT token detected — logging out gracefully');
        logout();
        return;
      }
      const timeLeft = Math.max(0, exp - Date.now());
      const secs = Math.floor(timeLeft / 1000);
      setRemaining(secs);

      if (secs <= 0) {
        logout();
      } else if (secs <= 120) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [logout]);

  if (!showWarning) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Session Expiring</h3>
        <p className="text-sm text-gray-500 mb-1">Your session will expire in</p>
        <p className="text-3xl font-bold text-amber-600 mb-4 font-mono">
          {mins}:{secs.toString().padStart(2, '0')}
        </p>
        <p className="text-xs text-gray-400 mb-5">
          Click "Stay Logged In" to extend your session.
        </p>
        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            Log Out
          </button>
          <button
            onClick={refreshToken}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
