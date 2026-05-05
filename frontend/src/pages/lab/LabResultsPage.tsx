import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, CheckCircle, AlertTriangle, Clock, Search, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../lib/api';

export default function LabResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/lab/results', { params: { q: search || undefined, limit: 50 } });
      setResults(data.data || []);
    } catch (err) { toast.error('Failed to load lab results'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [search]);

  const pendingValidation = results.filter(r => r.status === 'PENDING_VALIDATION').length;
  const validated = results.filter(r => r.status === 'VALIDATED').length;
  const critical = results.filter(r => r.status === 'CRITICAL_NOTIFIED').length;

  const flagColor: Record<string, string> = {
    NORMAL: 'text-gray-700',
    H: 'text-amber-600 font-semibold',
    L: 'text-amber-600 font-semibold',
    HH: 'text-red-600 font-bold',
    LL: 'text-red-600 font-bold',
  };

  const handlePrintLabReport = (order: any) => {
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;
    const results = order.results || order.testResults || [];
    const patientName = order.patient
      ? `${order.patient.firstName || ''} ${order.patient.lastName || ''}`.trim()
      : order.patientName || '—';
    const flagColorPrint: Record<string, string> = {
      HH: 'color:#dc2626;font-weight:bold',
      LL: 'color:#dc2626;font-weight:bold',
      H: 'color:#d97706;font-weight:600',
      L: 'color:#d97706;font-weight:600',
      NORMAL: 'color:#111',
    };
    const html = `<!DOCTYPE html><html><head><title>Lab Report</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
      .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px double #0F766E; padding-bottom:16px; margin-bottom:20px; }
      .hospital-name { font-size:22px; font-weight:900; color:#0F766E; }
      .hospital-sub { font-size:11px; color:#666; margin-top:2px; }
      .report-meta { text-align:right; }
      .report-title { font-size:18px; font-weight:800; letter-spacing:2px; color:#333; }
      .report-num { font-size:13px; color:#0F766E; font-weight:700; margin-top:4px; }
      .report-date { font-size:11px; color:#666; margin-top:2px; }
      .patient-box { background:#f0fdfa; border:1px solid #ccfbf1; border-radius:6px; padding:12px 16px; margin-bottom:20px; display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
      .field label { font-size:10px; color:#6b7280; text-transform:uppercase; font-weight:600; display:block; }
      .field p { font-size:13px; font-weight:500; }
      .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#0F766E; margin-bottom:8px; margin-top:16px; }
      table { width:100%; border-collapse:collapse; margin-bottom:16px; }
      th { background:#f0fdfa; color:#0F766E; font-size:11px; font-weight:700; text-transform:uppercase; padding:8px 10px; text-align:left; border:1px solid #e5e7eb; }
      td { padding:8px 10px; border:1px solid #e5e7eb; font-size:12px; }
      tr:nth-child(even) td { background:#fafafa; }
      .critical-row td { background:#fff1f2 !important; }
      .notes-box { background:#fafafa; border:1px solid #e5e7eb; border-radius:6px; padding:12px 16px; margin-bottom:16px; font-size:12px; }
      .footer { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; }
      .sig-box { text-align:center; }
      .sig-line { border-top:1px solid #333; margin-top:40px; margin-bottom:6px; }
      .sig-label { font-size:11px; color:#555; }
      .status-badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700; }
      @media print { body { padding:20px; } }
    </style></head><body>
    <div class="header">
      <div>
        <div class="hospital-name">AYPHEN HMS</div>
        <div class="hospital-sub">Laboratory Services</div>
      </div>
      <div class="report-meta">
        <div class="report-title">LAB REPORT</div>
        <div class="report-num">${order.orderNumber || order.id?.slice(0,8) || '—'}</div>
        <div class="report-date">Reported: ${order.reportedAt ? new Date(order.reportedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
        <span class="status-badge" style="background:${order.status === 'VALIDATED' ? '#dcfce7' : '#dbeafe'};color:${order.status === 'VALIDATED' ? '#166534' : '#1e40af'}">${order.status || '—'}</span>
      </div>
    </div>

    <div class="patient-box">
      <div class="field"><label>Patient Name</label><p>${patientName}</p></div>
      <div class="field"><label>Patient ID</label><p>${order.patient?.patientId || order.patientId || '—'}</p></div>
      <div class="field"><label>Ordered By</label><p>${order.doctor ? (order.doctor.firstName || '') + ' ' + (order.doctor.lastName || '') : (order.doctorName || '—')}</p></div>
      <div class="field"><label>Sample Date</label><p>${order.collectedAt ? new Date(order.collectedAt).toLocaleDateString('en-IN') : '—'}</p></div>
    </div>

    <div class="section-title">Test Results</div>
    <table>
      <thead><tr>
        <th>Test Name</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th><th>Method</th>
      </tr></thead>
      <tbody>
        ${results.length > 0 ? results.map((r: any) => `
          <tr class="${r.abnormalFlag === 'HH' || r.abnormalFlag === 'LL' ? 'critical-row' : ''}">
            <td>${r.testName || r.name || '—'}</td>
            <td style="${flagColorPrint[r.abnormalFlag] || flagColorPrint.NORMAL}"><strong>${r.resultValue || r.value || '—'}</strong></td>
            <td>${r.resultUnit || r.unit || '—'}</td>
            <td>${r.referenceRange || '—'}</td>
            <td style="${flagColorPrint[r.abnormalFlag] || flagColorPrint.NORMAL}">${r.abnormalFlag || 'Normal'}</td>
            <td>${r.method || '—'}</td>
          </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#9ca3af">No results entered</td></tr>'}
      </tbody>
    </table>

    ${order.notes || order.labNotes ? `
    <div class="notes-box">
      <strong>Lab Notes:</strong> ${order.notes || order.labNotes}
    </div>` : ''}

    ${results.some((r: any) => r.abnormalFlag === 'HH' || r.abnormalFlag === 'LL') ? `
    <div style="background:#fff1f2;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#dc2626;font-weight:600">
      ⚠ CRITICAL VALUES PRESENT — Physician has been notified
    </div>` : ''}

    <div class="footer">
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Lab Technician</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Pathologist / Authorized Signatory</div></div>
    </div>

    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Lab Test Results" subtitle="View and manage test results" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Results" value={results.length} icon={FlaskConical} color="#0F766E" />
        <KpiCard label="Pending Validation" value={pendingValidation} icon={Clock} color="#F59E0B" />
        <KpiCard label="Validated" value={validated} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Critical" value={critical} icon={AlertTriangle} color="#EF4444" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 hms-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Results</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          {loading ? <div className="p-10 text-center text-gray-400 text-sm">Loading...</div> : (
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Result #</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Tests</th>
                <th className="px-4 py-3">Completed</th><th className="px-4 py-3">Validated By</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {results.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No results found</td></tr> :
                  results.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50 cursor-pointer ${r.status === 'CRITICAL_NOTIFIED' ? 'bg-red-50' : ''}`} onClick={() => setSelected(r)}>
                      <td className="px-4 py-3 text-sm font-medium text-teal-700">{r.resultNumber || r.id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{r.patient?.firstName} {r.patient?.lastName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.labOrder?.tests?.length ?? 1} test(s)</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.validatedBy?.firstName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING_VALIDATION' && (
                          <button onClick={async (e) => { e.stopPropagation(); await api.post(`/lab/results/${r.id}/validate`); fetch(); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100">Validate</button>
                        )}
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
                  <button onClick={() => handlePrintLabReport(selected)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">
                    <Printer size={12} /> Print Report
                  </button>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
                </div>
              </div>
              <div className="space-y-2 text-sm mb-5">
                <div><span className="text-gray-500">Patient:</span> <span className="font-medium">{selected.patient?.firstName} {selected.patient?.lastName}</span></div>
                <div><span className="text-gray-500">Sample ID:</span> <span className="font-medium">{selected.sampleId || '—'}</span></div>
                <div><span className="text-gray-500">Collection:</span> <span className="font-medium">{selected.collectionTime ? new Date(selected.collectionTime).toLocaleString() : '—'}</span></div>
                <div><span className="text-gray-500">TAT:</span> <span className="font-medium">{selected.tatMinutes ? `${selected.tatMinutes} min` : '—'}</span></div>
              </div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Test Results</h4>
              <div className="space-y-2">
                {(selected.resultEntries || selected.entries || []).map((e: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{e.testName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Ref: {e.referenceRange || '—'} {e.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${flagColor[e.flag] || 'text-gray-900'}`}>{e.resultValue} {e.unit}</div>
                        {e.flag && e.flag !== 'NORMAL' && <span className={`text-xs font-bold ${flagColor[e.flag]}`}>{e.flag}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {(!selected.resultEntries?.length && !selected.entries?.length) && <p className="text-sm text-gray-400 text-center py-4">No result entries</p>}
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
    </div>
  );
}
