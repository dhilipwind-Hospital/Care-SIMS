import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Star, Calendar, Clock, ChevronRight, CheckCircle } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import api from '../../lib/api';

const STEPS = ['Select Doctor', 'Choose Date & Time', 'Confirm Booking'];

export default function SelfBookingPage() {
  const [step, setStep] = useState(0);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm] = useState({ patientId: '', appointmentType: 'NEW_VISIT', reason: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [bookedAppt, setBookedAppt] = useState<any>(null);

  useEffect(() => {
    api.get('/users', { params: { q: search || undefined, role: 'DOCTOR', limit: 30 } })
      .then(r => setDoctors(r.data.data || []))
      .catch((err) => { console.error('Failed to fetch doctors:', err); })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    setSlotsLoading(true);
    api.get(`/appointments/slots`, { params: { doctorId: selectedDoctor.id, date: selectedDate } })
      .then(r => setSlots(r.data || []))
      .catch((err) => { console.error('Failed to fetch appointment slots:', err); setSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [selectedDoctor, selectedDate]);

  const confirmBooking = async () => {
    try {
      const { data } = await api.post('/appointments', {
        doctorId: selectedDoctor.id,
        patientId: form.patientId,
        appointmentDate: selectedDate,
        slotTime: selectedSlot,
        appointmentType: form.appointmentType,
        reason: form.reason,
      });
      setBookedAppt(data);
      setConfirmed(true);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to book appointment'); }
  };

  const today = new Date().toISOString().split('T')[0];

  if (confirmed) {
    return (
      <div className="p-6">
        <TopBar title="Book Appointment" subtitle="Schedule your consultation" />
        <div className="max-w-lg mx-auto mt-12 hms-card p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 text-sm mb-6">Your appointment has been successfully booked.</p>
          {bookedAppt && (
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm mb-6">
              <div><span className="text-gray-500">Doctor:</span> <span className="font-semibold">Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-semibold">{selectedDate}</span></div>
              <div><span className="text-gray-500">Time:</span> <span className="font-semibold">{selectedSlot}</span></div>
              <div><span className="text-gray-500">Appointment #:</span> <span className="font-semibold text-teal-700">{bookedAppt.appointmentNumber || bookedAppt.id?.slice(0,8)}</span></div>
            </div>
          )}
          <button onClick={() => { setConfirmed(false); setStep(0); setSelectedDoctor(null); setSelectedDate(''); setSelectedSlot(''); }}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Book an Appointment" subtitle="Find and book your preferred doctor in a few simple steps" />

      {/* Stepper */}
      <div className="flex items-center justify-center gap-0 max-w-xl mx-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? 'text-white' : i === step ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
                style={i <= step ? { background: 'linear-gradient(135deg,#0F766E,#14B8A6)' } : {}}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${i === step ? 'text-teal-700' : 'text-gray-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < step ? 'bg-teal-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Select Doctor */}
      {step === 0 && (
        <div className="hms-card">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by doctor name or specialty..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          {loading ? <div className="p-10 text-center text-gray-400 text-sm">Loading doctors...</div> : (
            <div className="grid grid-cols-2 gap-4 p-5">
              {doctors.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-gray-400 text-sm">No doctors found</div>
              ) : doctors.map(d => (
                <div key={d.id} onClick={() => { setSelectedDoctor(d); setStep(1); }}
                  className="p-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:shadow-md cursor-pointer transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-lg flex-shrink-0">
                      {d.firstName?.[0]}{d.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm">Dr. {d.firstName} {d.lastName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{d.specialization || d.primarySpecialization || '—'}</div>
                      <div className="text-xs text-gray-500">{d.experience ? `${d.experience} yrs exp` : ''}</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= (d.rating || 4) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />)}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500 transition-colors mt-2" />
                  </div>
                  {d.consultationFee && <div className="mt-2 text-xs font-semibold text-teal-700">₹{d.consultationFee} consult fee</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Choose Date & Time */}
      {step === 1 && selectedDoctor && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="hms-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold">
                  {selectedDoctor.firstName?.[0]}{selectedDoctor.lastName?.[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-900">Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</div>
                  <div className="text-sm text-gray-500">{selectedDoctor.specialization || '—'}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Select Date</label>
                <input type="date" min={today} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full" />
              </div>
            </div>

            {selectedDate && (
              <div className="hms-card p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} /> Available Time Slots</h3>
                {slotsLoading ? <div className="text-center text-gray-400 text-sm py-6">Loading slots...</div> : slots.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-6">No slots available for this date</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button key={slot} onClick={() => setSelectedSlot(slot)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${selectedSlot === slot ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-700 hover:border-teal-300'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Back</button>
              <button disabled={!selectedDate || !selectedSlot} onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                Continue
              </button>
            </div>
          </div>

          <div className="hms-card p-5 h-fit">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={16} /> Booking Summary</h3>
            <div className="space-y-3 text-sm">
              <div><div className="text-gray-500 text-xs">Doctor</div><div className="font-semibold">Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</div></div>
              <div><div className="text-gray-500 text-xs">Specialty</div><div className="font-medium">{selectedDoctor.specialization || '—'}</div></div>
              <div><div className="text-gray-500 text-xs">Date</div><div className="font-medium">{selectedDate || 'Not selected'}</div></div>
              <div><div className="text-gray-500 text-xs">Time</div><div className="font-medium">{selectedSlot || 'Not selected'}</div></div>
              {selectedDoctor.consultationFee && <div><div className="text-gray-500 text-xs">Consultation Fee</div><div className="font-semibold text-teal-700">₹{selectedDoctor.consultationFee}</div></div>}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="hms-card p-6">
            <h3 className="font-bold text-gray-900 mb-4">Confirm Booking Details</h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-5">
              <div><span className="text-gray-500">Doctor:</span> <span className="font-semibold">Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}</span></div>
              <div><span className="text-gray-500">Specialty:</span> <span className="font-medium">{selectedDoctor?.specialization || '—'}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{selectedDate}</span></div>
              <div><span className="text-gray-500">Time:</span> <span className="font-medium">{selectedSlot}</span></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Patient ID (optional)</label>
                <input value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} placeholder="PT-00000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Appointment Type</label>
                <select value={form.appointmentType} onChange={e => setForm(f => ({ ...f, appointmentType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="NEW_VISIT">New Visit</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason for Visit</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Brief description..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Back</button>
              <button onClick={confirmBooking} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
