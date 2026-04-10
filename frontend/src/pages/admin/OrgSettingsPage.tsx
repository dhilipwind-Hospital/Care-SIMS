import { useEffect, useState } from 'react';
import { Building2, Save, Globe, Phone, Mail, FileText, Shield, AlertCircle, CheckCircle, ToggleLeft, ToggleRight, Loader2, Upload, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import api from '../../lib/api';

type TabId = 'profile' | 'compliance' | 'contact' | 'features';

const TABS: { id: TabId; label: string; icon: typeof Building2 }[] = [
  { id: 'profile',    label: 'Organization Profile', icon: Building2 },
  { id: 'compliance', label: 'Compliance & Registration', icon: Shield },
  { id: 'contact',    label: 'Contact & Branding', icon: Globe },
  { id: 'features',   label: 'Active Features', icon: FileText },
];

interface OrgFeature {
  id: string;
  isEnabled: boolean;
  module: { id: string; name: string; description?: string; code: string };
}

interface OrgProfile {
  legalName: string;
  tradeName: string;
  orgType: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  timezone: string;
  currency: string;
  primaryEmail: string;
  primaryPhone: string;
  website?: string;
  regNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  nadhNumber?: string;
  slug: string;
  enabledModules?: string[];
  trialEndsAt?: string;
  createdAt?: string;
}

export default function OrgSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [form, setForm] = useState<Partial<OrgProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [features, setFeatures] = useState<OrgFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    api.get('/tenants/me')
      .then(r => {
        setOrg(r.data);
        setForm(r.data);
        setLogoUrl(r.data.logoUrl || null);
      })
      .catch((err) => { console.error('Failed to fetch organization settings:', err); })
      .finally(() => setLoading(false));
  }, []);

  const fetchFeatures = async () => {
    setFeaturesLoading(true);
    try {
      const { data } = await api.get('/tenants/me/features');
      setFeatures(data);
    } catch (err) { console.error('Failed to load feature modules:', err); toast.error('Failed to load feature modules'); }
    finally { setFeaturesLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'features') fetchFeatures();
  }, [activeTab]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data: upload } = await api.post('/uploads/profile-picture', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.patch('/tenants/me', { logoUrl: upload.url });
      setLogoUrl(upload.url);
      toast.success('Logo updated! Log out and back in to see it in the sidebar.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Logo upload failed');
    } finally { setLogoUploading(false); }
  };

  const handleToggleFeature = async (feature: OrgFeature) => {
    setTogglingId(feature.id);
    try {
      await api.patch(`/tenants/me/features/${feature.id}`, { isEnabled: !feature.isEnabled });
      setFeatures(prev => prev.map(f => f.id === feature.id ? { ...f, isEnabled: !f.isEnabled } : f));
      toast.success(`${feature.module.name} ${!feature.isEnabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle feature');
    } finally { setTogglingId(null); }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);
    if (!form.tradeName?.trim()) { setError('Organization name (Trade Name) is required.'); return; }
    if (form.primaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryEmail.trim())) {
      setError('Please enter a valid email address.'); return;
    }
    if (form.primaryPhone && !/^[+]?\d[\d\s\-()]{6,}$/.test(form.primaryPhone.trim())) {
      setError('Please enter a valid phone number.'); return;
    }
    setSaving(true);
    try {
      const updated = await api.patch('/tenants/me', {
        tradeName:    form.tradeName,
        primaryEmail: form.primaryEmail,
        primaryPhone: form.primaryPhone,
        website:      form.website,
        regNumber:    form.regNumber,
        gstNumber:    form.gstNumber,
        panNumber:    form.panNumber,
        nadhNumber:   form.nadhNumber,
        timezone:     form.timezone,
        currency:     form.currency,
      });
      setOrg(updated.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const f = (field: keyof OrgProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading organization settings…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <TopBar
        title="Organization Settings"
        subtitle="Manage your hospital's profile, compliance details, and contact information"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        }
      />

      {/* Org identity banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-5 text-white flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <Building2 size={28} className="text-white" />
          )}
        </div>
        <div>
          <div className="text-xl font-bold">{org?.tradeName || org?.legalName}</div>
          <div className="text-teal-100 text-sm">{org?.legalName}</div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-teal-200 flex-wrap">
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-medium">{org?.orgType}</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-medium">{org?.subscriptionPlan} Plan</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-medium">{org?.subscriptionStatus}</span>
            <span className="font-mono">{org?.slug}.ayphen.io</span>
          </div>
        </div>
        {org?.trialEndsAt && new Date(org.trialEndsAt) > new Date() && (
          <div className="ml-auto bg-amber-400/20 border border-amber-300/30 rounded-xl px-4 py-3 text-center">
            <div className="text-xs text-amber-100">Trial ends</div>
            <div className="font-bold text-amber-100">{new Date(org.trialEndsAt).toLocaleDateString('en-IN')}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="hms-card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-5 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-start gap-2">
              <CheckCircle size={15} className="flex-shrink-0 mt-0.5 text-green-500" />
              Settings saved successfully.
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Legal Name</label>
                  <input
                    value={form.legalName || ''}
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Legal name cannot be changed. Contact platform support.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Trade Name / Brand</label>
                  <input
                    value={form.tradeName || ''}
                    onChange={f('tradeName')}
                    placeholder="Display name for staff and patients"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Organization Type</label>
                  <input
                    value={form.orgType || ''}
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subdomain (Slug)</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <input
                      value={form.slug || ''}
                      disabled
                      className="flex-1 px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
                    />
                    <span className="px-3 py-2.5 bg-gray-100 text-gray-400 text-xs font-mono border-l border-gray-200">.ayphen.io</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Timezone</label>
                  <select
                    value={form.timezone || 'Asia/Kolkata'}
                    onChange={f('timezone')}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Currency</label>
                  <select
                    value={form.currency || 'INR'}
                    onChange={f('currency')}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-2">
                <Shield size={15} className="flex-shrink-0 mt-0.5" />
                <span>Compliance numbers are used in billing, insurance claims, and regulatory reports. Ensure these are accurate.</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Clinical Establishment Registration #
                  </label>
                  <input
                    value={form.regNumber || ''}
                    onChange={f('regNumber')}
                    placeholder="CE/TN/2024/12345"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">As per Clinical Establishments Act 2010</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">NADH / NABH Accreditation #</label>
                  <input
                    value={form.nadhNumber || ''}
                    onChange={f('nadhNumber')}
                    placeholder="NABH/2024/HOSP/XXXXX"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">GST Number</label>
                  <input
                    value={form.gstNumber || ''}
                    onChange={f('gstNumber')}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PAN Number</label>
                  <input
                    value={form.panNumber || ''}
                    onChange={f('panNumber')}
                    placeholder="AAAAA0000A"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mt-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Subscription Info (Read-only)</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-400">Plan</div>
                    <div className="font-semibold text-gray-900">{org?.subscriptionPlan}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Status</div>
                    <div className="font-semibold text-gray-900">{org?.subscriptionStatus}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Registered</div>
                    <div className="font-semibold text-gray-900">
                      {org?.createdAt ? new Date(org.createdAt).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">To change plan or status, contact Ayphen platform support.</p>
              </div>
            </div>
          )}

          {/* Contact & Branding Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-5">
              {/* Logo upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Organization Logo</label>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon size={28} className="text-gray-300" />
                    )}
                  </div>
                  <div>
                    <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
                      {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {logoUploading ? 'Uploading…' : 'Upload Logo'}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                    <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, WebP or SVG. Max 2MB. Appears in sidebar, invoices, and reports.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    <Mail size={12} className="inline mr-1" />Primary Email
                  </label>
                  <input
                    type="email"
                    value={form.primaryEmail || ''}
                    onChange={f('primaryEmail')}
                    placeholder="admin@yourhospital.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    <Phone size={12} className="inline mr-1" />Primary Phone
                  </label>
                  <input
                    value={form.primaryPhone || ''}
                    onChange={f('primaryPhone')}
                    placeholder="+91 99999 99999"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    <Globe size={12} className="inline mr-1" />Website URL
                  </label>
                  <input
                    type="url"
                    value={form.website || ''}
                    onChange={f('website')}
                    placeholder="https://www.yourhospital.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Features / Modules Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-2">
                <Shield size={15} className="flex-shrink-0 mt-0.5" />
                <span>Toggle modules on or off for your organization. Disabling a module hides it from staff but does not delete any data.</span>
              </div>
              {featuresLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                  <Loader2 size={16} className="animate-spin" /> Loading modules…
                </div>
              ) : features.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No feature modules available. Contact Ayphen platform support.
                </div>
              ) : (
                <>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {features.filter(f => f.isEnabled).length} of {features.length} Modules Active
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {features.map(feat => (
                      <div
                        key={feat.id}
                        className={`flex items-center justify-between gap-4 rounded-xl border-2 px-5 py-4 transition-all ${
                          feat.isEnabled
                            ? 'border-teal-200 bg-teal-50/60'
                            : 'border-gray-100 bg-gray-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${feat.isEnabled ? 'bg-teal-500' : 'bg-gray-300'}`} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-800">
                              {feat.module.name || feat.module.code.replace(/^MOD_/, '').replace(/_/g, ' ')}
                            </div>
                            {feat.module.description && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate">{feat.module.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            feat.isEnabled ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {feat.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <button
                            onClick={() => handleToggleFeature(feat)}
                            disabled={togglingId === feat.id}
                            className="transition-all disabled:opacity-50"
                            title={feat.isEnabled ? 'Disable module' : 'Enable module'}
                          >
                            {togglingId === feat.id ? (
                              <Loader2 size={24} className="animate-spin text-gray-400" />
                            ) : feat.isEnabled ? (
                              <ToggleRight size={28} className="text-teal-600" />
                            ) : (
                              <ToggleLeft size={28} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
