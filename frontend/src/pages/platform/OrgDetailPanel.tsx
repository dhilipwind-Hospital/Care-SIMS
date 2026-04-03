import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Building2, MapPin, Users, Layers, Shield, Settings, ChevronDown, ChevronUp, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../lib/api';

const ALL_MODULES = [
  { id: 'MOD_PAT_REG', name: 'Patient Registration', cat: 'Patient Management' },
  { id: 'MOD_PAT_SELF_BOOK', name: 'Patient Self-Booking Portal', cat: 'Patient Management' },
  { id: 'MOD_PAT_RECORDS', name: 'Patient Medical Records', cat: 'Patient Management' },
  { id: 'MOD_PAT_CROSS_LOC', name: 'Cross-Location Record Access', cat: 'Patient Management' },
  { id: 'MOD_PAT_PORTAL', name: 'Patient Portal (App/Web)', cat: 'Patient Management' },
  { id: 'MOD_QUEUE', name: 'OPD Queue Dashboard', cat: 'Reception & Queue' },
  { id: 'MOD_APPT', name: 'Appointment Management', cat: 'Reception & Queue' },
  { id: 'MOD_WALKIN', name: 'Walk-in Registration', cat: 'Reception & Queue' },
  { id: 'MOD_TOKEN', name: 'Token / Display System', cat: 'Reception & Queue' },
  { id: 'MOD_TRIAGE', name: 'Triage Station', cat: 'Reception & Queue' },
  { id: 'MOD_CONSULT', name: 'Doctor Consultation (SOAP Notes)', cat: 'Clinical / Doctor' },
  { id: 'MOD_RX', name: 'Prescriptions', cat: 'Clinical / Doctor' },
  { id: 'MOD_LAB_ORD', name: 'Lab Orders', cat: 'Clinical / Doctor' },
  { id: 'MOD_REFERRAL', name: 'Referral Management', cat: 'Clinical / Doctor' },
  { id: 'MOD_ICD', name: 'ICD-10 Diagnosis Coding', cat: 'Clinical / Doctor' },
  { id: 'MOD_TELEMEDICINE', name: 'Telemedicine / Video Consult', cat: 'Clinical / Doctor' },
  { id: 'MOD_VITALS', name: 'Vitals Recording', cat: 'Nurse Station' },
  { id: 'MOD_WARD', name: 'Ward Management', cat: 'Nurse Station' },
  { id: 'MOD_ADMISSION', name: 'Admissions Management', cat: 'Nurse Station' },
  { id: 'MOD_MED_ADMIN', name: 'Medication Administration (MAR)', cat: 'Nurse Station' },
  { id: 'MOD_ICU', name: 'ICU Management', cat: 'Nurse Station' },
  { id: 'MOD_DISCHARGE', name: 'Discharge Management', cat: 'Nurse Station' },
  { id: 'MOD_DISPENSARY', name: 'Basic Dispensary (OPD Meds)', cat: 'Pharmacy' },
  { id: 'MOD_PHARMA_FULL', name: 'Full Pharmacy (Dispense + Inventory)', cat: 'Pharmacy' },
  { id: 'MOD_PHARMA_PO', name: 'Purchase Orders', cat: 'Pharmacy' },
  { id: 'MOD_PHARMA_RETURNS', name: 'Pharmacy Returns', cat: 'Pharmacy' },
  { id: 'MOD_PHARMA_CENTRAL', name: 'Centralized Inventory (multi-location)', cat: 'Pharmacy' },
  { id: 'MOD_PHARMA_REPORTS', name: 'Pharmacy Reports & Analytics', cat: 'Pharmacy' },
  { id: 'MOD_LAB_BASIC', name: 'Basic Lab (refer-out orders only)', cat: 'Laboratory' },
  { id: 'MOD_LAB_FULL', name: 'Full Lab (sample processing + results)', cat: 'Laboratory' },
  { id: 'MOD_LAB_QC', name: 'Quality Control (Westgard / L-J Charts)', cat: 'Laboratory' },
  { id: 'MOD_LAB_REPORTS', name: 'Lab Reports & Analytics', cat: 'Laboratory' },
  { id: 'MOD_RADIOLOGY', name: 'Radiology / Imaging Orders', cat: 'Laboratory' },
  { id: 'MOD_PACS', name: 'PACS Integration', cat: 'Laboratory' },
  { id: 'MOD_BILL_OPD', name: 'OPD Billing', cat: 'Billing & Finance' },
  { id: 'MOD_BILL_IPD', name: 'IPD Billing', cat: 'Billing & Finance' },
  { id: 'MOD_BILL_INS', name: 'Insurance / TPA Billing', cat: 'Billing & Finance' },
  { id: 'MOD_BILL_CGHS', name: 'CGHS / ECHS Billing', cat: 'Billing & Finance' },
  { id: 'MOD_BILL_CREDIT', name: 'Credit Billing (corporate)', cat: 'Billing & Finance' },
  { id: 'MOD_GST', name: 'GST Computation & Filing', cat: 'Billing & Finance' },
  { id: 'MOD_OT_BASIC', name: 'Minor Procedure Room', cat: 'Operation Theatre' },
  { id: 'MOD_OT_SCHEDULE', name: 'OT Scheduling', cat: 'Operation Theatre' },
  { id: 'MOD_OT_LIVE', name: 'OT Live Monitor', cat: 'Operation Theatre' },
  { id: 'MOD_OT_EQUIPMENT', name: 'OT Equipment & Sterilization', cat: 'Operation Theatre' },
  { id: 'MOD_ANAES', name: 'Anaesthesia Records', cat: 'Operation Theatre' },
  { id: 'MOD_MULTI_LOC', name: 'Multi-Location Management', cat: 'Network & Multi-Location' },
  { id: 'MOD_CROSS_LOC_RX', name: 'Cross-Location Prescriptions View', cat: 'Network & Multi-Location' },
  { id: 'MOD_REFERRAL_NET', name: 'Internal Referral Network', cat: 'Network & Multi-Location' },
  { id: 'MOD_CENTRAL_RPT', name: 'Network-Level Reporting', cat: 'Network & Multi-Location' },
  { id: 'MOD_REPORTS', name: 'Reports & Analytics Dashboard', cat: 'Analytics & Compliance' },
  { id: 'MOD_AUDIT', name: 'Audit Logs', cat: 'Analytics & Compliance' },
  { id: 'MOD_COMPLIANCE', name: 'Compliance Dashboard (NABH/NABL)', cat: 'Analytics & Compliance' },
];

const TABS = ['Overview', 'Feature Modules', 'Locations', 'Users', 'Compliance', 'Settings'];

const ORG_TYPE_COLOR: Record<string, string> = {
  CLINIC: 'bg-blue-50 text-blue-700',
  HOSPITAL: 'bg-purple-50 text-purple-700',
  MULTISPECIALTY: 'bg-teal-50 text-teal-700',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  TRIAL: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

interface Props { org: any; onClose: () => void; onRefresh: () => void; }

export default function OrgDetailPanel({ org, onClose, onRefresh }: Props) {
  const [tab, setTab] = useState('Overview');
  const [detail, setDetail] = useState<any>(org);
  const [features, setFeatures] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locForm, setLocForm] = useState({ name: '', type: 'BRANCH', city: '', state: '', phone: '', email: '' });
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [newPlan, setNewPlan] = useState('');
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [exportSlug, setExportSlug] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [orgRes, featRes, locRes] = await Promise.all([
        api.get(`/platform/organizations/${org.id}`).catch((err) => { console.error('Failed to fetch org details:', err); return { data: org }; }),
        api.get(`/platform/organizations/${org.id}/features`).catch((err) => { console.error('Failed to fetch org features:', err); return { data: [] }; }),
        api.get(`/platform/organizations/${org.id}/locations`).catch((err) => { console.error('Failed to fetch org locations:', err); return { data: [] }; }),
      ]);
      setDetail(orgRes.data?.data || orgRes.data || org);
      setFeatures(featRes.data?.data || featRes.data || []);
      setLocations(locRes.data?.data || locRes.data || []);
    } catch (err) { console.error('Failed to load organization details:', err); toast.error('Failed to load organization details'); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get(`/platform/organizations/${org.id}/users`);
      setUsers(data?.data || data || []);
    } catch (err) { console.error('Failed to load org users:', err); toast.error('Failed to load users'); }
  };

  const [suspending, setSuspending] = useState(false);

  const handleSuspendOrg = async () => {
    setSuspending(true);
    try { await api.patch(`/platform/organizations/${org.id}/suspend`, { reason: 'Suspended by platform admin' }); } catch (err: any) { toast.error('Failed to suspend organization'); }
    setSuspending(false);
    fetchDetail(); onRefresh();
  };

  const handleActivateOrg = async () => {
    setSuspending(true);
    try { await api.patch(`/platform/organizations/${org.id}/activate`); } catch (err: any) { toast.error('Failed to activate organization'); }
    setSuspending(false);
    fetchDetail(); onRefresh();
  };

  useEffect(() => { fetchDetail(); }, [org.id]);
  useEffect(() => { if (tab === 'Users') fetchUsers(); }, [tab]);

  const isEnabled = (moduleId: string) => {
    const f = features.find((f: any) => f.moduleId === moduleId);
    return f ? f.isEnabled : false;
  };

  const toggleFeature = async (moduleId: string, currentlyEnabled: boolean) => {
    setSavingFeature(moduleId);
    try {
      await api.patch(`/platform/organizations/${org.id}/features/${moduleId}`, { isEnabled: !currentlyEnabled });
      await fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle feature');
    } finally { setSavingFeature(null); }
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/platform/organizations/${org.id}/locations`, {
        name: locForm.name, type: locForm.type,
        address: { city: locForm.city, state: locForm.state },
        phone: locForm.phone, email: locForm.email,
      });
      setShowAddLocation(false);
      setLocForm({ name: '', type: 'BRANCH', city: '', state: '', phone: '', email: '' });
      fetchDetail();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add location'); }
  };

  const cats = [...new Set(ALL_MODULES.map(m => m.cat))];

  const COMPLIANCE_ITEMS = [
    { key: 'clinicalEstAct', label: 'Clinical Establishments Act 2010', applicable: ['CLINIC', 'HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'pharmacyLicense', label: "Drugs & Cosmetics Act (Pharmacy License)", applicable: ['HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'nablAccreditation', label: 'NABL Lab Accreditation', applicable: ['HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'nabhAccreditation', label: 'NABH Accreditation', applicable: ['HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'bmwCompliance', label: 'Bio-Medical Waste Rules (BMW)', applicable: ['HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'pcpndtAct', label: 'PC-PNDT Act (Ultrasound/USG)', applicable: ['HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'aerbLicense', label: 'AERB Radiation Safety License', applicable: ['MULTISPECIALTY'] },
    { key: 'fireNoc', label: 'Fire NOC', applicable: ['HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'cghsEmpanelment', label: 'CGHS / ECHS Empanelment', applicable: ['HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'insuranceTpa', label: 'Insurance TPA Agreements', applicable: ['MULTISPECIALTY'] },
    { key: 'bloodBankLicense', label: 'Blood Bank License', applicable: ['MULTISPECIALTY'] },
    { key: 'gstRegistration', label: 'GST Registration', applicable: ['CLINIC', 'HOSPITAL', 'MULTISPECIALTY'] },
    { key: 'jciAccreditation', label: 'JCI Accreditation (International)', applicable: ['MULTISPECIALTY'] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{detail.legalName}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORG_TYPE_COLOR[detail.orgType] || 'bg-gray-100 text-gray-600'}`}>{detail.orgType}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[detail.subscriptionStatus] || 'bg-gray-100 text-gray-600'}`}>{detail.subscriptionStatus}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-teal-700 font-mono bg-teal-50 px-1.5 py-0.5 rounded">{detail.slug}</span>
                <span className="text-xs text-gray-400">{detail.subscriptionPlan} plan</span>
                {detail.primaryEmail && <span className="text-xs text-gray-400">{detail.primaryEmail}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-white overflow-x-auto flex-shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && tab === 'Overview' ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : null}

          {/* Overview */}
          {tab === 'Overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Organization Details</h3>
                  {[
                    ['Legal Name', detail.legalName],
                    ['Trade Name', detail.tradeName || '—'],
                    ['Org Type', detail.orgType],
                    ['Reg Number', detail.regNumber || '—'],
                    ['GST Number', detail.gstNumber || '—'],
                    ['PAN Number', detail.panNumber || '—'],
                    ['Timezone', detail.timezone || 'Asia/Kolkata'],
                    ['Currency', detail.currency || 'INR'],
                    ['Registered', detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('en-IN') : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900 text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Subscription</h3>
                  {[
                    ['Plan', detail.subscriptionPlan],
                    ['Status', detail.subscriptionStatus],
                    ['Trial Ends', detail.trialEndsAt ? new Date(detail.trialEndsAt).toLocaleDateString('en-IN') : '—'],
                    ['Primary Email', detail.primaryEmail || '—'],
                    ['Primary Phone', detail.primaryPhone || '—'],
                    ['Locations', locations.length || detail._count?.locations || '—'],
                    ['Features Enabled', features.filter((f: any) => f.isEnabled).length || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900">{v}</span>
                    </div>
                  ))}
                  <div className="pt-3 flex gap-2 flex-wrap">
                    {detail.subscriptionStatus === 'ACTIVE' && (
                      <button onClick={handleSuspendOrg} disabled={suspending}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium disabled:opacity-50">
                        {suspending ? 'Suspending...' : 'Suspend Org'}
                      </button>
                    )}
                    {detail.subscriptionStatus === 'SUSPENDED' && (
                      <button onClick={handleActivateOrg} disabled={suspending}
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium disabled:opacity-50">
                        {suspending ? 'Activating...' : 'Activate Org'}
                      </button>
                    )}
                    <button onClick={() => { setNewPlan(detail.subscriptionPlan); setShowChangePlan(true); }} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium">Change Plan</button>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Locations', value: locations.length || detail._count?.locations || 0, icon: MapPin, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Users', value: users.length || detail._count?.users || '—', icon: Users, color: 'text-purple-600 bg-purple-50' },
                  { label: 'Features ON', value: features.filter((f: any) => f.isEnabled).length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
                  { label: 'Features OFF', value: ALL_MODULES.length - features.filter((f: any) => f.isEnabled).length, icon: XCircle, color: 'text-gray-600 bg-gray-100' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon size={16} /></div>
                    <div><div className="text-xl font-bold text-gray-900">{value}</div><div className="text-xs text-gray-500">{label}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Modules */}
          {tab === 'Feature Modules' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Toggle feature modules for <strong>{detail.legalName}</strong>. Changes take effect immediately.</p>
              {cats.map(cat => {
                const catMods = ALL_MODULES.filter(m => m.cat === cat);
                const enabledCount = catMods.filter(m => isEnabled(m.id)).length;
                return (
                  <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Layers size={14} className="text-teal-600" />
                        <span className="text-sm font-bold text-gray-800">{cat}</span>
                        <span className="text-xs text-gray-400">{enabledCount}/{catMods.length} enabled</span>
                      </div>
                      {expandedCat === cat ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                    </button>
                    {expandedCat === cat && (
                      <div className="divide-y divide-gray-50">
                        {catMods.map(mod => {
                          const enabled = isEnabled(mod.id);
                          const saving = savingFeature === mod.id;
                          return (
                            <div key={mod.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                              <div>
                                <div className="text-sm font-medium text-gray-800">{mod.name}</div>
                                <div className="text-xs text-gray-400 font-mono">{mod.id}</div>
                              </div>
                              <button onClick={() => toggleFeature(mod.id, enabled)} disabled={saving}
                                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${enabled ? 'bg-teal-500' : 'bg-gray-300'} ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : ''}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Locations */}
          {tab === 'Locations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{locations.length} location(s) for <strong>{detail.legalName}</strong></p>
                <button onClick={() => setShowAddLocation(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  <Plus size={13} /> Add Location
                </button>
              </div>

              {showAddLocation && (
                <form onSubmit={addLocation} className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Location Name', key: 'name', required: true },
                    { label: 'City', key: 'city' },
                    { label: 'State', key: 'state' },
                    { label: 'Phone', key: 'phone' },
                    { label: 'Email', key: 'email' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input required={f.required} value={(locForm as any)[f.key]} onChange={e => setLocForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select value={locForm.type} onChange={e => setLocForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {['MAIN','BRANCH','SATELLITE','CAMP'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3 flex gap-2 pt-1">
                    <button type="submit" className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>Add</button>
                    <button type="button" onClick={() => setShowAddLocation(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
                  </div>
                </form>
              )}

              {locations.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No locations found</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {locations.map((loc: any) => (
                    <div key={loc.id} className="hms-card p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><MapPin size={14} className="text-blue-600" /></div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{loc.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{loc.locationCode || '—'}</div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {loc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <div>Type: <span className="font-medium text-gray-700">{loc.type}</span></div>
                        {loc.address && <div>Address: <span className="font-medium text-gray-700">{[loc.address.city, loc.address.state].filter(Boolean).join(', ')}</span></div>}
                        {loc.phone && <div>Phone: <span className="font-medium text-gray-700">{loc.phone}</span></div>}
                        {loc.email && <div>Email: <span className="font-medium text-gray-700">{loc.email}</span></div>}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={async () => {
                          await api.patch(`/platform/organizations/${org.id}/locations/${loc.id}`, { isActive: !loc.isActive }).catch((err) => { console.error('Failed to toggle location status:', err); toast.error('Failed to update location status'); });
                          fetchDetail();
                        }} className={`text-xs px-2 py-1 rounded-md font-medium ${loc.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                          {loc.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {tab === 'Users' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Staff accounts for <strong>{detail.legalName}</strong></p>
              {users.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No users found for this organization</div>
              ) : (
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last Login</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{typeof u.role === 'object' && u.role !== null ? u.role.name : (u.role || u.roleName || '—')}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{u.locationName || u.location?.name || '—'}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Compliance */}
          {tab === 'Compliance' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">India-specific compliance requirements for <strong>{detail.orgType}</strong> organizations.</p>
              <div className="grid grid-cols-2 gap-3">
                {COMPLIANCE_ITEMS.filter(c => c.applicable.includes(detail.orgType)).map(item => {
                  const stored = detail.compliance?.[item.key];
                  return (
                    <div key={item.key} className="hms-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{item.label}</div>
                          {stored?.regNumber && <div className="text-xs text-gray-400 mt-0.5">Reg #: {stored.regNumber}</div>}
                          {stored?.expiryDate && (
                            <div className={`text-xs mt-0.5 ${new Date(stored.expiryDate) < new Date() ? 'text-red-600' : 'text-gray-400'}`}>
                              Expires: {new Date(stored.expiryDate).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {stored?.verified ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle size={13} /> Verified</span>
                          ) : stored?.pending ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><Clock size={13} /> Pending</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium"><XCircle size={13} /> Not Set</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                Ayphen stores compliance document numbers and tracks renewal dates with automated alerts per SAAS_02 requirements.
              </div>
            </div>
          )}

          {/* Settings */}
          {tab === 'Settings' && (
            <div className="space-y-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings size={15} /> Organization Settings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['Tenant ID', detail.id, true],
                    ['Subdomain', `${detail.slug}.ayphen.io`, false],
                    ['Timezone', detail.timezone || 'Asia/Kolkata', false],
                    ['Currency', detail.currency || 'INR', false],
                  ].map(([k, v, mono]) => (
                    <div key={k as string}>
                      <div className="text-xs text-gray-400 mb-1">{k}</div>
                      <div className={`font-medium text-gray-800 ${mono ? 'font-mono text-xs bg-gray-100 px-2 py-1.5 rounded-lg' : ''}`}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2"><Shield size={15} /> Danger Zone</h3>
                <p className="text-xs text-red-600 mb-4">These actions are irreversible. Proceed with caution.</p>
                <div className="flex gap-3">
                  {detail.subscriptionStatus === 'SUSPENDED' ? (
                    <button onClick={handleActivateOrg} disabled={suspending}
                      className="text-xs px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                      {suspending ? 'Activating...' : 'Reactivate Organization'}
                    </button>
                  ) : (
                    <button onClick={handleSuspendOrg} disabled={suspending}
                      className="text-xs px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50">
                      {suspending ? 'Suspending...' : 'Suspend Organization'}
                    </button>
                  )}
                  <button onClick={() => { setExportSlug(''); setShowExportConfirm(true); }} className="text-xs px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">Export Org Data</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showChangePlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">Change Subscription Plan</h3>
            <p className="text-sm text-gray-500 mb-4">{detail.legalName || detail.tradeName}</p>
            <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500">
              {['STARTER', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowChangePlan(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={async () => {
                await api.patch(`/platform/organizations/${org.id}/subscription`, { subscriptionPlan: newPlan }).catch((err) => { console.error('Failed to change plan:', err); toast.error('Failed to change plan'); });
                setShowChangePlan(false);
                fetchDetail(); onRefresh();
              }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">Update Plan</button>
            </div>
          </div>
        </div>
      )}

      {showExportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">Export Organization Data</h3>
            <p className="text-sm text-gray-500 mb-4">Type the org slug <span className="font-mono font-bold text-gray-900">{detail.slug}</span> to confirm:</p>
            <input value={exportSlug} onChange={e => setExportSlug(e.target.value)} placeholder="Enter org slug..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExportConfirm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button disabled={exportSlug !== detail.slug} onClick={async () => {
                await api.post(`/platform/organizations/${org.id}/export`).catch((err) => { console.error('Export failed:', err); toast.error('Export failed'); });
                setShowExportConfirm(false);
              }} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">Export Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
