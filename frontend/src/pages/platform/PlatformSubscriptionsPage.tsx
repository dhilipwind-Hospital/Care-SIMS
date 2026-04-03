import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, TrendingUp, Clock, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';

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

const PLANS = [
  { id: 'STARTER', label: 'Starter', price: '₹999/mo', maxLocations: 1, maxUsers: 10, orgType: 'Clinic', features: 'Basic OPD only' },
  { id: 'STANDARD', label: 'Standard', price: '₹4,999/mo', maxLocations: 3, maxUsers: 50, orgType: 'Hospital', features: 'OPD + IPD + Pharmacy + Lab' },
  { id: 'PROFESSIONAL', label: 'Professional', price: '₹12,999/mo', maxLocations: 10, maxUsers: 200, orgType: 'Hospital', features: 'All modules' },
  { id: 'ENTERPRISE', label: 'Enterprise', price: 'Custom', maxLocations: '∞', maxUsers: '∞', orgType: 'Multi-Specialty', features: 'Full + Custom + Dedicated Support' },
];

export default function PlatformSubscriptionsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [changePlanOrg, setChangePlanOrg] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('');

  useEffect(() => {
    api.get('/platform/organizations', { params: { limit: 200 } })
      .then(r => setOrgs(r.data.data || r.data || []))
      .catch((err) => { console.error('Failed to fetch organizations:', err); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => orgs.filter(o => {
    const matchSearch = !search || o.legalName?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = !filterPlan || o.subscriptionPlan === filterPlan;
    return matchSearch && matchPlan;
  }), [orgs, search, filterPlan]);

  const { active, trial, suspended, trialExpiringSoon } = useMemo(() => ({
    active: orgs.filter(o => o.subscriptionStatus === 'ACTIVE').length,
    trial: orgs.filter(o => o.subscriptionStatus === 'TRIAL').length,
    suspended: orgs.filter(o => o.subscriptionStatus === 'SUSPENDED').length,
    trialExpiringSoon: orgs.filter(o => {
      if (o.subscriptionStatus !== 'TRIAL' || !o.trialEndsAt) return false;
      return (new Date(o.trialEndsAt).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
    }).length,
  }), [orgs]);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Subscription Management" subtitle="Manage organization plans and billing" />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Active Subscriptions" value={active} icon={CheckCircle} color="#10B981" />
        <KpiCard label="On Trial" value={trial} icon={Clock} color="#F59E0B" />
        <KpiCard label="Trial Expiring (7d)" value={trialExpiringSoon} icon={RefreshCw} color="#F97316" />
        <KpiCard label="Suspended" value={suspended} icon={XCircle} color="#EF4444" />
      </div>

      {/* Plan catalog */}
      <div className="hms-card p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-teal-600" /> Subscription Plans</h3>
        <div className="grid grid-cols-4 gap-4">
          {PLANS.map(p => {
            const count = orgs.filter(o => o.subscriptionPlan === p.id).length;
            return (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${PLAN_COLOR[p.id]}`}>{p.label}</span>
                  <span className="text-xl font-black text-gray-900">{count}</span>
                </div>
                <div className="text-sm font-semibold text-teal-700 mb-2">{p.price}</div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div>Org Type: <span className="font-medium text-gray-700">{p.orgType}</span></div>
                  <div>Max Locations: <span className="font-medium text-gray-700">{p.maxLocations}</span></div>
                  <div>Max Users: <span className="font-medium text-gray-700">{p.maxUsers}</span></div>
                  <div className="text-gray-400 mt-1">{p.features}</div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp size={11} className="text-teal-500" />
                    <span className="text-gray-500">{count} organization{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription list */}
      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3 flex-wrap">
          <h3 className="font-bold text-gray-900">All Subscriptions</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organization…"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All Plans</option>
              {PLANS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-gray-400 text-sm">Loading…</div> : (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Organization</th><th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trial Ends</th><th className="px-4 py-3">Registered</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No organizations found</td></tr> :
                filtered.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">{o.legalName}</div>
                      <div className="text-xs font-mono text-teal-600">{o.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{o.orgType}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PLAN_COLOR[o.subscriptionPlan] || 'bg-gray-100 text-gray-600'}`}>{o.subscriptionPlan}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.subscriptionStatus] || 'bg-gray-100 text-gray-600'}`}>{o.subscriptionStatus}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {o.trialEndsAt ? (
                        <span className={(new Date(o.trialEndsAt).getTime() - Date.now()) < 7 * 86400000 ? 'text-orange-600 font-semibold' : ''}>
                          {new Date(o.trialEndsAt).toLocaleDateString('en-IN')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setChangePlanOrg(o); setSelectedPlan(o.subscriptionPlan); }} className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium">Change Plan</button>
                        {o.subscriptionStatus === 'TRIAL' && (
                          <button onClick={async () => {
                            await api.patch(`/platform/organizations/${o.id}/activate`).catch((err) => { console.error('Failed to activate organization:', err); toast.error('Failed to activate organization'); });
                            setOrgs(prev => prev.map(x => x.id === o.id ? { ...x, subscriptionStatus: 'ACTIVE' } : x));
                          }} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Convert to Active</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      {changePlanOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">Change Subscription Plan</h3>
            <p className="text-sm text-gray-500 mb-4">{changePlanOrg.legalName}</p>
            <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500">
              {PLANS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.price}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setChangePlanOrg(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={async () => {
                await api.patch(`/platform/organizations/${changePlanOrg.id}/subscription`, { subscriptionPlan: selectedPlan }).catch((err) => { console.error('Failed to change plan:', err); toast.error('Failed to change plan'); });
                setOrgs(prev => prev.map(x => x.id === changePlanOrg.id ? { ...x, subscriptionPlan: selectedPlan } : x));
                setChangePlanOrg(null);
              }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">Update Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
