import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Clock, XCircle, Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';

const CATEGORIES = ['ANALGESICS','ANTIBIOTICS','ANTIHYPERTENSIVES','ANTIDIABETICS','CARDIOVASCULAR','CONTROLLED','IV_FLUIDS','VACCINES','OTC'];
const DOSAGE_FORMS = ['TABLET','CAPSULE','SYRUP','INJECTION','DROPS','CREAM','POWDER'];
const STORAGE = [{ value: 'ROOM_TEMP', label: 'Room Temperature' }, { value: 'REFRIGERATED', label: 'Refrigerated' }, { value: 'FROZEN', label: 'Frozen' }];

const BLANK = { drugName: '', genericName: '', category: 'ANALGESICS', dosageForm: 'TABLET', strength: '', manufacturer: '', reorderLevel: 50, storageCondition: 'ROOM_TEMP', isControlled: false };

const stockColor: Record<string, string> = {
  ADEQUATE: 'bg-green-100 text-green-700',
  LOW_STOCK: 'bg-amber-100 text-amber-700',
  CRITICAL_STOCK: 'bg-orange-100 text-orange-700',
  OUT_OF_STOCK: 'bg-red-100 text-red-700',
  EXPIRING_SOON: 'bg-yellow-100 text-yellow-700',
};

export default function PharmacyInventoryPage() {
  const [drugs, setDrugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [editDrug, setEditDrug] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(BLANK);
  const [saving, setSaving] = useState(false);

  const loadDrugs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pharmacy/drugs', { params: { q: search || undefined, category: category || undefined, limit: 100 } });
      setDrugs(data.data || []);
    } catch { toast.error('Failed to load inventory'); } finally { setLoading(false); }
  };

  useEffect(() => { loadDrugs(); }, [search, category]);

  const lowStock = drugs.filter(d => d.stockStatus === 'LOW_STOCK' || d.stockStatus === 'CRITICAL_STOCK').length;
  const expiring = drugs.filter(d => d.stockStatus === 'EXPIRING_SOON').length;
  const outOfStock = drugs.filter(d => d.stockStatus === 'OUT_OF_STOCK').length;

  const addDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/pharmacy/drugs', form);
      toast.success('Drug added');
      setShowForm(false);
      setForm(BLANK);
      loadDrugs();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add drug'); }
    finally { setSaving(false); }
  };

  const openEdit = (d: any) => {
    setEditDrug(d);
    setEditForm({
      drugName: d.drugName || d.brandName || '',
      genericName: d.genericName || '',
      category: d.category || 'ANALGESICS',
      dosageForm: d.dosageForm || 'TABLET',
      strength: d.strength || '',
      manufacturer: d.manufacturer || '',
      reorderLevel: d.reorderLevel ?? 50,
      storageCondition: d.storageCondition || 'ROOM_TEMP',
      isControlled: d.isControlled || false,
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDrug) return;
    setSaving(true);
    try {
      await api.put(`/pharmacy/drugs/${editDrug.id}`, editForm);
      toast.success('Drug updated');
      setEditDrug(null);
      loadDrugs();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to update drug'); }
    finally { setSaving(false); }
  };

  const DrugFormFields = ({ values, onChange }: { values: any; onChange: (k: string, v: any) => void }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Drug Name (Brand) *</label>
        <input required value={values.drugName} onChange={e => onChange('drugName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Generic Name</label>
        <input value={values.genericName} onChange={e => onChange('genericName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Strength</label>
        <input value={values.strength} onChange={e => onChange('strength', e.target.value)} placeholder="e.g. 500mg" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
        <select value={values.category} onChange={e => onChange('category', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Dosage Form</label>
        <select value={values.dosageForm} onChange={e => onChange('dosageForm', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          {DOSAGE_FORMS.map(d => <option key={d}>{d}</option>)}
        </select></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Reorder Level</label>
        <input type="number" value={values.reorderLevel} onChange={e => onChange('reorderLevel', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Manufacturer</label>
        <input value={values.manufacturer} onChange={e => onChange('manufacturer', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Storage</label>
        <select value={values.storageCondition} onChange={e => onChange('storageCondition', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          {STORAGE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select></div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={values.isControlled} onChange={e => onChange('isControlled', e.target.checked)} className="rounded" /> Controlled Substance</label>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Pharmacy Inventory" subtitle="Track and manage pharmacy stock levels"
        actions={
          <button onClick={() => { setShowForm(true); setEditDrug(null); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Add Drug to Formulary</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
          </div>
          <form onSubmit={addDrug} className="space-y-4">
            <DrugFormFields values={form} onChange={(k, v) => setForm((f: any) => ({ ...f, [k]: v }))} />
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>{saving ? 'Adding...' : 'Add Drug'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {editDrug && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Edit Drug — {editDrug.drugName || editDrug.brandName}</h3>
              <button onClick={() => setEditDrug(null)} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
            </div>
            <form onSubmit={saveEdit} className="p-6 space-y-4">
              <DrugFormFields values={editForm} onChange={(k, v) => setEditForm((f: any) => ({ ...f, [k]: v }))} />
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" onClick={() => setEditDrug(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
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
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
                  <tr key={d.id} className={`hover:bg-gray-50 ${d.stockStatus === 'OUT_OF_STOCK' ? 'bg-red-50/40' : d.stockStatus === 'CRITICAL_STOCK' ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{d.drugName || d.brandName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.genericName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.dosageForm}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.strength || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{d.totalStock ?? d.quantityInStock ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.reorderLevel ?? 0}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${stockColor[d.stockStatus] || 'bg-gray-100 text-gray-600'}`}>{d.stockStatus || 'ADEQUATE'}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(d)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
