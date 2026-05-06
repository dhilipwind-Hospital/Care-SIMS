import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, Home, Plus, X, Clock, CheckCircle, MapPin, Pencil } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const VISIT_TYPES = ['ROUTINE', 'WOUND_CARE', 'MEDICATION', 'PHYSIOTHERAPY', 'PALLIATIVE', 'POST_DISCHARGE'];
const BLANK = { patientName: '', visitDate: '', visitType: 'ROUTINE', nurseId: '', address: '', notes: '', status: 'SCHEDULED' };

export default function HomeCarePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/home-care', { params: { page, limit: 20, status: statusFilter || undefined } }),
        api.get('/home-care/dashboard').catch(() => ({ data: {} })),
      ]);
      setRecords(list.data.data || list.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, statusFilter]);

  const openNew = () => { setForm(BLANK); setEditMode(false); setShowModal(true); };
  const openEdit = (r: any) => {
    setForm({ patientName: r.patientName || '', visitDate: r.visitDate?.slice(0, 10) || '', visitType: r.visitType || 'ROUTINE', nurseId: r.nurseId || '', address: r.address || '', notes: r.notes || '', status: r.status || 'SCHEDULED' });
    setEditMode(true);
    setSelected(r);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.patientName?.trim() || !form.visitDate || !form.address?.trim()) { toast.error('Patient name, visit date, and address are required'); return; }
    setSaving(true);
    try {
      if (editMode && selected) {
        await api.patch(`/home-care/${selected.id}`, form);
        toast.success('Visit updated');
      } else {
        await api.post('/home-care', form);
        toast.success('Visit scheduled');
      }
      setShowModal(false);
      setSelected(null);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setActionId(id);
    try {
      await api.patch(`/home-care/${id}`, { status });
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
    finally { setActionId(null); }
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar title="Home Care" subtitle="Domiciliary visit management"
        actions={
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={16} /> New Visit
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Visits" value={dashboard.total ?? records.length} icon={Activity} color="#0F766E" />
        <KpiCard label="Scheduled" value={dashboard.scheduled ?? records.filter(r => r.status === 'SCHEDULED').length} icon={Clock} color="#F59E0B" />
        <KpiCard label="Completed" value={dashboard.completed ?? records.filter(r => r.status === 'COMPLETED').length} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Active Patients" value={dashboard.active ?? records.filter(r => r.status === 'IN_PROGRESS').length} icon={Home} color="#3B82F6" />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'All'], ['SCHEDULED', 'Scheduled'], ['IN_PROGRESS', 'In Progress'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{l}</button>
        ))}
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Patient', 'Visit Date', 'Type', 'Nurse', 'Address', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
                : records.length === 0
                  ? <tr><td colSpan={7}><EmptyState icon={<Home size={36} />} title="No visits yet" description="Home care visits will appear here when created" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.patientName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(r.visitDate)}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">{r.visitType || '—'}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.nurseName || r.nurseId?.slice(0, 8) || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px]">
                        <span className="truncate block" title={r.address}>{r.address || '—'}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status || 'SCHEDULED'} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {r.status === 'SCHEDULED' && (
                            <button onClick={() => updateStatus(r.id, 'IN_PROGRESS')} disabled={actionId === r.id}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium disabled:opacity-50">Start</button>
                          )}
                          {r.status === 'IN_PROGRESS' && (
                            <button onClick={() => updateStatus(r.id, 'COMPLETED')} disabled={actionId === r.id}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium disabled:opacity-50 flex items-center gap-1">
                              <CheckCircle size={11} /> Done
                            </button>
                          )}
                          <button onClick={() => openEdit(r)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1">
                            <Pencil size={11} /> Edit
                          </button>
                          {r.address && (
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(r.address)}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium flex items-center gap-1">
                              <MapPin size={11} /> Map
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editMode ? 'Edit Visit' : 'Schedule Home Care Visit'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Patient Name *</label>
                  <input className={inp} value={form.patientName} onChange={e => setForm((f: any) => ({ ...f, patientName: e.target.value }))} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Visit Date *</label>
                  <input type="date" className={inp} value={form.visitDate} onChange={e => setForm((f: any) => ({ ...f, visitDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Visit Type</label>
                  <select className={inp} value={form.visitType} onChange={e => setForm((f: any) => ({ ...f, visitType: e.target.value }))}>
                    {VISIT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className={inp} value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                    {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nurse ID</label>
                  <input className={inp} value={form.nurseId} onChange={e => setForm((f: any) => ({ ...f, nurseId: e.target.value }))} placeholder="Nurse ID or name" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
                  <input className={inp} value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Patient address" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea className={inp} rows={3} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Care notes, special instructions…" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {saving ? 'Saving...' : editMode ? 'Update' : 'Schedule Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
