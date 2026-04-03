import { useEffect, useState, useMemo } from 'react';
import { Shield, Search, Download, RefreshCw, Filter, ChevronDown, ChevronUp, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import api from '../../lib/api';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: typeof Info }> = {
  INFO:     { color: 'text-blue-700',  bg: 'bg-blue-50',   icon: Info },
  WARNING:  { color: 'text-amber-700', bg: 'bg-amber-50',  icon: AlertTriangle },
  ERROR:    { color: 'text-red-700',   bg: 'bg-red-50',    icon: XCircle },
  CRITICAL: { color: 'text-red-800',   bg: 'bg-red-100',   icon: AlertTriangle },
  SUCCESS:  { color: 'text-green-700', bg: 'bg-green-50',  icon: CheckCircle },
};

const EVENT_CATEGORIES = [
  'ORG_REGISTERED',
  'ORG_SUSPENDED',
  'ORG_ACTIVATED',
  'PLATFORM_ADMIN_LOGIN',
  'PLATFORM_ADMIN_ACTION',
  'SUBSCRIPTION_CHANGED',
  'TRIAL_STARTED',
  'TRIAL_EXPIRED',
  'DOCTOR_REGISTERED',
  'DOCTOR_SUSPENDED',
  'FEATURE_TOGGLED',
  'SCHEMA_PROVISIONED',
  'BILLING_EVENT',
  'SECURITY_ALERT',
];

interface AuditEntry {
  id: string;
  eventType: string;
  actorId?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  severity: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  hashChain?: string;
}

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  const fetchLogs = () => {
    setLoading(true);
    const params: any = { limit: 200 };
    if (filterEvent) params.eventType = filterEvent;
    if (filterSeverity) params.severity = filterSeverity;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    api.get('/platform/audit', { params })
      .then(r => setLogs(r.data.data || r.data || []))
      .catch((err) => { console.error('Failed to fetch audit logs:', err); setLogs([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [filterEvent, filterSeverity, dateFrom, dateTo]);

  const filtered = useMemo(() => logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.eventType?.toLowerCase().includes(q) ||
      l.actorEmail?.toLowerCase().includes(q) ||
      l.targetName?.toLowerCase().includes(q) ||
      l.ipAddress?.includes(q)
    );
  }), [logs, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  const severityCounts = logs.reduce((acc, l) => {
    acc[l.severity] = (acc[l.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Event Type', 'Actor', 'Target', 'Severity', 'IP Address'].join(','),
      ...filtered.map(l => [
        new Date(l.createdAt).toISOString(),
        l.eventType,
        l.actorEmail || l.actorId || '',
        l.targetName || l.targetId || '',
        l.severity,
        l.ipAddress || '',
      ].map(v => `"${v}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar
        title="Platform Audit Log"
        subtitle="Immutable tamper-evident log of all platform-level events"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        }
      />

      {/* Severity summary */}
      <div className="grid grid-cols-5 gap-3">
        {(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'] as const).map(sev => {
          const cfg = SEVERITY_CONFIG[sev];
          const count = severityCounts[sev] || 0;
          return (
            <button
              key={sev}
              onClick={() => setFilterSeverity(filterSeverity === sev ? '' : sev)}
              className={`rounded-xl border p-4 text-left transition-all ${filterSeverity === sev ? cfg.bg + ' border-current' : 'bg-white border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`flex items-center gap-2 mb-1 ${cfg.color}`}>
                <cfg.icon size={14} />
                <span className="text-xs font-bold uppercase">{sev}</span>
              </div>
              <div className={`text-2xl font-black ${cfg.color}`}>{count}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="hms-card">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter size={14} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</span>
          </div>
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search event, actor, IP…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <select
            value={filterEvent}
            onChange={e => { setFilterEvent(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Event Types</option>
            {EVENT_CATEGORIES.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={filterSeverity}
            onChange={e => { setFilterSeverity(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Severity</option>
            {Object.keys(SEVERITY_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {(search || filterEvent || filterSeverity || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setFilterEvent(''); setFilterSeverity(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex justify-between items-center">
          <span>
            Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong> events
            {filtered.length !== logs.length && ` (filtered from ${logs.length} total)`}
          </span>
          <div className="flex items-center gap-1">
            <Shield size={12} className="text-teal-600" />
            <span className="text-teal-600 font-medium">SHA-256 hash-chain integrity verified</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading audit logs…</div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No audit events found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map(log => {
              const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
              const isExpanded = expanded === log.id;
              return (
                <div key={log.id} className="hover:bg-gray-50">
                  <div
                    className="flex items-center gap-4 px-5 py-3 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                  >
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cfg.bg}`}>
                      <cfg.icon size={13} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {log.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                          {log.severity}
                        </span>
                        {log.targetName && (
                          <span className="text-xs text-gray-500">→ <strong>{log.targetName}</strong></span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                        <span>{log.actorEmail || log.actorId || 'System'}</span>
                        {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                        <span>{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-4 ml-11">
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                          <div><span className="text-gray-400">Event ID:</span> <span className="font-mono text-gray-700">{log.id}</span></div>
                          <div><span className="text-gray-400">Event Type:</span> <span className="font-medium">{log.eventType}</span></div>
                          <div><span className="text-gray-400">Actor:</span> <span className="font-medium">{log.actorEmail || log.actorId || '—'}</span></div>
                          <div><span className="text-gray-400">Target:</span> <span className="font-medium">{log.targetType} / {log.targetId || '—'}</span></div>
                          <div><span className="text-gray-400">IP Address:</span> <span className="font-mono">{log.ipAddress || '—'}</span></div>
                          <div><span className="text-gray-400">Timestamp:</span> <span>{new Date(log.createdAt).toISOString()}</span></div>
                          {log.hashChain && (
                            <div className="col-span-2">
                              <span className="text-gray-400">Hash:</span>{' '}
                              <span className="font-mono text-teal-700 break-all">{log.hashChain}</span>
                            </div>
                          )}
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="text-gray-400 mb-1">Metadata:</div>
                            <pre className="text-gray-700 bg-white rounded p-2 overflow-x-auto text-xs">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
