import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Clock, UserPlus, Activity, X, Search, Loader2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const TRIAGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  RED: { bg: 'bg-red-500', text: 'text-white', label: 'Immediate' },
  YELLOW: { bg: 'bg-amber-400', text: 'text-gray-900', label: 'Urgent' },
  GREEN: { bg: 'bg-green-500', text: 'text-white', label: 'Delayed' },
  BLACK: { bg: 'bg-gray-900', text: 'text-white', label: 'Deceased' },
};

export default function EmergencyPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Register modal
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({
    patientId: '', chiefComplaint: '', triageCategory: 'GREEN',
    arrivalMode: 'WALK_IN', isMlc: false, broughtBy: '', broughtByPhone: '',
  });
  const [patSearch, setPatSearch] = useState('');
  const [patResults, setPatResults] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Disposition modal
  const [dispVisit, setDispVisit] = useState<any>(null);
  const [disposition, setDisposition] = useState('DISCHARGED');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [active, dash] = await Promise.all([
        tab === 'active' ? api.get('/emergency/active') : api.get('/emergency', { params: { page, limit: 20 } }),
        api.get('/emergency/dashboard'),
      ]);
      const items = tab === 'active' ? (active.data.data || active.data || []) : (active.data.data || []);
      setVisits(items);
      setTotal(active.data.meta?.total || items.length);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load ED data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab, page]);

  const searchPatients = async (q: string) => {
    setPatSearch(q);
    if (q.length < 2) { setPatResults([]); return; }
    try {
      const { data } = await api.get('/patients', { params: { q, limit: 5 } });
      setPatResults(data.data || []);
    } catch { setPatResults([]); }
  };

  const handleRegister = async () => {
    if (!form.patientId) { toast.error('Select a patient'); return; }
    if (!form.chiefComplaint.trim()) { toast.error('Chief complaint is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/emergency/register', form);
      toast.success('Patient registered in ED');
      setShowRegister(false);
      setForm({ patientId: '', chiefComplaint: '', triageCategory: 'GREEN', arrivalMode: 'WALK_IN', isMlc: false, broughtBy: '', broughtByPhone: '' });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to register'); }
    finally { setSubmitting(false); }
  };

  const handleDisposition = async () => {
    if (!dispVisit) return;
    try {
      await api.patch(`/emergency/${dispVisit.id}/disposition`, { disposition });
      toast.success('Disposition recorded');
      setDispVisit(null);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAssign = async (id: string) => {
    // Simplified — in production, would open a doctor/bed selector
    try {
      await api.patch(`/emergency/${id}/status`, { status: 'BEING_SEEN' });
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Emergency Department" subtitle="Real-time ED patient tracking"
        actions={
          <button onClick={() => setShowRegister(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={15} /> Register ED Patient
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Patients" value={dashboard.activeCount || 0} icon={Activity} color="#EF4444" />
        <KpiCard label="Today Total" value={dashboard.todayTotal || 0} icon={Clock} color="#3B82F6" />
        <KpiCard label="Avg Wait (min)" value={dashboard.avgWaitMins || 0} icon={Clock} color="#F59E0B" />
        <KpiCard label="RED (Immediate)" value={dashboard.byTriage?.RED || 0} icon={AlertTriangle} color="#DC2626" />
      </div>

      {/* Triage summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {['RED', 'YELLOW', 'GREEN', 'BLACK'].map(cat => {
          const cfg = TRIAGE_COLORS[cat];
          const count = dashboard.byTriage?.[cat] || 0;
          return (
            <div key={cat} className={`${cfg.bg} ${cfg.text} rounded-xl p-4 text-center`}>
              <div className="text-3xl font-black">{count}</div>
              <div className="text-sm font-medium opacity-90">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {[['active', 'Active Patients'], ['all', 'All Visits']].map(([val, label]) => (
            <button key={val} onClick={() => { setTab(val as any); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient list */}
      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Visit #', 'Patient', 'Triage', 'Chief Complaint', 'Arrival', 'Mode', 'Status', 'Wait', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)}</>
              ) : visits.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon={<AlertTriangle size={36} />} title="No ED patients" description={tab === 'active' ? 'No active patients in the emergency department' : 'No visits found'} /></td></tr>
              ) : visits.map(v => {
                const triage = TRIAGE_COLORS[v.triageCategory] || TRIAGE_COLORS.GREEN;
                const waitMins = Math.round((Date.now() - new Date(v.arrivalTime).getTime()) / 60000);
                return (
                  <tr key={v.id} className="hover:bg-gray-50 border-t border-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-teal-700">{v.visitNumber}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{v.patient?.firstName} {v.patient?.lastName}</div>
                      <div className="text-xs text-gray-400">{v.patient?.patientId} · {v.patient?.gender} · {v.patient?.ageYears || '—'}y</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${triage.bg} ${triage.text}`}>
                        {v.triageCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate">{v.chiefComplaint}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(v.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{v.arrivalMode?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{waitMins}m</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {v.status === 'WAITING' && (
                          <button onClick={() => handleAssign(v.id)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">See Patient</button>
                        )}
                        {['WAITING', 'BEING_SEEN', 'UNDER_OBSERVATION'].includes(v.status) && (
                          <button onClick={() => { setDispVisit(v); setDisposition('DISCHARGED'); }} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 font-medium">Dispose</button>
                        )}
                        {v.isMlc && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">MLC</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {tab === 'all' && <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />}
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Register ED Patient</h2>
              <button onClick={() => setShowRegister(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Patient search */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="hms-input w-full pl-9" placeholder="Search by name or phone..."
                    value={patSearch} onChange={e => searchPatients(e.target.value)} />
                </div>
                {patResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg mt-1 max-h-32 overflow-y-auto">
                    {patResults.map(p => (
                      <button key={p.id} onClick={() => { setForm({ ...form, patientId: p.id }); setPatSearch(`${p.firstName} ${p.lastName} (${p.patientId})`); setPatResults([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        {p.firstName} {p.lastName} · {p.patientId} · {p.mobile}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Chief Complaint *</label>
                <textarea className="hms-input w-full" rows={2} placeholder="Chest pain, breathlessness, trauma..."
                  value={form.chiefComplaint} onChange={e => setForm({ ...form, chiefComplaint: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Triage Category</label>
                  <select className="hms-input w-full" value={form.triageCategory} onChange={e => setForm({ ...form, triageCategory: e.target.value })}>
                    <option value="RED">RED — Immediate</option>
                    <option value="YELLOW">YELLOW — Urgent</option>
                    <option value="GREEN">GREEN — Delayed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Arrival Mode</label>
                  <select className="hms-input w-full" value={form.arrivalMode} onChange={e => setForm({ ...form, arrivalMode: e.target.value })}>
                    {['WALK_IN', 'AMBULANCE', 'REFERRED', 'POLICE', 'BROUGHT_DEAD'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isMlc} onChange={e => setForm({ ...form, isMlc: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                <span className="text-sm text-red-700 font-medium">Medico-Legal Case (MLC)</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Brought By</label>
                  <input className="hms-input w-full" placeholder="Name" value={form.broughtBy} onChange={e => setForm({ ...form, broughtBy: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Phone</label>
                  <input className="hms-input w-full" placeholder="Phone" value={form.broughtByPhone} onChange={e => setForm({ ...form, broughtByPhone: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowRegister(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleRegister} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Registering…' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disposition Modal */}
      {dispVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Patient Disposition</h2>
            <p className="text-xs text-gray-400 mb-4">{dispVisit.visitNumber} — {dispVisit.patient?.firstName} {dispVisit.patient?.lastName}</p>
            <select className="hms-input w-full mb-4" value={disposition} onChange={e => setDisposition(e.target.value)}>
              <option value="DISCHARGED">Discharge from ED</option>
              <option value="ADMITTED">Admit to Ward</option>
              <option value="TRANSFERRED">Transfer to Another Hospital</option>
              <option value="DAMA">DAMA (Discharge Against Medical Advice)</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDispVisit(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleDisposition} className="btn-primary px-4 py-2">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
