import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Search, X, ChevronRight, Printer, UserCheck, FlaskConical, SkipForward, Plus, Trash2 } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

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
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  const [patSearch,   setPatSearch]   = useState('');
  const [patResults,  setPatResults]  = useState<any[]>([]);
  const [selectedPat, setSelectedPat] = useState<any>(null);
  const [patLoading,  setPatLoading]  = useState(false);
  const patSearchRef = useRef<HTMLInputElement>(null);
  const [patDropdownRect, setPatDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Keep the portal-mounted dropdown anchored under the search input
  // even when the user scrolls or resizes the window.
  useEffect(() => {
    if (!patSearch.trim()) { setPatDropdownRect(null); return; }
    const update = () => {
      const el = patSearchRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPatDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [patSearch]);

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

  // Doctor assignment
  const user = getUser();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showAssignDoctor, setShowAssignDoctor] = useState(false);
  const [assignDoctorSearch, setAssignDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Lab order modal
  const [showLabOrder, setShowLabOrder] = useState(false);
  const [labTests, setLabTests] = useState<Array<{ testCode: string; testName: string; category: string; urgency: string }>>([
    { testCode: '', testName: '', category: 'HEMATOLOGY', urgency: 'ROUTINE' },
  ]);
  const [labPriority, setLabPriority] = useState('ROUTINE');
  const [labNotes, setLabNotes] = useState('');
  const [labSubmitting, setLabSubmitting] = useState(false);

  // Skip patient modal
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipping, setSkipping] = useState(false);

  // Load doctors at this nurse's location for the Assign Doctor picker.
  // The endpoint returns DoctorOrgAffiliation rows with `doctor` nested,
  // so flatten them into a uniform { id, firstName, lastName, specialties }
  // shape that the rest of this page expects.
  useEffect(() => {
    if (!user?.locationId) return;
    api.get(`/doctors/by-location/${user.locationId}`)
      .then(r => {
        const rows = r.data?.data || r.data || [];
        const flat = (Array.isArray(rows) ? rows : []).map((a: any) => {
          // Affiliation row → flatten
          if (a?.doctor) {
            return {
              id: a.doctor.id,
              firstName: a.doctor.firstName,
              lastName: a.doctor.lastName,
              specialties: a.doctor.specialties || [],
              affiliationId: a.id,
              designation: a.designation,
            };
          }
          // Already-flat row (defensive)
          return a;
        }).filter((d: any) => d?.id && d?.firstName);
        setDoctors(flat);
      })
      .catch(() => setDoctors([]));
  }, [user?.locationId]);

  const filteredDoctors = doctors.filter(d => {
    if (!assignDoctorSearch.trim()) return true;
    const n = `${d.firstName || ''} ${d.lastName || ''} ${(d.specialties || []).join(' ')}`.toLowerCase();
    return n.includes(assignDoctorSearch.toLowerCase());
  });

  useEffect(() => {
    if (!patSearch.trim()) { setPatResults([]); setPatLoading(false); return; }
    setPatLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/patients', { params: { q: patSearch, limit: 8 } });
        setPatResults(data.data || []);
      } catch (err) { toast.error('Failed to load data'); } finally { setPatLoading(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [patSearch]);

  const fetchTriages = async () => {
    setLoading(true);
    try {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const { data } = await api.get('/triage', { params: { dateFrom: startOfDay.toISOString(), limit: 100 } });
      setTriages(data.data || []);
      if (data.data?.length) setCurrentToken(data.data[0]?.tokenNumber || null);
    } catch (err) { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTriages(); }, []);

  // IDs of patients already triaged today — used to filter the search dropdown
  // so a nurse can't re-pick someone whose triage is already done.
  const triagedTodayPatientIds = new Set(triages.map(t => t.patientId).filter(Boolean));

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

  const handlePrintTriageCard = (r: any) => {
    const priorityColor = r.triageLevel === 'RED' ? '#DC2626' : r.triageLevel === 'ORANGE' ? '#EA580C' : r.triageLevel === 'YELLOW' ? '#CA8A04' : r.triageLevel === 'GREEN' ? '#16A34A' : '#4B5563';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Triage Assessment Card</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px;}@media print{body{padding:16px;}}</style></head><body>
<div style="text-align:center;margin-bottom:16px;">
  <h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1>
  <h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">TRIAGE ASSESSMENT CARD</h2>
  <hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
</div>
<div style="background:#EA580C;color:#fff;padding:8px 16px;border-radius:6px;font-weight:700;font-size:12px;text-align:center;margin-bottom:20px;letter-spacing:0.5px;">TRIAGE — TIME-CRITICAL DOCUMENT</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:20px;">
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Triage #</span><div style="font-weight:700;margin-top:2px;">${(r.id || '').slice(0, 8)}</div></div>
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Date / Time</span><div style="font-weight:700;margin-top:2px;">${r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</div></div>
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Patient</span><div style="font-weight:700;margin-top:2px;">${r.patient?.firstName || ''} ${r.patient?.lastName || ''} ${r.patientId ? '(' + r.patientId.slice(0,8) + ')' : ''}</div></div>
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Triage Category</span><div style="font-weight:900;margin-top:2px;font-size:15px;color:${priorityColor};">${r.triageLevel || '—'}</div></div>
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Chief Complaint</span><div style="font-weight:700;margin-top:2px;">${r.chiefComplaint || '—'}</div></div>
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Mechanism</span><div style="font-weight:700;margin-top:2px;">${r.briefHistory || r.mechanism || '—'}</div></div>
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">GCS Score</span><div style="font-weight:700;margin-top:2px;">${r.gcsScore || '—'}</div></div>
  <div><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Pain Score</span><div style="font-weight:700;margin-top:2px;">${r.painScore !== undefined && r.painScore !== null && r.painScore !== '' ? r.painScore + ' / 10' : '—'}</div></div>
</div>
<div style="margin-top:16px;padding:12px;background:#FFF7ED;border-left:4px solid #EA580C;border-radius:4px;">
  <div style="font-weight:700;font-size:12px;margin-bottom:6px;color:#EA580C;">VITALS</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px;">
    <div><span style="color:#555;">BP:</span> <span style="font-weight:700;">${r.systolicBp && r.diastolicBp ? r.systolicBp + '/' + r.diastolicBp + ' mmHg' : '—'}</span></div>
    <div><span style="color:#555;">HR:</span> <span style="font-weight:700;">${r.heartRate ? r.heartRate + ' bpm' : '—'}</span></div>
    <div><span style="color:#555;">SpO2:</span> <span style="font-weight:700;">${r.spo2 ? r.spo2 + '%' : '—'}</span></div>
    <div><span style="color:#555;">Temp:</span> <span style="font-weight:700;">${r.temperatureC ? r.temperatureC + ' °C' : '—'}</span></div>
    <div><span style="color:#555;">RR:</span> <span style="font-weight:700;">${r.respiratoryRate ? r.respiratoryRate + ' /min' : '—'}</span></div>
    <div><span style="color:#555;">Wt:</span> <span style="font-weight:700;">${r.weightKg ? r.weightKg + ' kg' : '—'}</span></div>
  </div>
</div>
${r.disposition || r.nurseNotes ? `<div style="margin-top:12px;padding:12px;background:#F8F9FA;border-left:4px solid #6B7280;border-radius:4px;"><div style="font-weight:700;font-size:12px;margin-bottom:4px;">DISPOSITION / ACTION TAKEN</div><div>${r.disposition || r.nurseNotes || '—'}</div></div>` : ''}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;"><div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Triage Nurse</div><div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Emergency Doctor</div><div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Date: ${new Date().toLocaleDateString('en-IN')}</div></div>
<script>window.onload=function(){window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all';

  const resetForm = () => {
    setForm({
      patientId: '', chiefComplaint: '', briefHistory: '', knownAllergies: '', currentMedications: '',
      triageLevel: 'GREEN',
      systolicBp: '', diastolicBp: '', heartRate: '', temperatureC: '', spo2: '',
      respiratoryRate: '', weightKg: '', heightCm: '', painScore: '',
    });
    setNurseNotes('');
    setSelectedPat(null);
    setPatSearch('');
    setSaved(false);
  };

  const handleSaveVitals = async () => {
    if (!form.patientId) { toast.error('Please select a patient first'); return; }
    if (!form.chiefComplaint.trim()) { toast.error('Chief complaint is required'); return; }
    setSaving(true);
    try {
      await api.post('/triage', {
        patientId: form.patientId,
        chiefComplaint: form.chiefComplaint,
        triageLevel: form.triageLevel,
        briefHistory: form.briefHistory || undefined,
        knownAllergies: form.knownAllergies || undefined,
        currentMedications: form.currentMedications || undefined,
        nurseNotes: nurseNotes || undefined,
        assignedDoctorId: selectedDoctor?.id || undefined,
        systolicBp:     form.systolicBp     ? Number(form.systolicBp)     : undefined,
        diastolicBp:    form.diastolicBp    ? Number(form.diastolicBp)    : undefined,
        heartRate:      form.heartRate      ? Number(form.heartRate)      : undefined,
        temperatureC:   form.temperatureC   ? Number(form.temperatureC)   : undefined,
        spo2:           form.spo2           ? Number(form.spo2)           : undefined,
        respiratoryRate:form.respiratoryRate? Number(form.respiratoryRate): undefined,
        weightKg:       form.weightKg       ? Number(form.weightKg)       : undefined,
        heightCm:       form.heightCm       ? Number(form.heightCm)       : undefined,
        painScore:      form.painScore !== '' ? Number(form.painScore)    : undefined,
      });
      toast.success(selectedDoctor ? `Triage saved and assigned to Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'Triage saved');
      setSaved(true);
      fetchTriages();
      // Reset after a beat so the success state is visible
      setTimeout(() => { resetForm(); setSelectedDoctor(null); }, 1200);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save triage'); }
    finally { setSaving(false); }
  };

  // Order lab tests from triage — requires an assigned doctor (lab DTO needs doctorId).
  const submitLabOrder = async () => {
    if (!form.patientId) { toast.error('Select a patient first'); return; }
    if (!selectedDoctor) { toast.error('Assign a doctor before ordering labs'); setShowAssignDoctor(true); return; }
    const valid = labTests.filter(t => t.testName.trim());
    if (!valid.length) { toast.error('Add at least one lab test'); return; }
    setLabSubmitting(true);
    try {
      await api.post('/lab/orders', {
        patientId: form.patientId,
        doctorId: selectedDoctor.id,
        priority: labPriority,
        clinicalNotes: labNotes || form.chiefComplaint || undefined,
        tests: valid.map(t => ({
          testCode: t.testCode || t.testName.toUpperCase().replace(/\s+/g, '_'),
          testName: t.testName,
          category: t.category,
          urgency: t.urgency,
        })),
      });
      toast.success(`${valid.length} lab test(s) ordered`);
      setShowLabOrder(false);
      setLabTests([{ testCode: '', testName: '', category: 'HEMATOLOGY', urgency: 'ROUTINE' }]);
      setLabNotes('');
      setLabPriority('ROUTINE');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to order labs'); }
    finally { setLabSubmitting(false); }
  };

  // Skip the current patient — mark their queue token SKIPPED if we have one,
  // otherwise just clear the form so the nurse can move to the next.
  const handleSkipPatient = async () => {
    if (!form.patientId && !currentToken) { setShowSkip(false); return; }
    setSkipping(true);
    try {
      // Find the patient's active queue token to update its status. fetchTriages
      // already returned the latest token; if currentToken is set, use that.
      if (currentToken && form.patientId) {
        // The queue endpoint takes the token id, not number. Look it up.
        const { data: queue } = await api.get('/queue', { params: { date: new Date().toISOString().slice(0, 10) } });
        const tokens = queue?.tokens || queue?.data || queue || [];
        const match = tokens.find((t: any) => t.patientId === form.patientId);
        if (match) {
          await api.patch(`/queue/${match.id}/status`, { status: 'SKIPPED', notes: skipReason || 'Skipped at triage' });
        }
      }
      toast.success('Patient skipped — moving to next');
      resetForm();
      setSelectedDoctor(null);
      setShowSkip(false);
      setSkipReason('');
      fetchTriages();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to skip patient'); }
    finally { setSkipping(false); }
  };

  const addLabTestRow = () => setLabTests(t => [...t, { testCode: '', testName: '', category: 'HEMATOLOGY', urgency: 'ROUTINE' }]);
  const removeLabTestRow = (i: number) => setLabTests(t => t.length > 1 ? t.filter((_, idx) => idx !== i) : t);
  const updateLabTest = (i: number, k: string, v: string) => setLabTests(t => t.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const vitalsFields = [
    ['systolicBp',      'BP Systolic (mmHg)'],
    ['diastolicBp',     'BP Diastolic (mmHg)'],
    ['heartRate',       'Heart Rate (bpm)'],
    ['temperatureC',    'Temp (°C)'],
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
          <div className="hms-card p-5 overflow-visible relative z-30">
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
                      ref={patSearchRef}
                      value={patSearch}
                      onChange={e => setPatSearch(e.target.value)}
                      placeholder="Search patient by name or ID…"
                      className="w-full pl-8 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {patSearch.trim() !== '' && patDropdownRect && createPortal(
                      (() => {
                        const untriaged = patResults.filter(p => !triagedTodayPatientIds.has(p.id));
                        const hiddenCount = patResults.length - untriaged.length;
                        return (
                          <div
                            style={{ position: 'fixed', top: patDropdownRect.top, left: patDropdownRect.left, width: patDropdownRect.width, zIndex: 9999 }}
                            className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          >
                            {patLoading ? (
                              <div className="p-2 text-xs text-gray-400">Searching…</div>
                            ) : untriaged.length === 0 ? (
                              <div className="p-2 text-xs text-gray-400">
                                {patResults.length === 0 ? 'No patients found' : 'All matches already triaged today'}
                              </div>
                            ) : (
                              <>
                                {untriaged.map(p => (
                                  <button key={p.id} type="button"
                                    onClick={() => { setSelectedPat(p); setForm(f => ({ ...f, patientId: p.id })); setPatSearch(''); setPatResults([]); }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                                    <span className="text-gray-400 ml-2 text-xs">{p.patientId}</span>
                                  </button>
                                ))}
                                {hiddenCount > 0 && (
                                  <div className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-gray-100 bg-gray-50">
                                    {hiddenCount} already triaged today (hidden)
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })(),
                      document.body,
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
            {selectedDoctor && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                <UserCheck size={13} className="text-teal-700" />
                <span className="text-xs text-teal-800 font-medium truncate flex-1">
                  Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                </span>
                <button onClick={() => setSelectedDoctor(null)} className="text-teal-700 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            )}
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
                onClick={() => setShowAssignDoctor(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                <UserCheck size={12} /> {selectedDoctor ? 'Change Doctor' : 'Assign Doctor'}
              </button>
              <button
                onClick={() => {
                  if (!form.patientId) { toast.error('Select a patient first'); return; }
                  setShowLabOrder(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                <FlaskConical size={12} /> Order Lab Tests
              </button>
              <button
                onClick={() => {
                  if (!form.patientId) { toast.error('Select a patient first'); return; }
                  setShowSkip(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                <SkipForward size={12} /> Skip Patient
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

          {/* Triaged Today */}
          {!loading && (
            <div className="hms-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Triaged Today</p>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{triages.length}</span>
              </div>
              {triages.length === 0 ? (
                <EmptyState title="No patients triaged yet" description="Today's triage list will appear here." />
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {triages.map(t => {
                    const lvl = PRIORITY_LEVELS.find(p => p.key === t.triageLevel);
                    const time = t.triageTime ? new Date(t.triageTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <div key={t.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${lvl?.bg || 'bg-gray-50'}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${lvl?.dot || 'bg-gray-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-800 truncate">
                            {t.patient?.firstName} {t.patient?.lastName}
                            {time && <span className="text-gray-400 font-normal ml-1.5">· {time}</span>}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{t.chiefComplaint}</div>
                        </div>
                        <button onClick={() => handlePrintTriageCard(t)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1 flex-shrink-0"><Printer size={11} /> Print</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Assign Doctor Modal ───────────────────────────── */}
      {showAssignDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAssignDoctor(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Assign Doctor</h3>
              <button onClick={() => setShowAssignDoctor(false)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={assignDoctorSearch}
                  onChange={e => setAssignDoctorSearch(e.target.value)}
                  placeholder="Search doctor by name or specialty…"
                  className="w-full pl-8 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {filteredDoctors.length === 0 ? (
                <EmptyState title="No doctors available" description="No doctors are affiliated with this location." />
              ) : (
                <div className="space-y-2">
                  {filteredDoctors.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedDoctor(d); setShowAssignDoctor(false); setAssignDoctorSearch(''); toast.success(`Assigned to Dr. ${d.firstName} ${d.lastName}`); }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedDoctor?.id === d.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {(d.firstName?.[0] || '') + (d.lastName?.[0] || '')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900">Dr. {d.firstName} {d.lastName}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {(d.specialties || []).join(', ') || '—'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Order Lab Tests Modal ───────────────────────────── */}
      {showLabOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowLabOrder(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Order Lab Tests</h3>
              <button onClick={() => setShowLabOrder(false)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {!selectedDoctor && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  ⚠️ Lab orders need an attending doctor. Assign one first using the "Assign Doctor" button.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select value={labPriority} onChange={e => setLabPriority(e.target.value)} className={inp}>
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="STAT">STAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Clinical Notes</label>
                  <input value={labNotes} onChange={e => setLabNotes(e.target.value)} placeholder="Reason for order…" className={inp} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Tests</label>
                  <button onClick={addLabTestRow} className="text-xs text-teal-700 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add Test
                  </button>
                </div>
                <div className="space-y-2">
                  {labTests.map((t, i) => (
                    <div key={i} className="grid grid-cols-[1fr_140px_120px_28px] gap-2 items-center">
                      <input value={t.testName} onChange={e => updateLabTest(i, 'testName', e.target.value)} placeholder="Test name (e.g. CBC)" className={inp} />
                      <select value={t.category} onChange={e => updateLabTest(i, 'category', e.target.value)} className={inp}>
                        <option value="HEMATOLOGY">Hematology</option>
                        <option value="BIOCHEMISTRY">Biochemistry</option>
                        <option value="MICROBIOLOGY">Microbiology</option>
                        <option value="SEROLOGY">Serology</option>
                        <option value="URINE">Urine</option>
                        <option value="RADIOLOGY">Radiology</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <select value={t.urgency} onChange={e => updateLabTest(i, 'urgency', e.target.value)} className={inp}>
                        <option value="ROUTINE">Routine</option>
                        <option value="URGENT">Urgent</option>
                        <option value="STAT">STAT</option>
                      </select>
                      <button onClick={() => removeLabTestRow(i)} disabled={labTests.length <= 1}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowLabOrder(false)} disabled={labSubmitting}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={submitLabOrder} disabled={labSubmitting}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                {labSubmitting ? 'Ordering…' : 'Submit Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Skip Patient Modal ───────────────────────────── */}
      {showSkip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSkip(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Skip Patient</h3>
              <button onClick={() => setShowSkip(false)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-600">
                This patient will be marked as <strong>SKIPPED</strong> in the queue. They can be re-called later but won't be the next in line.
              </p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
                <textarea
                  autoFocus
                  value={skipReason}
                  onChange={e => setSkipReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Patient stepped away, will return in 15 min"
                  className={`${inp} resize-none`}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowSkip(false); setSkipReason(''); }} disabled={skipping}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSkipPatient} disabled={skipping}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50">
                {skipping ? 'Skipping…' : 'Skip Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
