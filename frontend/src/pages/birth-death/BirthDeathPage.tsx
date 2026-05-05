import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Baby, Skull, Plus, X, Loader2, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function BirthDeathPage() {
  const [tab, setTab] = useState<'births' | 'deaths'>('births');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});

  // Birth form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ motherPatientId: '', fatherName: '', dateOfBirth: '', timeOfBirth: '', gender: 'MALE', weightGrams: '', deliveryType: 'NORMAL', apgarScore1min: '', apgarScore5min: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  // Death form
  const [showDeathForm, setShowDeathForm] = useState(false);
  const [deathForm, setDeathForm] = useState({ patientId: '', dateOfDeath: '', timeOfDeath: '', causeOfDeath: '', mannerOfDeath: 'NATURAL', postMortemRequired: false, notes: '' });

  const handlePrintCertificate = (r: any) => {
    const isBirth = r.type === 'BIRTH' || tab === 'births';
    const title = isBirth ? 'BIRTH CERTIFICATE' : 'DEATH CERTIFICATE';
    const bannerBg = isBirth ? '#f0fdf4' : '#fef2f2';
    const bannerBorder = isBirth ? '#86efac' : '#fca5a5';
    const bannerColor = isBirth ? '#15803d' : '#dc2626';
    const bannerText = isBirth
      ? 'OFFICIAL BIRTH CERTIFICATE — Registration of Births and Deaths Act'
      : 'OFFICIAL DEATH CERTIFICATE — Registration of Births and Deaths Act';
    const dateLabel = isBirth ? 'Date of Birth' : 'Date of Death';
    const dateValue = isBirth ? r.dateOfBirth : r.dateOfDeath;
    const timeValue = isBirth ? r.timeOfBirth : r.timeOfDeath;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title></head><body style="font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;max-width:800px;margin:0 auto;">
<h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1>
<h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">${title}</h2>
<hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
<div style="background:${bannerBg};border:1px solid ${bannerBorder};border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;font-weight:700;color:${bannerColor};text-align:center;letter-spacing:0.5px;">${bannerText}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:20px;font-size:13px;">
  <div><span style="color:#555;font-weight:600;">Certificate #:</span> ${r.certificateNumber || (r.id||'').slice(0,8)}</div>
  <div><span style="color:#555;font-weight:600;">${dateLabel}:</span> ${dateValue ? new Date(dateValue).toLocaleDateString() : '—'}</div>
  <div><span style="color:#555;font-weight:600;">Time:</span> ${timeValue||'—'}</div>
  <div><span style="color:#555;font-weight:600;">${isBirth ? 'Baby' : 'Patient'} Name:</span> ${r.babyName||r.patientName||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Father / Mother:</span> ${r.fatherName||'—'} / ${r.motherName||'—'}</div>
  ${isBirth ? `<div><span style="color:#555;font-weight:600;">Weight:</span> ${r.weightGrams ? r.weightGrams+'g' : '—'}</div>` : ''}
  <div><span style="color:#555;font-weight:600;">Place:</span> ${r.place||r.hospital||'Ayphen HMS Hospital'}</div>
  ${!isBirth ? `<div><span style="color:#555;font-weight:600;">Cause of Death:</span> ${r.causeOfDeath||'—'}</div>` : ''}
  <div><span style="color:#555;font-weight:600;">Doctor Name:</span> ${r.doctorName||r.certifyingDoctor||'—'}</div>
</div>
<div style="margin-bottom:16px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
  <strong>Registration Details:</strong><br/>
  Registration Number: ${r.registrationNumber||'Pending'} &nbsp;|&nbsp; Registered On: ${r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : new Date().toLocaleDateString()}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:40px;">
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Certifying Doctor</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Registrar</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Date: ${new Date().toLocaleDateString()}</div>
</div>
<script>window.onload=function(){window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get(`/vital-records/${tab}`, { params: { page, limit: 20 } }),
        api.get('/vital-records/dashboard'),
      ]);
      setRecords(list.data.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab, page]);

  const handleBirthSubmit = async () => {
    if (!form.motherPatientId || !form.dateOfBirth || !form.gender) { toast.error('Fill required fields'); return; }
    setSubmitting(true);
    try {
      const payload: any = { ...form };
      if (payload.weightGrams) payload.weightGrams = Number(payload.weightGrams);
      if (payload.apgarScore1min) payload.apgarScore1min = Number(payload.apgarScore1min);
      if (payload.apgarScore5min) payload.apgarScore5min = Number(payload.apgarScore5min);
      await api.post('/vital-records/births', payload);
      toast.success('Birth registered'); setShowForm(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDeathSubmit = async () => {
    if (!deathForm.patientId || !deathForm.dateOfDeath || !deathForm.causeOfDeath) { toast.error('Fill required fields'); return; }
    setSubmitting(true);
    try {
      await api.post('/vital-records/deaths', deathForm);
      toast.success('Death registered'); setShowDeathForm(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Birth & Death Registry" subtitle="Vital statistics registration" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Births" value={dashboard.totalBirths || 0} icon={Baby} color="#EC4899" />
        <KpiCard label="Total Deaths" value={dashboard.totalDeaths || 0} icon={Skull} color="#6B7280" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {[['births', 'Birth Registry'], ['deaths', 'Death Registry']].map(([val, label]) => (
            <button key={val} onClick={() => { setTab(val as any); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => tab === 'births' ? setShowForm(true) : setShowDeathForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Register {tab === 'births' ? 'Birth' : 'Death'}
        </button>
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {tab === 'births'
                  ? ['Date', 'Gender', 'Weight', 'Delivery', 'APGAR 1m', 'APGAR 5m', 'Birth Order', 'Cert Issued', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)
                  : ['Date', 'Cause of Death', 'Manner', 'ICD Code', 'PM Required', 'PM Done', 'Cert Issued', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)
                }
              </tr>
            </thead>
            <tbody>
              {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={tab === 'births' ? 8 : 7} />)}</>
              : records.length === 0 ? <tr><td colSpan={8}><EmptyState icon={tab === 'births' ? <Baby size={36} /> : <Skull size={36} />} title={`No ${tab} records`} description="Register records to see them here" /></td></tr>
              : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                  {tab === 'births' ? (<>
                    <td className="px-4 py-3 text-sm">{formatDate(r.dateOfBirth)}</td>
                    <td className="px-4 py-3 text-sm">{r.gender}</td>
                    <td className="px-4 py-3 text-sm">{r.weightGrams ? `${r.weightGrams}g` : '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.deliveryType}</td>
                    <td className="px-4 py-3 text-sm">{r.apgarScore1min ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.apgarScore5min ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.birthOrder}</td>
                    <td className="px-4 py-3 text-sm">{r.birthCertIssued ? '✅' : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handlePrintCertificate({ ...r, type: 'BIRTH' })}
                        className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                        <Printer size={11} /> Print
                      </button>
                    </td>
                  </>) : (<>
                    <td className="px-4 py-3 text-sm">{formatDate(r.dateOfDeath)}</td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">{r.causeOfDeath}</td>
                    <td className="px-4 py-3 text-sm">{r.mannerOfDeath}</td>
                    <td className="px-4 py-3 text-xs font-mono">{r.icdCode || '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.postMortemRequired ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm">{r.postMortemDone ? '✅' : '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.deathCertIssued ? '✅' : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handlePrintCertificate({ ...r, type: 'DEATH' })}
                        className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                        <Printer size={11} /> Print
                      </button>
                    </td>
                  </>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Birth Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Register Birth</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Mother Patient ID *</label><input className="hms-input w-full" placeholder="Patient UUID" value={form.motherPatientId} onChange={e => setForm({ ...form, motherPatientId: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Father Name</label><input className="hms-input w-full" value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date of Birth *</label><input type="date" className="hms-input w-full" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Time</label><input type="time" className="hms-input w-full" value={form.timeOfBirth} onChange={e => setForm({ ...form, timeOfBirth: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Gender *</label><select className="hms-input w-full" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>MALE</option><option>FEMALE</option><option>AMBIGUOUS</option></select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Weight (g)</label><input type="number" className="hms-input w-full" placeholder="e.g. 3200" value={form.weightGrams} onChange={e => setForm({ ...form, weightGrams: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Delivery Type</label><select className="hms-input w-full" value={form.deliveryType} onChange={e => setForm({ ...form, deliveryType: e.target.value })}>{['NORMAL', 'LSCS', 'FORCEPS', 'VACUUM', 'BREECH'].map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 1 min</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgarScore1min} onChange={e => setForm({ ...form, apgarScore1min: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 5 min</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgarScore5min} onChange={e => setForm({ ...form, apgarScore5min: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><textarea className="hms-input w-full" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleBirthSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Register Birth
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Death Form Modal */}
      {showDeathForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Register Death</h2>
              <button onClick={() => setShowDeathForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID *</label><input className="hms-input w-full" placeholder="Patient UUID" value={deathForm.patientId} onChange={e => setDeathForm({ ...deathForm, patientId: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date of Death *</label><input type="date" className="hms-input w-full" value={deathForm.dateOfDeath} onChange={e => setDeathForm({ ...deathForm, dateOfDeath: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Time</label><input type="time" className="hms-input w-full" value={deathForm.timeOfDeath} onChange={e => setDeathForm({ ...deathForm, timeOfDeath: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Cause of Death *</label><textarea className="hms-input w-full" rows={2} value={deathForm.causeOfDeath} onChange={e => setDeathForm({ ...deathForm, causeOfDeath: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Manner</label><select className="hms-input w-full" value={deathForm.mannerOfDeath} onChange={e => setDeathForm({ ...deathForm, mannerOfDeath: e.target.value })}>{['NATURAL', 'ACCIDENT', 'SUICIDE', 'HOMICIDE', 'UNDETERMINED'].map(m => <option key={m}>{m}</option>)}</select></div>
                <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer pb-2"><input type="checkbox" checked={deathForm.postMortemRequired} onChange={e => setDeathForm({ ...deathForm, postMortemRequired: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm">Post-mortem required</span></label></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowDeathForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleDeathSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Register Death
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
