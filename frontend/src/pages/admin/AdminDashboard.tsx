import { useEffect, useState } from 'react';
import { Users, Building2, BarChart3, Activity, UserCheck, Shield, MapPin, Search, Settings as SettingsIcon, Hospital } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import { SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activeVisitors, setActiveVisitors] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setStats(r.data)).catch((err) => { console.error('Failed to fetch dashboard stats:', err); }).finally(() => setLoading(false));
    api.get('/visitors/active-count').then(r => setActiveVisitors(r.data.activeVisitors ?? 0)).catch((err) => { console.error('Failed to fetch active visitors:', err); });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Admin Dashboard" subtitle="Hospital overview and management" />

      {loading ? <SkeletonKpiRow count={6} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Patients" value={stats?.totalPatients ?? '—'} icon={Users} color="#0F766E" />
          <KpiCard label="Today's Queue" value={stats?.todayQueue ?? '—'} icon={Activity} color="#3B82F6" />
          <KpiCard label="Active Admissions" value={stats?.activeAdmissions ?? '—'} icon={Building2} color="#F59E0B" />
          <KpiCard label="Active Visitors" value={activeVisitors} icon={UserCheck} color="#10B981" />
          <KpiCard label="Pending Labs" value={stats?.pendingLabOrders ?? '—'} icon={BarChart3} color="#EF4444" />
          <KpiCard label="Today's Appointments" value={stats?.todayAppointments ?? '—'} icon={Activity} color="#10B981" />
          <KpiCard label="Pending Rx" value={stats?.pendingPrescriptions ?? '—'} icon={BarChart3} color="#8B5CF6" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <QuickModule title="Users" link="/app/admin/users" desc="Manage staff accounts and roles" Icon={Users} />
        <QuickModule title="Roles & Permissions" link="/app/admin/roles" desc="Configure role-based access control" Icon={Shield} />
        <QuickModule title="Departments" link="/app/admin/departments" desc="Configure hospital departments" Icon={Hospital} />
        <QuickModule title="Locations" link="/app/admin/locations" desc="Manage branches and satellite clinics" Icon={MapPin} />
        <QuickModule title="Reports" link="/app/admin/reports" desc="View analytics and reports" Icon={BarChart3} />
        <QuickModule title="Audit Logs" link="/app/admin/audit" desc="Review system activity" Icon={Search} />
        <QuickModule title="Organization Settings" link="/app/admin/settings" desc="Profile, compliance, and branding" Icon={SettingsIcon} />
      </div>
    </div>
  );
}

function QuickModule({ title, desc, Icon, link }: { title: string; desc: string; Icon: React.ElementType; link: string }) {
  return (
    <a href={link} className="hms-card p-5 flex items-center gap-4 hover:border-teal-300 hover:shadow-md transition-all group">
      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
        <Icon size={22} className="text-teal-700" />
      </div>
      <div>
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{desc}</div>
      </div>
    </a>
  );
}
