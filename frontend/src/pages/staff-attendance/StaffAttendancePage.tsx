import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, UserCheck, UserX, CalendarOff, Pencil, Plus, X, Search, BarChart3, User, Trash2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const EMPTY_MARK_FORM = {
  userId: '', userName: '', departmentId: '', locationId: '',
  attendanceDate: new Date().toISOString().split('T')[0],
  shiftType: 'GENERAL', status: 'PRESENT', leaveType: '', leaveReason: '', notes: '',
};

type TabType = 'records' | 'summary' | 'my';

export default function StaffAttendancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('records');

  // ── Records tab state ──
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ shiftType: 'GENERAL', status: 'PRESENT', notes: '' });

  // ── Mark Attendance modal state ──
  const [showMark, setShowMark] = useState(false);
  const [markForm, setMarkForm] = useState(EMPTY_MARK_FORM);
  const [markSubmitting, setMarkSubmitting] = useState(false);
  const [markError, setMarkError] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffResults, setStaffResults] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // ── Summary tab state ──
  const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── My Attendance tab state ──
  const [myMonth, setMyMonth] = useState(new Date().toISOString().slice(0, 7));
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  // ── Fetch records ──
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/staff-attendance?date=${dateFilter}`);
      setRecords(data.data || data || []);
    } catch (err) { toast.error('Failed to load attendance records'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, [dateFilter]);

  // ── Clock in/out ──
  const clockIn = async () => { try { await api.post('/staff-attendance/clock-in', { shiftType: 'GENERAL' }); toast.success('Clocked in successfully'); fetchData(); } catch (err) { toast.error('Failed to clock in'); } };
  const clockOut = async () => { try { await api.patch('/staff-attendance/clock-out'); toast.success('Clocked out successfully'); fetchData(); } catch (err) { toast.error('Failed to clock out'); } };

  // ── Edit inline ──
  const resetForm = () => {
    setEditForm({ shiftType: 'GENERAL', status: 'PRESENT', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const editRecord = (r: any) => {
    setEditForm({
      shiftType: r.shiftType || 'GENERAL',
      status: r.status || 'PRESENT',
      notes: r.notes || '',
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await api.patch(`/staff-attendance/${editingId}`, editForm);
      toast.success('Attendance record updated successfully');
      resetForm();
      fetchData();
    } catch (err) { toast.error('Failed to update attendance record'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await api.delete(`/staff-attendance/${id}`);
      toast.success('Attendance record deleted');
      fetchData();
    } catch (err) { toast.error('Failed to delete attendance record'); }
  };

  // ── Staff search for Mark Attendance ──
  useEffect(() => {
    if (!staffSearch.trim()) { setStaffResults([]); return; }
    const t = setTimeout(async () => {
      setStaffLoading(true);
      try {
        const { data } = await api.get('/users', { params: { q: staffSearch, limit: 10 } });
        setStaffResults(data.data || data || []);
      } catch (err) { setStaffResults([]); }
      finally { setStaffLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [staffSearch]);

  // ── Mark attendance submit ──
  const handleMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markForm.userId) { setMarkError('Please select a staff member'); return; }
    if (!markForm.attendanceDate) { setMarkError('Please select a date'); return; }
    if (markForm.status === 'ON_LEAVE' && !markForm.leaveType) { setMarkError('Please select a leave type'); return; }
    setMarkSubmitting(true); setMarkError('');
    try {
      await api.post('/staff-attendance/mark', markForm);
      toast.success('Attendance marked successfully');
      setShowMark(false);
      setMarkForm(EMPTY_MARK_FORM);
      setSelectedStaff(null);
      setStaffSearch('');
      fetchData();
    } catch (err: any) {
      setMarkError(err.response?.data?.message || 'Failed to mark attendance');
    } finally { setMarkSubmitting(false); }
  };

  // ── Fetch summary ──
  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const { data } = await api.get('/staff-attendance/summary', { params: { month: summaryMonth } });
      setSummary(data);
    } catch (err) { toast.error('Failed to load summary'); }
    finally { setSummaryLoading(false); }
  };
  useEffect(() => { if (activeTab === 'summary') fetchSummary(); }, [activeTab, summaryMonth]);

  // ── Fetch my attendance ──
  const fetchMyAttendance = async () => {
    setMyLoading(true);
    try {
      const { data } = await api.get('/staff-attendance/my', { params: { month: myMonth } });
      setMyRecords(data.data || data || []);
    } catch (err) { toast.error('Failed to load your attendance'); }
    finally { setMyLoading(false); }
  };
  useEffect(() => { if (activeTab === 'my') fetchMyAttendance(); }, [activeTab, myMonth]);

  const present = records.filter(r => r.status === 'PRESENT').length;
  const absent = records.filter(r => r.status === 'ABSENT').length;
  const onLeave = records.filter(r => r.status === 'ON_LEAVE').length;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Staff Attendance" subtitle="Track staff attendance and shifts"
        actions={
          <button onClick={() => { setShowMark(true); setMarkForm(EMPTY_MARK_FORM); setMarkError(''); setSelectedStaff(null); setStaffSearch(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Mark Attendance
          </button>
        }
      />

      {/* ── Tab navigation ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          ['records', 'Attendance Records', Clock],
          ['summary', 'Monthly Summary', BarChart3],
          ['my', 'My Attendance', User],
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setActiveTab(key as TabType)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ RECORDS TAB ═══════════════ */}
      {activeTab === 'records' && (
        <>
          {loading ? <SkeletonKpiRow count={4} /> : (
            <div className="grid grid-cols-4 gap-4">
              <KpiCard label="Present" value={present} icon={UserCheck} color="#10B981" />
              <KpiCard label="Absent" value={absent} icon={UserX} color="#EF4444" />
              <KpiCard label="On Leave" value={onLeave} icon={CalendarOff} color="#F59E0B" />
              <KpiCard label="Total Records" value={records.length} icon={Clock} color="#3B82F6" />
            </div>
          )}
          <div className="flex items-center gap-4">
            <input className="hms-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            <div className="ml-auto flex gap-2">
              <button onClick={clockIn} className="px-4 py-2 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700">Clock In</button>
              <button onClick={clockOut} className="px-4 py-2 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700">Clock Out</button>
            </div>
          </div>

          {showForm && editingId && (
            <div className="hms-card p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Edit Attendance Record</h3>
              <div className="grid grid-cols-3 gap-4">
                <select className="hms-input" value={editForm.shiftType} onChange={e => setEditForm({ ...editForm, shiftType: e.target.value })}>
                  <option value="GENERAL">General</option>
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="NIGHT">Night</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
                <select className="hms-input" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LATE">Late</option>
                </select>
                <input className="hms-input" placeholder="Notes" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleUpdate} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Update</button>
                <button onClick={resetForm} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Name</th><th className="text-left p-3 font-medium text-gray-600">Department</th><th className="text-left p-3 font-medium text-gray-600">Shift</th><th className="text-left p-3 font-medium text-gray-600">Clock In</th><th className="text-left p-3 font-medium text-gray-600">Clock Out</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
          <tbody>{loading ? (
            <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
          ) : records.length === 0 ? (
            <tr><td colSpan={7} className="p-0">
              <EmptyState icon={<Clock size={36} />} title="No attendance records" description="Records will appear when staff clock in" />
            </td></tr>
          ) : records.map(r => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{r.userName}</td>
              <td className="p-3">{r.departmentId || '—'}</td>
              <td className="p-3">{r.shiftType}</td>
              <td className="p-3">{r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : '—'}</td>
              <td className="p-3">{r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '—'}</td>
              <td className="p-3"><StatusBadge status={r.status} /></td>
              <td className="p-3">
                <button onClick={() => editRecord(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium" title="Edit record"><Pencil size={13} className="inline mr-0.5" />Edit</button>
                <button onClick={() => handleDelete(r.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium inline-flex items-center gap-1" title="Delete record"><Trash2 size={12} /> Delete</button>
              </td>
            </tr>
          ))}</tbody></table></div>
        </>
      )}

      {/* ═══════════════ SUMMARY TAB ═══════════════ */}
      {activeTab === 'summary' && (
        <>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-600">Month:</label>
            <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          {summaryLoading ? <SkeletonKpiRow count={4} /> : summary ? (
            <div className="grid grid-cols-4 gap-4">
              <KpiCard label="Total Records" value={summary.total} icon={Clock} color="#0F766E" />
              <KpiCard label="Present" value={summary.present} icon={UserCheck} color="#10B981" />
              <KpiCard label="Absent" value={summary.absent} icon={UserX} color="#EF4444" />
              <KpiCard label="On Leave" value={summary.leave} icon={CalendarOff} color="#F59E0B" />
            </div>
          ) : (
            <div className="hms-card p-8 text-center">
              <EmptyState icon={<BarChart3 size={36} />} title="No summary data" description="Select a month to view attendance summary" />
            </div>
          )}
          {summary && summary.total > 0 && (
            <div className="hms-card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Attendance Breakdown — {summaryMonth}</h3>
              <div className="space-y-3">
                {[
                  { label: 'Present', value: summary.present, color: '#10B981' },
                  { label: 'Absent', value: summary.absent, color: '#EF4444' },
                  { label: 'On Leave', value: summary.leave, color: '#F59E0B' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24">{item.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${summary.total ? (item.value / summary.total) * 100 : 0}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                      {item.value} ({summary.total ? Math.round((item.value / summary.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ MY ATTENDANCE TAB ═══════════════ */}
      {activeTab === 'my' && (
        <>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-600">Month:</label>
            <input type="month" value={myMonth} onChange={e => setMyMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          {myLoading ? <SkeletonKpiRow count={4} /> : (
            <div className="grid grid-cols-4 gap-4">
              <KpiCard label="Total Days" value={myRecords.length} icon={Clock} color="#0F766E" />
              <KpiCard label="Present" value={myRecords.filter(r => r.status === 'PRESENT').length} icon={UserCheck} color="#10B981" />
              <KpiCard label="Absent" value={myRecords.filter(r => r.status === 'ABSENT').length} icon={UserX} color="#EF4444" />
              <KpiCard label="On Leave" value={myRecords.filter(r => r.status === 'ON_LEAVE').length} icon={CalendarOff} color="#F59E0B" />
            </div>
          )}
          <div className="hms-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--surface)' }}>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Shift</th>
                  <th className="text-left p-3 font-medium text-gray-600">Clock In</th>
                  <th className="text-left p-3 font-medium text-gray-600">Clock Out</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {myLoading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                ) : myRecords.length === 0 ? (
                  <tr><td colSpan={6} className="p-0">
                    <EmptyState icon={<User size={36} />} title="No attendance records" description="Your attendance records for this month will appear here" />
                  </td></tr>
                ) : myRecords.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString() : '—'}</td>
                    <td className="p-3">{r.shiftType}</td>
                    <td className="p-3">{r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : '—'}</td>
                    <td className="p-3">{r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '—'}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 text-gray-500 text-xs">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MARK ATTENDANCE MODAL ── */}
      {showMark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">Mark Attendance</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manually mark attendance for a staff member</p>
              </div>
              <button onClick={() => setShowMark(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleMark} className="p-6 space-y-4">
              {/* Staff member search */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Staff Member <span className="text-red-500">*</span></label>
                {selectedStaff ? (
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                    <div>
                      <span className="font-semibold text-teal-800 text-sm">{selectedStaff.name || `${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`}</span>
                      <span className="text-xs text-teal-600 ml-2">{selectedStaff.email}</span>
                    </div>
                    <button type="button" onClick={() => { setSelectedStaff(null); setMarkForm(f => ({ ...f, userId: '', userName: '' })); }}
                      className="text-teal-500 hover:text-red-500"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    {staffResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-44 overflow-y-auto">
                        {staffLoading ? (
                          <div className="p-3 text-sm text-gray-400">Searching…</div>
                        ) : staffResults.map(u => {
                          const userName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim();
                          return (
                            <button key={u.id} type="button"
                              onClick={() => {
                                setSelectedStaff(u);
                                setMarkForm(f => ({ ...f, userId: u.id, userName, departmentId: u.departmentId || '' }));
                                setStaffSearch(''); setStaffResults([]);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                              <span className="font-medium text-gray-900">{userName}</span>
                              <span className="text-gray-400 text-xs ml-2">{u.email} {u.role ? `· ${u.role}` : ''}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={markForm.attendanceDate}
                    onChange={e => setMarkForm(f => ({ ...f, attendanceDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {/* Shift Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Shift Type</label>
                  <select value={markForm.shiftType} onChange={e => setMarkForm(f => ({ ...f, shiftType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="GENERAL">General</option>
                    <option value="MORNING">Morning</option>
                    <option value="AFTERNOON">Afternoon</option>
                    <option value="NIGHT">Night</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status <span className="text-red-500">*</span></label>
                  <select value={markForm.status}
                    onChange={e => setMarkForm(f => ({ ...f, status: e.target.value, leaveType: e.target.value !== 'ON_LEAVE' ? '' : f.leaveType, leaveReason: e.target.value !== 'ON_LEAVE' ? '' : f.leaveReason }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="HALF_DAY">Half Day</option>
                  </select>
                </div>
                {/* Leave Type (conditional) */}
                {markForm.status === 'ON_LEAVE' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Leave Type <span className="text-red-500">*</span></label>
                    <select value={markForm.leaveType} onChange={e => setMarkForm(f => ({ ...f, leaveType: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="">Select leave type…</option>
                      <option value="CASUAL">Casual Leave</option>
                      <option value="SICK">Sick Leave</option>
                      <option value="EARNED">Earned Leave</option>
                      <option value="MATERNITY">Maternity Leave</option>
                      <option value="PATERNITY">Paternity Leave</option>
                      <option value="UNPAID">Unpaid Leave</option>
                    </select>
                  </div>
                )}
                {/* Leave Reason (conditional) */}
                {markForm.status === 'ON_LEAVE' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Leave Reason</label>
                    <input value={markForm.leaveReason} onChange={e => setMarkForm(f => ({ ...f, leaveReason: e.target.value }))}
                      placeholder="Reason for leave…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                )}
                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea rows={2} value={markForm.notes} onChange={e => setMarkForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              </div>

              {markError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{markError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowMark(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={markSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {markSubmitting ? 'Marking…' : 'Mark Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
