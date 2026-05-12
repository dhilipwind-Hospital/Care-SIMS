import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FlaskConical, Pill, UserCheck, Calendar, CheckCircle, AlertTriangle, ChevronRight, Plus, X, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Overview', 'SOAP Notes', 'Orders', 'History'] as const;
type Tab = typeof TABS[number];

const LAB_CATEGORIES = ['HEMATOLOGY', 'BIOCHEMISTRY', 'MICROBIOLOGY', 'SEROLOGY', 'URINE', 'RADIOLOGY', 'OTHER'];

export default function ConsultationPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenId   = params.get('tokenId');

  // Patient — may come from URL param or be picked via inline search
  const [patientId,      setPatientId]      = useState<string | null>(params.get('patientId'));
  const [patSearch,      setPatSearch]      = useState('');
  const [patResults,     setPatResults]     = useState<any[]>([]);

  useEffect(() => {
    if (!patSearch.trim()) { setPatResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/patients', { params: { q: patSearch, limit: 8 } });
        setPatResults(data.data || []);
      } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [patSearch]);

  const [patient,        setPatient]        = useState<any>(null);
  const [vitals,         setVitals]         = useState<any>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState<Tab>('Overview');
  const [saving,         setSaving]         = useState(false);
  const [completed,      setCompleted]      = useState(false);
  const [history,        setHistory]        = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [form, setForm] = useState({
    chiefComplaint: '', historyOfPresentIllness: '', pastMedicalHistory: '',
    examination: '', diagnosis: '', diagnosisCode: '', plan: '', followUpDays: '', notes: '',
  });

  // Lab order panel state
  const [showLabOrder, setShowLabOrder] = useState(false);
  const [labTests, setLabTests] = useState([{ testCode: '', testName: '', category: 'HEMATOLOGY', urgency: 'ROUTINE' }]);
  const [labPriority, setLabPriority] = useState('ROUTINE');
  const [labNotes, setLabNotes] = useState('');
  const [labSubmitting, setLabSubmitting] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    api.get(`/patients/${patientId}`).then(r => setPatient(r.data)).catch(() => {});
    api.get('/vitals/patient/' + patientId, { params: { limit: 1 } }).then(r => setVitals(r.data?.[0])).catch(() => {});
  }, [patientId]);

  useEffect(() => {
    if (activeTab !== 'History' || !patientId) return;
    setHistoryLoading(true);
    api.get('/consultations', { params: { patientId, limit: 10 } })
      .then(r => setHistory(r.data?.data || r.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [activeTab, patientId]);

  const age = patient?.dateOfBirth
    ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
    : null;

  const save = async () => {
    if (!patientId) return;
    setSaving(true);
    try {
      const { data } = await api.post('/consultations', {
        patientId,
        doctorId: user?.sub,
        queueTokenId: tokenId || undefined,
        chiefComplaint: form.chiefComplaint || undefined,
      });
      const id = data?.id;
      const history = [form.historyOfPresentIllness, form.pastMedicalHistory].filter(Boolean).join('\n\n');
      const assessment = [form.diagnosis, form.diagnosisCode].filter(Boolean).join(' ');
      const plan = [form.plan, form.followUpDays && `Follow-up in ${form.followUpDays} day(s)`, form.notes].filter(Boolean).join('\n\n');
      const soap: Record<string, string> = {};
      if (history) soap.historySubjective = history;
      if (form.examination) soap.examinationFindings = form.examination;
      if (assessment) soap.assessment = assessment;
      if (plan) soap.plan = plan;
      if (id && Object.keys(soap).length) {
        await api.put(`/consultations/${id}`, soap);
      }
      setConsultationId(id || null);
      setCompleted(true);
      toast.success('Consultation saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save consultation');
    } finally { setSaving(false); }
  };

  const addLabTestRow = () => setLabTests(t => [...t, { testCode: '', testName: '', category: 'HEMATOLOGY', urgency: 'ROUTINE' }]);
  const removeLabTestRow = (i: number) => setLabTests(t => t.filter((_, idx) => idx !== i));
  const updateLabTest = (i: number, k: string, v: string) => setLabTests(t => t.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const submitLabOrder = async () => {
    const incomplete = labTests.some(t => !t.testName.trim());
    if (incomplete) { toast.error('Each test needs a name'); return; }
    setLabSubmitting(true);
    try {
      await api.post('/lab/orders', {
        patientId, doctorId: user?.sub,
        consultationId: consultationId || undefined,
        priority: labPriority, clinicalNotes: labNotes || undefined,
        tests: labTests.map(t => ({ testCode: t.testCode || t.testName, testName: t.testName, category: t.category, urgency: t.urgency })),
      });
      toast.success('Lab order placed');
      setShowLabOrder(false);
      setLabTests([{ testCode: '', testName: '', category: 'HEMATOLOGY', urgency: 'ROUTINE' }]);
      setLabNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place lab order');
    } finally { setLabSubmitting(false); }
  };

  const goToRx = () => navigate(`/app/doctor/prescriptions?patientId=${patientId}&consultationId=${consultationId || ''}`);
  const goToAdmit = () => navigate(`/app/nurse/wards?admit=1&patientId=${patientId || ''}`);
  const goToFollowUp = () => navigate(`/app/appointments?followUp=1&patientId=${patientId || ''}`);

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all';
  const ta  = `${inp} resize-none`;

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>

      {/* Patient Banner */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {!patientId ? (
            /* ── No patient yet: show inline search ── */
            <div className="flex-1 max-w-md">
              <p className="text-xs font-semibold text-gray-500 mb-1">Select Patient to Begin Consultation</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  autoFocus
                  value={patSearch}
                  onChange={e => setPatSearch(e.target.value)}
                  placeholder="Search patient by name or ID…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {patResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                    {patResults.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setPatientId(p.id); setPatient(p); setPatSearch(''); setPatResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-teal-50 text-sm border-b border-gray-50 last:border-0">
                        <span className="font-medium text-gray-900">{p.firstName} {p.lastName}</span>
                        <span className="text-gray-400 ml-2 text-xs font-mono">{p.patientId}</span>
                        {p.phone && <span className="text-gray-400 ml-2 text-xs">· {p.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Patient selected: show banner ── */
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <span className="text-teal-700 text-sm font-bold">
                  {patient ? `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}` : '?'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-base">
                    {patient ? `${patient.firstName} ${patient.lastName}` : 'Loading…'}
                  </span>
                  {patient?.patientId && <span className="text-xs text-teal-600 font-mono bg-teal-50 px-2 py-0.5 rounded">{patient.patientId}</span>}
                  <button onClick={() => { setPatientId(null); setPatient(null); }} className="text-xs text-gray-400 hover:text-red-500 ml-1"><X size={13} /></button>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  {age && <span>{age} yrs</span>}
                  {patient?.gender && <span>• {patient.gender === 'MALE' ? 'Male' : patient.gender === 'FEMALE' ? 'Female' : patient.gender}</span>}
                  {patient?.bloodGroup && <span>• {patient.bloodGroup}</span>}
                  {patient?.phone && <span>• {patient.phone}</span>}
                </div>
              </div>
            </div>
          )}
          {patient?.knownAllergies && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50">
              <AlertTriangle size={13} className="text-red-500" />
              <div>
                <div className="text-xs font-bold text-red-700">ALLERGY</div>
                <div className="text-xs text-red-600">{patient.knownAllergies}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-6 mt-4 border-b border-gray-100 -mb-4">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-col lg:flex-row flex-1 gap-5 p-3 sm:p-5 overflow-auto">

        {/* Left: SOAP Content */}
        <div className="flex-1 space-y-4">

          {(activeTab === 'Overview' || activeTab === 'SOAP Notes') && (
            <>
              {/* SUBJECTIVE */}
              <div className="hms-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subjective — Chief Complaint & History</span>
                </div>
                <textarea value={form.chiefComplaint} onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))}
                  rows={3} placeholder="Chief complaint..." className={ta} />
                <textarea value={form.historyOfPresentIllness} onChange={e => setForm(f => ({ ...f, historyOfPresentIllness: e.target.value }))}
                  rows={2} placeholder="History of present illness…" className={`${ta} mt-2`} />
              </div>

              {/* OBJECTIVE */}
              <div className="hms-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Objective — Examination & Vitals</span>
                </div>
                {vitals && (
                  <div className="flex gap-6 mb-3 flex-wrap bg-teal-50/50 rounded-lg p-3">
                    {vitals.systolicBp != null && <div><div className="text-xs text-gray-400">BP</div><div className="text-base font-bold text-gray-900">{vitals.systolicBp}/{vitals.diastolicBp} mmHg</div></div>}
                    {vitals.heartRate != null && <div><div className="text-xs text-gray-400">HR</div><div className="text-base font-bold text-gray-900">{vitals.heartRate} bpm</div></div>}
                    {vitals.temperatureC != null && <div><div className="text-xs text-gray-400">Temp</div><div className="text-base font-bold text-gray-900">{vitals.temperatureC}°C</div></div>}
                    {vitals.spo2 != null && <div><div className="text-xs text-gray-400">SpO₂</div><div className="text-base font-bold text-gray-900">{vitals.spo2}%</div></div>}
                    {vitals.respiratoryRate != null && <div><div className="text-xs text-gray-400">RR</div><div className="text-base font-bold text-gray-900">{vitals.respiratoryRate}/min</div></div>}
                  </div>
                )}
                <textarea value={form.examination} onChange={e => setForm(f => ({ ...f, examination: e.target.value }))}
                  rows={3} placeholder="Physical examination findings…" className={ta} />
              </div>
            </>
          )}

          {activeTab === 'History' && (
            <div className="hms-card p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Past Medical History</h3>
                <textarea value={form.pastMedicalHistory} onChange={e => setForm(f => ({ ...f, pastMedicalHistory: e.target.value }))}
                  rows={4} placeholder="Past medical history, family history, social history, surgical history…" className={ta} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Previous Consultations</h3>
                {historyLoading ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">No previous consultations</div>
                ) : (
                  <div className="space-y-3">
                    {history.map((c: any) => (
                      <div key={c.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{c.diagnosis || 'No diagnosis recorded'}</div>
                            {c.diagnosisCode && <div className="text-xs text-gray-400 font-mono">{c.diagnosisCode}</div>}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                            <Clock size={11} /> {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                          </div>
                        </div>
                        {c.chiefComplaint && <div className="text-xs text-gray-600"><span className="font-medium">CC:</span> {c.chiefComplaint}</div>}
                        {c.plan && <div className="text-xs text-gray-600 mt-1"><span className="font-medium">Plan:</span> {c.plan}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Orders' && (
            <div className="space-y-4">
              <div className="hms-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Lab Orders</h3>
                  <button onClick={() => setShowLabOrder(v => !v)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium">
                    <FlaskConical size={13} /> {showLabOrder ? 'Cancel' : 'New Lab Order'}
                  </button>
                </div>

                {showLabOrder && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                    <div className="flex gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                        <select value={labPriority} onChange={e => setLabPriority(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          {['ROUTINE', 'URGENT', 'STAT'].map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                        <div className="col-span-4">Test Name *</div>
                        <div className="col-span-4">Category</div>
                        <div className="col-span-3">Urgency</div>
                      </div>
                      {labTests.map((t, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <input value={t.testName} onChange={e => updateLabTest(i, 'testName', e.target.value)}
                              placeholder="e.g. CBC, LFT, RFT..." className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                          </div>
                          <div className="col-span-4">
                            <select value={t.category} onChange={e => updateLabTest(i, 'category', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                              {LAB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <select value={t.urgency} onChange={e => updateLabTest(i, 'urgency', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
                              {['ROUTINE', 'URGENT', 'STAT'].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                          <div className="col-span-1">
                            {labTests.length > 1 && <button onClick={() => removeLabTestRow(i)} className="p-1 text-red-400 hover:text-red-600"><X size={14} /></button>}
                          </div>
                        </div>
                      ))}
                      <button onClick={addLabTestRow} className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium pt-1">
                        <Plus size={13} /> Add test
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Clinical Notes</label>
                      <input value={labNotes} onChange={e => setLabNotes(e.target.value)} placeholder="Clinical notes for lab..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button onClick={submitLabOrder} disabled={labSubmitting}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                        <FlaskConical size={13} /> {labSubmitting ? 'Ordering...' : 'Place Lab Order'}
                      </button>
                      <button onClick={() => setShowLabOrder(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="hms-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-gray-800">Other Orders</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={goToRx} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors">
                    <Pill size={16} /> Write Prescription
                  </button>
                  <button onClick={goToAdmit} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors">
                    <UserCheck size={16} /> Admit Patient
                  </button>
                  <button onClick={goToFollowUp} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors">
                    <Calendar size={16} /> Schedule Follow-up
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Assessment + Plan + Quick Actions */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4">

          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-teal-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment — Diagnosis</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Primary Diagnosis</label>
                <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                  placeholder="e.g. Acute Pharyngitis" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">ICD-10 Code</label>
                <input value={form.diagnosisCode} onChange={e => setForm(f => ({ ...f, diagnosisCode: e.target.value }))}
                  placeholder="e.g. J02.9" className={inp} />
              </div>
            </div>
          </div>

          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight size={14} className="text-teal-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan — Treatment</span>
            </div>
            <textarea value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              rows={4} placeholder="Treatment plan, instructions, referrals…" className={ta} />
            <div className="mt-2">
              <label className="block text-xs text-gray-400 mb-1">Follow-up (days)</label>
              <input type="number" min="0" value={form.followUpDays}
                onChange={e => setForm(f => ({ ...f, followUpDays: e.target.value }))}
                placeholder="e.g. 7" className={inp} />
            </div>
          </div>

          <div className="hms-card p-5">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={goToRx}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                <Pill size={13} /> Prescription
              </button>
              <button onClick={() => { setActiveTab('Orders'); setShowLabOrder(true); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all">
                <FlaskConical size={13} /> Lab Order
              </button>
              <button onClick={goToAdmit}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all">
                <UserCheck size={13} /> Admit
              </button>
              <button onClick={goToFollowUp}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all">
                <Calendar size={13} /> Follow-up
              </button>
            </div>
            <button onClick={save} disabled={saving || completed}
              className="w-full py-2.5 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              {completed ? <><CheckCircle size={15} /> Consultation Saved</> : saving ? <>Saving…</> : <>Complete Consultation</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
