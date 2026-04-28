import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function MrdPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([api.get('/mrd/files', { params: { page, limit: 20 } }), api.get('/mrd/dashboard').catch(() => ({ data: {} }))]); setRecords(list.data.data || []); setTotal(list.data.meta?.total || 0); setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page]);
  return (
    <div className="p-6 space-y-6">
      <TopBar title="Medical Records Department" subtitle="Record file tracking and ICD coding" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Files" value={dashboard.total || 0} icon={FileText} color="#0F766E" />
        <KpiCard label="Checked Out" value={dashboard.checkedOut || 0} icon={FileText} color="#F59E0B" />
        <KpiCard label="Incomplete Notes" value={dashboard.incomplete || 0} icon={FileText} color="#EF4444" />
        <KpiCard label="Uncoded" value={dashboard.uncoded || 0} icon={FileText} color="#3B82F6" />
      </div>
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['File #', 'Location', 'Coding', 'Incomplete', 'ICD Codes'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</>
        : records.length === 0 ? <tr><td colSpan={5}><EmptyState icon={<FileText size={36} />} title="No medical record files" /></td></tr>
        : records.map(r => (
          <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm font-semibold text-teal-700">{r.fileNumber}</td>
            <td className="px-4 py-3"><StatusBadge status={r.currentLocation || 'RECORDS_ROOM'} /></td>
            <td className="px-4 py-3">{r.codingComplete ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Complete</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Pending</span>}</td>
            <td className="px-4 py-3">{r.incompleteNotes ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Yes</span> : '—'}</td>
            <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.icdCodes?.join(', ') || '—'}</td>
          </tr>))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
    </div>
  );
}
