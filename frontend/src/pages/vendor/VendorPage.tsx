import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, X, Loader2, Printer } from 'lucide-react';
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

  const handlePrintVendorProfile = (v: any) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const vendorCode = (v.id || '').toString().slice(0, 8).toUpperCase();
    const statusColor = v.status === 'ACTIVE' ? '#16a34a' : v.status === 'INACTIVE' ? '#dc2626' : '#6b7280';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Vendor Profile - ${v.name}</title></head><body style="font-family:Arial,sans-serif;margin:0;padding:32px;color:#1f2937;">
<div style="max-width:740px;margin:0 auto;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="margin:0;font-size:26px;color:#0F766E;letter-spacing:2px;">AYPHEN HMS</h1>
    <h2 style="margin:8px 0 0;font-size:16px;color:#374151;font-weight:600;text-transform:uppercase;letter-spacing:1px;">VENDOR PROFILE / PURCHASE ORDER</h2>
    <hr style="border:none;border-top:2px solid #0F766E;margin:16px 0;" />
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin-bottom:20px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Vendor Name</span><p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#111827;">${v.name || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Vendor Code / ID</span><p style="margin:4px 0 0;font-size:14px;font-family:monospace;color:#0F766E;">${vendorCode}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Contact Person</span><p style="margin:4px 0 0;font-size:14px;color:#374151;">${v.contactPerson || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Phone</span><p style="margin:4px 0 0;font-size:14px;color:#374151;">${v.phone || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Email</span><p style="margin:4px 0 0;font-size:14px;color:#374151;">${v.email || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Address</span><p style="margin:4px 0 0;font-size:14px;color:#374151;">${v.address || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Category / Type</span><p style="margin:4px 0 0;font-size:14px;color:#374151;">${v.category || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">GST Number</span><p style="margin:4px 0 0;font-size:14px;font-family:monospace;color:#374151;">${v.gstNumber || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Payment Terms</span><p style="margin:4px 0 0;font-size:14px;color:#374151;">${v.paymentTerms || '—'}</p></div>
      <div><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Bank Details</span><p style="margin:4px 0 0;font-size:14px;color:#374151;">${v.bankDetails || '—'}</p></div>
    </div>
    ${v.status ? `<div style="margin-top:16px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Status</span><p style="margin:4px 0 0;"><span style="display:inline-block;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:700;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}66;">${v.status}</span></p></div>` : ''}
    ${v.notes ? `<div style="margin-top:16px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600;">Notes</span><p style="margin:4px 0 0;font-size:13px;color:#374151;background:#f9fafb;padding:10px;border-radius:6px;border:1px solid #e5e7eb;">${v.notes}</p></div>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:48px;">
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Purchase Officer</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Finance</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280;">Date</div></div>
  </div>
</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`;
    win.document.write(html);
    win.document.close();
  };

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
              <td className="px-4 py-3 flex items-center gap-2"><button className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button><button onClick={() => handlePrintVendorProfile(v)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={12} /> Print</button></td>
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
