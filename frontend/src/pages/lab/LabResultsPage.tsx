import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, CheckCircle, AlertTriangle, Clock, Search, Printer, Plus, X, RefreshCw } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const TABS = ['Orders', 'Results'] as const;
type Tab = typeof TABS[number];

const FLAG_OPTIONS = ['NORMAL', 'H', 'HH', 'L', 'LL', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'PANIC'];

const flagStyle: Record<string, string> = {
  NORMAL: 'text-gray-700',
  H: 'text-amber-600 font-semibold',
  L: 'text-amber-600 font-semibold',
  HH: 'text-red-600 font-bold',
  LL: 'text-red-600 font-bold',
  CRITICAL_HIGH: 'text-red-700 font-black',
  CRITICAL_LOW: 'text-red-700 font-black',
  PANIC: 'text-red-700 font-black',
};

export default function LabResultsPage() {
  const [tab, setTab] = useState<Tab>('Orders');

  // Orders tab
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Results tab
  const [results, setResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultSearch, setResultSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  // Enter results modal
  const [enterOrder, setEnterOrder] = useState<any>(null);
  const [resultItems, setResultItems] = useState<any[]>([]);
  const [labNotes, setLabNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data } = await api.get('/lab/orders', { params: { limit: 100, status: orderStatusFilter || undefined } });
      setOrders(data.data || []);
    } catch { toast.error('Failed to load lab orders'); }
    finally { setOrdersLoading(false); }
  }, [orderStatusFilter]);

  const loadResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const { data } = await api.get('/lab/results', { params: { q: resultSearch || undefined, limit: 100 } });
      setResults(data.data || []);
    } catch { toast.error('Failed to load lab results'); }
    finally { setResultsLoading(false); }
  }, [resultSearch]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadResults(); }, [loadResults]);

  const openEnterResults = (order: any) => {
    setEnterOrder(order);
    setLabNotes('');
    // Pre-populate one row per ordered test item
    const rows = (order.items || []).map((item: any) => ({
      testName: item.testName || '',
      resultValue: '',
      resultUnit: item.unit || '',
      refRangeLow: '',
      refRangeHigh: '',
      refRangeText: '',
      flag: 'NORMAL',
      method: '',
    }));
    setResultItems(rows.length > 0 ? rows : [{ testName: '', resultValue: '', resultUnit: '', refRangeLow: '', refRangeHigh: '', refRangeText: '', flag: 'NORMAL', method: '' }]);
  };

  const addResultRow = () => setResultItems(r => [...r, { testName: '', resultValue: '', resultUnit: '', refRangeLow: '', refRangeHigh: '', refRangeText: '', flag: 'NORMAL', method: '' }]);
  const removeResultRow = (i: number) => setResultItems(r => r.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: string, value: string) => setResultItems(r => r.map((row, idx) => idx === i ? { ...row, [key]: value } : row));

  const submitResults = async () => {
    if (!enterOrder) return;
    const incomplete = resultItems.some(r => !r.testName.trim() || !r.resultValue.trim());
    if (incomplete) { toast.error('All rows need a test name and result value'); return; }
    setSubmitting(true);
    try {
      const payload = {
        notes: labNotes || undefined,
        items: resultItems.map(r => ({
          testName: r.testName,
          resultValue: r.resultValue,
          resultUnit: r.resultUnit || undefined,
          refRangeLow: r.refRangeLow ? Number(r.refRangeLow) : undefined,
          refRangeHigh: r.refRangeHigh ? Number(r.refRangeHigh) : undefined,
          refRangeText: r.refRangeText || undefined,
          flag: r.flag !== 'NORMAL' ? r.flag : undefined,
          method: r.method || undefined,
        })),
      };
      await api.post(`/lab/orders/${enterOrder.id}/results`, payload);
      toast.success('Results entered successfully');
      setEnterOrder(null);
      loadOrders();
      loadResults();
      setTab('Results');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to enter results');
    } finally { setSubmitting(false); }
  };

  const validateResult = async (id: string) => {
    try {
      await api.patch(`/lab/results/${id}/validate`);
      toast.success('Result validated');
      loadResults();
    } catch { toast.error('Failed to validate'); }
  };

  const handlePrintLabReport = (order: any) => {
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;
    const items = order.results?.[0]?.items || order.resultEntries || order.entries || [];
    const patientName = order.patient
      ? `${order.patient.firstName || ''} ${order.patient.lastName || ''}`.trim()
      : order.patientName || '—';
    const flagColorPrint: Record<string, string> = {
      HH: 'color:#dc2626;font-weight:bold', LL: 'color:#dc2626;font-weight:bold',
      CRITICAL_HIGH: 'color:#dc2626;font-weight:bold', CRITICAL_LOW: 'color:#dc2626;font-weight:bold', PANIC: 'color:#dc2626;font-weight:bold',
      H: 'color:#d97706;font-weight:600', L: 'color:#d97706;font-weight:600', NORMAL: 'color:#111',
    };
    printWin.document.write(`<!DOCTYPE html><html><head><title>Lab Report</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:32px;}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #0F766E;padding-bottom:16px;margin-bottom:20px;}.hospital-name{font-size:22px;font-weight:900;color:#0F766E;}.patient-box{background:#f0fdfa;border:1px solid #ccfbf1;border-radius:6px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}.field label{font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;display:block;}.field p{font-size:13px;font-weight:500;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}th{background:#f0fdfa;color:#0F766E;font-size:11px;font-weight:700;text-transform:uppercase;padding:8px 10px;text-align:left;border:1px solid #e5e7eb;}td{padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;}tr:nth-child(even) td{background:#fafafa;}.footer{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;}.sig-box{text-align:center;}.sig-line{border-top:1px solid #333;margin-top:40px;margin-bottom:6px;}.sig-label{font-size:11px;color:#555;}@media print{body{padding:20px;}}</style>
</head><body>
<div class="header"><div><div class="hospital-name">AYPHEN HMS</div><div style="font-size:11px;color:#666">Laboratory Services</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:800;letter-spacing:2px">LAB REPORT</div><div style="font-size:11px;color:#666;margin-top:4px">Reported: ${new Date().toLocaleDateString('en-IN')}</div></div></div>
<div class="patient-box"><div class="field"><label>Patient</label><p>${patientName}</p></div><div class="field"><label>Patient ID</label><p>${order.patient?.patientId || '—'}</p></div><div class="field"><label>Order #</label><p>${order.orderNumber || '—'}</p></div><div class="field"><label>Priority</label><p>${order.priority || '—'}</p></div></div>
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0F766E;margin-bottom:8px">Test Results</div>
<table><thead><tr><th>Test Name</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th><th>Method</th></tr></thead><tbody>
${items.length > 0 ? items.map((r: any) => `<tr><td>${r.testName || '—'}</td><td style="${flagColorPrint[r.flag] || flagColorPrint.NORMAL}"><strong>${r.resultValue || '—'}</strong></td><td>${r.resultUnit || '—'}</td><td>${r.refRangeText || (r.refRangeLow != null ? `${r.refRangeLow}–${r.refRangeHigh}` : '—')}</td><td style="${flagColorPrint[r.flag] || flagColorPrint.NORMAL}">${r.flag || 'Normal'}</td><td>${r.method || '—'}</td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#9ca3af">No results entered</td></tr>'}
</tbody></table>
<div class="footer"><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Lab Technician</div></div><div class="sig-box"><div class="sig-line"></div><div class="sig-label">Pathologist / Authorized Signatory</div></div></div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
    printWin.document.close();
  };

  const filteredOrders = orders.filter(o => {
    if (orderSearch) {
      const s = orderSearch.toLowerCase();
      const name = `${o.patient?.firstName || ''} ${o.patient?.lastName || ''}`.toLowerCase();
      if (!name.includes(s) && !(o.orderNumber || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const pendingValidation = results.filter(r => r.status === 'PENDING_VALIDATION').length;
  const validated = results.filter(r => r.status === 'VALIDATED').length;
  const critical = results.filter(r => r.isCritical).length;
  const pendingOrders = orders.filter(o => o.status === 'ORDERED' || o.status === 'SAMPLE_COLLECTED').length;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Lab Results" subtitle="Enter and manage laboratory test results"
        actions={
          <button onClick={() => { loadOrders(); loadResults(); }} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-teal-600 transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Pending Orders" value={pendingOrders} icon={Clock} color="#F59E0B" />
        <KpiCard label="Pending Validation" value={pendingValidation} icon={FlaskConical} color="#3B82F6" />
        <KpiCard label="Validated" value={validated} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Critical Results" value={critical} icon={AlertTriangle} color="#EF4444" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'Orders' && pendingOrders > 0 && <span className="ml-2 text-xs bg-amber-500 text-white rounded-full px-1.5">{pendingOrders}</span>}
            {t === 'Results' && pendingValidation > 0 && <span className="ml-2 text-xs bg-blue-500 text-white rounded-full px-1.5">{pendingValidation}</span>}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === 'Orders' && (
        <div className="hms-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Lab Orders</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search patient/order..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="flex gap-1">
                {[['', 'All'], ['ORDERED', 'Ordered'], ['SAMPLE_COLLECTED', 'Sample Collected'], ['IN_PROGRESS', 'In Progress'], ['COMPLETED', 'Completed']].map(([v, l]) => (
                  <button key={v} onClick={() => setOrderStatusFilter(v)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${orderStatusFilter === v ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Order #</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Tests</th>
              <th className="px-4 py-3">Priority</th><th className="px-4 py-3">Ordered</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {ordersLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No orders found</td></tr>
              ) : filteredOrders.map(o => (
                <tr key={o.id} className={`hover:bg-gray-50 ${o.priority === 'STAT' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-teal-700">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {o.patient?.firstName} {o.patient?.lastName}
                    <div className="text-xs text-gray-400">{o.patient?.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(o.items || []).map((i: any) => i.testName).join(', ') || `${o.items?.length || 0} test(s)`}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${o.priority === 'STAT' ? 'bg-red-100 text-red-700' : o.priority === 'URGENT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{o.priority || 'ROUTINE'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.orderedAt ? new Date(o.orderedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(o.status === 'ORDERED' || o.status === 'SAMPLE_COLLECTED' || o.status === 'IN_PROGRESS') && (
                        <button onClick={() => openEnterResults(o)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium">
                          <Plus size={11} /> Enter Results
                        </button>
                      )}
                      {o.status === 'ORDERED' && (
                        <button onClick={async () => { await api.patch(`/lab/orders/${o.id}/status`, { status: 'SAMPLE_COLLECTED' }); loadOrders(); }}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">
                          Collected
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RESULTS TAB */}
      {tab === 'Results' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 hms-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Results</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={resultSearch} onChange={e => setResultSearch(e.target.value)} placeholder="Search patient..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            {resultsLoading ? <div className="p-10 text-center text-gray-400 text-sm">Loading...</div> : (
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Result #</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Tests</th>
                  <th className="px-4 py-3">Completed</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {results.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No results yet</td></tr> :
                    results.map(r => (
                      <tr key={r.id} className={`hover:bg-gray-50 cursor-pointer ${r.isCritical ? 'bg-red-50/60' : ''}`} onClick={() => setSelected(r)}>
                        <td className="px-4 py-3 text-sm font-medium text-teal-700">{r.resultNumber || r.id?.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{r.patient?.firstName} {r.patient?.lastName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.items?.length ?? 0} test(s){r.isCritical && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">CRITICAL</span>}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {r.status === 'PENDING_VALIDATION' && (
                              <button onClick={e => { e.stopPropagation(); validateResult(r.id); }}
                                className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Validate</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="hms-card p-5">
            {selected ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Result Detail</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePrintLabReport({ ...selected.labOrder, results: [selected] })}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">
                      <Printer size={12} /> Print
                    </button>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm mb-4">
                  <div><span className="text-gray-500">Patient:</span> <span className="font-medium">{selected.patient?.firstName} {selected.patient?.lastName}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className="font-medium">{selected.status}</span></div>
                  {selected.notes && <div><span className="text-gray-500">Notes:</span> <span className="font-medium">{selected.notes}</span></div>}
                </div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Test Values</h4>
                <div className="space-y-2">
                  {(selected.items || []).map((e: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg ${e.flag && e.flag !== 'NORMAL' ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{e.testName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Ref: {e.refRangeText || (e.refRangeLow != null ? `${e.refRangeLow}–${e.refRangeHigh}` : '—')} {e.resultUnit}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${flagStyle[e.flag] || 'text-gray-900'}`}>{e.resultValue} {e.resultUnit}</div>
                          {e.flag && e.flag !== 'NORMAL' && <span className={`text-xs font-bold ${flagStyle[e.flag]}`}>{e.flag}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!selected.items?.length && <p className="text-sm text-gray-400 text-center py-4">No result entries</p>}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center py-16">
                <FlaskConical size={32} className="mb-3 opacity-40" />
                <p>Click a result row to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENTER RESULTS MODAL */}
      {enterOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Enter Lab Results</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Order: <span className="font-medium text-teal-700">{enterOrder.orderNumber}</span>
                  {' · '}Patient: <span className="font-medium">{enterOrder.patient?.firstName} {enterOrder.patient?.lastName}</span>
                </p>
              </div>
              <button onClick={() => setEnterOrder(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                <div className="col-span-2">Test Name *</div>
                <div className="col-span-2">Result *</div>
                <div className="col-span-1">Unit</div>
                <div className="col-span-1">Ref Low</div>
                <div className="col-span-1">Ref High</div>
                <div className="col-span-2">Ref Text</div>
                <div className="col-span-2">Flag</div>
                <div className="col-span-1">Method</div>
              </div>

              {resultItems.map((item, i) => (
                <div key={i} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${item.flag && item.flag !== 'NORMAL' ? 'bg-red-50/50 border border-red-100' : 'bg-gray-50'}`}>
                  <div className="col-span-2">
                    <input value={item.testName} onChange={e => updateItem(i, 'testName', e.target.value)}
                      placeholder="e.g. Hemoglobin" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-2">
                    <input value={item.resultValue} onChange={e => updateItem(i, 'resultValue', e.target.value)}
                      placeholder="e.g. 13.2" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium" />
                  </div>
                  <div className="col-span-1">
                    <input value={item.resultUnit} onChange={e => updateItem(i, 'resultUnit', e.target.value)}
                      placeholder="g/dL" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-1">
                    <input value={item.refRangeLow} onChange={e => updateItem(i, 'refRangeLow', e.target.value)}
                      type="number" placeholder="12" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-1">
                    <input value={item.refRangeHigh} onChange={e => updateItem(i, 'refRangeHigh', e.target.value)}
                      type="number" placeholder="17" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-2">
                    <input value={item.refRangeText} onChange={e => updateItem(i, 'refRangeText', e.target.value)}
                      placeholder="12–17 g/dL" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-2">
                    <select value={item.flag} onChange={e => updateItem(i, 'flag', e.target.value)}
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold ${flagStyle[item.flag] || ''} ${item.flag !== 'NORMAL' ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                      {FLAG_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 flex gap-1">
                    <input value={item.method} onChange={e => updateItem(i, 'method', e.target.value)}
                      placeholder="Method" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                    {resultItems.length > 1 && (
                      <button onClick={() => removeResultRow(i)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button>
                    )}
                  </div>
                </div>
              ))}

              <button onClick={addResultRow} className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 font-medium">
                <Plus size={14} /> Add another test
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lab Notes</label>
                <textarea value={labNotes} onChange={e => setLabNotes(e.target.value)} rows={2}
                  placeholder="Any remarks or observations..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
              <button onClick={() => setEnterOrder(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={submitResults} disabled={submitting}
                className="px-6 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {submitting ? 'Submitting...' : 'Submit Results'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
