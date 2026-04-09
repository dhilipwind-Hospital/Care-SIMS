import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, DollarSign, Clock, FileText, Plus, X, Search, Trash2, Printer, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import ExportButton from '../../components/ui/ExportButton';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { patientId: '', invoiceType: 'OPD', notes: '' };
const EMPTY_ITEM = { description: '', category: 'CONSULTATION', quantity: 1, unitPrice: '', taxPercent: 0 };

export default function BillingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // New invoice modal
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);

  // Detail panel
  const [selected, setSelected] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [paying, setPaying] = useState(false);

  // Add line item form (for DRAFT invoices in detail modal)
  const EMPTY_NEW_LINE = { description: '', category: 'CONSULTATION', quantity: 1, unitPrice: '', discountPercent: 0 };
  const [showAddItem, setShowAddItem] = useState(false);
  const [newLine, setNewLine] = useState({ ...EMPTY_NEW_LINE });
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');
  const [showPayments, setShowPayments] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/invoices', { params: { q: search || undefined, status: statusFilter || undefined, page, limit: 20 } });
      setInvoices(data.data || []);
      setTotalInvoices(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load invoices'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [search, statusFilter, page]);

  // Escape key to close modals
  useEscapeClose(showNew, () => setShowNew(false));
  useEscapeClose(showDetailModal, () => setShowDetailModal(false));

  const searchPatients = async (q: string) => {
    if (!q.trim()) { setPatients([]); return; }
    setPatientLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { q, limit: 8 } });
      setPatients(data.data || []);
    } catch (err) { toast.error('Operation failed'); } finally { setPatientLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const addItem = () => setItems(it => [...it, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems(it => it.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) =>
    setItems(it => it.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const subtotal = items.reduce((s, it) => s + (Number(it.unitPrice) || 0) * Number(it.quantity), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { setFormError('Please select a patient'); return; }
    if (items.every(it => !it.description || !it.unitPrice)) { setFormError('Add at least one line item'); return; }
    setSubmitting(true); setFormError('');
    try {
      const payload = { ...form, lineItems: items.filter(it => it.description && it.unitPrice).map(it => ({ ...it, unitPrice: Number(it.unitPrice), quantity: Number(it.quantity) })) };
      await api.post('/billing/invoices', payload);
      setShowNew(false); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); setPatientSearch('');
      fetchInvoices();
    } catch (err: any) { setFormError(err.response?.data?.message || 'Failed to create invoice'); }
    finally { setSubmitting(false); }
  };

  const handleFinalize = async (id: string) => {
    try {
      await api.patch(`/billing/invoices/${id}/finalize`);
      toast.success('Invoice finalized');
      fetchInvoices();
      if (selected?.id === id) { const { data } = await api.get(`/billing/invoices/${id}`); setSelected(data); }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to finalize invoice');
    }
  };

  const handlePay = async (id: string) => {
    if (!payAmount) return;
    setPaying(true);
    try {
      await api.post(`/billing/invoices/${id}/payments`, { amount: Number(payAmount), paymentMethod: payMethod });
      setPayAmount(''); fetchInvoices();
      const { data } = await api.get(`/billing/invoices/${id}`); setSelected(data);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this invoice?')) return;
    try {
      await api.patch(`/billing/invoices/${id}/cancel`);
      toast.success('Invoice cancelled');
      fetchInvoices(); setSelected(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const { data } = await api.get(`/billing/invoices/${id}`);
      setSelected(data);
      setShowDetailModal(true);
      setShowAddItem(false);
      setNewLine({ ...EMPTY_NEW_LINE });
      setAddItemError('');
      setShowPayments(false);
    } catch (err) { toast.error('Operation failed'); }
  };

  const handleAddLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!newLine.description.trim()) { setAddItemError('Description is required'); return; }
    if (!newLine.unitPrice || Number(newLine.unitPrice) <= 0) { setAddItemError('Unit price must be greater than 0'); return; }
    setAddingItem(true); setAddItemError('');
    try {
      await api.post(`/billing/invoices/${selected.id}/line-items`, {
        description: newLine.description,
        category: newLine.category,
        quantity: Number(newLine.quantity),
        unitPrice: Number(newLine.unitPrice),
        discountPct: Number(newLine.discountPercent) || 0,
      });
      toast.success('Line item added');
      setNewLine({ ...EMPTY_NEW_LINE });
      setShowAddItem(false);
      // Refresh invoice detail
      const { data } = await api.get(`/billing/invoices/${selected.id}`);
      setSelected(data);
      fetchInvoices();
    } catch (err: any) { setAddItemError(err.response?.data?.message || 'Failed to add line item'); }
    finally { setAddingItem(false); }
  };

  const totalDue = invoices.reduce((s, i) => s + Math.max(0, Number(i.netTotal) - Number(i.paidAmount || 0)), 0);
  const paidToday = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.paidAmount || 0), 0);
  const pending = invoices.filter(i => ['FINALIZED','PARTIAL'].includes(i.status)).length;

  const balance = selected ? Math.max(0, Number(selected.netTotal || 0) - Number(selected.paidAmount || 0)) : 0;

  const handlePrint = () => {
    if (!selected) return;
    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) return;
    const lineRows = (selected.lineItems || []).map((it: any, i: number) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${i + 1}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${it.description}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹${Number(it.unitPrice || 0).toLocaleString('en-IN')}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹${Number(it.amount || it.unitPrice * it.quantity).toLocaleString('en-IN')}</td></tr>`
    ).join('');
    const orgName = user?.tenantName || 'Hospital';
    const orgContact = [user?.tenantPrimaryPhone, user?.tenantPrimaryEmail].filter(Boolean).join(' · ');
    const orgLogoImg = user?.tenantLogoUrl ? `<img src="${user.tenantLogoUrl}" alt="${orgName}" style="height:48px;max-width:180px;object-fit:contain;margin-bottom:4px" />` : '';
    const html = `<!DOCTYPE html><html><head><title>Invoice ${selected.invoiceNumber}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px;color:#1a1a1a}table{width:100%;border-collapse:collapse}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #0F766E}.logo{font-size:24px;font-weight:800;color:#0F766E}.inv-title{font-size:28px;font-weight:800;color:#0F766E;text-align:right}.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}.meta-box{background:#f8fafa;padding:16px;border-radius:8px}.meta-box h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px}.meta-box p{margin:2px 0;font-size:14px}th{background:#f3f4f6;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px}.totals{margin-top:16px;text-align:right}.totals .row{display:flex;justify-content:flex-end;gap:40px;padding:4px 0;font-size:14px}.totals .grand{font-size:18px;font-weight:800;border-top:2px solid #0F766E;padding-top:8px;margin-top:8px;color:#0F766E}.footer{margin-top:48px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #eee;padding-top:16px}@media print{body{padding:20px}}</style></head><body>
      <div class="header"><div>${orgLogoImg}<div class="logo">${orgName}</div>${orgContact ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">${orgContact}</div>` : ''}</div><div><div class="inv-title">INVOICE</div><div style="font-size:13px;color:#6b7280;text-align:right;margin-top:4px">${selected.invoiceNumber}</div></div></div>
      <div class="meta"><div class="meta-box"><h4>Bill To</h4><p style="font-weight:600">${selected.patient?.firstName || ''} ${selected.patient?.lastName || ''}</p><p>Patient ID: ${selected.patient?.patientId || '—'}</p><p>${selected.patient?.phone || ''}</p></div><div class="meta-box"><h4>Invoice Details</h4><p>Date: ${selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p><p>Type: ${selected.invoiceType || 'OPD'}</p><p>Status: ${selected.status}</p>${selected.doctor ? `<p>Doctor: Dr. ${selected.doctor.firstName} ${selected.doctor.lastName}</p>` : ''}</div></div>
      <table><thead><tr><th>#</th><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${lineRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#9ca3af">No line items</td></tr>'}</tbody></table>
      <div class="totals"><div class="row"><span>Subtotal:</span><span>₹${Number(selected.subtotal || 0).toLocaleString('en-IN')}</span></div>${selected.discountAmount ? `<div class="row" style="color:#10B981"><span>Discount:</span><span>-₹${Number(selected.discountAmount).toLocaleString('en-IN')}</span></div>` : ''}${selected.taxAmount ? `<div class="row"><span>Tax:</span><span>₹${Number(selected.taxAmount).toLocaleString('en-IN')}</span></div>` : ''}<div class="row grand"><span>Total:</span><span>₹${Number(selected.netTotal || 0).toLocaleString('en-IN')}</span></div>${Number(selected.paidAmount) > 0 ? `<div class="row" style="color:#10B981"><span>Paid:</span><span>₹${Number(selected.paidAmount).toLocaleString('en-IN')}</span></div><div class="row" style="font-weight:700"><span>Balance Due:</span><span>₹${balance.toLocaleString('en-IN')}</span></div>` : ''}</div>
      <div class="footer"><p>Thank you for choosing ${orgName}</p><p>This is a computer-generated invoice.</p></div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Invoicing</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {selected ? `Invoice #${selected.invoiceNumber} · Token #${selected.tokenNumber || '—'}` : 'Manage patient billing and invoicing'}
            </p>
          </div>
          <div className="flex gap-3">
            <ExportButton endpoint="/billing/invoices/export" params={{ q: search || undefined, status: statusFilter || undefined }} filename={`invoices-${new Date().toISOString().slice(0, 10)}.csv`} />
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-teal-600 text-teal-700 text-sm font-semibold hover:bg-teal-50 transition-all">
              <Printer size={14} /> Print Invoice
            </button>
            <button onClick={() => { setShowNew(true); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); setFormError(''); setPatientSearch(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Plus size={14} /> New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 px-6 pt-5">
        <KpiCard label="Total Due" value={`₹${totalDue.toLocaleString()}`} icon={CreditCard} color="#0F766E" sub="Current invoice" />
        <KpiCard label="Paid Today" value={`₹${paidToday.toLocaleString()}`} icon={DollarSign} color="#10B981" sub="All payments" />
        <KpiCard label="Pending" value={pending} icon={Clock} color="#F59E0B" sub={`${pending > 0 ? pending + ' invoices' : 'All cleared'}`} />
        <KpiCard label="Invoices Today" value={invoices.length} icon={FileText} color="#3B82F6" sub={invoices.length > 0 ? `${invoices.length} invoice${invoices.length > 1 ? 's' : ''}` : 'None yet'} />
      </div>

      {/* Split content area */}
      <div className="flex flex-1 gap-5 px-6 py-5 overflow-auto">

        {/* Left: Invoice Table */}
        <div className="flex-1 hms-card flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <h3 className="font-semibold text-gray-800">Invoice Line Items</h3>
            <div className="flex gap-2">
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search invoice or patient…"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48" />
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-gray-600">
                <option value="">All Status</option>
                {['DRAFT','PENDING','PAID','PARTIAL','OVERDUE','CANCELLED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead>
                <tr>
                  {['Item','Dept','Qty','Rate','Amount',''].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState
                      icon={<FileText size={24} className="text-gray-400" />}
                      title="No invoices"
                      description="No invoices found. Create a new invoice to get started."
                    />
                  </td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}
                    onClick={() => openDetail(inv.id)}
                    className={`cursor-pointer transition-colors ${
                      selected?.id === inv.id
                        ? 'bg-teal-50 border-l-4 border-l-teal-500'
                        : inv.status === 'OVERDUE' ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'
                    }`}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-teal-700">{inv.invoiceNumber}</div>
                      <div className="text-xs text-gray-500">{inv.patient?.firstName} {inv.patient?.lastName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.invoiceType || 'OPD'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.lineItems?.length || 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">₹{Number(inv.subtotal || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">₹{Number(inv.netTotal || 0).toLocaleString()}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(inv.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50 transition-all">
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals row */}
            {invoices.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-right space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{invoices.reduce((s,i) => s + Number(i.subtotal||0), 0).toLocaleString()}</span>
                </div>
                {invoices.some(i => i.discountAmount) && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{invoices.reduce((s,i) => s + Number(i.discountAmount||0), 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t border-gray-200">
                  <span>Total Amount Due</span>
                  <span>₹{totalDue.toLocaleString()}</span>
                </div>
              </div>
            )}
            <Pagination page={page} totalPages={Math.ceil(totalInvoices / 20)} onPageChange={setPage} totalItems={totalInvoices} pageSize={20} />
          </div>
        </div>

        {/* Right: Patient Details + Payment Panel */}
        <div className="w-96 flex-shrink-0 space-y-4">
          {/* Patient Details */}
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-800">Patient Details</span>
              {selected && <StatusBadge status={selected.status} />}
            </div>
            <div className="p-5 space-y-3">
              {selected ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Patient', `${selected.patient?.firstName || ''} ${selected.patient?.lastName || ''}`],
                      ['Patient ID', selected.patient?.patientId || '—'],
                      ['Doctor', selected.doctor ? `Dr. ${selected.doctor.firstName} ${selected.doctor.lastName}` : '—'],
                      ['Department', selected.department?.name || '—'],
                      ['Visit Date', selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className={lbl === 'Patient' || lbl === 'Visit Date' ? 'col-span-2' : ''}>
                        <p className="text-xs text-gray-400">{lbl}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                  {/* Line items summary */}
                  {selected.lineItems?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                      {selected.lineItems.map((it: any) => (
                        <div key={it.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{it.description}</span>
                          <span className="font-medium text-gray-900">₹{Number(it.amount || (it.unitPrice * it.quantity)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-sm text-gray-400">
                  Click an invoice to view patient details
                </div>
              )}
            </div>
          </div>

          {/* Payment Section */}
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Payment</span>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  {['CASH','CARD','UPI','INSURANCE','CHEQUE','NEFT'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Discount Applied</label>
                <input readOnly value={selected?.discountAmount ? `₹${Number(selected.discountAmount).toLocaleString()}` : '—'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-gray-700">Amount Due</span>
                <span className="text-2xl font-black text-gray-900">₹{selected ? balance.toLocaleString() : '0'}</span>
              </div>
              <button
                onClick={() => selected && handlePay(selected.id)}
                disabled={paying || !selected || balance <= 0}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {paying ? 'Processing…' : '✓ Collect Payment'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                {selected?.status === 'DRAFT' && (
                  <button onClick={() => handleFinalize(selected.id)}
                    className="py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-all">
                    Finalize
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!selected) return;
                    const email = selected.patient?.email;
                    if (!email) { toast.error('Patient does not have an email on file'); return; }
                    const t = toast.loading('Sending invoice...');
                    try {
                      const { data } = await api.post(`/billing/invoices/${selected.id}/email`);
                      toast.success(`Invoice sent to ${data.to}`, { id: t });
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Failed to send invoice email', { id: t });
                    }
                  }}
                  className="py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
                  Email Invoice
                </button>
                {selected && !['PAID','CANCELLED'].includes(selected.status) && (
                  <button onClick={() => handleCancel(selected.id)}
                    className="py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-all">
                    Mark Pending
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <InvoiceDetailModal />
      <NewInvoiceModal />
    </div>
  );

  function InvoiceDetailModal() {
    if (!showDetailModal || !selected) return null;
    const detailBalance = Math.max(0, Number(selected.netTotal || 0) - Number(selected.paidAmount || 0));
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <h2 className="font-bold text-gray-900">Invoice {selected.invoiceNumber}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {selected.invoiceType || 'OPD'} &middot; Created {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={selected.status} />
              <button type="button" onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Patient Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Patient Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Name', `${selected.patient?.firstName || ''} ${selected.patient?.lastName || ''}`],
                  ['Patient ID', selected.patient?.patientId || '—'],
                  ['Phone', selected.patient?.phone || '—'],
                  ['Email', selected.patient?.email || '—'],
                ].map(([lbl, val]) => (
                  <div key={lbl as string}>
                    <p className="text-xs text-gray-400">{lbl}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Items</h4>
                {selected.status === 'DRAFT' && (
                  <button
                    onClick={() => { setShowAddItem(!showAddItem); setAddItemError(''); setNewLine({ ...EMPTY_NEW_LINE }); }}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                    <Plus size={12} /> Add Item
                  </button>
                )}
              </div>

              {/* Add Item Form (DRAFT only) */}
              {showAddItem && selected.status === 'DRAFT' && (
                <form onSubmit={handleAddLineItem} className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      value={newLine.description}
                      onChange={e => setNewLine(l => ({ ...l, description: e.target.value }))}
                      placeholder="Description"
                      className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <select
                      value={newLine.category}
                      onChange={e => setNewLine(l => ({ ...l, category: e.target.value }))}
                      className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {['CONSULTATION','LAB','PHARMACY','PROCEDURE','ROOM','OTHER'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input
                      type="number" min="1"
                      value={newLine.quantity}
                      onChange={e => setNewLine(l => ({ ...l, quantity: Number(e.target.value) }))}
                      placeholder="Qty"
                      className="col-span-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <input
                      type="number"
                      value={newLine.unitPrice}
                      onChange={e => setNewLine(l => ({ ...l, unitPrice: e.target.value }))}
                      placeholder="Unit Price"
                      className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <input
                      type="number" min="0" max="100"
                      value={newLine.discountPercent}
                      onChange={e => setNewLine(l => ({ ...l, discountPercent: Number(e.target.value) }))}
                      placeholder="Disc %"
                      className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  {addItemError && <p className="text-xs text-red-600">{addItemError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddItem(false)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={addingItem}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                      {addingItem ? 'Adding...' : 'Add Item'}
                    </button>
                  </div>
                </form>
              )}

              <table className="w-full">
                <thead>
                  <tr>
                    {['#','Description','Category','Qty','Unit Price','Disc %','Amount'].map(h => (
                      <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 text-left bg-gray-50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selected.lineItems || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-400">No line items</td></tr>
                  ) : (selected.lineItems || []).map((it: any, idx: number) => (
                    <tr key={it.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{it.description}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{it.category || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">{it.quantity}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">{Number(it.unitPrice || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{it.discountPct || 0}%</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-gray-900">{Number(it.amount || (it.unitPrice * it.quantity)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{Number(selected.subtotal || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
              </div>
              {Number(selected.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{Number(selected.discountAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
              )}
              {Number(selected.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>{Number(selected.taxAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Net Total</span>
                <span>{Number(selected.netTotal || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
              </div>
              {Number(selected.paidAmount || 0) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid</span>
                    <span>{Number(selected.paidAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span>Balance Due</span>
                    <span>{detailBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                  </div>
                </>
              )}
            </div>

            {/* Payment History */}
            {(selected.payments || []).length > 0 && (
              <div>
                <button
                  onClick={() => setShowPayments(!showPayments)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-600 transition-colors">
                  Payment History ({selected.payments.length})
                  {showPayments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showPayments && (
                  <div className="space-y-2">
                    {selected.payments.map((pay: any) => (
                      <div key={pay.id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {Number(pay.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {pay.paymentMethod} {pay.referenceNumber ? `· Ref: ${pay.referenceNumber}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {pay.createdAt ? new Date(pay.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {selected.notes && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700">{selected.notes}</p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
            {selected.status === 'DRAFT' && (
              <button onClick={() => { handleFinalize(selected.id); setShowDetailModal(false); }}
                className="px-4 py-2 rounded-xl border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-all">
                Finalize
              </button>
            )}
            <button onClick={() => { handlePrint(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 text-teal-700 text-sm font-semibold hover:bg-teal-50 transition-all">
              <Printer size={14} /> Print
            </button>
            <button onClick={() => setShowDetailModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  function NewInvoiceModal() {
    return !showNew ? null : (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <div>
              <h2 className="font-bold text-gray-900">New Invoice</h2>
              <p className="text-xs text-gray-400 mt-0.5">Create a billing invoice for a patient</p>
            </div>
            <button type="button" onClick={() => setShowNew(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-5">
            {/* Patient search */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Patient <span className="text-red-500">*</span></label>
              {form.patientId ? (
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                  <span className="text-sm font-medium text-teal-800">{patients.find(p => p.id === form.patientId)?.firstName} {patients.find(p => p.id === form.patientId)?.lastName} — {patients.find(p => p.id === form.patientId)?.patientId}</span>
                  <button type="button" onClick={() => { setForm(f => ({ ...f, patientId: '' })); }} className="text-teal-600 hover:text-red-500"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                    placeholder="Search by name, phone or patient ID…"
                    className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {patients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-48 overflow-y-auto">
                      {patientLoading ? <div className="p-3 text-sm text-gray-400">Searching…</div> : patients.map(p => (
                        <button key={p.id} type="button" onClick={() => { setForm(f => ({ ...f, patientId: p.id })); setPatients([]); setPatientSearch(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                          <span className="font-medium">{p.firstName} {p.lastName}</span>
                          <span className="text-gray-400 ml-2">{p.patientId} · {p.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Invoice type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Type</label>
                <select value={form.invoiceType} onChange={e => setForm(f => ({ ...f, invoiceType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {['OPD','IPD','PHARMACY','LAB','PROCEDURE','PACKAGE'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">Line Items <span className="text-red-500">*</span></label>
                <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-semibold"><Plus size={12} /> Add Item</button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                      placeholder="Description" className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <select value={item.category} onChange={e => updateItem(i, 'category', e.target.value)}
                      className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {['CONSULTATION','PROCEDURE','MEDICATION','LAB_TEST','ROOM','NURSING','MISC'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)}
                      className="col-span-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <input type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                      placeholder="₹ Price" className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                      className="col-span-1 p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right text-sm font-bold text-gray-900">Subtotal: ₹{subtotal.toLocaleString('en-IN')}</div>
            </div>
            {formError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowNew(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {submitting ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

}
