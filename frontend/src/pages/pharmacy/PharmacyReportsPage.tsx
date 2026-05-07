import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DollarSign, Pill, Clock, Download, CalendarRange, AlertTriangle, RefreshCw } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import { SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export default function PharmacyReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [expiry, setExpiry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rep, ls, ex] = await Promise.all([
        api.get('/reports/pharmacy', { params: { from, to } }),
        api.get('/pharmacy/low-stock').catch(() => ({ data: [] })),
        api.get('/pharmacy/expiry-alerts', { params: { daysAhead: 30 } }).catch(() => ({ data: [] })),
      ]);
      setSummary(rep.data?.data || rep.data || {});
      setLowStock(ls.data?.data || ls.data || []);
      setExpiry(ex.data?.data || ex.data || []);
    } catch { toast.error('Failed to load pharmacy reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExportCSV = () => {
    if (!summary) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Prescriptions', summary.total ?? 0],
      ['Dispensed', summary.dispensed ?? 0],
      ['Pending', summary.pending ?? 0],
      ['Sent to Pharmacy', summary.sentToPharmacy ?? 0],
      ['Cancelled', summary.cancelled ?? 0],
      ['Revenue (₹)', summary.revenue ?? 0],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pharmacy-report-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const quickPresets = [
    { label: 'Today', fn: () => { const t = new Date().toISOString().slice(0, 10); setFrom(t); setTo(t); } },
    { label: 'This Week', fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setFrom(mon.toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); } },
    { label: 'This Month', fn: () => { const now = new Date(); setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); } },
    { label: 'Last Month', fn: () => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth() - 1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); setFrom(first.toISOString().slice(0, 10)); setTo(last.toISOString().slice(0, 10)); } },
    { label: 'Last 3 Months', fn: () => { const now = new Date(); const t = new Date(now); t.setMonth(t.getMonth() - 3); setFrom(t.toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); } },
  ];

  const dispensingRate = summary?.total ? Math.round((summary.dispensed / summary.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Pharmacy Reports" subtitle="Prescription and dispensing performance"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        }
      />

      {/* Quick presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Quick:</span>
        {quickPresets.map(p => (
          <button key={p.label} onClick={p.fn}
            className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors">
            {p.label}
          </button>
        ))}
        <button onClick={fetchData} className="px-3 py-1 text-xs font-medium rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors">
          Apply
        </button>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <CalendarRange size={16} className="text-gray-400" />
        <label className="text-sm text-gray-500 font-medium">From</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-200 outline-none" />
        <label className="text-sm text-gray-500 font-medium">To</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-200 outline-none" />
      </div>

      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Prescriptions" value={summary?.total ?? 0} icon={Pill} color="#0F766E" />
          <KpiCard label="Dispensed" value={summary?.dispensed ?? 0} icon={Pill} color="#10B981" />
          <KpiCard label="Dispensing Rate" value={`${dispensingRate}%`} icon={Clock} color="#3B82F6" />
          <KpiCard label="Revenue (₹)" value={(summary?.revenue ?? 0).toLocaleString('en-IN')} icon={DollarSign} color="#8B5CF6" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prescription status breakdown */}
        {!loading && summary && (
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Prescription Status Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">{from} → {to}</p>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Dispensed', value: summary.dispensed ?? 0, color: '#10B981', bg: 'bg-green-500' },
                { label: 'Pending', value: summary.pending ?? 0, color: '#F59E0B', bg: 'bg-amber-500' },
                { label: 'Sent to Pharmacy', value: summary.sentToPharmacy ?? 0, color: '#3B82F6', bg: 'bg-blue-500' },
                { label: 'Cancelled', value: summary.cancelled ?? 0, color: '#EF4444', bg: 'bg-red-500' },
              ].map(row => {
                const pct = summary.total ? Math.round((row.value / summary.total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{row.label}</span>
                      <span className="text-gray-500">{row.value} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.bg}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Low stock alerts */}
        <div className="hms-card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Low Stock Alerts</h3>
            {lowStock.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">{lowStock.length} items</span>
            )}
          </div>
          {lowStock.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No low-stock alerts</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Drug</th>
                <th className="px-4 py-3 text-left">Current Stock</th>
                <th className="px-4 py-3 text-left">Min Stock</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {lowStock.slice(0, 8).map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{d.currentStock ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500">{d.minStockLevel ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.stockStatus === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {d.stockStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Expiry alerts */}
      {expiry.length > 0 && (
        <div className="hms-card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="font-bold text-gray-900">Expiring in Next 30 Days</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{expiry.length} items</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Drug</th>
              <th className="px-4 py-3 text-left">Batch</th>
              <th className="px-4 py-3 text-left">Expiry Date</th>
              <th className="px-4 py-3 text-left">Qty</th>
              <th className="px-4 py-3 text-left">Days Left</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {expiry.slice(0, 10).map((d: any, i: number) => {
                const daysLeft = d.expiryDate ? Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                return (
                  <tr key={d.id || i} className={`hover:bg-gray-50 ${daysLeft !== null && daysLeft <= 7 ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name || d.drugName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{d.batchNo || d.batchNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{d.quantity ?? d.currentStock ?? '—'}</td>
                    <td className="px-4 py-3">
                      {daysLeft !== null ? (
                        <span className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 14 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {daysLeft}d
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
