import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Plus, X, Loader2, Search, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const CERT_TYPES = ['FITNESS', 'MEDICAL_LEAVE', 'DISABILITY', 'WOUND', 'MLC', 'BIRTH', 'DEATH', 'CUSTOM'] as const;

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', certificateType: 'FITNESS', findings: '', recommendations: '', restrictions: '', validUntil: '', customBody: '', notes: '' });
  const [patSearch, setPatSearch] = useState('');
  const [patResults, setPatResults] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/certificates', { params: { page, limit: 20, type: typeFilter || undefined } });
      setCerts(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch { toast.error('Failed to load certificates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, typeFilter]);

  const searchPatients = async (q: string) => {
    setPatSearch(q);
    if (q.length < 2) { setPatResults([]); return; }
    try { const { data } = await api.get('/patients', { params: { q, limit: 5 } }); setPatResults(data.data || []); } catch { setPatResults([]); }
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.certificateType) { toast.error('Select patient and type'); return; }
    setSubmitting(true);
    try {
      await api.post('/certificates', { ...form, validUntil: form.validUntil || undefined });
      toast.success('Certificate generated'); setShowForm(false); fetchData();
      setForm({ patientId: '', certificateType: 'FITNESS', findings: '', recommendations: '', restrictions: '', validUntil: '', customBody: '', notes: '' });
      setPatSearch('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handlePrint = async (cert: any) => {
    const orgName = user?.tenantName || 'Hospital';
    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) return;
    const html = `<!DOCTYPE html><html><head><title>Medical Certificate — ${cert.certificateNumber}</title>
      <style>body{font-family:system-ui,sans-serif;margin:0;padding:40px;color:#1f2937}.header{border-bottom:2px solid #0f766e;padding-bottom:16px;margin-bottom:24px}.logo{font-size:20px;font-weight:700;color:#0f766e}.section{margin-bottom:16px}.label{color:#6b7280;font-size:11px;margin-bottom:2px}.footer{margin-top:48px;display:flex;justify-content:space-between;font-size:13px;color:#6b7280}@media print{body{padding:20px}}</style></head>
      <body>
        <div class="header"><div class="logo">${orgName}</div><div style="font-size:13px;color:#6b7280">Medical Certificate — ${cert.certificateNumber}</div></div>
        <h2 style="text-align:center;color:#0f766e;margin:0 0 20px">${cert.certificateType.replace(/_/g, ' ')} CERTIFICATE</h2>
        <div class="section"><div class="label">Patient</div><strong>${cert.patient?.firstName || ''} ${cert.patient?.lastName || ''}</strong> (${cert.patient?.patientId || '—'})</div>
        <div class="section"><div class="label">Issued Date</div>${formatDate(cert.issuedDate)}</div>
        ${cert.validUntil ? `<div class="section"><div class="label">Valid Until</div>${formatDate(cert.validUntil)}</div>` : ''}
        ${cert.findings ? `<div class="section"><div class="label">Findings</div><p>${cert.findings}</p></div>` : ''}
        ${cert.recommendations ? `<div class="section"><div class="label">Recommendations</div><p>${cert.recommendations}</p></div>` : ''}
        ${cert.restrictions ? `<div class="section"><div class="label">Restrictions</div><p>${cert.restrictions}</p></div>` : ''}
        ${cert.customBody ? `<div class="section"><p>${cert.customBody}</p></div>` : ''}
        <div class="footer"><div><div style="margin-bottom:30px">Doctor's Signature</div><div>_________________________</div></div><div style="text-align:right"><div style="margin-bottom:30px">Date & Seal</div><div>_________________________</div></div></div>
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>`;
    printWin.document.write(html); printWin.document.close();
    await api.patch(`/certificates/${cert.id}/print`).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Medical Certificates" subtitle="Generate and manage medical certificates"
        actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Certificate</button>} />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${!typeFilter ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600'}`}>All</button>
        {CERT_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${typeFilter === t ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600'}`}>{t.replace(/_/g, ' ')}</button>
        ))}
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10"><tr>
              {['Cert #', 'Patient', 'Type', 'Issued', 'Valid Until', 'Printed', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</> : certs.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<FileText size={36} />} title="No certificates" description="Generate medical certificates for patients" /></td></tr>
              : certs.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 border-t border-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-teal-700">{c.certificateNumber}</td>
                  <td className="px-4 py-3 text-sm"><div className="font-medium">{c.patient?.firstName} {c.patient?.lastName}</div><div className="text-xs text-gray-400">{c.patient?.patientId}</div></td>
                  <td className="px-4 py-3"><StatusBadge status={c.certificateType} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.issuedDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.validUntil ? formatDate(c.validUntil) : '—'}</td>
                  <td className="px-4 py-3 text-sm">{c.printedAt ? '✅' : '—'}</td>
                  <td className="px-4 py-3"><button onClick={() => handlePrint(c)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Create Certificate Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Generate Medical Certificate</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient *</label>
                <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="hms-input w-full pl-9" placeholder="Search..." value={patSearch} onChange={e => searchPatients(e.target.value)} /></div>
                {patResults.length > 0 && <div className="border border-gray-200 rounded-lg mt-1 max-h-32 overflow-y-auto">{patResults.map(p => (
                  <button key={p.id} onClick={() => { setForm({ ...form, patientId: p.id }); setPatSearch(`${p.firstName} ${p.lastName}`); setPatResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{p.firstName} {p.lastName} · {p.patientId}</button>
                ))}</div>}
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Certificate Type *</label>
                <select className="hms-input w-full" value={form.certificateType} onChange={e => setForm({ ...form, certificateType: e.target.value })}>{CERT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Findings</label><textarea className="hms-input w-full" rows={2} value={form.findings} onChange={e => setForm({ ...form, findings: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Recommendations</label><textarea className="hms-input w-full" rows={2} value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Restrictions</label><input className="hms-input w-full" value={form.restrictions} onChange={e => setForm({ ...form, restrictions: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Valid Until</label><input type="date" className="hms-input w-full" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} /></div>
              </div>
              {form.certificateType === 'CUSTOM' && <div><label className="block text-xs font-semibold text-gray-600 mb-1">Custom Body</label><textarea className="hms-input w-full" rows={4} value={form.customBody} onChange={e => setForm({ ...form, customBody: e.target.value })} /></div>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
