import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Wrench, Clock, Plus, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';

const BLANK_QC = { qcLot: '', testName: '', analyzer: '', controlLevel: 'LEVEL_1', expectedValue: '', obtainedValue: '', notes: '' };
const BLANK_CAL = { instrument: '', testName: '', lastCalibration: '', nextDue: '', notes: '' };

export default function LabQCPage() {
  const [tab, setTab] = useState<'qc' | 'calibration'>('qc');
  const [qcRuns, setQcRuns] = useState<any[]>([]);
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQCForm, setShowQCForm] = useState(false);
  const [showCalForm, setShowCalForm] = useState(false);
  const [qcForm, setQcForm] = useState({ ...BLANK_QC });
  const [calForm, setCalForm] = useState({ ...BLANK_CAL });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qcRes, calRes] = await Promise.all([
        api.get('/lab/qc/runs'),
        api.get('/lab/qc/calibrations'),
      ]);
      setQcRuns(qcRes.data?.data || qcRes.data || []);
      setCalibrations(calRes.data?.data || calRes.data || []);
    } catch { toast.error('Failed to load QC data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const passed = qcRuns.filter(q => q.status === 'PASS').length;
  const failed = qcRuns.filter(q => q.status === 'FAIL').length;
  const calDue = calibrations.filter(c => c.status === 'DUE' || c.status === 'OVERDUE').length;
  const passRate = qcRuns.length > 0 ? Math.round((passed / qcRuns.length) * 100) : 0;

  const submitQC = async () => {
    if (!qcForm.qcLot.trim() || !qcForm.testName.trim() || !qcForm.expectedValue || !qcForm.obtainedValue) {
      toast.error('QC Lot, test name, expected and obtained values are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/lab/qc/runs', qcForm);
      toast.success('QC run recorded');
      setShowQCForm(false);
      setQcForm({ ...BLANK_QC });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to submit QC run'); }
    finally { setSubmitting(false); }
  };

  const submitCalibration = async () => {
    if (!calForm.instrument.trim() || !calForm.testName.trim()) {
      toast.error('Instrument and test name are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/lab/qc/calibrations', calForm);
      toast.success('Calibration record added');
      setShowCalForm(false);
      setCalForm({ ...BLANK_CAL });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add calibration'); }
    finally { setSubmitting(false); }
  };

  const statusStyle: Record<string, string> = {
    PASS: 'bg-green-100 text-green-700',
    FAIL: 'bg-red-100 text-red-700',
    WARNING: 'bg-amber-100 text-amber-700',
    PENDING: 'bg-gray-100 text-gray-600',
  };
  const calStyle: Record<string, string> = {
    CURRENT: 'bg-green-100 text-green-700',
    DUE: 'bg-amber-100 text-amber-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Lab Quality Control" subtitle="QC runs and instrument calibration records"
        actions={
          <button
            onClick={() => tab === 'qc' ? setShowQCForm(true) : setShowCalForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            <Plus size={15} /> {tab === 'qc' ? 'Record QC Run' : 'Add Calibration'}
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="QC Pass Rate" value={`${passRate}%`} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Failed QC Runs" value={failed} icon={XCircle} color="#EF4444" />
        <KpiCard label="Calibration Due" value={calDue} icon={Wrench} color="#F59E0B" />
        <KpiCard label="Runs Today" value={qcRuns.length} icon={Clock} color="#0F766E" />
      </div>

      {calDue > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 font-medium">
          <AlertTriangle size={16} className="shrink-0" />
          {calDue} instrument{calDue > 1 ? 's' : ''} due for calibration
        </div>
      )}

      {/* Tab bar */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        {([['qc', 'QC Runs'], ['calibration', 'Calibrations']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === v ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* QC Run Form */}
      {showQCForm && (
        <div className="hms-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Record QC Run</h3>
            <button onClick={() => setShowQCForm(false)} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">QC Lot # *</label><input className={inp} value={qcForm.qcLot} onChange={e => setQcForm(f => ({ ...f, qcLot: e.target.value }))} placeholder="e.g. LOT-2024-001" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Test Name *</label><input className={inp} value={qcForm.testName} onChange={e => setQcForm(f => ({ ...f, testName: e.target.value }))} placeholder="e.g. Glucose" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Analyzer</label><input className={inp} value={qcForm.analyzer} onChange={e => setQcForm(f => ({ ...f, analyzer: e.target.value }))} placeholder="Analyzer name/model" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Control Level</label>
              <select className={inp} value={qcForm.controlLevel} onChange={e => setQcForm(f => ({ ...f, controlLevel: e.target.value }))}>
                <option value="LEVEL_1">Level 1 (Low)</option>
                <option value="LEVEL_2">Level 2 (Normal)</option>
                <option value="LEVEL_3">Level 3 (High)</option>
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Expected Value *</label><input className={inp} value={qcForm.expectedValue} onChange={e => setQcForm(f => ({ ...f, expectedValue: e.target.value }))} placeholder="e.g. 5.5" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Obtained Value *</label><input className={inp} value={qcForm.obtainedValue} onChange={e => setQcForm(f => ({ ...f, obtainedValue: e.target.value }))} placeholder="e.g. 5.6" /></div>
            <div className="col-span-3"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><input className={inp} value={qcForm.notes} onChange={e => setQcForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
          </div>
          <p className="text-xs text-gray-400 mb-4">Status auto-calculated: PASS if deviation ≤5%, WARNING if 5–10%, FAIL if &gt;10%</p>
          <div className="flex gap-3">
            <button onClick={submitQC} disabled={submitting} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>{submitting ? 'Submitting...' : 'Submit QC Run'}</button>
            <button onClick={() => setShowQCForm(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Calibration Form */}
      {showCalForm && (
        <div className="hms-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Add Calibration Record</h3>
            <button onClick={() => setShowCalForm(false)} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Instrument *</label><input className={inp} value={calForm.instrument} onChange={e => setCalForm(f => ({ ...f, instrument: e.target.value }))} placeholder="e.g. Cobas 6000" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Test / Parameter *</label><input className={inp} value={calForm.testName} onChange={e => setCalForm(f => ({ ...f, testName: e.target.value }))} placeholder="e.g. Glucose" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Last Calibration</label><input type="date" className={inp} value={calForm.lastCalibration} onChange={e => setCalForm(f => ({ ...f, lastCalibration: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Next Due</label><input type="date" className={inp} value={calForm.nextDue} onChange={e => setCalForm(f => ({ ...f, nextDue: e.target.value }))} /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><input className={inp} value={calForm.notes} onChange={e => setCalForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={submitCalibration} disabled={submitting} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>{submitting ? 'Saving...' : 'Add Calibration'}</button>
            <button onClick={() => setShowCalForm(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* QC Runs table */}
      {tab === 'qc' && (
        <div className="hms-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Today's QC Runs — {qcRuns.length} records</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {['QC Lot', 'Test', 'Analyzer', 'Level', 'Expected', 'Obtained', 'Deviation', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)
              ) : qcRuns.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={<CheckCircle size={24} className="text-gray-400" />} title="No QC runs today" description="Record a QC run to track analyzer performance" />
                </td></tr>
              ) : qcRuns.map(q => {
                const exp = parseFloat(q.expectedValue);
                const obt = parseFloat(q.obtainedValue);
                const dev = !isNaN(exp) && !isNaN(obt) && exp !== 0 ? ((Math.abs(obt - exp) / exp) * 100).toFixed(1) : null;
                return (
                  <tr key={q.id} className={`border-t border-gray-50 hover:bg-gray-50 ${q.status === 'FAIL' ? 'bg-red-50/40' : q.status === 'WARNING' ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-teal-700">{q.qcLot}</td>
                    <td className="px-4 py-3 text-gray-800">{q.testName}</td>
                    <td className="px-4 py-3 text-gray-600">{q.analyzer || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{q.controlLevel?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-gray-600">{q.expectedValue}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{q.obtainedValue}</td>
                    <td className="px-4 py-3 text-gray-600">{dev ? `${dev}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusStyle[q.status] || 'bg-gray-100 text-gray-600'}`}>{q.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Calibrations table */}
      {tab === 'calibration' && (
        <div className="hms-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Instrument Calibrations — {calibrations.length} records</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {['Instrument', 'Test / Parameter', 'Last Calibration', 'Next Due', 'Status', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
              ) : calibrations.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={<Wrench size={24} className="text-gray-400" />} title="No calibration records" description="Add calibration records to track instrument maintenance" />
                </td></tr>
              ) : calibrations.map(c => (
                <tr key={c.id} className={`border-t border-gray-50 hover:bg-gray-50 ${c.status === 'OVERDUE' ? 'bg-red-50/40' : c.status === 'DUE' ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.instrument}</td>
                  <td className="px-4 py-3 text-gray-700">{c.testName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.lastCalibration ? new Date(c.lastCalibration).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{c.nextDue ? new Date(c.nextDue).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${calStyle[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{c.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
