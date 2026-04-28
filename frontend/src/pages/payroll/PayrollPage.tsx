import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DollarSign, Plus, X, Loader2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/format';

export default function PayrollPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staffId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), basicPay: '', da: '', hra: '', allowances: '', overtime: '' });
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);

  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([api.get('/payroll', { params: { page, limit: 20, month: monthFilter, year: yearFilter } }), api.get('/payroll/dashboard', { params: { month: monthFilter, year: yearFilter } })]); setRecords(list.data.data || []); setTotal(list.data.meta?.total || 0); setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page, monthFilter, yearFilter]);
  useEffect(() => { api.get('/users', { params: { limit: 200 } }).then(r => setStaff(r.data.data || [])).catch(() => {}); }, []);

  const handleProcess = async () => { if (!form.staffId || !form.basicPay) { toast.error('Staff and basic pay required'); return; } setSubmitting(true); try { await api.post('/payroll', { ...form, basicPay: Number(form.basicPay), da: Number(form.da || 0), hra: Number(form.hra || 0), allowances: Number(form.allowances || 0), overtime: Number(form.overtime || 0) }); toast.success('Payroll processed'); setShowForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };
  const handleAction = async (id: string, action: string) => { try { await api.patch(`/payroll/${id}/${action}`); toast.success(`Payroll ${action}d`); fetchData(); } catch { toast.error('Failed'); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Payroll Management" subtitle="Staff salary processing" actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Process Payroll</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Gross" value={formatCurrency(dashboard.totalGross || 0)} icon={DollarSign} color="#0F766E" />
        <KpiCard label="Total Net" value={formatCurrency(dashboard.totalNet || 0)} icon={DollarSign} color="#10B981" />
        <KpiCard label="Deductions" value={formatCurrency(dashboard.totalDeductions || 0)} icon={DollarSign} color="#EF4444" />
        <KpiCard label="Paid" value={dashboard.paid || 0} icon={DollarSign} color="#3B82F6" />
      </div>
      <div className="flex gap-3 items-center">
        <select className="hms-input" value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{new Date(2024,m-1).toLocaleString('en',{month:'long'})}</option>)}</select>
        <select className="hms-input" value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))}>{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
      </div>
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['Staff', 'Gross', 'PF', 'ESI', 'TDS', 'Total Ded.', 'Net Pay', 'Status', 'Actions'].map(h=><th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({length:5}).map((_,i)=><SkeletonTableRow key={i} cols={9}/>)}</>
        : records.length===0 ? <tr><td colSpan={9}><EmptyState icon={<DollarSign size={36}/>} title="No payroll records"/></td></tr>
        : records.map(r=>{const staffName=staff.find(s=>s.id===r.staffId); return(
          <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm font-medium">{staffName ? `${staffName.firstName} ${staffName.lastName}` : r.staffId.slice(0,8)}</td>
            <td className="px-4 py-3 text-sm font-bold">{formatCurrency(r.grossPay)}</td>
            <td className="px-4 py-3 text-xs">{formatCurrency(r.pfDeduction)}</td>
            <td className="px-4 py-3 text-xs">{formatCurrency(r.esiDeduction)}</td>
            <td className="px-4 py-3 text-xs">{formatCurrency(r.tdsDeduction)}</td>
            <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(r.totalDeductions)}</td>
            <td className="px-4 py-3 text-sm font-bold text-green-700">{formatCurrency(r.netPay)}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status}/></td>
            <td className="px-4 py-3"><div className="flex gap-1">
              {r.status==='PROCESSED'&&<button onClick={()=>handleAction(r.id,'approve')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Approve</button>}
              {r.status==='APPROVED'&&<button onClick={()=>handleAction(r.id,'pay')} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Mark Paid</button>}
            </div></td>
          </tr>)})}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total/20)} onPageChange={setPage} totalItems={total} pageSize={20}/></div>
      {showForm&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Process Payroll</h2><button onClick={()=>setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18}/></button></div><div className="p-6 space-y-4">
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Staff *</label><select className="hms-input w-full" value={form.staffId} onChange={e=>setForm({...form,staffId:e.target.value})}><option value="">Select</option>{staff.map(s=><option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Basic Pay *</label><input type="number" className="hms-input w-full" value={form.basicPay} onChange={e=>setForm({...form,basicPay:e.target.value})}/></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">DA</label><input type="number" className="hms-input w-full" value={form.da} onChange={e=>setForm({...form,da:e.target.value})}/></div></div>
        <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">HRA</label><input type="number" className="hms-input w-full" value={form.hra} onChange={e=>setForm({...form,hra:e.target.value})}/></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Allowances</label><input type="number" className="hms-input w-full" value={form.allowances} onChange={e=>setForm({...form,allowances:e.target.value})}/></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Overtime</label><input type="number" className="hms-input w-full" value={form.overtime} onChange={e=>setForm({...form,overtime:e.target.value})}/></div></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={()=>setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleProcess} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting&&<Loader2 size={14} className="animate-spin"/>} Process</button></div></div></div>)}
    </div>
  );
}
