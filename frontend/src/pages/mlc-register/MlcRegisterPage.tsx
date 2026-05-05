import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Printer } from 'lucide-react';
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

  const handlePrintMLC = (r: any) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>MLC Certificate - ${r.mlcNumber}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; }
      .header-title { font-size: 28px; font-weight: bold; color: #0F766E; text-align: center; letter-spacing: 2px; }
      .header-sub { font-size: 16px; text-align: center; font-weight: bold; margin-top: 4px; letter-spacing: 1px; }
      .rule-double { border: none; border-top: 3px double #111; margin: 10px 0; }
      .red-banner { background: #DC2626; color: #fff; text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 1px; padding: 6px 0; margin: 12px 0; }
      .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; border: 1px solid #999; padding: 16px; margin: 16px 0; }
      .detail-item label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #555; display: block; }
      .detail-item span { font-size: 14px; color: #111; }
      .section { margin: 16px 0; }
      .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #999; padding-bottom: 4px; margin-bottom: 8px; letter-spacing: 0.5px; }
      .section-body { font-size: 14px; min-height: 48px; padding: 4px 0; }
      .sig-footer { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; text-align: center; }
      .sig-footer div { border-top: 1px solid #111; padding-top: 6px; font-size: 12px; }
      .disclaimer { margin-top: 24px; font-size: 11px; color: #555; text-align: center; font-style: italic; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <div class="header-title">AYPHEN HMS</div>
      <div class="header-sub">MEDICO-LEGAL CASE CERTIFICATE</div>
      <hr class="rule-double" />
      <hr class="rule-double" style="margin-top:2px;" />
      <div class="red-banner">MEDICO-LEGAL DOCUMENT &mdash; CONFIDENTIAL</div>
      <div class="details-grid">
        <div class="detail-item"><label>MLC #</label><span>${r.mlcNumber || '—'}</span></div>
        <div class="detail-item"><label>Date / Time</label><span>${r.dateTime ? new Date(r.dateTime).toLocaleString() : '—'}</span></div>
        <div class="detail-item"><label>Nature of Injury</label><span>${r.natureOfInjury || '—'}</span></div>
        <div class="detail-item"><label>Brought By</label><span>${r.broughtBy || '—'}</span></div>
        <div class="detail-item"><label>Police Station</label><span>${r.policeStation || '—'}</span></div>
        <div class="detail-item"><label>FIR #</label><span>${r.firNumber || '—'}</span></div>
        <div class="detail-item"><label>Police Informed</label><span>${r.informedPolice ? 'Yes' : 'No'}</span></div>
        <div class="detail-item"><label>Status</label><span>${r.status || '—'}</span></div>
      </div>
      <div class="section"><div class="section-title">History of Injury</div><div class="section-body">${r.historyOfInjury || r.injuryHistory || r.description || '—'}</div></div>
      <div class="section"><div class="section-title">Examination Findings</div><div class="section-body">${r.examinationFindings || r.findings || '—'}</div></div>
      <div class="section"><div class="section-title">Opinion</div><div class="section-body">${r.opinion || '—'}</div></div>
      <div class="sig-footer">
        <div>Examining Doctor</div>
        <div>Signature</div>
        <div>Date</div>
      </div>
      <div class="disclaimer">This certificate is issued for medico-legal purposes only.</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="MLC Register" subtitle="Medico-legal case register" />
      <div className="hms-card"><div className="overflow-x-auto"><table className="w-full"><thead className="sticky top-0 z-10"><tr>
        {['MLC #', 'Date/Time', 'Brought By', 'Nature of Injury', 'Police Station', 'FIR #', 'Police Informed', 'Status', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
      </tr></thead><tbody>
        {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
        : records.length === 0 ? <tr><td colSpan={9}><EmptyState icon={<Shield size={36} />} title="No MLC records" /></td></tr>
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
            <td className="px-4 py-3">
              <button onClick={() => handlePrintMLC(r)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded" title="Print MLC Certificate">
                <Printer size={13} /> Print
              </button>
            </td>
          </tr>))}
      </tbody></table></div>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} /></div>
    </div>
  );
}
