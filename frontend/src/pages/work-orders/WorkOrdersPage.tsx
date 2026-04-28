import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function WorkOrdersPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([api.get('/work-orders', { params: { page, limit: 20 } }), api.get('/work-orders/dashboard').catch(() => ({ data: {} }))]); setRecords(list.data.data || []); setTotal(list.data.meta?.total || 0); setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page]);
  return (
    <div className="p-6 space-y-6">
      <TopBar title="Work Orders" subtitle="Maintenance request management" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Open" value={dashboard.open || 0} icon={Wrench} color="#F59E0B" />
        <KpiCard label="In Progress" value={dashboard.inProgress || 0} icon={Wrench} color="#3B82F6" />
        <KpiCard label="Completed" value={dashboard.completed || 0} icon={Wrench} color="#10B981" />
        <KpiCard label="Total" value={dashboard.total || 0} icon={Wrench} color="#0F766E" />
      </div>
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['WO #', 'Date', 'Category', 'Priority', 'Description', 'Status'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
        : records.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<Wrench size={36} />} title="No work orders" /></td></tr>
        : records.map(r => (
          <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm font-semibold text-teal-700">{r.workOrderNumber}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.createdAt)}</td>
            <td className="px-4 py-3"><StatusBadge status={r.category} /></td>
            <td className="px-4 py-3"><StatusBadge status={r.priority} /></td>
            <td className="px-4 py-3 text-sm max-w-[250px] truncate">{r.description}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
          </tr>))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
    </div>
  );
}
