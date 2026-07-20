import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Baby, Plus, X, Loader2, Printer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function NicuPage() {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', gestationalWeeks: '', birthWeightGrams: '', apgar1min: '', apgar5min: '', diagnosis: '', feedType: 'BREAST', ventilatorSupport: 'NONE' });
  const [submitting, setSubmitting] = useState(false);
  const [vitalsAdmission, setVitalsAdmission] = useState<any>(null);
  const [vitalsData, setVitalsData] = useState<any[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [dailyAdmission, setDailyAdmission] = useState<any>(null);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [dailySubmitting, setDailySubmitting] = useState(false);
  const [dailyForm, setDailyForm] = useState({ weightGrams: '', feedType: 'BREAST', feedVolumeMl: '', feedFrequency: '', urineOutput: '', stoolCount: '', bilirubinLevel: '', phototherapy: false, oxygenSupport: '', temperature: '', heartRate: '', spo2: '', apneaEpisodes: '', notes: '' });

  const fetchData = async () => { setLoading(true); try { const [list, dash] = await Promise.all([api.get('/nicu', { params: { page, limit: 20 } }), api.get('/nicu/dashboard')]); setAdmissions(list.data.data || []); setTotal(list.data.meta?.total || 0); setDashboard(dash.data.data || dash.data || {}); } catch { toast.error('Failed'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, [page]);

  const handleSubmit = async () => { if (!form.patientId) { toast.error('Patient ID required'); return; } setSubmitting(true); try { await api.post('/nicu', { ...form, gestationalWeeks: form.gestationalWeeks ? Number(form.gestationalWeeks) : undefined, birthWeightGrams: form.birthWeightGrams ? Number(form.birthWeightGrams) : undefined, apgar1min: form.apgar1min ? Number(form.apgar1min) : undefined, apgar5min: form.apgar5min ? Number(form.apgar5min) : undefined }); toast.success('NICU admission created'); setShowForm(false); fetchData(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); } };

  const handlePrintNicuSummary = (a: any) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>NICU Admission Summary</title></head><body style="font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;max-width:800px;margin:0 auto;">
<h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1>
<h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">NICU ADMISSION SUMMARY</h2>
<hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
<div style="background:#fdf2f8;border:1px solid #f9a8d4;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;font-weight:700;color:#9d174d;text-align:center;letter-spacing:0.5px;">NEONATAL INTENSIVE CARE UNIT — CONFIDENTIAL</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:20px;font-size:13px;">
  <div><span style="color:#555;font-weight:600;">Admission #:</span> ${(a.id||'').slice(0,8)}</div>
  <div><span style="color:#555;font-weight:600;">Admission Date:</span> ${a.admissionDate ? new Date(a.admissionDate).toLocaleDateString() : '—'}</div>
  <div><span style="color:#555;font-weight:600;">Gestational Age:</span> ${a.gestationalWeeks ? a.gestationalWeeks+' weeks' : '—'}</div>
  <div><span style="color:#555;font-weight:600;">Birth Weight:</span> ${a.birthWeightGrams ? a.birthWeightGrams+' g' : '—'}</div>
  <div><span style="color:#555;font-weight:600;">APGAR 1 min:</span> ${a.apgar1min ?? '—'}</div>
  <div><span style="color:#555;font-weight:600;">APGAR 5 min:</span> ${a.apgar5min ?? '—'}</div>
  <div><span style="color:#555;font-weight:600;">Feed Type:</span> ${a.feedType||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Ventilator Support:</span> ${a.ventilatorSupport||'NONE'}</div>
  <div><span style="color:#555;font-weight:600;">Diagnosis:</span> ${a.diagnosis||'—'}</div>
  <div><span style="color:#555;font-weight:600;">Status:</span> ${a.status||'—'}</div>
</div>
${a.carePlan ? `<div style="margin-bottom:16px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;"><strong>Care Plan:</strong><br/>${a.carePlan}</div>` : ''}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:40px;">
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Neonatologist</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">NICU Nurse</div>
  <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;">Date: ${new Date().toLocaleDateString()}</div>
</div>
<script>window.onload=function(){window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const fetchVitals = async (admissionId: string) => {
    setVitalsLoading(true);
    try {
      const { data } = await api.get(`/nicu/${admissionId}/vitals`);
      const raw = data.data || data || [];
      setVitalsData(raw.slice(-20).map((v: any) => ({
        time: v.recordedAt ? new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        hr: v.heartRate,
        spo2: v.spo2,
        temp: v.temperature,
        rr: v.respiratoryRate,
      })));
    } catch {
      setVitalsData([]);
    } finally {
      setVitalsLoading(false);
    }
  };

  const fetchDailyRecords = async (admissionId: string) => {
    setDailyLoading(true);
    try {
      const { data } = await api.get(`/nicu/${admissionId}/daily-records`);
      setDailyRecords(data.data || data || []);
    } catch {
      setDailyRecords([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const openDailyRecords = (a: any) => { setDailyAdmission(a); setShowDailyForm(false); fetchDailyRecords(a.id); };

  const handleAddDaily = async () => {
    if (!dailyAdmission) return;
    setDailySubmitting(true);
    try {
      await api.post(`/nicu/${dailyAdmission.id}/daily-records`, {
        weightGrams: dailyForm.weightGrams ? Number(dailyForm.weightGrams) : undefined,
        feedType: dailyForm.feedType || undefined,
        feedVolumeMl: dailyForm.feedVolumeMl ? Number(dailyForm.feedVolumeMl) : undefined,
        feedFrequency: dailyForm.feedFrequency || undefined,
        urineOutput: dailyForm.urineOutput ? Number(dailyForm.urineOutput) : undefined,
        stoolCount: dailyForm.stoolCount ? Number(dailyForm.stoolCount) : undefined,
        bilirubinLevel: dailyForm.bilirubinLevel ? Number(dailyForm.bilirubinLevel) : undefined,
        phototherapy: dailyForm.phototherapy,
        oxygenSupport: dailyForm.oxygenSupport || undefined,
        temperature: dailyForm.temperature ? Number(dailyForm.temperature) : undefined,
        heartRate: dailyForm.heartRate ? Number(dailyForm.heartRate) : undefined,
        spo2: dailyForm.spo2 ? Number(dailyForm.spo2) : undefined,
        apneaEpisodes: dailyForm.apneaEpisodes ? Number(dailyForm.apneaEpisodes) : undefined,
        notes: dailyForm.notes || undefined,
      });
      toast.success('Daily record added');
      setShowDailyForm(false);
      setDailyForm({ weightGrams: '', feedType: 'BREAST', feedVolumeMl: '', feedFrequency: '', urineOutput: '', stoolCount: '', bilirubinLevel: '', phototherapy: false, oxygenSupport: '', temperature: '', heartRate: '', spo2: '', apneaEpisodes: '', notes: '' });
      fetchDailyRecords(dailyAdmission.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setDailySubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="NICU — Neonatal ICU" subtitle="Neonatal intensive care management" actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Admission</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active" value={dashboard.active || 0} icon={Baby} color="#EC4899" />
        <KpiCard label="Total" value={dashboard.total || 0} icon={Baby} color="#3B82F6" />
        <KpiCard label="Discharged" value={dashboard.discharged || 0} icon={Baby} color="#10B981" />
      </div>
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['Admitted', 'Gest. Weeks', 'Birth Wt', 'APGAR 1/5', 'Feed', 'Ventilator', 'Status', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
        : admissions.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<Baby size={36} />} title="No NICU admissions" /></td></tr>
        : admissions.map(a => (
          <tr key={a.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-3 text-sm">{formatDate(a.admissionDate)}</td>
            <td className="px-4 py-3 text-sm font-medium">{a.gestationalWeeks ? `${a.gestationalWeeks}w` : '—'}</td>
            <td className="px-4 py-3 text-sm font-medium">{a.birthWeightGrams ? `${a.birthWeightGrams}g` : '—'}</td>
            <td className="px-4 py-3 text-sm">{a.apgar1min ?? '—'}/{a.apgar5min ?? '—'}</td>
            <td className="px-4 py-3 text-xs">{a.feedType || '—'}</td>
            <td className="px-4 py-3"><StatusBadge status={a.ventilatorSupport || 'NONE'} /></td>
            <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setVitalsAdmission(a); fetchVitals(a.id); }}
                  className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">
                  Vitals
                </button>
                <button onClick={() => openDailyRecords(a)}
                  className="text-xs px-2 py-1 bg-pink-50 text-pink-700 rounded-md hover:bg-pink-100 font-medium">
                  Records
                </button>
                <button onClick={() => handlePrintNicuSummary(a)}
                  className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1">
                  <Printer size={11} /> Print
                </button>
              </div>
            </td>
          </tr>))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
      {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">NICU Admission</h2><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button></div><div className="p-6 space-y-4">
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Patient *</label><SearchableSelect value={form.patientId} onChange={(id) => setForm({ ...form, patientId: id })} placeholder="Search patient…" endpoint="/patients" searchParam="q" mapOption={(p: any) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.patientId })} /></div>
        <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">Gest. Weeks</label><input type="number" className="hms-input w-full" value={form.gestationalWeeks} onChange={e => setForm({ ...form, gestationalWeeks: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Birth Wt (g)</label><input type="number" className="hms-input w-full" value={form.birthWeightGrams} onChange={e => setForm({ ...form, birthWeightGrams: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Feed Type</label><select className="hms-input w-full" value={form.feedType} onChange={e => setForm({ ...form, feedType: e.target.value })}>{['BREAST', 'FORMULA', 'NGT', 'TPN', 'MIXED'].map(t => <option key={t}>{t}</option>)}</select></div></div>
        <div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 1m</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgar1min} onChange={e => setForm({ ...form, apgar1min: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">APGAR 5m</label><input type="number" min="0" max="10" className="hms-input w-full" value={form.apgar5min} onChange={e => setForm({ ...form, apgar5min: e.target.value })} /></div><div><label className="block text-xs font-semibold text-gray-600 mb-1">Ventilator</label><select className="hms-input w-full" value={form.ventilatorSupport} onChange={e => setForm({ ...form, ventilatorSupport: e.target.value })}>{['NONE', 'CPAP', 'HFNC', 'MECHANICAL'].map(v => <option key={v}>{v}</option>)}</select></div></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Diagnosis</label><input className="hms-input w-full" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
      </div><div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">{submitting && <Loader2 size={14} className="animate-spin" />} Admit</button></div></div></div>)}
      {vitalsAdmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Baby Vitals — Admitted {vitalsAdmission.admissionDate ? new Date(vitalsAdmission.admissionDate).toLocaleDateString() : ''}</h2>
              <button onClick={() => setVitalsAdmission(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              {vitalsLoading ? (
                <div className="h-48 flex items-center justify-center text-gray-400">Loading vitals...</div>
              ) : vitalsData.length < 2 ? (
                <div className="h-48 flex items-center justify-center text-gray-400">No vitals data recorded yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={vitalsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="hr" stroke="#ef4444" name="Heart Rate" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="spo2" stroke="#3b82f6" name="SpO2" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="temp" stroke="#10b981" name="Temp (°C)" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="rr" stroke="#f97316" name="Resp Rate" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
      {dailyAdmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">Daily Records{dailyAdmission.admissionDate ? ` — Admitted ${new Date(dailyAdmission.admissionDate).toLocaleDateString()}` : ''}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDailyForm(v => !v)} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm"><Plus size={14} /> Add Record</button>
                <button onClick={() => { setDailyAdmission(null); setShowDailyForm(false); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {showDailyForm && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Weight (g)</label><input type="number" className="hms-input w-full" value={dailyForm.weightGrams} onChange={e => setDailyForm({ ...dailyForm, weightGrams: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Feed Type</label><select className="hms-input w-full" value={dailyForm.feedType} onChange={e => setDailyForm({ ...dailyForm, feedType: e.target.value })}>{['BREAST', 'FORMULA', 'NGT', 'TPN', 'MIXED'].map(t => <option key={t}>{t}</option>)}</select></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Feed Vol (ml)</label><input type="number" step="0.1" className="hms-input w-full" value={dailyForm.feedVolumeMl} onChange={e => setDailyForm({ ...dailyForm, feedVolumeMl: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Feed Freq</label><input className="hms-input w-full" placeholder="e.g. 3-hourly" value={dailyForm.feedFrequency} onChange={e => setDailyForm({ ...dailyForm, feedFrequency: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Temp (°C)</label><input type="number" step="0.1" className="hms-input w-full" value={dailyForm.temperature} onChange={e => setDailyForm({ ...dailyForm, temperature: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Heart Rate</label><input type="number" className="hms-input w-full" value={dailyForm.heartRate} onChange={e => setDailyForm({ ...dailyForm, heartRate: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">SpO2 (%)</label><input type="number" min="0" max="100" className="hms-input w-full" value={dailyForm.spo2} onChange={e => setDailyForm({ ...dailyForm, spo2: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Bilirubin</label><input type="number" step="0.1" className="hms-input w-full" value={dailyForm.bilirubinLevel} onChange={e => setDailyForm({ ...dailyForm, bilirubinLevel: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">O2 Support</label><input className="hms-input w-full" placeholder="e.g. RA, CPAP" value={dailyForm.oxygenSupport} onChange={e => setDailyForm({ ...dailyForm, oxygenSupport: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Urine (ml)</label><input type="number" className="hms-input w-full" value={dailyForm.urineOutput} onChange={e => setDailyForm({ ...dailyForm, urineOutput: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Stool Count</label><input type="number" className="hms-input w-full" value={dailyForm.stoolCount} onChange={e => setDailyForm({ ...dailyForm, stoolCount: e.target.value })} /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Apnea Ep.</label><input type="number" className="hms-input w-full" value={dailyForm.apneaEpisodes} onChange={e => setDailyForm({ ...dailyForm, apneaEpisodes: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center gap-2"><input id="daily-photo" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-pink-600" checked={dailyForm.phototherapy} onChange={e => setDailyForm({ ...dailyForm, phototherapy: e.target.checked })} /><label htmlFor="daily-photo" className="text-xs font-semibold text-gray-600">Phototherapy</label></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label><textarea rows={2} className="hms-input w-full" value={dailyForm.notes} onChange={e => setDailyForm({ ...dailyForm, notes: e.target.value })} /></div>
                  <div className="flex justify-end gap-3"><button onClick={() => setShowDailyForm(false)} className="btn-secondary px-4 py-2">Cancel</button><button onClick={handleAddDaily} disabled={dailySubmitting} className="btn-primary flex items-center gap-2 px-4 py-2">{dailySubmitting && <Loader2 size={14} className="animate-spin" />} Save Record</button></div>
                </div>
              )}
              {dailyLoading ? (
                <div className="h-32 flex items-center justify-center text-gray-400">Loading records...</div>
              ) : dailyRecords.length === 0 ? (
                <EmptyState icon={<Baby size={36} />} title="No daily records yet" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr>
                      {['Date', 'Wt (g)', 'Feed', 'Vol (ml)', 'Temp', 'HR', 'SpO2', 'Bili', 'Photo', 'O2', 'Apnea', 'Notes'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 text-left bg-gray-50 whitespace-nowrap">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {dailyRecords.map(r => (
                        <tr key={r.id} className="border-t border-gray-50 text-sm">
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.recordDate)}</td>
                          <td className="px-3 py-2 font-medium">{r.weightGrams ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{r.feedType || '—'}</td>
                          <td className="px-3 py-2">{r.feedVolumeMl ?? '—'}</td>
                          <td className="px-3 py-2">{r.temperature ?? '—'}</td>
                          <td className="px-3 py-2">{r.heartRate ?? '—'}</td>
                          <td className="px-3 py-2">{r.spo2 ?? '—'}</td>
                          <td className="px-3 py-2">{r.bilirubinLevel ?? '—'}</td>
                          <td className="px-3 py-2">{r.phototherapy ? <StatusBadge status="ON" /> : '—'}</td>
                          <td className="px-3 py-2 text-xs">{r.oxygenSupport || '—'}</td>
                          <td className="px-3 py-2">{r.apneaEpisodes ?? '—'}</td>
                          <td className="px-3 py-2 text-xs max-w-[160px] truncate" title={r.notes || ''}>{r.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
