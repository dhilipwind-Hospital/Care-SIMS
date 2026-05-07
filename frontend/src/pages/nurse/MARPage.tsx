import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Pill, Clock, CheckCircle, AlertCircle, Calendar, Plus, X, Printer, AlertTriangle, ShieldCheck } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const emptyScheduleForm = { admissionId: '', prescriptionItemId: '', drugName: '', dose: '', route: 'ORAL', frequency: 'OD', startDate: '', endDate: '', notes: '' };

const FIVE_RIGHTS = [
  'Right Patient — confirmed with ID/wristband',
  'Right Drug — verified drug name and form',
  'Right Dose — dose matches prescription',
  'Right Route — route is correct and appropriate',
  'Right Time — within ±30 min of scheduled time',
];

function isOverdue(r: any) {
  return r.scheduledTime && r.status === 'SCHEDULED' && new Date(r.scheduledTime) < new Date();
}

export default function MARPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // MAR Grid
  const [marAdmissionId, setMarAdmissionId] = useState('');
  const [marData, setMarData] = useState<any[]>([]);
  const [marLoading, setMarLoading] = useState(false);
  const [showMarGrid, setShowMarGrid] = useState(false);

  // Schedule Medication
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ ...emptyScheduleForm });
  const [scheduleError, setScheduleError] = useState('');

  // 5-Rights checklist popup
  const [fiveRightsTarget, setFiveRightsTarget] = useState<any>(null);
  const [rightsChecked, setRightsChecked] = useState<boolean[]>(Array(5).fill(false));

  // Withhold modal
  const [withholdTarget, setWithholdTarget] = useState<any>(null);
  const [withholdReason, setWithholdReason] = useState('');

  const [actionId, setActionId] = useState<string | null>(null);

  const fetchMAR = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/medication-admin/pending', { params: { limit: 50 } });
      setRecords(data.data || []);
    } catch { toast.error('Failed to load medication records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMAR(); }, []);

  const scheduled = useMemo(() => records.filter(r => r.status === 'SCHEDULED').length, [records]);
  const administered = useMemo(() => records.filter(r => r.status === 'ADMINISTERED').length, [records]);
  const withheld = useMemo(() => records.filter(r => r.status === 'WITHHELD').length, [records]);
  const overdueCount = useMemo(() => records.filter(isOverdue).length, [records]);

  const openFiveRights = (r: any) => { setFiveRightsTarget(r); setRightsChecked(Array(5).fill(false)); };

  const confirmAdminister = async () => {
    if (!fiveRightsTarget) return;
    setActionId(fiveRightsTarget.id);
    setFiveRightsTarget(null);
    try {
      await api.patch(`/medication-admin/${fiveRightsTarget.id}/administer`, {
        administeredAt: new Date().toISOString(),
        fiveRightsVerified: true,
      });
      toast.success('Medication administered');
      fetchMAR();
    } catch { toast.error('Failed to record administration'); }
    finally { setActionId(null); }
  };

  const confirmWithhold = async () => {
    if (!withholdTarget || !withholdReason.trim()) { toast.error('Please enter a reason'); return; }
    setActionId(withholdTarget.id);
    const target = withholdTarget;
    setWithholdTarget(null);
    setWithholdReason('');
    try {
      await api.patch(`/medication-admin/${target.id}/withhold`, { withheldReason: withholdReason.trim() });
      toast.success('Medication withheld');
      fetchMAR();
    } catch { toast.error('Failed to record withhold'); }
    finally { setActionId(null); }
  };

  const fetchMAR_Grid = async () => {
    if (!marAdmissionId.trim()) { toast.error('Please enter an Admission ID'); return; }
    setMarLoading(true);
    setShowMarGrid(true);
    try {
      const { data } = await api.get(`/medication-admin/mar/${marAdmissionId.trim()}`);
      setMarData(data.data || data || []);
    } catch { toast.error('Failed to load MAR grid'); setMarData([]); }
    finally { setMarLoading(false); }
  };

  const handleSchedule = async () => {
    if (!scheduleForm.admissionId.trim()) { setScheduleError('Admission ID is required'); return; }
    if (!scheduleForm.drugName.trim()) { setScheduleError('Drug name is required'); return; }
    if (!scheduleForm.dose.trim()) { setScheduleError('Dose is required'); return; }
    if (!scheduleForm.startDate) { setScheduleError('Start date is required'); return; }
    setScheduleError('');
    try {
      await api.post('/medication-admin/schedule', scheduleForm);
      toast.success('Medication scheduled successfully');
      setShowScheduleForm(false);
      setScheduleForm({ ...emptyScheduleForm });
      fetchMAR();
    } catch { toast.error('Failed to schedule medication'); }
  };

  const filtered = useMemo(() => records.filter(r =>
    !search || r.drugName?.toLowerCase().includes(search.toLowerCase()) ||
    r.patient?.firstName?.toLowerCase().includes(search.toLowerCase())
  ), [records, search]);

  const handlePrintMAR = () => {
    const rows = marData.map((m: any) => {
      const statusColor = m.status === 'ADMINISTERED' ? '#15803d' : m.status === 'WITHHELD' ? '#dc2626' : '#1d4ed8';
      return `<tr>
        <td style="border:1px solid #d1d5db;padding:8px;">${m.drugName || ''}</td>
        <td style="border:1px solid #d1d5db;padding:8px;">${m.dosage || m.dose || ''}</td>
        <td style="border:1px solid #d1d5db;padding:8px;">${m.route || ''}</td>
        <td style="border:1px solid #d1d5db;padding:8px;">${m.frequency || ''}</td>
        <td style="border:1px solid #d1d5db;padding:8px;">${m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : '—'}</td>
        <td style="border:1px solid #d1d5db;padding:8px;">${m.administeredTime ? new Date(m.administeredTime).toLocaleString() : '—'}</td>
        <td style="border:1px solid #d1d5db;padding:8px;color:${statusColor};font-weight:600;">${m.status || ''}${m.withheldReason ? ` — ${m.withheldReason}` : ''}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>MAR</title></head><body style="font-family:Arial,sans-serif;padding:24px;">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="color:#0F766E;font-size:20px;font-weight:700;">AYPHEN HMS</div>
        <div style="font-size:16px;font-weight:600;margin-top:4px;">MEDICATION ADMINISTRATION RECORD</div>
        <div style="font-size:13px;color:#374151;margin-top:4px;">Admission ID: ${marAdmissionId}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">Date Printed: ${new Date().toLocaleString()}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="border:1px solid #d1d5db;padding:8px;text-align:left;">Drug</th>
            <th style="border:1px solid #d1d5db;padding:8px;text-align:left;">Dose</th>
            <th style="border:1px solid #d1d5db;padding:8px;text-align:left;">Route</th>
            <th style="border:1px solid #d1d5db;padding:8px;text-align:left;">Frequency</th>
            <th style="border:1px solid #d1d5db;padding:8px;text-align:left;">Scheduled</th>
            <th style="border:1px solid #d1d5db;padding:8px;text-align:left;">Administered</th>
            <th style="border:1px solid #d1d5db;padding:8px;text-align:left;">Status / Reason</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px;color:#374151;">
        <div>Verified By: ___________</div>
        <div>Nurse Signature: ___________</div>
        <div>Date/Time: ___________</div>
      </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar title="Medication Administration (MAR)" subtitle="Record and track medication administration" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Due" value={records.length} icon={Pill} color="#0F766E" />
        <KpiCard label="Scheduled" value={scheduled} icon={Clock} color="#3B82F6" />
        <KpiCard label="Administered" value={administered} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Withheld" value={withheld} icon={AlertCircle} color="#EF4444" />
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">
          <AlertTriangle size={16} className="shrink-0" />
          {overdueCount} overdue dose{overdueCount > 1 ? 's' : ''} — scheduled time has passed without administration
        </div>
      )}

      {/* View MAR Grid */}
      <div className="hms-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar size={18} className="text-teal-600" /> View MAR Grid</h3>
          <button onClick={() => { setShowScheduleForm(!showScheduleForm); setScheduleError(''); }} className="px-4 py-2 rounded-lg text-white font-medium text-sm inline-flex items-center gap-1.5" style={{ background: 'var(--accent)' }}><Plus size={15} /> Schedule Medication</button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input className="hms-input w-full sm:w-64" placeholder="Enter Admission ID" value={marAdmissionId} onChange={e => setMarAdmissionId(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMAR_Grid()} />
          <button onClick={fetchMAR_Grid} className="px-4 py-2 rounded-lg text-white font-medium text-sm" style={{ background: 'var(--accent)' }}>Load MAR</button>
          {showMarGrid && <button onClick={() => { setShowMarGrid(false); setMarData([]); }} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>}
          {showMarGrid && marData.length > 0 && (
            <button onClick={handlePrintMAR} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-50">
              <Printer size={14} /> Print MAR
            </button>
          )}
        </div>
        {showMarGrid && (
          <div className="overflow-x-auto">
            {marLoading ? (
              <div className="py-8 text-center text-gray-400">Loading MAR data...</div>
            ) : marData.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No medication records found for this admission</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ background: 'var(--surface)' }}>
                    <th className="text-left p-3 font-medium text-gray-600">Drug</th>
                    <th className="text-left p-3 font-medium text-gray-600">Dose</th>
                    <th className="text-left p-3 font-medium text-gray-600">Route</th>
                    <th className="text-left p-3 font-medium text-gray-600">Frequency</th>
                    <th className="text-left p-3 font-medium text-gray-600">Scheduled</th>
                    <th className="text-left p-3 font-medium text-gray-600">Administered</th>
                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {marData.map((m: any, idx: number) => (
                    <tr key={m.id || idx} className={`border-b hover:bg-gray-50 ${m.status === 'WITHHELD' ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3 font-semibold text-teal-700">{m.drugName}</td>
                      <td className="p-3">{m.dosage || m.dose}</td>
                      <td className="p-3">{m.route}</td>
                      <td className="p-3">{m.frequency}</td>
                      <td className="p-3 text-xs">{m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : '—'}</td>
                      <td className="p-3 text-xs">{m.administeredTime ? new Date(m.administeredTime).toLocaleString() : '—'}</td>
                      <td className="p-3">
                        <StatusBadge status={m.status} />
                        {m.withheldReason && <div className="text-xs text-red-600 mt-0.5">{m.withheldReason}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Schedule Medication Form */}
      {showScheduleForm && (
        <div className="hms-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Schedule Medication</h3>
            <button onClick={() => { setShowScheduleForm(false); setScheduleForm({ ...emptyScheduleForm }); setScheduleError(''); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>
          {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Admission ID *" value={scheduleForm.admissionId} onChange={e => setScheduleForm({ ...scheduleForm, admissionId: e.target.value })} />
            <input className="hms-input" placeholder="Drug Name *" value={scheduleForm.drugName} onChange={e => setScheduleForm({ ...scheduleForm, drugName: e.target.value })} />
            <input className="hms-input" placeholder="Dose *" value={scheduleForm.dose} onChange={e => setScheduleForm({ ...scheduleForm, dose: e.target.value })} />
            <select className="hms-input" value={scheduleForm.route} onChange={e => setScheduleForm({ ...scheduleForm, route: e.target.value })}>
              <option value="ORAL">Oral</option><option value="IV">IV</option><option value="IM">IM</option><option value="SC">SC</option><option value="TOPICAL">Topical</option><option value="INHALED">Inhaled</option><option value="RECTAL">Rectal</option><option value="SUBLINGUAL">Sublingual</option>
            </select>
            <select className="hms-input" value={scheduleForm.frequency} onChange={e => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}>
              <option value="OD">OD (Once daily)</option><option value="BD">BD (Twice daily)</option><option value="TDS">TDS (Thrice daily)</option><option value="QDS">QDS (Four times daily)</option><option value="SOS">SOS (As needed)</option><option value="STAT">STAT (Immediately)</option>
            </select>
            <input className="hms-input" placeholder="Prescription Item ID" value={scheduleForm.prescriptionItemId} onChange={e => setScheduleForm({ ...scheduleForm, prescriptionItemId: e.target.value })} />
            <div><label className="text-xs text-gray-500 mb-1 block">Start Date *</label><input className="hms-input w-full" type="date" value={scheduleForm.startDate} onChange={e => setScheduleForm({ ...scheduleForm, startDate: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">End Date</label><input className="hms-input w-full" type="date" value={scheduleForm.endDate} onChange={e => setScheduleForm({ ...scheduleForm, endDate: e.target.value })} /></div>
          </div>
          <textarea className="hms-input w-full" placeholder="Notes" rows={2} value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={handleSchedule} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Schedule</button>
            <button onClick={() => { setShowScheduleForm(false); setScheduleForm({ ...emptyScheduleForm }); setScheduleError(''); }} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Medication Schedule</h3>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient or drug…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-52" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Patient','Drug','Dose','Route','Freq','Scheduled','Status','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-0"><EmptyState icon={<Pill size={36} />} title="No medication records" description="Pending medication administrations will appear here" /></td></tr>
              ) : filtered.map(r => {
                const overdue = isOverdue(r);
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 border-t border-gray-50 ${overdue ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium">{r.patient?.firstName} {r.patient?.lastName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-teal-700">{r.drugName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.dosage || r.dose}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.route}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.frequency}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {overdue && <span className="text-red-500 mr-1">⚠</span>}
                      <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {r.scheduledTime ? new Date(r.scheduledTime).toLocaleTimeString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      {r.status === 'SCHEDULED' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => openFiveRights(r)} disabled={actionId === r.id}
                            className="text-xs px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium disabled:opacity-50 flex items-center gap-1">
                            <ShieldCheck size={11} /> Give
                          </button>
                          <button onClick={() => { setWithholdTarget(r); setWithholdReason(''); }} disabled={actionId === r.id}
                            className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium disabled:opacity-50">
                            Withhold
                          </button>
                        </div>
                      )}
                      {r.status === 'WITHHELD' && r.withheldReason && (
                        <span className="text-xs text-red-500 italic">{r.withheldReason}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5-Rights Checklist Modal */}
      {fiveRightsTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-600" />
                <h3 className="font-bold text-gray-900">5-Rights Verification</h3>
              </div>
              <button onClick={() => setFiveRightsTarget(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="bg-teal-50 rounded-lg p-3 text-sm">
                <div className="font-semibold text-teal-800">{fiveRightsTarget.drugName} — {fiveRightsTarget.dosage || fiveRightsTarget.dose}</div>
                <div className="text-teal-600 mt-0.5">{fiveRightsTarget.route} · {fiveRightsTarget.frequency}</div>
                <div className="text-teal-600 mt-0.5">
                  {fiveRightsTarget.patient?.firstName} {fiveRightsTarget.patient?.lastName}
                  {fiveRightsTarget.scheduledTime && ` · Due: ${new Date(fiveRightsTarget.scheduledTime).toLocaleTimeString()}`}
                </div>
              </div>
              <p className="text-xs text-gray-500">Confirm each right before administering:</p>
              {FIVE_RIGHTS.map((right, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${rightsChecked[i] ? 'border-teal-300 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={rightsChecked[i]}
                    onChange={e => { const next = [...rightsChecked]; next[i] = e.target.checked; setRightsChecked(next); }}
                    className="mt-0.5 accent-teal-600" />
                  <span className="text-sm text-gray-800">{right}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setFiveRightsTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmAdminister} disabled={!rightsChecked.every(Boolean)}
                className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                Confirm & Administer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withhold Reason Modal */}
      {withholdTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><AlertCircle size={16} className="text-red-500" /> Withhold Medication</h3>
              <button onClick={() => setWithholdTarget(null)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <div className="font-semibold text-red-800">{withholdTarget.drugName} — {withholdTarget.dosage || withholdTarget.dose}</div>
                <div className="text-red-600">{withholdTarget.patient?.firstName} {withholdTarget.patient?.lastName}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason for withholding *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
                  value={withholdReason}
                  onChange={e => setWithholdReason(e.target.value)}
                >
                  <option value="">Select reason…</option>
                  <option value="Patient refused">Patient refused</option>
                  <option value="Patient NBM / fasting">Patient NBM / fasting</option>
                  <option value="Patient unavailable">Patient unavailable</option>
                  <option value="Contraindication identified">Contraindication identified</option>
                  <option value="Drug not available">Drug not available</option>
                  <option value="Doctor order to hold">Doctor order to hold</option>
                  <option value="Adverse reaction risk">Adverse reaction risk</option>
                </select>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Or type custom reason…"
                  value={withholdReason.includes('…') || !['Patient refused','Patient NBM / fasting','Patient unavailable','Contraindication identified','Drug not available','Doctor order to hold','Adverse reaction risk'].includes(withholdReason) ? withholdReason : ''}
                  onChange={e => setWithholdReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setWithholdTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmWithhold} disabled={!withholdReason.trim()}
                className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-700">
                Record Withhold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
