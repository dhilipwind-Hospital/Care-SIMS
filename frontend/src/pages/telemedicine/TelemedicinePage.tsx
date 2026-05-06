import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Video, Clock, Play, CheckCircle, Trash2, Search, X, Plus, ExternalLink } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

const BLANK = { patientId: '', doctorId: '', platform: 'IN_APP', scheduledAt: '', reason: '', roomUrl: '' };

function SearchableSelect({ placeholder, endpoint, displayFn, onSelect, value, idField = 'id' }: {
  placeholder: string;
  endpoint: string;
  displayFn: (item: any) => string;
  onSelect: (id: string, label: string) => void;
  value: string;
  idField?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(value ? value : '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || q.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(endpoint, { params: { q, limit: 10 } });
        setResults(data.data || data || []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open, endpoint]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clear = () => { setLabel(''); setQ(''); onSelect('', ''); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-teal-500">
        <Search size={13} className="text-gray-400 mr-2 shrink-0" />
        {label ? (
          <span className="text-sm text-gray-900 flex-1 truncate">{label}</span>
        ) : (
          <input
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            placeholder={placeholder}
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        )}
        {label && <button type="button" onClick={clear} className="ml-1 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(item => (
            <button key={item[idField]} type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 text-gray-800"
              onClick={() => { const lbl = displayFn(item); setLabel(lbl); onSelect(item[idField], lbl); setOpen(false); setQ(''); }}>
              {displayFn(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TelemedicinePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/telemedicine/sessions');
      setSessions(data.data || data || []);
    } catch { toast.error('Failed to load telemedicine sessions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.patientId.trim() || !form.doctorId.trim()) { setFormError('Please select a patient and a doctor'); return; }
    if (!form.scheduledAt) { setFormError('Please select a scheduled date/time'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/telemedicine/sessions', form);
      toast.success('Teleconsult session scheduled');
      setShowForm(false);
      setForm(BLANK);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to schedule session'); }
    finally { setSubmitting(false); }
  };

  const startSession = async (id: string) => { try { await api.patch(`/telemedicine/sessions/${id}/start`); toast.success('Session started'); fetchData(); } catch { toast.error('Failed to start session'); } };
  const endSession = async (id: string) => { try { await api.patch(`/telemedicine/sessions/${id}/end`); toast.success('Session ended'); fetchData(); } catch { toast.error('Failed to end session'); } };
  const cancelSession = async (id: string) => { try { await api.patch(`/telemedicine/sessions/${id}/cancel`); toast.success('Session cancelled'); fetchData(); } catch { toast.error('Failed to cancel session'); } };
  const handleDelete = async (id: string) => { if (!confirm('Delete this telemedicine session?')) return; try { await api.delete(`/telemedicine/sessions/${id}`); toast.success('Session deleted'); fetchData(); } catch { toast.error('Failed to delete session'); } };

  const patientDisplay = (p: any) => `${p.firstName || ''} ${p.lastName || ''}`.trim() + (p.patientId ? ` (${p.patientId})` : '');
  const doctorDisplay = (d: any) => `Dr. ${d.firstName || ''} ${d.lastName || ''}`.trim() + (d.specialization ? ` — ${d.specialization}` : '');

  const sessionName = (s: any, field: 'patient' | 'doctor') => {
    if (field === 'patient' && s.patient) return `${s.patient.firstName || ''} ${s.patient.lastName || ''}`.trim() || s.patientId;
    if (field === 'doctor' && s.doctor) return `Dr. ${s.doctor.firstName || ''} ${s.doctor.lastName || ''}`.trim() || s.doctorId;
    return s[`${field}Id`] || '—';
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Telemedicine" subtitle="Virtual consultations and teleconsult sessions"
        actions={
          <button onClick={() => { setShowForm(true); setFormError(''); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> New Session
          </button>
        }
      />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Sessions" value={sessions.length} icon={Video} color="#3B82F6" />
          <KpiCard label="Scheduled" value={sessions.filter(s => s.status === 'SCHEDULED').length} icon={Clock} color="#F59E0B" />
          <KpiCard label="In Progress" value={sessions.filter(s => s.status === 'IN_PROGRESS').length} icon={Play} color="#8B5CF6" />
          <KpiCard label="Completed" value={sessions.filter(s => s.status === 'COMPLETED').length} icon={CheckCircle} color="#10B981" />
        </div>
      )}

      {showForm && (
        <div className="hms-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Schedule Teleconsult</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
          </div>
          {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Patient *</label>
              <SearchableSelect
                placeholder="Search patient..."
                endpoint="/patients"
                displayFn={patientDisplay}
                value={form.patientId}
                onSelect={(id) => setForm(f => ({ ...f, patientId: id }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Doctor *</label>
              <SearchableSelect
                placeholder="Search doctor..."
                endpoint="/staff/doctors"
                displayFn={doctorDisplay}
                value={form.doctorId}
                onSelect={(id) => setForm(f => ({ ...f, doctorId: id }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="IN_APP">In-App</option>
                <option value="ZOOM">Zoom</option>
                <option value="GOOGLE_MEET">Google Meet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled At *</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Chief complaint / reason for teleconsult" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Meeting URL (optional)</label>
              <input value={form.roomUrl} onChange={e => setForm(f => ({ ...f, roomUrl: e.target.value }))} placeholder="https://meet.google.com/... or Zoom link" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={submitting} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>{submitting ? 'Scheduling...' : 'Schedule Session'}</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="hms-card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">{sessions.length} sessions</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Session ID</th>
              <th className="text-left px-4 py-3">Patient</th>
              <th className="text-left px-4 py-3">Doctor</th>
              <th className="text-left px-4 py-3">Platform</th>
              <th className="text-left px-4 py-3">Scheduled</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
            ) : sessions.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState icon={<Video size={24} className="text-gray-400" />} title="No teleconsult sessions" description="Schedule a session to get started" />
              </td></tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-teal-700">{s.sessionId || s.id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-800">{sessionName(s, 'patient')}</td>
                <td className="px-4 py-3 text-gray-800">{sessionName(s, 'doctor')}</td>
                <td className="px-4 py-3 text-gray-600">{s.platform}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {s.status === 'SCHEDULED' && <>
                      <button onClick={() => startSession(s.id)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Start</button>
                      <button onClick={() => cancelSession(s.id)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">Cancel</button>
                    </>}
                    {s.status === 'IN_PROGRESS' && (
                      <button onClick={() => endSession(s.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium flex items-center gap-1">
                        <CheckCircle size={11} /> End
                      </button>
                    )}
                    {(s.roomUrl || s.meetingUrl) && (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS') && (
                      <a href={s.roomUrl || s.meetingUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-1">
                        <ExternalLink size={11} /> Join
                      </a>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
