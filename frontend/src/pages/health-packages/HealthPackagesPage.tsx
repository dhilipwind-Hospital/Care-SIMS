import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Heart, Plus, X, Loader2, Users } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';

export default function HealthPackagesPage() {
  const [tab, setTab] = useState<'packages' | 'bookings'>('packages');
  const [packages, setPackages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', targetGender: 'ALL', targetAgeGroup: 'ADULT', price: '', discountedPrice: '', tests: '' });
  const [showBook, setShowBook] = useState(false);
  const [bookForm, setBookForm] = useState({ packageId: '', patientId: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => { setLoading(true); try { if (tab === 'packages') { const { data } = await api.get('/health-packages'); setPackages(data.data || data || []); } else { const { data } = await api.get('/health-packages/bookings', { params: { page, limit: 20 } }); setBookings(data.data || []); setTotal(data.meta?.total || 0); } } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [tab, page]);

  const handleCreate = async () => { if (!form.name.trim() || !form.price) { toast.error('Name and price required'); return; } setSubmitting(true); try { const tests = form.tests ? form.tests.split(',').map(t => ({ labTestName: t.trim(), category: 'General' })) : []; await api.post('/health-packages', { ...form, price: Number(form.price), discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined, tests }); toast.success('Package created'); setShowForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };
  const handleBook = async () => { if (!bookForm.packageId || !bookForm.patientId) { toast.error('Select package and patient'); return; } setSubmitting(true); try { await api.post('/health-packages/bookings', bookForm); toast.success('Booked'); setShowBook(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Health Check-up Packages" subtitle="Preventive health packages and bookings" />
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">{[['packages', 'Packages'], ['bookings', 'Bookings']].map(([v, l]) => (<button key={v} onClick={() => { setTab(v as any); setPage(1); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{l}</button>))}</div>
        <div className="flex gap-2">
          {tab === 'packages' && <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Package</button>}
          <button onClick={() => setShowBook(true)} className="btn-secondary flex items-center gap-2"><Users size={15} /> Book Patient</button>
        </div>
      </div>
      {tab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <div className="col-span-3 hms-card p-12 text-center text-gray-400">Loading…</div> : packages.length === 0 ? <div className="col-span-3 hms-card"><EmptyState icon={<Heart size={36} />} title="No packages" /></div>
          : packages.map(pkg => (
            <div key={pkg.id} className="hms-card p-5">
              <h4 className="font-semibold text-gray-900 mb-1">{pkg.name}</h4>
              {pkg.description && <p className="text-xs text-gray-500 mb-3">{pkg.description}</p>}
              <div className="flex items-baseline gap-2 mb-3">
                {pkg.discountedPrice ? (<><span className="text-xl font-bold text-teal-700">{formatCurrency(pkg.discountedPrice)}</span><span className="text-sm text-gray-400 line-through">{formatCurrency(pkg.price)}</span></>) : <span className="text-xl font-bold text-teal-700">{formatCurrency(pkg.price)}</span>}
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {pkg.targetGender && pkg.targetGender !== 'ALL' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{pkg.targetGender}</span>}
                {pkg.targetAgeGroup && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{pkg.targetAgeGroup}</span>}
              </div>
              {pkg.tests?.length > 0 && <div className="text-xs text-gray-500"><strong>Tests:</strong> {(pkg.tests as any[]).map((t: any) => t.labTestName).join(', ')}</div>}
            </div>
          ))}
        </div>
      )}
      {tab === 'bookings' && (
        <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
          {['Package', 'Price', 'Booked', 'Status'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
        </tr></thead><tbody>
          {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={4} />)}</>
          : bookings.length === 0 ? <tr><td colSpan={4}><EmptyState icon={<Heart size={36} />} title="No bookings" /></td></tr>
          : bookings.map(b => (
            <tr key={b.id} className="hover:bg-gray-50 border-t border-gray-50">
              <td className="px-4 py-3 text-sm font-medium">{b.package?.name || '—'}</td>
              <td className="px-4 py-3 text-sm text-teal-700 font-bold">{b.package?.price ? formatCurrency(b.package.price) : '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(b.bookedDate)}</td>
              <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
            </tr>))}
        </tbody></table></div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
      )}
      {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Create Health Package</h2><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div><div className="p-6 space-y-4">
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Package Name *</label><input className="hms-input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Description</label><textarea className="hms-input w-full" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Price *</label><input type="number" className="hms-input w-full" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Discounted Price</label><input type="number" className="hms-input w-full" value={form.discountedPrice} onChange={e => setForm({ ...form, discountedPrice: e.target.value })} /></div></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label><select className="hms-input w-full" value={form.targetGender} onChange={e => setForm({ ...form, targetGender: e.target.value })}>{['ALL', 'MALE', 'FEMALE'].map(g => <option key={g}>{g}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Age Group</label><select className="hms-input w-full" value={form.targetAgeGroup} onChange={e => setForm({ ...form, targetAgeGroup: e.target.value })}>{['YOUTH', 'ADULT', 'SENIOR'].map(a => <option key={a}>{a}</option>)}</select></div></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tests (comma-separated)</label><textarea className="hms-input w-full" rows={2} placeholder="CBC, Lipid Profile, HbA1c, Thyroid..." value={form.tests} onChange={e => setForm({ ...form, tests: e.target.value })} /></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleCreate} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Create</button></div></div></div>)}
      {showBook && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"><h2 className="font-bold text-gray-900 mb-4">Book Health Package</h2><div className="space-y-3"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Package *</label><select className="hms-input w-full" value={bookForm.packageId} onChange={e => setBookForm({ ...bookForm, packageId: e.target.value })}><option value="">Select</option>{packages.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.discountedPrice || p.price)}</option>)}</select></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID *</label><input className="hms-input w-full" placeholder="Patient UUID" value={bookForm.patientId} onChange={e => setBookForm({ ...bookForm, patientId: e.target.value })} /></div></div><div className="flex justify-end gap-3 mt-4"><button onClick={() => setShowBook(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleBook} disabled={submitting} className="btn-primary px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin mr-2" />}Book</button></div></div></div>)}
    </div>
  );
}
