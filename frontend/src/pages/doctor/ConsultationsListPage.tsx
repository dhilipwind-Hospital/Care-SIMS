import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Search, Eye, X, CheckCircle, ClipboardList,
  Clock, FileText, ChevronDown, ChevronUp, Users, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import KpiCard from '../../components/ui/KpiCard';

const STATUSES = ['ALL', 'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
const PAGE_SIZE = 20;

export default function ConsultationsListPage() {
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  // Detail panel
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // KPI counts
  const [counts, setCounts] = useState({ total: 0, draft: 0, inProgress: 0, completed: 0 });

  const fetchConsultations = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: PAGE_SIZE };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await api.get('/consultations', { params });
      setConsultations(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load consultations:', err);
      toast.error('Failed to load consultations');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchCounts = useCallback(async () => {
    try {
      const [allRes, draftRes, ipRes, compRes] = await Promise.all([
        api.get('/consultations', { params: { limit: 1 } }),
        api.get('/consultations', { params: { status: 'DRAFT', limit: 1 } }),
        api.get('/consultations', { params: { status: 'IN_PROGRESS', limit: 1 } }),
        api.get('/consultations', { params: { status: 'COMPLETED', limit: 1 } }),
      ]);
      setCounts({
        total: allRes.data.meta?.total || 0,
        draft: draftRes.data.meta?.total || 0,
        inProgress: ipRes.data.meta?.total || 0,
        completed: compRes.data.meta?.total || 0,
      });
    } catch (err) {
      console.error('Failed to fetch consultation counts:', err);
    }
  }, []);

  useEffect(() => { fetchConsultations(); }, [fetchConsultations]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  // Filter by search term (client-side on loaded page)
  const filtered = useMemo(() => search.trim()
    ? consultations.filter(c => {
        const q = search.toLowerCase();
        const patientName = `${c.patient?.firstName || ''} ${c.patient?.lastName || ''}`.toLowerCase();
        const complaint = (c.chiefComplaint || '').toLowerCase();
        return patientName.includes(q) || complaint.includes(q) || (c.patient?.patientId || '').toLowerCase().includes(q);
      })
    : consultations, [consultations, search]);

  // Expand / collapse detail
  const toggleDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/consultations/${id}`);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load consultation detail:', err);
      toast.error('Failed to load consultation detail');
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Complete consultation
  const handleComplete = async (id: string) => {
    setCompleting(id);
    try {
      await api.patch(`/consultations/${id}/complete`, {});
      toast.success('Consultation completed');
      fetchConsultations();
      fetchCounts();
      if (expandedId === id) {
        setExpandedId(null);
        setDetail(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete consultation');
    } finally {
      setCompleting(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (d: string | null) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const th = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider';
  const td = 'px-4 py-3 text-sm text-gray-700';

  return (
    <div className="p-3 sm:p-6 space-y-6" style={{ background: '#F5F7FA', minHeight: '100%' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope size={22} className="text-teal-600" />
            Consultations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage all consultations</p>
        </div>
        <button
          onClick={() => navigate('/app/doctor/consultation')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
        >
          <Stethoscope size={16} />
          New Consultation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total" value={counts.total} icon={ClipboardList} />
        <KpiCard label="Draft" value={counts.draft} icon={FileText} color="#6B7280" />
        <KpiCard label="In Progress" value={counts.inProgress} icon={Clock} color="#2563EB" />
        <KpiCard label="Completed" value={counts.completed} icon={CheckCircle} color="#16A34A" />
      </div>

      {/* Filters */}
      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patient, complaint..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all w-full sm:w-64"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className={th}>Patient</th>
                <th className={th}>Date</th>
                <th className={th}>Chief Complaint</th>
                <th className={th}>Diagnoses</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Stethoscope size={24} className="text-gray-400" />}
                      title="No consultations found"
                      description={statusFilter !== 'ALL' ? `No ${statusFilter.replace(/_/g, ' ').toLowerCase()} consultations.` : 'No consultations have been recorded yet.'}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <ConsultationRow
                    key={c.id}
                    consultation={c}
                    expanded={expandedId === c.id}
                    detail={expandedId === c.id ? detail : null}
                    detailLoading={expandedId === c.id && detailLoading}
                    completing={completing === c.id}
                    onToggle={() => toggleDetail(c.id)}
                    onComplete={() => handleComplete(c.id)}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    td={td}
                    th={th}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}

/* ── Consultation Row with expandable detail ── */

interface RowProps {
  consultation: any;
  expanded: boolean;
  detail: any;
  detailLoading: boolean;
  completing: boolean;
  onToggle: () => void;
  onComplete: () => void;
  formatDate: (d: string | null) => string;
  formatTime: (d: string | null) => string;
  td: string;
  th: string;
}

function ConsultationRow({
  consultation: c, expanded, detail, detailLoading, completing,
  onToggle, onComplete, formatDate, formatTime, td,
}: RowProps) {
  const patientName = c.patient
    ? `${c.patient.firstName || ''} ${c.patient.lastName || ''}`.trim()
    : 'Unknown';
  const diagnosesList = (c.diagnoses || []).map((d: any) => d.description).filter(Boolean);

  return (
    <>
      <tr className={`hover:bg-gray-50/50 transition-colors ${expanded ? 'bg-teal-50/30' : ''}`}>
        <td className={td}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-500 text-xs font-semibold">
                {c.patient ? `${c.patient.firstName?.[0] || ''}${c.patient.lastName?.[0] || ''}` : '?'}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">{patientName}</div>
              {c.patient?.patientId && (
                <div className="text-xs text-gray-400">{c.patient.patientId}</div>
              )}
            </div>
          </div>
        </td>
        <td className={td}>
          <div className="text-sm text-gray-900">{formatDate(c.startedAt || c.createdAt)}</div>
          <div className="text-xs text-gray-400">{formatTime(c.startedAt || c.createdAt)}</div>
        </td>
        <td className={td}>
          <span className="text-sm text-gray-700 line-clamp-1">{c.chiefComplaint || '--'}</span>
        </td>
        <td className={td}>
          {diagnosesList.length > 0 ? (
            <span className="text-sm text-gray-700 line-clamp-1">{diagnosesList.join(', ')}</span>
          ) : (
            <span className="text-xs text-gray-400">--</span>
          )}
        </td>
        <td className={td}>
          <StatusBadge status={c.status || 'DRAFT'} />
        </td>
        <td className={`${td} text-right`}>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title={expanded ? 'Collapse' : 'View details'}
            >
              {expanded ? <ChevronUp size={13} /> : <Eye size={13} />}
              {expanded ? 'Close' : 'View'}
            </button>
            {(c.status === 'DRAFT' || c.status === 'IN_PROGRESS') && (
              <button
                onClick={onComplete}
                disabled={completing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                <CheckCircle size={13} />
                {completing ? 'Completing...' : 'Complete'}
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-0">
            <div className="bg-white border border-gray-100 rounded-xl my-2 shadow-sm overflow-hidden">
              {detailLoading ? (
                <div className="p-6 flex items-center justify-center">
                  <div className="animate-pulse flex items-center gap-2 text-sm text-gray-400">
                    <Activity size={16} className="animate-spin" /> Loading details...
                  </div>
                </div>
              ) : detail ? (
                <DetailPanel detail={detail} formatDate={formatDate} formatTime={formatTime} />
              ) : null}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Detail Panel ── */

function DetailPanel({ detail, formatDate, formatTime }: { detail: any; formatDate: (d: string | null) => string; formatTime: (d: string | null) => string }) {
  const section = 'mb-4';
  const sectionTitle = 'text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5';
  const sectionBody = 'text-sm text-gray-700 whitespace-pre-wrap';

  return (
    <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — SOAP */}
      <div className="space-y-4">
        {/* Subjective */}
        {(detail.chiefComplaint || detail.historySubjective) && (
          <div className={section}>
            <div className={sectionTitle}>
              <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-sm bg-gray-400" /></div>
              Subjective
            </div>
            {detail.chiefComplaint && (
              <div className="mb-1">
                <span className="text-xs text-gray-400">Chief Complaint: </span>
                <span className={sectionBody}>{detail.chiefComplaint}</span>
              </div>
            )}
            {detail.historySubjective && (
              <div>
                <span className="text-xs text-gray-400">History: </span>
                <span className={sectionBody}>{detail.historySubjective}</span>
              </div>
            )}
          </div>
        )}

        {/* Objective */}
        {(detail.historyObjective || detail.examinationFindings) && (
          <div className={section}>
            <div className={sectionTitle}>
              <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-sm bg-gray-400" /></div>
              Objective
            </div>
            {detail.historyObjective && (
              <div className="mb-1">
                <span className="text-xs text-gray-400">Objective History: </span>
                <span className={sectionBody}>{detail.historyObjective}</span>
              </div>
            )}
            {detail.examinationFindings && (
              <div>
                <span className="text-xs text-gray-400">Examination: </span>
                <span className={sectionBody}>{detail.examinationFindings}</span>
              </div>
            )}
          </div>
        )}

        {/* Assessment */}
        {(detail.assessment || (detail.diagnoses && detail.diagnoses.length > 0)) && (
          <div className={section}>
            <div className={sectionTitle}>
              <CheckCircle size={13} className="text-teal-500" />
              Assessment
            </div>
            {detail.assessment && (
              <p className={`${sectionBody} mb-2`}>{detail.assessment}</p>
            )}
            {detail.diagnoses && detail.diagnoses.length > 0 && (
              <div className="space-y-1">
                {detail.diagnoses.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${d.type === 'PRIMARY' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
                      {d.type || 'PRIMARY'}
                    </span>
                    <span className="text-gray-700">{d.description}</span>
                    {d.icdCode && <span className="text-xs text-gray-400">({d.icdCode})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan */}
        {detail.plan && (
          <div className={section}>
            <div className={sectionTitle}>
              <FileText size={13} className="text-teal-500" />
              Plan
            </div>
            <p className={sectionBody}>{detail.plan}</p>
          </div>
        )}

        {/* No SOAP data */}
        {!detail.chiefComplaint && !detail.historySubjective && !detail.historyObjective && !detail.examinationFindings && !detail.assessment && !detail.plan && (!detail.diagnoses || detail.diagnoses.length === 0) && (
          <p className="text-sm text-gray-400 italic">No SOAP notes recorded for this consultation.</p>
        )}
      </div>

      {/* Right — Meta info + Prescriptions */}
      <div className="space-y-4">
        {/* Meta */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <StatusBadge status={detail.status || 'DRAFT'} />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Started</span>
            <span className="text-gray-700">{formatDate(detail.startedAt)} {formatTime(detail.startedAt)}</span>
          </div>
          {detail.completedAt && (
            <div className="flex justify-between">
              <span className="text-gray-400">Completed</span>
              <span className="text-gray-700">{formatDate(detail.completedAt)} {formatTime(detail.completedAt)}</span>
            </div>
          )}
          {detail.patient && (
            <div className="flex justify-between">
              <span className="text-gray-400">Patient</span>
              <span className="text-gray-700 font-medium">
                {detail.patient.firstName} {detail.patient.lastName}
                {detail.patient.patientId && <span className="text-teal-600 ml-1">({detail.patient.patientId})</span>}
              </span>
            </div>
          )}
        </div>

        {/* Prescriptions */}
        {detail.prescriptions && detail.prescriptions.length > 0 && (
          <div>
            <div className={sectionTitle}>
              <Users size={13} className="text-teal-500" />
              Prescriptions ({detail.prescriptions.length})
            </div>
            <div className="space-y-2">
              {detail.prescriptions.map((rx: any) => (
                <div key={rx.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Rx #{rx.id.slice(-6)}</span>
                    <StatusBadge status={rx.status || 'DRAFT'} />
                  </div>
                  {rx.items && rx.items.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {rx.items.map((item: any) => item.drugName || item.name).filter(Boolean).join(', ') || `${rx.items.length} item(s)`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
