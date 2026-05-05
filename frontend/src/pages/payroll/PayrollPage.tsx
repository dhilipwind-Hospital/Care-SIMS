import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DollarSign, Plus, X, Loader2, Printer } from 'lucide-react';
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

  const handlePrintPayslip = (r: any) => {
    const staffMember = staff.find(s => s.id === r.staffId);
    const staffName = staffMember ? staffMember.firstName + ' ' + staffMember.lastName : r.staffId?.slice(0, 8) || '—';
    const fmt = (v: number) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthLabel = monthNames[(r.month || 1) - 1] + ' ' + r.year;
    const grossPay = r.grossPay || (Number(r.basicPay || 0) + Number(r.da || 0) + Number(r.hra || 0) + Number(r.allowances || 0) + Number(r.overtime || 0));
    const totalDed = r.totalDeductions || (Number(r.pfDeduction || 0) + Number(r.esiDeduction || 0) + Number(r.tdsDeduction || 0) + Number(r.otherDeductions || 0));
    const netPay = r.netPay || (grossPay - totalDed);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Payslip – ${staffName} – ${monthLabel}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; max-width: 800px; margin: auto; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { color: #0F766E; font-size: 26px; font-weight: 800; margin: 0 0 4px; letter-spacing: 1px; }
    .header h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; color: #333; letter-spacing: 2px; }
    .header p { margin: 0; font-size: 14px; color: #555; }
    .divider { border: none; border-top: 2px solid #0F766E; margin: 16px 0; }
    .info-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
    .info-row { display: flex; flex-direction: column; }
    .info-label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 14px; font-weight: 600; color: #111; margin-top: 2px; }
    .pay-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .pay-table th { background: #0F766E; color: #fff; padding: 9px 14px; text-align: left; font-size: 13px; }
    .pay-table td { padding: 7px 14px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .pay-table tr:last-child td { border-bottom: none; }
    .pay-table .amount { text-align: right; font-weight: 500; }
    .summary-row { display: flex; gap: 0; border: 2px solid #0F766E; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    .summary-cell { flex: 1; padding: 14px; text-align: center; border-right: 1px solid #0F766E; }
    .summary-cell:last-child { border-right: none; }
    .summary-label { font-size: 11px; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-value { font-size: 16px; font-weight: 700; margin-top: 4px; color: #111; }
    .net-box { background: #0F766E; color: #fff; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .net-box .net-label { font-size: 13px; font-weight: 600; opacity: 0.85; letter-spacing: 1px; text-transform: uppercase; }
    .net-box .net-amount { font-size: 32px; font-weight: 800; margin-top: 4px; }
    .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px; border-top: 1px dashed #d1d5db; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AYPHEN HMS</h1>
    <h2>PAY SLIP</h2>
    <p>${monthLabel}</p>
  </div>
  <hr class="divider"/>
  <div class="info-box">
    <div class="info-row"><span class="info-label">Employee Name</span><span class="info-value">${staffName}</span></div>
    <div class="info-row"><span class="info-label">Staff ID</span><span class="info-value">${r.staffId?.slice(0, 8) || '—'}</span></div>
    <div class="info-row"><span class="info-label">Month</span><span class="info-value">${monthNames[(r.month || 1) - 1]}</span></div>
    <div class="info-row"><span class="info-label">Year</span><span class="info-value">${r.year}</span></div>
  </div>
  <table class="pay-table">
    <thead><tr><th colspan="2">Earnings</th><th colspan="2">Deductions</th></tr></thead>
    <tbody>
      <tr><td>Basic Pay</td><td class="amount">${fmt(r.basicPay)}</td><td>Provident Fund (PF)</td><td class="amount">${fmt(r.pfDeduction)}</td></tr>
      <tr><td>Dearness Allowance (DA)</td><td class="amount">${fmt(r.da || 0)}</td><td>ESI</td><td class="amount">${fmt(r.esiDeduction)}</td></tr>
      <tr><td>House Rent Allowance (HRA)</td><td class="amount">${fmt(r.hra || 0)}</td><td>TDS</td><td class="amount">${fmt(r.tdsDeduction)}</td></tr>
      <tr><td>Allowances</td><td class="amount">${fmt(r.allowances || 0)}</td><td>Other Deductions</td><td class="amount">${fmt(r.otherDeductions || 0)}</td></tr>
      <tr><td>Overtime</td><td class="amount">${fmt(r.overtime || 0)}</td><td></td><td></td></tr>
    </tbody>
  </table>
  <div class="summary-row">
    <div class="summary-cell"><div class="summary-label">Gross Pay</div><div class="summary-value">${fmt(grossPay)}</div></div>
    <div class="summary-cell"><div class="summary-label">Total Deductions</div><div class="summary-value">${fmt(totalDed)}</div></div>
    <div class="summary-cell"><div class="summary-label">Net Pay</div><div class="summary-value">${fmt(netPay)}</div></div>
  </div>
  <div class="net-box">
    <div class="net-label">Net Pay</div>
    <div class="net-amount">${fmt(netPay)}</div>
  </div>
  <div class="footer">This is a computer-generated payslip and does not require a signature.</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar title="Payroll Management" subtitle="Staff salary processing" actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Process Payroll</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Gross" value={formatCurrency(dashboard.totalGross || 0)} icon={DollarSign} color="#0F766E" />
        <KpiCard label="Total Net" value={formatCurrency(dashboard.totalNet || 0)} icon={DollarSign} color="#10B981" />
        <KpiCard label="Deductions" value={formatCurrency(dashboard.totalDeductions || 0)} icon={DollarSign} color="#EF4444" />
        <KpiCard label="Paid" value={dashboard.paid || 0} icon={DollarSign} color="#3B82F6" />
      </div>
      <div className="flex flex-wrap gap-3 items-center">
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
              {(r.status==='PAID'||r.status==='APPROVED')&&<button onClick={()=>handlePrintPayslip(r)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1" title="Print Payslip"><Printer size={12}/> Slip</button>}
            </div></td>
          </tr>)})}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total/20)} onPageChange={setPage} totalItems={total} pageSize={20}/></div>
      {showForm&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Process Payroll</h2><button onClick={()=>setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18}/></button></div><div className="p-6 space-y-4">
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Staff *</label><select className="hms-input w-full" value={form.staffId} onChange={e=>setForm({...form,staffId:e.target.value})}><option value="">Select</option>{staff.map(s=><option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Basic Pay *</label><input type="number" className="hms-input w-full" value={form.basicPay} onChange={e=>setForm({...form,basicPay:e.target.value})}/></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">DA</label><input type="number" className="hms-input w-full" value={form.da} onChange={e=>setForm({...form,da:e.target.value})}/></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">HRA</label><input type="number" className="hms-input w-full" value={form.hra} onChange={e=>setForm({...form,hra:e.target.value})}/></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Allowances</label><input type="number" className="hms-input w-full" value={form.allowances} onChange={e=>setForm({...form,allowances:e.target.value})}/></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Overtime</label><input type="number" className="hms-input w-full" value={form.overtime} onChange={e=>setForm({...form,overtime:e.target.value})}/></div></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={()=>setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleProcess} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting&&<Loader2 size={14} className="animate-spin"/>} Process</button></div></div></div>)}
    </div>
  );
}
