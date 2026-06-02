import { memo, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, DollarSign, Clock, FileText, Plus, X, Search, Trash2, Printer, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import ExportButton from '../../components/ui/ExportButton';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { patientId: '', doctorId: '', invoiceType: 'OPD', notes: '' };
const EMPTY_ITEM = { description: '', category: 'CONSULTATION', quantity: 1, unitPrice: '', taxPct: 0 };

// One source of truth for line-item categories. Reused in the New Invoice
// modal, the add-item drawer, and the category breakdown chips.
const LINE_CATEGORIES: Array<{ value: string; label: string; cls: string }> = [
  { value: 'CONSULTATION', label: 'Doctor Fee',    cls: 'bg-teal-100 text-teal-700' },
  { value: 'LAB',          label: 'Lab',            cls: 'bg-rose-100 text-rose-700' },
  { value: 'PHARMACY',     label: 'Pharmacy',       cls: 'bg-amber-100 text-amber-700' },
  { value: 'RADIOLOGY',    label: 'Radiology',      cls: 'bg-purple-100 text-purple-700' },
  { value: 'PROCEDURE',    label: 'Procedure / OT', cls: 'bg-blue-100 text-blue-700' },
  { value: 'ADMISSION',    label: 'Room / Bed',     cls: 'bg-indigo-100 text-indigo-700' },
  { value: 'NURSING',      label: 'Nursing',        cls: 'bg-pink-100 text-pink-700' },
  { value: 'OTHER',        label: 'Other',          cls: 'bg-gray-100 text-gray-600' },
];
const categoryStyle = (cat?: string) => LINE_CATEGORIES.find(c => c.value === (cat || 'OTHER')) || LINE_CATEGORIES[LINE_CATEGORIES.length - 1];

// Memoised row so editing one line item doesn't re-render the other 50.
// Without this the whole BillingPage (revenue chart, invoice table, KPIs)
// re-renders on every keystroke, which is why typing felt frozen once the
// modal auto-filled a long list of unbilled charges.
interface LineItemRowProps {
  index: number;
  description: string;
  category: string;
  quantity: number | string;
  unitPrice: number | string;
  disabled: boolean;
  onChange: (i: number, field: string, val: any) => void;
  onRemove: (i: number) => void;
}
const LineItemRow = memo(function LineItemRow({ index, description, category, quantity, unitPrice, disabled, onChange, onRemove }: LineItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <input value={description} onChange={e => onChange(index, 'description', e.target.value)}
        placeholder="Description" className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      <select value={category} onChange={e => onChange(index, 'category', e.target.value)}
        className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
        {LINE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <input type="number" min="1" value={quantity} onChange={e => onChange(index, 'quantity', e.target.value)}
        className="col-span-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      <input type="number" value={unitPrice} onChange={e => onChange(index, 'unitPrice', e.target.value)}
        placeholder="₹ Price" className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      <button type="button" onClick={() => onRemove(index)} disabled={disabled}
        className="col-span-1 p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
    </div>
  );
});

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
  const [outstandingPatients, setOutstandingPatients] = useState<any[]>([]);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [patientFocused, setPatientFocused] = useState(false);
  // Keep the selected patient object so the chip can render name + PID even
  // after the search results dropdown is cleared.
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  // Billing summary shown in the New Invoice modal so the user sees the
  // patient's outstanding balance, category breakdown and recent invoices.
  const [patSummary, setPatSummary] = useState<any | null>(null);
  const [patSummaryLoading, setPatSummaryLoading] = useState(false);
  useEffect(() => {
    if (!selectedPatient?.id) { setPatSummary(null); return; }
    let cancelled = false;
    setPatSummaryLoading(true);
    api.get(`/billing/patients/${selectedPatient.id}/summary`)
      .then(r => { if (!cancelled) setPatSummary(r.data); })
      .catch(() => { if (!cancelled) setPatSummary(null); })
      .finally(() => { if (!cancelled) setPatSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [selectedPatient?.id]);

  // Pre-fill line items with the patient's recent consultations / lab tests
  // / pharmacy items so the billing user doesn't have to retype them. Only
  // overwrites when the form is still on its default empty row so we don't
  // wipe out work the user has already typed.
  const [unbilledLoaded, setUnbilledLoaded] = useState(false);
  useEffect(() => {
    if (!selectedPatient?.id) { setUnbilledLoaded(false); return; }
    let cancelled = false;
    api.get(`/billing/patients/${selectedPatient.id}/unbilled`)
      .then(r => {
        if (cancelled) return;
        const unbilled = r.data?.items || [];
        if (unbilled.length === 0) { setUnbilledLoaded(true); return; }
        setItems(prev => {
          // Only auto-populate if the form is still the untouched default row.
          const isDefault = prev.length === 1 && !prev[0].description && !prev[0].unitPrice;
          if (!isDefault) return prev;
          return unbilled.map((u: any) => ({
            description: u.description,
            category: u.category,
            quantity: u.quantity || 1,
            unitPrice: u.unitPrice ? String(u.unitPrice) : '',
            discountPercent: 0,
          }));
        });
        setUnbilledLoaded(true);
      })
      .catch(() => { if (!cancelled) setUnbilledLoaded(true); });
    return () => { cancelled = true; };
  }, [selectedPatient?.id]);

  // Doctors list for the New Invoice modal's optional Doctor picker.
  // Fetched once on mount so the dropdown is populated the instant the modal
  // opens — previously this fired on showNew change, leaving the dropdown
  // empty for the first ~1s of cold network requests.
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  useEffect(() => {
    setDoctorsLoading(true);
    api.get('/doctors/affiliations/tenant')
      .then(r => {
        const rows = Array.isArray(r.data?.data ?? r.data) ? (r.data?.data ?? r.data) : [];
        setDoctorsList(rows.map((a: any) => ({
          id: a.doctorId || a.doctor?.id || a.id,
          firstName: a.doctor?.firstName || a.firstName || '',
          lastName: a.doctor?.lastName || a.lastName || '',
          specialties: a.doctor?.specialties || a.specialties,
        })));
      })
      .catch(() => setDoctorsList([]))
      .finally(() => setDoctorsLoading(false));
  }, []);

  const [revenueStats, setRevenueStats] = useState<any>(null);
  // Revenue by service line (Doctor Fee, Lab, Pharmacy, etc) for the
  // current month — populated from the new /billing/reports endpoint.
  const [revByCategory, setRevByCategory] = useState<any | null>(null);
  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    api.get('/billing/reports/revenue-by-category', { params: { from, to } })
      .then(r => setRevByCategory(r.data))
      .catch(() => setRevByCategory(null));
  }, []);

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

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    api.get('/reports/revenue', { params: { from: startOfMonth, to: today } })
      .then(({ data }) => setRevenueStats(data))
      .catch(() => { /* supplementary — ignore errors */ });
  }, []);

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

  // 200ms debounce + 1-char minimum. Previously this required 2 chars +
  // 500ms which felt like the input was frozen after typing a single letter.
  useEffect(() => {
    const q = patientSearch.trim();
    if (q.length < 1) { setPatients([]); setPatientLoading(false); return; }
    setPatientLoading(true);
    const t = setTimeout(() => searchPatients(q), 200);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // Patients with unpaid balances — shown in the dropdown the moment the
  // billing user focuses the picker, before they type anything, so they can
  // pick a debtor without having to remember the name.
  useEffect(() => {
    if (!showNew) return;
    setOutstandingLoading(true);
    api.get('/billing/patients/outstanding', { params: { limit: 10 } })
      .then(r => setOutstandingPatients(Array.isArray(r.data) ? r.data : []))
      .catch(() => setOutstandingPatients([]))
      .finally(() => setOutstandingLoading(false));
  }, [showNew]);

  const addItem = useCallback(() => setItems(it => [...it, { ...EMPTY_ITEM }]), []);
  const removeItem = useCallback((i: number) => setItems(it => it.filter((_, idx) => idx !== i)), []);
  // Stable identity so memoised LineItemRow only re-renders when its row data
  // actually changes — typing into one row no longer re-renders the others.
  const updateItem = useCallback((i: number, field: string, val: any) =>
    setItems(it => it.map((item, idx) => idx === i ? { ...item, [field]: val } : item)), []);

  const subtotal = items.reduce((s, it) => s + (Number(it.unitPrice) || 0) * Number(it.quantity), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { setFormError('Please select a patient'); return; }
    if (items.every(it => !it.description || !it.unitPrice)) { setFormError('Add at least one line item'); return; }
    setSubmitting(true); setFormError('');
    try {
      const payload = { ...form, lineItems: items.filter(it => it.description && it.unitPrice).map(it => ({ ...it, unitPrice: Number(it.unitPrice), quantity: Number(it.quantity) })) };
      await api.post('/billing/invoices', payload);
      setShowNew(false); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); setPatientSearch(''); setSelectedPatient(null);
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
    // If the user typed a partial amount, use it; otherwise default to the
    // full outstanding balance. The dead button was caused by requiring
    // payAmount to be set when the page has no amount input.
    const amt = Number(payAmount) > 0 ? Number(payAmount) : balance;
    if (amt <= 0) { toast('Nothing to collect', { icon: 'ℹ️' }); return; }
    setPaying(true);
    try {
      // If the invoice is still in DRAFT, finalize it before recording a
      // payment — backend's recordPayment doesn't auto-finalize.
      if (selected?.status === 'DRAFT') {
        try { await api.patch(`/billing/invoices/${id}/finalize`); } catch {}
      }
      await api.post(`/billing/invoices/${id}/payments`, { amount: amt, paymentMethod: payMethod });
      toast.success('Payment recorded');
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

  const handlePrintInvoice = (inv: any) => {
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;
    const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
    const lineItems = inv.lineItems || inv.items || [];
    const payments = inv.payments || [];
    const patientName = inv.patient ? `${inv.patient.firstName || ''} ${inv.patient.lastName || ''}`.trim() : '—';
    const html = `<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber || ''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double #0F766E; padding-bottom: 16px; margin-bottom: 20px; }
    .hospital { }
    .hospital-name { font-size: 22px; font-weight: 900; color: #0F766E; }
    .hospital-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 18px; font-weight: 800; letter-spacing: 2px; color: #333; }
    .invoice-num { font-size: 14px; font-weight: 700; color: #0F766E; margin-top: 4px; }
    .invoice-date { font-size: 11px; color: #666; margin-top: 2px; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 4px; }
    .status-PAID { background: #dcfce7; color: #166534; }
    .status-DRAFT { background: #fef9c3; color: #854d0e; }
    .status-FINALIZED { background: #dbeafe; color: #1e40af; }
    .status-CANCELLED { background: #f3f4f6; color: #6b7280; }
    .bill-to { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
    .bill-to-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0F766E; letter-spacing: 1px; margin-bottom: 6px; }
    .bill-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .field label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
    .field p { font-size: 13px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0fdfa; color: #0F766E; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border: 1px solid #e5e7eb; }
    td { padding: 8px 10px; border: 1px solid #e5e7eb; font-size: 12px; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-box { width: 300px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .totals-row:last-child { border-bottom: none; }
    .totals-net { background: #0F766E; color: white; font-weight: 800; font-size: 15px; }
    .totals-paid { background: #f0fdf4; color: #166534; font-weight: 700; }
    .totals-bal { background: #fff7ed; color: #c2410c; font-weight: 700; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0F766E; margin-bottom: 8px; margin-top: 16px; }
    .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1px solid #333; margin-bottom: 6px; margin-top: 40px; }
    .sig-label { font-size: 11px; color: #555; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <div class="header">
    <div class="hospital">
      <div class="hospital-name">AYPHEN HMS</div>
      <div class="hospital-sub">Hospital Management System</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">TAX INVOICE</div>
      <div class="invoice-num">${inv.invoiceNumber || 'DRAFT'}</div>
      <div class="invoice-date">${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}</div>
      <span class="status-badge status-${inv.status || 'DRAFT'}">${inv.status || 'DRAFT'}</span>
    </div>
  </div>

  <div class="bill-to">
    <div class="bill-to-title">Bill To</div>
    <div class="bill-grid">
      <div class="field"><label>Patient Name</label><p>${patientName}</p></div>
      <div class="field"><label>Patient ID</label><p>${inv.patient?.patientId || '—'}</p></div>
      <div class="field"><label>Invoice Type</label><p>${inv.invoiceType || '—'}</p></div>
    </div>
  </div>

  ${lineItems.length > 0 ? `
  <div class="section-title">Line Items</div>
  <table>
    <thead><tr>
      <th>#</th><th>Description</th><th>Category</th><th style="text-align:right">Qty</th>
      <th style="text-align:right">Unit Price</th><th style="text-align:right">Discount</th>
      <th style="text-align:right">Tax %</th><th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      ${lineItems.map((item: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description || '—'}</td>
          <td>${item.category || '—'}</td>
          <td style="text-align:right">${item.quantity || 1}</td>
          <td style="text-align:right">${fmt(item.unitPrice)}</td>
          <td style="text-align:right">${item.discountPct || 0}%</td>
          <td style="text-align:right">${item.taxPct || 0}%</td>
          <td style="text-align:right"><strong>${fmt(item.lineTotal || item.total || (item.unitPrice * (item.quantity || 1)))}</strong></td>
        </tr>`).join('')}
    </tbody>
  </table>` : '<p style="color:#6b7280;font-size:12px;margin-bottom:16px">No line items</p>'}

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>${fmt(inv.subtotal)}</span></div>
      ${inv.discountAmount > 0 ? `<div class="totals-row"><span>Discount</span><span style="color:#dc2626">-${fmt(inv.discountAmount)}</span></div>` : ''}
      ${inv.taxAmount > 0 ? `<div class="totals-row"><span>Tax</span><span>${fmt(inv.taxAmount)}</span></div>` : ''}
      <div class="totals-row totals-net"><span>NET TOTAL</span><span>${fmt(inv.netTotal)}</span></div>
      <div class="totals-row totals-paid"><span>Amount Paid</span><span>${fmt(inv.paidAmount)}</span></div>
      <div class="totals-row totals-bal"><span>Balance Due</span><span>${fmt((inv.netTotal || 0) - (inv.paidAmount || 0))}</span></div>
    </div>
  </div>

  ${payments.length > 0 ? `
  <div class="section-title">Payment History</div>
  <table>
    <thead><tr><th>Date</th><th>Method</th><th style="text-align:right">Amount</th><th>Reference</th></tr></thead>
    <tbody>
      ${payments.map((p: any) => `
        <tr>
          <td>${p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}</td>
          <td>${p.paymentMethod || '—'}</td>
          <td style="text-align:right">${fmt(p.amount)}</td>
          <td>${p.referenceNumber || '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${inv.notes ? `<div style="margin-top:12px;padding:10px 12px;background:#fafafa;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;color:#555"><strong>Notes:</strong> ${inv.notes}</div>` : ''}

  <div class="signature-row">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Cashier / Billing Executive</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Authorized Signatory & Hospital Seal</div></div>
  </div>

  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  };

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
    <div className="flex flex-col" style={{ background: '#F5F7FA' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-6 py-4">
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
            <button onClick={() => { setShowNew(true); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); setFormError(''); setPatientSearch(''); setSelectedPatient(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Plus size={14} /> New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-3 sm:px-6 pt-5">
        <KpiCard label="Total Due" value={`₹${totalDue.toLocaleString()}`} icon={CreditCard} color="#0F766E" sub="Current invoice" />
        <KpiCard label="Paid Today" value={`₹${paidToday.toLocaleString()}`} icon={DollarSign} color="#10B981" sub="All payments" />
        <KpiCard label="Pending" value={pending} icon={Clock} color="#F59E0B" sub={`${pending > 0 ? pending + ' invoices' : 'All cleared'}`} />
        <KpiCard label="Invoices Today" value={invoices.length} icon={FileText} color="#3B82F6" sub={invoices.length > 0 ? `${invoices.length} invoice${invoices.length > 1 ? 's' : ''}` : 'None yet'} />
      </div>

      {/* Revenue Overview Chart */}
      {revenueStats && revenueStats.totalBilled > 0 && (
        <div className="px-3 sm:px-6 pt-4">
          <div className="hms-card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Revenue Overview — This Month</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                layout="vertical"
                data={[
                  { name: 'Billed', value: revenueStats.totalBilled, color: '#0F766E' },
                  { name: 'Collected', value: revenueStats.totalCollected, color: '#10B981' },
                  { name: 'Outstanding', value: revenueStats.outstanding, color: '#EF4444' },
                ]}
                margin={{ top: 0, right: 24, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={76}
                />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {[
                    { name: 'Billed', value: revenueStats.totalBilled, color: '#0F766E' },
                    { name: 'Collected', value: revenueStats.totalCollected, color: '#10B981' },
                    { name: 'Outstanding', value: revenueStats.outstanding, color: '#EF4444' },
                  ].map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Collection rate progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Collection Rate</span>
                <span className="font-semibold text-gray-700">
                  {((revenueStats.totalCollected / revenueStats.totalBilled) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (revenueStats.totalCollected / revenueStats.totalBilled) * 100)}%`,
                    background: 'linear-gradient(90deg, #0F766E, #10B981)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue by Service Line — Doctor Fee, Lab, Pharmacy, etc. */}
      {revByCategory && revByCategory.totals.invoiced > 0 && (
        <div className="px-3 sm:px-6 pt-4">
          <div className="hms-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Revenue by Service Line — This Month</h3>
                <p className="text-xs text-gray-400 mt-0.5">{revByCategory.totals.invoiceCount} finalized invoice(s)</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Collected / Invoiced</div>
                <div className="text-sm font-bold text-gray-800">
                  ₹{Number(revByCategory.totals.collected).toLocaleString('en-IN')}
                  <span className="text-gray-400 font-normal"> / ₹{Number(revByCategory.totals.invoiced).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {revByCategory.categories.map((c: any) => {
                const st = categoryStyle(c.category);
                const pct = revByCategory.totals.invoiced > 0 ? (c.invoiced / revByCategory.totals.invoiced) * 100 : 0;
                const collectedPct = c.invoiced > 0 ? (c.collected / c.invoiced) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                        <span className="text-gray-400">{pct.toFixed(1)}% of revenue</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-700 font-semibold">₹{Number(c.collected).toLocaleString('en-IN')}</span>
                        <span className="text-gray-400">/ ₹{Number(c.invoiced).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 bg-teal-200 relative" style={{ width: `${pct}%` }}>
                        <div className="absolute inset-y-0 left-0 bg-teal-600 rounded-r-full" style={{ width: `${collectedPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-gray-400">Dark fill = collected · Light fill = invoiced. Cancelled + draft invoices excluded.</p>
          </div>
        </div>
      )}

      {/* Split content area */}
      <div className="flex flex-col lg:flex-row gap-5 px-3 sm:px-6 py-5 pb-12">

        {/* Left: Invoice Table */}
        <div className="flex-1 hms-card flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <h3 className="font-semibold text-gray-800">Invoice Line Items</h3>
            <div className="flex gap-2">
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search invoice or patient…"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-48" />
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-gray-600">
                <option value="">All Status</option>
                {['DRAFT','PENDING','PAID','PARTIAL','OVERDUE','CANCELLED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
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
        <div className="hidden lg:block w-96 flex-shrink-0 space-y-4">
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
                  {/* Category breakdown chips — show how this invoice splits
                      across Doctor Fee / Lab / Pharmacy / etc. */}
                  {selected.lineItems?.length > 0 && (() => {
                    const byCat: Record<string, number> = {};
                    for (const it of selected.lineItems) {
                      const amt = Number(it.amount || (Number(it.unitPrice) * Number(it.quantity)));
                      byCat[it.category || 'OTHER'] = (byCat[it.category || 'OTHER'] || 0) + amt;
                    }
                    const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
                    return (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-[10px] uppercase text-gray-400 tracking-wide font-semibold mb-1.5">By Service</div>
                        <div className="flex flex-wrap gap-1.5">
                          {rows.map(([cat, amt]) => {
                            const st = categoryStyle(cat);
                            return (
                              <span key={cat} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.cls}`}>
                                {st.label}: ₹{amt.toLocaleString('en-IN')}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Line items summary */}
                  {selected.lineItems?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                      {selected.lineItems.map((it: any) => {
                        const st = categoryStyle(it.category);
                        return (
                          <div key={it.id} className="flex justify-between items-center text-sm gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                              <span className="text-gray-700 truncate">{it.description}</span>
                            </div>
                            <span className="font-medium text-gray-900 flex-shrink-0">₹{Number(it.amount || (it.unitPrice * it.quantity)).toLocaleString()}</span>
                          </div>
                        );
                      })}
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
              {/* Editable amount to collect — defaults to the full balance. */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount to Collect</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={0} step={1}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder={selected ? String(balance) : '0'}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(balance))}
                    disabled={!selected || balance <= 0}
                    className="text-xs px-3 py-2 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 disabled:opacity-50">
                    Full
                  </button>
                </div>
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
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
              <button
                onClick={() => handlePrintInvoice(selected)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                <Printer size={14} /> Print Invoice
              </button>
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
                      {LINE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
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
              {form.patientId && selectedPatient ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                    <span className="text-sm font-medium text-teal-800">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                      {selectedPatient.patientId ? ` — ${selectedPatient.patientId}` : ''}
                    </span>
                    <button type="button" onClick={() => { setForm(f => ({ ...f, patientId: '' })); setSelectedPatient(null); }} className="text-teal-600 hover:text-red-500"><X size={14} /></button>
                  </div>

                  {/* Patient billing summary — outstanding, category breakdown, recent invoices */}
                  {patSummaryLoading ? (
                    <div className="mt-3 p-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">Loading patient summary…</div>
                  ) : patSummary ? (
                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      {/* Top KPIs */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                          <div className="text-[10px] uppercase text-gray-400 tracking-wide">Invoiced</div>
                          <div className="text-sm font-bold text-gray-900 mt-0.5">₹{Number(patSummary.totals.totalInvoiced).toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{patSummary.totals.invoicedCount} bill(s)</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-100">
                          <div className="text-[10px] uppercase text-gray-400 tracking-wide">Paid</div>
                          <div className="text-sm font-bold text-green-700 mt-0.5">₹{Number(patSummary.totals.totalPaid).toLocaleString('en-IN')}</div>
                        </div>
                        <div className={`rounded-lg p-2 border ${patSummary.totals.outstanding > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                          <div className="text-[10px] uppercase text-gray-400 tracking-wide">Outstanding</div>
                          <div className={`text-sm font-bold mt-0.5 ${patSummary.totals.outstanding > 0 ? 'text-amber-700' : 'text-gray-900'}`}>₹{Number(patSummary.totals.outstanding).toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {/* Category breakdown */}
                      {patSummary.byCategory?.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 tracking-wide font-semibold mb-1">Spent by Service</div>
                          <div className="flex flex-wrap gap-1.5">
                            {patSummary.byCategory.map((c: any) => {
                              const st = categoryStyle(c.category);
                              return (
                                <span key={c.category} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.cls}`}>
                                  {st.label}: ₹{Number(c.amount).toLocaleString('en-IN')}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recent invoices */}
                      {patSummary.recent?.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 tracking-wide font-semibold mb-1">Recent Invoices</div>
                          <div className="space-y-1">
                            {patSummary.recent.map((r: any) => (
                              <div key={r.id} className="flex items-center justify-between text-[11px] bg-white rounded-md px-2 py-1 border border-gray-100">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-semibold text-gray-700 truncate">{r.invoiceNumber}</span>
                                  <span className="text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                  <span className={`px-1.5 py-px rounded text-[9px] font-bold ${r.status === 'PAID' ? 'bg-green-100 text-green-700' : r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-gray-500">₹{Number(r.netTotal).toLocaleString('en-IN')}</span>
                                  {r.balance > 0 && <span className="text-amber-700 font-semibold">Due ₹{Number(r.balance).toLocaleString('en-IN')}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {patSummary.totals.invoicedCount === 0 && (
                        <div className="text-xs text-gray-500 italic">No previous invoices for this patient.</div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                    onFocus={() => setPatientFocused(true)}
                    onClick={() => setPatientFocused(true)}
                    onBlur={() => setTimeout(() => setPatientFocused(false), 200)}
                    placeholder="Search by name, phone or patient ID…"
                    className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {(patientSearch.trim() !== '' || patientFocused) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-72 overflow-y-auto">
                      {patientSearch.trim() === '' ? (
                        <>
                          <div className="px-4 py-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50/60 border-b border-amber-100 sticky top-0">
                            Patients with unpaid bills
                          </div>
                          {outstandingLoading ? (
                            <div className="p-3 text-sm text-gray-400">Loading…</div>
                          ) : outstandingPatients.length === 0 ? (
                            <div className="p-3 text-xs text-gray-500">No outstanding balances right now. Start typing to search any patient.</div>
                          ) : outstandingPatients.map(p => (
                            <button key={p.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setForm(f => ({ ...f, patientId: p.id })); setSelectedPatient(p); setPatients([]); setPatientSearch(''); setPatientFocused(false); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-amber-50/40 text-sm flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{p.firstName} {p.lastName}</div>
                                <div className="text-gray-400 text-xs">{p.patientId}{p.mobile ? ` · ${p.mobile}` : ''}</div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-amber-700 font-bold text-sm">₹{Number(p.outstanding).toLocaleString('en-IN')}</div>
                                <div className="text-[10px] text-gray-400">{p.unpaidBills} bill{p.unpaidBills > 1 ? 's' : ''}</div>
                              </div>
                            </button>
                          ))}
                        </>
                      ) : patientLoading ? (
                        <div className="p-3 text-sm text-gray-400">Searching…</div>
                      ) : patients.length === 0 ? (
                        <div className="p-3 text-sm text-gray-400">No patients found</div>
                      ) : (
                        patients.map(p => (
                          <button key={p.id} type="button" onClick={() => { setForm(f => ({ ...f, patientId: p.id })); setSelectedPatient(p); setPatients([]); setPatientSearch(''); setPatientFocused(false); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                            <span className="font-medium">{p.firstName} {p.lastName}</span>
                            <span className="text-gray-400 ml-2">{p.patientId}{p.phone ? ` · ${p.phone}` : ''}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Invoice type + Doctor + Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Type</label>
                <select value={form.invoiceType} onChange={e => setForm(f => ({ ...f, invoiceType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {['OPD','IPD','PHARMACY','LAB','PROCEDURE','PACKAGE'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Doctor (optional)</label>
                <select value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))}
                  disabled={doctorsLoading && doctorsList.length === 0}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:opacity-60">
                  <option value="">{doctorsLoading && doctorsList.length === 0 ? 'Loading doctors…' : '— Select doctor —'}</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.firstName} {d.lastName}{d.specialties?.length ? ` · ${d.specialties[0]}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
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
              {unbilledLoaded && selectedPatient && items.some(it => it.description) && (
                <div className="mb-2 px-3 py-2 bg-teal-50 border border-teal-100 rounded-lg text-[11px] text-teal-800 flex items-start gap-2">
                  <span className="font-semibold">Pre-filled</span>
                  <span>from recent consultations, lab orders, and prescriptions in the last 30 days. Enter prices and remove anything that shouldn't be billed.</span>
                </div>
              )}
              <div className="space-y-2">
                {items.map((item, i) => (
                  <LineItemRow
                    key={i}
                    index={i}
                    description={item.description}
                    category={item.category}
                    quantity={item.quantity}
                    unitPrice={item.unitPrice}
                    disabled={items.length === 1}
                    onChange={updateItem}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              {/* Category breakdown — split the subtotal by service line so the
                  billing user sees how the total decomposes. */}
              {items.some(it => Number(it.unitPrice) > 0) && (() => {
                const byCat: Record<string, number> = {};
                for (const it of items) {
                  const amt = Number(it.quantity || 0) * Number(it.unitPrice || 0);
                  if (amt <= 0) continue;
                  byCat[it.category || 'OTHER'] = (byCat[it.category || 'OTHER'] || 0) + amt;
                }
                const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
                return (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[10px] uppercase text-gray-500 tracking-wide font-semibold mb-2">Breakdown by service</div>
                    <div className="flex flex-wrap gap-1.5">
                      {rows.map(([cat, amt]) => {
                        const st = categoryStyle(cat);
                        return (
                          <span key={cat} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.cls}`}>
                            {st.label}: ₹{amt.toLocaleString('en-IN')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
