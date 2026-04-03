import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, CheckCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

const DEPARTMENTS = ['All', 'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics', 'Gynecology', 'General'];
const TIME_SLOTS_MORNING = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const TIME_SLOTS_AFTERNOON = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['S','M','T','W','T','F','S'];

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function PatientAppointmentsPage() {
  const user = getUser();
  const today = new Date();

  // Step 1
  const [deptFilter, setDeptFilter] = useState('All');
  const [docSearch, setDocSearch] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Step 2
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');

  // Step 3 / confirm
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [booked, setBooked] = useState(false);

  const fetchDoctors = async () => {
    setDocsLoading(true);
    try {
      const params: any = { limit: 20 };
      if (docSearch.trim()) params.q = docSearch;
      if (deptFilter !== 'All') params.specialty = deptFilter;
      const { data } = await api.get('/doctors', { params });
      setDoctors(data.data || []);
    } catch (err) { toast.error('Failed to load doctors'); setDoctors([]); } finally { setDocsLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(fetchDoctors, 300);
    return () => clearTimeout(t);
  }, [docSearch, deptFilter]);

  const submitBooking = async () => {
    if (!selectedDoc || !selectedDay) return;
    setBooking(true); setBookError('');
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`;
    try {
      await api.post('/appointments', {
        doctorId: selectedDoc.userId || selectedDoc.id,
        appointmentDate: dateStr,
        appointmentTime: selectedSlot || undefined,
        type: 'CONSULTATION',
        chiefComplaint: chiefComplaint || undefined,
        source: 'PATIENT_PORTAL',
      });
      setBooked(true);
    } catch (err: any) {
      setBookError(err.response?.data?.message || 'Failed to book appointment');
    } finally { setBooking(false); }
  };

  const calCells = buildCalendar(calYear, calMonth);
  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); setSelectedDay(null); setSelectedSlot(null); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); setSelectedDay(null); setSelectedSlot(null); };

  const selectedDateStr = selectedDay
    ? new Date(calYear, calMonth, selectedDay).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const consultFee = selectedDoc?.consultationFee || selectedDoc?.fee || 900;

  // Success screen
  if (booked) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-6" style={{ background: '#F5F7FA' }}>
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-teal-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Appointment Confirmed!</h2>
          <p className="text-gray-500 mt-2">
            Your appointment with Dr. {selectedDoc?.firstName} {selectedDoc?.lastName} has been booked.
          </p>
          {selectedDateStr && selectedSlot && (
            <p className="text-teal-700 font-semibold mt-1">{selectedDateStr} at {selectedSlot}</p>
          )}
        </div>
        <button onClick={() => { setBooked(false); setSelectedDoc(null); setSelectedDay(null); setSelectedSlot(null); setChiefComplaint(''); }}
          className="px-8 py-3 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
          Book Another Appointment
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Book an Appointment</h1>
            <p className="text-sm text-gray-400 mt-0.5">Find and book your preferred doctor in a few simple steps</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-600">
              <Calendar size={14} className="text-teal-600" />
              {user?.tenantName || 'Hospital'}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
                placeholder="Search doctors, specialties…"
                className="pl-9 pr-4 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 w-64 bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 shadow-card">
        <div className="flex items-center justify-center gap-0 max-w-2xl mx-auto">
          {[
            { n: 1, label: 'Select Doctor', sub: selectedDoc ? `Dr. ${selectedDoc.firstName} ${selectedDoc.lastName}` : 'Choose your preferred doctor', done: !!selectedDoc },
            { n: 2, label: 'Date & Time',   sub: selectedDateStr ? `${selectedDateStr}${selectedSlot ? ` · ${selectedSlot}` : ''}` : 'Pick a slot', done: !!selectedDay },
            { n: 3, label: 'Confirm',        sub: 'Review & confirm booking', done: false },
          ].map((s, i, arr) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1 gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                  s.done ? 'bg-teal-500 border-teal-500 text-white'
                  : s.n === (!selectedDoc ? 1 : !selectedDay ? 2 : 3) ? 'border-teal-500 text-teal-700 bg-white'
                  : 'border-gray-200 text-gray-400 bg-white'
                }`}>
                  {s.done ? <CheckCircle size={18} /> : s.n}
                </div>
                <div className="text-center">
                  <p className={`text-xs font-semibold ${s.done || s.n === (!selectedDoc ? 1 : !selectedDay ? 2 : 3) ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{s.sub}</p>
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full mb-6 ${s.done ? 'bg-teal-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content — persistent split layout, all panels always visible */}
      <div className="flex flex-1 gap-6 px-8 pb-8 overflow-auto">

        {/* ── LEFT: Doctor Grid ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Department filter chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-sm font-medium text-gray-600 mr-1">Department:</span>
            {DEPARTMENTS.map(dept => (
              <button key={dept} onClick={() => setDeptFilter(dept)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  deptFilter === dept
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
                }`}>{dept}</button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Showing {doctors.length} doctors</p>
            <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-600">
              <option>Sort by: Name</option>
              <option>Sort by: Availability</option>
            </select>
          </div>

          {/* Doctor grid — 3 columns */}
          {docsLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search size={36} className="mb-3 opacity-40" />
              <p className="font-medium">No doctors found</p>
              <p className="text-sm mt-1">Try a different department or search</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {doctors.map(doc => {
                const isSelected = selectedDoc?.id === doc.id;
                const avail = doc.availableToday !== false;
                return (
                  <button key={doc.id}
                    onClick={() => { setSelectedDoc(isSelected ? null : doc); setSelectedDay(null); setSelectedSlot(null); }}
                    className={`text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md ${
                      isSelected ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-gray-100 bg-white hover:border-teal-200'
                    }`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                        isSelected ? 'bg-teal-600' : 'bg-gradient-to-br from-teal-400 to-teal-600'
                      }`}>
                        {doc.firstName?.[0]}{doc.lastName?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">Dr. {doc.firstName} {doc.lastName}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{doc.specialties?.join(', ') || doc.primaryDegree || 'General'}</p>
                      </div>
                      {isSelected && <CheckCircle size={14} className="text-teal-600 flex-shrink-0 mt-0.5" />}
                    </div>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${avail ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {avail ? '● Available Today' : '● Next Available'}
                      </span>
                      {doc.experienceYears && <span className="text-xs text-gray-400">{doc.experienceYears}y exp</span>}
                    </div>
                    {doc.consultationFee && (
                      <p className="text-xs text-teal-700 font-bold mt-1.5">₹{doc.consultationFee}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Calendar + Time Slots + Booking Summary (always visible) ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">

          {/* Select Date */}
          <div className="hms-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800 text-sm">📅 Select Date</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={15} /></button>
              <span className="text-xs font-semibold text-gray-700">{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={15} /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAY_NAMES.map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calCells.map((day, i) => {
                if (!day) return <div key={i} />;
                const isPast = new Date(calYear, calMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                const isSel = day === selectedDay;
                return (
                  <button key={i}
                    onClick={() => { if (!isPast) { setSelectedDay(day); setSelectedSlot(null); } }}
                    disabled={isPast}
                    className={`w-full aspect-square rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                      isSel    ? 'bg-teal-600 text-white font-bold'
                      : isToday ? 'bg-teal-100 text-teal-700 font-bold'
                      : isPast  ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-teal-50 text-gray-700'
                    }`}>{day}</button>
                );
              })}
            </div>
          </div>

          {/* Available Time Slots */}
          <div className="hms-card p-4">
            <p className="font-semibold text-gray-800 text-sm mb-3">🕐 Available Time Slots</p>
            <p className="text-xs text-gray-400 mb-2">Morning</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {TIME_SLOTS_MORNING.map(slot => (
                <button key={slot} onClick={() => setSelectedSlot(slot)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedSlot === slot
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-teal-400 bg-white'
                  }`}>{slot}</button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-2">Afternoon</p>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_SLOTS_AFTERNOON.map(slot => (
                <button key={slot} onClick={() => setSelectedSlot(slot)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedSlot === slot
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-teal-400 bg-white'
                  }`}>{slot}</button>
              ))}
            </div>
          </div>

          {/* Booking Summary */}
          <div className="hms-card p-4">
            <p className="font-semibold text-gray-800 text-sm mb-3">📋 Booking Summary</p>
            <div className="space-y-2">
              {[
                ['Doctor',           selectedDoc ? `Dr. ${selectedDoc.firstName} ${selectedDoc.lastName}` : '—'],
                ['Department',       selectedDoc?.specialties?.[0] || selectedDoc?.primaryDegree || '—'],
                ['Date',             selectedDateStr || '—'],
                ['Time',             selectedSlot || '—'],
                ['Consultation Fee', selectedDoc ? `₹${consultFee}` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800 text-right max-w-[55%] truncate">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-800">Total</span>
              <span className="text-lg font-black text-teal-700">₹{selectedDoc ? consultFee : '—'}</span>
            </div>
            {bookError && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl">{bookError}</div>
            )}
            <button
              onClick={submitBooking}
              disabled={booking || !selectedDoc || !selectedDay}
              className="w-full mt-3 py-3 rounded-full text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              {booking ? 'Confirming…' : '✓ Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
