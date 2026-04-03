import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import type { DoctorAffiliation } from '../../context/AuthContext';
import { Building2, Users, Stethoscope, ArrowRight, LogOut, MapPin, Clock, Loader2 } from 'lucide-react';
import api from '../../lib/api';

const EMPLOYMENT_BADGE: Record<string, { label: string; color: string }> = {
  FULL_TIME: { label: 'Full Time', color: '#0F766E' },
  PART_TIME: { label: 'Part Time', color: '#D97706' },
  VISITING: { label: 'Visiting', color: '#2563EB' },
  LOCUM: { label: 'Locum', color: '#7C3AED' },
  HONORARY: { label: 'Honorary', color: '#6B7280' },
};

export default function DoctorOrgSelectorPage() {
  const { pendingDoctorAffiliations, selectDoctorOrg, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [fetchedAffiliations, setFetchedAffiliations] = useState<DoctorAffiliation[] | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  // If no affiliations from login flow, fetch from API
  useEffect(() => {
    if (!pendingDoctorAffiliations || pendingDoctorAffiliations.length === 0) {
      setFetchLoading(true);
      api.get('/doctors/affiliations/tenant')
        .then(({ data }) => {
          const items = Array.isArray(data) ? data : data.data || [];
          const mapped: DoctorAffiliation[] = items.map((a: any) => ({
            affiliationId: a.affiliationId || a.id,
            orgName: a.orgName || a.tenant?.name || a.organization?.name || 'Unknown Org',
            orgId: a.tenantId || a.orgId || '',
            locationId: a.locationId || '',
            designation: a.designation || 'Doctor',
            employmentType: a.employmentType || 'FULL_TIME',
            status: a.status || 'ACTIVE',
            todaysPatients: a.todaysPatients,
          }));
          if (mapped.length > 0) {
            setFetchedAffiliations(mapped);
          } else {
            navigate('/login', { replace: true });
          }
        })
        .catch((err) => {
          console.error('Failed to load affiliations:', err);
          toast.error('Failed to load affiliations');
          navigate('/login', { replace: true });
        })
        .finally(() => setFetchLoading(false));
    }
  }, []);

  const affiliations = pendingDoctorAffiliations && pendingDoctorAffiliations.length > 0
    ? pendingDoctorAffiliations
    : fetchedAffiliations;

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!affiliations || affiliations.length === 0) {
    return null;
  }

  const handleSelect = async (affiliationId: string) => {
    await selectDoctorOrg(affiliationId);
    navigate('/app', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-8 py-7 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563EB,#14B8A6)' }}>
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">Select Your Workspace</div>
              <div className="text-gray-500 text-sm">Choose which hospital to access today</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 bg-blue-50 rounded-xl px-4 py-3 leading-relaxed">
            You are affiliated with <strong>{affiliations.length} organizations</strong> on Ayphen. Select the hospital you want to work in for this session.
          </p>
        </div>

        {/* Affiliation list */}
        <div className="p-6 space-y-3 max-h-[420px] overflow-y-auto">
          {affiliations.map(aff => {
            const badge = EMPLOYMENT_BADGE[aff.employmentType] ?? { label: aff.employmentType, color: '#6B7280' };
            const isActive = aff.status === 'ACTIVE' || aff.status === 'ACCEPTED';

            return (
              <button
                key={aff.affiliationId}
                onClick={() => isActive && handleSelect(aff.affiliationId)}
                disabled={!isActive || loading}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  isActive
                    ? 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer bg-white'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{aff.orgName}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{aff.designation}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: `${badge.color}15`, color: badge.color }}
                        >
                          <Clock size={10} />
                          {badge.label}
                        </span>
                        {aff.locationId && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={10} />
                            Location assigned
                          </span>
                        )}
                        {typeof aff.todaysPatients === 'number' && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Users size={10} />
                            {aff.todaysPatients} patients today
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isActive ? (
                      loading
                        ? <div className="w-8 h-8 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                        : <ArrowRight size={20} className="text-gray-400" />
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {aff.status === 'INACTIVE' ? 'Inactive' : aff.status}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Each session is logged in the audit trail</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
