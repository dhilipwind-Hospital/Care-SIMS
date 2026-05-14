import { useEffect, useState, useMemo } from 'react';
import {
  Activity, FileText, Pill, FlaskConical, CreditCard, CheckCircle,
  AlertTriangle, Calendar, Stethoscope, BedDouble, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

type EventType =
  | 'APPOINTMENT' | 'TRIAGE' | 'CONSULT' | 'PRESCRIPTION'
  | 'LAB_ORDER'   | 'LAB_RESULT' | 'INVOICE' | 'PAYMENT' | 'ADMISSION';

interface TimelineEvent {
  id: string;
  type: EventType;
  at: string;
  title: string;
  summary?: string;
  status?: string;
  meta?: Record<string, any>;
}

// One source of truth for per-event-type visuals so the timeline reads
// like a story rather than a homogeneous list.
const EVENT_STYLE: Record<EventType, {
  icon: any;
  iconBg: string;
  iconColor: string;
  ring: string;
  label: string;
}> = {
  APPOINTMENT:  { icon: Calendar,      iconBg: 'bg-blue-100',    iconColor: 'text-blue-700',    ring: 'ring-blue-200',    label: 'Appointment' },
  TRIAGE:       { icon: Activity,      iconBg: 'bg-orange-100',  iconColor: 'text-orange-700',  ring: 'ring-orange-200',  label: 'Triage' },
  CONSULT:      { icon: Stethoscope,   iconBg: 'bg-teal-100',    iconColor: 'text-teal-700',    ring: 'ring-teal-200',    label: 'Consultation' },
  PRESCRIPTION: { icon: Pill,          iconBg: 'bg-amber-100',   iconColor: 'text-amber-700',   ring: 'ring-amber-200',   label: 'Prescription' },
  LAB_ORDER:    { icon: FlaskConical,  iconBg: 'bg-purple-100',  iconColor: 'text-purple-700',  ring: 'ring-purple-200',  label: 'Lab order' },
  LAB_RESULT:   { icon: FileText,      iconBg: 'bg-indigo-100',  iconColor: 'text-indigo-700',  ring: 'ring-indigo-200',   label: 'Lab result' },
  INVOICE:      { icon: CreditCard,    iconBg: 'bg-slate-100',   iconColor: 'text-slate-700',   ring: 'ring-slate-200',   label: 'Invoice' },
  PAYMENT:      { icon: CheckCircle,   iconBg: 'bg-green-100',   iconColor: 'text-green-700',   ring: 'ring-green-200',   label: 'Payment' },
  ADMISSION:    { icon: BedDouble,     iconBg: 'bg-rose-100',    iconColor: 'text-rose-700',    ring: 'ring-rose-200',    label: 'Admission' },
};

const TRIAGE_BADGE: Record<string, string> = {
  RED:    'bg-red-100 text-red-700',
  ORANGE: 'bg-orange-100 text-orange-700',
  YELLOW: 'bg-yellow-100 text-yellow-700',
  GREEN:  'bg-green-100 text-green-700',
  BLACK:  'bg-gray-200 text-gray-700',
};

function statusBadge(type: EventType, status?: string) {
  if (!status) return null;
  if (type === 'TRIAGE') return TRIAGE_BADGE[status] || 'bg-gray-100 text-gray-700';
  if (status === 'CRITICAL') return 'bg-red-100 text-red-700';
  if (['COMPLETED', 'DISPENSED', 'VALIDATED', 'PAID'].includes(status)) return 'bg-green-100 text-green-700';
  if (['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(status)) return 'bg-gray-100 text-gray-500';
  if (['DRAFT', 'PENDING', 'SCHEDULED', 'ORDERED', 'SENT_TO_PHARMACY'].includes(status)) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

// Group consecutive events that fall on the same calendar day, newest first.
function groupByDay(events: TimelineEvent[]): Array<{ day: string; label: string; items: TimelineEvent[] }> {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const d = new Date(e.at);
    const key = d.toISOString().slice(0, 10);
    (groups[key] ||= []).push(e);
  }
  const keys = Object.keys(groups).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return keys.map(key => ({
    day: key,
    label:
      key === today ? 'Today' :
      key === yest  ? 'Yesterday' :
      new Date(key).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    items: groups[key],
  }));
}

export default function PatientTimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/patient/me/timeline', { params: { limit: 100 } });
      setEvents(data.events || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load timeline');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return events;
    return events.filter(e => e.type === filter);
  }, [events, filter]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const FILTERS: Array<{ key: EventType | 'ALL'; label: string }> = [
    { key: 'ALL',          label: 'All' },
    { key: 'CONSULT',      label: 'Visits' },
    { key: 'PRESCRIPTION', label: 'Rx' },
    { key: 'LAB_RESULT',   label: 'Lab Results' },
    { key: 'INVOICE',      label: 'Bills' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f0fdfa,#e0f2fe)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Visit Timeline</h1>
            <p className="text-sm text-gray-500 mt-1">Your complete care history at this hospital</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === f.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Empty / loading */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm">
            Loading your timeline…
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <AlertTriangle size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No events yet for this filter.</p>
          </div>
        ) : (
          /* Timeline groups */
          <div className="space-y-8">
            {groups.map(group => (
              <div key={group.day}>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                  {group.label}
                </h2>
                <div className="relative">
                  {/* Vertical rail */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-200" />
                  <div className="space-y-3">
                    {group.items.map(e => {
                      const style = EVENT_STYLE[e.type];
                      const Icon = style.icon;
                      const badgeClass = statusBadge(e.type, e.status);
                      const time = new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                      return (
                        <div key={e.id} className="flex items-start gap-3">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${style.iconBg} ring-4 ring-white`}>
                            <Icon size={16} className={style.iconColor} />
                          </div>
                          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {style.label}
                                  </span>
                                  <span className="text-xs text-gray-400">·</span>
                                  <span className="text-xs text-gray-500">{time}</span>
                                  {e.status && badgeClass && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                      {e.status}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm font-semibold text-gray-900 mt-1">{e.title}</div>
                                {e.summary && (
                                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">{e.summary}</div>
                                )}
                                {e.type === 'TRIAGE' && e.meta?.painScore != null && e.meta.painScore !== '' && (
                                  <div className="text-[11px] text-gray-400 mt-1">Pain {e.meta.painScore}/10</div>
                                )}
                                {e.type === 'INVOICE' && Number(e.meta?.paid || 0) > 0 && (
                                  <div className="text-[11px] text-green-700 mt-1">Paid: ₹{Number(e.meta!.paid).toFixed(2)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-10">
          Timeline shows up to 100 most recent events at this hospital.
        </p>
      </div>
    </div>
  );
}
