import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, X, CheckCircle } from 'lucide-react';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function VitalsPage() {
  const [queueTokens, setQueueTokens] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);

  const [form, setForm] = useState({
    patientId: '',
    systolicBp: '', diastolicBp: '', heartRate: '',
    temperatureC: '', spo2: '', respiratoryRate: '',
    weightKg: '', heightCm: '', painScore: '',
  });

  const [patSearch,   setPatSearch]   = useState('');
  const [patResults,  setPatResults]  = useState<any[]>([]);
  const [selectedPat, setSelectedPat] = useState<any>(null);
  const [patLoading,  setPatLoading]  = useState(false);

  useEffect(() => {
    if (!patSearch.trim()) { setPatResults([]); return; }
    const t = setTimeout(async () => {
      setPatLoading(true);
      try {
        const { data } = await api.get('/patients', { params: { q: patSearch, limit: 8 } });
        setPatResults(data.data || []);
      } catch (err) { console.error('Failed to search patients:', err); toast.error('Failed to search patients'); } finally { setPatLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [patSearch]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/queue', { params: { limit: 50 } });
      const tokens = (data.data || []).filter((t: any) =>
        ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(t.status)
      );
      setQueueTokens(tokens);
    } catch (err) { console.error('Failed to load queue:', err); toast.error('Failed to load queue'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  const selectToken = (token: any) => {
    setSelectedToken(token);
    setSelectedPat(token.patient || null);
    setForm(f => ({ ...f, patientId: token.patientId || '' }));
    setSaved(false);
  };

  const handleSave = async () => {
    const pid = form.patientId || selectedPat?.id;
    if (!pid) { toast.error('Please select a patient first'); return; }

    // Basic range validation
    const sysNum = form.systolicBp ? Number(form.systolicBp) : null;
    const diaNum = form.diastolicBp ? Number(form.diastolicBp) : null;
    const hrNum = form.heartRate ? Number(form.heartRate) : null;
    const tempNum = form.temperatureC ? Number(form.temperatureC) : null;
    const spo2Num = form.spo2 ? Number(form.spo2) : null;
    const rrNum = form.respiratoryRate ? Number(form.respiratoryRate) : null;
    const painNum = form.painScore ? Number(form.painScore) : null;

    if (sysNum !== null && (sysNum < 50 || sysNum > 300)) { toast.error('Systolic BP must be between 50-300 mmHg'); return; }
    if (diaNum !== null && (diaNum < 20 || diaNum > 200)) { toast.error('Diastolic BP must be between 20-200 mmHg'); return; }
    if (hrNum !== null && (hrNum < 20 || hrNum > 300)) { toast.error('Heart rate must be between 20-300 bpm'); return; }
    if (tempNum !== null && (tempNum < 30 || tempNum > 45)) { toast.error('Temperature must be between 30-45°C'); return; }
    if (spo2Num !== null && (spo2Num < 0 || spo2Num > 100)) { toast.error('SpO2 must be between 0-100%'); return; }
    if (rrNum !== null && (rrNum < 4 || rrNum > 60)) { toast.error('Respiratory rate must be between 4-60 /min'); return; }
    if (painNum !== null && (painNum < 0 || painNum > 10)) { toast.error('Pain score must be between 0-10'); return; }

    setSaving(true);
    try {
      await api.post('/vitals', {
        patientId:      pid,
        systolicBp:     sysNum ?? undefined,
        diastolicBp:    diaNum ?? undefined,
        heartRate:      hrNum ?? undefined,
        temperatureC:   tempNum ?? undefined,
        spo2:           spo2Num ?? undefined,
        respiratoryRate:rrNum ?? undefined,
        weightKg:       form.weightKg       ? Number(form.weightKg)       : undefined,
        heightCm:       form.heightCm       ? Number(form.heightCm)       : undefined,
        painScore:      painNum ?? undefined,
      });
      setSaved(true);
      toast.success('Vitals saved successfully');
      fetchQueue();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save vitals'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all';

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vitals Recording</h1>
            <p className="text-sm text-gray-400 mt-0.5">Record and monitor patient vital signs</p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={patSearch}
              onChange={e => setPatSearch(e.target.value)}
              placeholder="Search patient…"
              className="pl-8 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-56"
            />
            {patResults.length > 0 && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-72 max-h-44 overflow-y-auto">
                {patLoading
                  ? <div className="p-2 text-xs text-gray-400">Searching…</div>
                  : patResults.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => {
                        setSelectedPat(p);
                        setForm(f => ({ ...f, patientId: p.id }));
                        setPatSearch('');
                        setPatResults([]);
                        setSelectedToken(null);
                        setSaved(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      <span className="text-gray-400 ml-2 text-xs">{p.patientId}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-5 p-5 overflow-auto">

        {/* Left: Patients Pending Vitals */}
        <div className="flex-1 hms-card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800">Patients Pending Vitals</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {queueTokens.length} pending
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Token #','Patient','Age/Gender','Last Vitals','Action'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</>
                ) : queueTokens.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">No patients pending vitals</td></tr>
                ) : queueTokens.map(token => (
                  <tr
                    key={token.id}
                    onClick={() => selectToken(token)}
                    className={`cursor-pointer transition-colors ${
                      selectedToken?.id === token.id
                        ? 'bg-teal-50 border-l-4 border-l-teal-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-bold text-teal-700">{token.tokenNumber}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {token.patient?.firstName} {token.patient?.lastName}
                      </div>
                      <div className="text-xs text-gray-400">{token.patient?.patientId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {token.patient?.dateOfBirth
                        ? `${new Date().getFullYear() - new Date(token.patient.dateOfBirth).getFullYear()}y`
                        : '—'}
                      {token.patient?.gender ? ` / ${token.patient.gender[0]}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {token.patient?.lastVitalsAt ? (
                        <span className="text-xs text-gray-500">
                          {new Date(token.patient.lastVitalsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">No records</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); selectToken(token); }}
                        className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                          token.patient?.lastVitalsAt
                            ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
                      >
                        {token.patient?.lastVitalsAt ? 'Update' : 'Record'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Vitals Entry */}
        <div className="w-96 flex-shrink-0">
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Quick Vitals Entry</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Selected Patient Banner */}
              {selectedPat ? (
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-teal-900">{selectedPat.firstName} {selectedPat.lastName}</p>
                    <p className="text-xs text-teal-600">{selectedPat.patientId}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedPat(null); setSelectedToken(null); setForm(f => ({ ...f, patientId: '' })); setSaved(false); }}
                    className="text-teal-400 hover:text-red-500"
                  ><X size={14} /></button>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-400 text-center">
                  Select a patient from the queue
                </div>
              )}

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['systolicBp',      'Blood Pressure',  '120/80 mmHg'],
                  ['heartRate',       'Heart Rate',      '72 bpm'],
                  ['temperatureC',    'Temperature',     '98.6°F'],
                  ['spo2',            'SpO₂',            '98 %'],
                  ['respiratoryRate', 'Resp. Rate',      '16 /min'],
                  ['weightKg',        'Weight',          '70 kg'],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input
                      type="number"
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className={inp}
                    />
                  </div>
                ))}
              </div>

              {/* Add Notes */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Add Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional observations…"
                  className={`${inp} resize-none`}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || !selectedPat}
                className="w-full py-2.5 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                {saved
                  ? <><CheckCircle size={15} /> Vitals Saved</>
                  : saving ? 'Saving…' : '💾 Save Vitals'
                }
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
