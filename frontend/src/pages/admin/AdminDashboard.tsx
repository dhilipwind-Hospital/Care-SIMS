import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Building2, BarChart3, Activity, UserCheck, Shield, MapPin,
  Search, Settings as SettingsIcon, Hospital, DollarSign, Pill, FlaskConical,
  CalendarCheck, RefreshCw, TrendingUp, AlertTriangle, Package,
  ClipboardList, Bed, Syringe, HeartPulse, Truck,
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import { SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activeVisitors, setActiveVisitors] = useState<number>(0);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [locations, setLocations] = useState<any[]>([]);
  // '' means "all locations" (tenant-wide aggregate)
  const [locationFilter, setLocationFilter] = useState<string>('');
  const user = getUser();
  const navigate = useNavigate();

  // Load locations once so the dropdown has options.
  useEffect(() => {
    api.get('/org/locations')
      .then(r => {
        const rows = r.data?.data || r.data || [];
        setLocations(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setLocations([]));
  }, []);

  const fetchAll = (lid: string = locationFilter) => {
    setLoading(true);
    const params = lid ? { locationId: lid } : {};
    Promise.all([
      api.get('/reports/dashboard', { params }).catch(() => ({ data: {} })),
      api.get('/visitors/active-count', { params }).catch(() => ({ data: { activeVisitors: 0 } })),
      api.get('/inventory/low-stock', { params }).catch(() => ({ data: [] })),
    ]).then(([statsRes, visitorsRes, lowStockRes]) => {
      setStats(statsRes.data);
      setActiveVisitors(visitorsRes.data.activeVisitors ?? 0);
      const ls = lowStockRes.data.data || lowStockRes.data || [];
      setLowStock(Array.isArray(ls) ? ls.slice(0, 5) : []);
    }).finally(() => {
      setLoading(false);
      setLastRefresh(new Date());
    });
  };

  // Refetch whenever the location filter changes (and on first mount).
  useEffect(() => { fetchAll(locationFilter); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [locationFilter]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const modules = [
    { title: 'Patients', link: '/app/patients', desc: 'Register & manage patients', Icon: Users, color: '#0F766E' },
    { title: 'Users & Staff', link: '/app/admin/users', desc: 'Manage staff accounts and roles', Icon: Shield, color: '#3B82F6' },
    { title: 'Appointments', link: '/app/appointments', desc: 'OPD appointment scheduling', Icon: CalendarCheck, color: '#8B5CF6' },
    { title: 'Departments', link: '/app/admin/departments', desc: 'Configure hospital departments', Icon: Hospital, color: '#F59E0B' },
    { title: 'Locations', link: '/app/admin/locations', desc: 'Manage branches & satellite clinics', Icon: MapPin, color: '#10B981' },
    { title: 'Inventory', link: '/app/inventory', desc: 'Stock levels & expiry alerts', Icon: Package, color: '#EF4444' },
    { title: 'Billing', link: '/app/billing', desc: 'Invoices and collections', Icon: DollarSign, color: '#06B6D4' },
    { title: 'Pharmacy', link: '/app/pharmacy', desc: 'Prescriptions & dispensing', Icon: Pill, color: '#EC4899' },
    { title: 'Lab', link: '/app/lab', desc: 'Orders and results', Icon: FlaskConical, color: '#14B8A6' },
    { title: 'Admissions', link: '/app/nurse/admissions', desc: 'IPD bed management', Icon: Bed, color: '#F97316' },
    { title: 'OT Management', link: '/app/ot', desc: 'Theatre scheduling', Icon: Syringe, color: '#6366F1' },
    { title: 'Emergency', link: '/app/emergency', desc: 'Emergency & triage', Icon: HeartPulse, color: '#DC2626' },
    { title: 'Reports', link: '/app/admin/reports', desc: 'Analytics & performance', Icon: BarChart3, color: '#0F766E' },
    { title: 'Audit Logs', link: '/app/admin/audit', desc: 'Review system activity', Icon: Search, color: '#6B7280' },
    { title: 'Duty Roster', link: '/app/duty-roster', desc: 'Staff shifts & scheduling', Icon: ClipboardList, color: '#7C3AED' },
    { title: 'Vendors', link: '/app/vendors', desc: 'Suppliers & contracts', Icon: Truck, color: '#92400E' },
    { title: 'Purchase Indents', link: '/app/purchase-indents', desc: 'Procurement requests', Icon: Activity, color: '#065F46' },
    { title: 'Org Settings', link: '/app/admin/settings', desc: 'Profile, compliance & branding', Icon: SettingsIcon, color: '#374151' },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between">
        <TopBar
          title={`Welcome back, ${user?.firstName || 'Admin'}`}
          subtitle={`${user?.tenantName || 'Hospital'} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        />
        <div className="flex items-center gap-2">
          {locations.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5">
              <MapPin size={13} className="text-teal-600" />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="text-xs font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer"
                title="Filter dashboard by location"
              >
                <option value="">All Locations</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={() => fetchAll()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-teal-600 transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI Row 1 — Operations */}
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Patients" value={stats?.totalPatients ?? 0} icon={Users} color="#0F766E" />
          <KpiCard label="Queue (Today)" value={stats?.todayQueue ?? 0} icon={Activity} color="#3B82F6" />
          <KpiCard label="Active Admissions" value={stats?.activeAdmissions ?? 0} icon={Building2} color="#F59E0B" />
          <KpiCard label="Active Visitors" value={activeVisitors} icon={UserCheck} color="#10B981" />
        </div>
      )}

      {/* KPI Row 2 — Clinical + Revenue */}
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Pending Labs" value={stats?.pendingLabOrders ?? 0} icon={FlaskConical} color="#EF4444" />
          <KpiCard label="Appointments (7d)" value={stats?.weeklyAppointments ?? stats?.todayAppointments ?? 0} icon={CalendarCheck} color="#8B5CF6" />
          <KpiCard label="Pending Rx" value={stats?.pendingPrescriptions ?? 0} icon={Pill} color="#EC4899" />
          <KpiCard label="Revenue (30d)" value={fmt(stats?.todayRevenue ?? stats?.weeklyRevenue ?? 0)} icon={TrendingUp} color="#06B6D4" />
        </div>
      )}

      {/* Low stock + pharmacy revenue row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Low stock alert */}
        <div className="hms-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Low Stock Alert</h3>
            </div>
            <button onClick={() => navigate('/app/inventory')} className="text-xs text-teal-600 hover:underline font-medium">View all</button>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-gray-400 italic">All items above reorder levels</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{item.itemCode}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-600">{item.currentStock}</span>
                    <span className="text-xs text-gray-400"> / {item.reorderLevel} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue snapshot */}
        <div className="hms-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-green-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Revenue Snapshot</h3>
            </div>
            <button onClick={() => navigate('/app/admin/reports')} className="text-xs text-teal-600 hover:underline font-medium">Full report</button>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <span className="text-sm text-gray-600">Revenue (Last 30 Days)</span>
                <span className="font-bold text-green-700">{fmt(stats?.todayRevenue ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <span className="text-sm text-gray-600">Pharmacy Revenue (30d)</span>
                <span className="font-bold text-blue-700">{fmt(stats?.pharmacyRevenue ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                <span className="text-sm text-gray-600">Pending Prescriptions</span>
                <span className="font-bold text-purple-700">{stats?.pendingPrescriptions ?? 0} Rx</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Modules Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {modules.map(({ title, link, desc, Icon, color }) => (
            <Link key={link} to={link}
              className="hms-card p-4 flex flex-col items-center gap-2 hover:border-teal-300 hover:shadow-md transition-all group text-center no-underline">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ background: `${color}15` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800 leading-tight">{title}</div>
                <div className="text-xs text-gray-400 leading-tight mt-0.5 hidden sm:block">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-300 text-right">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
    </div>
  );
}
