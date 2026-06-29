import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart, Truck, Plus, Search, Printer, X, Loader2, Eye, Package, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SkeletonKpiRow, SkeletonTableRow } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const BLANK_BATCH = { drugId: '', drugName: '', batchNumber: '', expiryDate: '', quantity: '', unitCost: '', shelfLocation: '' };

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [batchForm, setBatchForm] = useState({ ...BLANK_BATCH });
  const [submitting, setSubmitting] = useState(false);

  const [viewBatch, setViewBatch] = useState<any | null>(null);

  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // The received-stock register lives at GET /pharmacy/stock (DrugBatch[] with drug relation).
      const res = await api.get('/pharmacy/stock', { params: { locationId: (user as any)?.locationId || undefined } })
        .catch(() => ({ data: [] }));
      setBatches(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch { toast.error('Failed to load stock batches'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = Date.now();
  const totalBatches = batches.length;
  const totalUnits = batches.reduce((s, b) => s + (Number(b.quantityInStock) || 0), 0);
  const expiringSoon = batches.filter(b => b.expiryDate && (new Date(b.expiryDate).getTime() - now) < 90 * 864e5).length;
  const stockValue = batches.reduce((s, b) => s + (Number(b.quantityInStock) || 0) * (Number(b.unitCost) || 0), 0);

  const handleReceiveBatch = async () => {
    if (!batchForm.drugId) { toast.error('Select a drug'); return; }
    if (!batchForm.batchNumber.trim()) { toast.error('Batch number is required'); return; }
    if (!batchForm.expiryDate) { toast.error('Expiry date is required'); return; }
    if (!batchForm.quantity || Number(batchForm.quantity) < 1) { toast.error('Quantity must be at least 1'); return; }
    setSubmitting(true);
    try {
      // Matches the backend ReceiveBatchDto exactly (locationId is injected server-side from the JWT).
      await api.post('/pharmacy/batches', {
        drugId: batchForm.drugId,
        batchNumber: batchForm.batchNumber.trim(),
        expiryDate: batchForm.expiryDate,
        unitCost: Number(batchForm.unitCost) || 0,
        quantity: Number(batchForm.quantity),
        shelfLocation: batchForm.shelfLocation || undefined,
      });
      toast.success('Batch received into stock');
      setShowForm(false);
      setBatchForm({ ...BLANK_BATCH });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to receive batch'); }
    finally { setSubmitting(false); }
  };

  const handlePrint = (b: any) => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const amount = (Number(b.quantityInStock) || 0) * (Number(b.unitCost) || 0);
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Batch Receipt</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}td,th{padding:8px 10px;border:1px solid #ddd;text-align:left;}th{background:#f3f4f6;font-weight:600;}@media print{body{padding:20px;}}</style>
</head><body>
<h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1>
<h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">STOCK BATCH RECEIPT</h2>
<hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
<table>
  <tr><td style="width:30%;background:#f9fafb;font-weight:600;">Batch #</td><td>${b.batchNumber || '—'}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Drug</td><td>${b.drug?.brandName || b.drugName || '—'}${b.drug?.strength ? ' (' + b.drug.strength + ')' : ''}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Quantity in Stock</td><td>${b.quantityInStock ?? '—'}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Unit Cost</td><td>₹${Number(b.unitCost || 0).toLocaleString('en-IN')}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Stock Value</td><td>₹${amount.toLocaleString('en-IN')}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Expiry Date</td><td>${b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : '—'}</td></tr>
  <tr><td style="background:#f9fafb;font-weight:600;">Received</td><td>${b.receivedDate ? new Date(b.receivedDate).toLocaleDateString('en-IN') : '—'}</td></tr>
</table>
<div style="margin-top:40px;border-top:1px solid #111;width:200px;padding-top:6px;font-size:11px;color:#555;">Pharmacy In-charge</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const filtered = batches.filter(b =>
    !search ||
    (b.batchNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.drug?.brandName || b.drugName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Pharmacy Stock — Receive Batches" subtitle="Receive supplier drug batches into inventory"
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Receive Stock Batch
          </button>
        }
      />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Batches" value={totalBatches} icon={Package} color="#3B82F6" />
          <KpiCard label="Units in Stock" value={totalUnits.toLocaleString('en-IN')} icon={ShoppingCart} color="#10B981" />
          <KpiCard label="Expiring ≤90d" value={expiringSoon} icon={Truck} color="#F59E0B" />
          <KpiCard label="Stock Value" value={`₹${stockValue.toLocaleString('en-IN')}`} icon={DollarSign} color="#0F766E" />
        </div>
      )}

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Stock Batch Register</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batch or drug..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>

        {loading ? (
          <table className="w-full"><tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</tbody></table>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package size={36} />} title="No stock batches" description="Receive a drug batch to add stock to inventory" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Batch #</th>
                  <th className="px-4 py-3">Drug</th>
                  <th className="px-4 py-3">Qty in Stock</th>
                  <th className="px-4 py-3">Unit Cost</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-teal-700 font-mono">{b.batchNumber || (b.id || '').slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-sm font-medium">{b.drug?.brandName || b.drugName || '—'}{b.drug?.strength ? <span className="text-xs text-gray-400 ml-1">{b.drug.strength}</span> : null}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.quantityInStock ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₹{(Number(b.unitCost) || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.expiryDate ? formatDate(b.expiryDate) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status || 'ACTIVE'} /></td>
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

      {/* Receive Batch Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Receive Stock Batch</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Drug *</label>
                <SearchableSelect
                  value={batchForm.drugId}
                  onChange={(id, opt) => setBatchForm({ ...batchForm, drugId: id, drugName: opt?.label || '' })}
                  placeholder="Search drug…"
                  endpoint="/pharmacy/drugs"
                  searchParam="q"
                  mapOption={(d: any) => ({ id: d.id, label: d.brandName, sub: [d.genericName, d.strength].filter(Boolean).join(' · ') })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Number *</label>
                  <input className="hms-input w-full" placeholder="e.g. BATCH-2026-001" value={batchForm.batchNumber} onChange={e => setBatchForm({ ...batchForm, batchNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date *</label>
                  <input type="date" className="hms-input w-full" value={batchForm.expiryDate} onChange={e => setBatchForm({ ...batchForm, expiryDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
                  <input type="number" min="1" className="hms-input w-full" placeholder="e.g. 100" value={batchForm.quantity} onChange={e => setBatchForm({ ...batchForm, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Cost (₹)</label>
                  <input type="number" min="0" step="0.01" className="hms-input w-full" placeholder="e.g. 2.50" value={batchForm.unitCost} onChange={e => setBatchForm({ ...batchForm, unitCost: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Shelf Location</label>
                  <input className="hms-input w-full" placeholder="e.g. A1" value={batchForm.shelfLocation} onChange={e => setBatchForm({ ...batchForm, shelfLocation: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleReceiveBatch} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Receive Batch
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
            <div className="p-6 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-gray-400">Drug</span><p className="font-medium">{viewBatch.drug?.brandName || viewBatch.drugName || '—'}</p></div>
              <div><span className="text-xs text-gray-400">Strength</span><p className="font-medium">{viewBatch.drug?.strength || '—'}</p></div>
              <div><span className="text-xs text-gray-400">Qty in Stock</span><p className="font-medium">{viewBatch.quantityInStock ?? '—'}</p></div>
              <div><span className="text-xs text-gray-400">Unit Cost</span><p className="font-medium">₹{(Number(viewBatch.unitCost) || 0).toLocaleString('en-IN')}</p></div>
              <div><span className="text-xs text-gray-400">Expiry</span><p className="font-medium">{viewBatch.expiryDate ? formatDate(viewBatch.expiryDate) : '—'}</p></div>
              <div><span className="text-xs text-gray-400">Received</span><p className="font-medium">{viewBatch.receivedDate ? formatDate(viewBatch.receivedDate) : '—'}</p></div>
              <div><span className="text-xs text-gray-400">Status</span><div className="mt-1"><StatusBadge status={viewBatch.status || 'ACTIVE'} /></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
