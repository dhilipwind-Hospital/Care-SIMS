import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, FileText, Pill, FlaskConical,
  CreditCard, Building2, ChevronRight, Activity, Phone, Clock, CheckCircle,
} from 'lucide-react';
import { clearAuth, getUser, type AuthUser } from '../../lib/auth';
import api from '../../lib/api';

const QUICK_ACTIONS = [
  { icon: Calendar,     label: 'Book Appointment', color: '#0F766E', bg: '#F0FDFA', path: '/app/patient/appointments', desc: 'Schedule a visit with a doctor' },
  { icon: FileText,     label: 'Medical Records',  color: '#3B82F6', bg: '#EFF6FF', path: '/app/patient/records',      desc: 'View consultation history' },
  { icon: Pill,         label: 'Prescriptions',    color: '#F59E0B', bg: '#FFFBEB', path: '/app/patient/prescriptions',desc: 'View & download prescriptions' },
  { icon: FlaskConical, label: 'Lab Reports',      color: '#EF4444', bg: '#FEF2F2', path: '/app/patient/lab',          desc: 'Access test results' },
  { icon: CreditCard,   label: 'Billing',          color: '#8B5CF6', bg: '#F5F3FF', path: '/app/patient/billing',      desc: 'View invoices & payments' },
  { icon: Activity,     label: 'Vitals History',   color: '#10B981', bg: '#F0FDF4', path: '/app/patient/vitals',       desc: 'Track your health metrics' },
];

export default function PatientPortalPage() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState({ appointments: 0, prescriptions: 0, labReports: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'PATIENT') { navigate('/patient/login', { replace: true }); return; }
    setPatient(u);
    // Load stats
    Promise.all([
      api.get('/auth/patient/me/appointments', { params: { limit: 5 } }).catch((err) => { console.error('Failed to fetch patient appointments:', err); return { data: { data: [], meta: { total: 0 } } }; }),
      api.get('/auth/patient/me/prescriptions', { params: { limit: 1 } }).catch((err) => { console.error('Failed to fetch patient prescriptions:', err); return { data: { data: [], meta: { total: 0 } } }; }),
      api.get('/auth/patient/me/lab-reports', { params: { limit: 1 } }).catch((err) => { console.error('Failed to fetch patient lab reports:', err); return { data: { data: [], meta: { total: 0 } } }; }),
    ]).then(([appts, rxs, labs]) => {
      setStats({
        appointments: appts.data.meta?.total || appts.data.data?.length || 0,
        prescriptions: rxs.data.meta?.total || rxs.data.data?.length || 0,
        labReports: labs.data.meta?.total || labs.data.data?.length || 0,
      });
      setUpcoming((appts.data.data || []).filter((a: any) => a.status === 'SCHEDULED').slice(0, 3));
    });
  }, []);

  const handleChangeHospital = () => {
    // Keep auth cleared so login page shows hospital selector fresh
    clearAuth();
    navigate('/patient/login', { replace: true });
  };

  if (!patient) return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="rounded-2xl p-6 animate-pulse" style={{ background: 'linear-gradient(135deg,#0C4A45,#0F766E,#14B8A6)', height: 220 }} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse bg-gray-200 rounded-2xl h-28" />)}
      </div>
    </div>
  );

  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="p-6 max-w-5xl">

      {/* Welcome banner */}
      <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0C4A45,#0F766E,#14B8A6)' }}>
        <div className="absolute right-0 top-0 w-64 h-64 opacity-10 rounded-full -translate-y-16 translate-x-16"
          style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">
              {initials}
            </div>
            <div>
              <p className="text-teal-200 text-sm font-medium">Welcome back,</p>
              <h1 className="text-2xl font-black">{patient.firstName} {patient.lastName}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 size={13} className="text-teal-300" />
                <span className="text-teal-100 text-sm">{patient.tenantName || 'Connected Hospital'}</span>
              </div>
            </div>
          </div>
          <button onClick={handleChangeHospital}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all">
            <Building2 size={14} />
            Change Hospital
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-5">
          {[
            { label: 'Appointments', value: stats.appointments, icon: Calendar },
            { label: 'Prescriptions', value: stats.prescriptions, icon: Pill },
            { label: 'Lab Reports', value: stats.labReports, icon: FlaskConical },
          ].map(s => {
            const Icon = s.icon;
            return (
              <button key={s.label} onClick={() => navigate(s.label === 'Appointments' ? '/app/patient/appointments' : s.label === 'Prescriptions' ? '/app/patient/prescriptions' : '/app/patient/lab')}
                className="bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 text-center transition-all">
                <Icon size={16} className="mx-auto text-teal-200 mb-1" />
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-teal-200">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button key={action.label} onClick={() => navigate(action.path)}
              className="group text-left p-5 bg-white rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-lg transition-all"
              onMouseEnter={e => (e.currentTarget.style.background = action.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${action.color}15` }}>
                <Icon size={19} style={{ color: action.color }} />
              </div>
              <div className="font-bold text-gray-900 text-sm mb-0.5">{action.label}</div>
              <div className="text-xs text-gray-500">{action.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Upcoming Appointments */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">Upcoming Appointments</h2>
        <button onClick={() => navigate('/app/patient/appointments')} className="text-xs text-teal-600 font-semibold hover:underline">View all →</button>
      </div>
      {upcoming.length > 0 ? (
        <div className="space-y-3 mb-6">
          {upcoming.map((appt: any) => (
            <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{appt.type || 'Consultation'}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock size={11} />
                  {appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  {appt.appointmentTime && ` at ${appt.appointmentTime}`}
                </p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                <CheckCircle size={10} className="inline mr-1" />Scheduled
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center mb-6">
          <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm font-medium">No upcoming appointments</p>
          <p className="text-gray-400 text-xs mt-1 mb-5">
            Book an appointment with a doctor at {patient.tenantName || 'your hospital'}
          </p>
          <button onClick={() => navigate('/app/patient/appointments')}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            Book Appointment
          </button>
        </div>
      )}

      {/* Emergency */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <Phone size={18} className="text-red-600" />
        </div>
        <div>
          <div className="text-sm font-bold text-red-800">Emergency?</div>
          <div className="text-xs text-red-600">Call <strong>108</strong> for ambulance or visit the nearest emergency room.</div>
        </div>
      </div>

    </div>
  );
}
