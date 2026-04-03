import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Search, UserCheck } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const PAGE_SIZE = 20;
type Tab = 'activity' | 'patient-access';

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<Tab>('activity');

  // Activity log state
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Patient access log state
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessPage, setAccessPage] = useState(1);
  const [accessTotal, setAccessTotal] = useState(0);
  const [patientFilter, setPatientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit/logs', { params: { event: action || undefined, page, limit: PAGE_SIZE } });
      setLogs(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { console.error('Failed to load audit logs:', err); toast.error('Failed to load audit logs'); } finally { setLoading(false); }
  };

  const fetchPatientAccess = async () => {
    setAccessLoading(true);
    try {
      const params: any = { page: accessPage, limit: PAGE_SIZE };
      if (patientFilter.trim()) params.patientId = patientFilter.trim();
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data } = await api.get('/audit/patient-access', { params });
      setAccessLogs(data.data || []);
      setAccessTotal(data.meta?.total || 0);
    } catch (err) { console.error('Failed to load patient access logs:', err); toast.error('Failed to load patient access logs'); } finally { setAccessLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [search, action, page]);
  useEffect(() => { if (activeTab === 'patient-access') fetchPatientAccess(); }, [activeTab, accessPage]);

  const handleAccessSearch = () => { setAccessPage(1); fetchPatientAccess(); };

  const actionColor: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700', VIEW: 'bg-gray-100 text-gray-600',
    LOGIN: 'bg-teal-100 text-teal-700', LOGOUT: 'bg-gray-100 text-gray-500',
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'activity', label: 'Activity Log', icon: Shield },
    { key: 'patient-access', label: 'Patient Access', icon: UserCheck },
  ];

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Audit Logs" subtitle="System access and activity trail" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'activity' && (
        <div className="hms-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Shield size={18} className="text-teal-600" />
              <span className="font-semibold">Activity Log</span>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search user, entity…"
                  className="pl-8 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-52" />
              </div>
              <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">All Actions</option>
                {['CREATE','UPDATE','DELETE','VIEW','LOGIN','LOGOUT'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Timestamp','User','Action','Entity','Entity ID','IP Address','Details'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No audit logs</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{log.user?.firstName} {log.user?.lastName}</div>
                      <div className="text-xs text-gray-400">{log.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${actionColor[log.action] || 'bg-gray-100 text-gray-600'}`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.entityType}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 truncate max-w-[100px]">{log.entityId}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{log.details ? JSON.stringify(log.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
        </div>
      )}

      {activeTab === 'patient-access' && (
        <div className="hms-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <UserCheck size={18} className="text-teal-600" />
              <span className="font-semibold">Patient Access Log</span>
            </div>
          </div>
          {/* Filters */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Patient ID</label>
              <input value={patientFilter} onChange={e => setPatientFilter(e.target.value)}
                placeholder="Enter patient ID"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-52" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <button onClick={handleAccessSearch} className="px-4 py-1.5 rounded-lg text-white text-sm font-medium" style={{ background: 'var(--accent)' }}>Search</button>
            {(patientFilter || dateFrom || dateTo) && (
              <button onClick={() => { setPatientFilter(''); setDateFrom(''); setDateTo(''); setAccessPage(1); setTimeout(fetchPatientAccess, 0); }} className="px-3 py-1.5 rounded-lg border text-gray-600 text-sm">Clear</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Timestamp','Patient','Accessed By','Role','Action','Description','Cross-Location'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accessLoading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
                ) : accessLogs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No patient access logs found</td></tr>
                ) : accessLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{log.patientName || log.patientId}</div>
                      {log.patientName && <div className="text-xs text-gray-400 font-mono">{log.patientId?.slice(0, 8)}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{log.actorName || log.actorId}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.actorRole || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${actionColor[log.accessType] || actionColor[log.action] || 'bg-gray-100 text-gray-600'}`}>{log.accessType || log.action || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.description || log.resourceAccessed || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {log.isCrossLocation ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={accessPage} totalPages={Math.ceil(accessTotal / PAGE_SIZE)} onPageChange={setAccessPage} totalItems={accessTotal} pageSize={PAGE_SIZE} />
        </div>
      )}
    </div>
  );
}
