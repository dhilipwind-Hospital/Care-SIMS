import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart, Truck, CheckCircle, DollarSign, Plus, Search, Printer,
  X, Loader2, Eye, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonKpiRow, SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const BLANK_ITEM = { brandName: '', genericName: '', quantity: '', unitPrice: '', unit: 'STRIPS', hsnCode: '' };

export default function PurchaseOrdersPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [poForm, setPoForm] = useState({ vendorId: '', expectedDate: '', paymentTerms: '', notes: '' });
  const [poItems, setPoItems] = useState([{ ...BLANK_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  const [viewBatch, setViewBatch] = useState<any | null>(null);

  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, vendorRes] = await Promise.all([
        api.get('/pharmacy/batches', { params: { page, limit: PAGE_SIZE, q: search || undefined } }).catch(() => ({ data: { data: [], meta: { total: 0 } } })),
        api.get('/vendors', { params: { limit: 100, category: 'PHARMA' } }).catch(() => ({ data: { data: [] } })),
      ]);
      setBatches(batchRes.data.data || batchRes.data || []);
      setVendors(vendorRes.data.data || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBatches = batches.length;
  const pending = batches.filter(b => b.status === 'PENDING' || !b.receivedAt).length;
  const received = batches.filter(b => b.receivedAt || b.status === 'RECEIVED').length;
  const thisMonthSpend = batches
    .filter(b => b.createdAt && new Date(b.createdAt).getMonth() === new Date().getMonth())
    .reduce((s, b) => s + (Number(b.totalCost) || 0), 0);

  const handleSubmitPO = async () => {
    const validItems = poItems.filter(i => i.brandName.trim() && i.quantity);
    if (!validItems.length) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      await api.post('/pharmacy/batches', {
        ...poForm,
        items: validItems.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) || 0 })),
      });
      toast.success('Purchase order created');
      setShowForm(false);
      setPoForm({ vendorId: '', expectedDate: '', paymentTerms: '', notes: '' });
      setPoItems([{ ...BLANK_ITEM }]);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create PO'); }
    finally { setSubmitting(false); }
  };

  const addItem = () => setPoItems(prev => [...prev, { ...BLANK_ITEM }]);
  const removeItem = (i: number) => setPoItems(prev => prev.filter((_, j) => j !== i));
  const updateItem = (i: number, k: string, v: string) => setPoItems(prev => prev.map((item, j) => j === i ? { ...item, [k]: v } : item));

  const subtotal = poItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  const handlePrint = (b: any) => {
    const items: any[] = b.items || b.batchItems || [];
    const st = items.reduce((s: number, it: any) => s + ((it.unitPrice || 0) * (it.quantity || 0)), 0);
    const grand = b.totalCost || st;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Purchase Order</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px;}table{width:100%;border-collapse:collapse;}td,th{padding:7px 10px;border:1px solid #ddd;}th{background:#f3f4f6;font-weight:600;text-align:left;}@media print{body{padding:20px;}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
  <div><h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1><h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">PURCHASE ORDER / BATCH RECEIPT</h2></div>
  <div style="text-align:right;font-size:11px;color:#555;">Printed: ${new Date().toLocaleString()}</div>
</div>
<hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
<table style="margin-bottom:16px;">
  <tr><td style="width:25%;background:#f9fafb;font-weight:600;">Batch #</td><td>${b.batchNumber || (b.id || '').slice(0, 8).toUpperCase()}</td><td style="width:25%;background:#f9fafb;font-weight:600;">Date</td><td>${b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Vendor / Supplier</td><td>${b.vendor?.name || b.supplierName || '—'}</td><td style="background:#f9fafb;font-weight:600;">Expected Date</td><td>${b.expectedDate ? new Date(b.expectedDate).toLocaleDateString('en-IN') : '—'}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Status</td><td colspan="3"><span style="font-weight:700;">${b.status || (b.receivedAt ? 'RECEIVED' : 'PENDING')}</span></td></tr>
</table>
<div style="font-weight:700;margin-bottom:8px;color:#0F766E;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Items</div>
<table style="margin-bottom:16px;">
  <thead><tr><th style="width:30px;">#</th><th>Brand Name</th><th>Generic Name</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead>
  <tbody>
    ${items.length ? items.map((it: any, idx: number) => {
      const rate = it.unitPrice || it.rate || 0;
      const qty = it.quantity || 0;
      return `<tr><td>${idx + 1}</td><td>${it.brandName || it.name || '—'}</td><td>${it.genericName || '—'}</td><td>${qty}</td><td>${it.unit || '—'}</td><td style="text-align:right;">₹${Number(rate).toLocaleString('en-IN')}</td><td style="text-align:right;">₹${(rate * qty).toLocaleString('en-IN')}</td></tr>`;
    }).join('') : `<tr><td colspan="7" style="text-align:center;color:#888;">No items</td></tr>`}
    <tr><td colspan="5"></td><td style="background:#0F766E;color:#fff;font-weight:700;">Grand Total</td><td style="background:#0F766E;color:#fff;font-weight:900;text-align:right;">₹${Number(grand).toLocaleString('en-IN')}</td></tr>
  </tbody>
</table>
<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;border-top:1px solid #ddd;padding-top:20px;">
  <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Pharmacy Manager</div></div>
  <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Finance Officer</div></div>
  <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Authorized Signatory</div></div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const filtered = batches.filter(b =>
    !search ||
    (b.batchNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.vendor?.name || b.supplierName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Purchase Orders" subtitle="Manage pharmacy batch receipts and supplier orders"
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Purchase Order
          </button>
        }
      />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Batches" value={totalBatches} icon={ShoppingCart} color="#3B82F6" />
          <KpiCard label="Pending Receipt" value={pending} icon={Truck} color="#F59E0B" />
          <KpiCard label="Received" value={received} icon={CheckCircle} color="#10B981" />
          <KpiCard label="This Month Spend" value={`₹${thisMonthSpend.toLocaleString('en-IN')}`} icon={DollarSign} color="#0F766E" />
        </div>
      )}

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Batch / Order Register</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batch or supplier..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>

        {loading ? (
          <table className="w-full"><tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</tbody></table>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package size={36} />} title="No purchase orders" description="Create a purchase order to receive pharmacy stock" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Batch #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Order Date</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-teal-700 font-mono">{b.batchNumber || (b.id || '').slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-sm font-medium">{b.vendor?.name || b.supplierName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{(b.items || b.batchItems || []).length || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.createdAt ? formatDate(b.createdAt) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.expectedDate ? formatDate(b.expectedDate) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">₹{(Number(b.totalCost) || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status || (b.receivedAt ? 'RECEIVED' : 'PENDING')} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setViewBatch(b)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 flex items-center gap-1"><Eye size={11} /> View</button>
                        <button onClick={() => handlePrint(b)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 flex items-center gap-1"><Printer size={11} /> Print</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {/* New PO Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">New Purchase Order</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier / Vendor</label>
                  <select className="hms-input w-full" value={poForm.vendorId} onChange={e => setPoForm({ ...poForm, vendorId: e.target.value })}>
                    <option value="">Select vendor (optional)</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Expected Delivery Date</label>
                  <input type="date" className="hms-input w-full" value={poForm.expectedDate} onChange={e => setPoForm({ ...poForm, expectedDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Terms</label>
                  <select className="hms-input w-full" value={poForm.paymentTerms} onChange={e => setPoForm({ ...poForm, paymentTerms: e.target.value })}>
                    <option value="">Select terms</option>
                    {['IMMEDIATE', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'CREDIT'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <input className="hms-input w-full" value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Optional notes" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Items *</label>
                  <button onClick={addItem} className="text-xs text-teal-600 hover:underline font-medium">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {poItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-3">
                        {i === 0 && <label className="block text-xs text-gray-400 mb-1">Brand Name *</label>}
                        <input className="hms-input w-full text-sm" placeholder="Brand name" value={item.brandName} onChange={e => updateItem(i, 'brandName', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        {i === 0 && <label className="block text-xs text-gray-400 mb-1">Generic Name</label>}
                        <input className="hms-input w-full text-sm" placeholder="Generic" value={item.genericName} onChange={e => updateItem(i, 'genericName', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <label className="block text-xs text-gray-400 mb-1">Qty *</label>}
                        <input type="number" className="hms-input w-full text-sm" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <label className="block text-xs text-gray-400 mb-1">Rate (₹)</label>}
                        <input type="number" className="hms-input w-full text-sm" placeholder="Rate" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        {i === 0 && <label className="block text-xs text-gray-400 mb-1">Unit</label>}
                        <select className="hms-input w-full text-sm" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                          {['STRIPS', 'VIALS', 'AMPOULES', 'BOTTLES', 'TABLETS', 'CAPSULES', 'ML', 'GM', 'PCS'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1 flex items-end pb-1">
                        {i === 0 && <div className="h-5" />}
                        {poItems.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 p-1"><X size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {subtotal > 0 && (
                  <div className="mt-3 flex justify-end">
                    <div className="text-sm font-semibold text-gray-700">Subtotal: <span className="text-teal-700">₹{subtotal.toLocaleString('en-IN')}</span></div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmitPO} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Batch Detail */}
      {viewBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Batch Details</h2>
                <p className="text-xs text-gray-400 font-mono">{viewBatch.batchNumber || (viewBatch.id || '').slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrint(viewBatch)} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button>
                <button onClick={() => setViewBatch(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-gray-400">Supplier</span><p className="font-medium">{viewBatch.vendor?.name || viewBatch.supplierName || '—'}</p></div>
                <div><span className="text-xs text-gray-400">Status</span><div className="mt-1"><StatusBadge status={viewBatch.status || (viewBatch.receivedAt ? 'RECEIVED' : 'PENDING')} /></div></div>
                <div><span className="text-xs text-gray-400">Order Date</span><p className="font-medium">{viewBatch.createdAt ? formatDate(viewBatch.createdAt) : '—'}</p></div>
                <div><span className="text-xs text-gray-400">Expected Date</span><p className="font-medium">{viewBatch.expectedDate ? formatDate(viewBatch.expectedDate) : '—'}</p></div>
                {viewBatch.receivedAt && <div><span className="text-xs text-gray-400">Received At</span><p className="font-medium">{formatDate(viewBatch.receivedAt)}</p></div>}
                {viewBatch.totalCost && <div><span className="text-xs text-gray-400">Total Value</span><p className="font-bold text-teal-700">₹{Number(viewBatch.totalCost).toLocaleString('en-IN')}</p></div>}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</h3>
                {(viewBatch.items || viewBatch.batchItems || []).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No item details available</p>
                ) : (
                  <div className="space-y-2">
                    {(viewBatch.items || viewBatch.batchItems || []).map((it: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <span className="text-sm font-medium">{it.brandName || it.name || '—'}</span>
                          {it.genericName && <span className="text-xs text-gray-400 ml-2">{it.genericName}</span>}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{it.quantity} {it.unit || ''}</span>
                          {it.unitPrice && <p className="text-xs text-gray-400">₹{Number(it.unitPrice).toLocaleString('en-IN')} each</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
