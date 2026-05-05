import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shirt, Plus, Loader2, ArrowDownUp, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';

export default function LinenPage() {
  const [items, setItems] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showTx, setShowTx] = useState(false);
  const [txForm, setTxForm] = useState({ itemId: '', transactionType: 'ISSUE', quantity: '', wardId: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ itemType: 'BEDSHEET', totalStock: '' });

  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([api.get('/linen/items'), api.get('/linen/dashboard')]); setItems(list.data.data || list.data || []); setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => { if (!addForm.totalStock) { toast.error('Stock required'); return; } setSubmitting(true); try { await api.post('/linen/items', { ...addForm, totalStock: Number(addForm.totalStock) }); toast.success('Added'); setShowAdd(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };
  const handleTx = async () => { if (!txForm.itemId || !txForm.quantity) { toast.error('Select item & quantity'); return; } setSubmitting(true); try { await api.post('/linen/transactions', { ...txForm, quantity: Number(txForm.quantity) }); toast.success('Recorded'); setShowTx(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };

  const handlePrintLinenReport = (r: any) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Linen Exchange Record</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px;}h1{color:#0F766E;font-size:22px;font-weight:700;letter-spacing:1px;}h2{color:#0F766E;font-size:15px;font-weight:600;margin-top:4px;letter-spacing:0.5px;}hr{border:none;border-top:2px solid #0F766E;margin:14px 0 20px;}h3{font-size:13px;font-weight:700;color:#0F766E;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.4px;}.box{border:1px solid #e0e0e0;border-radius:6px;padding:16px;margin-bottom:16px;background:#fafafa;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;}.field{margin-bottom:4px;}.label{font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;}.value{font-size:13px;color:#111;margin-top:2px;}.full{grid-column:1/-1;}.sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px;}.sig-box{border-top:1px solid #333;padding-top:6px;font-size:11px;color:#555;text-align:center;}@media print{body{padding:20px;}}</style></head><body>
    <h1>AYPHEN HMS</h1><h2>LINEN EXCHANGE RECORD</h2><hr/>
    <div class="box"><div class="grid">
      <div class="field"><div class="label">Record #</div><div class="value">${r.id || '—'}</div></div>
      <div class="field"><div class="label">Date</div><div class="value">${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</div></div>
      <div class="field"><div class="label">Ward / Department</div><div class="value">${r.wardId || r.ward || r.department || '—'}</div></div>
      <div class="field"><div class="label">Category</div><div class="value">${r.category || r.itemType?.replace(/_/g, ' ') || '—'}</div></div>
      <div class="field"><div class="label">Item Name</div><div class="value">${r.itemType?.replace(/_/g, ' ') || r.name || '—'}</div></div>
      <div class="field"><div class="label">Quantity Issued</div><div class="value">${r.quantityIssued ?? r.inCirculation ?? '—'}</div></div>
      <div class="field"><div class="label">Quantity Returned</div><div class="value">${r.quantityReturned ?? '—'}</div></div>
      <div class="field"><div class="label">Condition</div><div class="value">${r.condition || '—'}</div></div>
    </div></div>
    <div class="box"><div class="grid">
      <div class="field"><div class="label">Status</div><div class="value">${r.status || 'Active'}</div></div>
      <div class="field"><div class="label">Staff Name</div><div class="value">${r.staffName || r.assignedTo || '—'}</div></div>
      <div class="field full"><div class="label">Notes</div><div class="value">${r.notes || '—'}</div></div>
    </div></div>
    <div class="sig-grid">
      <div class="sig-box">Ward In-Charge</div>
      <div class="sig-box">Laundry Supervisor</div>
      <div class="sig-box">Date</div>
    </div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Linen & Laundry" subtitle="Hospital linen tracking" actions={<div className="flex gap-2"><button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Type</button><button onClick={() => setShowTx(true)} className="btn-secondary flex items-center gap-2"><ArrowDownUp size={15} /> Transaction</button></div>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Stock" value={dashboard.totalStock || 0} icon={Shirt} color="#0F766E" />
        <KpiCard label="In Circulation" value={dashboard.inCirculation || 0} icon={Shirt} color="#3B82F6" />
        <KpiCard label="In Laundry" value={dashboard.inLaundry || 0} icon={Shirt} color="#F59E0B" />
        <KpiCard label="Damaged" value={dashboard.damaged || 0} icon={Shirt} color="#EF4444" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 hms-card p-12 text-center text-gray-400">Loading…</div> : items.length === 0 ? <div className="col-span-3 hms-card"><EmptyState icon={<Shirt size={36} />} title="No linen items" /></div>
        : items.map(it => (
          <div key={it.id} className="hms-card p-5">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{it.itemType?.replace(/_/g, ' ')}</h4>
              <button onClick={() => handlePrintLinenReport(it)} className="p-1 rounded hover:bg-purple-50 text-purple-400 hover:text-purple-600" title="Print linen record"><Printer size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Total:</span> <span className="font-bold">{it.totalStock}</span></div>
              <div><span className="text-gray-500">In Use:</span> <span className="font-bold text-blue-600">{it.inCirculation}</span></div>
              <div><span className="text-gray-500">Laundry:</span> <span className="font-bold text-amber-600">{it.inLaundry}</span></div>
              <div><span className="text-gray-500">Damaged:</span> <span className="font-bold text-red-600">{it.damaged}</span></div>
            </div>
          </div>
        ))}
      </div>
      {showAdd && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"><h2 className="font-bold text-gray-900 mb-4">Add Linen Type</h2><div className="space-y-3"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Type</label><select className="hms-input w-full" value={addForm.itemType} onChange={e => setAddForm({ ...addForm, itemType: e.target.value })}>{['BEDSHEET', 'PILLOWCOVER', 'TOWEL', 'GOWN', 'CURTAIN', 'BLANKET', 'DRAW_SHEET'].map(t => <option key={t}>{t}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Total Stock *</label><input type="number" className="hms-input w-full" value={addForm.totalStock} onChange={e => setAddForm({ ...addForm, totalStock: e.target.value })} /></div></div><div className="flex justify-end gap-3 mt-4"><button onClick={() => setShowAdd(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleAdd} disabled={submitting} className="btn-primary px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin mr-2" />}Add</button></div></div></div>)}
      {showTx && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"><h2 className="font-bold text-gray-900 mb-4">Linen Transaction</h2><div className="space-y-3"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Item *</label><select className="hms-input w-full" value={txForm.itemId} onChange={e => setTxForm({ ...txForm, itemId: e.target.value })}><option value="">Select</option>{items.map(i => <option key={i.id} value={i.id}>{i.itemType?.replace(/_/g, ' ')}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Type</label><select className="hms-input w-full" value={txForm.transactionType} onChange={e => setTxForm({ ...txForm, transactionType: e.target.value })}>{['ISSUE', 'COLLECT', 'LAUNDRY_SEND', 'LAUNDRY_RECEIVE', 'DAMAGE'].map(t => <option key={t}>{t}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Qty *</label><input type="number" className="hms-input w-full" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} /></div></div></div><div className="flex justify-end gap-3 mt-4"><button onClick={() => setShowTx(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleTx} disabled={submitting} className="btn-primary px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin mr-2" />}Record</button></div></div></div>)}
    </div>
  );
}
