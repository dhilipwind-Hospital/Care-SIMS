import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Monitor, Bed, AlertTriangle, CheckCircle, Activity, History, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';
import { SkeletonKpiRow } from '../../components/ui/Skeleton';

const EMPTY_MONITORING = {
  admissionId: '', patientId: '', icuBedId: '', locationId: '',
  systolicBp: '', diastolicBp: '', heartRate: '', respiratoryRate: '',
  spo2: '', temperatureC: '',
  ventilatorMode: '', fio2: '', peep: '', tidalVolume: '',
  gcs: '', painScore: '', sedationScore: '',
  cvp: '', urineOutputMl: '', ioBalance: '', bloodSugarMg: '',
  infusions: '', nursesNotes: '',
};

export default function IcuPage() {
  const [beds, setBeds] = useState<any[]>([]);
  const [, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bedNumber: '', bedType: 'GENERAL_ICU', equipmentList: '' });
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);

  // Monitoring form
  const [monitorBed, setMonitorBed] = useState<any>(null);
  const [monitorForm, setMonitorForm] = useState(EMPTY_MONITORING);
  const [monitorError, setMonitorError] = useState('');
  const [monitorSubmitting, setMonitorSubmitting] = useState(false);

  // Monitoring history
  const [historyBed, setHistoryBed] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async () => { setLoading(true); try { const [b, d] = await Promise.all([api.get('/icu/beds'), api.get('/icu/dashboard')]); setBeds(b.data.data || b.data || []); setDashboard(d.data.data || d.data || {}); } catch (err) { toast.error('Failed to load ICU data'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.bedNumber.trim()) { setFormError('Bed number is required'); return; }
    setFormError('');
    try { await api.post('/icu/beds', { ...form, equipmentList: form.equipmentList.split(',').map(s => s.trim()).filter(Boolean) }); toast.success('ICU bed added successfully'); setShowForm(false); setForm({ bedNumber: '', bedType: 'GENERAL_ICU', equipmentList: '' }); fetchData(); } catch (err) { toast.error('Failed to add ICU bed'); }
  };

  const updateBedStatus = async (id: string, status: string) => {
    try { await api.patch(`/icu/beds/${id}/status`, { status }); toast.success('Bed status updated'); fetchData(); } catch (err) { toast.error('Failed to update bed status'); }
  };

  const openMonitorForm = (bed: any) => {
    setMonitorBed(bed);
    setMonitorForm({
      ...EMPTY_MONITORING,
      admissionId: bed.admissionId || '',
      patientId: bed.patientId || '',
      icuBedId: bed.id,
      locationId: bed.locationId || '',
    });
    setMonitorError('');
  };

  const handleRecordMonitoring = async () => {
    setMonitorError('');
    if (!monitorForm.admissionId.trim()) { setMonitorError('Admission ID is required. This bed may not have an active admission.'); return; }
    setMonitorSubmitting(true);
    try {
      const payload: any = { ...monitorForm };
      // Convert numeric fields
      ['systolicBp','diastolicBp','heartRate','respiratoryRate','spo2','gcs','painScore','sedationScore','urineOutputMl','bloodSugarMg','tidalVolume'].forEach(k => {
        if (payload[k] !== '' && payload[k] !== undefined) payload[k] = Number(payload[k]);
        else delete payload[k];
      });
      ['temperatureC','fio2','peep','cvp','ioBalance'].forEach(k => {
        if (payload[k] !== '' && payload[k] !== undefined) payload[k] = parseFloat(payload[k]);
        else delete payload[k];
      });
      if (!payload.ventilatorMode) delete payload.ventilatorMode;
      if (!payload.infusions) delete payload.infusions;
      if (!payload.nursesNotes) delete payload.nursesNotes;
      if (!payload.locationId) delete payload.locationId;

      await api.post('/icu/monitoring', payload);
      toast.success('Monitoring record saved');
      setMonitorBed(null);
      setMonitorForm(EMPTY_MONITORING);
    } catch (err: any) {
      setMonitorError(err.response?.data?.message || 'Failed to record monitoring');
    } finally { setMonitorSubmitting(false); }
  };

  const openHistory = async (bed: any) => {
    if (!bed.admissionId) { toast.error('No active admission on this bed'); return; }
    setHistoryBed(bed);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/icu/monitoring/admission/${bed.admissionId}`);
      setHistoryRecords(data.data || data || []);
    } catch (err) {
      toast.error('Failed to load monitoring history');
      setHistoryBed(null);
    } finally { setHistoryLoading(false); }
  };

  const occupied = beds.filter(b => b.status === 'OCCUPIED').length;
  const available = beds.filter(b => b.status === 'AVAILABLE').length;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="ICU Management" subtitle="Monitor ICU beds and critical patients" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Beds" value={beds.length} icon={Bed} color="#3B82F6" />
          <KpiCard label="Occupied" value={occupied} icon={Monitor} color="#EF4444" />
          <KpiCard label="Available" value={available} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Maintenance" value={beds.filter(b => b.status === 'MAINTENANCE').length} icon={AlertTriangle} color="#F59E0B" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Add Bed</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Add ICU Bed</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Bed Number *" value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} />
            <select className="hms-input" value={form.bedType} onChange={e => setForm({ ...form, bedType: e.target.value })}><option value="GENERAL_ICU">General ICU</option><option value="CARDIAC_ICU">Cardiac ICU</option><option value="NICU">NICU</option><option value="PICU">PICU</option></select>
            <input className="hms-input" placeholder="Equipment (comma-separated)" value={form.equipmentList} onChange={e => setForm({ ...form, equipmentList: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Save</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      {beds.length === 0 && !loading ? (
        <div className="hms-card">
          <EmptyState icon={<Bed size={36} />} title="No ICU beds configured" description="Add beds to start tracking ICU occupancy" />
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {beds.slice((page - 1) * 20, page * 20).map(b => (
            <div key={b.id} className={`hms-card p-4 border-l-4 ${b.status === 'OCCUPIED' ? 'border-l-red-500' : b.status === 'AVAILABLE' ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
              <div className="flex justify-between items-start"><span className="font-bold text-lg">{b.bedNumber}</span><StatusBadge status={b.status} /></div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{b.bedType?.replace(/_/g, ' ')}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${b.status === 'OCCUPIED' ? 'bg-red-100 text-red-700' : b.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {b.status === 'OCCUPIED' ? 'Occupied' : b.status === 'AVAILABLE' ? 'Available' : 'Maintenance'}
                </span>
              </div>
              {b.patientId && <div className="text-sm text-gray-700 mt-2">Patient: {b.patientId?.slice(0, 8)}...</div>}
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {b.status === 'OCCUPIED' && (
                  <>
                    <button onClick={() => openMonitorForm(b)}
                      className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium flex items-center gap-1">
                      <Activity size={11} /> Record
                    </button>
                    <button onClick={() => openHistory(b)}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium flex items-center gap-1">
                      <History size={11} /> History
                    </button>
                  </>
                )}
                {b.status === 'AVAILABLE' && (
                  <button onClick={() => updateBedStatus(b.id, 'MAINTENANCE')} className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 font-medium">Maintenance</button>
                )}
                {b.status === 'MAINTENANCE' && (
                  <button onClick={() => updateBedStatus(b.id, 'AVAILABLE')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Mark Available</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={Math.ceil(beds.length / 20)} onPageChange={setPage} totalItems={beds.length} pageSize={20} />
        </>
      )}

      {/* ── RECORD MONITORING MODAL ── */}
      {monitorBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Record ICU Monitoring</h2>
                <p className="text-xs text-gray-400 mt-0.5">Bed: {monitorBed.bedNumber} {monitorBed.patientId ? `| Patient: ${monitorBed.patientId.slice(0, 8)}...` : ''}</p>
              </div>
              <button onClick={() => setMonitorBed(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              {monitorError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{monitorError}</div>}

              {/* Admission ID (editable if not auto-filled) */}
              {!monitorForm.admissionId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Admission ID <span className="text-red-500">*</span></label>
                  <input className="hms-input w-full" placeholder="Enter admission ID" value={monitorForm.admissionId}
                    onChange={e => setMonitorForm({ ...monitorForm, admissionId: e.target.value })} />
                </div>
              )}

              {/* Vital Signs */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vital Signs</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Systolic BP (mmHg)</label>
                    <input type="number" className="hms-input w-full" placeholder="120" value={monitorForm.systolicBp}
                      onChange={e => setMonitorForm({ ...monitorForm, systolicBp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Diastolic BP (mmHg)</label>
                    <input type="number" className="hms-input w-full" placeholder="80" value={monitorForm.diastolicBp}
                      onChange={e => setMonitorForm({ ...monitorForm, diastolicBp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Heart Rate (bpm)</label>
                    <input type="number" className="hms-input w-full" placeholder="72" value={monitorForm.heartRate}
                      onChange={e => setMonitorForm({ ...monitorForm, heartRate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SpO2 (%)</label>
                    <input type="number" className="hms-input w-full" placeholder="98" value={monitorForm.spo2}
                      onChange={e => setMonitorForm({ ...monitorForm, spo2: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Temperature (C)</label>
                    <input type="number" step="0.1" className="hms-input w-full" placeholder="36.6" value={monitorForm.temperatureC}
                      onChange={e => setMonitorForm({ ...monitorForm, temperatureC: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Respiratory Rate (/min)</label>
                    <input type="number" className="hms-input w-full" placeholder="16" value={monitorForm.respiratoryRate}
                      onChange={e => setMonitorForm({ ...monitorForm, respiratoryRate: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Ventilator Settings */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ventilator Settings</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mode</label>
                    <select className="hms-input w-full" value={monitorForm.ventilatorMode}
                      onChange={e => setMonitorForm({ ...monitorForm, ventilatorMode: e.target.value })}>
                      <option value="">N/A</option>
                      <option value="CMV">CMV</option>
                      <option value="SIMV">SIMV</option>
                      <option value="PSV">PSV</option>
                      <option value="CPAP">CPAP</option>
                      <option value="BiPAP">BiPAP</option>
                      <option value="PRVC">PRVC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">FiO2 (%)</label>
                    <input type="number" step="0.01" className="hms-input w-full" placeholder="0.40" value={monitorForm.fio2}
                      onChange={e => setMonitorForm({ ...monitorForm, fio2: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">PEEP (cmH2O)</label>
                    <input type="number" step="0.5" className="hms-input w-full" placeholder="5" value={monitorForm.peep}
                      onChange={e => setMonitorForm({ ...monitorForm, peep: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tidal Volume (mL)</label>
                    <input type="number" className="hms-input w-full" placeholder="500" value={monitorForm.tidalVolume}
                      onChange={e => setMonitorForm({ ...monitorForm, tidalVolume: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Neurological & Scores */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assessment Scores</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">GCS (3-15)</label>
                    <input type="number" min="3" max="15" className="hms-input w-full" placeholder="15" value={monitorForm.gcs}
                      onChange={e => setMonitorForm({ ...monitorForm, gcs: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pain Score (0-10)</label>
                    <input type="number" min="0" max="10" className="hms-input w-full" placeholder="0" value={monitorForm.painScore}
                      onChange={e => setMonitorForm({ ...monitorForm, painScore: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sedation Score</label>
                    <input type="number" className="hms-input w-full" placeholder="0" value={monitorForm.sedationScore}
                      onChange={e => setMonitorForm({ ...monitorForm, sedationScore: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Fluid & Lab */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Fluid Balance & Labs</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CVP (cmH2O)</label>
                    <input type="number" step="0.1" className="hms-input w-full" placeholder="" value={monitorForm.cvp}
                      onChange={e => setMonitorForm({ ...monitorForm, cvp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Urine Output (mL)</label>
                    <input type="number" className="hms-input w-full" placeholder="" value={monitorForm.urineOutputMl}
                      onChange={e => setMonitorForm({ ...monitorForm, urineOutputMl: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">I/O Balance (mL)</label>
                    <input type="number" step="0.1" className="hms-input w-full" placeholder="" value={monitorForm.ioBalance}
                      onChange={e => setMonitorForm({ ...monitorForm, ioBalance: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Blood Sugar (mg/dL)</label>
                    <input type="number" className="hms-input w-full" placeholder="" value={monitorForm.bloodSugarMg}
                      onChange={e => setMonitorForm({ ...monitorForm, bloodSugarMg: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Infusions / Drips</label>
                  <textarea className="hms-input w-full" rows={3} placeholder="NS @ 100ml/hr, Dopamine @ 5mcg/kg/min..."
                    value={monitorForm.infusions} onChange={e => setMonitorForm({ ...monitorForm, infusions: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nurse's Notes</label>
                  <textarea className="hms-input w-full" rows={3} placeholder="Observations, concerns, interventions..."
                    value={monitorForm.nursesNotes} onChange={e => setMonitorForm({ ...monitorForm, nursesNotes: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setMonitorBed(null)} className="px-4 py-2 rounded-lg border text-gray-600 text-sm">Cancel</button>
                <button onClick={handleRecordMonitoring} disabled={monitorSubmitting}
                  className="px-4 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60"
                  style={{ background: 'var(--accent)' }}>
                  {monitorSubmitting ? 'Saving...' : 'Save Monitoring Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MONITORING HISTORY MODAL ── */}
      {historyBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Monitoring History</h2>
                <p className="text-xs text-gray-400 mt-0.5">Bed: {historyBed.bedNumber} | Admission: {historyBed.admissionId?.slice(0, 8)}...</p>
              </div>
              <button onClick={() => setHistoryBed(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            {historyLoading ? (
              <div className="p-12 text-center text-gray-400">Loading history...</div>
            ) : historyRecords.length === 0 ? (
              <div className="p-12 text-center">
                <Activity size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No monitoring records yet</p>
                <p className="text-gray-400 text-xs mt-1">Use "Record" to add the first monitoring entry</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {historyRecords.map((r, i) => (
                  <div key={r.id || i} className="bg-gray-50 rounded-xl p-4 border-l-4 border-l-teal-500">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                        {new Date(r.recordedAt || r.createdAt).toLocaleString()}
                      </span>
                      {r.recordedById && (
                        <span className="text-xs text-gray-400">By: {r.recordedById.slice(0, 8)}...</span>
                      )}
                    </div>

                    {/* Vitals row */}
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {[
                        ['BP', r.systolicBp && r.diastolicBp ? `${r.systolicBp}/${r.diastolicBp}` : null, 'mmHg'],
                        ['HR', r.heartRate, 'bpm'],
                        ['SpO2', r.spo2, '%'],
                        ['Temp', r.temperatureC, 'C'],
                        ['RR', r.respiratoryRate, '/min'],
                        ['GCS', r.gcs, '/15'],
                      ].map(([label, val, unit]) => val != null ? (
                        <div key={String(label)} className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-sm font-bold text-gray-900">{val}<span className="text-xs text-gray-400 ml-0.5">{unit}</span></p>
                        </div>
                      ) : (
                        <div key={String(label)} className="bg-white rounded-lg p-2 text-center opacity-40">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-sm text-gray-300">--</p>
                        </div>
                      ))}
                    </div>

                    {/* Ventilator if present */}
                    {r.ventilatorMode && (
                      <div className="flex gap-3 text-xs mb-2">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">Vent: {r.ventilatorMode}</span>
                        {r.fio2 != null && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">FiO2: {r.fio2}</span>}
                        {r.peep != null && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">PEEP: {r.peep}</span>}
                        {r.tidalVolume != null && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">TV: {r.tidalVolume}mL</span>}
                      </div>
                    )}

                    {/* Scores & fluid */}
                    <div className="flex gap-3 text-xs flex-wrap">
                      {r.painScore != null && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md">Pain: {r.painScore}/10</span>}
                      {r.sedationScore != null && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md">Sedation: {r.sedationScore}</span>}
                      {r.urineOutputMl != null && <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md">Urine: {r.urineOutputMl}mL</span>}
                      {r.bloodSugarMg != null && <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded-md">Sugar: {r.bloodSugarMg}mg/dL</span>}
                      {r.cvp != null && <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md">CVP: {r.cvp}</span>}
                    </div>

                    {/* Notes */}
                    {r.infusions && <p className="text-xs text-gray-600 mt-2"><strong>Infusions:</strong> {r.infusions}</p>}
                    {r.nursesNotes && <p className="text-xs text-gray-600 mt-1"><strong>Notes:</strong> {r.nursesNotes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
