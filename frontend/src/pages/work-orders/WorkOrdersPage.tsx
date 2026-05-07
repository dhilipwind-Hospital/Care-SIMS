import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Plus, X, Printer, CheckCircle, Play, Pencil, Clock, AlertTriangle } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const CATEGORIES = ['ELECTRICAL', 'PLUMBING', 'HVAC', 'MEDICAL_EQUIPMENT', 'HOUSEKEEPING', 'IT', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const BLANK_FORM = { title: '', category: '', priority: 'MEDIUM', location: '', assignedTo: '', description: '', dueDate: '' };

const priorityStyle: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function WorkOrdersPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  // Complete modal
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  // Detail drawer
  const [drawer, setDrawer] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/work-orders', { params: { page, limit: 20, status: statusFilter || undefined, priority: priorityFilter || undefined } }),
        api.get('/work-orders/dashboard').catch(() => ({ data: {} })),
      ]);
      setRecords(list.data.data || list.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load work orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, statusFilter, priorityFilter]);

  const openNew = () => { setForm(BLANK_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (r: any) => {
    setForm({ title: r.title || '', category: r.category || '', priority: r.priority || 'MEDIUM', location: r.location || '', assignedTo: r.assignedTo || r.assignedToName || '', description: r.description || '', dueDate: r.dueDate?.slice(0, 10) || '' });
    setEditId(r.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title?.trim() || !form.location?.trim()) { toast.error('Title and location are required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/work-orders/${editId}`, form);
        toast.success('Work order updated');
      } else {
        await api.post('/work-orders', form);
        toast.success('Work order created');
      }
      setShowModal(false);
      setEditId(null);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setActionId(id);
    try {
      await api.patch(`/work-orders/${id}`, { status });
      toast.success(`Work order → ${status.replace(/_/g, ' ')}`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
    finally { setActionId(null); }
  };

  const submitComplete = async () => {
    if (!completeId) return;
    setCompleting(true);
    try {
      await api.patch(`/work-orders/${completeId}`, { status: 'COMPLETED', completionNotes });
      toast.success('Work order completed');
      setCompleteId(null);
      setCompletionNotes('');
      fetchData();
    } catch { toast.error('Failed to complete work order'); }
    finally { setCompleting(false); }
  };

  const handlePrintWorkOrder = (w: any) => {
    const priorityColor = ['HIGH', 'CRITICAL'].includes(w.priority) ? '#dc2626' : w.priority === 'MEDIUM' ? '#d97706' : '#16a34a';
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Work Order</title></head>
<body style="font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;max-width:800px;margin:0 auto;">
<h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1>
<h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">MAINTENANCE WORK ORDER</h2>
<hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:20px;font-size:13px;">
  <div><span style="color:#555;font-weight:600;">WO #:</span> ${w.workOrderNumber || (w.id || '').slice(0, 8)}</div>
  <div><span style="color:#555;font-weight:600;">Date:</span> ${w.createdAt ? new Date(w.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
  <div><span style="color:#555;font-weight:600;">Title:</span> ${w.title || '—'}</div>
  <div><span style="color:#555;font-weight:600;">Category:</span> ${w.category || '—'}</div>
  <div><span style="color:#555;font-weight:600;">Priority:</span> <span style="color:${priorityColor};font-weight:700;">${w.priority || '—'}</span></div>
  <div><span style="color:#555;font-weight:600;">Assigned To:</span> ${w.assignedTo || w.assignedToName || '—'}</div>
  <div><span style="color:#555;font-weight:600;">Location:</span> ${w.location || '—'}</div>
  <div><span style="color:#555;font-weight:600;">Due Date:</span> ${w.dueDate ? new Date(w.dueDate).toLocaleDateString() : '—'}</div>
  <div><span style="color:#555;font-weight:600;">Status:</span> ${w.status || '—'}</div>
</div>
<div style="margin-bottom:16px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
  <strong>Description:</strong><br/><span style="color:#374151;">${w.description || 'No description provided.'}</span>
</div>
${w.completionNotes ? `<div style="margin-bottom:16px;padding:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:13px;"><strong>Completion Notes:</strong><br/><span style="color:#15803d;">${w.completionNotes}</span></div>` : ''}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:40px;">
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Requested By</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Assigned To</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Supervisor</div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  const isOverdue = (r: any) => r.dueDate && r.status !== 'COMPLETED' && new Date(r.dueDate) < new Date();

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar title="Work Orders" subtitle="Maintenance request management"
        actions={
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={16} /> New Work Order
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Open" value={dashboard.open ?? records.filter(r => r.status === 'OPEN').length} icon={Wrench} color="#F59E0B" />
        <KpiCard label="In Progress" value={dashboard.inProgress ?? records.filter(r => r.status === 'IN_PROGRESS').length} icon={Clock} color="#3B82F6" />
        <KpiCard label="Completed" value={dashboard.completed ?? records.filter(r => r.status === 'COMPLETED').length} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Overdue" value={records.filter(isOverdue).length} icon={AlertTriangle} color="#EF4444" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {[['', 'All Status'], ['OPEN', 'Open'], ['IN_PROGRESS', 'In Progress'], ['ON_HOLD', 'On Hold'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {[['', 'All Priority'], ...PRIORITIES.map(p => [p, p])].map(([v, l]) => (
            <button key={v} onClick={() => setPriorityFilter(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${priorityFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['WO #', 'Title', 'Category', 'Location', 'Priority', 'Assigned To', 'Due', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)
                : records.length === 0
                  ? <tr><td colSpan={9}><EmptyState icon={<Wrench size={36} />} title="No work orders" description="Work orders will appear here when created" /></td></tr>
                  : records.map((r: any) => (
                    <tr key={r.id} className={`hover:bg-gray-50 border-t border-gray-50 cursor-pointer ${isOverdue(r) ? 'bg-red-50/40' : ''}`} onClick={() => setDrawer(r)}>
                      <td className="px-4 py-3 text-sm font-semibold text-teal-700">{r.workOrderNumber || r.id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[160px]">
                        <span className="truncate block" title={r.title}>{r.title || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.category || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.location || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${priorityStyle[r.priority] || 'bg-gray-100 text-gray-600'}`}>{r.priority || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.assignedTo || r.assignedToName || '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {r.dueDate ? (
                          <span className={isOverdue(r) ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                            {isOverdue(r) && '⚠ '}{formatDate(r.dueDate)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status || 'OPEN'} /></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5 flex-wrap">
                          {r.status === 'OPEN' && (
                            <button onClick={() => updateStatus(r.id, 'IN_PROGRESS')} disabled={actionId === r.id}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium disabled:opacity-50 flex items-center gap-1">
                              <Play size={11} /> Start
                            </button>
                          )}
                          {r.status === 'IN_PROGRESS' && (
                            <button onClick={() => { setCompleteId(r.id); setCompletionNotes(''); }} disabled={actionId === r.id}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium disabled:opacity-50 flex items-center gap-1">
                              <CheckCircle size={11} /> Done
                            </button>
                          )}
                          {r.status === 'IN_PROGRESS' && (
                            <button onClick={() => updateStatus(r.id, 'ON_HOLD')} disabled={actionId === r.id}
                              className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium disabled:opacity-50">
                              Hold
                            </button>
                          )}
                          {r.status === 'ON_HOLD' && (
                            <button onClick={() => updateStatus(r.id, 'IN_PROGRESS')} disabled={actionId === r.id}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium disabled:opacity-50">
                              Resume
                            </button>
                          )}
                          <button onClick={() => openEdit(r)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1">
                            <Pencil size={11} />
                          </button>
                          <button onClick={() => handlePrintWorkOrder(r)}
                            className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                            <Printer size={11} />
                          </button>
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

      {/* Detail Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-gray-900">{drawer.title}</h3>
                <p className="text-xs text-gray-400 font-mono">{drawer.workOrderNumber || drawer.id?.slice(0, 8)}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Category', drawer.category],
                  ['Location', drawer.location],
                  ['Assigned To', drawer.assignedTo || drawer.assignedToName],
                  ['Due Date', drawer.dueDate ? formatDate(drawer.dueDate) : null],
                ].map(([label, val]) => (
                  <div key={label as string} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className="text-sm font-semibold text-gray-800">{val || '—'}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Priority</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${priorityStyle[drawer.priority] || 'bg-gray-100 text-gray-600'}`}>{drawer.priority || '—'}</span>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <StatusBadge status={drawer.status || 'OPEN'} />
                </div>
              </div>
              {drawer.description && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{drawer.description}</div>
                </div>
              )}
              {drawer.completionNotes && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Completion Notes</div>
                  <div className="text-sm text-green-700 whitespace-pre-wrap bg-green-50 rounded-lg p-3">{drawer.completionNotes}</div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setDrawer(null); openEdit(drawer); }} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center justify-center gap-1">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => { handlePrintWorkOrder(drawer); }} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 font-medium flex items-center justify-center gap-1">
                  <Printer size={13} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Notes Modal */}
      {completeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Complete Work Order</h3>
              <button onClick={() => setCompleteId(null)} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-gray-600 mb-2">Completion Notes</label>
              <textarea value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} rows={4}
                placeholder="Describe what was done, parts used, any follow-up needed…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setCompleteId(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={submitComplete} disabled={completing} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                <CheckCircle size={14} /> {completing ? 'Saving...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editId ? 'Edit Work Order' : 'New Work Order'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                  <input className={inp} value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select className={inp} value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select className={inp} value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location *</label>
                  <input className={inp} value={form.location} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="Ward / room / floor" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
                  <input className={inp} value={form.assignedTo} onChange={e => setForm((f: any) => ({ ...f, assignedTo: e.target.value }))} placeholder="Staff name or ID" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                  <input type="date" className={inp} value={form.dueDate} onChange={e => setForm((f: any) => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                  <textarea className={inp} rows={3} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Create Work Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
