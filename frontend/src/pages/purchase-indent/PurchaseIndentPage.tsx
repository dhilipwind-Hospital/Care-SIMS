import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FileText, Plus, X, Loader2, CheckCircle, XCircle, Printer, Eye,
  Clock, AlertTriangle, Package, PackagePlus,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import KpiCard from '../../components/ui/KpiCard';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const BLANK_ITEM = { itemName: '', quantity: '', unit: 'PCS', urgency: 'NORMAL' };

export default function PurchaseIndentPage() {
  const [indents, setIndents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...BLANK_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  const [viewIndent, setViewIndent] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Receive flow: maps each indent line to a Central Store item with a
  // quantity received and optional unit price. Submitting transitions the
  // indent to FULFILLED or PARTIALLY_FULFILLED.
  const [receiveIndent, setReceiveIndent] = useState<any | null>(null);
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [receiveLines, setReceiveLines] = useState<Array<{ storeItemId: string; quantityReceived: string; unitPrice: string }>>([]);
  const [receiving, setReceiving] = useState(false);

  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchase-indents', { params: { page, limit: PAGE_SIZE, status: statusFilter || undefined } });
      setIndents(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch { toast.error('Failed to load indents'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openView = async (ind: any) => {
    setViewIndent(ind);
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/purchase-indents/${ind.id}`);
      setViewIndent(data);
    } catch { /* use already set ind */ }
    finally { setLoadingDetail(false); }
  };

  const handleSubmitIndent = async () => {
    const validItems = items.filter(i => i.itemName.trim() && i.quantity);
    if (!validItems.length) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      await api.post('/purchase-indents', {
        department: department.trim() || undefined,
        notes: notes.trim() || undefined,
        items: validItems.map(i => ({ ...i, quantity: Number(i.quantity) })),
      });
      toast.success('Indent created');
      setShowForm(false);
      setDepartment('');
      setNotes('');
      setItems([{ ...BLANK_ITEM }]);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await api.patch(`/purchase-indents/${id}/${action}`);
      toast.success(`Indent ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : action}d`);
      fetchData();
      if (viewIndent?.id === id) {
        const { data } = await api.get(`/purchase-indents/${id}`);
        setViewIndent(data);
      }
    } catch { toast.error('Action failed'); }
  };

  const openReject = (ind: any) => {
    setRejectTarget(ind);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openReceive = async (ind: any) => {
    setReceiveIndent(ind);
    setReceiveLines(((ind.items as any[]) || []).map(it => ({
      storeItemId: '',
      quantityReceived: String(it.quantity ?? ''),
      unitPrice: '',
    })));
    try {
      const { data } = await api.get('/central-store/items', { params: { limit: 200 } });
      setStoreItems(data?.data || []);
    } catch { setStoreItems([]); toast.error('Could not load Central Store items'); }
  };

  const confirmReceive = async () => {
    if (!receiveIndent) return;
    const lines = receiveLines
      .map(l => ({
        storeItemId: l.storeItemId,
        quantityReceived: Number(l.quantityReceived),
        unitPrice: l.unitPrice !== '' ? Number(l.unitPrice) : undefined,
      }))
      .filter(l => l.storeItemId && l.quantityReceived > 0);
    if (!lines.length) { toast.error('Pick at least one store item and quantity'); return; }
    setReceiving(true);
    try {
      await api.patch(`/purchase-indents/${receiveIndent.id}/fulfill`, { lines });
      toast.success('Receipt recorded — Central Store stock updated');
      setReceiveIndent(null);
      setReceiveLines([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record receipt');
    } finally {
      setReceiving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Rejection reason required'); return; }
    setRejecting(true);
    try {
      await api.patch(`/purchase-indents/${rejectTarget.id}/reject`, { reason: rejectReason });
      toast.success('Indent rejected');
      setShowRejectModal(false);
      setRejectTarget(null);
      fetchData();
      if (viewIndent?.id === rejectTarget.id) {
        const { data } = await api.get(`/purchase-indents/${rejectTarget.id}`);
        setViewIndent(data);
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setRejecting(false); }
  };

  const handlePrint = (ind: any) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const rows = (ind.items || []).map((item: any, i: number) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${item.itemName || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${item.unit || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${item.urgency || '—'}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Purchase Indent</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;}h1{margin:0;font-size:22px;font-weight:900;color:#0F766E;}h2{margin:4px 0 12px;font-size:16px;font-weight:700;}hr{border:none;border-top:2px solid #0F766E;margin:12px 0;}.box{border:1px solid #ccc;border-radius:6px;padding:16px;margin-bottom:16px;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;}.field label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;}.field span{display:block;font-size:13px;font-weight:600;color:#111;margin-top:2px;}table{width:100%;border-collapse:collapse;font-size:13px;}thead th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;}.sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;}.sig-box{border-top:2px solid #111;padding-top:8px;font-size:12px;color:#444;}@media print{body{padding:16px;}}</style>
</head><body>
<h1>AYPHEN HMS</h1><h2>PURCHASE INDENT</h2><hr/>
<div class="box"><div class="grid">
  <div class="field"><label>Indent #</label><span>${ind.indentNumber || '—'}</span></div>
  <div class="field"><label>Date</label><span>${ind.createdAt ? new Date(ind.createdAt).toLocaleDateString('en-IN') : '—'}</span></div>
  <div class="field"><label>Status</label><span>${ind.status || '—'}</span></div>
  <div class="field"><label>Department</label><span>${ind.department || '—'}</span></div>
  <div class="field"><label>Requested By</label><span>${ind.requestedBy?.firstName ? `${ind.requestedBy.firstName} ${ind.requestedBy.lastName || ''}` : '—'}</span></div>
  ${ind.approvedBy ? `<div class="field"><label>Approved By</label><span>${ind.approvedBy.firstName || '—'}</span></div>` : ''}
</div></div>
${ind.notes ? `<div style="margin-bottom:16px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;"><strong>Notes:</strong> ${ind.notes}</div>` : ''}
${ind.rejectionReason ? `<div style="margin-bottom:16px;padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:13px;color:#dc2626;"><strong>Rejection Reason:</strong> ${ind.rejectionReason}</div>` : ''}
<table>
  <thead><tr><th style="width:40px;">#</th><th>Item Name</th><th style="width:80px;text-align:center;">Qty</th><th style="width:70px;text-align:center;">Unit</th><th style="width:90px;text-align:center;">Urgency</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="sig-row">
  <div class="sig-box">Requested By: ___________</div>
  <div class="sig-box">Approved By: ___________</div>
  <div class="sig-box">Date: ___________</div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const drafted = indents.filter(i => i.status === 'DRAFT').length;
  const submitted = indents.filter(i => i.status === 'SUBMITTED').length;
  const approved = indents.filter(i => i.status === 'APPROVED').length;
  const rejected = indents.filter(i => i.status === 'REJECTED').length;

  const addItem = () => setItems(prev => [...prev, { ...BLANK_ITEM }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, j) => j !== i));
  const updateItem = (i: number, k: string, v: string) => setItems(prev => prev.map((item, j) => j === i ? { ...item, [k]: v } : item));

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Purchase Indents" subtitle="Department requisitions and approvals"
        actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Indent</button>}
      />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Draft" value={drafted} icon={FileText} color="#6B7280" />
          <KpiCard label="Pending Approval" value={submitted} icon={Clock} color="#F59E0B" />
          <KpiCard label="Approved" value={approved} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Rejected" value={rejected} icon={AlertTriangle} color="#EF4444" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === s ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>{['Indent #', 'Date', 'Department', 'Items', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
                : indents.length === 0
                  ? <tr><td colSpan={6}><EmptyState icon={<Package size={36} />} title="No indents" description="Create a purchase indent to request supplies" /></td></tr>
                  : indents.map(ind => (
                    <tr key={ind.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-teal-700 font-mono">{ind.indentNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ind.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ind.department || '—'}</td>
                      <td className="px-4 py-3 text-sm">{(ind.items as any[])?.length || 0} items</td>
                      <td className="px-4 py-3"><StatusBadge status={ind.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openView(ind)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium flex items-center gap-1"><Eye size={11} /> View</button>
                          {ind.status === 'DRAFT' && (
                            <button onClick={() => handleAction(ind.id, 'submit')} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Submit</button>
                          )}
                          {ind.status === 'SUBMITTED' && (<>
                            <button onClick={() => handleAction(ind.id, 'approve')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium flex items-center gap-1"><CheckCircle size={11} /> Approve</button>
                            <button onClick={() => openReject(ind)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium flex items-center gap-1"><XCircle size={11} /> Reject</button>
                          </>)}
                          {(ind.status === 'APPROVED' || ind.status === 'PARTIALLY_FULFILLED') && (
                            <button onClick={() => openReceive(ind)} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium flex items-center gap-1"><PackagePlus size={11} /> Receive</button>
                          )}
                          {(ind.status === 'APPROVED' || ind.status === 'SUBMITTED') && (
                            <button onClick={() => handlePrint(ind)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
      </div>

      {/* New Indent Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">New Purchase Indent</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Department / Ward</label>
                  <input className="hms-input w-full" placeholder="e.g. ICU, OPD, Pharmacy" value={department} onChange={e => setDepartment(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <input className="hms-input w-full" placeholder="Optional notes" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Items *</label>
                  <button onClick={addItem} className="text-xs text-teal-600 hover:underline font-medium">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className="hms-input flex-1" placeholder="Item name" value={item.itemName} onChange={e => updateItem(i, 'itemName', e.target.value)} />
                      <input type="number" className="hms-input w-20" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                      <select className="hms-input w-24" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                        {['PCS', 'BOX', 'STRIPS', 'VIALS', 'ML', 'GM', 'LTR', 'KG'].map(u => <option key={u}>{u}</option>)}
                      </select>
                      <select className="hms-input w-24" value={item.urgency} onChange={e => updateItem(i, 'urgency', e.target.value)}>
                        {['NORMAL', 'URGENT', 'CRITICAL'].map(u => <option key={u}>{u}</option>)}
                      </select>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmitIndent} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Create Indent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><XCircle size={18} className="text-red-500" /> Reject Indent</h2>
              <button onClick={() => setShowRejectModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Provide a reason for rejecting indent <span className="font-semibold text-teal-700">{rejectTarget?.indentNumber}</span>.</p>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rejection Reason *</label>
              <textarea className="hms-input w-full" rows={3} placeholder="Enter reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleReject} disabled={rejecting} className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-red-700 transition-colors">
                {rejecting && <Loader2 size={14} className="animate-spin" />} Reject Indent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Drawer */}
      {viewIndent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl sm:rounded-r-none w-full sm:w-[480px] h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{viewIndent.indentNumber}</h2>
                <p className="text-xs text-gray-400">{viewIndent.department || 'No department'} · {formatDate(viewIndent.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrint(viewIndent)} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button>
                <button onClick={() => setViewIndent(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {loadingDetail ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={viewIndent.status} />
                    {viewIndent.status === 'SUBMITTED' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(viewIndent.id, 'approve')} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium flex items-center gap-1"><CheckCircle size={11} /> Approve</button>
                        <button onClick={() => openReject(viewIndent)} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium flex items-center gap-1"><XCircle size={11} /> Reject</button>
                      </div>
                    )}
                    {viewIndent.status === 'DRAFT' && (
                      <button onClick={() => handleAction(viewIndent.id, 'submit')} className="text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium">Submit for Approval</button>
                    )}
                  </div>

                  {viewIndent.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                      <XCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-red-600">Rejection Reason</p>
                        <p className="text-sm text-red-700 mt-0.5">{viewIndent.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  {viewIndent.notes && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">{viewIndent.notes}</div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {viewIndent.requestedBy && (
                      <div><span className="text-xs text-gray-400">Requested By</span><p className="font-medium">{viewIndent.requestedBy.firstName} {viewIndent.requestedBy.lastName || ''}</p></div>
                    )}
                    {viewIndent.approvedBy && (
                      <div><span className="text-xs text-gray-400">Approved By</span><p className="font-medium">{viewIndent.approvedBy.firstName} {viewIndent.approvedBy.lastName || ''}</p></div>
                    )}
                    {viewIndent.approvedAt && (
                      <div><span className="text-xs text-gray-400">Approved At</span><p className="font-medium">{formatDate(viewIndent.approvedAt)}</p></div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Items ({(viewIndent.items || []).length})</h3>
                    {(viewIndent.items || []).length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No items</p>
                    ) : (
                      <div className="space-y-2">
                        {(viewIndent.items || []).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{item.itemName}</span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${item.urgency === 'CRITICAL' ? 'bg-red-100 text-red-700' : item.urgency === 'URGENT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{item.urgency}</span>
                            </div>
                            <span className="text-sm font-bold text-teal-700">{item.quantity} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receive Goods modal — maps each indent line to a Central Store item */}
      {receiveIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Receive Goods — {receiveIndent.indentNumber}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Map each requested item to a Central Store entry. Stock will be incremented and the indent transitioned to FULFILLED / PARTIALLY_FULFILLED.</p>
              </div>
              <button onClick={() => setReceiveIndent(null)} disabled={receiving} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {((receiveIndent.items as any[]) || []).map((it: any, i: number) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="col-span-4">
                    <div className="text-xs text-gray-400 uppercase">Requested</div>
                    <div className="text-sm font-semibold text-gray-900 truncate">{it.itemName}</div>
                    <div className="text-xs text-gray-500">{it.quantity} {it.unit || 'PCS'}{it.urgency ? ` · ${it.urgency}` : ''}</div>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Receive into</label>
                    <select className="hms-input w-full text-sm"
                      value={receiveLines[i]?.storeItemId || ''}
                      onChange={e => setReceiveLines(rl => rl.map((l, idx) => idx === i ? { ...l, storeItemId: e.target.value } : l))}>
                      <option value="">— Select item —</option>
                      {storeItems.map(si => (
                        <option key={si.id} value={si.id}>{si.itemCode} · {si.name} (in stock {si.currentStock} {si.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Qty received</label>
                    <input type="number" min="0" className="hms-input w-full text-sm"
                      value={receiveLines[i]?.quantityReceived || ''}
                      onChange={e => setReceiveLines(rl => rl.map((l, idx) => idx === i ? { ...l, quantityReceived: e.target.value } : l))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Unit ₹</label>
                    <input type="number" step="0.01" min="0" className="hms-input w-full text-sm" placeholder="optional"
                      value={receiveLines[i]?.unitPrice || ''}
                      onChange={e => setReceiveLines(rl => rl.map((l, idx) => idx === i ? { ...l, unitPrice: e.target.value } : l))} />
                  </div>
                </div>
              ))}
              {storeItems.length === 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  No items in Central Store yet — add some via the Central Store page first, then come back.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setReceiveIndent(null)} disabled={receiving} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={confirmReceive} disabled={receiving || storeItems.length === 0}
                className="btn-primary flex items-center gap-2 px-4 py-2">
                {receiving && <Loader2 size={14} className="animate-spin" />}
                Record Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
