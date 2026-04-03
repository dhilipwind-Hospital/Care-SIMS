import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DollarSign, Pill, Clock, TrendingDown, Download } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';

export default function PharmacyReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [topSelling, setTopSelling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    { label: 'Daily Dispensing Report', endpoint: '/reports/pharmacy/daily' },
    { label: 'Monthly Revenue Report', endpoint: '/reports/pharmacy/revenue' },
    { label: 'Stock Valuation Report', endpoint: '/reports/pharmacy/stock-valuation' },
    { label: 'Expiry Report', endpoint: '/reports/pharmacy/expiry' },
    { label: 'Controlled Substance Audit', endpoint: '/reports/pharmacy/controlled' },
    { label: 'Slow-Moving Stock Report', endpoint: '/reports/pharmacy/slow-moving' },
  ];

  const downloadReport = async (endpoint: string, label: string) => {
    try {
      const { data } = await api.get(endpoint);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${label}.json`; a.click();
    } catch (err) { toast.error('Report unavailable'); }
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

      <div className="grid grid-cols-4 gap-4">
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
                <button key={r.endpoint} onClick={() => downloadReport(r.endpoint, r.label)}
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
