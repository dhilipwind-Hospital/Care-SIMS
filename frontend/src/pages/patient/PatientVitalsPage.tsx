import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Activity, RefreshCw, Calendar, Heart, Thermometer, Wind, Droplets } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

export default function PatientVitalsPage() {
  const [vitals, setVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/patient/me/vitals');
      setVitals(Array.isArray(data) ? data : []);
    } catch (err) { toast.error('Failed to load vitals'); setVitals([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const fmt = (d: string) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const METRICS = [
    { key: 'systolicBp',    label: 'Blood Pressure', unit: 'mmHg', icon: Activity,     color: '#EF4444', bg: '#FEF2F2', fmt: (v: any) => v?.systolicBp != null ? `${v.systolicBp}/${v.diastolicBp}` : null },
    { key: 'heartRate',     label: 'Heart Rate',     unit: 'bpm',  icon: Heart,        color: '#EC4899', bg: '#FDF2F8', fmt: (v: any) => v?.heartRate != null ? String(v.heartRate) : null },
    { key: 'temperatureC',  label: 'Temperature',    unit: '°C',   icon: Thermometer,  color: '#F59E0B', bg: '#FFFBEB', fmt: (v: any) => v?.temperatureC != null ? String(v.temperatureC) : null },
    { key: 'spo2',          label: 'SpO₂',           unit: '%',    icon: Droplets,     color: '#3B82F6', bg: '#EFF6FF', fmt: (v: any) => v?.spo2 != null ? String(v.spo2) : null },
    { key: 'respiratoryRate',label: 'Resp. Rate',    unit: '/min', icon: Wind,         color: '#10B981', bg: '#F0FDF4', fmt: (v: any) => v?.respiratoryRate != null ? String(v.respiratoryRate) : null },
    { key: 'weightKg',      label: 'Weight',         unit: 'kg',   icon: Activity,     color: '#8B5CF6', bg: '#F5F3FF', fmt: (v: any) => v?.weightKg != null ? String(v.weightKg) : null },
  ];

  const latest = vitals[0];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vitals History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vitals.length} recorded entries at {user?.tenantName}</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : vitals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Activity size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No vitals recorded</p>
          <p className="text-gray-400 text-sm mt-1">Your vital signs recorded during visits will appear here</p>
        </div>
      ) : (
        <>
          {/* Latest vitals summary */}
          {latest && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-700">Latest Reading</h2>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={11} /> {fmt(latest.recordedAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {METRICS.map(m => {
                  const Icon = m.icon;
                  const val = m.fmt(latest);
                  if (!val) return null;
                  return (
                    <div key={m.key} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: m.bg }}>
                          <Icon size={15} style={{ color: m.color }} />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{m.label}</span>
                      </div>
                      <div className="text-lg font-black text-gray-900">{val} <span className="text-xs font-normal text-gray-400">{m.unit}</span></div>
                      {latest.hasAbnormal && latest.abnormalFields?.includes(m.key) && (
                        <div className="text-xs text-red-600 font-semibold mt-1">⚠ Abnormal</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {latest.notes && (
                <p className="text-xs text-gray-500 italic mt-2 px-1">Note: {latest.notes}</p>
              )}
            </div>
          )}

          {/* Full history */}
          <h2 className="text-sm font-bold text-gray-700 mb-3">Full History</h2>
          <div className="space-y-2">
            {vitals.map((v, idx) => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${v.hasAbnormal ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className="text-xs text-gray-500 font-medium">{fmt(v.recordedAt)}</span>
                    {idx === 0 && <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">Latest</span>}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    {v.systolicBp != null && <span className="text-gray-700"><span className="text-gray-400 text-xs">BP </span>{v.systolicBp}/{v.diastolicBp}</span>}
                    {v.heartRate != null && <span className="text-gray-700"><span className="text-gray-400 text-xs">HR </span>{v.heartRate}</span>}
                    {v.temperatureC != null && <span className="text-gray-700"><span className="text-gray-400 text-xs">Temp </span>{v.temperatureC}°C</span>}
                    {v.spo2 != null && <span className="text-gray-700"><span className="text-gray-400 text-xs">SpO₂ </span>{v.spo2}%</span>}
                    {v.weightKg != null && <span className="text-gray-700"><span className="text-gray-400 text-xs">Wt </span>{v.weightKg}kg</span>}
                    {v.hasAbnormal && <span className="text-xs text-red-600 font-semibold">⚠ Abnormal</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
