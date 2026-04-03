import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FlaskConical, CheckCircle, AlertTriangle, Clock, Search } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../lib/api';

export default function LabResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/lab/results', { params: { q: search || undefined, limit: 50 } });
      setResults(data.data || []);
    } catch (err) { toast.error('Failed to load lab results'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [search]);

  const pendingValidation = results.filter(r => r.status === 'PENDING_VALIDATION').length;
  const validated = results.filter(r => r.status === 'VALIDATED').length;
  const critical = results.filter(r => r.status === 'CRITICAL_NOTIFIED').length;

  const flagColor: Record<string, string> = {
    NORMAL: 'text-gray-700',
    H: 'text-amber-600 font-semibold',
    L: 'text-amber-600 font-semibold',
    HH: 'text-red-600 font-bold',
    LL: 'text-red-600 font-bold',
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Lab Test Results" subtitle="View and manage test results" />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Results" value={results.length} icon={FlaskConical} color="#0F766E" />
        <KpiCard label="Pending Validation" value={pendingValidation} icon={Clock} color="#F59E0B" />
        <KpiCard label="Validated" value={validated} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Critical" value={critical} icon={AlertTriangle} color="#EF4444" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 hms-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Results</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          {loading ? <div className="p-10 text-center text-gray-400 text-sm">Loading...</div> : (
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Result #</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Tests</th>
                <th className="px-4 py-3">Completed</th><th className="px-4 py-3">Validated By</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {results.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No results found</td></tr> :
                  results.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50 cursor-pointer ${r.status === 'CRITICAL_NOTIFIED' ? 'bg-red-50' : ''}`} onClick={() => setSelected(r)}>
                      <td className="px-4 py-3 text-sm font-medium text-teal-700">{r.resultNumber || r.id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{r.patient?.firstName} {r.patient?.lastName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.labOrder?.tests?.length ?? 1} test(s)</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.validatedBy?.firstName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING_VALIDATION' && (
                          <button onClick={async (e) => { e.stopPropagation(); await api.post(`/lab/results/${r.id}/validate`); fetch(); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100">Validate</button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="hms-card p-5">
          {selected ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Result Detail</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
              </div>
              <div className="space-y-2 text-sm mb-5">
                <div><span className="text-gray-500">Patient:</span> <span className="font-medium">{selected.patient?.firstName} {selected.patient?.lastName}</span></div>
                <div><span className="text-gray-500">Sample ID:</span> <span className="font-medium">{selected.sampleId || '—'}</span></div>
                <div><span className="text-gray-500">Collection:</span> <span className="font-medium">{selected.collectionTime ? new Date(selected.collectionTime).toLocaleString() : '—'}</span></div>
                <div><span className="text-gray-500">TAT:</span> <span className="font-medium">{selected.tatMinutes ? `${selected.tatMinutes} min` : '—'}</span></div>
              </div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Test Results</h4>
              <div className="space-y-2">
                {(selected.resultEntries || selected.entries || []).map((e: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{e.testName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Ref: {e.referenceRange || '—'} {e.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${flagColor[e.flag] || 'text-gray-900'}`}>{e.resultValue} {e.unit}</div>
                        {e.flag && e.flag !== 'NORMAL' && <span className={`text-xs font-bold ${flagColor[e.flag]}`}>{e.flag}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {(!selected.resultEntries?.length && !selected.entries?.length) && <p className="text-sm text-gray-400 text-center py-4">No result entries</p>}
              </div>
              <button onClick={async () => { await api.post(`/lab/results/${selected.id}/print`); }} className="mt-4 w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Print Result</button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center py-16">
              <FlaskConical size={32} className="mb-3 opacity-40" />
              <p>Click a result row to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
