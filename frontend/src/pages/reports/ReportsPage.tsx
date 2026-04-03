import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users, DollarSign, Activity, TrendingUp, BedDouble,
  Clock, CalendarRange, FileText, Stethoscope, HeartPulse,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

/* ── types ─────────────────────────────────────────────── */

type Tab = 'patients' | 'revenue' | 'opd' | 'ipd';

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
];

/* ── main component ────────────────────────────────────── */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('patients');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Reports & Analytics" subtitle="Hospital performance overview" />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
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

      {/* Date range filter */}
      <div className="flex items-center gap-3">
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

      {/* Tab content */}
      {activeTab === 'patients' && <PatientsTab from={from} to={to} />}
      {activeTab === 'revenue' && <RevenueTab from={from} to={to} />}
      {activeTab === 'opd' && <OpdTab from={from} to={to} />}
      {activeTab === 'ipd' && <IpdTab from={from} to={to} />}
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

          {/* Gender breakdown */}
          {data.byGender.length > 0 && (
            <div className="hms-card">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Gender Distribution</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold">Gender</th>
                    <th className="px-5 py-3 text-right font-semibold">Count</th>
                    <th className="px-5 py-3 text-right font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byGender.map(row => (
                    <tr key={row.gender} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium">{capitalize(row.gender)}</td>
                      <td className="px-5 py-3 text-sm text-gray-700 text-right">{row._count}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 text-right">
                        {data.total > 0 ? ((row._count / data.total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Registration type breakdown */}
          {data.byRegistrationType.length > 0 && (
            <div className="hms-card">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Registration Type</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold">Type</th>
                    <th className="px-5 py-3 text-right font-semibold">Count</th>
                    <th className="px-5 py-3 text-right font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byRegistrationType.map(row => (
                    <tr key={row.registrationType} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium">{capitalize(row.registrationType)}</td>
                      <td className="px-5 py-3 text-sm text-gray-700 text-right">{row._count}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 text-right">
                        {data.total > 0 ? ((row._count / data.total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
