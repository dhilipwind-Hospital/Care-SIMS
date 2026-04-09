import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, AlertTriangle, CheckCircle, Clock, Printer, Eye, ClipboardEdit, X, Loader2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import ExportButton from '../../components/ui/ExportButton';
import api from '../../lib/api';
import { formatTime, formatDateTime } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 20;

const FLAG_OPTIONS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'H', label: 'High' },
  { value: 'L', label: 'Low' },
  { value: 'HH', label: 'Critical High' },
  { value: 'LL', label: 'Critical Low' },
];

export default function LabPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [resultOrder, setResultOrder] = useState<any>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultItems, setResultItems] = useState<any[]>([]);
  const [resultNotes, setResultNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/lab/orders', { params: { status: statusFilter || undefined, page, limit: PAGE_SIZE } });
      setOrders(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load lab orders'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, page]);

  const received = orders.filter(o => ['SAMPLE_COLLECTED','IN_PROGRESS'].includes(o.status)).length;
  const ready = orders.filter(o => ['RESULTED','VALIDATED'].includes(o.status)).length;
  const critical = orders.filter(o => o.results?.some((r: any) => r.isCritical)).length;

  const [actionId, setActionId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    setActionId(id);
    try {
      await api.patch(`/lab/orders/${id}/status`, { status });
      toast.success('Status updated');
      fetchOrders();
    } catch (err) { toast.error('Failed to update status'); }
    finally { setActionId(null); }
  };

  // Fetch order detail for View modal
  const openViewOrder = async (orderId: string) => {
    setViewLoading(true);
    setViewOrder(null);
    try {
      const { data } = await api.get(`/lab/orders/${orderId}`);
      setViewOrder(data);
    } catch (err) {
      toast.error('Failed to load order details');
    } finally {
      setViewLoading(false);
    }
  };

  // Fetch order detail and open Enter Results modal
  const openEnterResults = async (orderId: string) => {
    setResultLoading(true);
    setResultOrder(null);
    try {
      const { data } = await api.get(`/lab/orders/${orderId}`);
      setResultOrder(data);
      // Initialize form rows from order items
      const items = (data.items || data.tests || []).map((item: any) => ({
        testName: item.testName || item.name || '',
        testCode: item.testCode || '',
        resultValue: '',
        resultUnit: '',
        refRangeText: '',
        flag: 'NORMAL',
        remarks: '',
      }));
      setResultItems(items);
      setResultNotes('');
    } catch (err) {
      toast.error('Failed to load order details');
    } finally {
      setResultLoading(false);
    }
  };

  const updateResultItem = (index: number, field: string, value: string) => {
    setResultItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSubmitResults = async () => {
    if (!resultOrder) return;

    // Validate that all items have a result value
    const incomplete = resultItems.some(item => !item.resultValue.trim());
    if (incomplete) {
      toast.error('Please enter result values for all tests');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/lab/orders/${resultOrder.id}/results`, {
        locationId: resultOrder.locationId,
        notes: resultNotes || undefined,
        items: resultItems.map(item => ({
          testName: item.testName,
          resultValue: item.resultValue,
          resultUnit: item.resultUnit || undefined,
          refRangeText: item.refRangeText || undefined,
          flag: item.flag,
          remarks: item.remarks || undefined,
        })),
      });

      // Update order status to RESULTS_ENTERED
      try {
        await api.patch(`/lab/orders/${resultOrder.id}/status`, { status: 'RESULTED' });
      } catch (_) { /* status update is best-effort */ }

      toast.success('Results entered successfully');
      setResultOrder(null);
      setResultItems([]);
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReport = (o: any) => {
    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) return;
    const resultRows = (o.results || o.tests || []).map((r: any) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.testName || r.name || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;${r.isCritical ? 'color:#dc2626' : ''}">${r.result || r.value || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.unit || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.referenceRange || r.normalRange || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.isCritical ? '<span style="color:#dc2626;font-weight:700">CRITICAL</span>' : 'Normal'}</td>
      </tr>`
    ).join('');
    const orgName = user?.tenantName || 'Hospital';
    const orgContact = [user?.tenantPrimaryPhone, user?.tenantPrimaryEmail].filter(Boolean).join(' · ');
    const orgLogoImg = user?.tenantLogoUrl ? `<img src="${user.tenantLogoUrl}" alt="${orgName}" style="height:40px;max-width:160px;object-fit:contain;margin-bottom:4px" />` : '';
    const html = `<!DOCTYPE html><html><head><title>Lab Report — ${o.orderNumber}</title>
      <style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:40px;color:#1f2937}
      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f766e;padding-bottom:16px;margin-bottom:24px}
      .logo{font-size:20px;font-weight:700;color:#0f766e}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f9fafb;text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
      .info-item{font-size:13px}.info-label{color:#6b7280;font-size:11px;margin-bottom:2px}
      .footer{margin-top:48px;display:flex;justify-content:space-between;font-size:13px;color:#6b7280}
      @media print{body{padding:20px}}</style></head>
      <body>
        <div class="header">
          <div>${orgLogoImg}<div class="logo">${orgName}</div>${orgContact ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${orgContact}</div>` : ''}</div>
          <div style="text-align:right;font-size:13px;color:#6b7280">
            <div style="font-weight:600;color:#1f2937">${o.orderNumber}</div>
            <div>${new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
        </div>
        <h2 style="text-align:center;margin:0 0 20px;font-size:16px;color:#0f766e">LABORATORY REPORT</h2>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Patient</div><strong>${o.patient?.firstName || ''} ${o.patient?.lastName || ''}</strong> (${o.patient?.patientId || '—'})</div>
          <div class="info-item"><div class="info-label">Referred By</div><strong>${o.doctor ? 'Dr. ' + o.doctor.firstName + ' ' + (o.doctor.lastName || '') : '—'}</strong></div>
          <div class="info-item"><div class="info-label">Sample Collected</div>${o.collectedAt ? new Date(o.collectedAt).toLocaleString('en-IN') : '—'}</div>
          <div class="info-item"><div class="info-label">Status</div>${o.status?.replace(/_/g, ' ')}</div>
        </div>
        <table>
          <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead>
          <tbody>${resultRows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af">No results available</td></tr>'}</tbody>
        </table>
        <div class="footer">
          <div><div style="margin-bottom:30px">Lab Technician</div><div>_________________________</div></div>
          <div><div style="margin-bottom:30px">Pathologist</div><div>_________________________</div></div>
        </div>
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Laboratory" subtitle="Sample processing and test results"
        actions={<ExportButton endpoint="/lab/orders/export" params={{ status: statusFilter || undefined }} filename={`lab-orders-${new Date().toISOString().slice(0, 10)}.csv`} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Samples Received" value={orders.length} icon={FlaskConical} color="#0F766E" />
        <KpiCard label="In Progress" value={received} icon={Clock} color="#F97316" />
        <KpiCard label="Results Ready" value={ready} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Critical Results" value={critical} icon={AlertTriangle} color="#EF4444" />
      </div>

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
          <h3 className="font-semibold text-gray-800">Sample Tracking</h3>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Status</option>
            {['ORDERED','SAMPLE_COLLECTED','IN_PROGRESS','RESULTED','VALIDATED'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Order #','Patient','Doctor','Tests','Collected By','Collection Time','Status','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="p-0"><EmptyState title="No lab orders" description="No lab orders found for the selected filters." /></td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className={`hover:bg-gray-50 ${o.status === 'CRITICAL' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-teal-700">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{o.patient?.firstName} {o.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">{o.patient?.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.doctor ? `Dr. ${o.doctor.firstName}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.tests?.map((t: any) => t.testName).join(', ') || o.items?.map((t: any) => t.testName).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.collectedById || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.collectedAt ? formatTime(o.collectedAt) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {/* View button — available on all orders */}
                      <button onClick={() => openViewOrder(o.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">
                        <Eye size={11} /> View
                      </button>

                      {o.status === 'ORDERED' && (
                        <button onClick={() => updateStatus(o.id, 'SAMPLE_COLLECTED')} disabled={actionId === o.id}
                          className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium disabled:opacity-50">
                          {actionId === o.id ? 'Updating...' : 'Mark Collected'}</button>
                      )}
                      {o.status === 'SAMPLE_COLLECTED' && (
                        <button onClick={() => updateStatus(o.id, 'IN_PROGRESS')} disabled={actionId === o.id}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium disabled:opacity-50">
                          {actionId === o.id ? 'Updating...' : 'Start Processing'}</button>
                      )}

                      {/* Enter Results — available for SAMPLE_COLLECTED and IN_PROGRESS */}
                      {['SAMPLE_COLLECTED', 'IN_PROGRESS'].includes(o.status) && (
                        <button onClick={() => openEnterResults(o.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium">
                          <ClipboardEdit size={11} /> Enter Results
                        </button>
                      )}

                      {o.status === 'IN_PROGRESS' && (
                        <button onClick={() => updateStatus(o.id, 'RESULTED')} disabled={actionId === o.id}
                          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium disabled:opacity-50">
                          {actionId === o.id ? 'Updating...' : 'Mark Resulted'}</button>
                      )}
                      {['RESULTED', 'VALIDATED'].includes(o.status) && (
                        <button onClick={() => handlePrintReport(o)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">
                          <Printer size={11} /> Print Report
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
      </div>

      {/* ===== View Order Detail Modal ===== */}
      {(viewOrder || viewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { if (!viewLoading) setViewOrder(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {viewLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-teal-600" />
                <span className="ml-3 text-sm text-gray-500">Loading order details...</span>
              </div>
            ) : viewOrder && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                  <div>
                    <h2 className="font-bold text-gray-900">Order {viewOrder.orderNumber}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Created {formatDateTime(viewOrder.orderedAt || viewOrder.createdAt)}</p>
                  </div>
                  <button onClick={() => setViewOrder(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Patient & Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Patient</h4>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{viewOrder.patient?.firstName} {viewOrder.patient?.lastName}</div>
                        <div className="text-gray-500">{viewOrder.patient?.patientId || '—'}</div>
                        {viewOrder.patient?.gender && <div className="text-gray-500">{viewOrder.patient.gender}{viewOrder.patient.ageYears ? `, ${viewOrder.patient.ageYears} yrs` : ''}</div>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Order Info</h4>
                      <div className="text-sm space-y-1">
                        <div><span className="text-gray-500">Status:</span> <StatusBadge status={viewOrder.status} /></div>
                        <div><span className="text-gray-500">Priority:</span> <span className="font-medium">{viewOrder.priority || 'ROUTINE'}</span></div>
                        {viewOrder.clinicalNotes && <div><span className="text-gray-500">Notes:</span> <span className="text-gray-700">{viewOrder.clinicalNotes}</span></div>}
                      </div>
                    </div>
                  </div>

                  {/* Test Items */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Test Items</h4>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                            <th className="px-4 py-2.5 text-left">Test Name</th>
                            <th className="px-4 py-2.5 text-left">Code</th>
                            <th className="px-4 py-2.5 text-left">Category</th>
                            <th className="px-4 py-2.5 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(viewOrder.items || viewOrder.tests || []).map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{item.testName || item.name}</td>
                              <td className="px-4 py-2.5 text-gray-500">{item.testCode || '—'}</td>
                              <td className="px-4 py-2.5 text-gray-500">{item.category || '—'}</td>
                              <td className="px-4 py-2.5"><StatusBadge status={item.status || 'PENDING'} /></td>
                            </tr>
                          ))}
                          {!(viewOrder.items?.length || viewOrder.tests?.length) && (
                            <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No test items</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Results if any */}
                  {viewOrder.results?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Results</h4>
                      {viewOrder.results.map((result: any, rIdx: number) => (
                        <div key={rIdx} className="border border-gray-100 rounded-lg overflow-hidden mb-3">
                          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-700">Result #{rIdx + 1}</span>
                            <StatusBadge status={result.status} />
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs font-semibold text-gray-500 uppercase bg-gray-50/50">
                                <th className="px-4 py-2 text-left">Test</th>
                                <th className="px-4 py-2 text-left">Result</th>
                                <th className="px-4 py-2 text-left">Unit</th>
                                <th className="px-4 py-2 text-left">Reference</th>
                                <th className="px-4 py-2 text-left">Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {(result.items || []).map((entry: any, eIdx: number) => (
                                <tr key={eIdx}>
                                  <td className="px-4 py-2 font-medium text-gray-900">{entry.testName}</td>
                                  <td className="px-4 py-2 font-semibold">{entry.resultValue || '—'}</td>
                                  <td className="px-4 py-2 text-gray-500">{entry.resultUnit || '—'}</td>
                                  <td className="px-4 py-2 text-gray-500">{entry.refRangeText || (entry.refRangeLow != null && entry.refRangeHigh != null ? `${entry.refRangeLow} - ${entry.refRangeHigh}` : '—')}</td>
                                  <td className="px-4 py-2">
                                    <span className={`text-xs font-bold ${entry.flag === 'NORMAL' ? 'text-green-600' : ['HH','LL','CRITICAL'].includes(entry.flag) ? 'text-red-600' : 'text-amber-600'}`}>
                                      {entry.flag || '—'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                  <button onClick={() => setViewOrder(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Enter Results Modal ===== */}
      {(resultOrder || resultLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { if (!submitting && !resultLoading) { setResultOrder(null); setResultItems([]); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {resultLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-teal-600" />
                <span className="ml-3 text-sm text-gray-500">Loading order details...</span>
              </div>
            ) : resultOrder && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                  <div>
                    <h2 className="font-bold text-gray-900">Enter Results — {resultOrder.orderNumber}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Patient: {resultOrder.patient?.firstName} {resultOrder.patient?.lastName} ({resultOrder.patient?.patientId || '—'})
                    </p>
                  </div>
                  <button onClick={() => { if (!submitting) { setResultOrder(null); setResultItems([]); } }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Result entry table */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                          <th className="px-3 py-2.5 text-left w-[180px]">Test Name</th>
                          <th className="px-3 py-2.5 text-left w-[120px]">Result *</th>
                          <th className="px-3 py-2.5 text-left w-[90px]">Unit</th>
                          <th className="px-3 py-2.5 text-left w-[130px]">Reference Range</th>
                          <th className="px-3 py-2.5 text-left w-[130px]">Flag</th>
                          <th className="px-3 py-2.5 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {resultItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-gray-900 text-sm">{item.testName}</div>
                              {item.testCode && <div className="text-xs text-gray-400">{item.testCode}</div>}
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={item.resultValue}
                                onChange={e => updateResultItem(idx, 'resultValue', e.target.value)}
                                placeholder="Enter value"
                                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={item.resultUnit}
                                onChange={e => updateResultItem(idx, 'resultUnit', e.target.value)}
                                placeholder="e.g. mg/dL"
                                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={item.refRangeText}
                                onChange={e => updateResultItem(idx, 'refRangeText', e.target.value)}
                                placeholder="e.g. 70-100"
                                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <select
                                value={item.flag}
                                onChange={e => updateResultItem(idx, 'flag', e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              >
                                {FLAG_OPTIONS.map(f => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={item.remarks}
                                onChange={e => updateResultItem(idx, 'remarks', e.target.value)}
                                placeholder="Optional"
                                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </td>
                          </tr>
                        ))}
                        {resultItems.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No test items found in this order</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Additional Notes</label>
                    <textarea
                      value={resultNotes}
                      onChange={e => setResultNotes(e.target.value)}
                      rows={2}
                      placeholder="Optional notes about the results..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between sticky bottom-0 bg-white">
                  <p className="text-xs text-gray-400">* Result value is required for all tests</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { if (!submitting) { setResultOrder(null); setResultItems([]); } }}
                      disabled={submitting}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitResults}
                      disabled={submitting || resultItems.length === 0}
                      className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting && <Loader2 size={14} className="animate-spin" />}
                      {submitting ? 'Submitting...' : 'Submit Results'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
