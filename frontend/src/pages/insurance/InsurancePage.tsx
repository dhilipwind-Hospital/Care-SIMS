import { useEffect, useState, useRef } from 'react';
import { ShieldCheck, FileText, Clock, CheckCircle, Upload, Paperclip, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import SearchableSelect from '../../components/ui/SearchableSelect';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function InsurancePage() {
  const [tab, setTab] = useState<'policies'|'claims'|'preauth'>('policies');
  const [page, setPage] = useState(1);
  const [policies, setPolicies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pForm, setPForm] = useState({ patientId: '', providerName: '', policyNumber: '', planName: '', startDate: '', endDate: '', sumInsured: '' });
  const [cForm, setCForm] = useState({ policyId: '', admissionId: '', claimType: 'CASHLESS', diagnosisCode: '', totalAmount: '' });
  const [paForm, setPaForm] = useState({ policyId: '', admissionId: '', diagnosisCode: '', procedure: '', estimatedAmount: '', clinicalNotes: '' });
  const [formError, setFormError] = useState('');

  // Document upload
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ url: string; filename: string }[]>([]);

  const fetchData = async () => { setLoading(true); try { const [p, c] = await Promise.all([api.get('/insurance/policies'), api.get('/insurance/claims')]); setPolicies(p.data.data || p.data || []); setClaims(c.data.data || c.data || []); } catch (err) { toast.error('Failed to load insurance data'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const addPolicy = async () => {
    if (!pForm.patientId || !pForm.providerName.trim() || !pForm.policyNumber.trim()) { setFormError('Patient, provider name, and policy number are required'); return; }
    setFormError('');
    try { await api.post('/insurance/policies', { ...pForm, sumInsured: Number(pForm.sumInsured) }); toast.success('Policy added successfully'); setShowForm(false); setPForm({ patientId: '', providerName: '', policyNumber: '', planName: '', startDate: '', endDate: '', sumInsured: '' }); fetchData(); } catch (err) { toast.error('Failed to add policy'); }
  };
  const addClaim = async () => {
    if (!cForm.policyId) { setFormError('Please select a policy'); return; }
    if (!cForm.totalAmount || Number(cForm.totalAmount) <= 0) { setFormError('Enter a valid amount'); return; }
    setFormError('');
    try { await api.post('/insurance/claims', { ...cForm, totalAmount: Number(cForm.totalAmount) }); toast.success('Claim created successfully'); setShowForm(false); setCForm({ policyId: '', admissionId: '', claimType: 'CASHLESS', diagnosisCode: '', totalAmount: '' }); fetchData(); } catch (err) { toast.error('Failed to create claim'); }
  };

  const addPreAuth = async () => {
    if (!paForm.policyId) { setFormError('Please select a policy'); return; }
    if (!paForm.procedure.trim()) { setFormError('Procedure is required'); return; }
    setFormError('');
    try {
      await api.post('/insurance/claims', {
        policyId: paForm.policyId,
        admissionId: paForm.admissionId || undefined,
        claimType: 'PREAUTH',
        diagnosisCode: paForm.diagnosisCode,
        procedure: paForm.procedure,
        totalAmount: paForm.estimatedAmount ? Number(paForm.estimatedAmount) : 0,
        notes: paForm.clinicalNotes,
      });
      toast.success('Pre-authorization request submitted');
      setShowForm(false);
      setPaForm({ policyId: '', admissionId: '', diagnosisCode: '', procedure: '', estimatedAmount: '', clinicalNotes: '' });
      fetchData();
    } catch (err) { toast.error('Failed to submit pre-authorization'); }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded');
      setUploadedDocs(prev => [...prev, { url: data.url, filename: data.filename }]);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setDocUploading(false); if (docInputRef.current) docInputRef.current.value = ''; }
  };

  const handlePrintClaim = (r: any) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Insurance Claim Form</title></head><body style="font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;max-width:800px;margin:0 auto;">
<h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1>
<h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">INSURANCE CLAIM FORM</h2>
<hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:20px;font-size:13px;">
  <div><span style="color:#555;font-weight:600;">Claim #:</span> ${r.claimNumber || (r.id||'').slice(0,8)}</div>
  <div><span style="color:#555;font-weight:600;">Date:</span> ${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
  <div><span style="color:#555;font-weight:600;">Patient:</span> ${r.patientId||r.patient?.patientId||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Policy Number:</span> ${r.policyNumber||r.policy?.policyNumber||'—'}</div>
  <div><span style="color:#555;font-weight:600;">TPA Name:</span> ${r.tpaName||r.policy?.tpaName||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Insurer:</span> ${r.insurerName||r.policy?.providerName||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Claim Amount (₹):</span> ${r.totalAmount ? '₹'+Number(r.totalAmount).toLocaleString() : '—'}</div>
  ${r.approvedAmount ? `<div><span style="color:#555;font-weight:600;">Approved Amount (₹):</span> ₹${Number(r.approvedAmount).toLocaleString()}</div>` : '<div></div>'}
  <div><span style="color:#555;font-weight:600;">Diagnosis:</span> ${r.diagnosisCode||r.diagnosis||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Procedure:</span> ${r.procedure||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Admission Date:</span> ${r.admissionDate ? new Date(r.admissionDate).toLocaleDateString() : '—'}</div>
  <div><span style="color:#555;font-weight:600;">Discharge Date:</span> ${r.dischargeDate ? new Date(r.dischargeDate).toLocaleDateString() : '—'}</div>
  <div><span style="color:#555;font-weight:600;">Status:</span> ${r.status||'—'}</div>
</div>
<div style="margin-bottom:16px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
  <strong>Supporting Documents Checklist:</strong>
  <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
    <label>☐ &nbsp;Discharge Summary</label>
    <label>☐ &nbsp;Prescription / Investigation Reports</label>
    <label>☐ &nbsp;Hospital Bills (itemized)</label>
    <label>☐ &nbsp;Insurance Card Copy</label>
    <label>☐ &nbsp;Photo ID Proof</label>
    <label>☐ &nbsp;Pre-Authorization Letter (if applicable)</label>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:40px;">
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Patient / Guardian</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Treating Doctor</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Hospital Admin</div>
</div>
<script>window.onload=function(){window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const submitClaim = async (id: string) => { try { await api.patch(`/insurance/claims/${id}/submit`); toast.success('Claim submitted'); fetchData(); } catch (err) { toast.error('Failed to submit claim'); } };
  const approveClaim = async (id: string) => { try { await api.patch(`/insurance/claims/${id}/approve`); toast.success('Claim approved'); fetchData(); } catch (err) { toast.error('Failed to approve claim'); } };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Insurance / TPA" subtitle="Manage insurance policies and claims" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Active Policies" value={policies.filter(p => p.status === 'ACTIVE').length} icon={ShieldCheck} color="#3B82F6" />
          <KpiCard label="Pending Claims" value={claims.filter(c => c.status === 'SUBMITTED').length} icon={Clock} color="#F59E0B" />
          <KpiCard label="Approved Claims" value={claims.filter(c => c.status === 'APPROVED').length} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Total Claims" value={claims.length} icon={FileText} color="#6B7280" />
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setTab('policies'); setPage(1); setShowForm(false); }} className={`px-4 py-2 rounded-lg font-medium ${tab === 'policies' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'policies' ? { background: 'var(--accent)' } : {}}>Policies</button>
        <button onClick={() => { setTab('claims'); setPage(1); setShowForm(false); }} className={`px-4 py-2 rounded-lg font-medium ${tab === 'claims' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'claims' ? { background: 'var(--accent)' } : {}}>Claims</button>
        <button onClick={() => { setTab('preauth'); setPage(1); setShowForm(false); }} className={`px-4 py-2 rounded-lg font-medium ${tab === 'preauth' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'preauth' ? { background: 'var(--accent)' } : {}}>Pre-Authorization</button>
        <button onClick={() => setShowForm(!showForm)} className="ml-auto px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>
          + {tab === 'policies' ? 'Add Policy' : tab === 'claims' ? 'New Claim' : 'New Pre-Auth'}
        </button>
      </div>
      {showForm && tab === 'policies' && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Add Policy</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect
              value={pForm.patientId}
              onChange={(id) => setPForm({ ...pForm, patientId: id })}
              placeholder="Search patient…"
              required
              endpoint="/patients"
              searchParam="q"
              mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })}
            />
            <input className="hms-input" placeholder="Provider Name *" value={pForm.providerName} onChange={e => setPForm({ ...pForm, providerName: e.target.value })} />
            <input className="hms-input" placeholder="Policy Number *" value={pForm.policyNumber} onChange={e => setPForm({ ...pForm, policyNumber: e.target.value })} />
            <input className="hms-input" placeholder="Plan Name" value={pForm.planName} onChange={e => setPForm({ ...pForm, planName: e.target.value })} />
            <input className="hms-input" type="date" value={pForm.startDate} onChange={e => setPForm({ ...pForm, startDate: e.target.value })} />
            <input className="hms-input" type="date" value={pForm.endDate} onChange={e => setPForm({ ...pForm, endDate: e.target.value })} />
            <input className="hms-input" type="number" placeholder="Sum Insured" value={pForm.sumInsured} onChange={e => setPForm({ ...pForm, sumInsured: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={addPolicy} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Save</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      {showForm && tab === 'claims' && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">New Claim</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect
              value={cForm.policyId}
              onChange={(id) => setCForm({ ...cForm, policyId: id })}
              placeholder="Select policy…"
              required
              options={policies.map(p => ({ id: p.id, label: `${p.policyNumber} - ${p.providerName}`, sub: p.planName }))}
            />
            <SearchableSelect
              value={cForm.admissionId}
              onChange={(id) => setCForm({ ...cForm, admissionId: id })}
              placeholder="Select admission…"
              endpoint="/admissions"
              mapOption={(a: any) => ({ id: a.id, label: a.admissionNumber, sub: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : '' })}
            />
            <select className="hms-input" value={cForm.claimType} onChange={e => setCForm({ ...cForm, claimType: e.target.value })}><option value="CASHLESS">Cashless</option><option value="REIMBURSEMENT">Reimbursement</option></select>
            <input className="hms-input" placeholder="Diagnosis Code" value={cForm.diagnosisCode} onChange={e => setCForm({ ...cForm, diagnosisCode: e.target.value })} />
            <input className="hms-input" type="number" placeholder="Total Amount *" value={cForm.totalAmount} onChange={e => setCForm({ ...cForm, totalAmount: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={addClaim} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Submit</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      {showForm && tab === 'preauth' && (
        <div className="hms-card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">New Pre-Authorization Request</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect
              value={paForm.policyId}
              onChange={(id) => setPaForm({ ...paForm, policyId: id })}
              placeholder="Select policy *"
              required
              options={policies.map(p => ({ id: p.id, label: `${p.policyNumber} - ${p.providerName}`, sub: p.planName }))}
            />
            <SearchableSelect
              value={paForm.admissionId}
              onChange={(id) => setPaForm({ ...paForm, admissionId: id })}
              placeholder="Select admission (optional)"
              endpoint="/admissions"
              mapOption={(a: any) => ({ id: a.id, label: a.admissionNumber, sub: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : '' })}
            />
            <input className="hms-input" placeholder="Diagnosis Code" value={paForm.diagnosisCode} onChange={e => setPaForm({ ...paForm, diagnosisCode: e.target.value })} />
            <input className="hms-input col-span-2" placeholder="Procedure / Treatment Planned *" value={paForm.procedure} onChange={e => setPaForm({ ...paForm, procedure: e.target.value })} />
            <input className="hms-input" type="number" placeholder="Estimated Amount (₹)" value={paForm.estimatedAmount} onChange={e => setPaForm({ ...paForm, estimatedAmount: e.target.value })} />
            <textarea className="hms-input col-span-3" rows={2} placeholder="Clinical Notes / Justification" value={paForm.clinicalNotes} onChange={e => setPaForm({ ...paForm, clinicalNotes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={addPreAuth} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Submit Request</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      )}
      <div className="hms-card overflow-hidden">
        <table className="w-full text-sm">
          {tab === 'policies' ? (
            <>
              <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
                <th className="text-left p-3 font-medium text-gray-600">Policy #</th>
                <th className="text-left p-3 font-medium text-gray-600">Provider</th>
                <th className="text-left p-3 font-medium text-gray-600">Plan</th>
                <th className="text-left p-3 font-medium text-gray-600">Sum Insured</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
              </tr></thead>
              <tbody>
                {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</> : policies.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState icon={<ShieldCheck size={24} className="text-gray-400" />} title="No insurance policies" description="Add a policy to get started" /></td></tr>
                ) : policies.slice((page - 1) * 20, page * 20).map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-teal-700">{p.policyNumber}</td>
                    <td className="p-3">{p.providerName}</td>
                    <td className="p-3">{p.planName}</td>
                    <td className="p-3">₹{p.sumInsured?.toLocaleString()}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : tab === 'claims' ? (
            <>
              <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
                <th className="text-left p-3 font-medium text-gray-600">Claim #</th>
                <th className="text-left p-3 font-medium text-gray-600">Type</th>
                <th className="text-left p-3 font-medium text-gray-600">Amount</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Actions</th>
              </tr></thead>
              <tbody>
                {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</> : claims.filter(c => c.claimType !== 'PREAUTH').length === 0 ? (
                  <tr><td colSpan={5}><EmptyState icon={<FileText size={24} className="text-gray-400" />} title="No claims filed" description="Create a claim against a policy" /></td></tr>
                ) : claims.filter(c => c.claimType !== 'PREAUTH').slice((page - 1) * 20, page * 20).map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-teal-700">{c.claimNumber}</td>
                    <td className="p-3">{c.claimType}</td>
                    <td className="p-3">₹{c.totalAmount?.toLocaleString()}</td>
                    <td className="p-3"><StatusBadge status={c.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        {c.status === 'DRAFT' && (
                          <button onClick={() => submitClaim(c.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">Submit</button>
                        )}
                        {c.status === 'SUBMITTED' && (
                          <button onClick={() => approveClaim(c.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Approve</button>
                        )}
                        <button onClick={() => handlePrintClaim(c)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                          <Printer size={11} /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
                <th className="text-left p-3 font-medium text-gray-600">Ref #</th>
                <th className="text-left p-3 font-medium text-gray-600">Policy</th>
                <th className="text-left p-3 font-medium text-gray-600">Procedure</th>
                <th className="text-left p-3 font-medium text-gray-600">Est. Amount</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Actions</th>
              </tr></thead>
              <tbody>
                {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</> : claims.filter(c => c.claimType === 'PREAUTH').length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={<ShieldCheck size={24} className="text-gray-400" />} title="No pre-authorization requests" description="Submit a pre-auth request before a planned procedure" /></td></tr>
                ) : claims.filter(c => c.claimType === 'PREAUTH').slice((page - 1) * 20, page * 20).map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-teal-700">{c.claimNumber || c.id.slice(0, 8)}</td>
                    <td className="p-3 text-gray-700">{c.policy?.policyNumber || c.policyId?.slice(0, 8)}</td>
                    <td className="p-3 text-gray-700 max-w-[200px] truncate">{c.procedure || c.diagnosisCode || '—'}</td>
                    <td className="p-3">{c.totalAmount ? `₹${Number(c.totalAmount).toLocaleString()}` : '—'}</td>
                    <td className="p-3"><StatusBadge status={c.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        {c.status === 'DRAFT' && (
                          <button onClick={() => submitClaim(c.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">Send to Insurer</button>
                        )}
                        {c.status === 'SUBMITTED' && (
                          <button onClick={() => approveClaim(c.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Mark Approved</button>
                        )}
                        <button onClick={() => handlePrintClaim(c)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                          <Printer size={11} /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
        <Pagination
          page={page}
          totalPages={Math.ceil((tab === 'policies' ? policies.length : tab === 'claims' ? claims.filter(c => c.claimType !== 'PREAUTH').length : claims.filter(c => c.claimType === 'PREAUTH').length) / 20)}
          onPageChange={setPage}
          totalItems={tab === 'policies' ? policies.length : tab === 'claims' ? claims.filter(c => c.claimType !== 'PREAUTH').length : claims.filter(c => c.claimType === 'PREAUTH').length}
          pageSize={20}
        />
      </div>

      {/* Document Upload Section */}
      {(tab === 'claims' || tab === 'preauth') && (
        <div className="hms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Paperclip size={16} className="text-gray-500" />
              <span className="text-sm font-bold text-gray-800">Claim Documents</span>
            </div>
            <button onClick={() => docInputRef.current?.click()} disabled={docUploading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Upload size={13} />
              {docUploading ? 'Uploading...' : 'Upload Document'}
            </button>
            <input ref={docInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleDocUpload} />
          </div>
          <p className="text-xs text-gray-400 mb-3">Upload insurance claim documents (PDF, images, max 10MB)</p>
          {uploadedDocs.length > 0 && (
            <div className="space-y-2">
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5">
                  <FileText size={14} className="text-teal-600 flex-shrink-0" />
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 hover:underline truncate flex-1">
                    {doc.filename}
                  </a>
                  <span className="text-xs text-gray-400">Uploaded</span>
                </div>
              ))}
            </div>
          )}
          {uploadedDocs.length === 0 && (
            <div className="text-center py-4 text-xs text-gray-400">No documents uploaded yet</div>
          )}
        </div>
      )}
    </div>
  );
}
