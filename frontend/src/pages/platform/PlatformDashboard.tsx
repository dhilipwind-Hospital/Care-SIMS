import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Building2, Shield, Plus, Search, CheckCircle, Clock, XCircle, TrendingUp, Globe, Layers } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';
import OrgRegisterModal from './OrgRegisterModal';
import OrgDetailPanel from './OrgDetailPanel';

const ORG_TYPE_COLOR: Record<string, string> = {
  CLINIC:              'bg-blue-50 text-blue-700',
  HOSPITAL:            'bg-purple-50 text-purple-700',
  MULTISPECIALTY:      'bg-teal-50 text-teal-700',
  PHARMACY_STANDALONE: 'bg-amber-50 text-amber-700',
  LAB_STANDALONE:      'bg-rose-50 text-rose-700',
  DENTAL_CLINIC:       'bg-sky-50 text-sky-700',
  OPTICAL_CENTRE:      'bg-cyan-50 text-cyan-700',
  IMAGING_CENTRE:      'bg-violet-50 text-violet-700',
  BLOOD_BANK:          'bg-red-50 text-red-700',
  PHYSIOTHERAPY:       'bg-green-50 text-green-700',
};
const PLAN_COLOR: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-700',
  STANDARD: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-800',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  TRIAL: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function PlatformDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const handleSuspend = async (orgId: string) => {
    setSuspendingId(orgId);
    try {
      await api.patch(`/platform/organizations/${orgId}/suspend`, { reason: 'Suspended by platform admin' });
    } catch (err: any) {
      toast.error('Failed to suspend organization');
    }
    setSuspendingId(null);
    fetchTenants();
  };

  const handleActivate = async (orgId: string) => {
    setSuspendingId(orgId);
    try {
      await api.patch(`/platform/organizations/${orgId}/activate`);
    } catch (err: any) {
      toast.error('Failed to activate organization');
    }
    setSuspendingId(null);
    fetchTenants();
  };

  const fetchTenants = () => {
    setLoading(true);
    api.get('/platform/organizations', { params: { limit: 200 } })
      .then(r => setTenants(r.data.data || r.data || []))
      .catch((err) => { console.error('Failed to fetch organizations:', err); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const filtered = useMemo(() => tenants.filter(t => {
    const matchSearch = !search || t.legalName?.toLowerCase().includes(search.toLowerCase()) || t.slug?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || t.orgType === filterType;
    const matchStatus = !filterStatus || t.subscriptionStatus === filterStatus;
    return matchSearch && matchType && matchStatus;
  }), [tenants, search, filterType, filterStatus]);

  const { active, trial, suspended, clinics, hospitals, multispec, standalone } = useMemo(() => ({
    active: tenants.filter(t => t.subscriptionStatus === 'ACTIVE').length,
    trial: tenants.filter(t => t.subscriptionStatus === 'TRIAL').length,
    suspended: tenants.filter(t => t.subscriptionStatus === 'SUSPENDED').length,
    clinics: tenants.filter(t => t.orgType === 'CLINIC').length,
    hospitals: tenants.filter(t => t.orgType === 'HOSPITAL').length,
    multispec: tenants.filter(t => t.orgType === 'MULTISPECIALTY').length,
    standalone: tenants.filter(t => ['PHARMACY_STANDALONE','LAB_STANDALONE','DENTAL_CLINIC','OPTICAL_CENTRE','IMAGING_CENTRE','BLOOD_BANK','PHYSIOTHERAPY'].includes(t.orgType)).length,
  }), [tenants]);

  return (
    <div className="p-6 space-y-6">
      <TopBar
        title="Platform Dashboard"
        subtitle="Ayphen HMS — Multi-tenant SaaS administration"
        actions={
          <button onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Register Organization
          </button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Organizations" value={tenants.length} icon={Building2} color="#0F766E" />
        <KpiCard label="Active" value={active} icon={CheckCircle} color="#10B981" />
        <KpiCard label="On Trial" value={trial} icon={Clock} color="#F59E0B" />
        <KpiCard label="Suspended" value={suspended} icon={XCircle} color="#EF4444" />
      </div>

      {/* Org type breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="hms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Clinics</span>
            <span className="text-2xl font-bold text-blue-700">{clinics}</span>
          </div>
          <div className="text-xs text-gray-400">Basic OPD only — Starter plan</div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-blue-400" style={{ width: tenants.length ? `${(clinics / tenants.length) * 100}%` : '0%' }} />
          </div>
        </div>
        <div className="hms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Hospitals</span>
            <span className="text-2xl font-bold text-purple-700">{hospitals}</span>
          </div>
          <div className="text-xs text-gray-400">Full OPD+IPD — Standard/Professional</div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-purple-400" style={{ width: tenants.length ? `${(hospitals / tenants.length) * 100}%` : '0%' }} />
          </div>
        </div>
        <div className="hms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Multi-Specialty</span>
            <span className="text-2xl font-bold text-teal-700">{multispec}</span>
          </div>
          <div className="text-xs text-gray-400">Full network — Enterprise plan</div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-teal-500" style={{ width: tenants.length ? `${(multispec / tenants.length) * 100}%` : '0%' }} />
          </div>
        </div>
        <div className="hms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Standalone</span>
            <span className="text-2xl font-bold text-amber-700">{standalone}</span>
          </div>
          <div className="text-xs text-gray-400">Pharmacy, Lab, Dental, Optical…</div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-amber-400" style={{ width: tenants.length ? `${(standalone / tenants.length) * 100}%` : '0%' }} />
          </div>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3 flex-wrap">
          <h3 className="font-bold text-gray-900">All Organizations</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search org name or slug…"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All Types</option>
              <option value="CLINIC">Clinic</option>
              <option value="HOSPITAL">Hospital</option>
              <option value="MULTISPECIALTY">Multi-Specialty</option>
              <option value="PHARMACY_STANDALONE">Pharmacy Standalone</option>
              <option value="LAB_STANDALONE">Lab / Diagnostic</option>
              <option value="DENTAL_CLINIC">Dental Clinic</option>
              <option value="OPTICAL_CENTRE">Optical Centre</option>
              <option value="IMAGING_CENTRE">Imaging Centre</option>
              <option value="BLOOD_BANK">Blood Bank</option>
              <option value="PHYSIOTHERAPY">Physiotherapy</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading organizations…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No organizations found</p>
            <p className="text-gray-400 text-sm mt-1">Register your first organization to get started</p>
            <button onClick={() => setShowRegister(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Plus size={14} /> Register Organization
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Slug / Domain</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Locations</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Trial Ends</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrg(t)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-gray-900">{t.legalName}</div>
                      {t.tradeName && t.tradeName !== t.legalName && <div className="text-xs text-gray-400">{t.tradeName}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{t.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ORG_TYPE_COLOR[t.orgType] || 'bg-gray-100 text-gray-600'}`}>
                        {t.orgType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PLAN_COLOR[t.subscriptionPlan] || 'bg-gray-100 text-gray-600'}`}>
                        {t.subscriptionPlan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.subscriptionStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {t.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t._count?.locations ?? t.locations?.length ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedOrg(t)}
                          className="text-xs px-2.5 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">
                          Manage
                        </button>
                        {t.subscriptionStatus === 'ACTIVE' ? (
                          <button onClick={() => handleSuspend(t.id)} disabled={suspendingId === t.id}
                            className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium disabled:opacity-50">
                            {suspendingId === t.id ? 'Suspending...' : 'Suspend'}
                          </button>
                        ) : t.subscriptionStatus === 'SUSPENDED' ? (
                          <button onClick={() => handleActivate(t.id)} disabled={suspendingId === t.id}
                            className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium disabled:opacity-50">
                            {suspendingId === t.id ? 'Activating...' : 'Activate'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription plan breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { plan: 'STARTER', label: 'Starter', desc: 'Clinics — OPD only', color: 'text-gray-700', bg: 'bg-gray-50' },
          { plan: 'STANDARD', label: 'Standard', desc: 'Hospital — OPD+IPD+Pharmacy+Lab', color: 'text-blue-700', bg: 'bg-blue-50' },
          { plan: 'PROFESSIONAL', label: 'Professional', desc: 'Hospital — All modules', color: 'text-purple-700', bg: 'bg-purple-50' },
          { plan: 'ENTERPRISE', label: 'Enterprise', desc: 'Multi-Spec Network — Full+Custom', color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(({ plan, label, desc, color, bg }) => {
          const count = tenants.filter(t => t.subscriptionPlan === plan).length;
          return (
            <div key={plan} className={`${bg} rounded-xl border border-gray-200 p-5`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className={color} />
                <span className={`text-sm font-bold ${color}`}>{label}</span>
              </div>
              <div className={`text-3xl font-black ${color} mb-1`}>{count}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
          );
        })}
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="hms-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center"><Globe size={18} className="text-teal-600" /></div>
            <div>
              <div className="text-sm font-bold text-gray-900">Multi-Tenant Architecture</div>
              <div className="text-xs text-gray-400">Hybrid schema-per-tenant isolation</div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between"><span>Shared Platform Schema</span><span className="font-medium text-green-600">✓ Active</span></div>
            <div className="flex justify-between"><span>Per-Tenant Clinical Schemas</span><span className="font-medium text-green-600">✓ Isolated</span></div>
            <div className="flex justify-between"><span>Global Doctor Registry</span><span className="font-medium text-green-600">✓ Active</span></div>
            <div className="flex justify-between"><span>Feature Flag Engine</span><span className="font-medium text-green-600">✓ Active</span></div>
          </div>
        </div>
        <div className="hms-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Layers size={18} className="text-purple-600" /></div>
            <div>
              <div className="text-sm font-bold text-gray-900">Feature Modules</div>
              <div className="text-xs text-gray-400">Toggle-able per organization</div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            {['Patient Management','Reception & Queue','Clinical / Doctor','Nurse Station','Pharmacy','Laboratory','Billing & Finance','Operation Theatre','Analytics & Compliance'].map(cat => (
              <div key={cat} className="flex justify-between"><span>{cat}</span><span className="font-medium text-teal-600">✓</span></div>
            ))}
          </div>
        </div>
        <div className="hms-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Shield size={18} className="text-blue-600" /></div>
            <div>
              <div className="text-sm font-bold text-gray-900">Compliance & Security</div>
              <div className="text-xs text-gray-400">India-specific regulatory standards</div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            {['Clinical Establishments Act 2010','NABH / NABL Accreditation Tracking','Bio-Medical Waste Rules','PC-PNDT Act (Radiology)','CGHS / ECHS Empanelment','Insurance TPA Agreements','GST Registration & Filing','AERB Radiation Safety','DPDP Act Data Portability'].map(c => (
              <div key={c} className="flex justify-between items-center"><span>{c}</span><span className="text-green-600 font-medium">✓</span></div>
            ))}
          </div>
        </div>
      </div>

      {showRegister && <OrgRegisterModal onClose={() => setShowRegister(false)} onSuccess={() => { setShowRegister(false); fetchTenants(); }} />}
      {selectedOrg && <OrgDetailPanel org={selectedOrg} onClose={() => setSelectedOrg(null)} onRefresh={fetchTenants} />}
    </div>
  );
}
