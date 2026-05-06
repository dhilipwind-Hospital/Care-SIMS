import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Shirt, Plus, Loader2, ArrowDownUp, Printer, AlertTriangle,
  History, X, RefreshCw,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const ITEM_TYPES = ['BEDSHEET', 'PILLOWCOVER', 'TOWEL', 'GOWN', 'CURTAIN', 'BLANKET', 'DRAW_SHEET'];
const TX_TYPES = ['ISSUE', 'COLLECT', 'LAUNDRY_SEND', 'LAUNDRY_RECEIVE', 'DAMAGE'];

type Tab = 'items' | 'transactions';

export default function LinenPage() {
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  const [showTx, setShowTx] = useState(false);
  const [txForm, setTxForm] = useState({ itemId: '', transactionType: 'ISSUE', quantity: '', wardId: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ itemType: 'BEDSHEET', totalStock: '' });

  const TX_PAGE_SIZE = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/linen/items'),
        api.get('/linen/dashboard'),
      ]);
      setItems(list.data.data || list.data || []);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load linen data'); }
    finally { setLoading(false); }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const { data } = await api.get('/linen/transactions', { params: { page: txPage, limit: TX_PAGE_SIZE } });
      setTransactions(data.data || []);
      setTxTotal(data.meta?.total || 0);
    } catch { toast.error('Failed to load transactions'); }
    finally { setTxLoading(false); }
  }, [txPage]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { if (tab === 'transactions') fetchTransactions(); }, [tab, fetchTransactions]);

  const handleAdd = async () => {
    if (!addForm.totalStock) { toast.error('Stock required'); return; }
    setSubmitting(true);
    try {
      await api.post('/linen/items', { ...addForm, totalStock: Number(addForm.totalStock) });
      toast.success('Linen type added');
      setShowAdd(false);
      setAddForm({ itemType: 'BEDSHEET', totalStock: '' });
      fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleTx = async () => {
    if (!txForm.itemId || !txForm.quantity) { toast.error('Select item & enter quantity'); return; }
    setSubmitting(true);
    try {
      await api.post('/linen/transactions', { ...txForm, quantity: Number(txForm.quantity) });
      toast.success('Transaction recorded');
      setShowTx(false);
      setTxForm({ itemId: '', transactionType: 'ISSUE', quantity: '', wardId: '', notes: '' });
      fetchItems();
      if (tab === 'transactions') fetchTransactions();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handlePrintLinenReport = (r: any) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Linen Exchange Record</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px;}h1{color:#0F766E;font-size:22px;font-weight:700;letter-spacing:1px;}h2{color:#0F766E;font-size:15px;font-weight:600;margin-top:4px;letter-spacing:0.5px;}hr{border:none;border-top:2px solid #0F766E;margin:14px 0 20px;}.box{border:1px solid #e0e0e0;border-radius:6px;padding:16px;margin-bottom:16px;background:#fafafa;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;}.field{margin-bottom:4px;}.label{font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;}.value{font-size:13px;color:#111;margin-top:2px;}.sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px;}.sig-box{border-top:1px solid #333;padding-top:6px;font-size:11px;color:#555;text-align:center;}@media print{body{padding:20px;}}</style>
</head><body>
<h1>AYPHEN HMS</h1><h2>LINEN EXCHANGE RECORD</h2><hr/>
<div class="box"><div class="grid">
  <div class="field"><div class="label">Record #</div><div class="value">${r.id?.slice(0, 8).toUpperCase() || '—'}</div></div>
  <div class="field"><div class="label">Date</div><div class="value">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div></div>
  <div class="field"><div class="label">Ward / Department</div><div class="value">${r.wardId || r.ward || '—'}</div></div>
  <div class="field"><div class="label">Item Type</div><div class="value">${(r.itemType || r.item?.itemType || '').replace(/_/g, ' ') || '—'}</div></div>
  <div class="field"><div class="label">Transaction Type</div><div class="value">${(r.transactionType || '').replace(/_/g, ' ') || '—'}</div></div>
  <div class="field"><div class="label">Quantity</div><div class="value">${r.quantity || '—'}</div></div>
  <div class="field" style="grid-column:1/-1;"><div class="label">Notes</div><div class="value">${r.notes || '—'}</div></div>
</div></div>
<div class="sig-grid">
  <div class="sig-box">Ward In-Charge</div>
  <div class="sig-box">Laundry Supervisor</div>
  <div class="sig-box">Date</div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const lowStockItems = items.filter(it => {
    const inStock = it.totalStock - (it.inCirculation || 0) - (it.inLaundry || 0) - (it.damaged || 0);
    return inStock < 5 && it.totalStock > 0;
  });

  const txTypeColor: Record<string, string> = {
    ISSUE: 'bg-blue-100 text-blue-700',
    COLLECT: 'bg-green-100 text-green-700',
    LAUNDRY_SEND: 'bg-amber-100 text-amber-700',
    LAUNDRY_RECEIVE: 'bg-teal-100 text-teal-700',
    DAMAGE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Linen & Laundry" subtitle="Hospital linen tracking and transactions"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Type</button>
            <button onClick={() => setShowTx(true)} className="btn-secondary flex items-center gap-2"><ArrowDownUp size={15} /> Transaction</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Stock" value={dashboard.totalStock ?? 0} icon={Shirt} color="#0F766E" />
        <KpiCard label="In Circulation" value={dashboard.inCirculation ?? 0} icon={Shirt} color="#3B82F6" />
        <KpiCard label="In Laundry" value={dashboard.inLaundry ?? 0} icon={Shirt} color="#F59E0B" />
        <KpiCard label="Damaged" value={dashboard.damaged ?? 0} icon={Shirt} color="#EF4444" />
      </div>

      {lowStockItems.length > 0 && (
        <div className="hms-card p-4 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">Low Stock Alert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(it => (
              <span key={it.id} className="text-xs px-2 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 font-medium">
                {(it.itemType || '').replace(/_/g, ' ')} — {it.totalStock} total
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['items', 'Linen Items', Shirt], ['transactions', 'Transaction History', History]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 hms-card p-12 text-center text-gray-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="col-span-3 hms-card">
              <EmptyState icon={<Shirt size={36} />} title="No linen items" description="Add a linen type to start tracking" />
            </div>
          ) : items.map(it => {
            const available = it.totalStock - (it.inCirculation || 0) - (it.inLaundry || 0) - (it.damaged || 0);
            const isLow = available < 5;
            return (
              <div key={it.id} className={`hms-card p-5 ${isLow ? 'border-amber-200' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{(it.itemType || '').replace(/_/g, ' ')}</h4>
                  <div className="flex items-center gap-1">
                    {isLow && <AlertTriangle size={14} className="text-amber-500" title="Low stock" />}
                    <button onClick={() => handlePrintLinenReport(it)} className="p-1 rounded hover:bg-purple-50 text-purple-400 hover:text-purple-600" title="Print linen record">
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500 text-xs">Total</span><p className="font-bold text-gray-800">{it.totalStock}</p></div>
                  <div className="bg-blue-50 rounded-lg p-2"><span className="text-blue-500 text-xs">In Use</span><p className="font-bold text-blue-700">{it.inCirculation ?? 0}</p></div>
                  <div className="bg-amber-50 rounded-lg p-2"><span className="text-amber-500 text-xs">Laundry</span><p className="font-bold text-amber-700">{it.inLaundry ?? 0}</p></div>
                  <div className="bg-red-50 rounded-lg p-2"><span className="text-red-500 text-xs">Damaged</span><p className="font-bold text-red-700">{it.damaged ?? 0}</p></div>
                </div>
                {available >= 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Available</span>
                      <span className={available < 5 ? 'text-amber-600 font-semibold' : 'text-teal-600 font-semibold'}>{available} pcs</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${available < 5 ? 'bg-amber-400' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(100, (available / it.totalStock) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="hms-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Transaction History</h3>
            <button onClick={fetchTransactions} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-teal-600 transition-colors" title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr>{['Date', 'Item Type', 'Transaction', 'Quantity', 'Ward', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {txLoading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
                  : transactions.length === 0
                    ? <tr><td colSpan={7}><EmptyState icon={<History size={36} />} title="No transactions" description="Record a linen transaction to see history" /></td></tr>
                    : transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50 border-t border-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{(tx.item?.itemType || tx.itemType || '').replace(/_/g, ' ') || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${txTypeColor[tx.transactionType] || 'bg-gray-100 text-gray-600'}`}>
                            {(tx.transactionType || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-800">{tx.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{tx.wardId || tx.ward || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{tx.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handlePrintLinenReport(tx)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                            <Printer size={11} /> Print
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <Pagination page={txPage} totalPages={Math.ceil(txTotal / TX_PAGE_SIZE)} onPageChange={setTxPage} totalItems={txTotal} pageSize={TX_PAGE_SIZE} />
        </div>
      )}

      {/* Add Linen Type Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Add Linen Type</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Item Type</label>
                <select className="hms-input w-full" value={addForm.itemType} onChange={e => setAddForm({ ...addForm, itemType: e.target.value })}>
                  {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Total Stock *</label>
                <input type="number" className="hms-input w-full" placeholder="Number of units" value={addForm.totalStock} onChange={e => setAddForm({ ...addForm, totalStock: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowAdd(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleAdd} disabled={submitting} className="btn-primary px-4 py-2 flex items-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Record Linen Transaction</h2>
              <button onClick={() => setShowTx(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Item *</label>
                <select className="hms-input w-full" value={txForm.itemId} onChange={e => setTxForm({ ...txForm, itemId: e.target.value })}>
                  <option value="">Select item</option>
                  {items.map(i => <option key={i.id} value={i.id}>{(i.itemType || '').replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Transaction Type</label>
                  <select className="hms-input w-full" value={txForm.transactionType} onChange={e => setTxForm({ ...txForm, transactionType: e.target.value })}>
                    {TX_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
                  <input type="number" className="hms-input w-full" min="1" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ward / Department</label>
                <input className="hms-input w-full" placeholder="e.g. ICU, Ward 3" value={txForm.wardId} onChange={e => setTxForm({ ...txForm, wardId: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <input className="hms-input w-full" placeholder="Optional notes" value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowTx(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleTx} disabled={submitting} className="btn-primary px-4 py-2 flex items-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
