import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Pill, RefreshCw, ChevronDown, ChevronUp, Calendar, Hash, Printer } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

const STATUS_STYLES: Record<string, string> = {
  PENDING:          'bg-amber-100 text-amber-700',
  SENT_TO_PHARMACY: 'bg-blue-100 text-blue-700',
  DISPENSED:        'bg-green-100 text-green-700',
  CANCELLED:        'bg-red-100 text-red-700',
};

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [total, setTotal] = useState(0);
  const user = getUser();

  const fetchData = async (status = '') => {
    setLoading(true);
    try {
      const params: any = {};
      if (status) params.status = status;
      const { data } = await api.get('/auth/patient/me/prescriptions', { params });
      setPrescriptions(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load prescriptions'); setPrescriptions([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(filter); }, [filter]);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handlePrintPrescription = (rx: any) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const medRows = (rx.items || []).map((item: any, i: number) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-weight:600;">${item.drugName || '—'}${item.strength ? ` <span style="font-weight:400;color:#6b7280;">${item.strength}</span>` : ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">${item.dosage || '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">${item.frequency || '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:center;">${item.durationDays ?? '—'} days</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#6b7280;">${item.instructions || '—'}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Prescription ${rx.rxNumber}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;}h1{margin:0;font-size:22px;font-weight:900;color:#0F766E;}h2{margin:4px 0 4px;font-size:16px;font-weight:700;}h3{margin:2px 0 12px;font-size:12px;font-weight:400;color:#555;}hr{border:none;border-top:2px solid #0F766E;margin:12px 0;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:16px;}.field label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.5px;}.field span{display:block;font-size:13px;font-weight:600;margin-top:2px;}table{width:100%;border-collapse:collapse;}thead th{background:#f9fafb;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;}.note-box{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:12px;color:#92400e;margin-top:14px;}@media print{body{padding:16px;}}</style>
</head><body>
<h1>AYPHEN HMS</h1><h2>PRESCRIPTION</h2><h3>Rx</h3><hr/>
<div class="grid">
  <div class="field"><label>Rx #</label><span>${rx.rxNumber || '—'}</span></div>
  <div class="field"><label>Date Issued</label><span>${fmt(rx.issuedAt)}</span></div>
  <div class="field"><label>Patient</label><span>${user ? `${user.firstName} ${user.lastName}` : '—'}</span></div>
  <div class="field"><label>Hospital</label><span>${user?.tenantName || '—'}</span></div>
  <div class="field"><label>Status</label><span>${rx.status?.replace(/_/g, ' ') || '—'}</span></div>
  <div class="field"><label>Medications</label><span>${rx.items?.length || 0} item(s)</span></div>
</div>
<table>
  <thead><tr><th style="width:28px;">#</th><th>Drug Name</th><th style="width:80px;">Dosage</th><th style="width:100px;">Frequency</th><th style="width:80px;text-align:center;">Duration</th><th>Instructions</th></tr></thead>
  <tbody>${medRows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#9ca3af;">No medications</td></tr>'}</tbody>
</table>
${rx.notes ? `<div class="note-box"><strong>Doctor's Note:</strong> ${rx.notes}</div>` : ''}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;font-size:12px;color:#166534;margin-top:12px;">
  ✓ Take medications as prescribed &nbsp;·&nbsp; ✓ Complete the full course &nbsp;·&nbsp; ✓ Store as directed &nbsp;·&nbsp; ✓ Keep out of reach of children
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;">
  <div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Prescribing Doctor</div>
  <div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Dispensed By</div>
  <div style="border-top:2px solid #111;padding-top:8px;font-size:12px;">Date</div>
</div>
<script>window.onload=function(){window.print();}</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Prescriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} prescriptions at {user?.tenantName}</p>
        </div>
        <button onClick={() => fetchData(filter)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[['', 'All'], ['PENDING', 'Pending'], ['SENT_TO_PHARMACY', 'At Pharmacy'], ['DISPENSED', 'Dispensed']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${filter === val ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Pill size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No prescriptions found</p>
          <p className="text-gray-400 text-sm mt-1">Prescriptions issued by your doctor will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map(rx => {
            const isOpen = expanded === rx.id;
            return (
              <div key={rx.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button className="w-full text-left p-5 hover:bg-gray-50 transition-colors" onClick={() => setExpanded(isOpen ? null : rx.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Pill size={20} className="text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm flex items-center gap-1">
                            <Hash size={11} className="text-gray-400" />{rx.rxNumber}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[rx.status] || 'bg-gray-100 text-gray-600'}`}>
                            {rx.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={11} /> {fmt(rx.issuedAt)}
                          </span>
                          <span className="text-xs text-gray-500">{rx.items?.length || 0} medication(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); handlePrintPrescription(rx); }} className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium"><Printer size={11} /> Print</button>
                      {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </button>
                {isOpen && rx.items?.length > 0 && (
                  <div className="border-t border-gray-50 px-5 pb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide my-3">Medications</p>
                    <div className="space-y-2">
                      {rx.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{item.drugName}
                              {item.strength && <span className="text-gray-500 font-normal ml-1">{item.strength}</span>}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.dosage} · {item.frequency} · {item.durationDays} days
                              {item.instructions && ` · ${item.instructions}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {rx.notes && <p className="text-xs text-gray-500 mt-3 italic">Note: {rx.notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
