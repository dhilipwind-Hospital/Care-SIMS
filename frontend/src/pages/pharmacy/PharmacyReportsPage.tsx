import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DollarSign, Pill, Clock, TrendingDown, Download, CalendarRange } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';
import { exportTableToCsv } from '../../lib/export';

/* ── helpers ───────────────────────────────────────────── */

function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function PharmacyReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [topSelling, setTopSelling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  useEffect(() => {
    Promise.all([
      api.get('/pharmacy/low-stock').catch((err) => { console.error('Failed to fetch low-stock data:', err); return { data: null }; }),
      api.get('/pharmacy/expiry-alerts', { params: { daysAhead: 30 } }).catch((err) => { console.error('Failed to fetch expiry alerts:', err); return { data: [] }; }),
    ]).then(([s, t]) => {
      setSummary(s.data);
      setTopSelling(t.data?.data || t.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const quickReports = [
    { label: 'Daily Dispensing Report', endpoint: '/reports/pharmacy/daily', filename: 'daily-dispensing' },
    { label: 'Monthly Revenue Report', endpoint: '/reports/pharmacy/revenue', filename: 'monthly-revenue' },
    { label: 'Stock Valuation Report', endpoint: '/reports/pharmacy/stock-valuation', filename: 'stock-valuation' },
    { label: 'Expiry Report', endpoint: '/reports/pharmacy/expiry', filename: 'expiry-report' },
    { label: 'Controlled Substance Audit', endpoint: '/reports/pharmacy/controlled', filename: 'controlled-audit' },
    { label: 'Slow-Moving Stock Report', endpoint: '/reports/pharmacy/slow-moving', filename: 'slow-moving-stock' },
  ];

  const downloadReport = async (endpoint: string, label: string, filename: string) => {
    try {
      const { data } = await api.get(endpoint, { params: { from, to } });
      // Flatten whatever shape the API returns into rows for CSV
      const rows: { key: string; value: string }[] = Array.isArray(data)
        ? data.map((item: any) => ({ key: JSON.stringify(item), value: '' }))
        : Object.entries(data as Record<string, unknown>).map(([k, v]) => ({ key: k, value: String(v) }));
      exportTableToCsv(
        [{ header: 'Key', key: 'key' }, { header: 'Value', key: 'value' }],
        rows,
        `${filename}-${from}-to-${to}.csv`,
      );
      toast.success(`${label} downloaded`);
    } catch { toast.error('Report unavailable'); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Pharmacy Reports" subtitle="Performance metrics and insights"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Download size={15} /> Export Report
          </button>
        }
      />

      {/* Quick presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Quick:</span>
        {[
          { label: 'Today', fn: () => { const t = new Date().toISOString().slice(0, 10); setFrom(t); setTo(t); } },
          { label: 'This Week', fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setFrom(mon.toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); } },
          { label: 'This Month', fn: () => { const now = new Date(); setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); } },
          { label: 'Last Month', fn: () => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth() - 1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); setFrom(first.toISOString().slice(0, 10)); setTo(last.toISOString().slice(0, 10)); } },
          { label: 'Last 3 Months', fn: () => { const now = new Date(); const t = new Date(now); t.setMonth(t.getMonth() - 3); setFrom(t.toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); } },
          { label: 'This Year', fn: () => { const now = new Date(); setFrom(`${now.getFullYear()}-01-01`); setTo(now.toISOString().slice(0, 10)); } },
        ].map(p => (
          <button key={p.label} onClick={p.fn}
            className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <CalendarRange size={16} className="text-gray-400" />
        <label className="text-sm text-gray-500 font-medium">From</label>
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none"
        />
        <label className="text-sm text-gray-500 font-medium">To</label>
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Revenue" value={`₹${(summary?.revenue || 0).toLocaleString('en-IN')}`} icon={DollarSign} color="#0F766E" />
        <KpiCard label="Prescriptions Filled" value={summary?.prescriptionsFilled ?? '—'} icon={Pill} color="#3B82F6" />
        <KpiCard label="Avg. Turnaround" value={`${summary?.avgTurnaroundMins ?? '—'} min`} icon={Clock} color="#10B981" />
        <KpiCard label="Return Rate" value={`${summary?.returnRate ?? '—'}%`} icon={TrendingDown} color="#F59E0B" />
      </div>

      {loading ? <div className="hms-card p-10 text-center text-gray-400 text-sm">Loading...</div> : (
        <div className="grid grid-cols-2 gap-6">
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Top Selling Medications</h3>
            </div>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Drug Name</th><th className="px-4 py-3">Qty Dispensed</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">% Total</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {topSelling.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No data available</td></tr> :
                  topSelling.slice(0, 10).map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.drugName || d.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.quantityDispensed ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">₹{(d.revenue || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.percentageOfTotal ?? '—'}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="hms-card p-5">
            <h3 className="font-bold text-gray-900 mb-4">Quick Reports</h3>
            <div className="space-y-2">
              {quickReports.map(r => (
                <button key={r.endpoint} onClick={() => downloadReport(r.endpoint, r.label, r.filename)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-teal-300 transition-all text-left">
                  <span>{r.label}</span>
                  <Download size={14} className="text-teal-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
