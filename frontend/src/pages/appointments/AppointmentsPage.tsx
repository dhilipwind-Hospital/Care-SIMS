import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, CheckCircle, Plus, X, Search, XCircle, Edit3, Loader2 } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import ExportButton from '../../components/ui/ExportButton';
import api from '../../lib/api';
import { formatSlotTime } from '../../lib/format';

const EMPTY_FORM = {
  patientId: '', doctorId: '', appointmentDate: new Date().toISOString().split('T')[0],
  slotTime: '', appointmentType: 'CONSULTATION', chiefComplaint: '', notes: '',
};

const EMPTY_EDIT_FORM = {
  doctorId: '', appointmentDate: '', appointmentTime: '', notes: '', status: '',
};

export default function AppointmentsPage() {
  const [appts, setAppts]     = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');

  // Book modal
  const [showBook, setShowBook]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState('');

  // Patient search
  const [patSearch, setPatSearch]     = useState('');
  const [patients, setPatients]       = useState<any[]>([]);
  const [patLoading, setPatLoading]   = useState(false);
  const [selectedPat, setSelectedPat] = useState<any>(null);

  // Doctor list
  const [doctors, setDoctors]         = useState<any[]>([]);

  // Location filter for doctor dropdown
  const [locations, setLocations]     = useState<any[]>([]);
  const [locationFilter, setLocationFilter] = useState('');

  // Edit/Reschedule modal
  const [showEdit, setShowEdit]           = useState(false);
  const [editAppt, setEditAppt]           = useState<any>(null);
  const [editForm, setEditForm]           = useState(EMPTY_EDIT_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError]         = useState('');
  const [editSlots, setEditSlots]         = useState<any[]>([]);
  const [editSlotsLoading, setEditSlotsLoading] = useState(false);

  const fetchAppts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/appointments', {
        params: { date, status: statusFilter || undefined, page, limit: 20 },
      });
      setAppts(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAppts(); }, [date, statusFilter, page]);

  // Escape key to close modals
  useEscapeClose(showBook, () => setShowBook(false));
  useEscapeClose(showEdit, () => { setShowEdit(false); setEditAppt(null); });

  const fetchDoctors = async (locId?: string) => {
    try {
      if (locId) {
        const { data } = await api.get(`/doctors/by-location/${locId}`);
        setDoctors(data || []);
      } else {
        const { data } = await api.get('/doctors/affiliations/tenant');
        setDoctors(data || []);
      }
    } catch (err) { toast.error('Failed to load data'); }
  };

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/org/locations');
      setLocations(data.data || data || []);
    } catch (err) { console.error('Failed to fetch locations:', err); }
  };

  useEffect(() => {
    if (showBook || showEdit) {
      fetchDoctors();
      fetchLocations();
      setLocationFilter('');
    }
  }, [showBook, showEdit]);

  const handleLocationChange = (locId: string) => {
    setLocationFilter(locId);
    setForm(f => ({ ...f, doctorId: '' }));
    fetchDoctors(locId || undefined);
  };

  useEffect(() => {
    if (!patSearch.trim()) { setPatients([]); return; }
    const t = setTimeout(async () => {
      setPatLoading(true);
      try {
        const { data } = await api.get('/patients', { params: { q: patSearch, limit: 8 } });
        setPatients(data.data || []);
      } catch (err) { toast.error('Failed to load data'); } finally { setPatLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [patSearch]);

  // Fetch available slots when edit modal doctor/date changes
  useEffect(() => {
    if (!showEdit || !editForm.doctorId || !editForm.appointmentDate) { setEditSlots([]); return; }
    setEditSlotsLoading(true);
    api.get('/appointments/slots', { params: { doctorId: editForm.doctorId, date: editForm.appointmentDate } })
      .then(r => setEditSlots(r.data || []))
      .catch((err) => { console.error('Failed to fetch edit slots:', err); setEditSlots([]); })
      .finally(() => setEditSlotsLoading(false));
  }, [showEdit, editForm.doctorId, editForm.appointmentDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { setFormError('Please select a patient'); return; }
    if (!form.doctorId)  { setFormError('Please select a doctor'); return; }
    if (!form.appointmentDate) { setFormError('Please select an appointment date'); return; }
    if (form.appointmentDate < new Date().toISOString().split('T')[0]) { setFormError('Appointment date cannot be in the past'); return; }
    if (!form.slotTime)  { setFormError('Please enter appointment time'); return; }
    setSubmitting(true); setFormError('');
    try {
      await api.post('/appointments', form);
      toast.success('Appointment created');
      setShowBook(false);
      setForm(EMPTY_FORM);
      setSelectedPat(null);
      setPatSearch('');
      fetchAppts();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to book appointment');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      toast.success('Appointment cancelled');
      fetchAppts();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to cancel appointment'); }
  };

  const openEditModal = (appt: any) => {
    setEditAppt(appt);
    setEditForm({
      doctorId: appt.doctorId || '',
      appointmentDate: appt.appointmentDate ? new Date(appt.appointmentDate).toISOString().split('T')[0] : '',
      appointmentTime: appt.slotTime || appt.appointmentTime || '',
      notes: appt.notes || '',
      status: appt.status || 'SCHEDULED',
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppt) return;
    if (!editForm.doctorId) { setEditError('Please select a doctor'); return; }
    if (!editForm.appointmentDate) { setEditError('Please select a date'); return; }
    if (!editForm.appointmentTime) { setEditError('Please select a time slot'); return; }
    setEditSubmitting(true); setEditError('');
    try {
      await api.put(`/appointments/${editAppt.id}`, editForm);
      toast.success('Appointment updated successfully');
      setShowEdit(false);
      setEditAppt(null);
      setEditForm(EMPTY_EDIT_FORM);
      fetchAppts();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update appointment');
    } finally { setEditSubmitting(false); }
  };

  const scheduled = appts.filter(a => a.status === 'SCHEDULED').length;
  const completed  = appts.filter(a => a.status === 'COMPLETED').length;
  const cancelled  = appts.filter(a => a.status === 'CANCELLED').length;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Appointments" subtitle="Manage patient appointments"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton endpoint="/appointments/export" params={{ date, status: statusFilter || undefined }} filename={`appointments-${date}.csv`} />
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <button onClick={() => { setShowBook(true); setForm({ ...EMPTY_FORM, appointmentDate: date }); setFormError(''); setSelectedPat(null); setPatSearch(''); }}
              className="btn-primary flex items-center gap-2">
              <Plus size={15} /> Book Appointment
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Today" value={total}     icon={Calendar}     color="#0F766E" />
        <KpiCard label="Scheduled"   value={scheduled} icon={Clock}        color="#3B82F6" />
        <KpiCard label="Completed"   value={completed}  icon={CheckCircle} color="#10B981" />
        <KpiCard label="Cancelled"   value={cancelled}  icon={Users}       color="#EF4444" />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[['','All'],['SCHEDULED','Scheduled'],['COMPLETED','Completed'],['CANCELLED','Cancelled'],['NO_SHOW','No Show']].map(([v,l]) => (
          <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter===v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-400'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Appointments — {date}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Appt #','Patient','Doctor','Dept','Time','Type','Status','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              ) : appts.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={<Calendar size={24} className="text-gray-400" />}
                    title="No appointments"
                    description="No appointments found for the selected filters."
                  />
                </td></tr>
              ) : appts.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-teal-700">{a.appointmentNumber}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{a.patient?.firstName} {a.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">{a.patient?.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.department?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatSlotTime(a.slotTime)}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{a.appointmentType}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
                        <button onClick={() => openEditModal(a)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">
                          <Edit3 size={11} /> Reschedule
                        </button>
                      )}
                      {a.status === 'SCHEDULED' && (
                        <button onClick={() => handleCancel(a.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium">
                          <XCircle size={11} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* ── BOOK APPOINTMENT MODAL ── */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">Book Appointment</h2>
                <p className="text-xs text-gray-400 mt-0.5">Schedule a new patient appointment</p>
              </div>
              <button type="button" onClick={() => setShowBook(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleBook} className="p-6 space-y-4">
              {/* Patient */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient <span className="text-red-500">*</span></label>
                {selectedPat ? (
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                    <div>
                      <span className="font-semibold text-teal-800 text-sm">{selectedPat.firstName} {selectedPat.lastName}</span>
                      <span className="text-xs text-teal-600 ml-2">{selectedPat.patientId}</span>
                    </div>
                    <button type="button" onClick={() => { setSelectedPat(null); setForm(f => ({ ...f, patientId: '' })); }}
                      className="text-teal-500 hover:text-red-500"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={patSearch} onChange={e => setPatSearch(e.target.value)}
                      placeholder="Search by name, phone or patient ID…"
                      className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    {patients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-44 overflow-y-auto">
                        {patLoading ? (
                          <div className="p-3 text-sm text-gray-400">Searching…</div>
                        ) : patients.map(p => (
                          <button key={p.id} type="button"
                            onClick={() => { setSelectedPat(p); setForm(f => ({ ...f, patientId: p.id })); setPatSearch(''); setPatients([]); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                            <span className="font-medium text-gray-900">{p.firstName} {p.lastName}</span>
                            <span className="text-gray-400 text-xs ml-2">{p.patientId} · {p.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Location Filter */}
                {locations.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Location</label>
                    <select value={locationFilter} onChange={e => handleLocationChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="">All locations</option>
                      {locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>{loc.name}{loc.city ? ` — ${loc.city}` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Doctor */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Doctor <span className="text-red-500">*</span></label>
                  <select value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select doctor…</option>
                    {doctors.map((d: any) => (
                      <option key={d.doctorId || d.id} value={d.doctorId || d.id}>
                        Dr. {d.doctor?.firstName || d.firstName} {d.doctor?.lastName || d.lastName}
                        {d.departmentName ? ` — ${d.departmentName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Appointment Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select value={form.appointmentType} onChange={e => setForm(f => ({ ...f, appointmentType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['CONSULTATION','FOLLOW_UP','PROCEDURE','REVIEW','EMERGENCY'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.appointmentDate} onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {/* Time */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Time Slot <span className="text-red-500">*</span></label>
                  <input type="time" value={form.slotTime} onChange={e => setForm(f => ({ ...f, slotTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {/* Chief Complaint */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Chief Complaint</label>
                  <input value={form.chiefComplaint} onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))}
                    placeholder="e.g. Fever, headache, follow-up…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowBook(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="btn-primary flex items-center gap-2">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Booking…' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT / RESCHEDULE APPOINTMENT MODAL ── */}
      {showEdit && editAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">Edit / Reschedule Appointment</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editAppt.appointmentNumber} — {editAppt.patient?.firstName} {editAppt.patient?.lastName}
                </p>
              </div>
              <button type="button" onClick={() => { setShowEdit(false); setEditAppt(null); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Doctor */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Doctor <span className="text-red-500">*</span></label>
                  <select value={editForm.doctorId} onChange={e => setEditForm(f => ({ ...f, doctorId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select doctor…</option>
                    {doctors.map((d: any) => (
                      <option key={d.doctorId || d.id} value={d.doctorId || d.id}>
                        Dr. {d.doctor?.firstName || d.firstName} {d.doctor?.lastName || d.lastName}
                        {d.departmentName ? ` — ${d.departmentName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={editForm.appointmentDate}
                    onChange={e => setEditForm(f => ({ ...f, appointmentDate: e.target.value, appointmentTime: '' }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {/* Time Slot */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Time Slot <span className="text-red-500">*</span></label>
                  {editSlotsLoading ? (
                    <div className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400">Loading slots…</div>
                  ) : editSlots.length > 0 ? (
                    <select value={editForm.appointmentTime}
                      onChange={e => setEditForm(f => ({ ...f, appointmentTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="">Select a slot…</option>
                      {editSlots.map((slot: any) => {
                        const time = typeof slot === 'string' ? slot : slot.time || slot.slotTime;
                        const available = typeof slot === 'string' ? true : slot.available !== false;
                        return (
                          <option key={time} value={time} disabled={!available}>
                            {time}{!available ? ' (Booked)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input type="time" value={editForm.appointmentTime}
                      onChange={e => setEditForm(f => ({ ...f, appointmentTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  )}
                </div>
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['SCHEDULED','COMPLETED','NO_SHOW'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea rows={2} value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Reason for rescheduling, additional notes…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{editError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setShowEdit(false); setEditAppt(null); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={editSubmitting}
                  className="btn-primary flex items-center gap-2">
                  {editSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {editSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
