import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function HomeCarePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/home-care', { params: { page, limit: 20 } }),
        api.get('/home-care/dashboard').catch(() => ({ data: {} })),
      ]);
      setRecords(list.data.data || list.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page]);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Home Care" subtitle="Domiciliary visit management" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Records" value={dashboard.total || records.length || 0} icon={Activity} color="#0F766E" />
      </div>
      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Date', 'Type/Status', 'Details', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={4} />)}</>
              : records.length === 0 ? <tr><td colSpan={4}><EmptyState icon={<Activity size={36} />} title="No records yet" description="Records will appear here when created" /></td></tr>
              : records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.createdAt || r.assessedAt || r.startDate || r.visitDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status || r.recordType || r.woundType || r.visitType || '—'} /></td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[300px] truncate">{r.description || r.diagnosis || r.name || r.drugName || r.notes || '—'}</td>
                  <td className="px-4 py-3"><button className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>
    </div>
  );
}
