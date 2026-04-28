import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/format';

export default function MlcRegisterPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/mlc', { params: { page, limit: 20 } }); setRecords(data.data || []); setTotal(data.meta?.total || 0); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page]);
  return (
    <div className="p-6 space-y-6">
      <TopBar title="MLC Register" subtitle="Medico-legal case register" />
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['MLC #', 'Date/Time', 'Brought By', 'Nature of Injury', 'Police Station', 'FIR #', 'Police Informed', 'Status'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
        : records.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<Shield size={36} />} title="No MLC records" /></td></tr>
        : records.map(r => (
          <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm font-semibold text-red-700">{r.mlcNumber}</td>
            <td className="px-4 py-3 text-xs text-gray-600">{formatDateTime(r.dateTime)}</td>
            <td className="px-4 py-3"><StatusBadge status={r.broughtBy} /></td>
            <td className="px-4 py-3 text-sm max-w-[200px] truncate">{r.natureOfInjury}</td>
            <td className="px-4 py-3 text-xs">{r.policeStation || '—'}</td>
            <td className="px-4 py-3 text-xs font-mono">{r.firNumber || '—'}</td>
            <td className="px-4 py-3">{r.informedPolice ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Yes</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">No</span>}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
          </tr>))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
    </div>
  );
}
