import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Building2, MapPin, Search, FlaskConical, Pill, ChevronRight, LogOut } from 'lucide-react';
import api from '../../lib/api';
import { setAuth, getUser } from '../../lib/auth';

interface Location { id: string; name: string; city: string; type: string; }
interface Org { id: string; name: string; orgType: string; slug: string; locations: Location[]; }

const ORG_TYPE_LABELS: Record<string, { label: string; color: string; Icon: any }> = {
  HOSPITAL:            { label: 'Hospital',              color: 'bg-purple-100 text-purple-700', Icon: Building2 },
  CLINIC:              { label: 'Clinic',                color: 'bg-blue-100 text-blue-700',    Icon: Building2 },
  MULTISPECIALTY:      { label: 'Multi-Specialty',       color: 'bg-teal-100 text-teal-700',    Icon: Building2 },
  PHARMACY_STANDALONE: { label: 'Pharmacy',              color: 'bg-amber-100 text-amber-700',  Icon: Pill },
  LAB_STANDALONE:      { label: 'Lab / Diagnostic',      color: 'bg-rose-100 text-rose-700',    Icon: FlaskConical },
  DENTAL_CLINIC:       { label: 'Dental Clinic',         color: 'bg-sky-100 text-sky-700',      Icon: Building2 },
  OPTICAL_CENTRE:      { label: 'Optical Centre',        color: 'bg-cyan-100 text-cyan-700',    Icon: Building2 },
  IMAGING_CENTRE:      { label: 'Imaging Centre',        color: 'bg-violet-100 text-violet-700',Icon: FlaskConical },
  BLOOD_BANK:          { label: 'Blood Bank',            color: 'bg-red-100 text-red-700',      Icon: FlaskConical },
  PHYSIOTHERAPY:       { label: 'Physiotherapy',         color: 'bg-green-100 text-green-700',  Icon: Building2 },
};

export default function PatientOrgSelectorPage() {
  const navigate = useNavigate();
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<Org | null>(null);
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const patient = JSON.parse(sessionStorage.getItem('patient_info') || 'null');

  useEffect(() => {
    // If already fully authenticated as patient, skip hospital selection
    const existing = getUser();
    if (existing && existing.role === 'PATIENT' && existing.tenantId) {
      navigate('/app/patient/portal', { replace: true });
      return;
    }
    const stored = sessionStorage.getItem('patient_orgs');
    if (!stored || !patient) { navigate('/patient/login'); return; }
    setOrgs(JSON.parse(stored));
  }, []);

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.locations.some(l => l.city.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (org: Org) => {
    setSelected(org);
    setLocationId(org.locations[0]?.id || '');
    setError('');
  };

  const handleConfirm = async () => {
    if (!selected || !patient) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/patient/select-org', {
        patientAccountId: patient.id,
        tenantId: selected.id,
        locationId: locationId || undefined,
      });
      // Store patient session via setAuth so getUser() can read it back correctly
      setAuth(data.accessToken, {
        sub: patient.id,
        id: patient.id,
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        role: 'PATIENT',
        systemRoleId: 'PATIENT',
        tenantId: selected.id,
        locationId: locationId || '',
        userType: 'patient',
        tenantName: data.tenantName,
        enabledModules: [],
      });
      sessionStorage.removeItem('patient_token');
      sessionStorage.removeItem('patient_info');
      sessionStorage.removeItem('patient_orgs');
      window.location.replace('/app/patient/portal');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f0fdfa,#e0f2fe)' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">Ayphen <span className="text-teal-600">HMS</span></span>
        </div>
        <div className="flex items-center gap-3">
          {patient && (
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-semibold text-gray-900">{patient.firstName}</span>
            </span>
          )}
          <button onClick={() => { sessionStorage.clear(); navigate('/patient/login'); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Hospital</h1>
          <p className="text-gray-500 text-sm">
            Select the hospital or clinic you'd like to visit. You can switch hospitals anytime.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by hospital name or city…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm" />
        </div>

        {/* Org grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {filtered.map(org => {
            const meta = ORG_TYPE_LABELS[org.orgType] || ORG_TYPE_LABELS['HOSPITAL'];
            const OrgIcon = meta.Icon;
            const isSelected = selected?.id === org.id;
            return (
              <button key={org.id} onClick={() => handleSelect(org)}
                className={`text-left p-5 rounded-2xl border-2 bg-white transition-all hover:shadow-md ${
                  isSelected ? 'border-teal-500 shadow-md ring-2 ring-teal-200' : 'border-gray-100 hover:border-teal-300'
                }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-600' : 'bg-gray-100'}`}>
                    <OrgIcon size={20} className={isSelected ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{org.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {org.locations.slice(0, 2).map(loc => (
                        <div key={loc.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={11} className="text-teal-500 flex-shrink-0" />
                          {loc.name}{loc.city ? ` — ${loc.city}` : ''}
                        </div>
                      ))}
                      {org.locations.length > 2 && (
                        <div className="text-xs text-teal-600 font-medium">+{org.locations.length - 2} more locations</div>
                      )}
                    </div>
                  </div>
                  {isSelected && <ChevronRight size={16} className="text-teal-600 flex-shrink-0 mt-1" />}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-400">
              <Building2 size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hospitals found matching your search.</p>
            </div>
          )}
        </div>

        {/* Location selector when org selected and has multiple locations */}
        {selected && selected.locations.length > 1 && (
          <div className="hms-card border-teal-200 p-5 mb-5">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
              <MapPin size={12} className="inline mr-1" />Select Branch / Location
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {selected.locations.map(loc => (
                <button key={loc.id} type="button" onClick={() => setLocationId(loc.id)}
                  className={`text-left p-3 rounded-xl border text-sm transition-all ${
                    locationId === loc.id
                      ? 'border-teal-500 bg-teal-50 text-teal-800 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-teal-300'
                  }`}>
                  <div className="font-medium">{loc.name}</div>
                  {loc.city && <div className="text-xs text-gray-400 mt-0.5">{loc.city}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
        )}

        <button onClick={handleConfirm} disabled={!selected || loading}
          className="w-full py-4 rounded-2xl text-base font-bold text-white disabled:opacity-50 transition-all hover:-translate-y-0.5 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
          {loading ? 'Connecting…' : selected ? `Continue to ${selected.name} →` : 'Select a Hospital to Continue'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can change your hospital at any time from your patient portal.
        </p>
      </div>
    </div>
  );
}
