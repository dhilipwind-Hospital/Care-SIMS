import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, X, Loader2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function VendorPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', category: 'GENERAL', gstNumber: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/vendors', { params: { page, limit: 20 } }); setVendors(data.data || []); setTotal(data.meta?.total || 0); } catch { toast.error('Failed to load vendors'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Vendor name required'); return; }
    setSubmitting(true);
    try { await api.post('/vendors', form); toast.success('Vendor added'); setShowForm(false); fetchData(); setForm({ name: '', contactPerson: '', phone: '', email: '', category: 'GENERAL', gstNumber: '', address: '' }); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Vendor Management" subtitle="Track suppliers and contracts" actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Vendor</button>} />
      <div className="hms-card">
        <div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
          {['Name', 'Contact', 'Phone', 'Category', 'GST', 'Rating', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
        </tr></thead><tbody>
          {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
          : vendors.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<Building2 size={36} />} title="No vendors" description="Add vendors to manage suppliers" /></td></tr>
          : vendors.map(v => (
            <tr key={v.id} className="hover:bg-gray-50 border-t border-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{v.contactPerson || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{v.phone || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={v.category} /></td>
              <td className="px-4 py-3 text-xs font-mono text-gray-500">{v.gstNumber || '—'}</td>
              <td className="px-4 py-3">{v.rating ? <span className="text-amber-500">{'★'.repeat(v.rating)}{'☆'.repeat(5 - v.rating)}</span> : '—'}</td>
              <td className="px-4 py-3"><button className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button></td>
            </tr>))}
        </tbody></table></div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Add Vendor</h2><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Vendor Name *</label><input className="hms-input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Contact Person</label><input className="hms-input w-full" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label><input className="hms-input w-full" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label><input className="hms-input w-full" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label><select className="hms-input w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['GENERAL', 'PHARMA', 'EQUIPMENT', 'CONSUMABLES', 'SERVICES'].map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">GST Number</label><input className="hms-input w-full" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Add Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
