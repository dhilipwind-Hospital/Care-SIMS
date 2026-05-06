import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, RefreshCw, ChevronDown, ChevronUp, Calendar, AlertTriangle, CheckCircle, Clock, Printer } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

const STATUS_STYLES: Record<string, string> = {
  ORDERED:             'bg-blue-100 text-blue-700',
  SAMPLE_COLLECTED:    'bg-amber-100 text-amber-700',
  IN_PROGRESS:         'bg-purple-100 text-purple-700',
  RESULTED:            'bg-green-100 text-green-700',
  PENDING_VALIDATION:  'bg-orange-100 text-orange-700',
  VALIDATED:           'bg-teal-100 text-teal-700',
  CANCELLED:           'bg-red-100 text-red-700',
};

const FLAG_STYLES: Record<string, string> = {
  NORMAL:   'text-green-600',
  HIGH:     'text-red-600',
  LOW:      'text-amber-600',
  CRITICAL: 'text-red-700 font-bold',
  PANIC:    'text-red-800 font-black',
};

export default function PatientLabReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const user = getUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/patient/me/lab-reports');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) { toast.error('Failed to load lab reports'); setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handlePrintLabReport = (order: any) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const resultRows = (order.results || []).flatMap((result: any) =>
      (result.items || []).map((item: any) => `
        <tr style="background:${item.flag === 'CRITICAL' || item.flag === 'PANIC' ? '#fef2f2' : 'transparent'}">
          <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;">${item.testName || '—'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${item.flag === 'HIGH' || item.flag === 'CRITICAL' || item.flag === 'PANIC' ? '#dc2626' : item.flag === 'LOW' ? '#d97706' : '#111'};">${item.resultValue ?? '—'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;">${item.resultUnit || '—'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#6b7280;">${item.refRangeText || (item.refRangeLow != null ? `${item.refRangeLow}–${item.refRangeHigh}` : '—')}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;font-weight:700;color:${item.flag === 'HIGH' || item.flag === 'CRITICAL' || item.flag === 'PANIC' ? '#dc2626' : item.flag === 'LOW' ? '#d97706' : '#16a34a'};">${item.flag || 'NORMAL'}</td>
        </tr>`)
    ).join('');
    const testsList = (order.items || []).map((t: any) => t.testName).join(', ');
    win.document.write(`<!DOCTYPE html><html><head><title>Lab Report ${order.orderNumber}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;}h1{margin:0;font-size:22px;font-weight:900;color:#0F766E;}h2{margin:4px 0 12px;font-size:16px;font-weight:700;}hr{border:none;border-top:2px solid #0F766E;margin:12px 0;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:16px;}.field label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px;}.field span{display:block;font-size:13px;font-weight:600;margin-top:2px;}table{width:100%;border-collapse:collapse;}thead th{background:#f9fafb;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;}.critical-banner{background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 14px;color:#dc2626;font-weight:700;font-size:13px;margin-bottom:14px;}@media print{body{padding:16px;}}</style>
</head><body>
<h1>AYPHEN HMS</h1><h2>LAB REPORT</h2><hr/>
${order.results?.some((r: any) => r.isCritical) ? '<div class="critical-banner">⚠ CRITICAL VALUES PRESENT — Notify physician immediately</div>' : ''}
<div class="grid">
  <div class="field"><label>Order #</label><span>${order.orderNumber || '—'}</span></div>
  <div class="field"><label>Date</label><span>${fmt(order.orderedAt)}</span></div>
  <div class="field"><label>Patient</label><span>${user ? `${user.firstName} ${user.lastName}` : '—'}</span></div>
  <div class="field"><label>Hospital</label><span>${user?.tenantName || '—'}</span></div>
  <div class="field"><label>Status</label><span>${order.status?.replace(/_/g, ' ') || '—'}</span></div>
  <div class="field"><label>Priority</label><span>${order.priority || 'ROUTINE'}</span></div>
</div>
<p style="font-size:12px;color:#6b7280;margin-bottom:12px;"><strong>Tests:</strong> ${testsList || '—'}</p>
<table>
  <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead>
  <tbody>${resultRows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#9ca3af;">Results pending</td></tr>'}</tbody>
</table>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;">
  <div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Lab Technician</div>
  <div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Pathologist</div>
  <div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Date</div>
</div>
<script>window.onload=function(){window.print();}</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lab Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} lab orders at {user?.tenantName}</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FlaskConical size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No lab reports found</p>
          <p className="text-gray-400 text-sm mt-1">Lab orders and test results will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const isOpen = expanded === order.id;
            const hasResults = order.results?.length > 0;
            const hasCritical = order.results?.some((r: any) => r.isCritical);
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button className="w-full text-left p-5 hover:bg-gray-50 transition-colors" onClick={() => setExpanded(isOpen ? null : order.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${hasCritical ? 'bg-red-50' : 'bg-rose-50'}`}>
                        {hasCritical
                          ? <AlertTriangle size={20} className="text-red-600" />
                          : hasResults
                            ? <CheckCircle size={20} className="text-green-600" />
                            : <Clock size={20} className="text-rose-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{order.orderNumber}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                          {hasCritical && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">CRITICAL VALUES</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={11} /> {fmt(order.orderedAt)}
                          </span>
                          <span className="text-xs text-gray-500">{order.items?.length || 0} test(s)</span>
                          {order.priority !== 'ROUTINE' && (
                            <span className="text-xs font-semibold text-orange-600">{order.priority}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {order.results?.length > 0 && <button onClick={e => { e.stopPropagation(); handlePrintLabReport(order); }} className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium"><Printer size={11} /> Print</button>}
                      {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 px-5 pb-4">
                    {/* Tests ordered */}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide my-3">Tests Ordered</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {order.items?.map((t: any, idx: number) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{t.testName}</span>
                      ))}
                    </div>

                    {/* Results */}
                    {order.results?.length > 0 && order.results.map((result: any) => (
                      <div key={result.id}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Results</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 rounded-xl">
                                <th className="text-left text-xs text-gray-500 font-semibold px-3 py-2 rounded-l-xl">Test</th>
                                <th className="text-left text-xs text-gray-500 font-semibold px-3 py-2">Result</th>
                                <th className="text-left text-xs text-gray-500 font-semibold px-3 py-2">Unit</th>
                                <th className="text-left text-xs text-gray-500 font-semibold px-3 py-2">Reference</th>
                                <th className="text-left text-xs text-gray-500 font-semibold px-3 py-2 rounded-r-xl">Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.items?.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-50">
                                  <td className="px-3 py-2 text-gray-800 font-medium">{item.testName}</td>
                                  <td className={`px-3 py-2 font-semibold ${FLAG_STYLES[item.flag] || 'text-gray-800'}`}>{item.resultValue}</td>
                                  <td className="px-3 py-2 text-gray-500">{item.resultUnit || '—'}</td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">
                                    {item.refRangeText || (item.refRangeLow != null && item.refRangeHigh != null ? `${item.refRangeLow} - ${item.refRangeHigh}` : '—')}
                                  </td>
                                  <td className={`px-3 py-2 text-xs font-semibold ${FLAG_STYLES[item.flag] || 'text-gray-500'}`}>{item.flag || 'NORMAL'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    {order.results?.length === 0 && (
                      <p className="text-sm text-gray-400 italic py-2">Results pending — check back later</p>
                    )}
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
