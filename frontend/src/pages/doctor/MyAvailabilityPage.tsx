import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, X, Save, Calendar, IndianRupee, MapPin, Trash2, AlertTriangle, CalendarDays } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'MON', label: 'Mon' }, { key: 'TUE', label: 'Tue' }, { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' }, { key: 'FRI', label: 'Fri' }, { key: 'SAT', label: 'Sat' }, { key: 'SUN', label: 'Sun' },
];

const LEAVE_TYPES = [
  { v: 'LEAVE', l: 'Personal Leave' },
  { v: 'HOLIDAY', l: 'Holiday' },
  { v: 'CONFERENCE', l: 'Conference / Training' },
  { v: 'EMERGENCY', l: 'Emergency' },
];

type ScheduleRow = {
  dayOfWeek: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  slotDurationMinutes: number;
  maxPatients?: number | null;
};

type Affiliation = {
  id: string;
  doctorId: string;
  isActive: boolean;
  designation?: string;
  departmentName?: string;
  consultationFee?: number | string | null;
  slotDurationMinutes?: number;
  maxPatientsPerDay?: number;
  doctor?: { id: string; firstName: string; lastName: string; specialties?: string[] };
  location?: { id: string; name: string; locationCode?: string };
  schedules?: any[];
  leaves?: any[];
};

const defaultDayRow = (day: string, enabled: boolean): ScheduleRow => ({
  dayOfWeek: day,
  enabled,
  startTime: '09:00',
  endTime: '17:00',
  breakStart: '13:00',
  breakEnd: '14:00',
  slotDurationMinutes: 15,
  maxPatients: 30,
});

export default function MyAvailabilityPage() {
  const { user } = useAuth();
  // When an admin lands at /app/admin/doctor-availability/:affiliationId, the
  // page fetches that single affiliation via the tenant-wide endpoint instead
  // of the doctor-only /me endpoint.
  const { affiliationId } = useParams<{ affiliationId?: string }>();
  const adminMode = !!affiliationId;
  const [rows, setRows] = useState<Affiliation[]>([]);
  const [selectedAff, setSelectedAff] = useState<Affiliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [fee, setFee] = useState<number>(500);
  const [savingFee, setSavingFee] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', leaveType: 'LEAVE', reason: '' });
  const [savingLeave, setSavingLeave] = useState(false);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEscapeClose(showLeaveModal, () => setShowLeaveModal(false));

  const fetchAffiliations = async () => {
    setLoading(true);
    try {
      const endpoint = adminMode ? '/doctors/affiliations/tenant' : '/doctors/affiliations/me';
      const { data } = await api.get(endpoint);
      const all: Affiliation[] = Array.isArray(data?.data ?? data) ? (data?.data ?? data) : [];
      // In admin mode, filter down to just the one affiliation the URL targets.
      const list = adminMode ? all.filter(r => r.id === affiliationId) : all;
      setRows(list);
      if (list.length) setSelectedAff(list[0]);

      // Admin mode: the tenant-wide endpoint doesn't include schedules/leaves
      // in its current include set. Fetch them per-affiliation to fill those in.
      if (adminMode && list[0]) {
        const [sched, leaves] = await Promise.all([
          api.get(`/doctors/affiliations/${list[0].id}/schedule`).then(r => r.data).catch(() => []),
          api.get(`/doctors/affiliations/${list[0].id}/leaves`).then(r => r.data).catch(() => []),
        ]);
        setRows([{ ...list[0], schedules: Array.isArray(sched) ? sched : [], leaves: Array.isArray(leaves) ? leaves : [] }]);
        setSelectedAff({ ...list[0], schedules: Array.isArray(sched) ? sched : [], leaves: Array.isArray(leaves) ? leaves : [] });
      }
    } catch { toast.error('Failed to load availability'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAffiliations(); }, []);

  // Initialize the per-day editor whenever the active affiliation changes
  useEffect(() => {
    if (!selectedAff) return;
    const incoming: ScheduleRow[] = DAYS.map(d => {
      const sched = (selectedAff.schedules || []).find((s: any) => s.dayOfWeek === d.key);
      if (sched) {
        return {
          dayOfWeek: d.key,
          enabled: sched.isActive !== false,
          startTime: sched.startTime || '09:00',
          endTime: sched.endTime || '17:00',
          breakStart: sched.breakStart || '',
          breakEnd: sched.breakEnd || '',
          slotDurationMinutes: sched.slotDurationMinutes || 15,
          maxPatients: sched.maxPatients,
        };
      }
      return defaultDayRow(d.key, false);
    });
    setSchedule(incoming);
    setFee(Number(selectedAff.consultationFee || 500));
  }, [selectedAff]);

  // Fetch this doctor's upcoming appointments for the next 14 days.
  // In admin mode, use the selected affiliation's doctorId (not the admin's own).
  useEffect(() => {
    const lookupDoctorId = adminMode ? selectedAff?.doctorId : user?.sub;
    if (!lookupDoctorId) return;
    const today = new Date().toISOString().slice(0, 10);
    api.get('/appointments', { params: { doctorId: lookupDoctorId, limit: 50 } })
      .then(r => {
        const list = r.data?.data || r.data || [];
        const future = list.filter((a: any) => (a.appointmentDate || '').slice(0, 10) >= today && a.status !== 'CANCELLED');
        future.sort((a: any, b: any) => `${a.appointmentDate}${a.appointmentTime}`.localeCompare(`${b.appointmentDate}${b.appointmentTime}`));
        setUpcoming(future.slice(0, 10));
      })
      .catch(() => setUpcoming([]));
  }, [user?.sub, selectedAff?.doctorId, adminMode]);

  const updateDay = (idx: number, patch: Partial<ScheduleRow>) => {
    setSchedule(s => s.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const saveSchedule = async () => {
    if (!selectedAff) return;
    setSavingSchedule(true);
    try {
      const payload = schedule
        .filter(r => r.enabled)
        .map(r => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          breakStart: r.breakStart || null,
          breakEnd: r.breakEnd || null,
          slotDurationMinutes: Number(r.slotDurationMinutes),
          maxPatients: r.maxPatients ? Number(r.maxPatients) : null,
          isActive: true,
        }));
      // Basic validation
      for (const r of payload) {
        if (r.startTime >= r.endTime) {
          toast.error(`${r.dayOfWeek}: End time must be after start time`); setSavingSchedule(false); return;
        }
        if (r.breakStart && r.breakEnd && r.breakStart >= r.breakEnd) {
          toast.error(`${r.dayOfWeek}: Break end must be after break start`); setSavingSchedule(false); return;
        }
      }
      await api.put(`/doctors/affiliations/${selectedAff.id}/schedule`, { schedules: payload });
      toast.success('Schedule saved');
      fetchAffiliations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save schedule');
    } finally { setSavingSchedule(false); }
  };

  const saveFee = async () => {
    if (!selectedAff) return;
    setSavingFee(true);
    try {
      await api.patch(`/doctors/affiliations/${selectedAff.id}`, { consultationFee: Number(fee) });
      toast.success('Consultation fee updated');
      fetchAffiliations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save fee');
    } finally { setSavingFee(false); }
  };

  const addLeave = async () => {
    if (!selectedAff) return;
    if (!leaveForm.startDate || !leaveForm.endDate) { toast.error('Pick both start and end dates'); return; }
    if (leaveForm.endDate < leaveForm.startDate) { toast.error('End date cannot be before start date'); return; }
    setSavingLeave(true);
    try {
      await api.post(`/doctors/affiliations/${selectedAff.id}/leaves`, leaveForm);
      toast.success('Leave added');
      setShowLeaveModal(false);
      setLeaveForm({ startDate: '', endDate: '', leaveType: 'LEAVE', reason: '' });
      fetchAffiliations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add leave');
    } finally { setSavingLeave(false); }
  };

  const cancelLeave = async (leaveId: string) => {
    if (!confirm('Cancel this leave entry?')) return;
    try {
      await api.patch(`/doctors/leaves/${leaveId}/cancel`);
      toast.success('Leave cancelled');
      fetchAffiliations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) return <div className="p-6"><div className="hms-card p-8 text-center text-sm text-gray-400">Loading...</div></div>;
  if (!rows.length) return (
    <div className="p-6 space-y-6">
      <TopBar title={adminMode ? 'Doctor Availability' : 'My Availability'} subtitle="Manage working hours, leave & consultation fee" />
      <EmptyState title="No affiliations" description={adminMode ? 'Affiliation not found for this org.' : "Your account isn't affiliated with any organization yet. Contact your administrator."} />
    </div>
  );

  const headerTitle = adminMode
    ? (selectedAff?.doctor ? `Dr. ${selectedAff.doctor.firstName} ${selectedAff.doctor.lastName} — Availability` : 'Doctor Availability')
    : 'My Availability';

  return (
    <div className="p-6 space-y-6">
      <TopBar title={headerTitle} subtitle="Manage working hours, leave & consultation fee" />

      {/* Affiliation switcher (only shown when doctor has 2+) */}
      {rows.length > 1 && (
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location:</span>
          {rows.map(r => (
            <button key={r.id} onClick={() => setSelectedAff(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${selectedAff?.id === r.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'}`}>
              {r.location?.name || '—'}
            </button>
          ))}
        </div>
      )}

      {selectedAff && (
        <>
          {/* Header card */}
          <div className="hms-card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin size={14} className="text-teal-600" /> {selectedAff.location?.name || '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">{selectedAff.departmentName || '—'} • {selectedAff.designation || '—'}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${selectedAff.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {selectedAff.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <IndianRupee size={13} className="text-amber-700" />
                  <input type="number" min={0} step={50} value={fee} onChange={e => setFee(Number(e.target.value))}
                    className="w-20 bg-transparent text-sm font-semibold text-amber-800 focus:outline-none" />
                  <button onClick={saveFee} disabled={savingFee} className="text-xs text-amber-700 hover:underline disabled:opacity-50">
                    {savingFee ? 'Saving...' : 'Save fee'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly schedule grid */}
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Calendar size={16} className="text-teal-600" /> Weekly Schedule</h3>
              <button onClick={saveSchedule} disabled={savingSchedule}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                <Save size={13} /> {savingSchedule ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['Day', 'Working', 'Start', 'End', 'Break Start', 'Break End', 'Slot (min)', 'Max/Day'].map(h => (
                      <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2.5 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((r, idx) => (
                    <tr key={r.dayOfWeek} className={`border-t border-gray-50 ${!r.enabled ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-3 py-2.5 font-semibold text-gray-700 w-16">{DAYS.find(d => d.key === r.dayOfWeek)?.label}</td>
                      <td className="px-3 py-2.5">
                        <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={r.enabled} onChange={e => updateDay(idx, { enabled: e.target.checked })} className="sr-only peer" />
                          <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 relative transition-colors">
                            <div className={`absolute top-0.5 ${r.enabled ? 'left-4' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow transition-all`}></div>
                          </div>
                        </label>
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="time" value={r.startTime} disabled={!r.enabled} onChange={e => updateDay(idx, { startTime: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="time" value={r.endTime} disabled={!r.enabled} onChange={e => updateDay(idx, { endTime: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="time" value={r.breakStart || ''} disabled={!r.enabled} onChange={e => updateDay(idx, { breakStart: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="time" value={r.breakEnd || ''} disabled={!r.enabled} onChange={e => updateDay(idx, { breakEnd: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={5} max={120} step={5} value={r.slotDurationMinutes} disabled={!r.enabled} onChange={e => updateDay(idx, { slotDurationMinutes: Number(e.target.value) })}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={1} step={1} value={r.maxPatients ?? ''} disabled={!r.enabled} onChange={e => updateDay(idx, { maxPatients: e.target.value ? Number(e.target.value) : null })}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-50">Patient self-booking uses these hours. Break window is automatically blocked from booking.</p>
          </div>

          {/* Leaves + Upcoming side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Leaves */}
            <div className="hms-card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle size={15} className="text-amber-600" /> Leaves & Blocked Dates</h3>
                <button onClick={() => setShowLeaveModal(true)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-semibold">
                  <Plus size={12} /> Add Leave
                </button>
              </div>
              <div className="p-3">
                {(selectedAff.leaves || []).length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400">No upcoming leave</div>
                ) : (
                  <div className="space-y-2">
                    {selectedAff.leaves!.map(l => (
                      <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            {new Date(l.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {l.endDate !== l.startDate && ` – ${new Date(l.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          </div>
                          <div className="text-xs text-gray-500">{LEAVE_TYPES.find(t => t.v === l.leaveType)?.l || l.leaveType}{l.reason ? ` • ${l.reason}` : ''}</div>
                        </div>
                        <button onClick={() => cancelLeave(l.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming appointments */}
            <div className="hms-card">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><CalendarDays size={15} className="text-teal-600" /> {adminMode ? "Doctor's Upcoming Appointments" : 'Upcoming Appointments'}</h3>
              </div>
              <div className="p-3">
                {upcoming.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400">No upcoming appointments</div>
                ) : (
                  <div className="space-y-2">
                    {upcoming.map(a => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{a.patient?.firstName} {a.patient?.lastName}</div>
                          <div className="text-xs text-gray-500">{new Date(a.appointmentDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • {a.appointmentTime}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.type === 'FOLLOW_UP' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>{a.type || 'NEW'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Leave modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowLeaveModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Start Date</label>
                  <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">End Date</label>
                  <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Leave Type</label>
                <select value={leaveForm.leaveType} onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {LEAVE_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason (optional)</label>
                <input type="text" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Conference, family emergency, etc."
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <p className="text-xs text-gray-500">During leave, the patient self-booking page will not show any slots. Existing appointments are not auto-cancelled — reach out to those patients separately.</p>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={addLeave} disabled={savingLeave}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                <Save size={14} /> {savingLeave ? 'Saving...' : 'Add Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
