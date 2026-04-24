import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Users, Plus, X, Loader2, Clock, CalendarOff } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const SHIFT_TYPES = ['MORNING', 'EVENING', 'NIGHT', 'GENERAL', 'SPLIT'] as const;
const LEAVE_TYPES = ['CASUAL', 'SICK', 'EARNED', 'COMP_OFF', 'MATERNITY', 'PATERNITY', 'UNPAID'] as const;
const SHIFT_COLORS: Record<string, string> = {
  MORNING: 'bg-amber-100 text-amber-700 border-amber-200',
  EVENING: 'bg-blue-100 text-blue-700 border-blue-200',
  NIGHT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  GENERAL: 'bg-green-100 text-green-700 border-green-200',
  SPLIT: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function DutyRosterPage() {
  const [tab, setTab] = useState<'roster' | 'leave'>('roster');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); });

  // Shift form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staffId: '', shiftDate: '', shiftType: 'GENERAL', startTime: '08:00', endTime: '16:00', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  // Leave form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });

  // Staff list for dropdowns
  const [staff, setStaff] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
      const [list, dash] = await Promise.all([
        tab === 'roster'
          ? api.get('/duty-roster', { params: { from: weekStart, to: weekEnd.toISOString().slice(0, 10), page, limit: 100 } })
          : api.get('/duty-roster/leave', { params: { page, limit: 20 } }),
        api.get('/duty-roster/dashboard'),
      ]);
      setRecords(list.data.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    try { const { data } = await api.get('/users', { params: { limit: 200 } }); setStaff(data.data || []); } catch {}
  };

  useEffect(() => { fetchData(); }, [tab, page, weekStart]);
  useEffect(() => { fetchStaff(); }, []);

  const handleCreateShift = async () => {
    if (!form.staffId || !form.shiftDate) { toast.error('Staff and date required'); return; }
    setSubmitting(true);
    try { await api.post('/duty-roster', form); toast.success('Shift created'); setShowForm(false); fetchData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleApplyLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) { toast.error('Fill all fields'); return; }
    setSubmitting(true);
    try { await api.post('/duty-roster/leave', leaveForm); toast.success('Leave applied'); setShowLeaveForm(false); fetchData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') await api.patch(`/duty-roster/leave/${id}/approve`);
      else await api.patch(`/duty-roster/leave/${id}/reject`, { reason: 'Rejected by admin' });
      toast.success(`Leave ${action}d`); fetchData();
    } catch { toast.error('Failed'); }
  };

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d.toISOString().slice(0, 10)); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d.toISOString().slice(0, 10)); };

  // Group roster by date for week view
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); });

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Duty Roster & Leave Management" subtitle="Staff scheduling and leave tracking" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Today's Shifts" value={dashboard.todayShifts || 0} icon={Users} color="#0F766E" />
        <KpiCard label="This Week" value={dashboard.weekShifts || 0} icon={Calendar} color="#3B82F6" />
        <KpiCard label="Pending Leaves" value={dashboard.pendingLeaves || 0} icon={CalendarOff} color="#F59E0B" />
        <KpiCard label="On Leave Today" value={dashboard.onLeaveToday || 0} icon={Clock} color="#EF4444" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {[['roster', 'Week Roster'], ['leave', 'Leave Requests']].map(([val, label]) => (
            <button key={val} onClick={() => { setTab(val as any); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'roster' && (
            <>
              <button onClick={prevWeek} className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">← Prev</button>
              <span className="px-3 py-1.5 text-sm font-medium text-gray-700">{formatDate(weekStart)}</span>
              <button onClick={nextWeek} className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Next →</button>
            </>
          )}
          <button onClick={() => tab === 'roster' ? setShowForm(true) : setShowLeaveForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> {tab === 'roster' ? 'Add Shift' : 'Apply Leave'}
          </button>
        </div>
      </div>

      {tab === 'roster' && (
        <div className="hms-card overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50 min-w-[120px]">Staff</th>
                {days.map(d => (
                  <th key={d} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-3 text-center bg-gray-50 min-w-[100px]">
                    {new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              : records.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<Calendar size={36} />} title="No shifts scheduled" description="Add shifts to build the weekly roster" /></td></tr>
              : (() => {
                  // Group by staffId
                  const staffMap = new Map<string, any[]>();
                  records.forEach(r => {
                    if (!staffMap.has(r.staffId)) staffMap.set(r.staffId, []);
                    staffMap.get(r.staffId)!.push(r);
                  });
                  const staffNames = new Map<string, string>();
                  staff.forEach(s => staffNames.set(s.id, `${s.firstName} ${s.lastName}`));

                  return Array.from(staffMap.entries()).map(([staffId, shifts]) => (
                    <tr key={staffId} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{staffNames.get(staffId) || staffId.slice(0, 8)}</td>
                      {days.map(d => {
                        const dayShift = shifts.find(s => s.shiftDate?.slice(0, 10) === d || new Date(s.shiftDate).toISOString().slice(0, 10) === d);
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            {dayShift ? (
                              <div className={`inline-flex flex-col items-center px-2 py-1 rounded-lg border text-[10px] font-bold ${SHIFT_COLORS[dayShift.shiftType] || SHIFT_COLORS.GENERAL}`}>
                                <span>{dayShift.shiftType}</span>
                                <span className="font-normal opacity-75">{dayShift.startTime}–{dayShift.endTime}</span>
                                {dayShift.status !== 'SCHEDULED' && <StatusBadge status={dayShift.status} />}
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()
              }
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leave' && (
        <div className="hms-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10"><tr>
                {['Staff', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
              </tr></thead>
              <tbody>
                {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
                : records.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<CalendarOff size={36} />} title="No leave requests" /></td></tr>
                : records.map(l => {
                  const staffName = staff.find(s => s.id === l.staffId);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{staffName ? `${staffName.firstName} ${staffName.lastName}` : l.staffId.slice(0, 8)}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.leaveType} /></td>
                      <td className="px-4 py-3 text-sm">{formatDate(l.startDate)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(l.endDate)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{l.totalDays}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{l.reason}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3">
                        {l.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleLeaveAction(l.id, 'approve')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Approve</button>
                            <button onClick={() => handleLeaveAction(l.id, 'reject')} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
        </div>
      )}

      {/* Add Shift Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Add Shift</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Staff *</label>
                <select className="hms-input w-full" value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })}>
                  <option value="">Select staff</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role?.name || ''})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label><input type="date" className="hms-input w-full" value={form.shiftDate} onChange={e => setForm({ ...form, shiftDate: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Shift Type</label>
                  <select className="hms-input w-full" value={form.shiftType} onChange={e => setForm({ ...form, shiftType: e.target.value })}>{SHIFT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Start Time</label><input type="time" className="hms-input w-full" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">End Time</label><input type="time" className="hms-input w-full" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleCreateShift} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Add Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Apply for Leave</h2>
              <button onClick={() => setShowLeaveForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Leave Type</label>
                <select className="hms-input w-full" value={leaveForm.leaveType} onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}>{LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">From *</label><input type="date" className="hms-input w-full" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">To *</label><input type="date" className="hms-input w-full" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Reason *</label><textarea className="hms-input w-full" rows={2} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowLeaveForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleApplyLeave} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
