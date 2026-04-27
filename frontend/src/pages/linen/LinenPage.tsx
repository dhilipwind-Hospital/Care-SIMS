import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shirt, Plus, Loader2, ArrowDownUp } from 'lucide-react';
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
            <h4 className="font-semibold text-gray-900 mb-2">{it.itemType?.replace(/_/g, ' ')}</h4>
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
