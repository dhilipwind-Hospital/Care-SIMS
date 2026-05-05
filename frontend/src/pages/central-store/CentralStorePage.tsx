import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Package, Plus, X, Loader2, ArrowDownUp, AlertTriangle, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function CentralStorePage() {
  const [tab, setTab] = useState<'items' | 'transactions'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [form, setForm] = useState({ itemCode: '', name: '', category: 'GENERAL', unit: 'PCS', reorderLevel: '10' });
  const [txForm, setTxForm] = useState({ itemId: '', transactionType: 'RECEIPT', quantity: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([tab === 'items' ? api.get('/central-store/items', { params: { page, limit: 20 } }) : api.get('/central-store/transactions', { params: { page, limit: 20 } }), api.get('/central-store/dashboard')]); if (tab === 'items') { setItems(list.data.data || []); } else { setTransactions(list.data.data || []); } setTotal(list.data.meta?.total || 0); setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [tab, page]);

  const handleAddItem = async () => { if (!form.itemCode.trim() || !form.name.trim()) { toast.error('Code and name required'); return; } setSubmitting(true); try { await api.post('/central-store/items', { ...form, reorderLevel: Number(form.reorderLevel) }); toast.success('Item added'); setShowForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };
  const handleTx = async () => { if (!txForm.itemId || !txForm.quantity) { toast.error('Select item and quantity'); return; } setSubmitting(true); try { await api.post('/central-store/transactions', { ...txForm, quantity: Number(txForm.quantity) }); toast.success('Transaction recorded'); setShowTxForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };

  const handlePrintStockReport = () => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const belowReorder = items.filter(it => it.currentStock <= it.reorderLevel).length;
    const rows = items.map(it => {
      const isLow = it.currentStock <= it.reorderLevel;
      const isOut = it.currentStock === 0;
      const statusColor = isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a';
      const statusBg = isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7';
      const statusLabel = isOut ? 'OUT OF STOCK' : isLow ? 'LOW' : 'OK';
      return `<tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 12px;font-size:13px;">${it.name || '—'}</td>
        <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${it.category || '—'}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${isLow ? '#dc2626' : '#111827'};">${it.currentStock}</td>
        <td style="padding:8px 12px;font-size:12px;">${it.unit || '—'}</td>
        <td style="padding:8px 12px;font-size:13px;">${it.reorderLevel}</td>
        <td style="padding:8px 12px;"><span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:${statusBg};color:${statusColor};">${statusLabel}</span></td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Central Store Stock Report</title></head><body style="font-family:Arial,sans-serif;margin:0;padding:32px;color:#1f2937;">
<div style="max-width:740px;margin:0 auto;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="margin:0;font-size:26px;color:#0F766E;letter-spacing:2px;">AYPHEN HMS</h1>
    <h2 style="margin:8px 0 0;font-size:16px;color:#374151;font-weight:600;text-transform:uppercase;letter-spacing:1px;">CENTRAL STORE STOCK REPORT</h2>
    <hr style="border:none;border-top:2px solid #0F766E;margin:16px 0;" />
    <p style="margin:0;font-size:12px;color:#6b7280;">Date Printed: ${dateStr}</p>
  </div>
  <div style="margin-bottom:16px;display:flex;gap:24px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 20px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#16a34a;">${items.length}</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Total Items</div></div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 20px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#dc2626;">${belowReorder}</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Below Reorder Level</div></div>
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <thead><tr style="background:#f9fafb;">
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Item Name</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Category</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Current Stock</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Unit</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Reorder Level</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Status</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">No items found</td></tr>'}</tbody>
  </table>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:48px;">
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Store Manager</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Purchase Officer</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Date</div></div>
  </div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Central Store" subtitle="General store inventory management" actions={<button onClick={handlePrintStockReport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"><Printer size={15} /> Print Report</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Items" value={dashboard.totalItems || 0} icon={Package} color="#0F766E" />
        <KpiCard label="Low Stock" value={dashboard.lowStock || 0} icon={AlertTriangle} color="#F59E0B" />
        <KpiCard label="Out of Stock" value={dashboard.outOfStock || 0} icon={AlertTriangle} color="#EF4444" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">{[['items', 'Items'], ['transactions', 'Transactions']].map(([v, l]) => (<button key={v} onClick={() => { setTab(v as any); setPage(1); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{l}</button>))}</div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Item</button>
          <button onClick={() => setShowTxForm(true)} className="btn-secondary flex items-center gap-2"><ArrowDownUp size={15} /> Transaction</button>
        </div>
      </div>
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {tab === 'items' ? ['Code', 'Name', 'Category', 'Unit', 'Stock', 'Reorder Level', 'Status'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>) : ['Date', 'Item', 'Type', 'Quantity', 'Notes'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={tab === 'items' ? 7 : 5} />)}</>
        : (tab === 'items' ? items : transactions).length === 0 ? <tr><td colSpan={7}><EmptyState icon={<Package size={36} />} title={`No ${tab}`} /></td></tr>
        : tab === 'items' ? items.map(it => (
          <tr key={it.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm font-mono font-semibold text-teal-700">{it.itemCode}</td>
            <td className="px-4 py-3 text-sm font-medium">{it.name}</td>
            <td className="px-4 py-3 text-xs">{it.category}</td>
            <td className="px-4 py-3 text-xs">{it.unit}</td>
            <td className={`px-4 py-3 text-sm font-bold ${it.currentStock <= it.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>{it.currentStock}</td>
            <td className="px-4 py-3 text-sm text-gray-500">{it.reorderLevel}</td>
            <td className="px-4 py-3">{it.currentStock === 0 ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">OUT</span> : it.currentStock <= it.reorderLevel ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">LOW</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">OK</span>}</td>
          </tr>
        )) : transactions.map(tx => (
          <tr key={tx.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString('en-IN')}</td>
            <td className="px-4 py-3 text-sm font-medium">{tx.item?.name || '—'}</td>
            <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tx.transactionType === 'RECEIPT' ? 'bg-green-100 text-green-700' : tx.transactionType === 'ISSUE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{tx.transactionType}</span></td>
            <td className="px-4 py-3 text-sm font-medium">{tx.quantity}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{tx.notes || '—'}</td>
          </tr>
        ))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
      {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Add Store Item</h2><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div><div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Item Code *</label><input className="hms-input w-full" value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label><input className="hms-input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div></div>
        <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label><select className="hms-input w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['GENERAL', 'SURGICAL_CONSUMABLES', 'STATIONERY', 'CLEANING', 'LINEN'].map(c => <option key={c}>{c}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label><select className="hms-input w-full" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{['PCS', 'KG', 'LTR', 'BOX', 'ROLL', 'SET'].map(u => <option key={u}>{u}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Reorder Level</label><input type="number" className="hms-input w-full" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} /></div></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleAddItem} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Add</button></div></div></div>)}
      {showTxForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Record Transaction</h2><button onClick={() => setShowTxForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div><div className="p-6 space-y-4">
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Item *</label><select className="hms-input w-full" value={txForm.itemId} onChange={e => setTxForm({ ...txForm, itemId: e.target.value })}><option value="">Select item</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>)}</select></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Type</label><select className="hms-input w-full" value={txForm.transactionType} onChange={e => setTxForm({ ...txForm, transactionType: e.target.value })}>{['RECEIPT', 'ISSUE', 'RETURN', 'DAMAGE', 'ADJUSTMENT'].map(t => <option key={t}>{t}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label><input type="number" className="hms-input w-full" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} /></div></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><input className="hms-input w-full" value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} /></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowTxForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleTx} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Record</button></div></div></div>)}
    </div>
  );
}
