import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Package, Plus, X, Loader2, ArrowDownUp, AlertTriangle, IndianRupee,
  Printer, Pencil, Search, RefreshCw,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const CATEGORIES = ['GENERAL', 'SURGICAL_CONSUMABLES', 'STATIONERY', 'CLEANING', 'LINEN'];
const UNITS = ['PCS', 'KG', 'LTR', 'BOX', 'ROLL', 'SET', 'PAIR', 'GM', 'ML'];
const TX_TYPES = ['RECEIPT', 'ISSUE', 'RETURN', 'DAMAGE', 'ADJUSTMENT'];
const BLANK_FORM = { itemCode: '', name: '', category: 'GENERAL', unit: 'PCS', reorderLevel: '10', unitPrice: '' };

type Tab = 'items' | 'transactions';

export default function CentralStorePage() {
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState<any>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ itemId: '', transactionType: 'RECEIPT', quantity: '', unitPrice: '', notes: '', issuedTo: '' });

  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, dashRes] = await Promise.all([
        tab === 'items'
          ? api.get('/central-store/items', { params: { page, limit: PAGE_SIZE, q: search || undefined, category: catFilter || undefined, status: statusFilter || undefined } })
          : api.get('/central-store/transactions', { params: { page, limit: PAGE_SIZE } }),
        api.get('/central-store/dashboard'),
      ]);
      if (tab === 'items') setItems(listRes.data.data || []);
      else setTransactions(listRes.data.data || []);
      setTotal(listRes.data.meta?.total || 0);
      setDashboard(dashRes.data.data || dashRes.data || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [tab, page, search, catFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditItem(null); setForm(BLANK_FORM); setShowForm(true); };
  const openEdit = (it: any) => {
    setEditItem(it);
    setForm({ itemCode: it.itemCode || '', name: it.name || '', category: it.category || 'GENERAL', unit: it.unit || 'PCS', reorderLevel: it.reorderLevel?.toString() || '10', unitPrice: it.unitPrice?.toString() || '' });
    setShowForm(true);
  };

  const handleSaveItem = async () => {
    if (!form.itemCode.trim() || !form.name.trim()) { toast.error('Code and name required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        reorderLevel: Number(form.reorderLevel),
        unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : undefined,
      };
      if (editItem) {
        await api.patch(`/central-store/items/${editItem.id}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/central-store/items', payload);
        toast.success('Item added');
      }
      setShowForm(false);
      setEditItem(null);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleTx = async () => {
    if (!txForm.itemId || !txForm.quantity) { toast.error('Select item and quantity'); return; }
    setSubmitting(true);
    try {
      await api.post('/central-store/transactions', {
        ...txForm,
        quantity: Number(txForm.quantity),
        unitPrice: txForm.unitPrice !== '' ? Number(txForm.unitPrice) : undefined,
      });
      toast.success('Transaction recorded');
      setShowTxForm(false);
      setTxForm({ itemId: '', transactionType: 'RECEIPT', quantity: '', unitPrice: '', notes: '', issuedTo: '' });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handlePrintStockReport = () => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const displayed = statusFilter === 'LOW' ? items.filter(it => it.currentStock > 0 && it.currentStock <= it.reorderLevel)
      : statusFilter === 'OUT' ? items.filter(it => it.currentStock === 0)
      : items;
    const belowReorder = displayed.filter(it => it.currentStock <= it.reorderLevel).length;
    const rows = displayed.map(it => {
      const isOut = it.currentStock === 0;
      const isLow = !isOut && it.currentStock <= it.reorderLevel;
      const sc = isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a';
      const sb = isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7';
      const sl = isOut ? 'OUT' : isLow ? 'LOW' : 'OK';
      return `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 12px;font-size:13px;">${it.name}</td><td style="padding:8px 12px;font-size:12px;color:#6b7280;">${it.category}</td><td style="padding:8px 12px;font-size:13px;font-weight:700;color:${isLow || isOut ? '#dc2626' : '#111827'};">${it.currentStock}</td><td style="padding:8px 12px;font-size:12px;">${it.unit}</td><td style="padding:8px 12px;font-size:13px;">${it.reorderLevel}</td><td style="padding:8px 12px;"><span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:${sb};color:${sc};">${sl}</span></td></tr>`;
    }).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Central Store Stock Report</title></head><body style="font-family:Arial,sans-serif;margin:0;padding:32px;color:#1f2937;">
<div style="max-width:740px;margin:0 auto;">
  <div style="text-align:center;margin-bottom:24px;"><h1 style="margin:0;font-size:26px;color:#0F766E;letter-spacing:2px;">AYPHEN HMS</h1><h2 style="margin:8px 0 0;font-size:16px;color:#374151;font-weight:600;text-transform:uppercase;letter-spacing:1px;">CENTRAL STORE STOCK REPORT</h2><hr style="border:none;border-top:2px solid #0F766E;margin:16px 0;"/><p style="margin:0;font-size:12px;color:#6b7280;">Date: ${dateStr}</p></div>
  <div style="margin-bottom:16px;display:flex;gap:16px;"><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 20px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#16a34a;">${displayed.length}</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Total Items</div></div><div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 20px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#dc2626;">${belowReorder}</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Below Reorder</div></div></div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><thead><tr style="background:#f9fafb;">${['Item Name','Category','Current Stock','Unit','Reorder Level','Status'].map(h => `<th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">${h}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">No items</td></tr>'}</tbody></table>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:48px;"><div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Store Manager</div></div><div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Purchase Officer</div></div><div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Date</div></div></div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  // Status filter is now applied server-side (see fetchData) so the table
  // and pagination stay in sync. Local `filteredItems` was double-filtering
  // page 1's 20 rows, hiding the rest. Just alias for the existing JSX.
  const filteredItems = items;

  const txTypeColor: Record<string, string> = {
    RECEIPT: 'bg-green-100 text-green-700',
    ISSUE: 'bg-blue-100 text-blue-700',
    RETURN: 'bg-teal-100 text-teal-700',
    DAMAGE: 'bg-red-100 text-red-700',
    ADJUSTMENT: 'bg-purple-100 text-purple-700',
  };

  const sf = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Central Store" subtitle="General store inventory management"
        actions={
          <button onClick={handlePrintStockReport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer size={15} /> Print Report
          </button>
        }
      />

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Items" value={dashboard.totalItems ?? 0} icon={Package} color="#0F766E" />
          <KpiCard label="Low Stock" value={dashboard.lowStock ?? 0} icon={AlertTriangle} color="#F59E0B" />
          <KpiCard label="Out of Stock" value={dashboard.outOfStock ?? 0} icon={AlertTriangle} color="#EF4444" />
          <KpiCard label="Stock Value" value={`₹${Number(dashboard.totalValue ?? 0).toLocaleString('en-IN')}`} icon={IndianRupee} color="#0EA5E9" />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['items', 'transactions'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Item</button>
          <button onClick={() => setShowTxForm(true)} className="btn-secondary flex items-center gap-2"><ArrowDownUp size={15} /> Transaction</button>
        </div>
      </div>

      {tab === 'items' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search items..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['', ...CATEGORIES].map(c => (
              <button key={c} onClick={() => { setCatFilter(c); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${catFilter === c ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{c || 'All'}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {[['', 'All'], ['LOW', 'Low Stock'], ['OUT', 'Out of Stock']].map(([v, l]) => (
              <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === v ? (v === 'OUT' ? 'bg-red-600 text-white border-red-600' : v === 'LOW' ? 'bg-amber-500 text-white border-amber-500' : 'bg-teal-600 text-white border-teal-600') : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{l}</button>
            ))}
          </div>
        </div>
      )}

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">{tab === 'items' ? `${filteredItems.length} items` : `${total} transactions`}</span>
          <button onClick={fetchData} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-teal-600"><RefreshCw size={13} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              {tab === 'items'
                ? <tr>{['Code', 'Name', 'Category', 'Unit', 'Stock', 'Reorder', 'Status', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}</tr>
                : <tr>{['Date', 'Item', 'Type', 'Qty', 'Issued To', 'Notes'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}</tr>}
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={tab === 'items' ? 8 : 6} />)
                : tab === 'items'
                  ? filteredItems.length === 0
                    ? <tr><td colSpan={8}><EmptyState icon={<Package size={36} />} title="No items" description="Add items to start tracking central store inventory" /></td></tr>
                    : filteredItems.map(it => {
                        const isOut = it.currentStock === 0;
                        const isLow = !isOut && it.currentStock <= it.reorderLevel;
                        return (
                          <tr key={it.id} className={`hover:bg-gray-50 border-t border-gray-50 ${isOut ? 'bg-red-50/30' : isLow ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-4 py-3 text-sm font-mono font-semibold text-teal-700">{it.itemCode}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{it.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{it.category}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{it.unit}</td>
                            <td className={`px-4 py-3 text-sm font-bold ${isOut || isLow ? 'text-red-600' : 'text-gray-900'}`}>{it.currentStock}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{it.reorderLevel}</td>
                            <td className="px-4 py-3">
                              {isOut
                                ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">OUT</span>
                                : isLow
                                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">LOW</span>
                                  : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">OK</span>}
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => openEdit(it)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium flex items-center gap-1">
                                <Pencil size={11} /> Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  : transactions.length === 0
                    ? <tr><td colSpan={6}><EmptyState icon={<ArrowDownUp size={36} />} title="No transactions" /></td></tr>
                    : transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50 border-t border-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{tx.item?.name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${txTypeColor[tx.transactionType] || 'bg-gray-100 text-gray-600'}`}>{tx.transactionType}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-800">{tx.quantity}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{tx.issuedTo || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{tx.notes || '—'}</td>
                        </tr>
                      ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
      </div>

      {/* Add / Edit Item Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editItem ? 'Edit Store Item' : 'Add Store Item'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Item Code *</label><input className="hms-input w-full" value={form.itemCode} onChange={e => sf('itemCode', e.target.value)} disabled={!!editItem} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label><input className="hms-input w-full" value={form.name} onChange={e => sf('name', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select className="hms-input w-full" value={form.category} onChange={e => sf('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                  <select className="hms-input w-full" value={form.unit} onChange={e => sf('unit', e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Reorder Level</label><input type="number" className="hms-input w-full" value={form.reorderLevel} onChange={e => sf('reorderLevel', e.target.value)} /></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price (₹)</label>
                <input type="number" step="0.01" className="hms-input w-full" placeholder="Optional — used for stock valuation" value={form.unitPrice} onChange={e => sf('unitPrice', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSaveItem} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTxForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Record Transaction</h2>
              <button onClick={() => setShowTxForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Item *</label>
                <select className="hms-input w-full" value={txForm.itemId} onChange={e => setTxForm({ ...txForm, itemId: e.target.value })}>
                  <option value="">Select item</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select className="hms-input w-full" value={txForm.transactionType} onChange={e => setTxForm({ ...txForm, transactionType: e.target.value })}>
                    {TX_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
                  <input type="number" className="hms-input w-full" min="1" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} />
                </div>
              </div>
              {txForm.transactionType === 'ISSUE' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Issued To</label>
                  <input className="hms-input w-full" placeholder="Ward / Department / Staff" value={txForm.issuedTo} onChange={e => setTxForm({ ...txForm, issuedTo: e.target.value })} />
                </div>
              )}
              {txForm.transactionType === 'RECEIPT' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price (₹)</label>
                  <input type="number" step="0.01" className="hms-input w-full" placeholder="Optional — updates catalog price" value={txForm.unitPrice} onChange={e => setTxForm({ ...txForm, unitPrice: e.target.value })} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <input className="hms-input w-full" placeholder="Optional notes" value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowTxForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleTx} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
