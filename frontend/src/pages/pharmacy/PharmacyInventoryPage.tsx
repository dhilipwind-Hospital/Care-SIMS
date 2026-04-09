import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Clock, XCircle, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';

export default function PharmacyInventoryPage() {
  const [drugs, setDrugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ drugName: '', genericName: '', category: 'ANALGESICS', dosageForm: 'TABLET', strength: '', manufacturer: '', reorderLevel: 50, storageCondition: 'ROOM_TEMP', isControlled: false });

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pharmacy/drugs', { params: { q: search || undefined, category: category || undefined, limit: 100 } });
      setDrugs(data.data || []);
    } catch (err) { toast.error('Failed to load inventory'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [search, category]);

  const lowStock = drugs.filter(d => d.stockStatus === 'LOW_STOCK' || d.stockStatus === 'CRITICAL_STOCK').length;
  const expiring = drugs.filter(d => d.stockStatus === 'EXPIRING_SOON').length;
  const outOfStock = drugs.filter(d => d.stockStatus === 'OUT_OF_STOCK').length;

  const addDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/pharmacy/drugs', form);
      setShowForm(false);
      setForm({ drugName: '', genericName: '', category: 'ANALGESICS', dosageForm: 'TABLET', strength: '', manufacturer: '', reorderLevel: 50, storageCondition: 'ROOM_TEMP', isControlled: false });
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add drug'); }
  };

  const stockColor: Record<string, string> = {
    ADEQUATE: 'bg-green-100 text-green-700',
    LOW_STOCK: 'bg-amber-100 text-amber-700',
    CRITICAL_STOCK: 'bg-orange-100 text-orange-700',
    OUT_OF_STOCK: 'bg-red-100 text-red-700',
    EXPIRING_SOON: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Pharmacy Inventory" subtitle="Track and manage pharmacy stock levels"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Add Item
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Items" value={drugs.length} icon={Package} color="#0F766E" />
        <KpiCard label="Low Stock" value={lowStock} icon={AlertTriangle} color="#F59E0B" />
        <KpiCard label="Expiring Soon" value={expiring} icon={Clock} color="#F97316" />
        <KpiCard label="Out of Stock" value={outOfStock} icon={XCircle} color="#EF4444" />
      </div>

      {showForm && (
        <div className="hms-card p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Add Drug to Formulary</h3>
          <form onSubmit={addDrug} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Drug Name (Brand)</label>
              <input required value={form.drugName} onChange={e => setForm(f => ({ ...f, drugName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Generic Name</label>
              <input value={form.genericName} onChange={e => setForm(f => ({ ...f, genericName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Strength</label>
              <input value={form.strength} onChange={e => setForm(f => ({ ...f, strength: e.target.value }))} placeholder="e.g. 500mg" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {['ANALGESICS','ANTIBIOTICS','ANTIHYPERTENSIVES','ANTIDIABETICS','CARDIOVASCULAR','CONTROLLED','IV_FLUIDS','VACCINES','OTC'].map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Dosage Form</label>
              <select value={form.dosageForm} onChange={e => setForm(f => ({ ...f, dosageForm: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {['TABLET','CAPSULE','SYRUP','INJECTION','DROPS','CREAM','POWDER'].map(d => <option key={d}>{d}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Reorder Level</label>
              <input type="number" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Manufacturer</label>
              <input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Storage</label>
              <select value={form.storageCondition} onChange={e => setForm(f => ({ ...f, storageCondition: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="ROOM_TEMP">Room Temperature</option>
                <option value="REFRIGERATED">Refrigerated</option>
                <option value="FROZEN">Frozen</option>
              </select></div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isControlled} onChange={e => setForm(f => ({ ...f, isControlled: e.target.checked }))} className="rounded" /> Controlled Substance</label>
            </div>
            <div className="col-span-3 flex gap-3 pt-2">
              <button type="submit" className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>Add Drug</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Drug Inventory</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drug..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All Categories</option>
              {['ANALGESICS','ANTIBIOTICS','ANTIHYPERTENSIVES','ANTIDIABETICS','CARDIOVASCULAR','CONTROLLED','IV_FLUIDS','VACCINES','OTC'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-gray-400 text-sm">Loading...</div> : (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Drug Name</th><th className="px-4 py-3">Generic</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Form</th><th className="px-4 py-3">Strength</th><th className="px-4 py-3">Stock Qty</th>
              <th className="px-4 py-3">Reorder Lvl</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {drugs.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">No drugs found</td></tr> :
                drugs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{d.drugName || d.brandName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.genericName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.dosageForm}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.strength || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{d.totalStock ?? d.quantityInStock ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.reorderLevel ?? 0}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${stockColor[d.stockStatus] || 'bg-gray-100 text-gray-600'}`}>{d.stockStatus || 'ADEQUATE'}</span></td>
                    <td className="px-4 py-3"><button className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100">Edit</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
