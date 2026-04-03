import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FlaskConical, Pill, UserCheck, Calendar, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const TABS = ['Overview', 'SOAP Notes', 'Orders', 'History'] as const;
type Tab = typeof TABS[number];

export default function ConsultationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const patientId = params.get('patientId');
  const tokenId   = params.get('tokenId');

  const [patient,        setPatient]        = useState<any>(null);
  const [vitals,         setVitals]         = useState<any>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState<Tab>('Overview');
  const [saving,         setSaving]         = useState(false);
  const [completed,      setCompleted]      = useState(false);

  const [form, setForm] = useState({
    chiefComplaint: '', historyOfPresentIllness: '', pastMedicalHistory: '',
    examination: '', diagnosis: '', diagnosisCode: '', plan: '', followUpDays: '', notes: '',
  });

  useEffect(() => {
    if (patientId) {
      api.get(`/patients/${patientId}`).then(r => setPatient(r.data)).catch((err) => { console.error('Failed to fetch patient:', err); });
      api.get('/vitals/patient/' + patientId, { params: { limit: 1 } }).then(r => setVitals(r.data?.[0])).catch((err) => { console.error('Failed to fetch vitals:', err); });
    }
  }, [patientId]);

  const age = patient?.dateOfBirth
    ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
    : null;

  const save = async () => {
    if (!patientId) return;
    setSaving(true);
    try {
      const { data } = await api.post('/consultations', {
        ...form, patientId, queueTokenId: tokenId,
        followUpDays: form.followUpDays ? Number(form.followUpDays) : undefined,
      });
      setConsultationId(data?.id || null);
      setCompleted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save consultation');
    } finally { setSaving(false); }
  };

  const goToRx = () => navigate(`/app/doctor/prescriptions?patientId=${patientId}&consultationId=${consultationId || ''}`);
  const goToLab = () => {
    if (!patientId) { toast.error('No patient selected'); return; }
    const q = [`patientId=${patientId}`, consultationId ? `consultationId=${consultationId}` : ''].filter(Boolean).join('&');
    navigate(`/app/doctor/queue?labOrder=1&${q}`);
  };
  const goToAdmit = () => navigate(`/app/nurse/wards?admit=1&patientId=${patientId || ''}`);
  const goToFollowUp = () => navigate(`/app/appointments?followUp=1&patientId=${patientId || ''}`);

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all';
  const ta  = `${inp} resize-none`;

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>

      {/* ── Patient Banner ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-500 text-sm font-semibold">
                {patient ? `${patient.firstName?.[0]}${patient.lastName?.[0]}` : '?'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900 text-base">
                  {patient ? `${patient.firstName} ${patient.lastName}` : 'Loading…'}
                </span>
                <span className="text-xs text-gray-400">All vitals</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                {age && <span>{age} yrs</span>}
                {patient?.gender && <span>• {patient.gender === 'MALE' ? 'Male' : patient.gender === 'FEMALE' ? 'Female' : patient.gender}</span>}
                {patient?.bloodGroup && <span>• B+ {patient.bloodGroup}</span>}
                {patient?.phone && <span>• {patient.phone}</span>}
                {patient?.patientId && <span className="text-teal-600">• {patient.patientId}</span>}
              </div>
            </div>
          </div>
          {/* Allergy badge */}
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

        {/* Tabs */}
        <div className="flex gap-6 mt-4 border-b border-gray-100 -mb-4">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-col lg:flex-row flex-1 gap-5 p-3 sm:p-5 overflow-auto">

        {/* Left: SOAP Content */}
        <div className="flex-1 space-y-4">

          {(activeTab === 'Overview' || activeTab === 'SOAP Notes') && (
            <>
              {/* SUBJECTIVE */}
              <div className="hms-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-sm bg-gray-400" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subjective — Chief Complaint &amp; History</span>
                </div>
                <textarea
                  value={form.chiefComplaint}
                  onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))}
                  rows={3}
                  placeholder="Write your notes…"
                  className={ta}
                />
                <textarea
                  value={form.historyOfPresentIllness}
                  onChange={e => setForm(f => ({ ...f, historyOfPresentIllness: e.target.value }))}
                  rows={2}
                  placeholder="History of present illness…"
                  className={`${ta} mt-2`}
                />
              </div>

              {/* OBJECTIVE */}
              <div className="hms-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-sm bg-gray-400" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Objective — Examination &amp; Vitals</span>
                </div>
                {/* Vitals row */}
                {vitals && (
                  <div className="flex gap-6 mb-3 flex-wrap">
                    {vitals.systolicBp != null && (
                      <div>
                        <div className="text-xs text-gray-400">BP</div>
                        <div className="text-base font-bold text-gray-900">{vitals.systolicBp}/{vitals.diastolicBp}</div>
                      </div>
                    )}
                    {vitals.heartRate != null && (
                      <div>
                        <div className="text-xs text-gray-400">HR</div>
                        <div className="text-base font-bold text-gray-900">{vitals.heartRate}</div>
                      </div>
                    )}
                    {vitals.temperatureC != null && (
                      <div>
                        <div className="text-xs text-gray-400">Temp</div>
                        <div className="text-base font-bold text-gray-900">{vitals.temperatureC}°F</div>
                      </div>
                    )}
                    {vitals.spo2 != null && (
                      <div>
                        <div className="text-xs text-gray-400">SpO₂</div>
                        <div className="text-base font-bold text-gray-900">{vitals.spo2}%</div>
                      </div>
                    )}
                  </div>
                )}
                <textarea
                  value={form.examination}
                  onChange={e => setForm(f => ({ ...f, examination: e.target.value }))}
                  rows={3}
                  placeholder="Write your notes…"
                  className={ta}
                />
              </div>
            </>
          )}

          {activeTab === 'History' && (
            <div className="hms-card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Past Medical History</h3>
              <textarea
                value={form.pastMedicalHistory}
                onChange={e => setForm(f => ({ ...f, pastMedicalHistory: e.target.value }))}
                rows={6}
                placeholder="Past medical history, family history, social history…"
                className={ta}
              />
            </div>
          )}

          {activeTab === 'Orders' && (
            <div className="hms-card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Orders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={goToRx}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors">
                  <Pill size={16} /> Write Prescription
                </button>
                <button onClick={goToLab}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors">
                  <FlaskConical size={16} /> Order Lab Tests
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right: Assessment + Plan + Quick Actions */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4">

          {/* Assessment / Diagnosis */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-teal-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment — Diagnosis</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Primary</label>
                <input
                  value={form.diagnosis}
                  onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                  placeholder="e.g. Fever"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">ICD-10</label>
                <input
                  value={form.diagnosisCode}
                  onChange={e => setForm(f => ({ ...f, diagnosisCode: e.target.value }))}
                  placeholder="e.g. R50.9"
                  className={inp}
                />
              </div>
            </div>
          </div>

          {/* Plan / Treatment */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight size={14} className="text-teal-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan — Treatment</span>
            </div>
            <textarea
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              rows={4}
              placeholder="Write a novel…"
              className={ta}
            />
            <div className="mt-2">
              <label className="block text-xs text-gray-400 mb-1">Follow-up (days)</label>
              <input type="number" min="0"
                value={form.followUpDays}
                onChange={e => setForm(f => ({ ...f, followUpDays: e.target.value }))}
                placeholder="e.g. 7"
                className={inp}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="hms-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Actions</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <button
                onClick={goToRx}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                <Pill size={13} /> Write Prescription
              </button>
              <button
                onClick={goToLab}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                <FlaskConical size={13} /> Order Lab Tests
              </button>
              <button
                onClick={goToAdmit}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                <UserCheck size={13} /> Admit Patient
              </button>
              <button
                onClick={goToFollowUp}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                <Calendar size={13} /> Schedule Follow up
              </button>
            </div>
            {/* Complete Consultation CTA */}
            <button
              onClick={save}
              disabled={saving || completed}
              className="w-full py-2.5 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
            >
              {completed ? (
                <><CheckCircle size={15} /> Consultation Completed</>
              ) : saving ? (
                <>Saving…</>
              ) : (
                <>Complete Consultation</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
