import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Plus, X, Loader2, CheckCircle, XCircle, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function PurchaseIndentPage() {
  const [indents, setIndents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([{ itemName: '', quantity: '', unit: 'PCS', urgency: 'NORMAL' }]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/purchase-indents', { params: { page, limit: 20, status: statusFilter || undefined } }); setIndents(data.data || []); setTotal(data.meta?.total || 0); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page, statusFilter]);

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.itemName.trim() && i.quantity);
    if (!validItems.length) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try { await api.post('/purchase-indents', { items: validItems.map(i => ({ ...i, quantity: Number(i.quantity) })) }); toast.success('Indent created'); setShowForm(false); setItems([{ itemName: '', quantity: '', unit: 'PCS', urgency: 'NORMAL' }]); fetchData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); }
  };

  const handleAction = async (id: string, action: string) => {
    try { await api.patch(`/purchase-indents/${id}/${action}`); toast.success(`Indent ${action}ed`); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const handlePrintIndent = (ind: any) => {
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
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;}
  h1{margin:0;font-size:22px;font-weight:900;color:#0F766E;letter-spacing:1px;}
  h2{margin:4px 0 12px;font-size:16px;font-weight:700;color:#111;}
  hr{border:none;border-top:2px solid #0F766E;margin:12px 0;}
  .box{border:1px solid #ccc;border-radius:6px;padding:16px;margin-bottom:16px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;}
  .field label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px;}
  .field span{display:block;font-size:13px;font-weight:600;color:#111;margin-top:2px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  thead th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.5px;}
  .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;}
  .sig-box{border-top:2px solid #111;padding-top:8px;font-size:12px;color:#444;}
  @media print{body{padding:16px;}}
</style></head><body>
<h1>AYPHEN HMS</h1>
<h2>PURCHASE INDENT</h2>
<hr/>
<div class="box">
  <div class="grid">
    <div class="field"><label>Indent #</label><span>${ind.indentNumber || '—'}</span></div>
    <div class="field"><label>Date</label><span>${ind.createdAt ? new Date(ind.createdAt).toLocaleDateString() : '—'}</span></div>
    <div class="field"><label>Status</label><span>${ind.status || '—'}</span></div>
    <div class="field"><label>Department</label><span>${ind.department || '—'}</span></div>
    <div class="field"><label>Requested By</label><span>${ind.requestedBy || '—'}</span></div>
  </div>
</div>
<table>
  <thead><tr>
    <th style="width:40px;">#</th>
    <th>Item Name</th>
    <th style="width:80px;text-align:center;">Quantity</th>
    <th style="width:70px;text-align:center;">Unit</th>
    <th style="width:90px;text-align:center;">Urgency</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="sig-row">
  <div class="sig-box">Requested By: ___________</div>
  <div class="sig-box">Approved By: ___________</div>
  <div class="sig-box">Date: ___________</div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Purchase Indents" subtitle="Department requisitions and approvals" actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Indent</button>} />
      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === s ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600'}`}>{s || 'All'}</button>
        ))}
      </div>
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['Indent #', 'Date', 'Items', 'Status', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</>
        : indents.length === 0 ? <tr><td colSpan={5}><EmptyState icon={<FileText size={36} />} title="No indents" /></td></tr>
        : indents.map(ind => (
          <tr key={ind.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm font-semibold text-teal-700">{ind.indentNumber}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ind.createdAt)}</td>
            <td className="px-4 py-3 text-sm">{(ind.items as any[])?.length || 0} items</td>
            <td className="px-4 py-3"><StatusBadge status={ind.status} /></td>
            <td className="px-4 py-3"><div className="flex gap-1">
              {ind.status === 'DRAFT' && <button onClick={() => handleAction(ind.id, 'submit')} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">Submit</button>}
              {ind.status === 'SUBMITTED' && (<>
                <button onClick={() => handleAction(ind.id, 'approve')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium flex items-center gap-1"><CheckCircle size={11} /> Approve</button>
                <button onClick={() => handleAction(ind.id, 'reject')} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium flex items-center gap-1"><XCircle size={11} /> Reject</button>
              </>)}
              {(ind.status === 'APPROVED' || ind.status === 'SUBMITTED') && (
                <button onClick={() => handlePrintIndent(ind)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={12}/> Print</button>
              )}
            </div></td>
          </tr>))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">New Purchase Indent</h2><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between"><label className="text-xs font-semibold text-gray-600">Items *</label><button onClick={() => setItems([...items, { itemName: '', quantity: '', unit: 'PCS', urgency: 'NORMAL' }])} className="text-xs text-teal-600 hover:underline">+ Add</button></div>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input className="hms-input flex-1" placeholder="Item name" value={item.itemName} onChange={e => { const n = [...items]; n[i].itemName = e.target.value; setItems(n); }} />
                  <input type="number" className="hms-input w-20" placeholder="Qty" value={item.quantity} onChange={e => { const n = [...items]; n[i].quantity = e.target.value; setItems(n); }} />
                  <select className="hms-input w-24" value={item.urgency} onChange={e => { const n = [...items]; n[i].urgency = e.target.value; setItems(n); }}><option>NORMAL</option><option>URGENT</option><option>CRITICAL</option></select>
                  {items.length > 1 && <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={14} /></button>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Create Indent</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
