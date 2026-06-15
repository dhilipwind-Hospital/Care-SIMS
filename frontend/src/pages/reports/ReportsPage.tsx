import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users, DollarSign, Activity, TrendingUp, BedDouble,
  Clock, CalendarRange, FileText, Stethoscope, HeartPulse, Download, Printer, FlaskConical,
  Pill, Package, CalendarCheck, Sparkles, Loader2, RefreshCw,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { exportTableToCsv } from '../../lib/export';

// Chart colors matching the Ayphen HMS palette
const CHART_COLORS = ['#0F766E', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#14B8A6'];

/* ── types ─────────────────────────────────────────────── */

type Tab = 'patients' | 'revenue' | 'opd' | 'ipd' | 'lab' | 'pharmacy' | 'appointments' | 'inventory';

interface PatientData {
  total: number;
  byGender: { gender: string; _count: number }[];
  byRegistrationType: { registrationType: string; _count: number }[];
}

interface RevenueData {
  totalBilled: number;
  totalCollected: number;
  outstanding: number;
  invoiceCount: number;
}

interface OpdData {
  totalConsultations: number;
}

interface IpdData {
  total: number;
  currentlyAdmitted: number;
  discharged: number;
}

/* ── helpers ───────────────────────────────────────────── */

function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function currency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function capitalize(s: string) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, ' ');
}

/* ── tab config ────────────────────────────────────────── */

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'patients', label: 'Patient Statistics', icon: Users },
  { key: 'revenue', label: 'Revenue', icon: DollarSign },
  { key: 'opd', label: 'OPD Performance', icon: Stethoscope },
  { key: 'ipd', label: 'IPD Analytics', icon: BedDouble },
  { key: 'lab', label: 'Lab Reports', icon: FlaskConical },
  { key: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { key: 'appointments', label: 'Appointments', icon: CalendarCheck },
  { key: 'inventory', label: 'Inventory', icon: Package },
];

/* ── main component ────────────────────────────────────── */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('patients');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [applied, setApplied] = useState({ from: defaultFrom(), to: defaultTo() });

  const handleExport = async () => {
    try {
      const params = { from: applied.from, to: applied.to };
      if (activeTab === 'patients') {
        const { data } = await api.get('/reports/patients', { params });
        const rows = [
          ...(data.byGender || []).map((g: any) => ({ category: 'Gender', label: capitalize(g.gender), count: g._count })),
          ...(data.byRegistrationType || []).map((r: any) => ({ category: 'Registration Type', label: capitalize(r.registrationType), count: r._count })),
        ];
        exportTableToCsv([
          { header: 'Category', key: 'category' }, { header: 'Label', key: 'label' }, { header: 'Count', key: 'count' },
        ], rows, `patient-report-${applied.from}-to-${applied.to}.csv`);
      } else if (activeTab === 'revenue') {
        const { data } = await api.get('/reports/revenue', { params });
        exportTableToCsv([
          { header: 'Metric', key: 'metric' }, { header: 'Amount (INR)', key: 'amount' },
        ], [
          { metric: 'Total Billed', amount: data.totalBilled },
          { metric: 'Total Collected', amount: data.totalCollected },
          { metric: 'Outstanding', amount: data.outstanding },
          { metric: 'Invoice Count', amount: data.invoiceCount },
          { metric: 'Collection Rate %', amount: data.totalBilled > 0 ? ((data.totalCollected / data.totalBilled) * 100).toFixed(1) : '0' },
        ], `revenue-report-${applied.from}-to-${applied.to}.csv`);
      } else if (activeTab === 'opd') {
        const { data } = await api.get('/reports/opd', { params });
        const days = Math.max(1, Math.ceil((new Date(applied.to).getTime() - new Date(applied.from).getTime()) / 86400000));
        exportTableToCsv([
          { header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' },
        ], [
          { metric: 'Total Consultations', value: data.totalConsultations },
          { metric: 'Period (days)', value: days },
          { metric: 'Avg Consultations/Day', value: (data.totalConsultations / days).toFixed(1) },
        ], `opd-report-${applied.from}-to-${applied.to}.csv`);
      } else if (activeTab === 'ipd') {
        const { data } = await api.get('/reports/ipd', { params });
        exportTableToCsv([
          { header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' },
        ], [
          { metric: 'Total Admissions', value: data.total },
          { metric: 'Currently Admitted', value: data.currentlyAdmitted },
          { metric: 'Discharged', value: data.discharged },
        ], `ipd-report-${applied.from}-to-${applied.to}.csv`);
      } else if (activeTab === 'lab') {
        const { data } = await api.get('/reports/lab', { params });
        exportTableToCsv([
          { header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' },
        ], [
          { metric: 'Total Orders', value: data.totalOrders ?? 0 },
          { metric: 'Completed', value: data.completed ?? 0 },
          { metric: 'Pending', value: data.pending ?? 0 },
          { metric: 'Critical Results', value: data.critical ?? 0 },
        ], `lab-report-${applied.from}-to-${applied.to}.csv`);
      } else if (activeTab === 'pharmacy') {
        const { data } = await api.get('/reports/pharmacy', { params });
        exportTableToCsv([
          { header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' },
        ], [
          { metric: 'Total Prescriptions', value: data.total ?? 0 },
          { metric: 'Dispensed', value: data.dispensed ?? 0 },
          { metric: 'Pending', value: data.pending ?? 0 },
          { metric: 'At Pharmacy', value: data.sentToPharmacy ?? 0 },
          { metric: 'Cancelled', value: data.cancelled ?? 0 },
          { metric: 'Pharmacy Revenue (INR)', value: data.revenue ?? 0 },
        ], `pharmacy-report-${applied.from}-to-${applied.to}.csv`);
      } else if (activeTab === 'appointments') {
        const { data } = await api.get('/reports/appointments', { params });
        exportTableToCsv([
          { header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' },
        ], [
          { metric: 'Total Appointments', value: data.total ?? 0 },
          { metric: 'Completed', value: data.completed ?? 0 },
          { metric: 'Scheduled', value: data.scheduled ?? 0 },
          { metric: 'Cancelled', value: data.cancelled ?? 0 },
          { metric: 'No Show', value: data.noShow ?? 0 },
          { metric: 'Completion Rate %', value: data.completionRate ?? 0 },
          { metric: 'Cancellation Rate %', value: data.cancellationRate ?? 0 },
        ], `appointments-report-${applied.from}-to-${applied.to}.csv`);
      } else if (activeTab === 'inventory') {
        const { data } = await api.get('/reports/inventory', { params });
        exportTableToCsv([
          { header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' },
        ], [
          { metric: 'Total Items', value: data.totalItems ?? 0 },
          { metric: 'Low Stock Items', value: data.lowStock ?? 0 },
          { metric: 'Stock Value (INR)', value: data.stockValue ?? 0 },
          { metric: 'Stock In Transactions', value: data.stockInCount ?? 0 },
          { metric: 'Stock Out Transactions', value: data.stockOutCount ?? 0 },
          { metric: 'Expiry Alerts (30d)', value: data.expiryAlerts ?? 0 },
        ], `inventory-report-${applied.from}-to-${applied.to}.csv`);
      }
      toast.success('Report exported');
    } catch { toast.error('Export failed'); }
  };

  const handlePrintReport = async () => {
    try {
      const params = { from: applied.from, to: applied.to };
      const { data } = await api.get('/reports/' + activeTab, { params });
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { toast.error('Popup blocked — allow popups and try again'); return; }

      let bodyContent = '';
      if (activeTab === 'patients') {
        const genderRows = (data.byGender || []).map((g: any) =>
          `<tr><td>${capitalize(g.gender)}</td><td style="text-align:right">${g._count}</td><td style="text-align:right">${data.total > 0 ? ((g._count / data.total) * 100).toFixed(1) : 0}%</td></tr>`
        ).join('');
        const regRows = (data.byRegistrationType || []).map((r: any) =>
          `<tr><td>${capitalize(r.registrationType)}</td><td style="text-align:right">${r._count}</td></tr>`
        ).join('');
        bodyContent = `
          <h2>Patient Statistics</h2>
          <p class="meta">Total Patients: <strong>${data.total ?? 0}</strong></p>
          <h3>Gender Distribution</h3>
          <table><thead><tr><th>Gender</th><th>Count</th><th>%</th></tr></thead><tbody>${genderRows || '<tr><td colspan="3">No data</td></tr>'}</tbody></table>
          <h3>Registration Type</h3>
          <table><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${regRows || '<tr><td colspan="2">No data</td></tr>'}</tbody></table>`;
      } else if (activeTab === 'revenue') {
        const rate = data.totalBilled > 0 ? ((data.totalCollected / data.totalBilled) * 100).toFixed(1) : '0';
        const pct = Math.min(Number(rate), 100);
        bodyContent = `
          <h2>Revenue Report</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Billed</td><td style="text-align:right">${currency(data.totalBilled ?? 0)}</td></tr>
              <tr><td>Total Collected</td><td style="text-align:right">${currency(data.totalCollected ?? 0)}</td></tr>
              <tr><td>Outstanding</td><td style="text-align:right">${currency(data.outstanding ?? 0)}</td></tr>
              <tr><td>Invoice Count</td><td style="text-align:right">${data.invoiceCount ?? 0}</td></tr>
              <tr><td>Collection Rate</td><td style="text-align:right">${rate}%</td></tr>
            </tbody>
          </table>
          <h3>Collection Progress</h3>
          <div style="background:#e5e7eb;border-radius:8px;height:16px;overflow:hidden;margin-top:8px">
            <div style="background:linear-gradient(90deg,#0F766E,#14B8A6);height:100%;width:${pct}%;border-radius:8px"></div>
          </div>
          <p style="font-size:12px;color:#6b7280;margin-top:4px">Collected: ${rate}% &nbsp;|&nbsp; Outstanding: ${data.totalBilled > 0 ? ((data.outstanding / data.totalBilled) * 100).toFixed(1) : 0}%</p>`;
      } else if (activeTab === 'opd') {
        const days = Math.max(1, Math.ceil((new Date(applied.to).getTime() - new Date(applied.from).getTime()) / 86400000));
        bodyContent = `
          <h2>OPD Performance Report</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Consultations</td><td style="text-align:right">${data.totalConsultations ?? 0}</td></tr>
              <tr><td>Period (days)</td><td style="text-align:right">${days}</td></tr>
              <tr><td>Avg Consultations / Day</td><td style="text-align:right">${((data.totalConsultations ?? 0) / days).toFixed(1)}</td></tr>
            </tbody>
          </table>`;
      } else if (activeTab === 'ipd') {
        const activeRate = data.total > 0 ? ((data.currentlyAdmitted / data.total) * 100).toFixed(1) : '0';
        bodyContent = `
          <h2>IPD Analytics Report</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Admissions</td><td style="text-align:right">${data.total ?? 0}</td></tr>
              <tr><td>Currently Admitted</td><td style="text-align:right">${data.currentlyAdmitted ?? 0}</td></tr>
              <tr><td>Discharged</td><td style="text-align:right">${data.discharged ?? 0}</td></tr>
              <tr><td>Active Admission Rate</td><td style="text-align:right">${activeRate}%</td></tr>
            </tbody>
          </table>`;
      } else if (activeTab === 'lab') {
        bodyContent = `
          <h2>Lab Reports</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Orders</td><td style="text-align:right">${data.totalOrders ?? 0}</td></tr>
              <tr><td>Completed</td><td style="text-align:right">${data.completed ?? 0}</td></tr>
              <tr><td>Pending</td><td style="text-align:right">${data.pending ?? 0}</td></tr>
              <tr><td>Critical Results</td><td style="text-align:right">${data.critical ?? 0}</td></tr>
            </tbody>
          </table>`;
      } else if (activeTab === 'pharmacy') {
        bodyContent = `
          <h2>Pharmacy Report</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Prescriptions</td><td style="text-align:right">${data.total ?? 0}</td></tr>
              <tr><td>Dispensed</td><td style="text-align:right">${data.dispensed ?? 0}</td></tr>
              <tr><td>Pending</td><td style="text-align:right">${data.pending ?? 0}</td></tr>
              <tr><td>At Pharmacy</td><td style="text-align:right">${data.sentToPharmacy ?? 0}</td></tr>
              <tr><td>Cancelled</td><td style="text-align:right">${data.cancelled ?? 0}</td></tr>
              <tr><td>Pharmacy Revenue</td><td style="text-align:right">${currency(data.revenue ?? 0)}</td></tr>
            </tbody>
          </table>`;
      } else if (activeTab === 'appointments') {
        bodyContent = `
          <h2>Appointments Report</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Appointments</td><td style="text-align:right">${data.total ?? 0}</td></tr>
              <tr><td>Completed</td><td style="text-align:right">${data.completed ?? 0}</td></tr>
              <tr><td>Scheduled</td><td style="text-align:right">${data.scheduled ?? 0}</td></tr>
              <tr><td>Cancelled</td><td style="text-align:right">${data.cancelled ?? 0}</td></tr>
              <tr><td>No Show</td><td style="text-align:right">${data.noShow ?? 0}</td></tr>
              <tr><td>Completion Rate</td><td style="text-align:right">${data.completionRate ?? 0}%</td></tr>
              <tr><td>Cancellation Rate</td><td style="text-align:right">${data.cancellationRate ?? 0}%</td></tr>
            </tbody>
          </table>`;
      } else if (activeTab === 'inventory') {
        bodyContent = `
          <h2>Inventory Report</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Total Items</td><td style="text-align:right">${data.totalItems ?? 0}</td></tr>
              <tr><td>Low Stock Items</td><td style="text-align:right">${data.lowStock ?? 0}</td></tr>
              <tr><td>Stock Value</td><td style="text-align:right">${currency(data.stockValue ?? 0)}</td></tr>
              <tr><td>Stock In Transactions</td><td style="text-align:right">${data.stockInCount ?? 0}</td></tr>
              <tr><td>Stock Out Transactions</td><td style="text-align:right">${data.stockOutCount ?? 0}</td></tr>
              <tr><td>Expiry Alerts (30d)</td><td style="text-align:right">${data.expiryAlerts ?? 0}</td></tr>
            </tbody>
          </table>`;
      }

      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ayphen HMS – Report</title>
        <style>
          @media print { body { margin: 0; } .no-print { display: none; } }
          body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #1f2937; }
          .header { background: linear-gradient(135deg, #0F766E, #14B8A6); color: white; padding: 24px 32px; }
          .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
          .header p { margin: 0; font-size: 13px; opacity: 0.85; }
          .content { padding: 24px 32px; }
          h2 { font-size: 18px; font-weight: 700; color: #0F766E; margin: 0 0 4px; }
          h3 { font-size: 14px; font-weight: 600; color: #374151; margin: 20px 0 8px; }
          .meta { font-size: 13px; color: #6b7280; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          th { background: #f9fafb; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
          td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
          tr:hover td { background: #f9fafb; }
          .footer { padding: 12px 32px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
        </style>
      </head><body>
        <div class="header">
          <h1>Ayphen HMS</h1>
          <p>Date Range: ${applied.from} to ${applied.to}</p>
        </div>
        <div class="content">${bodyContent}</div>
        <div class="footer">Generated on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; Ayphen Hospital Management System</div>
        <script>window.onload = function() { window.print(); };<\/script>
      </body></html>`);
      win.document.close();
    } catch { toast.error('Failed to generate print report'); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Reports & Analytics" subtitle="Hospital performance overview" />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Quick presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Quick:</span>
        {[
          { label: 'Today', fn: () => { const t = new Date().toISOString().slice(0,10); setFrom(t); setTo(t); } },
          { label: 'This Week', fn: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); setFrom(mon.toISOString().slice(0,10)); setTo(now.toISOString().slice(0,10)); } },
          { label: 'This Month', fn: () => { const now = new Date(); setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)); setTo(now.toISOString().slice(0,10)); } },
          { label: 'Last Month', fn: () => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth()-1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); setFrom(first.toISOString().slice(0,10)); setTo(last.toISOString().slice(0,10)); } },
          { label: 'Last 3 Months', fn: () => { const now = new Date(); const t = new Date(now); t.setMonth(t.getMonth()-3); setFrom(t.toISOString().slice(0,10)); setTo(now.toISOString().slice(0,10)); } },
          { label: 'This Year', fn: () => { const now = new Date(); setFrom(`${now.getFullYear()}-01-01`); setTo(now.toISOString().slice(0,10)); } },
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
        <button
          onClick={() => setApplied({ from, to })}
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
        >
          Apply
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handlePrintReport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer size={15} /> Print Report
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'patients' && <PatientsTab from={applied.from} to={applied.to} />}
      {activeTab === 'revenue' && <RevenueTab from={applied.from} to={applied.to} />}
      {activeTab === 'opd' && <OpdTab from={applied.from} to={applied.to} />}
      {activeTab === 'ipd' && <IpdTab from={applied.from} to={applied.to} />}
      {activeTab === 'lab' && <LabTab from={applied.from} to={applied.to} />}
      {activeTab === 'pharmacy' && <PharmacyTab from={applied.from} to={applied.to} />}
      {activeTab === 'appointments' && <AppointmentsTab from={applied.from} to={applied.to} />}
      {activeTab === 'inventory' && <InventoryReportTab from={applied.from} to={applied.to} />}
    </div>
  );
}

/* ── Patient Statistics Tab ────────────────────────────── */

function PatientsTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/patients', { params: { from, to } })
      .then(r => setData(r.data))
      .catch((err) => { console.error('Failed to load patient statistics:', err); toast.error('Failed to load patient statistics'); })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  const maleCount = data?.byGender?.find(g => g.gender === 'MALE')?._count ?? 0;
  const femaleCount = data?.byGender?.find(g => g.gender === 'FEMALE')?._count ?? 0;
  const otherCount = data?.byGender?.find(g => g.gender !== 'MALE' && g.gender !== 'FEMALE')?._count ?? 0;

  return (
    <div className="space-y-6">
      {loading ? (
        <SkeletonKpiRow count={4} />
      ) : !data ? (
        <EmptyState title="No patient data" description="Unable to load patient statistics for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Patients" value={data.total} icon={Users} color="#0F766E" />
            <KpiCard label="Male" value={maleCount} icon={Users} color="#3B82F6" />
            <KpiCard label="Female" value={femaleCount} icon={Users} color="#EC4899" />
            <KpiCard label="Other" value={otherCount} icon={Users} color="#8B5CF6" />
          </div>

          {/* Gender Distribution — Pie Chart + Table */}
          {data.byGender.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="hms-card p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Gender Distribution</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.byGender.map(g => ({ name: capitalize(g.gender), value: g._count }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${entry.value}`}
                      outerRadius={90}
                      innerRadius={45}
                      dataKey="value"
                    >
                      {data.byGender.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="hms-card">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Breakdown</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left font-semibold">Gender</th>
                      <th className="px-5 py-3 text-right font-semibold">Count</th>
                      <th className="px-5 py-3 text-right font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byGender.map((row, i) => (
                      <tr key={row.gender} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3 text-sm font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            {capitalize(row.gender)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 text-right">{row._count}</td>
                        <td className="px-5 py-3 text-sm text-gray-500 text-right">
                          {data.total > 0 ? ((row._count / data.total) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Registration type — Bar Chart */}
          {data.byRegistrationType.length > 0 && (
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Registration Type Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.byRegistrationType.map(r => ({ name: capitalize(r.registrationType), count: r._count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="count" fill="#0F766E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Revenue Tab ───────────────────────────────────────── */

function RevenueTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Revenue Insights — qualitative commentary on the last 30 vs prior
  // 30 days. Independent of the date filter above; always looks at "now".
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsAt, setInsightsAt] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const fetchInsights = useCallback(() => {
    setInsightsLoading(true);
    api.get('/reports/ai-revenue-insights')
      .then(r => { setInsights(r.data?.insights || null); setInsightsAt(r.data?.generatedAt || null); })
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false));
  }, []);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/revenue', { params: { from, to } })
      .then(r => setData(r.data))
      .catch((err) => { console.error('Failed to load revenue report:', err); toast.error('Failed to load revenue report'); })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      {/* AI Insights card — always at the top, independent of date filter. */}
      <div className="hms-card p-5 border-l-4" style={{ borderColor: '#7C3AED' }}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-purple-600" />
            <span className="font-semibold text-sm text-gray-800">AI Revenue Insights</span>
            <span className="text-[10px] text-gray-400">Last 30 days vs the 30 days before</span>
            {insightsAt && !insightsLoading && (
              <span className="text-[10px] text-gray-400">· Generated {new Date(insightsAt).toLocaleString()}</span>
            )}
          </div>
          <button
            type="button"
            onClick={fetchInsights}
            disabled={insightsLoading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
          >
            {insightsLoading ? <Loader2 size={12} className="animate-spin" /> : insights ? <RefreshCw size={12} /> : <Sparkles size={12} />}
            {insightsLoading ? 'Analysing…' : insights ? 'Refresh' : 'Generate'}
          </button>
        </div>
        {insightsLoading ? (
          <div className="text-xs text-gray-400 italic">Looking at the last 60 days of invoices…</div>
        ) : insights ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{insights}</div>
        ) : (
          <div className="text-xs text-gray-400 italic">Click Generate to get AI commentary on what changed in the last month.</div>
        )}
        <div className="mt-3 text-[10px] text-gray-400">
          AI-generated commentary on past data — not a forecast. Verify against the underlying numbers below.
        </div>
      </div>

      {loading ? (
        <SkeletonKpiRow count={4} />
      ) : !data ? (
        <EmptyState title="No revenue data" description="Unable to load revenue analytics for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Billed" value={currency(data.totalBilled)} icon={DollarSign} color="#0F766E" />
            <KpiCard label="Total Collected" value={currency(data.totalCollected)} icon={TrendingUp} color="#10B981" />
            <KpiCard label="Outstanding" value={currency(data.outstanding)} icon={DollarSign} color="#EF4444" />
            <KpiCard label="Invoices" value={data.invoiceCount} icon={FileText} color="#3B82F6" />
          </div>

          {/* Revenue Bar Chart */}
          {data.totalBilled > 0 && (
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    { name: 'Billed', amount: data.totalBilled, fill: '#0F766E' },
                    { name: 'Collected', amount: data.totalCollected, fill: '#10B981' },
                    { name: 'Outstanding', amount: data.outstanding, fill: '#EF4444' },
                  ]}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#6B7280' }} width={90} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(value: any) => currency(value)}
                  />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={['#0F766E', '#10B981', '#EF4444'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue summary table */}
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Revenue Summary</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Metric</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-sm text-gray-800 font-medium">Total Billed</td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right font-semibold">{currency(data.totalBilled)}</td>
                </tr>
                <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-sm text-gray-800 font-medium">Total Collected</td>
                  <td className="px-5 py-3 text-sm text-green-600 text-right font-semibold">{currency(data.totalCollected)}</td>
                </tr>
                <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-sm text-gray-800 font-medium">Outstanding</td>
                  <td className="px-5 py-3 text-sm text-red-600 text-right font-semibold">{currency(data.outstanding)}</td>
                </tr>
                <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-sm text-gray-800 font-medium">Total Invoices</td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right font-semibold">{data.invoiceCount}</td>
                </tr>
                {data.totalBilled > 0 && (
                  <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium">Collection Rate</td>
                    <td className="px-5 py-3 text-sm text-teal-600 text-right font-semibold">
                      {((data.totalCollected / data.totalBilled) * 100).toFixed(1)}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Collection progress bar */}
          {data.totalBilled > 0 && (
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Collection Progress</h3>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((data.totalCollected / data.totalBilled) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #0F766E, #14B8A6)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Collected: {((data.totalCollected / data.totalBilled) * 100).toFixed(1)}%</span>
                <span>Outstanding: {((data.outstanding / data.totalBilled) * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── OPD Performance Tab ───────────────────────────────── */

function OpdTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<OpdData | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Seasonal Trends — "this month last year vs this month so far".
  const [trends, setTrends] = useState<string | null>(null);
  const [trendsAt, setTrendsAt] = useState<string | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsMeta, setTrendsMeta] = useState<{ currentMonth?: string; thisYearVolume?: number; lastYearVolume?: number }>({});
  const fetchTrends = useCallback(() => {
    setTrendsLoading(true);
    api.get('/reports/ai-seasonal-trends')
      .then(r => {
        setTrends(r.data?.insights || null);
        setTrendsAt(r.data?.generatedAt || null);
        setTrendsMeta({ currentMonth: r.data?.currentMonth, thisYearVolume: r.data?.thisYearVolume, lastYearVolume: r.data?.lastYearVolume });
      })
      .catch(() => setTrends(null))
      .finally(() => setTrendsLoading(false));
  }, []);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/opd', { params: { from, to } })
      .then(r => setData(r.data))
      .catch((err) => { console.error('Failed to load OPD report:', err); toast.error('Failed to load OPD report'); })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      {/* AI Seasonal Trends card — top of the OPD tab. Lookback, not forecast. */}
      <div className="hms-card p-5 border-l-4" style={{ borderColor: '#7C3AED' }}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles size={15} className="text-purple-600" />
            <span className="font-semibold text-sm text-gray-800">AI Seasonal Trends</span>
            {trendsMeta.currentMonth && (
              <span className="text-[10px] text-gray-400">{trendsMeta.currentMonth} this year vs last year</span>
            )}
            {typeof trendsMeta.thisYearVolume === 'number' && typeof trendsMeta.lastYearVolume === 'number' && (
              <span className="text-[10px] text-gray-400">· {trendsMeta.thisYearVolume} this year, {trendsMeta.lastYearVolume} last year</span>
            )}
            {trendsAt && !trendsLoading && (
              <span className="text-[10px] text-gray-400">· Generated {new Date(trendsAt).toLocaleString()}</span>
            )}
          </div>
          <button
            type="button"
            onClick={fetchTrends}
            disabled={trendsLoading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
          >
            {trendsLoading ? <Loader2 size={12} className="animate-spin" /> : trends ? <RefreshCw size={12} /> : <Sparkles size={12} />}
            {trendsLoading ? 'Analysing…' : trends ? 'Refresh' : 'Generate'}
          </button>
        </div>
        {trendsLoading ? (
          <div className="text-xs text-gray-400 italic">Looking at this month vs last year…</div>
        ) : trends ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{trends}</div>
        ) : (
          <div className="text-xs text-gray-400 italic">Click Generate to see what conditions are trending this month vs the same month last year.</div>
        )}
        <div className="mt-3 text-[10px] text-gray-400">
          Lookback only — what we saw, not what's coming. Use as a hint for stocking and rostering, not a forecast.
        </div>
      </div>

      {loading ? (
        <SkeletonKpiRow count={3} />
      ) : !data ? (
        <EmptyState title="No OPD data" description="Unable to load OPD performance data for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Total Consultations" value={data.totalConsultations} icon={Stethoscope} color="#0F766E" />
            <KpiCard label="Avg / Day" value={
              (() => {
                const d1 = new Date(from);
                const d2 = new Date(to);
                const days = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
                return (data.totalConsultations / days).toFixed(1);
              })()
            } icon={Activity} color="#3B82F6" sub="consultations per day" />
            <KpiCard label="Period (days)" value={
              (() => {
                const d1 = new Date(from);
                const d2 = new Date(to);
                return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
              })()
            } icon={Clock} color="#F59E0B" />
          </div>

          {/* OPD summary card */}
          <div className="hms-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">OPD Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-xl">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Stethoscope size={22} className="text-teal-700" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.totalConsultations}</div>
                  <div className="text-xs text-gray-500">Total OPD consultations in period</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <HeartPulse size={22} className="text-blue-700" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const d1 = new Date(from);
                      const d2 = new Date(to);
                      const days = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
                      return (data.totalConsultations / days).toFixed(1);
                    })()}
                  </div>
                  <div className="text-xs text-gray-500">Average consultations per day</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── IPD Analytics Tab ─────────────────────────────────── */

function IpdTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<IpdData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/ipd', { params: { from, to } })
      .then(r => setData(r.data))
      .catch((err) => { console.error('Failed to load IPD report:', err); toast.error('Failed to load IPD report'); })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  const occupancyRate = data && data.total > 0
    ? ((data.currentlyAdmitted / data.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {loading ? (
        <SkeletonKpiRow count={3} />
      ) : !data ? (
        <EmptyState title="No IPD data" description="Unable to load IPD analytics for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Total Admissions" value={data.total} icon={BedDouble} color="#0F766E" />
            <KpiCard label="Currently Admitted" value={data.currentlyAdmitted} icon={Activity} color="#F59E0B" />
            <KpiCard label="Discharged" value={data.discharged} icon={TrendingUp} color="#10B981" />
          </div>

          {/* IPD Pie Chart */}
          {data.total > 0 && (
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Admission Status Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Currently Admitted', value: data.currentlyAdmitted },
                      { name: 'Discharged', value: data.discharged },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    outerRadius={90}
                    innerRadius={45}
                    dataKey="value"
                  >
                    <Cell fill="#F59E0B" />
                    <Cell fill="#10B981" />
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Admission breakdown table */}
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Admission Breakdown</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Count</th>
                  <th className="px-5 py-3 text-right font-semibold">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-sm font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-gray-800">Currently Admitted</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">{data.currentlyAdmitted}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">
                    {data.total > 0 ? ((data.currentlyAdmitted / data.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-sm font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-gray-800">Discharged</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">{data.discharged}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">
                    {data.total > 0 ? ((data.discharged / data.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Occupancy visual */}
          <div className="hms-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Admission Rate</h3>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(Number(occupancyRate), 100)}%`,
                  background: Number(occupancyRate) > 80
                    ? 'linear-gradient(90deg, #EF4444, #F97316)'
                    : 'linear-gradient(90deg, #0F766E, #14B8A6)',
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Active: {data.currentlyAdmitted} of {data.total}</span>
              <span>{occupancyRate}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Lab Reports Tab ───────────────────────────────────── */

function LabTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/lab', { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => { toast.error('Failed to load lab report'); setData(null); })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      {loading ? <SkeletonKpiRow count={4} /> : !data ? (
        <EmptyState title="No lab data" description="Unable to load lab statistics for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Orders" value={data.totalOrders ?? 0} icon={Activity} color="#0F766E" />
            <KpiCard label="Completed" value={data.completed ?? 0} icon={Activity} color="#10B981" />
            <KpiCard label="Pending" value={data.pending ?? 0} icon={Clock} color="#F59E0B" />
            <KpiCard label="Critical Results" value={data.critical ?? 0} icon={Activity} color="#EF4444" />
          </div>
          <div className="hms-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Lab Orders by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[
                { name: 'Completed', value: data.completed ?? 0 },
                { name: 'Pending', value: data.pending ?? 0 },
                { name: 'Critical', value: data.critical ?? 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {[0, 1, 2].map(i => <Cell key={i} fill={['#10B981', '#F59E0B', '#EF4444'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Pharmacy Tab ──────────────────────────────────────── */

function PharmacyTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/pharmacy', { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => { toast.error('Failed to load pharmacy report'); setData(null); })
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      {loading ? <SkeletonKpiRow count={4} /> : !data ? (
        <EmptyState title="No pharmacy data" description="Unable to load pharmacy statistics for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Total Prescriptions" value={data.total ?? 0} icon={Activity} color="#0F766E" />
            <KpiCard label="Dispensed" value={data.dispensed ?? 0} icon={Activity} color="#10B981" />
            <KpiCard label="Pending" value={data.pending ?? 0} icon={Clock} color="#F59E0B" />
            <KpiCard label="At Pharmacy" value={data.sentToPharmacy ?? 0} icon={Activity} color="#3B82F6" />
            <KpiCard label="Cancelled" value={data.cancelled ?? 0} icon={Activity} color="#EF4444" />
            <KpiCard label="Pharmacy Revenue" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.revenue ?? 0)} icon={DollarSign} color="#8B5CF6" />
          </div>
          <div className="hms-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Prescriptions by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[
                { name: 'Dispensed', value: data.dispensed ?? 0 },
                { name: 'Pending', value: data.pending ?? 0 },
                { name: 'At Pharmacy', value: data.sentToPharmacy ?? 0 },
                { name: 'Cancelled', value: data.cancelled ?? 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {[0, 1, 2, 3].map(i => <Cell key={i} fill={['#10B981', '#F59E0B', '#3B82F6', '#EF4444'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Appointments Tab ──────────────────────────────────── */

function AppointmentsTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/appointments', { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => { toast.error('Failed to load appointments report'); setData(null); })
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      {loading ? <SkeletonKpiRow count={4} /> : !data ? (
        <EmptyState title="No appointment data" description="Unable to load appointment statistics for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total" value={data.total ?? 0} icon={Activity} color="#0F766E" />
            <KpiCard label="Completed" value={data.completed ?? 0} icon={Activity} color="#10B981" />
            <KpiCard label="Cancelled" value={data.cancelled ?? 0} icon={Activity} color="#EF4444" />
            <KpiCard label="No Show" value={data.noShow ?? 0} icon={Activity} color="#F59E0B" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="hms-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Appointment Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[
                    { name: 'Completed', value: data.completed ?? 0 },
                    { name: 'Scheduled', value: data.scheduled ?? 0 },
                    { name: 'Cancelled', value: data.cancelled ?? 0 },
                    { name: 'No Show', value: data.noShow ?? 0 },
                  ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {[0,1,2,3].map(i => <Cell key={i} fill={['#10B981','#3B82F6','#EF4444','#F59E0B'][i]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="hms-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Performance Metrics</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Completion Rate</span><span className="font-semibold text-green-700">{data.completionRate ?? 0}%</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${data.completionRate ?? 0}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Cancellation Rate</span><span className="font-semibold text-red-600">{data.cancellationRate ?? 0}%</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${data.cancellationRate ?? 0}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Inventory Report Tab ──────────────────────────────── */

function InventoryReportTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/reports/inventory', { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => { toast.error('Failed to load inventory report'); setData(null); })
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      {loading ? <SkeletonKpiRow count={4} /> : !data ? (
        <EmptyState title="No inventory data" description="Unable to load inventory statistics for the selected period." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Total Items" value={data.totalItems ?? 0} icon={Activity} color="#0F766E" />
            <KpiCard label="Low Stock Items" value={data.lowStock ?? 0} icon={TrendingUp} color="#EF4444" />
            <KpiCard label="Stock Value" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.stockValue ?? 0)} icon={DollarSign} color="#10B981" />
            <KpiCard label="Stock In (period)" value={data.stockInCount ?? 0} icon={Activity} color="#3B82F6" />
            <KpiCard label="Stock Out (period)" value={data.stockOutCount ?? 0} icon={Activity} color="#8B5CF6" />
            <KpiCard label="Expiry Alerts (30d)" value={data.expiryAlerts ?? 0} icon={Clock} color="#F59E0B" />
          </div>
          <div className="hms-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Stock Movement (Period)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: 'Stock In', value: data.stockInCount ?? 0 },
                { name: 'Stock Out', value: data.stockOutCount ?? 0 },
                { name: 'Low Stock', value: data.lowStock ?? 0 },
                { name: 'Expiry Alerts', value: data.expiryAlerts ?? 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {[0,1,2,3].map(i => <Cell key={i} fill={['#10B981','#8B5CF6','#EF4444','#F59E0B'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
