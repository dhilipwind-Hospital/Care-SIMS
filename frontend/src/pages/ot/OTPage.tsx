import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Scissors, Calendar, Clock, CheckCircle, Plus, X, Search, Pencil, ClipboardCheck, Loader2, Printer } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const EMPTY_BOOKING = {
  otRoomId: '', patientId: '', admissionId: '', procedureName: '',
  primarySurgeonId: '', anesthetistId: '', scheduledDate: '',
  scheduledStart: '', expectedDurationMins: 60, surgeryType: 'ELECTIVE',
  anesthesiaType: '', notes: '', infectionRiskClass: '',
};

// Standard infection risk classification from CDC / NHSN.
// Drives antibiotic prophylaxis decisions and SSI risk stratification.
const INFECTION_RISK_CLASSES = [
  { value: '', label: 'Select…' },
  { value: 'CLEAN', label: 'Clean (Class I)' },
  { value: 'CLEAN_CONTAMINATED', label: 'Clean-Contaminated (Class II)' },
  { value: 'CONTAMINATED', label: 'Contaminated (Class III)' },
  { value: 'DIRTY', label: 'Dirty / Infected (Class IV)' },
];

// Common surgical procedures grouped by specialty. Picking one fills the
// procedure name field; "Other / custom" leaves it empty for free text.
// This is a hardcoded shortlist for now — a proper ProcedureCatalog table
// keyed by ICD-10 / CPT codes is a future enhancement.
const COMMON_PROCEDURES = [
  { group: 'General Surgery', items: [
    'Appendectomy',
    'Laparoscopic Cholecystectomy',
    'Inguinal Hernia Repair',
    'Umbilical Hernia Repair',
    'Hemorrhoidectomy',
    'Excision of Lipoma / Sebaceous Cyst',
    'Mastectomy',
    'Thyroidectomy',
  ]},
  { group: 'Orthopaedics', items: [
    'Total Knee Replacement',
    'Total Hip Replacement',
    'ORIF — Long Bone Fracture',
    'Arthroscopy — Knee',
    'Carpal Tunnel Release',
    'Tendon Repair',
  ]},
  { group: 'Obstetrics & Gynaecology', items: [
    'Caesarean Section (LSCS)',
    'Normal Vaginal Delivery (assisted)',
    'Hysterectomy — Abdominal',
    'Hysterectomy — Laparoscopic',
    'D&C / Dilatation and Curettage',
    'Tubal Ligation',
  ]},
  { group: 'Urology', items: [
    'TURP — Prostate',
    'Cystoscopy',
    'Ureteroscopy + DJ Stent',
    'Circumcision',
  ]},
  { group: 'ENT', items: [
    'Tonsillectomy',
    'Adenoidectomy',
    'FESS — Sinus Surgery',
    'Septoplasty',
  ]},
  { group: 'Ophthalmology', items: [
    'Cataract Surgery (Phacoemulsification)',
    'Pterygium Excision',
  ]},
  { group: 'Other / Custom', items: ['Other (type below)'] },
];

const CHECKLIST_ITEMS = [
  { section: 'Before Induction (Sign In)', items: [
    { key: 'identityConfirmed', label: 'Patient identity confirmed' },
    { key: 'siteMarked', label: 'Surgical site marked' },
    { key: 'consentSigned', label: 'Consent form signed' },
    { key: 'anaesthesiaSafetyCheck', label: 'Anaesthesia safety check completed' },
    { key: 'allergyDocumented', label: 'Known allergy status documented' },
    { key: 'airwayRiskAssessed', label: 'Difficult airway / aspiration risk assessed' },
    { key: 'bloodLossRiskAssessed', label: 'Blood loss risk assessed (>500ml: IV access + blood available)' },
    { key: 'npoConfirmed', label: 'NPO status confirmed' },
    { key: 'pulseOxOn', label: 'Pulse oximeter on patient and functioning' },
  ]},
  { section: 'Before Skin Incision (Time Out)', items: [
    { key: 'teamIntroduced', label: 'All team members introduced by name and role' },
    { key: 'patientProcedureSiteConfirmed', label: 'Patient name, procedure, and site confirmed' },
    { key: 'criticalEventsReviewed', label: 'Anticipated critical events reviewed' },
    { key: 'sterilityConfirmed', label: 'Sterility confirmed, equipment issues checked' },
    { key: 'imagingDisplayed', label: 'Essential imaging displayed' },
    { key: 'antibioticGiven', label: 'Antibiotic prophylaxis given within last 60 minutes' },
  ]},
  { section: 'Before Patient Leaves OR (Sign Out)', items: [
    { key: 'procedureConfirmed', label: 'Procedure name confirmed and recorded' },
    { key: 'countsCorrect', label: 'Instrument, sponge, and needle counts correct' },
    { key: 'specimenLabelled', label: 'Specimen labelled correctly' },
    { key: 'equipmentIssuesDocumented', label: 'Key equipment problems documented' },
    { key: 'recoveryConcernsDocumented', label: 'Key concerns for recovery documented' },
  ]},
];

export default function OTPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'schedule'|'rooms'|'timeline'|'reports'>('schedule');
  const [page, setPage] = useState(1);

  // Schedule surgery modal
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState(EMPTY_BOOKING);
  const [submitting, setSubmitting] = useState(false);

  // Pre-op checklist
  const [checklistBooking, setChecklistBooking] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [checklistSaving, setChecklistSaving] = useState(false);

  // Pre-op assessment
  const [assessBooking, setAssessBooking] = useState<any>(null);
  const [assessForm, setAssessForm] = useState({
    asaGrade: '', mallampatiScore: '', mouthOpening: 'ADEQUATE', neckMobility: 'FULL', dentalStatus: 'NORMAL',
    predictedDifficult: false, cardiacHistory: '', respiratoryHistory: '', diabetesStatus: '', renalStatus: '',
    hepaticStatus: '', allergies: '', currentMedications: '', previousAnaesthesia: '', anaesthesiaPlan: '',
    specialInstructions: '', npoConfirmed: false,
  });
  const [assessSaving, setAssessSaving] = useState(false);

  // Anaesthesia record
  const [anaesBooking, setAnaesBooking] = useState<any>(null);
  const [anaesForm, setAnaesForm] = useState({
    inductionMethod: '', airwayDevice: '', ettSize: '', maintenanceAgent: '', muscleRelaxant: '',
    reversalAgent: '', totalIVFluids: '', totalBloodProducts: '', urineOutput: '',
    recoveryScore: '', recoveryNotes: '',
    events: [] as Array<{ time: string; type: string; detail: string }>,
  });
  const [anaesSaving, setAnaesSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({ time: '', type: 'DRUG', detail: '' });

  // PACU / recovery section. Persisted as structured text inside
  // anaesForm.recoveryNotes (which is the schema-backed column), so there's
  // no DB change. On open we parse it back out; on save we re-serialise.
  const [pacuForm, setPacuForm] = useState({
    arrivedAt: '',       // ISO timestamp, set on PACU admit
    dischargedAt: '',    // ISO timestamp, set on PACU discharge
    destination: '',     // WARD / ICU / DAYCARE / HDU
    activity: 0, breathing: 0, circulation: 0, consciousness: 0, oxygenation: 0,
    bp: '', hr: '', spo2: '', temp: '', painScore: '',
    nurseNotes: '',
  });
  const PACU_MARKER_START = '<<PACU_JSON:';
  const PACU_MARKER_END = ':PACU_JSON>>';
  const aldreteTotal = pacuForm.activity + pacuForm.breathing + pacuForm.circulation + pacuForm.consciousness + pacuForm.oxygenation;

  // Add-OT-Room modal
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', type: 'MAJOR_OT', capacityClass: 'CLASS_2' });
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomError, setRoomError] = useState('');

  // Complete surgery modal
  const [completeBooking, setCompleteBooking] = useState<any>(null);
  const [completeForm, setCompleteForm] = useState({
    intraOpNotes: '', postOpNotes: '', estimatedBloodLoss: '',
    bloodUnitsUsed: '', complications: '', drainInserted: false, drainType: '',
    specimensText: '', implantsText: '',
    instrumentsBefore: '', instrumentsAfter: '',
  });
  const [completeSaving, setCompleteSaving] = useState(false);

  // Timeline
  const [timelineDate, setTimelineDate] = useState(new Date().toISOString().slice(0, 10));
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Reports
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); });
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPatientLabel, setSelectedPatientLabel] = useState('');

  // Doctors (surgeons + anesthetists)
  const [doctors, setDoctors] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.get('/ot/bookings', { params: { limit: 30, date: new Date().toISOString().split('T')[0] } }),
        api.get('/ot/rooms'),
      ]);
      setBookings(bRes.data.data || []);
      setRooms(rRes.data || []);
    } catch (err) { console.error('Failed to load OT data:', err); toast.error('Failed to load OT data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Escape key to close modals
  useEscapeClose(showBooking, () => setShowBooking(false));

  const scheduled = bookings.filter(b => b.status === 'SCHEDULED').length;
  const inProgress = bookings.filter(b => b.status === 'IN_PROGRESS').length;
  const completed = bookings.filter(b => b.status === 'COMPLETED').length;

  // ---------- Patient search ----------
  // When the search box is empty we show the most recently created patients
  // so a first click still surfaces something useful. With ≥2 chars we hit
  // the normal /patients?q= endpoint. Debounced 300ms so typing isn't laggy.
  const searchPatients = async (q: string) => {
    setPatientLoading(true);
    try {
      const params: any = { limit: 8 };
      if (q.trim().length >= 2) params.q = q.trim();
      const { data } = await api.get('/patients', { params });
      setPatients(data.data || []);
    } catch (err) { console.error('Patient search failed:', err); toast.error('Patient search failed'); } finally { setPatientLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // ---------- Open modal ----------
  const openBookingModal = async (booking?: any) => {
    setFormError('');
    setPatientSearch('');
    setPatients([]);

    if (booking) {
      // Editing existing booking
      setEditingId(booking.id);
      setBookingForm({
        otRoomId: booking.otRoomId || '',
        patientId: booking.patientId || '',
        admissionId: booking.admissionId || '',
        procedureName: booking.procedureName || '',
        primarySurgeonId: booking.primarySurgeonId || '',
        anesthetistId: booking.anesthetistId || '',
        scheduledDate: booking.scheduledDate ? new Date(booking.scheduledDate).toISOString().split('T')[0] : '',
        scheduledStart: booking.scheduledStart || '',
        expectedDurationMins: booking.expectedDurationMins || 60,
        surgeryType: booking.surgeryType || 'ELECTIVE',
        anesthesiaType: booking.anesthesiaType || '',
        notes: booking.notes || '',
        infectionRiskClass: booking.preOpChecklist?.infectionRiskClass || '',
      });
      setSelectedPatientLabel(
        booking.patient ? `${booking.patient.firstName} ${booking.patient.lastName} — ${booking.patient.patientId}` : booking.patientId
      );
    } else {
      setEditingId(null);
      setBookingForm(EMPTY_BOOKING);
      setSelectedPatientLabel('');
    }

    setShowBooking(true);

    // Load doctors
    try {
      const { data } = await api.get('/doctors/affiliations/tenant');
      setDoctors(data.data || data || [] as any[]);
    } catch (err) { console.error('Failed to fetch doctors:', err); }
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patientId) { setFormError('Please select a patient'); return; }
    if (!bookingForm.otRoomId) { setFormError('Please select an OT room'); return; }
    if (!bookingForm.procedureName.trim()) { setFormError('Please enter a procedure name'); return; }
    if (!bookingForm.primarySurgeonId) { setFormError('Please select a surgeon'); return; }
    if (!bookingForm.scheduledDate) { setFormError('Please select a scheduled date'); return; }
    if (!bookingForm.scheduledStart) { setFormError('Please select a start time'); return; }
    setSubmitting(true); setFormError('');
    try {
      // infectionRiskClass lives inside the preOpChecklist JSON column on the
      // backend (no dedicated column), so fold it in before sending. Don't
      // ship the standalone top-level field — the DTO doesn't accept it.
      const { infectionRiskClass, ...rest } = bookingForm;
      const existingChecklist: any = editingId
        ? (await api.get(`/ot/bookings/${editingId}`).then(r => r.data?.preOpChecklist || {}).catch(() => ({})))
        : {};
      const payload: any = { ...rest };
      if (infectionRiskClass) {
        payload.preOpChecklist = { ...existingChecklist, infectionRiskClass };
      }
      if (editingId) {
        await api.put(`/ot/bookings/${editingId}`, payload);
        toast.success('Booking updated successfully');
      } else {
        await api.post('/ot/bookings', payload);
        toast.success('Surgery scheduled successfully');
      }
      setShowBooking(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save booking');
    } finally { setSubmitting(false); }
  };

  // ---------- Pre-Op Checklist ----------
  const openChecklist = (booking: any) => {
    const existing = booking.preOpChecklist || {};
    const state: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach(s => s.items.forEach(i => { state[i.key] = existing[i.key] || false; }));
    setChecklist(state);
    setChecklistBooking(booking);
  };

  const saveChecklist = async () => {
    if (!checklistBooking) return;
    setChecklistSaving(true);
    try {
      await api.put(`/ot/bookings/${checklistBooking.id}`, { preOpChecklist: checklist });
      toast.success('Pre-op checklist saved');
      setChecklistBooking(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save checklist');
    } finally { setChecklistSaving(false); }
  };

  // ---------- Anaesthesia Record ----------
  // PACU state is persisted as a JSON blob embedded between markers inside
  // anaesForm.recoveryNotes so that nothing in the DB schema needs to change.
  // The "human" recovery notes typed by the nurse live above the marker line.
  const emptyPacu = () => ({
    arrivedAt: '', dischargedAt: '', destination: '',
    activity: 0, breathing: 0, circulation: 0, consciousness: 0, oxygenation: 0,
    bp: '', hr: '', spo2: '', temp: '', painScore: '',
    nurseNotes: '',
  });
  const parsePacuFromNotes = (notes: string): { pacu: ReturnType<typeof emptyPacu>; humanNotes: string } => {
    if (!notes) return { pacu: emptyPacu(), humanNotes: '' };
    const start = notes.indexOf(PACU_MARKER_START);
    const end = notes.indexOf(PACU_MARKER_END);
    if (start === -1 || end === -1) return { pacu: emptyPacu(), humanNotes: notes };
    try {
      const json = notes.substring(start + PACU_MARKER_START.length, end);
      const parsed = JSON.parse(json);
      const humanNotes = (notes.substring(0, start) + notes.substring(end + PACU_MARKER_END.length)).trim();
      return { pacu: { ...emptyPacu(), ...parsed }, humanNotes };
    } catch {
      return { pacu: emptyPacu(), humanNotes: notes };
    }
  };
  const serializePacuIntoNotes = (humanNotes: string, pacu: any): string => {
    const hasAnyPacuData = Object.values(pacu).some(v => v !== '' && v !== 0 && v !== null && v !== undefined);
    if (!hasAnyPacuData) return humanNotes;
    return `${humanNotes ? humanNotes.trim() + '\n\n' : ''}${PACU_MARKER_START}${JSON.stringify(pacu)}${PACU_MARKER_END}`;
  };

  const openAnaesRecord = async (booking: any) => {
    setAnaesBooking(booking);
    setNewEvent({ time: '', type: 'DRUG', detail: '' });
    try {
      const { data } = await api.get(`/ot/bookings/${booking.id}/anaesthesia-record`);
      if (data) {
        const { pacu, humanNotes } = parsePacuFromNotes(data.recoveryNotes || '');
        setAnaesForm({
          inductionMethod: data.inductionMethod || '', airwayDevice: data.airwayDevice || '',
          ettSize: data.ettSize || '', maintenanceAgent: data.maintenanceAgent || '',
          muscleRelaxant: data.muscleRelaxant || '', reversalAgent: data.reversalAgent || '',
          totalIVFluids: data.totalIVFluids?.toString() || '', totalBloodProducts: data.totalBloodProducts?.toString() || '',
          urineOutput: data.urineOutput?.toString() || '', recoveryScore: data.recoveryScore?.toString() || '',
          recoveryNotes: humanNotes, events: data.events || [],
        });
        setPacuForm(pacu);
      } else {
        setAnaesForm({ inductionMethod: '', airwayDevice: '', ettSize: '', maintenanceAgent: '', muscleRelaxant: '', reversalAgent: '', totalIVFluids: '', totalBloodProducts: '', urineOutput: '', recoveryScore: '', recoveryNotes: '', events: [] });
        setPacuForm(emptyPacu());
      }
    } catch {
      setAnaesForm({ inductionMethod: '', airwayDevice: '', ettSize: '', maintenanceAgent: '', muscleRelaxant: '', reversalAgent: '', totalIVFluids: '', totalBloodProducts: '', urineOutput: '', recoveryScore: '', recoveryNotes: '', events: [] });
      setPacuForm(emptyPacu());
    }
  };

  const handleSaveAnaes = async () => {
    if (!anaesBooking) return;
    setAnaesSaving(true);
    try {
      const payload: any = { ...anaesForm };
      // Auto-fill the schema-level recoveryScore from the Aldrete total so
      // existing reports that read recoveryScore keep working without change.
      if (aldreteTotal > 0 && !payload.recoveryScore) {
        payload.recoveryScore = String(aldreteTotal);
      }
      // Roll the PACU panel into the recoveryNotes column.
      payload.recoveryNotes = serializePacuIntoNotes(anaesForm.recoveryNotes, pacuForm);
      ['totalIVFluids', 'totalBloodProducts', 'urineOutput', 'recoveryScore'].forEach(k => {
        if (payload[k]) payload[k] = Number(payload[k]); else delete payload[k];
      });
      await api.post(`/ot/bookings/${anaesBooking.id}/anaesthesia-record`, payload);
      toast.success('Anaesthesia record saved');
      setAnaesBooking(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setAnaesSaving(false); }
  };

  // ---------- Add OT Room ----------
  const openAddRoom = () => {
    setRoomForm({ name: '', type: 'MAJOR_OT', capacityClass: 'CLASS_2' });
    setRoomError('');
    setShowRoomModal(true);
  };
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name.trim()) { setRoomError('Room name is required'); return; }
    setRoomSaving(true); setRoomError('');
    try {
      await api.post('/ot/rooms', {
        name: roomForm.name.trim(),
        type: roomForm.type,
        capacityClass: roomForm.capacityClass,
      });
      toast.success(`OT room "${roomForm.name}" created`);
      setShowRoomModal(false);
      fetchData();
    } catch (err: any) {
      setRoomError(err.response?.data?.message || 'Failed to create OT room');
    } finally {
      setRoomSaving(false);
    }
  };

  // PACU action — Admit to recovery (auto-stamp arrival time)
  const handlePacuAdmit = () => {
    if (pacuForm.arrivedAt) return;
    setPacuForm({ ...pacuForm, arrivedAt: new Date().toISOString() });
    toast.success('Patient admitted to PACU');
  };
  // PACU action — Discharge to ward / ICU / Day-care
  const handlePacuDischarge = () => {
    if (!pacuForm.destination) { toast.error('Pick a discharge destination first'); return; }
    if (aldreteTotal < 9 && !window.confirm(`Aldrete score is ${aldreteTotal}/10. Discharge anyway?`)) return;
    setPacuForm({ ...pacuForm, dischargedAt: new Date().toISOString() });
    toast.success(`Discharged from PACU to ${pacuForm.destination}`);
  };

  const addEvent = () => {
    if (!newEvent.time || !newEvent.detail.trim()) return;
    setAnaesForm(f => ({ ...f, events: [...f.events, { ...newEvent }] }));
    setNewEvent({ time: '', type: 'DRUG', detail: '' });
  };

  // ---------- Pre-Op Assessment ----------
  const openAssessment = async (booking: any) => {
    setAssessBooking(booking);
    try {
      const { data } = await api.get(`/ot/bookings/${booking.id}/pre-op-assessment`);
      if (data) {
        setAssessForm({
          asaGrade: data.asaGrade || '', mallampatiScore: data.mallampatiScore?.toString() || '',
          mouthOpening: data.mouthOpening || 'ADEQUATE', neckMobility: data.neckMobility || 'FULL',
          dentalStatus: data.dentalStatus || 'NORMAL', predictedDifficult: data.predictedDifficult || false,
          cardiacHistory: data.cardiacHistory || '', respiratoryHistory: data.respiratoryHistory || '',
          diabetesStatus: data.diabetesStatus || '', renalStatus: data.renalStatus || '',
          hepaticStatus: data.hepaticStatus || '', allergies: data.allergies || '',
          currentMedications: data.currentMedications || '', previousAnaesthesia: data.previousAnaesthesia || '',
          anaesthesiaPlan: data.anaesthesiaPlan || '', specialInstructions: data.specialInstructions || '',
          npoConfirmed: data.npoConfirmed || false,
        });
      }
    } catch { /* no existing assessment — use defaults */ }
  };

  const handleSaveAssessment = async () => {
    if (!assessBooking) return;
    setAssessSaving(true);
    try {
      const payload: any = { ...assessForm };
      if (payload.mallampatiScore) payload.mallampatiScore = Number(payload.mallampatiScore);
      else delete payload.mallampatiScore;
      await api.post(`/ot/bookings/${assessBooking.id}/pre-op-assessment`, payload);
      toast.success('Pre-op assessment saved');
      setAssessBooking(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save assessment'); }
    finally { setAssessSaving(false); }
  };

  // ---------- Timeline ----------
  const fetchTimeline = async () => {
    setTimelineLoading(true);
    try {
      const { data } = await api.get('/ot/schedule/timeline', { params: { date: timelineDate } });
      setTimelineData(data);
    } catch { toast.error('Failed to load timeline'); }
    finally { setTimelineLoading(false); }
  };

  useEffect(() => { if (tab === 'timeline') fetchTimeline(); }, [tab, timelineDate]);

  // ---------- Reports ----------
  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const { data } = await api.get('/ot/reports/performance', { params: { from: reportFrom, to: reportTo } });
      setReportData(data);
    } catch { toast.error('Failed to load performance report'); }
    finally { setReportLoading(false); }
  };

  useEffect(() => { if (tab === 'reports') fetchReport(); }, [tab]);

  const totalChecklistItems = CHECKLIST_ITEMS.reduce((s, sec) => s + sec.items.length, 0);
  const checkedCount = Object.values(checklist).filter(Boolean).length;

  // ---------- Complete Surgery ----------
  const openComplete = (booking: any) => {
    setCompleteForm({
      intraOpNotes: '', postOpNotes: '', estimatedBloodLoss: '',
      bloodUnitsUsed: '', complications: '', drainInserted: false, drainType: '',
      specimensText: '', implantsText: '',
      instrumentsBefore: '', instrumentsAfter: '',
    });
    setCompleteBooking(booking);
  };

  const handleComplete = async () => {
    if (!completeBooking) return;
    setCompleteSaving(true);
    try {
      // Specimens / implants are stored as JSON arrays. Each line in the
      // textarea becomes one entry, so the surgical team can free-form the
      // list (e.g. "Gallbladder · histopath"). Empty input → undefined so
      // we don't overwrite anything with [].
      const splitLines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
      const specimens = splitLines(completeForm.specimensText);
      const implants = splitLines(completeForm.implantsText);

      // Instrument count reconciliation — no dedicated column, so we prepend
      // it to postOpNotes as a structured line. If counts don't match, we
      // warn the user; they can still confirm completion (override).
      let postOpNotes = completeForm.postOpNotes || '';
      if (completeForm.instrumentsBefore && completeForm.instrumentsAfter) {
        const before = Number(completeForm.instrumentsBefore);
        const after = Number(completeForm.instrumentsAfter);
        const status = before === after ? 'RECONCILED' : 'MISMATCH';
        const line = `[Instrument count] before=${before} after=${after} (${status})`;
        postOpNotes = postOpNotes ? `${line}\n\n${postOpNotes}` : line;
        if (status === 'MISMATCH') {
          const ok = window.confirm(`Instrument count mismatch (before ${before} / after ${after}). Continue anyway?`);
          if (!ok) { setCompleteSaving(false); return; }
        }
      }

      await api.patch(`/ot/bookings/${completeBooking.id}/complete`, {
        intraOpNotes: completeForm.intraOpNotes || undefined,
        postOpNotes: postOpNotes || undefined,
        estimatedBloodLoss: completeForm.estimatedBloodLoss ? Number(completeForm.estimatedBloodLoss) : undefined,
        bloodUnitsUsed: completeForm.bloodUnitsUsed ? Number(completeForm.bloodUnitsUsed) : undefined,
        complications: completeForm.complications || undefined,
        drainInserted: completeForm.drainInserted,
        drainType: completeForm.drainInserted ? completeForm.drainType : undefined,
        specimens: specimens.length ? specimens : undefined,
        implants: implants.length ? implants : undefined,
      });
      toast.success('Surgery completed');
      setCompleteBooking(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete surgery');
    } finally { setCompleteSaving(false); }
  };

  const handlePrintOpNote = (b: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const patientName = `${b.patient?.firstName || ''} ${b.patient?.lastName || ''}`.trim() || '—';
    const surgeonName = b.primarySurgeon ? `Dr. ${b.primarySurgeon.firstName} ${b.primarySurgeon.lastName}` : '—';
    const anaesthetistName = b.anesthetist ? `Dr. ${b.anesthetist.firstName}` : '—';
    const scheduledDate = b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : '—';
    const bloodLoss = b.estimatedBloodLoss ? `${b.estimatedBloodLoss} mL` : '—';
    const bloodProducts = b.bloodUnitsUsed ? `${b.bloodUnitsUsed} units` : '—';
    const drain = b.drainInserted ? `Yes — ${b.drainType || ''}` : 'No';

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Operation Note — ${b.bookingNumber || ''}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
    h1 { color: #0F766E; font-size: 28px; margin: 0; }
    h2 { font-size: 14px; color: #555; margin: 4px 0 0; letter-spacing: 2px; text-transform: uppercase; }
    hr { border: none; border-top: 2px solid #0F766E; margin: 16px 0; }
    .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0F766E; letter-spacing: 1px; margin: 20px 0 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .field label { font-size: 11px; color: #777; display: block; margin-bottom: 2px; }
    .field span { font-size: 13px; font-weight: 600; }
    .prose { font-size: 13px; line-height: 1.6; white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; min-height: 48px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 60px; }
    .sig-box { border-top: 1px solid #333; padding-top: 8px; font-size: 12px; color: #555; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>AYPHEN HMS</h1>
  <h2>Operation Note</h2>
  <hr />
  <div class="section-title">Patient &amp; Procedure Details</div>
  <div class="grid">
    <div class="field"><label>Patient Name</label><span>${patientName}</span></div>
    <div class="field"><label>Booking #</label><span>${b.bookingNumber || '—'}</span></div>
    <div class="field"><label>Procedure</label><span>${b.procedureName || '—'}</span></div>
    <div class="field"><label>OT Room</label><span>${b.otRoom?.name || '—'}</span></div>
    <div class="field"><label>Surgeon</label><span>${surgeonName}</span></div>
    <div class="field"><label>Anaesthetist</label><span>${anaesthetistName}</span></div>
    <div class="field"><label>Surgery Type</label><span>${b.surgeryType || '—'}</span></div>
    <div class="field"><label>Anaesthesia Type</label><span>${b.anesthesiaType || '—'}</span></div>
    <div class="field"><label>Scheduled Date</label><span>${scheduledDate}</span></div>
    <div class="field"><label>Duration</label><span>${b.expectedDurationMins ? b.expectedDurationMins + ' min' : '—'}</span></div>
  </div>
  <div class="section-title">Pre-Operative — Clinical History</div>
  <div class="prose">${b.clinicalHistory || b.notes || '—'}</div>
  <div class="section-title">Intra-Operative Findings</div>
  <div class="prose">${b.intraOpNotes || '—'}</div>
  <div class="section-title">Post-Operative Notes</div>
  <div class="prose">${b.postOpNotes || '—'}</div>
  <div class="section-title">Complications</div>
  <div class="prose">${b.complications || 'None'}</div>
  <div class="section-title">Haematological Summary</div>
  <div class="grid">
    <div class="field"><label>Estimated Blood Loss</label><span>${bloodLoss}</span></div>
    <div class="field"><label>Blood Products Used</label><span>${bloodProducts}</span></div>
    <div class="field"><label>Drain Inserted</label><span>${drain}</span></div>
  </div>
  <div class="footer">
    <div class="sig-box">Surgeon Signature</div>
    <div class="sig-box">Anaesthetist Signature</div>
    <div class="sig-box">Date</div>
  </div>
</body>
</html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar title="Operating Theatre" subtitle="OT scheduling and room management" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total OT Rooms" value={rooms.length} icon={Scissors} color="#0F766E" />
        <KpiCard label="Scheduled Today" value={scheduled} icon={Calendar} color="#3B82F6" />
        <KpiCard label="In Progress" value={inProgress} icon={Clock} color="#F59E0B" />
        <KpiCard label="Completed" value={completed} icon={CheckCircle} color="#10B981" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
          {[['schedule','OT Schedule'],['timeline','Timeline'],['rooms','OT Rooms'],['reports','Reports']].map(([val,label]) => (
            <button key={val} onClick={() => { setTab(val as any); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'schedule' && (
          <button onClick={() => openBookingModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={14} /> Schedule Surgery
          </button>
        )}
      </div>

      {tab === 'schedule' && (
        <div className="hms-card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">OT Bookings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Booking #','Patient','Surgeon','Procedure','OT Room','Scheduled','Duration','Status','Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)}</>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={9} className="p-0"><EmptyState icon={<Scissors size={36} />} title="No OT bookings" description="Schedule surgeries to see them listed here" /></td></tr>
                ) : bookings.slice((page - 1) * 20, page * 20).map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-teal-700">{b.bookingNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{b.patient?.firstName} {b.patient?.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.primarySurgeon ? `Dr. ${b.primarySurgeon.firstName}` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate">{b.procedureName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.otRoom?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.expectedDurationMins}m</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {b.status === 'SCHEDULED' && (
                          <>
                            <button onClick={() => openBookingModal(b)}
                              className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 font-medium"
                              title="Edit booking">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => openChecklist(b)}
                              className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium flex items-center gap-1"
                              title="Pre-op checklist">
                              <ClipboardCheck size={13} /> Checklist
                            </button>
                            <button onClick={() => openAssessment(b)}
                              className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"
                              title="Anaesthesia assessment">
                              <Scissors size={13} /> Assess
                            </button>
                            <button onClick={async () => { try { await api.patch(`/ot/bookings/${b.id}/start`); toast.success('Surgery started'); fetchData(); } catch (err) { console.error('Failed to start surgery:', err); toast.error('Failed to start surgery'); } }}
                              className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Start</button>
                          </>
                        )}
                        {b.status === 'IN_PROGRESS' && (
                          <>
                            <button onClick={() => openAnaesRecord(b)}
                              className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 font-medium flex items-center gap-1">
                              <Scissors size={11} /> Anaes Record
                            </button>
                            <button onClick={() => openComplete(b)}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Complete</button>
                          </>
                        )}
                        {b.status === 'COMPLETED' && (
                          <button
                            onClick={() => handlePrintOpNote(b)}
                            className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"
                            title="Print Operation Note"
                          >
                            <Printer size={12} /> Op Note
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(bookings.length / 20)} onPageChange={setPage} totalItems={bookings.length} pageSize={20} />
        </div>
      )}

      {tab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Add operating theatre rooms before scheduling surgeries.</p>
            <button onClick={openAddRoom}
              className="px-3 py-1.5 text-sm rounded-lg bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-2">
              <Scissors size={14} /> Add OT Room
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rooms.slice((page - 1) * 20, page * 20).map(room => (
              <div key={room.id} className="hms-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{room.name}</h4>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${room.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : room.status === 'IN_USE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {room.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <div>Type: <span className="text-gray-700 font-medium">{room.type}</span></div>
                  <div>Class: <span className="text-gray-700 font-medium">{room.capacityClass}</span></div>
                </div>
              </div>
            ))}
            {rooms.length === 0 && !loading && (
              <div className="col-span-3 hms-card">
                <EmptyState icon={<Scissors size={36} />} title="No OT rooms configured"
                  description="Click 'Add OT Room' above to create your first operating theatre." />
              </div>
            )}
            {rooms.length > 0 && (
              <div className="col-span-3"><Pagination page={page} totalPages={Math.ceil(rooms.length / 20)} onPageChange={setPage} totalItems={rooms.length} pageSize={20} /></div>
            )}
          </div>
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {tab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 font-medium">Date</label>
            <input type="date" value={timelineDate} onChange={e => { setTimelineDate(e.target.value); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none" />
          </div>

          {timelineLoading ? (
            <div className="hms-card p-12 text-center text-gray-400">Loading timeline…</div>
          ) : !timelineData || !timelineData.rooms?.length ? (
            <div className="hms-card"><EmptyState icon={<Calendar size={36} />} title="No OT rooms" description="Configure OT rooms to see the timeline" /></div>
          ) : (
            <div className="hms-card overflow-x-auto">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">OT Schedule — {timelineDate}</h3>
              </div>
              <div className="p-4" style={{ minWidth: 800 }}>
                {/* Time header */}
                <div className="flex mb-1">
                  <div className="w-28 flex-shrink-0" />
                  <div className="flex-1 flex">
                    {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                      <div key={h} className="flex-1 text-center text-[10px] text-gray-400 font-mono border-l border-gray-100">
                        {h > 12 ? `${h - 12}PM` : h === 12 ? '12PM' : `${h}AM`}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room rows */}
                {timelineData.rooms.map((room: any) => {
                  const roomBookings = (timelineData.bookings || []).filter((b: any) => b.otRoomId === room.id);
                  return (
                    <div key={room.id} className="flex items-stretch mb-1" style={{ minHeight: 44 }}>
                      <div className="w-28 flex-shrink-0 flex items-center px-2 text-xs font-semibold text-gray-700 bg-gray-50 rounded-l-lg border border-gray-100">
                        {room.name}
                      </div>
                      <div className="flex-1 relative bg-gray-50/50 border border-l-0 border-gray-100 rounded-r-lg">
                        {/* Hour grid lines */}
                        {Array.from({ length: 16 }, (_, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(i / 16) * 100}%` }} />
                        ))}
                        {/* Booking blocks */}
                        {roomBookings.map((b: any) => {
                          const [hh, mm] = (b.scheduledStart || '08:00').split(':').map(Number);
                          const startMins = (hh - 6) * 60 + (mm || 0); // offset from 6AM
                          const totalMins = 16 * 60; // 6AM to 10PM
                          const left = Math.max(0, (startMins / totalMins) * 100);
                          const width = Math.min(((b.expectedDurationMins || 60) / totalMins) * 100, 100 - left);
                          const colors: Record<string, string> = {
                            SCHEDULED: '#3B82F6', IN_PROGRESS: '#F59E0B', COMPLETED: '#10B981', CANCELLED: '#EF4444',
                          };
                          return (
                            <div key={b.id} title={`${b.procedureName} — ${b.patient?.firstName || ''} ${b.patient?.lastName || ''} (${b.status})`}
                              className="absolute top-1 bottom-1 rounded-md flex items-center px-1.5 overflow-hidden cursor-default"
                              style={{ left: `${left}%`, width: `${width}%`, background: colors[b.status] || '#6B7280', minWidth: 4 }}>
                              <span className="text-[10px] text-white font-medium truncate">{b.procedureName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Legend */}
                <div className="flex gap-4 mt-4 justify-center">
                  {[['Scheduled','#3B82F6'],['In Progress','#F59E0B'],['Completed','#10B981'],['Cancelled','#EF4444']].map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <div className="w-3 h-3 rounded" style={{ background: color as string }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-gray-500 font-medium">From</label>
            <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-200 outline-none" />
            <label className="text-sm text-gray-500 font-medium">To</label>
            <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-200 outline-none" />
            <button onClick={fetchReport} className="btn-primary px-4 py-1.5 text-sm">Apply</button>
          </div>

          {reportLoading ? (
            <div className="hms-card p-12 text-center text-gray-400">Loading report…</div>
          ) : !reportData ? (
            <div className="hms-card"><EmptyState icon={<Scissors size={36} />} title="No data" description="Select a date range and click Apply" /></div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total Surgeries" value={reportData.summary.totalSurgeries} icon={Scissors} color="#0F766E" />
                <KpiCard label="Cancelled" value={reportData.summary.cancelled} icon={Calendar} color="#EF4444" />
                <KpiCard label="Avg Duration" value={`${reportData.summary.avgDurationMins}m`} icon={Clock} color="#3B82F6" />
                <KpiCard label="Total OR Time" value={`${Math.round(reportData.summary.totalOperatingMins / 60)}h`} icon={CheckCircle} color="#10B981" />
              </div>

              {/* By Surgeon */}
              <div className="hms-card">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Performance by Surgeon</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {['Surgeon','Cases','Total Time','Avg Duration'].map(h => (
                          <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.bySurgeon.map((s: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 border-t border-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{s.cases}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{Math.round(s.totalMins / 60)}h {s.totalMins % 60}m</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{s.cases > 0 ? Math.round(s.totalMins / s.cases) : 0}m</td>
                        </tr>
                      ))}
                      {reportData.bySurgeon.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No completed surgeries in this period</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Room */}
              <div className="hms-card">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Room Utilization</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {['OT Room','Cases','Total Time','Avg Duration'].map(h => (
                          <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.byRoom.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 border-t border-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{r.cases}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{Math.round(r.totalMins / 60)}h {r.totalMins % 60}m</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{r.cases > 0 ? Math.round(r.totalMins / r.cases) : 0}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Surgery Type */}
              <div className="hms-card p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Surgery Types</h3>
                <div className="flex gap-3 flex-wrap">
                  {reportData.bySurgeryType.map((t: any) => (
                    <div key={t.type} className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                      <div className="text-lg font-bold text-gray-900">{t.count}</div>
                      <div className="text-xs text-gray-500">{t.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== ADD OT ROOM MODAL ========== */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Add OT Room</h2>
                <p className="text-xs text-gray-400 mt-0.5">Configure a new operating theatre</p>
              </div>
              <button onClick={() => setShowRoomModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Room Name <span className="text-red-500">*</span></label>
                <input value={roomForm.name}
                  onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="e.g. OT-1, Main OT, Cardiac OT"
                  className="hms-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select value={roomForm.type}
                    onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}
                    className="hms-input w-full">
                    <option value="MAJOR_OT">Major OT</option>
                    <option value="MINOR_OT">Minor OT</option>
                    <option value="DAYCARE_OT">Day-care OT</option>
                    <option value="EMERGENCY_OT">Emergency OT</option>
                    <option value="CARDIAC_OT">Cardiac OT</option>
                    <option value="NEURO_OT">Neuro OT</option>
                    <option value="ORTHO_OT">Ortho OT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity / Class</label>
                  <select value={roomForm.capacityClass}
                    onChange={e => setRoomForm({ ...roomForm, capacityClass: e.target.value })}
                    className="hms-input w-full">
                    <option value="CLASS_1">Class 1 (Ultra-clean)</option>
                    <option value="CLASS_2">Class 2 (Clean)</option>
                    <option value="CLASS_3">Class 3 (Standard)</option>
                  </select>
                </div>
              </div>
              {roomError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{roomError}</div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowRoomModal(false)}
                  className="btn-secondary px-4 py-2">Cancel</button>
                <button type="submit" disabled={roomSaving}
                  className="btn-primary flex items-center gap-2 px-4 py-2">
                  {roomSaving && <Loader2 size={14} className="animate-spin" />}
                  {roomSaving ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== SCHEDULE / EDIT SURGERY MODAL ========== */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-900">{editingId ? 'Edit OT Booking' : 'Schedule Surgery'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingId ? 'Update the booking details' : 'Create a new OT booking'}</p>
              </div>
              <button type="button" onClick={() => setShowBooking(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Patient search */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient <span className="text-red-500">*</span></label>
                {bookingForm.patientId ? (
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                    <span className="text-sm font-medium text-teal-800">{selectedPatientLabel}</span>
                    {!editingId && (
                      <button type="button" onClick={() => { setBookingForm(f => ({ ...f, patientId: '' })); setSelectedPatientLabel(''); }} className="text-teal-600 hover:text-red-500"><X size={14} /></button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                      onFocus={() => { if (patients.length === 0) searchPatients(''); }}
                      placeholder="Click to see recent patients or search by name, phone, ID…"
                      className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    {patients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-48 overflow-y-auto">
                        {patientLoading ? <div className="p-3 text-sm text-gray-400">Searching...</div> : patients.map(p => (
                          <button key={p.id} type="button" onClick={() => {
                            setBookingForm(f => ({ ...f, patientId: p.id }));
                            setSelectedPatientLabel(`${p.firstName} ${p.lastName} — ${p.patientId}`);
                            setPatients([]);
                            setPatientSearch('');
                          }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                            <span className="font-medium">{p.firstName} {p.lastName}</span>
                            <span className="text-gray-400 ml-2">{p.patientId} · {p.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OT Room + Procedure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">OT Room <span className="text-red-500">*</span></label>
                  <select value={bookingForm.otRoomId}
                    onChange={e => setBookingForm(f => ({ ...f, otRoomId: e.target.value }))}
                    disabled={rooms.length === 0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">{rooms.length === 0 ? 'No OT rooms configured' : 'Select room'}</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                  </select>
                  {rooms.length === 0 && (
                    <button type="button"
                      onClick={() => { setShowBooking(false); setTab('rooms'); }}
                      className="mt-1 text-xs text-teal-600 hover:text-teal-700 underline">
                      Go to Rooms tab to add an OT room first
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Procedure Name <span className="text-red-500">*</span></label>
                  <select
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && v !== 'Other (type below)') {
                        setBookingForm(f => ({ ...f, procedureName: v }));
                      } else if (v === 'Other (type below)') {
                        setBookingForm(f => ({ ...f, procedureName: '' }));
                      }
                    }}
                    value={
                      COMMON_PROCEDURES.flatMap(g => g.items).includes(bookingForm.procedureName)
                        ? bookingForm.procedureName
                        : (bookingForm.procedureName ? 'Other (type below)' : '')
                    }
                    className="w-full mb-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Pick from common procedures…</option>
                    {COMMON_PROCEDURES.map(group => (
                      <optgroup key={group.group} label={group.group}>
                        {group.items.map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input value={bookingForm.procedureName} onChange={e => setBookingForm(f => ({ ...f, procedureName: e.target.value }))}
                    placeholder="…or type custom procedure name"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {/* Surgeon + Anesthetist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Surgeon <span className="text-red-500">*</span></label>
                  <select value={bookingForm.primarySurgeonId} onChange={e => setBookingForm(f => ({ ...f, primarySurgeonId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select surgeon</option>
                    {doctors.map((d: any) => (
                      <option key={d.id || d.doctorId} value={d.id || d.doctorId}>
                        Dr. {d.firstName || d.doctor?.firstName} {d.lastName || d.doctor?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Anesthetist</label>
                  <select value={bookingForm.anesthetistId} onChange={e => setBookingForm(f => ({ ...f, anesthetistId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select anesthetist</option>
                    {doctors.map((d: any) => (
                      <option key={d.id || d.doctorId} value={d.id || d.doctorId}>
                        Dr. {d.firstName || d.doctor?.firstName} {d.lastName || d.doctor?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Time + Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled Date <span className="text-red-500">*</span></label>
                  <input type="date" value={bookingForm.scheduledDate} onChange={e => setBookingForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Time <span className="text-red-500">*</span></label>
                  <input type="time" value={bookingForm.scheduledStart} onChange={e => setBookingForm(f => ({ ...f, scheduledStart: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (mins)</label>
                  <input type="number" min="15" step="15" value={bookingForm.expectedDurationMins}
                    onChange={e => setBookingForm(f => ({ ...f, expectedDurationMins: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {/* Surgery Type + Anesthesia Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Surgery Type</label>
                  <select value={bookingForm.surgeryType} onChange={e => setBookingForm(f => ({ ...f, surgeryType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['ELECTIVE', 'EMERGENCY', 'URGENT', 'DAYCARE'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Anesthesia Type</label>
                  <select value={bookingForm.anesthesiaType} onChange={e => setBookingForm(f => ({ ...f, anesthesiaType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">Select type</option>
                    {['GENERAL', 'SPINAL', 'EPIDURAL', 'LOCAL', 'REGIONAL', 'SEDATION', 'NONE'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Infection Risk Class — drives antibiotic prophylaxis */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Infection Risk Class</label>
                <select value={bookingForm.infectionRiskClass}
                  onChange={e => setBookingForm(f => ({ ...f, infectionRiskClass: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {INFECTION_RISK_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">CDC classification — used for antibiotic prophylaxis and SSI risk tracking.</p>
              </div>

              {/* Admission ID + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Admission ID</label>
                  <input value={bookingForm.admissionId} onChange={e => setBookingForm(f => ({ ...f, admissionId: e.target.value }))}
                    placeholder="Optional — link to admission"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <input value={bookingForm.notes} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Pre-op notes..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {formError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowBooking(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {submitting ? 'Saving...' : editingId ? 'Update Booking' : 'Schedule Surgery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ANAESTHESIA RECORD MODAL ── */}
      {anaesBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Anaesthesia Record</h2>
                <p className="text-xs text-gray-400 mt-0.5">{anaesBooking.procedureName} — {anaesBooking.bookingNumber}</p>
              </div>
              <button onClick={() => setAnaesBooking(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Induction */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Induction</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                    <select className="hms-input w-full" value={anaesForm.inductionMethod} onChange={e => setAnaesForm({ ...anaesForm, inductionMethod: e.target.value })}>
                      <option value="">Select</option>
                      {['IV','INHALATION','RAPID_SEQUENCE','AWAKE_INTUBATION'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Airway Device</label>
                    <select className="hms-input w-full" value={anaesForm.airwayDevice} onChange={e => setAnaesForm({ ...anaesForm, airwayDevice: e.target.value })}>
                      <option value="">Select</option>
                      {['ETT','LMA','MASK','TRACHEOSTOMY'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ETT Size</label>
                    <input className="hms-input w-full" placeholder="e.g. 7.5" value={anaesForm.ettSize} onChange={e => setAnaesForm({ ...anaesForm, ettSize: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Muscle Relaxant</label>
                    <input className="hms-input w-full" placeholder="e.g. Atracurium" value={anaesForm.muscleRelaxant} onChange={e => setAnaesForm({ ...anaesForm, muscleRelaxant: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Maintenance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance Agent</label>
                  <input className="hms-input w-full" placeholder="e.g. Sevoflurane 2%" value={anaesForm.maintenanceAgent} onChange={e => setAnaesForm({ ...anaesForm, maintenanceAgent: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reversal Agent</label>
                  <input className="hms-input w-full" placeholder="e.g. Neostigmine + Glycopyrrolate" value={anaesForm.reversalAgent} onChange={e => setAnaesForm({ ...anaesForm, reversalAgent: e.target.value })} />
                </div>
              </div>

              {/* Drug/Event Timeline */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Drug & Event Timeline</div>
                <div className="flex gap-2 mb-3">
                  <input type="time" className="hms-input" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} />
                  <select className="hms-input" value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}>
                    {['DRUG','FLUID','EVENT','VITAL_CHECK','COMPLICATION'].map(v => <option key={v}>{v}</option>)}
                  </select>
                  <input className="hms-input flex-1" placeholder="e.g. Propofol 200mg IV" value={newEvent.detail} onChange={e => setNewEvent({ ...newEvent, detail: e.target.value })} />
                  <button onClick={addEvent} className="btn-primary px-3 py-1 text-xs">Add</button>
                </div>
                {anaesForm.events.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left text-gray-500">Time</th><th className="px-3 py-2 text-left text-gray-500">Type</th><th className="px-3 py-2 text-left text-gray-500">Detail</th><th className="px-3 py-2 w-8"></th></tr></thead>
                      <tbody>
                        {anaesForm.events.map((ev, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-3 py-2 font-mono text-gray-700">{ev.time}</td>
                            <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ev.type === 'DRUG' ? 'bg-blue-100 text-blue-700' : ev.type === 'COMPLICATION' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{ev.type}</span></td>
                            <td className="px-3 py-2 text-gray-700">{ev.detail}</td>
                            <td className="px-3 py-2"><button onClick={() => setAnaesForm(f => ({ ...f, events: f.events.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-500"><X size={12} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Fluids & Recovery */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Fluid Balance & Recovery</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">IV Fluids (mL)</label>
                    <input type="number" className="hms-input w-full" placeholder="e.g. 1500" value={anaesForm.totalIVFluids} onChange={e => setAnaesForm({ ...anaesForm, totalIVFluids: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Blood Products (mL)</label>
                    <input type="number" className="hms-input w-full" placeholder="0" value={anaesForm.totalBloodProducts} onChange={e => setAnaesForm({ ...anaesForm, totalBloodProducts: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Urine Output (mL)</label>
                    <input type="number" className="hms-input w-full" placeholder="e.g. 300" value={anaesForm.urineOutput} onChange={e => setAnaesForm({ ...anaesForm, urineOutput: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Aldrete Score (0-10)</label>
                    <input type="number" min="0" max="10" className="hms-input w-full" placeholder="8" value={anaesForm.recoveryScore} onChange={e => setAnaesForm({ ...anaesForm, recoveryScore: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recovery Notes</label>
                  <textarea className="hms-input w-full" rows={2} placeholder="Post-anaesthesia recovery observations..."
                    value={anaesForm.recoveryNotes} onChange={e => setAnaesForm({ ...anaesForm, recoveryNotes: e.target.value })} />
                </div>
              </div>

              {/* ── PACU / RECOVERY ROOM PANEL ── */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">PACU · Recovery Room</div>
                    <p className="text-xs text-gray-400 mt-0.5">Track arrival, Aldrete score and discharge from the post-anaesthesia care unit</p>
                  </div>
                  {!pacuForm.arrivedAt && (
                    <button type="button" onClick={handlePacuAdmit}
                      className="px-3 py-1.5 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white">
                      Admit to PACU now
                    </button>
                  )}
                </div>

                {pacuForm.arrivedAt && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 text-xs text-teal-800 mb-3 flex items-center justify-between">
                    <div>
                      <strong>Arrived:</strong> {new Date(pacuForm.arrivedAt).toLocaleString('en-IN')}
                      {pacuForm.dischargedAt && (
                        <span className="ml-3"><strong>Discharged:</strong> {new Date(pacuForm.dischargedAt).toLocaleString('en-IN')} → {pacuForm.destination || '—'}</span>
                      )}
                    </div>
                    {!pacuForm.dischargedAt && (
                      <button type="button" onClick={handlePacuDischarge}
                        className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                        Discharge from PACU
                      </button>
                    )}
                  </div>
                )}

                {/* Aldrete sub-scores 0-2 each */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
                  {[
                    { key: 'activity',      label: 'Activity'      },
                    { key: 'breathing',     label: 'Breathing'     },
                    { key: 'circulation',   label: 'Circulation'   },
                    { key: 'consciousness', label: 'Consciousness' },
                    { key: 'oxygenation',   label: 'Oxygenation'   },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <select
                        value={(pacuForm as any)[key]}
                        onChange={e => setPacuForm({ ...pacuForm, [key]: Number(e.target.value) })}
                        className="hms-input w-full">
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                  ))}
                </div>
                <div className={`text-sm font-semibold mb-3 ${aldreteTotal >= 9 ? 'text-emerald-600' : aldreteTotal >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                  Total Aldrete: {aldreteTotal}/10 {aldreteTotal >= 9 ? '· Ready for discharge' : aldreteTotal >= 7 ? '· Continue monitoring' : '· Not ready'}
                </div>

                {/* PACU vitals snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">BP (mmHg)</label>
                    <input className="hms-input w-full" placeholder="120/80" value={pacuForm.bp}
                      onChange={e => setPacuForm({ ...pacuForm, bp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">HR (bpm)</label>
                    <input type="number" className="hms-input w-full" placeholder="80" value={pacuForm.hr}
                      onChange={e => setPacuForm({ ...pacuForm, hr: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SpO₂ (%)</label>
                    <input type="number" className="hms-input w-full" placeholder="98" value={pacuForm.spo2}
                      onChange={e => setPacuForm({ ...pacuForm, spo2: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Temp (°C)</label>
                    <input type="number" step="0.1" className="hms-input w-full" placeholder="36.8" value={pacuForm.temp}
                      onChange={e => setPacuForm({ ...pacuForm, temp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pain (0-10)</label>
                    <input type="number" min="0" max="10" className="hms-input w-full" placeholder="2" value={pacuForm.painScore}
                      onChange={e => setPacuForm({ ...pacuForm, painScore: e.target.value })} />
                  </div>
                </div>

                {/* Discharge destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discharge Destination</label>
                    <select className="hms-input w-full" value={pacuForm.destination}
                      onChange={e => setPacuForm({ ...pacuForm, destination: e.target.value })}>
                      <option value="">Select…</option>
                      <option value="WARD">Ward</option>
                      <option value="ICU">ICU</option>
                      <option value="HDU">High-Dependency Unit (HDU)</option>
                      <option value="DAYCARE_LOUNGE">Day-care Lounge</option>
                      <option value="HOME">Home (day-surgery)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">PACU Nurse Notes</label>
                    <input className="hms-input w-full" placeholder="Brief PACU course / handover"
                      value={pacuForm.nurseNotes}
                      onChange={e => setPacuForm({ ...pacuForm, nurseNotes: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setAnaesBooking(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSaveAnaes} disabled={anaesSaving} className="btn-primary flex items-center gap-2 px-4 py-2">
                {anaesSaving && <Loader2 size={14} className="animate-spin" />}
                {anaesSaving ? 'Saving…' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRE-OP ASSESSMENT MODAL ── */}
      {assessBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Pre-Op Anaesthesia Assessment</h2>
                <p className="text-xs text-gray-400 mt-0.5">{assessBooking.procedureName} — {assessBooking.bookingNumber}</p>
              </div>
              <button onClick={() => setAssessBooking(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* ASA Grade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ASA Classification</label>
                  <select className="hms-input w-full" value={assessForm.asaGrade} onChange={e => setAssessForm({ ...assessForm, asaGrade: e.target.value })}>
                    <option value="">Select grade</option>
                    <option value="I">ASA I — Normal healthy</option>
                    <option value="II">ASA II — Mild systemic disease</option>
                    <option value="III">ASA III — Severe systemic disease</option>
                    <option value="IV">ASA IV — Life-threatening</option>
                    <option value="V">ASA V — Moribund</option>
                    <option value="VI">ASA VI — Brain dead</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Anaesthesia Plan</label>
                  <select className="hms-input w-full" value={assessForm.anaesthesiaPlan} onChange={e => setAssessForm({ ...assessForm, anaesthesiaPlan: e.target.value })}>
                    <option value="">Select plan</option>
                    {['GENERAL','SPINAL','EPIDURAL','REGIONAL','LOCAL','SEDATION','COMBINED_SPINAL_EPIDURAL'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Airway Assessment */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Airway Assessment</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mallampati (1-4)</label>
                    <select className="hms-input w-full" value={assessForm.mallampatiScore} onChange={e => setAssessForm({ ...assessForm, mallampatiScore: e.target.value })}>
                      <option value="">—</option>
                      <option value="1">Class I</option>
                      <option value="2">Class II</option>
                      <option value="3">Class III</option>
                      <option value="4">Class IV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mouth Opening</label>
                    <select className="hms-input w-full" value={assessForm.mouthOpening} onChange={e => setAssessForm({ ...assessForm, mouthOpening: e.target.value })}>
                      {['ADEQUATE','LIMITED','RESTRICTED'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Neck Mobility</label>
                    <select className="hms-input w-full" value={assessForm.neckMobility} onChange={e => setAssessForm({ ...assessForm, neckMobility: e.target.value })}>
                      {['FULL','LIMITED','FIXED'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dental Status</label>
                    <select className="hms-input w-full" value={assessForm.dentalStatus} onChange={e => setAssessForm({ ...assessForm, dentalStatus: e.target.value })}>
                      {['NORMAL','LOOSE_TEETH','DENTURES','CAPS'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={assessForm.predictedDifficult} onChange={e => setAssessForm({ ...assessForm, predictedDifficult: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                  <span className="text-sm text-red-700 font-medium">Predicted Difficult Airway</span>
                </label>
              </div>

              {/* Medical History */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Medical History</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'cardiacHistory', label: 'Cardiac', placeholder: 'IHD, HTN, valvular...' },
                    { key: 'respiratoryHistory', label: 'Respiratory', placeholder: 'Asthma, COPD...' },
                    { key: 'diabetesStatus', label: 'Diabetes', placeholder: 'Type 1/2, HbA1c...' },
                    { key: 'renalStatus', label: 'Renal', placeholder: 'CKD, dialysis...' },
                    { key: 'hepaticStatus', label: 'Hepatic', placeholder: 'Cirrhosis, hepatitis...' },
                    { key: 'allergies', label: 'Allergies', placeholder: 'Drug allergies...' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input className="hms-input w-full" placeholder={f.placeholder}
                        value={(assessForm as any)[f.key]} onChange={e => setAssessForm({ ...assessForm, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Current Medications</label>
                    <input className="hms-input w-full" placeholder="Aspirin, Metformin, Atenolol..."
                      value={assessForm.currentMedications} onChange={e => setAssessForm({ ...assessForm, currentMedications: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Previous Anaesthesia Experience</label>
                    <input className="hms-input w-full" placeholder="Any complications in prior surgeries..."
                      value={assessForm.previousAnaesthesia} onChange={e => setAssessForm({ ...assessForm, previousAnaesthesia: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Special Instructions + NPO */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Special Instructions</label>
                <textarea className="hms-input w-full" rows={2} placeholder="Blood products ready, specific monitoring, positioning..."
                  value={assessForm.specialInstructions} onChange={e => setAssessForm({ ...assessForm, specialInstructions: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={assessForm.npoConfirmed} onChange={e => setAssessForm({ ...assessForm, npoConfirmed: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                <span className="text-sm text-gray-700 font-medium">NPO status confirmed (patient fasted)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setAssessBooking(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSaveAssessment} disabled={assessSaving} className="btn-primary flex items-center gap-2 px-4 py-2">
                {assessSaving && <Loader2 size={14} className="animate-spin" />}
                {assessSaving ? 'Saving…' : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLETE SURGERY MODAL ── */}
      {completeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Complete Surgery</h2>
                <p className="text-xs text-gray-400 mt-0.5">{completeBooking.procedureName} — {completeBooking.bookingNumber}</p>
              </div>
              <button onClick={() => setCompleteBooking(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Blood */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated Blood Loss (mL)</label>
                  <input type="number" value={completeForm.estimatedBloodLoss} onChange={e => setCompleteForm(f => ({ ...f, estimatedBloodLoss: e.target.value }))}
                    placeholder="e.g. 200" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Blood Units Used</label>
                  <input type="number" value={completeForm.bloodUnitsUsed} onChange={e => setCompleteForm(f => ({ ...f, bloodUnitsUsed: e.target.value }))}
                    placeholder="0" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {/* Drain */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={completeForm.drainInserted} onChange={e => setCompleteForm(f => ({ ...f, drainInserted: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  <span className="text-sm text-gray-700 font-medium">Drain Inserted</span>
                </label>
                {completeForm.drainInserted && (
                  <input value={completeForm.drainType} onChange={e => setCompleteForm(f => ({ ...f, drainType: e.target.value }))}
                    placeholder="Drain type (e.g. Jackson-Pratt)" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                )}
              </div>

              {/* Complications */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Complications</label>
                <textarea value={completeForm.complications} onChange={e => setCompleteForm(f => ({ ...f, complications: e.target.value }))}
                  placeholder="Any intra-operative complications..." rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>

              {/* Specimens + Implants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Specimens (one per line)</label>
                  <textarea value={completeForm.specimensText}
                    onChange={e => setCompleteForm(f => ({ ...f, specimensText: e.target.value }))}
                    placeholder="e.g. Gallbladder — histopath&#10;Cyst fluid — culture"
                    rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Implants (one per line)</label>
                  <textarea value={completeForm.implantsText}
                    onChange={e => setCompleteForm(f => ({ ...f, implantsText: e.target.value }))}
                    placeholder="e.g. Stent · Cordis 7F · Lot #A1234"
                    rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              </div>

              {/* Instrument count reconciliation */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Instrument Count (sponges / needles / sharps)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input type="number" min="0" value={completeForm.instrumentsBefore}
                      onChange={e => setCompleteForm(f => ({ ...f, instrumentsBefore: e.target.value }))}
                      placeholder="Count before incision"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <input type="number" min="0" value={completeForm.instrumentsAfter}
                      onChange={e => setCompleteForm(f => ({ ...f, instrumentsAfter: e.target.value }))}
                      placeholder="Count after closure"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">A mismatch will prompt for confirmation before marking the surgery complete.</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Intra-Operative Notes</label>
                <textarea value={completeForm.intraOpNotes} onChange={e => setCompleteForm(f => ({ ...f, intraOpNotes: e.target.value }))}
                  placeholder="Procedure findings, technique used..." rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Post-Operative Notes</label>
                <textarea value={completeForm.postOpNotes} onChange={e => setCompleteForm(f => ({ ...f, postOpNotes: e.target.value }))}
                  placeholder="Recovery instructions, follow-up plan..." rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setCompleteBooking(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleComplete} disabled={completeSaving} className="btn-primary flex items-center gap-2 px-4 py-2">
                {completeSaving && <Loader2 size={14} className="animate-spin" />}
                {completeSaving ? 'Completing…' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRE-OP CHECKLIST MODAL ── */}
      {checklistBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">WHO Surgical Safety Checklist</h2>
                <p className="text-xs text-gray-400 mt-0.5">{checklistBooking.procedureName} — {checklistBooking.bookingNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${checkedCount === totalChecklistItems ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {checkedCount}/{totalChecklistItems}
                </span>
                <button onClick={() => setChecklistBooking(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${totalChecklistItems > 0 ? (checkedCount / totalChecklistItems) * 100 : 0}%`, background: checkedCount === totalChecklistItems ? '#10B981' : 'linear-gradient(90deg,#0F766E,#14B8A6)' }} />
              </div>

              {CHECKLIST_ITEMS.map(section => (
                <div key={section.section}>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-teal-600" />
                    {section.section}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map(item => (
                      <label key={item.key} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checklist[item.key] ? 'border-teal-200 bg-teal-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <input type="checkbox" checked={checklist[item.key] || false}
                          onChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                        <span className={`text-sm ${checklist[item.key] ? 'text-gray-700' : 'text-gray-600'}`}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setChecklistBooking(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={saveChecklist} disabled={checklistSaving} className="btn-primary flex items-center gap-2 px-4 py-2">
                {checklistSaving && <Loader2 size={14} className="animate-spin" />}
                {checklistSaving ? 'Saving…' : 'Save Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
