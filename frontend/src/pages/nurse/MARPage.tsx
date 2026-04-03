import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Pill, Clock, CheckCircle, AlertCircle, Calendar, Plus, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const emptyScheduleForm = { admissionId: '', prescriptionItemId: '', drugName: '', dose: '', route: 'ORAL', frequency: 'OD', startDate: '', endDate: '', notes: '' };

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

  const fetchMAR = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/medication-admin/pending', { params: { limit: 50 } });
      setRecords(data.data || []);
    } catch (err) { toast.error('Failed to load medication records'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMAR(); }, []);

  const scheduled = useMemo(() => records.filter(r => r.status === 'SCHEDULED').length, [records]);
  const administered = useMemo(() => records.filter(r => r.status === 'ADMINISTERED').length, [records]);
  const withheld = useMemo(() => records.filter(r => r.status === 'WITHHELD').length, [records]);

  const [actionId, setActionId] = useState<string | null>(null);

  const administer = async (id: string) => {
    setActionId(id);
    try {
      await api.patch(`/medication-admin/${id}/administer`, { administeredAt: new Date().toISOString(), fiveRightsVerified: true });
      toast.success('Medication administered successfully');
      fetchMAR();
    } catch (err) { toast.error('Failed to record medication administration'); }
    finally { setActionId(null); }
  };

  const fetchMAR_Grid = async () => {
    if (!marAdmissionId.trim()) { toast.error('Please enter an Admission ID'); return; }
    setMarLoading(true);
    setShowMarGrid(true);
    try {
      const { data } = await api.get(`/medication-admin/mar/${marAdmissionId.trim()}`);
      setMarData(data.data || data || []);
    } catch (err) { console.error('Failed to load MAR grid:', err); toast.error('Failed to load MAR grid'); setMarData([]); }
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
    } catch (err) { console.error('Failed to schedule medication:', err); toast.error('Failed to schedule medication'); }
  };

  const filtered = useMemo(() => records.filter(r =>
    !search || r.drugName?.toLowerCase().includes(search.toLowerCase()) ||
    r.patient?.firstName?.toLowerCase().includes(search.toLowerCase())
  ), [records, search]);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Medication Administration (MAR)" subtitle="Record and track medication administration" />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Due" value={records.length} icon={Pill} color="#0F766E" />
        <KpiCard label="Scheduled" value={scheduled} icon={Clock} color="#3B82F6" />
        <KpiCard label="Administered" value={administered} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Withheld" value={withheld} icon={AlertCircle} color="#EF4444" />
      </div>

      {/* View MAR Grid */}
      <div className="hms-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar size={18} className="text-teal-600" /> View MAR Grid</h3>
          <button onClick={() => { setShowScheduleForm(!showScheduleForm); setScheduleError(''); }} className="px-4 py-2 rounded-lg text-white font-medium text-sm inline-flex items-center gap-1.5" style={{ background: 'var(--accent)' }}><Plus size={15} /> Schedule Medication</button>
        </div>
        <div className="flex items-center gap-3">
          <input className="hms-input w-64" placeholder="Enter Admission ID" value={marAdmissionId} onChange={e => setMarAdmissionId(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMAR_Grid()} />
          <button onClick={fetchMAR_Grid} className="px-4 py-2 rounded-lg text-white font-medium text-sm" style={{ background: 'var(--accent)' }}>Load MAR</button>
          {showMarGrid && <button onClick={() => { setShowMarGrid(false); setMarData([]); }} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>}
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
                    <tr key={m.id || idx} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold text-teal-700">{m.drugName}</td>
                      <td className="p-3">{m.dosage || m.dose}</td>
                      <td className="p-3">{m.route}</td>
                      <td className="p-3">{m.frequency}</td>
                      <td className="p-3 text-xs">{m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : '—'}</td>
                      <td className="p-3 text-xs">{m.administeredTime ? new Date(m.administeredTime).toLocaleString() : '—'}</td>
                      <td className="p-3"><StatusBadge status={m.status} /></td>
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
          <div className="grid grid-cols-3 gap-4">
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
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-52" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Patient','Drug','Dose','Route','Frequency','Scheduled','Administered','Status','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)}</>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-0"><EmptyState icon={<Pill size={36} />} title="No medication records" description="Pending medication administrations will appear here" /></td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.patient?.firstName} {r.patient?.lastName}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-teal-700">{r.drugName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.dosage}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.route}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.frequency}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.scheduledTime ? new Date(r.scheduledTime).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.administeredTime ? new Date(r.administeredTime).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.status === 'SCHEDULED' && (
                      <button onClick={() => administer(r.id)} disabled={actionId === r.id}
                        className="text-xs px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium disabled:opacity-50">
                        {actionId === r.id ? 'Giving...' : 'Give'}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
