import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, RefreshCw, ChevronDown, ChevronUp, Calendar, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

const STATUS_STYLES: Record<string, { cls: string; Icon: any }> = {
  DRAFT:     { cls: 'bg-gray-100 text-gray-600',   Icon: Clock },
  FINALIZED: { cls: 'bg-blue-100 text-blue-700',   Icon: Clock },
  PAID:      { cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
  PARTIAL:   { cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  CANCELLED: { cls: 'bg-red-100 text-red-700',     Icon: XCircle },
};

export default function PatientBillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [total, setTotal] = useState(0);
  const user = getUser();

  const fetchData = async (status = '') => {
    setLoading(true);
    try {
      const params: any = {};
      if (status) params.status = status;
      const { data } = await api.get('/auth/patient/me/billing', { params });
      setInvoices(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load billing data'); setInvoices([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(filter); }, [filter]);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtAmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.netTotal || 0), 0);
  const totalPending = invoices.filter(i => ['FINALIZED', 'PARTIAL'].includes(i.status)).reduce((s, i) => s + (Number(i.netTotal || 0) - Number(i.paidAmount || 0)), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} invoices at {user?.tenantName}</p>
        </div>
        <button onClick={() => fetchData(filter)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Invoices', value: String(total), icon: CreditCard, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Total Paid',     value: fmtAmt(totalPaid),    icon: CheckCircle, color: '#10B981', bg: '#F0FDF4' },
          { label: 'Balance Due',    value: fmtAmt(totalPending), icon: Clock,       color: '#F59E0B', bg: '#FFFBEB' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs text-gray-500">{card.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['', 'All'], ['FINALIZED', 'Due'], ['PAID', 'Paid'], ['PARTIAL', 'Partial'], ['CANCELLED', 'Cancelled']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${filter === val ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No invoices found</p>
          <p className="text-gray-400 text-sm mt-1">Billing invoices from your hospital visits will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const isOpen = expanded === inv.id;
            const st = STATUS_STYLES[inv.status] || STATUS_STYLES['DRAFT'];
            const Icon = st.Icon;
            const balance = Number(inv.netTotal || 0) - Number(inv.paidAmount || 0);
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button className="w-full text-left p-5 hover:bg-gray-50 transition-colors" onClick={() => setExpanded(isOpen ? null : inv.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <DollarSign size={20} className="text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-sm">{inv.invoiceNumber}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                              <Icon size={10} className="inline mr-1" />{inv.status}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900">{fmtAmt(inv.netTotal)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={11} /> {fmt(inv.createdAt)}
                          </span>
                          {balance > 0 && inv.status !== 'CANCELLED' && (
                            <span className="text-xs font-semibold text-amber-600">Balance: {fmtAmt(balance)}</span>
                          )}
                          {inv.invoiceType && <span className="text-xs text-gray-400">{inv.invoiceType}</span>}
                        </div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 px-5 pb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide my-3">Line Items</p>
                    {inv.lineItems?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left text-xs text-gray-500 font-semibold px-3 py-2 rounded-l-xl">Description</th>
                              <th className="text-right text-xs text-gray-500 font-semibold px-3 py-2">Qty</th>
                              <th className="text-right text-xs text-gray-500 font-semibold px-3 py-2">Unit Price</th>
                              <th className="text-right text-xs text-gray-500 font-semibold px-3 py-2 rounded-r-xl">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.lineItems.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-50">
                                <td className="px-3 py-2 text-gray-800">{item.description}</td>
                                <td className="px-3 py-2 text-gray-600 text-right">{item.quantity}</td>
                                <td className="px-3 py-2 text-gray-600 text-right">{fmtAmt(item.unitPrice)}</td>
                                <td className="px-3 py-2 font-semibold text-gray-900 text-right">{fmtAmt(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-900 rounded-l-xl">Total</td>
                              <td className="px-3 py-2 font-bold text-gray-900 text-right rounded-r-xl">{fmtAmt(inv.netTotal)}</td>
                            </tr>
                            {Number(inv.paidAmount) > 0 && (
                              <tr>
                                <td colSpan={3} className="px-3 py-1.5 text-right text-sm text-green-700">Paid</td>
                                <td className="px-3 py-1.5 text-sm text-green-700 text-right">{fmtAmt(inv.paidAmount)}</td>
                              </tr>
                            )}
                            {balance > 0 && inv.status !== 'CANCELLED' && (
                              <tr>
                                <td colSpan={3} className="px-3 py-1.5 text-right text-sm font-bold text-amber-700">Balance Due</td>
                                <td className="px-3 py-1.5 text-sm font-bold text-amber-700 text-right">{fmtAmt(balance)}</td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">No line items</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
