import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Edit2, X, Save, Calendar, Clock, IndianRupee, MapPin } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'MON', label: 'Mon' }, { key: 'TUE', label: 'Tue' }, { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' }, { key: 'FRI', label: 'Fri' }, { key: 'SAT', label: 'Sat' }, { key: 'SUN', label: 'Sun' },
];

type Affiliation = {
  id: string;
  doctorId: string;
  isActive: boolean;
  designation?: string;
  departmentName?: string;
  consultationFee?: number | string | null;
  availableDays?: string[];
  slotDurationMinutes?: number;
  maxPatientsPerDay?: number;
  doctor?: { id: string; firstName: string; lastName: string; specialties?: string[] };
  location?: { id: string; name: string; locationCode?: string };
};

const EMPTY_FORM = {
  availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as string[],
  slotDurationMinutes: 15,
  consultationFee: 500,
  maxPatientsPerDay: 30,
};

export default function MyAvailabilityPage() {
  const [rows, setRows] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Affiliation | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEscapeClose(!!editing, () => setEditing(null));

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/doctors/affiliations/me');
      const list: Affiliation[] = Array.isArray(data?.data ?? data) ? (data?.data ?? data) : [];
      setRows(list);
    } catch { toast.error('Failed to load your availability'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(); }, []);

  const openEdit = (a: Affiliation) => {
    setEditing(a);
    setForm({
      availableDays: a.availableDays?.length ? a.availableDays : EMPTY_FORM.availableDays,
      slotDurationMinutes: a.slotDurationMinutes ?? 15,
      consultationFee: Number(a.consultationFee ?? 500),
      maxPatientsPerDay: a.maxPatientsPerDay ?? 30,
    });
  };

  const toggleDay = (key: string) => {
    setForm(f => ({
      ...f,
      availableDays: f.availableDays.includes(key)
        ? f.availableDays.filter(d => d !== key)
        : [...f.availableDays, key],
    }));
  };

  const save = async () => {
    if (!editing) return;
    if (form.availableDays.length === 0) { toast.error('Pick at least one working day'); return; }
    if (form.slotDurationMinutes < 5 || form.slotDurationMinutes > 120) { toast.error('Slot duration must be 5–120 minutes'); return; }
    setSubmitting(true);
    try {
      await api.patch(`/doctors/affiliations/${editing.id}`, {
        availableDays: form.availableDays,
        slotDurationMinutes: Number(form.slotDurationMinutes),
        consultationFee: Number(form.consultationFee),
        maxPatientsPerDay: Number(form.maxPatientsPerDay),
      });
      toast.success('Availability updated');
      setEditing(null);
      fetchRows();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="My Availability" subtitle="Manage your working days, slot length & consultation fee" />

      {loading ? (
        <div className="hms-card p-8 text-center text-sm text-gray-400">Loading...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No affiliations" description="Your account isn't affiliated with any organization yet. Contact your administrator." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(r => (
            <div key={r.id} className="hms-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin size={14} className="text-teal-600" /> {r.location?.name || '—'}
                  </div>
                  <div className="text-xs text-gray-500">{r.departmentName || '—'} • {r.designation || '—'}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Calendar size={11} /> Working Days
                </div>
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map(d => {
                    const on = (r.availableDays || []).includes(d.key);
                    return (
                      <span key={d.key} className={`text-xs font-semibold px-2 py-0.5 rounded ${on ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>{d.label}</span>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-50">
                <div>
                  <div className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> Slot</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">{r.slotDurationMinutes ?? 15} min</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 flex items-center gap-1"><IndianRupee size={11} /> Fee</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">₹{Number(r.consultationFee || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Max/Day</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">{r.maxPatientsPerDay ?? 30}</div>
                </div>
              </div>

              <button onClick={() => openEdit(r)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700">
                <Edit2 size={13} /> Edit Availability
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Edit My Availability</h3>
                <p className="text-xs text-gray-500">{editing.location?.name} • {editing.departmentName}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Working Days</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAYS.map(d => {
                    const on = form.availableDays.includes(d.key);
                    return (
                      <button key={d.key} onClick={() => toggleDay(d.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${on ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'}`}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Slot Duration (min)</label>
                  <input type="number" min={5} max={120} step={5} value={form.slotDurationMinutes}
                    onChange={e => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Consultation Fee (₹)</label>
                  <input type="number" min={0} step={50} value={form.consultationFee}
                    onChange={e => setForm({ ...form, consultationFee: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Max Patients / Day</label>
                  <input type="number" min={1} step={1} value={form.maxPatientsPerDay}
                    onChange={e => setForm({ ...form, maxPatientsPerDay: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              <p className="text-xs text-gray-500">Patient self-booking uses these settings — a 09:00–18:00 window divided by slot duration, on selected working days.</p>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={save} disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                <Save size={14} /> {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
