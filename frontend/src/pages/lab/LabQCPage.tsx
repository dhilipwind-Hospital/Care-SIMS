import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Wrench, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';

export default function LabQCPage() {
  const [qcRuns, setQcRuns] = useState<any[]>([]);
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ qcLot: '', testName: '', analyzer: '', controlLevel: 'LEVEL_1', expectedValue: '', obtainedValue: '', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qcRes, calRes] = await Promise.all([
        api.get('/lab/results', { params: { limit: 50 } }).catch((err) => { console.error('Failed to fetch lab results:', err); return { data: [] }; }),
        api.get('/lab/orders', { params: { limit: 30 } }).catch((err) => { console.error('Failed to fetch lab orders:', err); return { data: [] }; }),
      ]);
      setQcRuns(qcRes.data?.data || qcRes.data || []);
      setCalibrations(calRes.data?.data || calRes.data || []);
    } catch (err) { toast.error('Failed to load QC data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const passed = qcRuns.filter(q => q.status === 'PASS').length;
  const failed = qcRuns.filter(q => q.status === 'FAIL').length;
  const calDue = calibrations.filter(c => c.status === 'DUE' || c.status === 'OVERDUE').length;
  const passRate = qcRuns.length > 0 ? Math.round((passed / qcRuns.length) * 100) : 0;

  const submitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/lab/orders', form);
      setShowForm(false);
      setForm({ qcLot: '', testName: '', analyzer: '', controlLevel: 'LEVEL_1', expectedValue: '', obtainedValue: '', notes: '' });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to submit QC run'); }
  };

  const statusColor: Record<string, string> = {
    PASS: 'bg-green-100 text-green-700',
    FAIL: 'bg-red-100 text-red-700',
    WARNING: 'bg-amber-100 text-amber-700',
  };
  const calColor: Record<string, string> = {
    CURRENT: 'bg-green-100 text-green-700',
    DUE: 'bg-amber-100 text-amber-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Quality Control" subtitle="Manage QC runs and calibration records"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Run QC
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="QC Pass Rate" value={`${passRate}%`} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Failed QC Runs" value={failed} icon={XCircle} color="#EF4444" />
        <KpiCard label="Calibration Due" value={calDue} icon={Wrench} color="#F59E0B" />
        <KpiCard label="Total Runs Today" value={qcRuns.length} icon={Clock} color="#0F766E" />
      </div>

      {showForm && (
        <div className="hms-card p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Record QC Run</h3>
          <form onSubmit={submitQC} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'QC Lot #', key: 'qcLot', type: 'text', required: true },
              { label: 'Test Name', key: 'testName', type: 'text', required: true },
              { label: 'Analyzer', key: 'analyzer', type: 'text', required: true },
              { label: 'Expected Value', key: 'expectedValue', type: 'text', required: true },
              { label: 'Obtained Value', key: 'obtainedValue', type: 'text', required: true },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input type={f.type} required={f.required} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Control Level</label>
              <select value={form.controlLevel} onChange={e => setForm(p => ({ ...p, controlLevel: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="LEVEL_1">Level 1</option>
                <option value="LEVEL_2">Level 2</option>
                <option value="LEVEL_3">Level 3</option>
              </select>
            </div>
            <div className="col-span-3 flex gap-3 pt-2">
              <button type="submit" className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>Submit QC Run</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="hms-card p-10 text-center text-gray-400 text-sm">Loading...</div> : (
        <div className="grid grid-cols-2 gap-6">
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Daily QC Runs</h3></div>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">QC Lot</th><th className="px-4 py-3">Test</th><th className="px-4 py-3">Analyzer</th>
                <th className="px-4 py-3">Level</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Obtained</th><th className="px-4 py-3">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {qcRuns.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No QC runs found</td></tr> :
                  qcRuns.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-teal-700">{q.qcLot}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{q.testName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{q.analyzer}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{q.controlLevel}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{q.expectedValue}</td>
                      <td className="px-4 py-3 text-sm font-medium">{q.obtainedValue}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColor[q.status] || 'bg-gray-100 text-gray-600'}`}>{q.status}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Calibration Records</h3></div>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Instrument</th><th className="px-4 py-3">Test</th>
                <th className="px-4 py-3">Last Cal.</th><th className="px-4 py-3">Next Due</th><th className="px-4 py-3">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {calibrations.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No calibration records</td></tr> :
                  calibrations.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.instrument}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.testName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.lastCalibration ? new Date(c.lastCalibration).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.nextDue ? new Date(c.nextDue).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${calColor[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
