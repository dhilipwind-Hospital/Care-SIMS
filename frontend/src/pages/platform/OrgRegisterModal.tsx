import { useState } from 'react';
import { X, Building2, ChevronRight, CheckCircle, Pill, FlaskConical, Eye, Activity, Droplets } from 'lucide-react';
import api from '../../lib/api';

const DEFAULT_FEATURES: Record<string, string[]> = {
  CLINIC: ['MOD_PAT_REG','MOD_PAT_SELF_BOOK','MOD_PAT_RECORDS','MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_CONSULT','MOD_RX','MOD_LAB_ORD','MOD_VITALS','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
  HOSPITAL: ['MOD_PAT_REG','MOD_PAT_SELF_BOOK','MOD_PAT_RECORDS','MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_TOKEN','MOD_TRIAGE','MOD_CONSULT','MOD_RX','MOD_LAB_ORD','MOD_REFERRAL','MOD_ICD','MOD_VITALS','MOD_WARD','MOD_ADMISSION','MOD_MED_ADMIN','MOD_DISCHARGE','MOD_DISPENSARY','MOD_PHARMA_FULL','MOD_PHARMA_PO','MOD_PHARMA_RETURNS','MOD_PHARMA_REPORTS','MOD_LAB_BASIC','MOD_LAB_FULL','MOD_LAB_QC','MOD_LAB_REPORTS','MOD_BILL_OPD','MOD_BILL_IPD','MOD_GST','MOD_OT_BASIC','MOD_OT_SCHEDULE','MOD_OT_LIVE','MOD_OT_EQUIPMENT','MOD_REPORTS','MOD_AUDIT'],
  MULTISPECIALTY: ['MOD_PAT_REG','MOD_PAT_SELF_BOOK','MOD_PAT_RECORDS','MOD_PAT_CROSS_LOC','MOD_PAT_PORTAL','MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_TOKEN','MOD_TRIAGE','MOD_CONSULT','MOD_RX','MOD_LAB_ORD','MOD_REFERRAL','MOD_ICD','MOD_TELEMEDICINE','MOD_VITALS','MOD_WARD','MOD_ADMISSION','MOD_MED_ADMIN','MOD_ICU','MOD_DISCHARGE','MOD_DISPENSARY','MOD_PHARMA_FULL','MOD_PHARMA_PO','MOD_PHARMA_RETURNS','MOD_PHARMA_CENTRAL','MOD_PHARMA_REPORTS','MOD_LAB_BASIC','MOD_LAB_FULL','MOD_LAB_QC','MOD_LAB_REPORTS','MOD_RADIOLOGY','MOD_PACS','MOD_BILL_OPD','MOD_BILL_IPD','MOD_BILL_INS','MOD_BILL_CGHS','MOD_BILL_CREDIT','MOD_GST','MOD_OT_BASIC','MOD_OT_SCHEDULE','MOD_OT_LIVE','MOD_OT_EQUIPMENT','MOD_ANAES','MOD_MULTI_LOC','MOD_CROSS_LOC_RX','MOD_REFERRAL_NET','MOD_CENTRAL_RPT','MOD_REPORTS','MOD_AUDIT','MOD_COMPLIANCE'],
  PHARMACY_STANDALONE: ['MOD_PHARMA_FULL','MOD_PHARMA_PO','MOD_PHARMA_RETURNS','MOD_PHARMA_REPORTS','MOD_PHARMA_CENTRAL','MOD_DISPENSARY','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
  LAB_STANDALONE: ['MOD_LAB_BASIC','MOD_LAB_FULL','MOD_LAB_QC','MOD_LAB_REPORTS','MOD_RADIOLOGY','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
  DENTAL_CLINIC: ['MOD_PAT_REG','MOD_PAT_RECORDS','MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_CONSULT','MOD_RX','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
  OPTICAL_CENTRE: ['MOD_PAT_REG','MOD_PAT_RECORDS','MOD_APPT','MOD_CONSULT','MOD_RX','MOD_DISPENSARY','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
  IMAGING_CENTRE: ['MOD_PAT_REG','MOD_PAT_RECORDS','MOD_APPT','MOD_LAB_FULL','MOD_LAB_REPORTS','MOD_RADIOLOGY','MOD_PACS','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
  BLOOD_BANK: ['MOD_PAT_REG','MOD_LAB_BASIC','MOD_LAB_FULL','MOD_LAB_QC','MOD_LAB_REPORTS','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
  PHYSIOTHERAPY: ['MOD_PAT_REG','MOD_PAT_RECORDS','MOD_QUEUE','MOD_APPT','MOD_VITALS','MOD_CONSULT','MOD_BILL_OPD','MOD_GST','MOD_AUDIT'],
};

const PLAN_BY_TYPE: Record<string, string> = {
  CLINIC: 'STARTER',
  HOSPITAL: 'STANDARD',
  MULTISPECIALTY: 'ENTERPRISE',
  PHARMACY_STANDALONE: 'STANDARD',
  LAB_STANDALONE: 'STANDARD',
  DENTAL_CLINIC: 'STARTER',
  OPTICAL_CENTRE: 'STARTER',
  IMAGING_CENTRE: 'STANDARD',
  BLOOD_BANK: 'STANDARD',
  PHYSIOTHERAPY: 'STARTER',
};

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

const STEPS = ['Organization Details', 'Location & Contact', 'Subscription & Features', 'Review & Register'];

interface Props { onClose: () => void; onSuccess: () => void; }

export default function OrgRegisterModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    legalName: '', tradeName: '', orgType: 'HOSPITAL', regNumber: '', gstNumber: '', panNumber: '',
    primaryEmail: '', primaryPhone: '', subscriptionPlan: 'STANDARD', timezone: 'Asia/Kolkata', currency: 'INR',
    locationName: '', locationCode: '', locationType: 'MAIN',
    address: { line1: '', line2: '', city: '', state: '', pin: '', country: 'India' },
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '',
    trialDays: 14,
  });
  const [enabledModules, setEnabledModules] = useState<string[]>(DEFAULT_FEATURES['HOSPITAL']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const setOrgType = (type: string) => {
    setForm(f => ({ ...f, orgType: type, subscriptionPlan: PLAN_BY_TYPE[type] || 'STANDARD' }));
    setEnabledModules(DEFAULT_FEATURES[type] || []);
  };

  const toggleModule = (id: string) => {
    setEnabledModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const cats = [...new Set(ALL_MODULES.map(m => m.cat))];

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/platform/organizations', {
        legalName: form.legalName,
        tradeName: form.tradeName || form.legalName,
        orgType: form.orgType,
        regNumber: form.regNumber,
        gstNumber: form.gstNumber,
        panNumber: form.panNumber,
        primaryEmail: form.primaryEmail,
        primaryPhone: form.primaryPhone,
        subscriptionPlan: form.subscriptionPlan,
        timezone: form.timezone,
        currency: form.currency,
        trialDays: form.trialDays,
        location: {
          name: form.locationName || form.legalName,
          code: form.locationCode,
          type: form.locationType,
          address: form.address,
          phone: form.primaryPhone,
          email: form.primaryEmail,
        },
        adminUser: {
          firstName: form.adminFirstName,
          lastName: form.adminLastName,
          email: form.adminEmail,
          phone: form.adminPhone,
        },
        enabledModules,
      });
      if (data.adminEmail && data.adminTempPassword) {
        setCreatedCreds({ email: data.adminEmail, password: data.adminTempPassword });
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || JSON.stringify(err.response?.data) || 'Registration failed');
    } finally { setSubmitting(false); }
  };

  // ── SUCCESS SCREEN — show admin credentials after org creation ──
  if (createdCreds) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Organization Created!</h2>
          <p className="text-sm text-gray-500 mb-6">{form.tradeName || form.legalName} is ready. Admin credentials below.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6 border border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Admin Email</p>
              <p className="text-sm font-semibold text-gray-900 select-all">{createdCreds.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Temporary Password</p>
              <p className="text-sm font-mono font-semibold text-teal-700 bg-teal-50 rounded-lg px-3 py-1.5 select-all border border-teal-100">{createdCreds.password}</p>
            </div>
            <p className="text-xs text-gray-400">A welcome email has been sent. Password change is required on first login.</p>
          </div>
          <button
            onClick={() => { setCreatedCreds(null); onSuccess(); }}
            className="btn-primary w-full py-2.5"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Building2 size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Register New Organization</h2>
              <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Step progress */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < step ? 'text-white' : i === step ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
                    style={i <= step ? { background: 'linear-gradient(135deg,#0F766E,#14B8A6)' } : {}}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-teal-700' : i < step ? 'text-gray-500' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-teal-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 0: Org Details */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Organization Type</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { type: 'CLINIC',       label: 'Clinic',         desc: '1–3 doctors, OPD only',      plan: 'Starter',              color: 'border-blue-300 bg-blue-50',   badge: null },
                    { type: 'HOSPITAL',     label: 'Hospital',       desc: '10–100 beds, full services',  plan: 'Standard/Professional', color: 'border-purple-300 bg-purple-50', badge: null },
                    { type: 'MULTISPECIALTY',label: 'Multi-Specialty',desc: '100+ beds, multi-location', plan: 'Enterprise',            color: 'border-teal-300 bg-teal-50',   badge: null },
                  ].map(({ type, label, desc, plan, color }) => (
                    <button key={type} onClick={() => setOrgType(type)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${form.orgType === type ? color + ' shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-bold text-sm text-gray-900">{label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                      <div className="text-xs text-teal-600 font-medium mt-1">{plan}</div>
                    </button>
                  ))}
                </div>
                {/* Standalone Applications */}
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Standalone Applications</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: 'PHARMACY_STANDALONE', label: 'Pharmacy Standalone',   desc: 'Independent pharmacy — full dispense, inventory, PO & billing',        plan: 'Standard', color: 'border-amber-300 bg-amber-50',   Icon: Pill,         iconColor: 'text-amber-600' },
                      { type: 'LAB_STANDALONE',      label: 'Lab / Diagnostic',      desc: 'Independent lab — sample processing, results, QC & reports',           plan: 'Standard', color: 'border-rose-300 bg-rose-50',     Icon: FlaskConical, iconColor: 'text-rose-600' },
                      { type: 'DENTAL_CLINIC',       label: 'Dental Clinic',         desc: 'OPD dental practice — consultations, procedures & billing',             plan: 'Starter',  color: 'border-blue-300 bg-blue-50',     Icon: Activity,     iconColor: 'text-blue-600' },
                      { type: 'OPTICAL_CENTRE',      label: 'Optical Centre',        desc: 'Eye care + dispensary — prescriptions & optical inventory',             plan: 'Starter',  color: 'border-cyan-300 bg-cyan-50',     Icon: Eye,          iconColor: 'text-cyan-600' },
                      { type: 'IMAGING_CENTRE',      label: 'Imaging Centre',        desc: 'Radiology & PACS — X-Ray, MRI, CT scans with reports',                 plan: 'Standard', color: 'border-purple-300 bg-purple-50', Icon: FlaskConical, iconColor: 'text-purple-600' },
                      { type: 'BLOOD_BANK',          label: 'Blood Bank',            desc: 'Blood banking — donor management, cross-match, QC & inventory',        plan: 'Standard', color: 'border-red-300 bg-red-50',       Icon: Droplets,     iconColor: 'text-red-600' },
                      { type: 'PHYSIOTHERAPY',       label: 'Physiotherapy Centre',  desc: 'Physio & rehab — appointments, vitals tracking & billing',              plan: 'Starter',  color: 'border-green-300 bg-green-50',   Icon: Activity,     iconColor: 'text-green-600' },
                    ].map(({ type, label, desc, plan, color, Icon, iconColor }) => (
                      <button key={type} onClick={() => setOrgType(type)}
                        className={`p-4 rounded-xl border-2 text-left transition-all flex gap-3 items-start ${
                          form.orgType === type ? color + ' shadow-sm' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          form.orgType === type ? 'bg-white/60' : 'bg-gray-100'
                        }`}>
                          <Icon size={16} className={iconColor} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                            {label}
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Standalone</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
                          <div className="text-xs text-teal-600 font-semibold mt-1">{plan}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Legal Name <span className="text-red-500">*</span></label>
                  <input required value={form.legalName} onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))}
                    placeholder="ABC Healthcare Pvt. Ltd." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trade Name / Brand Name</label>
                  <input value={form.tradeName} onChange={e => setForm(f => ({ ...f, tradeName: e.target.value }))}
                    placeholder="ABC Hospital" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Clinical Establishment Reg # / NABH #</label>
                  <input value={form.regNumber} onChange={e => setForm(f => ({ ...f, regNumber: e.target.value }))}
                    placeholder="CE/TN/2024/12345" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GST Number</label>
                  <input value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))}
                    placeholder="33AAAAA0000A1Z5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PAN Number</label>
                  <input value={form.panNumber} onChange={e => setForm(f => ({ ...f, panNumber: e.target.value }))}
                    placeholder="AAAAA0000A" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
                  <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Location & Contact */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Primary / Head Office Location</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Location Name <span className="text-red-500">*</span></label>
                    <input value={form.locationName} onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))}
                      placeholder="ABC Hospital - Chennai Main" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Location Type</label>
                    <select value={form.locationType} onChange={e => setForm(f => ({ ...f, locationType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="MAIN">Main</option>
                      <option value="BRANCH">Branch</option>
                      <option value="SATELLITE">Satellite</option>
                      <option value="CAMP">Camp</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
                    <input value={form.address.line1} onChange={e => setForm(f => ({ ...f, address: { ...f.address, line1: e.target.value } }))}
                      placeholder="123, Anna Salai" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                      placeholder="Chennai" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                    <input value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                      placeholder="Tamil Nadu" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">PIN Code</label>
                    <input value={form.address.pin} onChange={e => setForm(f => ({ ...f, address: { ...f.address, pin: e.target.value } }))}
                      placeholder="600001" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Primary Email <span className="text-red-500">*</span></label>
                    <input type="email" value={form.primaryEmail} onChange={e => setForm(f => ({ ...f, primaryEmail: e.target.value }))}
                      placeholder="admin@abchospital.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Primary Phone</label>
                    <input value={form.primaryPhone} onChange={e => setForm(f => ({ ...f, primaryPhone: e.target.value }))}
                      placeholder="+91 99999 99999" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Primary Admin Account</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                    <input value={form.adminFirstName} onChange={e => setForm(f => ({ ...f, adminFirstName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                    <input value={form.adminLastName} onChange={e => setForm(f => ({ ...f, adminLastName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Admin Email <span className="text-red-500">*</span></label>
                    <input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                      placeholder="admin@abchospital.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Admin Phone</label>
                    <input value={form.adminPhone} onChange={e => setForm(f => ({ ...f, adminPhone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Subscription & Features */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Subscription Plan</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { plan: 'STARTER', label: 'Starter', price: '₹999/mo', desc: 'Clinics, 1 location, 10 users', color: 'border-gray-300' },
                    { plan: 'STANDARD', label: 'Standard', price: '₹4,999/mo', desc: 'Hospital, 3 locations, 50 users', color: 'border-blue-300' },
                    { plan: 'PROFESSIONAL', label: 'Professional', price: '₹12,999/mo', desc: 'Hospital, 10 locations, 200 users', color: 'border-purple-300' },
                    { plan: 'ENTERPRISE', label: 'Enterprise', price: 'Custom', desc: 'Unlimited, full + dedicated support', color: 'border-amber-300' },
                  ].map(({ plan, label, price, desc, color }) => (
                    <button key={plan} onClick={() => setForm(f => ({ ...f, subscriptionPlan: plan }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${form.subscriptionPlan === plan ? color + ' shadow-sm bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-bold text-sm text-gray-900">{label}</div>
                      <div className="text-xs font-semibold text-teal-700 mt-0.5">{price}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600">Trial Days:</label>
                  <input type="number" min={0} max={90} value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: Number(e.target.value) }))}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <span className="text-xs text-gray-400">days (0 = no trial, starts as ACTIVE)</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Feature Modules ({enabledModules.length} enabled)</label>
                  <div className="flex gap-2">
                    <button onClick={() => setEnabledModules(DEFAULT_FEATURES[form.orgType] || [])} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100">Reset to Default</button>
                    <button onClick={() => setEnabledModules(ALL_MODULES.map(m => m.id))} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Enable All</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {cats.map(cat => (
                    <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">{cat}</span>
                        <span className="text-xs text-gray-400">{ALL_MODULES.filter(m => m.cat === cat && enabledModules.includes(m.id)).length} / {ALL_MODULES.filter(m => m.cat === cat).length}</span>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-2">
                        {ALL_MODULES.filter(m => m.cat === cat).map(mod => (
                          <label key={mod.id} className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={enabledModules.includes(mod.id)} onChange={() => toggleModule(mod.id)}
                              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5" />
                            <span className="text-xs text-gray-700 group-hover:text-gray-900">{mod.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-teal-600" />
                  <span className="text-sm font-bold text-teal-800">Review Before Registration</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-gray-500">Legal Name:</span> <span className="font-semibold">{form.legalName}</span></div>
                  <div><span className="text-gray-500">Trade Name:</span> <span className="font-semibold">{form.tradeName || form.legalName}</span></div>
                  <div><span className="text-gray-500">Org Type:</span> <span className="font-semibold">{form.orgType}</span></div>
                  <div><span className="text-gray-500">Plan:</span> <span className="font-semibold">{form.subscriptionPlan}</span></div>
                  <div><span className="text-gray-500">Primary Email:</span> <span className="font-semibold">{form.primaryEmail}</span></div>
                  <div><span className="text-gray-500">Location:</span> <span className="font-semibold">{form.locationName || form.legalName}</span></div>
                  <div><span className="text-gray-500">City:</span> <span className="font-semibold">{form.address.city}, {form.address.state}</span></div>
                  <div><span className="text-gray-500">Trial Days:</span> <span className="font-semibold">{form.trialDays}</span></div>
                  <div><span className="text-gray-500">Admin User:</span> <span className="font-semibold">{form.adminFirstName} {form.adminLastName} ({form.adminEmail})</span></div>
                  <div><span className="text-gray-500">Modules Enabled:</span> <span className="font-semibold text-teal-700">{enabledModules.length}</span></div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <strong>System will auto-provision:</strong> Tenant ID, subdomain ({'{org-slug}'}.ayphen.io), default feature set, primary admin account, and welcome email.
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.legalName}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting || !form.legalName || !form.primaryEmail}
              className="px-6 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              {submitting ? 'Registering…' : 'Register Organization'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
