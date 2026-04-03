import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ScanLine, Clock, CheckCircle, XCircle, Pencil,
  Eye, FileText, ShieldCheck, AlertTriangle, X, Trash2,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import Pagination from '../../components/ui/Pagination';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

/* ---------- helpers ---------- */
const statusColors: Record<string, string> = {
  ORDERED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  REPORTED: 'bg-purple-100 text-purple-700',
  VALIDATED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

const priorityColors: Record<string, string> = {
  STAT: 'bg-red-100 text-red-700',
  URGENT: 'bg-yellow-100 text-yellow-700',
  ROUTINE: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  );
}

/* ---------- Modal shell ---------- */
function Modal({ open, onClose, title, children, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} mx-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function RadiologyPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ patientId: '', modality: 'X-RAY', bodyPart: '', clinicalHistory: '', priority: 'ROUTINE' });
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);

  // Filters
  const [modalities, setModalities] = useState<string[]>([]);
  const [filterModality, setFilterModality] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Result modal
  const [resultModal, setResultModal] = useState(false);
  const [resultOrderId, setResultOrderId] = useState('');
  const [resultForm, setResultForm] = useState({ findings: '', impression: '', recommendation: '', isCritical: false });
  const [resultSubmitting, setResultSubmitting] = useState(false);

  // View modal
  const [viewModal, setViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  /* ---- data fetching ---- */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterModality) params.modality = filterModality;
      const { data } = await api.get('/radiology/orders', { params });
      setOrders(data.data || data || []);
    } catch (err) {
      console.error('Failed to load radiology orders:', err);
      toast.error('Failed to load radiology orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchModalities = async () => {
    try {
      const { data } = await api.get('/radiology/modalities');
      setModalities(data.data || data || []);
    } catch (err) {
      console.error('Failed to fetch modalities, using defaults:', err);
      setModalities(['X-RAY', 'CT', 'MRI', 'ULTRASOUND', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'DEXA', 'PET_CT']);
    }
  };

  useEffect(() => { fetchModalities(); }, []);
  useEffect(() => { fetchOrders(); }, [filterStatus, filterModality]);

  /* ---- order form ---- */
  const resetForm = () => {
    setForm({ patientId: '', modality: 'X-RAY', bodyPart: '', clinicalHistory: '', priority: 'ROUTINE' });
    setEditingId(null);
    setFormError('');
  };

  const editRecord = (order: any) => {
    setForm({
      patientId: order.patientId || '',
      modality: order.modality || 'X-RAY',
      bodyPart: order.bodyPart || '',
      clinicalHistory: order.clinicalHistory || '',
      priority: order.priority || 'ROUTINE',
    });
    setEditingId(order.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.patientId.trim()) { setFormError('Patient ID is required.'); return; }
    if (!form.modality) { setFormError('Study type / modality is required.'); return; }
    if (!form.bodyPart.trim()) { setFormError('Body part is required.'); return; }
    if (!form.priority) { setFormError('Priority is required.'); return; }
    try {
      if (editingId) {
        await api.patch(`/radiology/orders/${editingId}`, form);
        toast.success('Radiology order updated');
      } else {
        await api.post('/radiology/orders', form);
        toast.success('Radiology order submitted');
      }
      setShowForm(false);
      resetForm();
      fetchOrders();
    } catch (err) {
      console.error('Failed to save radiology order:', err);
      toast.error(editingId ? 'Failed to update radiology order' : 'Failed to submit radiology order');
    }
  };

  /* ---- add result ---- */
  const openResultModal = (orderId: string) => {
    setResultOrderId(orderId);
    setResultForm({ findings: '', impression: '', recommendation: '', isCritical: false });
    setResultModal(true);
  };

  const handleAddResult = async () => {
    if (!resultForm.findings.trim()) { toast.error('Findings are required'); return; }
    setResultSubmitting(true);
    try {
      await api.post('/radiology/results', {
        orderId: resultOrderId,
        findings: resultForm.findings,
        impression: resultForm.impression,
        recommendation: resultForm.recommendation,
        isCritical: resultForm.isCritical,
      });
      toast.success('Result added successfully');
      setResultModal(false);
      fetchOrders();
    } catch (err) {
      console.error('Failed to add radiology result:', err);
      toast.error('Failed to add result');
    } finally {
      setResultSubmitting(false);
    }
  };

  /* ---- validate result ---- */
  const handleValidate = async (order: any) => {
    const result = order.results?.[0];
    if (!result) { toast.error('No result to validate'); return; }
    try {
      await api.patch(`/radiology/results/${result.id}/validate`);
      toast.success('Result validated');
      fetchOrders();
    } catch (err) {
      console.error('Failed to validate result:', err);
      toast.error('Failed to validate result');
    }
  };

  /* ---- delete order ---- */
  const handleDelete = async (id: string) => { if (!confirm('Delete this radiology order?')) return; try { await api.delete(`/radiology/orders/${id}`); toast.success('Radiology order deleted'); fetchOrders(); } catch (err) { console.error('Failed to delete radiology order:', err); toast.error('Failed to delete radiology order'); } };

  /* ---- view order detail ---- */
  const openViewModal = async (orderId: string) => {
    setViewLoading(true);
    setViewModal(true);
    setViewOrder(null);
    try {
      const { data } = await api.get(`/radiology/orders/${orderId}`);
      setViewOrder(data.data || data);
    } catch (err) {
      console.error('Failed to load order details:', err);
      toast.error('Failed to load order details');
      setViewModal(false);
    } finally {
      setViewLoading(false);
    }
  };

  /* ---- derived data ---- */
  const pending = orders.filter(o => ['PENDING', 'ORDERED', 'IN_PROGRESS'].includes(o.status)).length;
  const completed = orders.filter(o => ['COMPLETED', 'VALIDATED'].includes(o.status)).length;
  const reported = orders.filter(o => o.status === 'REPORTED').length;
  const displayedOrders = orders.slice((page - 1) * 20, page * 20);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Radiology" subtitle="Manage imaging orders and results" />

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Orders" value={orders.length} icon={ScanLine} color="#3B82F6" />
        <KpiCard label="Pending" value={pending} icon={Clock} color="#F59E0B" />
        <KpiCard label="Reported" value={reported} icon={FileText} color="#8B5CF6" />
        <KpiCard label="Completed" value={completed} icon={CheckCircle} color="#10B981" />
      </div>

      {/* Filters + New Order button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            className="hms-input w-44"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="ORDERED">Ordered</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REPORTED">Reported</option>
            <option value="VALIDATED">Validated</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="hms-input w-44"
            value={filterModality}
            onChange={e => { setFilterModality(e.target.value); setPage(1); }}
          >
            <option value="">All Modalities</option>
            {modalities.map(m => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { if (editingId) { resetForm(); setShowForm(true); } else { setShowForm(!showForm); resetForm(); } }}
          className="px-4 py-2 rounded-lg text-white font-medium"
          style={{ background: 'var(--accent)' }}
        >
          + New Order
        </button>
      </div>

      {/* Order form */}
      {showForm && (
        <div className="hms-card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Order' : 'New Radiology Order'}</h3>
          {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Patient ID *" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
            <select className="hms-input" value={form.modality} onChange={e => setForm({ ...form, modality: e.target.value })}>
              {modalities.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
            <input className="hms-input" placeholder="Body Part *" value={form.bodyPart} onChange={e => setForm({ ...form, bodyPart: e.target.value })} />
            <select className="hms-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="STAT">STAT</option>
            </select>
            <input className="hms-input col-span-2" placeholder="Clinical History" value={form.clinicalHistory} onChange={e => setForm({ ...form, clinicalHistory: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>{editingId ? 'Update' : 'Submit'}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="hms-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--surface)' }}>
              <th className="text-left p-3 font-medium text-gray-600">Order #</th>
              <th className="text-left p-3 font-medium text-gray-600">Patient</th>
              <th className="text-left p-3 font-medium text-gray-600">Modality</th>
              <th className="text-left p-3 font-medium text-gray-600">Body Part</th>
              <th className="text-left p-3 font-medium text-gray-600">Priority</th>
              <th className="text-left p-3 font-medium text-gray-600">Status</th>
              <th className="text-left p-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={<ScanLine size={24} className="text-gray-400" />} title="No radiology orders" description="Submit an imaging order to get started" />
                </td>
              </tr>
            ) : (
              displayedOrders.map(o => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{o.orderNumber}</td>
                  <td className="p-3">{o.patientId}</td>
                  <td className="p-3">{o.modality}</td>
                  <td className="p-3">{o.bodyPart}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[o.priority] || 'bg-gray-100 text-gray-600'}`}>
                      {o.priority}
                    </span>
                  </td>
                  <td className="p-3"><StatusBadge value={o.status} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {/* View */}
                      <button
                        onClick={() => openViewModal(o.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Edit (only ORDERED) */}
                      {o.status === 'ORDERED' && (
                        <button
                          onClick={() => editRecord(o)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="Edit order"
                        >
                          <Pencil size={16} />
                        </button>
                      )}

                      {/* Add Result (ORDERED or IN_PROGRESS) */}
                      {['ORDERED', 'IN_PROGRESS'].includes(o.status) && (
                        <button
                          onClick={() => openResultModal(o.id)}
                          className="p-1 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700"
                          title="Add result"
                        >
                          <FileText size={16} />
                        </button>
                      )}

                      {/* Validate (REPORTED) */}
                      {o.status === 'REPORTED' && (
                        <button
                          onClick={() => handleValidate(o)}
                          className="p-1 rounded hover:bg-green-50 text-green-500 hover:text-green-700"
                          title="Validate result"
                        >
                          <ShieldCheck size={16} />
                        </button>
                      )}

                      {/* Delete (only ORDERED) */}
                      {o.status === 'ORDERED' && (
                        <button
                          onClick={() => handleDelete(o.id)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          title="Delete order"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(orders.length / 20)} onPageChange={setPage} totalItems={orders.length} pageSize={20} />
      </div>

      {/* ---- Add Result Modal ---- */}
      <Modal open={resultModal} onClose={() => setResultModal(false)} title="Add Radiology Result">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Findings *</label>
            <textarea
              className="hms-input w-full min-h-[100px]"
              placeholder="Describe the findings..."
              value={resultForm.findings}
              onChange={e => setResultForm({ ...resultForm, findings: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impression</label>
            <textarea
              className="hms-input w-full min-h-[80px]"
              placeholder="Radiologist impression..."
              value={resultForm.impression}
              onChange={e => setResultForm({ ...resultForm, impression: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
            <textarea
              className="hms-input w-full min-h-[80px]"
              placeholder="Recommended follow-up or action..."
              value={resultForm.recommendation}
              onChange={e => setResultForm({ ...resultForm, recommendation: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={resultForm.isCritical}
              onChange={e => setResultForm({ ...resultForm, isCritical: e.target.checked })}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-red-600 flex items-center gap-1">
              <AlertTriangle size={14} /> Mark as Critical
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={() => setResultModal(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
            <button
              onClick={handleAddResult}
              disabled={resultSubmitting}
              className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {resultSubmitting ? 'Submitting...' : 'Submit Result'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---- View Order Detail Modal ---- */}
      <Modal open={viewModal} onClose={() => setViewModal(false)} title="Order Details" width="max-w-2xl">
        {viewLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : viewOrder ? (
          <div className="space-y-5">
            {/* Order info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="font-medium text-gray-500">Order #:</span> <span className="text-gray-900">{viewOrder.orderNumber}</span></div>
              <div><span className="font-medium text-gray-500">Status:</span> <StatusBadge value={viewOrder.status} /></div>
              <div><span className="font-medium text-gray-500">Patient ID:</span> <span className="text-gray-900">{viewOrder.patientId}</span></div>
              <div><span className="font-medium text-gray-500">Modality:</span> <span className="text-gray-900">{viewOrder.modality}</span></div>
              <div><span className="font-medium text-gray-500">Body Part:</span> <span className="text-gray-900">{viewOrder.bodyPart}</span></div>
              <div>
                <span className="font-medium text-gray-500">Priority:</span>{' '}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[viewOrder.priority] || 'bg-gray-100 text-gray-600'}`}>
                  {viewOrder.priority}
                </span>
              </div>
              {viewOrder.clinicalHistory && (
                <div className="col-span-2"><span className="font-medium text-gray-500">Clinical History:</span> <span className="text-gray-900">{viewOrder.clinicalHistory}</span></div>
              )}
              <div><span className="font-medium text-gray-500">Created:</span> <span className="text-gray-900">{new Date(viewOrder.createdAt).toLocaleString()}</span></div>
            </div>

            {/* Results */}
            {viewOrder.results && viewOrder.results.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 border-t pt-4">Results</h4>
                {viewOrder.results.map((r: any, idx: number) => (
                  <div key={r.id || idx} className={`rounded-lg border p-4 space-y-2 text-sm ${r.isCritical ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                    {r.isCritical && (
                      <div className="flex items-center gap-1 text-red-600 font-semibold text-xs">
                        <AlertTriangle size={14} /> CRITICAL FINDING
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-500">Status:</span>
                      <StatusBadge value={r.status} />
                    </div>
                    {r.findings && (
                      <div>
                        <span className="font-medium text-gray-500">Findings:</span>
                        <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">{r.findings}</p>
                      </div>
                    )}
                    {r.impression && (
                      <div>
                        <span className="font-medium text-gray-500">Impression:</span>
                        <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">{r.impression}</p>
                      </div>
                    )}
                    {r.recommendation && (
                      <div>
                        <span className="font-medium text-gray-500">Recommendation:</span>
                        <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">{r.recommendation}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 pt-1 border-t">
                      {r.reportedById && <span>Reported by: {r.reportedById}</span>}
                      {r.reportedAt && <span>Reported at: {new Date(r.reportedAt).toLocaleString()}</span>}
                      {r.validatedById && <span>Validated by: {r.validatedById}</span>}
                      {r.validatedAt && <span>Validated at: {new Date(r.validatedAt).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 italic">No results reported yet.</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
