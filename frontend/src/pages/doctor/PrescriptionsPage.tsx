import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pill, Send, Clock, CheckCircle, Search, X, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const EMPTY_ITEM = { drugName: '', dosage: '', frequency: 'OD', durationDays: 7, route: 'ORAL', instructions: '' };

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [rxList, setRxList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', consultationId: '', prescriptionType: 'OPD', items: [{ ...EMPTY_ITEM }] });

  // Patient search state
  const [patSearch, setPatSearch]     = useState('');
  const [patResults, setPatResults]   = useState<any[]>([]);
  const [selectedPat, setSelectedPat] = useState<any>(null);
  const [patLoading, setPatLoading]   = useState(false);

  useEffect(() => {
    if (!patSearch.trim()) { setPatResults([]); return; }
    const t = setTimeout(async () => {
      setPatLoading(true);
      try {
        const { data } = await api.get('/patients', { params: { q: patSearch, limit: 8 } });
        setPatResults(data.data || []);
      } catch (err) { toast.error('Failed to search patients'); } finally { setPatLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [patSearch]);

  const fetchRx = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/prescriptions', { params: { limit: 50 } });
      setRxList(data.data || []);
    } catch (err) { toast.error('Failed to load prescriptions'); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRx();
    // Auto-open form if navigated from consultation page
    const urlPatientId = searchParams.get('patientId');
    const urlConsultationId = searchParams.get('consultationId');
    if (urlPatientId) {
      setForm(f => ({ ...f, patientId: urlPatientId, consultationId: urlConsultationId || '' }));
      // Fetch patient name to display in search box
      api.get(`/patients/${urlPatientId}`).then(r => {
        setSelectedPat(r.data);
        setShowForm(true);
      }).catch((err) => { console.error('Failed to fetch patient details:', err); });
    }
  }, []);

  const sent = rxList.filter(r => r.status === 'SENT_TO_PHARMACY').length;
  const dispensed = rxList.filter(r => r.status === 'DISPENSED').length;
  const draft = rxList.filter(r => r.status === 'DRAFT').length;

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { drugName: '', dosage: '', frequency: '', durationDays: 7, route: 'ORAL', instructions: '' }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, key: string, val: string | number) => setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { toast.error('Please select a patient'); return; }
    try {
      await api.post('/prescriptions', { ...form, items: form.items.map(it => ({ ...it, durationDays: Number(it.durationDays) })) });
      setShowForm(false);
      setForm({ patientId: '', consultationId: '', prescriptionType: 'OPD', items: [{ ...EMPTY_ITEM }] });
      setSelectedPat(null); setPatSearch('');
      fetchRx();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save prescription'); }
  };

  const sendToPharmacy = async (id: string) => {
    await api.post(`/prescriptions/${id}/send-pharmacy`);
    fetchRx();
  };

  const handlePrintRx = (rx: any) => {
    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) return;
    const itemRows = (rx.items || []).map((it: any, i: number) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${it.drugName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${it.dosage || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${it.frequency || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${it.route || 'ORAL'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${it.durationDays || '—'} days</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${it.instructions || '—'}</td>
      </tr>`
    ).join('');
    const orgName = user?.tenantName || 'Hospital';
    const orgContact = [user?.tenantPrimaryPhone, user?.tenantPrimaryEmail].filter(Boolean).join(' · ');
    const orgLogoImg = user?.tenantLogoUrl ? `<img src="${user.tenantLogoUrl}" alt="${orgName}" style="height:40px;max-width:160px;object-fit:contain;margin-bottom:4px" />` : '';
    const html = `<!DOCTYPE html><html><head><title>Prescription — ${rx.prescriptionNumber}</title>
      <style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:40px;color:#1f2937}
      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f766e;padding-bottom:16px;margin-bottom:24px}
      .logo{font-size:20px;font-weight:700;color:#0f766e}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f9fafb;text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
      .info-item{font-size:13px}.info-label{color:#6b7280;font-size:11px;margin-bottom:2px}
      .footer{margin-top:48px;text-align:right;font-size:13px;color:#6b7280}
      @media print{body{padding:20px}}</style></head>
      <body>
        <div class="header">
          <div>${orgLogoImg}<div class="logo">${orgName}</div>${orgContact ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${orgContact}</div>` : ''}</div>
          <div style="text-align:right;font-size:13px;color:#6b7280">
            <div style="font-weight:600;color:#1f2937">${rx.prescriptionNumber}</div>
            <div>${new Date(rx.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
        </div>
        <h2 style="text-align:center;margin:0 0 20px;font-size:16px;color:#0f766e">PRESCRIPTION</h2>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Patient</div><strong>${rx.patient?.firstName || ''} ${rx.patient?.lastName || ''}</strong> (${rx.patient?.patientId || '—'})</div>
          <div class="info-item"><div class="info-label">Doctor</div><strong>${rx.doctor ? 'Dr. ' + rx.doctor.firstName + ' ' + (rx.doctor.lastName || '') : '—'}</strong></div>
          <div class="info-item"><div class="info-label">Type</div>${rx.prescriptionType}</div>
          <div class="info-item"><div class="info-label">Status</div>${rx.status?.replace(/_/g, ' ')}</div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Drug</th><th>Dosage</th><th>Frequency</th><th>Route</th><th>Duration</th><th>Instructions</th></tr></thead>
          <tbody>${itemRows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#9ca3af">No medications</td></tr>'}</tbody>
        </table>
        <div class="footer">
          <div style="margin-bottom:40px">Doctor's Signature</div>
          <div>_________________________</div>
        </div>
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Prescriptions" subtitle="Write and manage patient prescriptions"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Pill size={15} /> New Prescription
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total" value={rxList.length} icon={Pill} color="#0F766E" />
        <KpiCard label="Draft" value={draft} icon={Clock} color="#F59E0B" />
        <KpiCard label="Sent to Pharmacy" value={sent} icon={Send} color="#3B82F6" />
        <KpiCard label="Dispensed" value={dispensed} icon={CheckCircle} color="#10B981" />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-4">
            <h3 className="text-lg font-bold mb-4">New Prescription</h3>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Patient <span className="text-red-500">*</span></label>
                  {selectedPat ? (
                    <div className="flex items-center justify-between p-2.5 bg-teal-50 rounded-lg">
                      <span className="text-sm font-medium text-teal-800">{selectedPat.firstName} {selectedPat.lastName} — {selectedPat.patientId}</span>
                      <button type="button" onClick={() => { setSelectedPat(null); setForm(f => ({ ...f, patientId: '' })); }} className="text-teal-500 hover:text-red-500"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={patSearch} onChange={e => setPatSearch(e.target.value)}
                        placeholder="Search patient by name or ID…"
                        className="w-full pl-8 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      {patResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {patLoading ? <div className="p-2 text-xs text-gray-400">Searching…</div> : patResults.map(p => (
                            <button key={p.id} type="button"
                              onClick={() => { setSelectedPat(p); setForm(f => ({ ...f, patientId: p.id })); setPatSearch(''); setPatResults([]); }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                              <span className="font-medium">{p.firstName} {p.lastName}</span>
                              <span className="text-gray-400 ml-2 text-xs">{p.patientId}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={form.prescriptionType} onChange={e => setForm(f=>({...f,prescriptionType:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['OPD','IPD','EMERGENCY'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800 text-sm">Medications</h4>
                  <button type="button" onClick={addItem} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">+ Add Drug</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Drug Name</label>
                        <input required value={item.drugName} onChange={e => updateItem(i,'drugName',e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Paracetamol 500mg" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
                        <input required value={item.dosage} onChange={e => updateItem(i,'dosage',e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="1 tab" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                        <select value={item.frequency} onChange={e => updateItem(i,'frequency',e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          {['OD','BD','TDS','QID','SOS','STAT','ON','HS'].map(f => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Route</label>
                        <select value={item.route} onChange={e => updateItem(i,'route',e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          {['ORAL','IV','IM','SC','TOPICAL','INHALATION','SUBLINGUAL'].map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
                        <input type="number" min="1" value={item.durationDays} onChange={e => updateItem(i,'durationDays',Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      </div>
                    </div>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm rounded-lg text-white font-medium" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>Save Prescription</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Prescription List</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Rx #','Patient','Doctor','Type','Date','Items','Status','Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
              ) : rxList.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <Pill size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No prescriptions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "New Prescription" to create one</p>
                </td></tr>
              ) : rxList.map(rx => (
                <tr key={rx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-teal-700">{rx.prescriptionNumber}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{rx.patient?.firstName} {rx.patient?.lastName}</div>
                    <div className="text-xs text-gray-400">{rx.patient?.patientId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rx.doctor ? `Dr. ${rx.doctor.firstName}` : '—'}</td>
                  <td className="px-4 py-3 text-xs"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{rx.prescriptionType}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(rx.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rx.items?.length || 0} drugs</td>
                  <td className="px-4 py-3"><StatusBadge status={rx.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {rx.status === 'DRAFT' && (
                        <button onClick={() => sendToPharmacy(rx.id)}
                          className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">
                          Send to Pharmacy
                        </button>
                      )}
                      <button onClick={() => handlePrintRx(rx)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">
                        <Printer size={11} /> Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
