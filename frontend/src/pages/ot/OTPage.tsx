import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Scissors, Calendar, Clock, CheckCircle, Plus, X, Search, Pencil } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const EMPTY_BOOKING = {
  otRoomId: '', patientId: '', admissionId: '', procedureName: '',
  primarySurgeonId: '', anesthetistId: '', scheduledDate: '',
  scheduledStart: '', expectedDurationMins: 60, surgeryType: 'ELECTIVE',
  anesthesiaType: '', notes: '',
};

export default function OTPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'schedule'|'rooms'>('schedule');
  const [page, setPage] = useState(1);

  // Schedule surgery modal
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState(EMPTY_BOOKING);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPatientLabel, setSelectedPatientLabel] = useState('');

  // Doctors (surgeons + anesthetists)
  const [doctors, setDoctors] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.get('/ot/bookings', { params: { limit: 30, date: new Date().toISOString().split('T')[0] } }),
        api.get('/ot/rooms'),
      ]);
      setBookings(bRes.data.data || []);
      setRooms(rRes.data || []);
    } catch (err) { console.error('Failed to load OT data:', err); toast.error('Failed to load OT data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Escape key to close modals
  useEscapeClose(showBooking, () => setShowBooking(false));

  const scheduled = bookings.filter(b => b.status === 'SCHEDULED').length;
  const inProgress = bookings.filter(b => b.status === 'IN_PROGRESS').length;
  const completed = bookings.filter(b => b.status === 'COMPLETED').length;

  // ---------- Patient search ----------
  const searchPatients = async (q: string) => {
    if (!q.trim()) { setPatients([]); return; }
    setPatientLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { q, limit: 8 } });
      setPatients(data.data || []);
    } catch (err) { console.error('Patient search failed:', err); toast.error('Patient search failed'); } finally { setPatientLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // ---------- Open modal ----------
  const openBookingModal = async (booking?: any) => {
    setFormError('');
    setPatientSearch('');
    setPatients([]);

    if (booking) {
      // Editing existing booking
      setEditingId(booking.id);
      setBookingForm({
        otRoomId: booking.otRoomId || '',
        patientId: booking.patientId || '',
        admissionId: booking.admissionId || '',
        procedureName: booking.procedureName || '',
        primarySurgeonId: booking.primarySurgeonId || '',
        anesthetistId: booking.anesthetistId || '',
        scheduledDate: booking.scheduledDate ? new Date(booking.scheduledDate).toISOString().split('T')[0] : '',
        scheduledStart: booking.scheduledStart || '',
        expectedDurationMins: booking.expectedDurationMins || 60,
        surgeryType: booking.surgeryType || 'ELECTIVE',
        anesthesiaType: booking.anesthesiaType || '',
        notes: booking.notes || '',
      });
      setSelectedPatientLabel(
        booking.patient ? `${booking.patient.firstName} ${booking.patient.lastName} — ${booking.patient.patientId}` : booking.patientId
      );
    } else {
      setEditingId(null);
      setBookingForm(EMPTY_BOOKING);
      setSelectedPatientLabel('');
    }

    setShowBooking(true);

    // Load doctors
    try {
      const { data } = await api.get('/doctors/affiliations/tenant');
      setDoctors(data.data || data || []);
    } catch (err) { console.error('Failed to fetch doctors:', err); }
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patientId) { setFormError('Please select a patient'); return; }
    if (!bookingForm.otRoomId) { setFormError('Please select an OT room'); return; }
    if (!bookingForm.procedureName.trim()) { setFormError('Please enter a procedure name'); return; }
    if (!bookingForm.primarySurgeonId) { setFormError('Please select a surgeon'); return; }
    if (!bookingForm.scheduledDate) { setFormError('Please select a scheduled date'); return; }
    if (!bookingForm.scheduledStart) { setFormError('Please select a start time'); return; }
    setSubmitting(true); setFormError('');
    try {
      if (editingId) {
        await api.put(`/ot/bookings/${editingId}`, bookingForm);
        toast.success('Booking updated successfully');
      } else {
        await api.post('/ot/bookings', bookingForm);
        toast.success('Surgery scheduled successfully');
      }
      setShowBooking(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save booking');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Operating Theatre" subtitle="OT scheduling and room management" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total OT Rooms" value={rooms.length} icon={Scissors} color="#0F766E" />
        <KpiCard label="Scheduled Today" value={scheduled} icon={Calendar} color="#3B82F6" />
        <KpiCard label="In Progress" value={inProgress} icon={Clock} color="#F59E0B" />
        <KpiCard label="Completed" value={completed} icon={CheckCircle} color="#10B981" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {[['schedule','OT Schedule'],['rooms','OT Rooms']].map(([val,label]) => (
            <button key={val} onClick={() => { setTab(val as any); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'schedule' && (
          <button onClick={() => openBookingModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={14} /> Schedule Surgery
          </button>
        )}
      </div>

      {tab === 'schedule' && (
        <div className="hms-card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">OT Bookings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Booking #','Patient','Surgeon','Procedure','OT Room','Scheduled','Duration','Status','Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)}</>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={9} className="p-0"><EmptyState icon={<Scissors size={36} />} title="No OT bookings" description="Schedule surgeries to see them listed here" /></td></tr>
                ) : bookings.slice((page - 1) * 20, page * 20).map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-teal-700">{b.bookingNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{b.patient?.firstName} {b.patient?.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.primarySurgeon ? `Dr. ${b.primarySurgeon.firstName}` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate">{b.procedureName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.otRoom?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.expectedDurationMins}m</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {b.status === 'SCHEDULED' && (
                          <>
                            <button onClick={() => openBookingModal(b)}
                              className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 font-medium"
                              title="Edit booking">
                              <Pencil size={13} />
                            </button>
                            <button onClick={async () => { try { await api.patch(`/ot/bookings/${b.id}/start`); toast.success('Surgery started'); fetchData(); } catch (err) { console.error('Failed to start surgery:', err); toast.error('Failed to start surgery'); } }}
                              className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Start</button>
                          </>
                        )}
                        {b.status === 'IN_PROGRESS' && (
                          <button onClick={async () => { try { await api.patch(`/ot/bookings/${b.id}/complete`, {}); toast.success('Surgery completed'); fetchData(); } catch (err) { console.error('Failed to complete surgery:', err); toast.error('Failed to complete surgery'); } }}
                            className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(bookings.length / 20)} onPageChange={setPage} totalItems={bookings.length} pageSize={20} />
        </div>
      )}

      {tab === 'rooms' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rooms.slice((page - 1) * 20, page * 20).map(room => (
            <div key={room.id} className="hms-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{room.name}</h4>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${room.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : room.status === 'IN_USE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {room.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>Type: <span className="text-gray-700 font-medium">{room.type}</span></div>
                <div>Class: <span className="text-gray-700 font-medium">{room.capacityClass}</span></div>
              </div>
            </div>
          ))}
          {rooms.length === 0 && !loading && (
            <div className="col-span-3 hms-card"><EmptyState icon={<Scissors size={36} />} title="No OT rooms configured" description="Add operating theatre rooms to manage surgeries" /></div>
          )}
          {rooms.length > 0 && (
            <div className="col-span-3"><Pagination page={page} totalPages={Math.ceil(rooms.length / 20)} onPageChange={setPage} totalItems={rooms.length} pageSize={20} /></div>
          )}
        </div>
      )}

      {/* ========== SCHEDULE / EDIT SURGERY MODAL ========== */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">{editingId ? 'Edit OT Booking' : 'Schedule Surgery'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingId ? 'Update the booking details' : 'Create a new OT booking'}</p>
              </div>
              <button type="button" onClick={() => setShowBooking(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Patient search */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient <span className="text-red-500">*</span></label>
                {bookingForm.patientId ? (
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                    <span className="text-sm font-medium text-teal-800">{selectedPatientLabel}</span>
                    {!editingId && (
                      <button type="button" onClick={() => { setBookingForm(f => ({ ...f, patientId: '' })); setSelectedPatientLabel(''); }} className="text-teal-600 hover:text-red-500"><X size={14} /></button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                      placeholder="Search by name, phone or patient ID..."
                      className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    {patients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-48 overflow-y-auto">
                        {patientLoading ? <div className="p-3 text-sm text-gray-400">Searching...</div> : patients.map(p => (
                          <button key={p.id} type="button" onClick={() => {
                            setBookingForm(f => ({ ...f, patientId: p.id }));
                            setSelectedPatientLabel(`${p.firstName} ${p.lastName} — ${p.patientId}`);
                            setPatients([]);
                            setPatientSearch('');
                          }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                            <span className="font-medium">{p.firstName} {p.lastName}</span>
                            <span className="text-gray-400 ml-2">{p.patientId} · {p.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OT Room + Procedure */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">OT Room <span className="text-red-500">*</span></label>
                  <select value={bookingForm.otRoomId} onChange={e => setBookingForm(f => ({ ...f, otRoomId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select room</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Procedure Name <span className="text-red-500">*</span></label>
                  <input value={bookingForm.procedureName} onChange={e => setBookingForm(f => ({ ...f, procedureName: e.target.value }))}
                    placeholder="e.g. Appendectomy"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {/* Surgeon + Anesthetist */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Surgeon <span className="text-red-500">*</span></label>
                  <select value={bookingForm.primarySurgeonId} onChange={e => setBookingForm(f => ({ ...f, primarySurgeonId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select surgeon</option>
                    {doctors.map((d: any) => (
                      <option key={d.id || d.doctorId} value={d.id || d.doctorId}>
                        Dr. {d.firstName || d.doctor?.firstName} {d.lastName || d.doctor?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Anesthetist</label>
                  <select value={bookingForm.anesthetistId} onChange={e => setBookingForm(f => ({ ...f, anesthetistId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select anesthetist</option>
                    {doctors.map((d: any) => (
                      <option key={d.id || d.doctorId} value={d.id || d.doctorId}>
                        Dr. {d.firstName || d.doctor?.firstName} {d.lastName || d.doctor?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Time + Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled Date <span className="text-red-500">*</span></label>
                  <input type="date" value={bookingForm.scheduledDate} onChange={e => setBookingForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Time <span className="text-red-500">*</span></label>
                  <input type="time" value={bookingForm.scheduledStart} onChange={e => setBookingForm(f => ({ ...f, scheduledStart: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (mins)</label>
                  <input type="number" min="15" step="15" value={bookingForm.expectedDurationMins}
                    onChange={e => setBookingForm(f => ({ ...f, expectedDurationMins: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {/* Surgery Type + Anesthesia Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Surgery Type</label>
                  <select value={bookingForm.surgeryType} onChange={e => setBookingForm(f => ({ ...f, surgeryType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['ELECTIVE', 'EMERGENCY', 'URGENT', 'DAYCARE'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Anesthesia Type</label>
                  <select value={bookingForm.anesthesiaType} onChange={e => setBookingForm(f => ({ ...f, anesthesiaType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select type</option>
                    {['GENERAL', 'SPINAL', 'EPIDURAL', 'LOCAL', 'REGIONAL', 'SEDATION', 'NONE'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Admission ID + Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Admission ID</label>
                  <input value={bookingForm.admissionId} onChange={e => setBookingForm(f => ({ ...f, admissionId: e.target.value }))}
                    placeholder="Optional — link to admission"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <input value={bookingForm.notes} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Pre-op notes..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {formError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowBooking(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {submitting ? 'Saving...' : editingId ? 'Update Booking' : 'Schedule Surgery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
