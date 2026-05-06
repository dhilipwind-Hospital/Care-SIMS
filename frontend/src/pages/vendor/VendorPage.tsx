import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Building2, Plus, X, Loader2, Printer, Pencil, Eye, Star,
  Phone, Mail, MapPin, CreditCard, FileText, ToggleLeft, ToggleRight, Search,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

const CATEGORIES = ['GENERAL', 'PHARMA', 'EQUIPMENT', 'CONSUMABLES', 'SERVICES'];
const BLANK_FORM = { name: '', contactPerson: '', phone: '', email: '', category: 'GENERAL', gstNumber: '', panNumber: '', address: '', bankDetails: '', notes: '', rating: 0 };

export default function VendorPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<any | null>(null);
  const [form, setForm] = useState<any>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [viewVendor, setViewVendor] = useState<any | null>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState({ title: '', startDate: '', endDate: '', value: '', terms: '' });
  const [submittingContract, setSubmittingContract] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vendors', { params: { page, limit: 20, q: search || undefined, category: catFilter || undefined } });
      setVendors(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  }, [page, search, catFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditVendor(null); setForm(BLANK_FORM); setShowForm(true); };
  const openEdit = (v: any) => {
    setEditVendor(v);
    setForm({ name: v.name || '', contactPerson: v.contactPerson || '', phone: v.phone || '', email: v.email || '', category: v.category || 'GENERAL', gstNumber: v.gstNumber || '', panNumber: v.panNumber || '', address: v.address || '', bankDetails: v.bankDetails || '', notes: v.notes || '', rating: v.rating || 0 });
    setShowForm(true);
  };

  const openView = async (v: any) => {
    setViewVendor(v);
    setLoadingContracts(true);
    try {
      const { data } = await api.get(`/vendors/${v.id}/contracts`);
      setContracts(Array.isArray(data) ? data : data.data || []);
    } catch { setContracts([]); }
    finally { setLoadingContracts(false); }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Vendor name required'); return; }
    setSubmitting(true);
    try {
      if (editVendor) {
        await api.patch(`/vendors/${editVendor.id}`, form);
        toast.success('Vendor updated');
      } else {
        await api.post('/vendors', form);
        toast.success('Vendor added');
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleToggleActive = async (v: any) => {
    try {
      await api.patch(`/vendors/${v.id}`, { isActive: !v.isActive });
      toast.success(v.isActive ? 'Vendor deactivated' : 'Vendor activated');
      fetchData();
      if (viewVendor?.id === v.id) setViewVendor({ ...viewVendor, isActive: !v.isActive });
    } catch { toast.error('Failed'); }
  };

  const handleAddContract = async () => {
    if (!contractForm.title.trim()) { toast.error('Contract title required'); return; }
    setSubmittingContract(true);
    try {
      await api.post(`/vendors/${viewVendor.id}/contracts`, contractForm);
      toast.success('Contract added');
      setShowContractForm(false);
      setContractForm({ title: '', startDate: '', endDate: '', value: '', terms: '' });
      const { data } = await api.get(`/vendors/${viewVendor.id}/contracts`);
      setContracts(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmittingContract(false); }
  };

  const handlePrint = (v: any) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const code = (v.id || '').toString().slice(0, 8).toUpperCase();
    const sc = v.isActive !== false ? '#16a34a' : '#dc2626';
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Vendor Profile - ${v.name}</title></head><body style="font-family:Arial,sans-serif;margin:0;padding:32px;color:#1f2937;">
<div style="max-width:740px;margin:0 auto;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="margin:0;font-size:26px;color:#0F766E;letter-spacing:2px;">AYPHEN HMS</h1>
    <h2 style="margin:8px 0 0;font-size:16px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">VENDOR PROFILE</h2>
    <hr style="border:none;border-top:2px solid #0F766E;margin:16px 0;" />
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin-bottom:20px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Vendor Name</span><p style="margin:4px 0 0;font-size:14px;font-weight:700;">${v.name || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Vendor Code</span><p style="margin:4px 0 0;font-size:14px;font-family:monospace;color:#0F766E;">${code}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Contact Person</span><p style="margin:4px 0 0;font-size:14px;">${v.contactPerson || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Phone</span><p style="margin:4px 0 0;font-size:14px;">${v.phone || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Email</span><p style="margin:4px 0 0;font-size:14px;">${v.email || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Address</span><p style="margin:4px 0 0;font-size:14px;">${v.address || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Category</span><p style="margin:4px 0 0;font-size:14px;">${v.category || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">GST Number</span><p style="margin:4px 0 0;font-size:14px;font-family:monospace;">${v.gstNumber || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">PAN Number</span><p style="margin:4px 0 0;font-size:14px;font-family:monospace;">${v.panNumber || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Bank Details</span><p style="margin:4px 0 0;font-size:14px;">${v.bankDetails || '—'}</p></div>
    </div>
    <div style="margin-top:16px;"><span style="display:inline-block;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:700;background:${sc}22;color:${sc};border:1px solid ${sc}66;">${v.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span></div>
    ${v.notes ? `<div style="margin-top:16px;background:#f9fafb;padding:10px;border-radius:6px;border:1px solid #e5e7eb;font-size:13px;">${v.notes}</div>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;">
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Purchase Officer</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Finance</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Date</div></div>
  </div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const sf = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Vendor Management" subtitle="Track suppliers and contracts"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Vendor</button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search vendors..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => { setCatFilter(c); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${catFilter === c ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{c || 'All'}</button>
          ))}
        </div>
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>{['Name', 'Contact', 'Phone', 'Category', 'GST', 'Rating', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)
                : vendors.length === 0
                  ? <tr><td colSpan={8}><EmptyState icon={<Building2 size={36} />} title="No vendors" description="Add vendors to manage suppliers and contracts" /></td></tr>
                  : vendors.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.contactPerson || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.phone || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.category} /></td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{v.gstNumber || '—'}</td>
                      <td className="px-4 py-3">
                        {v.rating
                          ? <span className="text-amber-400 text-sm">{'★'.repeat(v.rating)}{'☆'.repeat(5 - v.rating)}</span>
                          : <span className="text-gray-300 text-sm">☆☆☆☆☆</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${v.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {v.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openView(v)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium flex items-center gap-1"><Eye size={11} /> View</button>
                          <button onClick={() => openEdit(v)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium flex items-center gap-1"><Pencil size={11} /> Edit</button>
                          <button onClick={() => handlePrint(v)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button>
                          <button onClick={() => handleToggleActive(v)} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 font-medium flex items-center gap-1">
                            {v.isActive !== false ? <ToggleLeft size={11} /> : <ToggleRight size={11} />}
                            {v.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Vendor Name *</label>
                <input className="hms-input w-full" value={form.name} onChange={e => sf('name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Contact Person</label><input className="hms-input w-full" value={form.contactPerson} onChange={e => sf('contactPerson', e.target.value)} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label><input className="hms-input w-full" value={form.phone} onChange={e => sf('phone', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label><input type="email" className="hms-input w-full" value={form.email} onChange={e => sf('email', e.target.value)} /></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select className="hms-input w-full" value={form.category} onChange={e => sf('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">GST Number</label><input className="hms-input w-full" value={form.gstNumber} onChange={e => sf('gstNumber', e.target.value)} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">PAN Number</label><input className="hms-input w-full" value={form.panNumber} onChange={e => sf('panNumber', e.target.value)} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Address</label><textarea className="hms-input w-full" rows={2} value={form.address} onChange={e => sf('address', e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Bank Details</label><input className="hms-input w-full" placeholder="Bank name, account no, IFSC" value={form.bankDetails} onChange={e => sf('bankDetails', e.target.value)} /></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => sf('rating', n)} className={`text-2xl leading-none ${n <= form.rating ? 'text-amber-400' : 'text-gray-200'} hover:text-amber-300 transition-colors`}>★</button>
                  ))}
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><textarea className="hms-input w-full" rows={2} value={form.notes} onChange={e => sf('notes', e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editVendor ? 'Save Changes' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Vendor Detail Drawer */}
      {viewVendor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl sm:rounded-r-none w-full sm:w-[480px] h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{viewVendor.name}</h2>
                <p className="text-xs text-gray-400">{viewVendor.category} · {(viewVendor.id || '').toString().slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEdit(viewVendor); setViewVendor(null); }} className="text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium flex items-center gap-1"><Pencil size={11} /> Edit</button>
                <button onClick={() => handlePrint(viewVendor)} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button>
                <button onClick={() => setViewVendor(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${viewVendor.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {viewVendor.isActive !== false ? 'Active' : 'Inactive'}
                </span>
                {viewVendor.rating ? <span className="text-amber-400 text-lg">{'★'.repeat(viewVendor.rating)}{'☆'.repeat(5 - viewVendor.rating)}</span> : null}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {viewVendor.contactPerson && (
                  <div className="flex items-center gap-3 text-sm"><Building2 size={15} className="text-gray-400 flex-shrink-0" /><span className="text-gray-700">{viewVendor.contactPerson}</span></div>
                )}
                {viewVendor.phone && (
                  <div className="flex items-center gap-3 text-sm"><Phone size={15} className="text-gray-400 flex-shrink-0" /><span className="text-gray-700">{viewVendor.phone}</span></div>
                )}
                {viewVendor.email && (
                  <div className="flex items-center gap-3 text-sm"><Mail size={15} className="text-gray-400 flex-shrink-0" /><span className="text-gray-700">{viewVendor.email}</span></div>
                )}
                {viewVendor.address && (
                  <div className="flex items-start gap-3 text-sm"><MapPin size={15} className="text-gray-400 flex-shrink-0 mt-0.5" /><span className="text-gray-700">{viewVendor.address}</span></div>
                )}
                {(viewVendor.gstNumber || viewVendor.panNumber) && (
                  <div className="flex items-center gap-3 text-sm"><CreditCard size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 font-mono">{[viewVendor.gstNumber, viewVendor.panNumber].filter(Boolean).join(' · ')}</span>
                  </div>
                )}
                {viewVendor.bankDetails && (
                  <div className="flex items-start gap-3 text-sm"><CreditCard size={15} className="text-gray-400 flex-shrink-0 mt-0.5" /><span className="text-gray-700">{viewVendor.bankDetails}</span></div>
                )}
                {viewVendor.notes && (
                  <div className="mt-1 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">{viewVendor.notes}</div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2"><FileText size={15} className="text-teal-600" /> Contracts</h3>
                  <button onClick={() => setShowContractForm(true)} className="text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium flex items-center gap-1"><Plus size={11} /> Add</button>
                </div>
                {loadingContracts ? (
                  <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                ) : contracts.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-3">No contracts added yet</p>
                ) : (
                  <div className="space-y-2">
                    {contracts.map((c: any) => (
                      <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">{c.title}</span>
                          {c.value && <span className="text-xs font-bold text-teal-700">₹{Number(c.value).toLocaleString('en-IN')}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {c.startDate && formatDate(c.startDate)} {c.endDate && `→ ${formatDate(c.endDate)}`}
                        </div>
                        {c.terms && <p className="text-xs text-gray-500 mt-1">{c.terms}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {showContractForm && (
                  <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Contract Title *</label><input className="hms-input w-full" value={contractForm.title} onChange={e => setContractForm({ ...contractForm, title: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label><input type="date" className="hms-input w-full" value={contractForm.startDate} onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })} /></div>
                      <div><label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label><input type="date" className="hms-input w-full" value={contractForm.endDate} onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })} /></div>
                    </div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Contract Value (₹)</label><input type="number" className="hms-input w-full" value={contractForm.value} onChange={e => setContractForm({ ...contractForm, value: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Terms / Notes</label><textarea className="hms-input w-full" rows={2} value={contractForm.terms} onChange={e => setContractForm({ ...contractForm, terms: e.target.value })} /></div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowContractForm(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                      <button onClick={handleAddContract} disabled={submittingContract} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                        {submittingContract && <Loader2 size={12} className="animate-spin" />} Save Contract
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button onClick={() => handleToggleActive(viewVendor)} className={`w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${viewVendor.isActive !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                  {viewVendor.isActive !== false ? <><ToggleLeft size={15} /> Deactivate Vendor</> : <><ToggleRight size={15} /> Activate Vendor</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
