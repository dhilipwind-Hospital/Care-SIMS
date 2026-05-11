import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Heart, Plus, X, Loader2, Users, Pencil, CheckCircle,
  Tag, FlaskConical, Search,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';

const BLANK_PKG = { name: '', description: '', targetGender: 'ALL', targetAgeGroup: 'ADULT', price: '', discountedPrice: '', tests: '', validityDays: '365' };
const BOOKING_STATUSES = ['BOOKED', 'CONFIRMED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

type Tab = 'packages' | 'bookings';

export default function HealthPackagesPage() {
  const [tab, setTab] = useState<Tab>('packages');
  const [packages, setPackages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState<any | null>(null);
  const [form, setForm] = useState<any>(BLANK_PKG);
  const [submitting, setSubmitting] = useState(false);

  const [showBook, setShowBook] = useState(false);
  const [bookForm, setBookForm] = useState({ packageId: '', patientId: '', scheduledDate: '' });

  const [viewPkg, setViewPkg] = useState<any | null>(null);

  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'packages') {
        const { data } = await api.get('/health-packages');
        setPackages(data.data || data || []);
      } else {
        const { data } = await api.get('/health-packages/bookings', {
          params: { page, limit: PAGE_SIZE, status: bookingStatus || undefined, q: bookingSearch || undefined },
        });
        setBookings(data.data || []);
        setTotal(data.meta?.total || 0);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [tab, page, bookingStatus, bookingSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditPkg(null); setForm(BLANK_PKG); setShowForm(true); };
  const openEdit = (pkg: any) => {
    setEditPkg(pkg);
    setForm({
      name: pkg.name || '',
      description: pkg.description || '',
      targetGender: pkg.targetGender || 'ALL',
      targetAgeGroup: pkg.targetAgeGroup || 'ADULT',
      price: pkg.price?.toString() || '',
      discountedPrice: pkg.discountedPrice?.toString() || '',
      tests: (pkg.tests || []).map((t: any) => t.labTestName).join(', '),
      validityDays: pkg.validityDays?.toString() || '365',
    });
    setShowForm(true);
  };

  const handleSavePkg = async () => {
    if (!form.name.trim() || !form.price) { toast.error('Name and price required'); return; }
    setSubmitting(true);
    try {
      const tests = form.tests ? form.tests.split(',').map((t: string) => ({ labTestName: t.trim(), category: 'General' })).filter((t: any) => t.labTestName) : [];
      const payload = {
        ...form,
        price: Number(form.price),
        discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined,
        validityDays: form.validityDays ? Number(form.validityDays) : undefined,
        tests,
      };
      if (editPkg) {
        await api.patch(`/health-packages/${editPkg.id}`, payload);
        toast.success('Package updated');
      } else {
        await api.post('/health-packages', payload);
        toast.success('Package created');
      }
      setShowForm(false);
      setEditPkg(null);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleBook = async () => {
    if (!bookForm.packageId || !bookForm.patientId) { toast.error('Select package and enter patient ID'); return; }
    setSubmitting(true);
    try {
      await api.post('/health-packages/bookings', bookForm);
      toast.success('Package booked successfully');
      setShowBook(false);
      setBookForm({ packageId: '', patientId: '', scheduledDate: '' });
      if (tab === 'bookings') fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/health-packages/bookings/${id}`, { status });
      toast.success(`Booking marked as ${status.replace(/_/g, ' ')}`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
  };

  const sf = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const discountPct = (pkg: any) => {
    if (!pkg.discountedPrice || !pkg.price) return null;
    return Math.round((1 - pkg.discountedPrice / pkg.price) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Health Check-up Packages" subtitle="Preventive health packages and bookings" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['packages', 'bookings'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'packages' && (
            <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Package</button>
          )}
          <button onClick={() => setShowBook(true)} className="btn-secondary flex items-center gap-2"><Users size={15} /> Book Patient</button>
        </div>
      </div>

      {tab === 'packages' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="hms-card p-5 h-40 animate-pulse bg-gray-50" />)}
            </div>
          ) : packages.length === 0 ? (
            <div className="hms-card">
              <EmptyState icon={<Heart size={36} />} title="No health packages" description="Create packages for preventive health check-ups" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map(pkg => {
                const disc = discountPct(pkg);
                return (
                  <div key={pkg.id} className="hms-card p-5 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 flex-1 pr-2">{pkg.name}</h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {disc && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">{disc}% OFF</span>}
                        <button onClick={() => openEdit(pkg)} className="p-1 rounded hover:bg-teal-50 text-gray-400 hover:text-teal-600"><Pencil size={13} /></button>
                      </div>
                    </div>
                    {pkg.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{pkg.description}</p>}
                    <div className="flex items-baseline gap-2 mb-3">
                      {pkg.discountedPrice
                        ? <><span className="text-xl font-bold text-teal-700">{formatCurrency(pkg.discountedPrice)}</span><span className="text-sm text-gray-400 line-through">{formatCurrency(pkg.price)}</span></>
                        : <span className="text-xl font-bold text-teal-700">{formatCurrency(pkg.price)}</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {pkg.targetGender && pkg.targetGender !== 'ALL' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{pkg.targetGender}</span>}
                      {pkg.targetAgeGroup && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{pkg.targetAgeGroup}</span>}
                      {pkg.validityDays && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{pkg.validityDays}d validity</span>}
                    </div>
                    {pkg.tests?.length > 0 && (
                      <div className="mt-auto pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1 mb-1"><FlaskConical size={11} className="text-teal-500" /><span className="text-xs font-semibold text-gray-500">{pkg.tests.length} tests included</span></div>
                        <p className="text-xs text-gray-400 truncate">{(pkg.tests as any[]).map((t: any) => t.labTestName).join(', ')}</p>
                      </div>
                    )}
                    <button onClick={() => setViewPkg(pkg)} className="mt-3 text-xs text-teal-600 hover:underline font-medium self-start">View details</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={bookingSearch} onChange={e => { setBookingSearch(e.target.value); setPage(1); }} placeholder="Search patient ID..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['', ...BOOKING_STATUSES].map(s => (
                <button key={s} onClick={() => { setBookingStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${bookingStatus === s ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
          <div className="hms-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr>{['Package', 'Patient', 'Price', 'Booked', 'Scheduled', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
                    : bookings.length === 0
                      ? <tr><td colSpan={7}><EmptyState icon={<Heart size={36} />} title="No bookings" description="Book a health package for a patient to see it here" /></td></tr>
                      : bookings.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50 border-t border-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{b.package?.name || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">{b.patientId?.slice(0, 12) || '—'}</td>
                            <td className="px-4 py-3 text-sm font-bold text-teal-700">{b.package?.price ? formatCurrency(b.package.discountedPrice || b.package.price) : '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(b.bookedDate || b.createdAt)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{b.scheduledDate ? formatDate(b.scheduledDate) : '—'}</td>
                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                            <td className="px-4 py-3">
                              <select
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                value={b.status}
                                onChange={e => handleUpdateBookingStatus(b.id, e.target.value)}
                              >
                                {BOOKING_STATUSES.map(s => <option key={s}>{s}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
          </div>
        </>
      )}

      {/* Create / Edit Package Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editPkg ? 'Edit Health Package' : 'Create Health Package'}</h2>
              <button onClick={() => { setShowForm(false); setEditPkg(null); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Package Name *</label>
                <input className="hms-input w-full" value={form.name} onChange={e => sf('name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea className="hms-input w-full" rows={2} value={form.description} onChange={e => sf('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Price (₹) *</label><input type="number" className="hms-input w-full" value={form.price} onChange={e => sf('price', e.target.value)} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Discounted Price (₹)</label><input type="number" className="hms-input w-full" value={form.discountedPrice} onChange={e => sf('discountedPrice', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                  <select className="hms-input w-full" value={form.targetGender} onChange={e => sf('targetGender', e.target.value)}>
                    {['ALL', 'MALE', 'FEMALE'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Age Group</label>
                  <select className="hms-input w-full" value={form.targetAgeGroup} onChange={e => sf('targetAgeGroup', e.target.value)}>
                    {['YOUTH', 'ADULT', 'SENIOR', 'PEDIATRIC'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Validity (days)</label><input type="number" className="hms-input w-full" value={form.validityDays} onChange={e => sf('validityDays', e.target.value)} /></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tests Included (comma-separated)</label>
                <textarea className="hms-input w-full" rows={2} placeholder="CBC, Lipid Profile, HbA1c, Thyroid..." value={form.tests} onChange={e => sf('tests', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => { setShowForm(false); setEditPkg(null); }} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSavePkg} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editPkg ? 'Save Changes' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Package Modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Tag size={16} className="text-teal-500" /> Book Health Package</h2>
              <button onClick={() => setShowBook(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Package *</label>
                <select className="hms-input w-full" value={bookForm.packageId} onChange={e => setBookForm({ ...bookForm, packageId: e.target.value })}>
                  <option value="">Select package</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.discountedPrice || p.price)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient *</label>
                <SearchableSelect value={bookForm.patientId} onChange={(id) => setBookForm({ ...bookForm, patientId: id })} placeholder="Search patient…" endpoint="/patients" searchParam="q" mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled Date</label>
                <input type="date" className="hms-input w-full" value={bookForm.scheduledDate} onChange={e => setBookForm({ ...bookForm, scheduledDate: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowBook(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleBook} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <CheckCircle size={14} /> Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Package Detail */}
      {viewPkg && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl sm:rounded-r-none w-full sm:w-[420px] max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{viewPkg.name}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEdit(viewPkg); setViewPkg(null); }} className="text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium flex items-center gap-1"><Pencil size={11} /> Edit</button>
                <button onClick={() => setViewPkg(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {viewPkg.description && <p className="text-sm text-gray-600">{viewPkg.description}</p>}
              <div className="flex items-baseline gap-2">
                {viewPkg.discountedPrice
                  ? <><span className="text-2xl font-bold text-teal-700">{formatCurrency(viewPkg.discountedPrice)}</span><span className="text-base text-gray-400 line-through">{formatCurrency(viewPkg.price)}</span></>
                  : <span className="text-2xl font-bold text-teal-700">{formatCurrency(viewPkg.price)}</span>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {viewPkg.targetGender && viewPkg.targetGender !== 'ALL' && <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">{viewPkg.targetGender}</span>}
                {viewPkg.targetAgeGroup && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">{viewPkg.targetAgeGroup}</span>}
                {viewPkg.validityDays && <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{viewPkg.validityDays} days validity</span>}
              </div>
              {viewPkg.tests?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><FlaskConical size={12} /> Tests Included ({viewPkg.tests.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {(viewPkg.tests as any[]).map((t: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-100 font-medium">{t.labTestName}</span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setBookForm({ ...bookForm, packageId: viewPkg.id }); setShowBook(true); setViewPkg(null); }}
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
                <Users size={15} /> Book for Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
