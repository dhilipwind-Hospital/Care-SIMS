import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, X, ChevronRight } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const PRIORITY_LEVELS = [
  { key: 'RED',    label: 'Emergency',   sub: 'Life-threatening & immediate care', border: 'border-red-400',    bg: 'bg-red-50',    dot: 'bg-red-500',    text: 'text-red-700'    },
  { key: 'ORANGE', label: 'Critical',    sub: 'Serious condition, urgent attention', border: 'border-orange-400', bg: 'bg-orange-50', dot: 'bg-orange-500', text: 'text-orange-700' },
  { key: 'YELLOW', label: 'Urgent',      sub: 'Requires evaluation within 30 min',  border: 'border-yellow-400', bg: 'bg-yellow-50', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  { key: 'GREEN',  label: 'Semi-Urgent', sub: 'Can wait up to 1 hour',              border: 'border-green-400',  bg: 'bg-green-50',  dot: 'bg-green-500',  text: 'text-green-700'  },
  { key: 'BLACK',  label: 'Routine',     sub: 'Non-urgent, long wait acceptable',   border: 'border-gray-300',  bg: 'bg-gray-50',   dot: 'bg-gray-400',   text: 'text-gray-600'   },
];

export default function TriagePage() {
  const [triages,    setTriages]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [triagePage, setTriagePage] = useState(1);
  const [triageTotal, setTriageTotal] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  const [patSearch,   setPatSearch]   = useState('');
  const [patResults,  setPatResults]  = useState<any[]>([]);
  const [selectedPat, setSelectedPat] = useState<any>(null);
  const [patLoading,  setPatLoading]  = useState(false);

  const [form, setForm] = useState({
    patientId: '', chiefComplaint: '', briefHistory: '', knownAllergies: '', currentMedications: '',
    triageLevel: 'GREEN',
    systolicBp: '', diastolicBp: '', heartRate: '', temperatureC: '', spo2: '',
    respiratoryRate: '', weightKg: '', heightCm: '', painScore: '',
  });
  const [nurseNotes, setNurseNotes] = useState('');

  // Triage lookup state
  const [tokenLookup, setTokenLookup] = useState('');
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [tokenLookupLoading, setTokenLookupLoading] = useState(false);
  const [patientLookup, setPatientLookup] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [patientLookupLoading, setPatientLookupLoading] = useState(false);

  useEffect(() => {
    if (!patSearch.trim()) { setPatResults([]); return; }
    const t = setTimeout(async () => {
      setPatLoading(true);
      try {
        const { data } = await api.get('/patients', { params: { q: patSearch, limit: 8 } });
        setPatResults(data.data || []);
      } catch (err) { toast.error('Failed to load data'); } finally { setPatLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [patSearch]);

  const fetchTriages = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/triage', { params: { page: triagePage, limit: 20 } });
      setTriages(data.data || []);
      setTriageTotal(data.meta?.total || 0);
      if (data.data?.length) setCurrentToken(data.data[0]?.tokenNumber || null);
    } catch (err) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTriages(); }, [triagePage]);

  const handleTokenLookup = async () => {
    if (!tokenLookup.trim()) { toast.error('Enter a token ID'); return; }
    setTokenLookupLoading(true); setTokenResult(null);
    try {
      const { data } = await api.get(`/triage/by-token/${tokenLookup.trim()}`);
      setTokenResult(data.data || data || null);
      if (!data.data && !data) toast('No triage record found for this token');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Token lookup failed'); setTokenResult(null); }
    finally { setTokenLookupLoading(false); }
  };

  const handlePatientLookup = async () => {
    if (!patientLookup.trim()) { toast.error('Enter a patient ID'); return; }
    setPatientLookupLoading(true); setPatientResults([]);
    try {
      const { data } = await api.get(`/triage/by-patient/${patientLookup.trim()}`);
      const results = Array.isArray(data) ? data : data.data || [];
      setPatientResults(results);
      if (results.length === 0) toast('No triage records found for this patient');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Patient lookup failed'); setPatientResults([]); }
    finally { setPatientLookupLoading(false); }
  };

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all';

  const handleSaveVitals = async () => {
    if (!form.patientId) { toast.error('Please select a patient first'); return; }
    setSaving(true);
    try {
      await api.post('/triage', {
        patientId: form.patientId,
        chiefComplaint: form.chiefComplaint,
        triageLevel: form.triageLevel,
        systolicBp:     form.systolicBp     ? Number(form.systolicBp)     : undefined,
        diastolicBp:    form.diastolicBp    ? Number(form.diastolicBp)    : undefined,
        heartRate:      form.heartRate      ? Number(form.heartRate)      : undefined,
        temperatureC:   form.temperatureC   ? Number(form.temperatureC)   : undefined,
        spo2:           form.spo2           ? Number(form.spo2)           : undefined,
        respiratoryRate:form.respiratoryRate? Number(form.respiratoryRate): undefined,
        weightKg:       form.weightKg       ? Number(form.weightKg)       : undefined,
        heightCm:       form.heightCm       ? Number(form.heightCm)       : undefined,
        painScore:      form.painScore      ? Number(form.painScore)      : undefined,
      });
      toast.success('Triage saved');
      setSaved(true);
      fetchTriages();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save triage'); }
    finally { setSaving(false); }
  };

  const vitalsFields = [
    ['systolicBp',      'BP Systolic (mmHg)'],
    ['diastolicBp',     'BP Diastolic (mmHg)'],
    ['heartRate',       'Heart Rate (bpm)'],
    ['temperatureC',    'Temp (°F)'],
    ['spo2',            'SpO₂ (%)'],
    ['respiratoryRate', 'Resp. Rate (/min)'],
    ['weightKg',        'Weight (kg)'],
    ['heightCm',        'Height (cm)'],
    ['painScore',       'Pain Scale (0-10)'],
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Triage Station</h1>
            <p className="text-sm text-gray-400 mt-0.5">OPD Queue Recording &amp; Patient Assessments</p>
          </div>
          {currentToken && (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-xs text-teal-600 font-medium">Current Token</span>
              <span className="font-bold text-teal-800 text-sm">{currentToken}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-5 p-5 overflow-auto">

        {/* Left Column: Patient + Vitals + Chief Complaint */}
        <div className="flex-1 space-y-4">

          {/* Patient Banner */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-500 text-sm font-semibold">
                  {selectedPat ? `${selectedPat.firstName?.[0]}${selectedPat.lastName?.[0]}` : '?'}
                </span>
              </div>
              <div className="flex-1">
                {selectedPat ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{selectedPat.firstName} {selectedPat.lastName}</span>
                      <button onClick={() => { setSelectedPat(null); setForm(f => ({ ...f, patientId: '' })); }}
                        className="text-gray-400 hover:text-red-500">
                        <X size={13} />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                      {selectedPat.dateOfBirth && <span>{new Date().getFullYear() - new Date(selectedPat.dateOfBirth).getFullYear()} yrs</span>}
                      {selectedPat.gender && <span>• {selectedPat.gender}</span>}
                      {selectedPat.bloodGroup && <span>• {selectedPat.bloodGroup}</span>}
                      {selectedPat.phone && <span>• {selectedPat.phone}</span>}
                      {selectedPat.patientId && <span className="text-teal-600">• {selectedPat.patientId}</span>}
                    </div>
                  </>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={patSearch}
                      onChange={e => setPatSearch(e.target.value)}
                      placeholder="Search patient by name or ID…"
                      className="w-full pl-8 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {patResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-44 overflow-y-auto">
                        {patLoading
                          ? <div className="p-2 text-xs text-gray-400">Searching…</div>
                          : patResults.map(p => (
                            <button key={p.id} type="button"
                              onClick={() => { setSelectedPat(p); setForm(f => ({ ...f, patientId: p.id })); setPatSearch(''); setPatResults([]); }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                              <span className="font-medium">{p.firstName} {p.lastName}</span>
                              <span className="text-gray-400 ml-2 text-xs">{p.patientId}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vital Signs Recording */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded border-2 border-teal-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-teal-500 rounded-sm" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Vital Signs Recording</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {vitalsFields.map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={inp}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Chief Complaint & History */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded border border-gray-300" />
              <span className="text-sm font-semibold text-gray-800">Chief Complaint &amp; History</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Chief Complaint</label>
                <input
                  value={form.chiefComplaint}
                  onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))}
                  placeholder="Fever and body ache for 3 days…"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Brief History</label>
                <textarea
                  value={form.briefHistory}
                  onChange={e => setForm(f => ({ ...f, briefHistory: e.target.value }))}
                  rows={3}
                  placeholder="Patient reports high fever for 3 days, body pain, mild headache…"
                  className={`${inp} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Known Allergies</label>
                  <input
                    value={form.knownAllergies}
                    onChange={e => setForm(f => ({ ...f, knownAllergies: e.target.value }))}
                    placeholder="Penicillin…"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Current Medications</label>
                  <input
                    value={form.currentMedications}
                    onChange={e => setForm(f => ({ ...f, currentMedications: e.target.value }))}
                    placeholder="Paracetamol 500mg…"
                    className={inp}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Triage Priority + Nurse Notes + Quick Actions */}
        <div className="w-80 flex-shrink-0 space-y-4">

          {/* Triage Priority */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-gray-800">Triage Priority</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">Select Priority Level</p>
            <div className="space-y-2">
              {PRIORITY_LEVELS.map(lvl => (
                <button
                  key={lvl.key}
                  onClick={() => setForm(f => ({ ...f, triageLevel: lvl.key }))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    form.triageLevel === lvl.key
                      ? `${lvl.border} ${lvl.bg}`
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${lvl.dot}`} />
                  <div>
                    <div className={`text-sm font-semibold ${form.triageLevel === lvl.key ? lvl.text : 'text-gray-700'}`}>
                      {lvl.label}
                    </div>
                    <div className="text-xs text-gray-400">{lvl.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Nurse Notes */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-800">Nurse Notes</span>
            </div>
            <label className="block text-xs text-gray-400 mb-1">Triage Observations</label>
            <textarea
              value={nurseNotes}
              onChange={e => setNurseNotes(e.target.value)}
              rows={4}
              placeholder="Patient alert and oriented, M/A distress (jus to health)…"
              className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all`}
            />
          </div>

          {/* Quick Actions */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-800">Quick Actions</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleSaveVitals}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                {saving ? 'Saving…' : 'Save Vitals'}
              </button>
              <button
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                Assign Doctor
              </button>
              <button
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                Order Lab Tests
              </button>
              <button
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                Skip Patient
              </button>
            </div>
            {/* Complete Triage CTA */}
            <button
              onClick={handleSaveVitals}
              disabled={saving || saved}
              className="w-full py-2.5 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
            >
              {saved ? 'Triage Completed ✓' : (
                <><ChevronRight size={15} /> Complete Triage &amp; Assign Doctor</>
              )}
            </button>
          </div>

          {/* Triage Lookups */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-800">Triage Lookup</span>
            </div>

            {/* Token Lookup */}
            <label className="block text-xs text-gray-500 mb-1">Lookup by Token ID</label>
            <div className="flex gap-2 mb-2">
              <input
                value={tokenLookup}
                onChange={e => setTokenLookup(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTokenLookup()}
                placeholder="Enter token ID..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
              />
              <button onClick={handleTokenLookup} disabled={tokenLookupLoading}
                className="px-3 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {tokenLookupLoading ? '...' : 'Search'}
              </button>
            </div>
            {tokenResult && (
              <div className="bg-teal-50 rounded-xl p-3 mb-3 space-y-1">
                <div className="text-xs font-semibold text-teal-800">
                  {tokenResult.patient?.firstName} {tokenResult.patient?.lastName}
                </div>
                <div className="text-xs text-gray-600">Level: <span className="font-medium">{tokenResult.triageLevel}</span></div>
                <div className="text-xs text-gray-600">Complaint: {tokenResult.chiefComplaint || '---'}</div>
                {tokenResult.systolicBp && <div className="text-xs text-gray-500">BP: {tokenResult.systolicBp}/{tokenResult.diastolicBp} | HR: {tokenResult.heartRate} | SpO2: {tokenResult.spo2}%</div>}
              </div>
            )}

            {/* Patient Lookup */}
            <label className="block text-xs text-gray-500 mb-1 mt-3">Lookup by Patient ID</label>
            <div className="flex gap-2 mb-2">
              <input
                value={patientLookup}
                onChange={e => setPatientLookup(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePatientLookup()}
                placeholder="Enter patient ID..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
              />
              <button onClick={handlePatientLookup} disabled={patientLookupLoading}
                className="px-3 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {patientLookupLoading ? '...' : 'Search'}
              </button>
            </div>
            {patientResults.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {patientResults.map((t: any) => {
                  const lvl = PRIORITY_LEVELS.find(p => p.key === t.triageLevel);
                  return (
                    <div key={t.id} className={`rounded-xl p-3 ${lvl?.bg || 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${lvl?.dot || 'bg-gray-400'}`} />
                        <span className="text-xs font-semibold text-gray-800">{t.triageLevel}</span>
                        <span className="text-xs text-gray-400 ml-auto">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Complaint: {t.chiefComplaint || '---'}</div>
                      {t.systolicBp && <div className="text-xs text-gray-500">BP: {t.systolicBp}/{t.diastolicBp} | HR: {t.heartRate} | SpO2: {t.spo2}%</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Triage Records */}
          {!loading && (
            <div className="hms-card p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Recent Triage Records</p>
              {triages.length === 0 ? (
                <EmptyState title="No triage records" description="No triage records found." />
              ) : (
                <div className="space-y-2">
                  {triages.map(t => {
                    const lvl = PRIORITY_LEVELS.find(p => p.key === t.triageLevel);
                    return (
                      <div key={t.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${lvl?.bg || 'bg-gray-50'}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${lvl?.dot || 'bg-gray-400'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">
                            {t.patient?.firstName} {t.patient?.lastName}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{t.chiefComplaint}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Pagination page={triagePage} totalPages={Math.ceil(triageTotal / 20)} onPageChange={setTriagePage} totalItems={triageTotal} pageSize={20} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
