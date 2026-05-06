import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Shield, Printer, Plus, X, Loader2, Search, Eye } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/format';

const BLANK_FORM = {
  patientId: '', broughtBy: 'POLICE', natureOfInjury: '', policeStation: '',
  firNumber: '', informedPolice: false, historyOfInjury: '', examinationFindings: '',
  opinion: '', status: 'OPEN',
};

export default function MlcRegisterPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [form, setForm] = useState<any>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [viewRecord, setViewRecord] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/mlc', {
        params: { page, limit: 20, q: search || undefined, status: statusFilter || undefined },
      });
      setRecords(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch { toast.error('Failed to load MLC records'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditRecord(null); setForm(BLANK_FORM); setShowForm(true); };
  const openEdit = (r: any) => {
    setEditRecord(r);
    setForm({
      patientId: r.patientId || '',
      broughtBy: r.broughtBy || 'POLICE',
      natureOfInjury: r.natureOfInjury || '',
      policeStation: r.policeStation || '',
      firNumber: r.firNumber || '',
      informedPolice: !!r.informedPolice,
      historyOfInjury: r.historyOfInjury || r.injuryHistory || '',
      examinationFindings: r.examinationFindings || r.findings || '',
      opinion: r.opinion || '',
      status: r.status || 'OPEN',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.natureOfInjury.trim()) { toast.error('Nature of injury required'); return; }
    setSubmitting(true);
    try {
      if (editRecord) {
        await api.patch(`/mlc/${editRecord.id}`, form);
        toast.success('MLC record updated');
      } else {
        await api.post('/mlc', form);
        toast.success('MLC case registered');
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const sf = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handlePrintMLC = (r: any) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>MLC Certificate - ${r.mlcNumber}</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Times New Roman',serif;padding:40px;color:#111;}
      .header-title{font-size:28px;font-weight:bold;color:#0F766E;text-align:center;letter-spacing:2px;}
      .header-sub{font-size:16px;text-align:center;font-weight:bold;margin-top:4px;letter-spacing:1px;}
      .rule-double{border:none;border-top:3px double #111;margin:10px 0;}
      .red-banner{background:#DC2626;color:#fff;text-align:center;font-size:13px;font-weight:bold;letter-spacing:1px;padding:6px 0;margin:12px 0;}
      .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;border:1px solid #999;padding:16px;margin:16px 0;}
      .detail-item label{font-size:11px;font-weight:bold;text-transform:uppercase;color:#555;display:block;}
      .detail-item span{font-size:14px;color:#111;}
      .section{margin:16px 0;}.section-title{font-size:13px;font-weight:bold;text-transform:uppercase;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px;letter-spacing:0.5px;}
      .section-body{font-size:14px;min-height:48px;padding:4px 0;}
      .sig-footer{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:48px;text-align:center;}
      .sig-footer div{border-top:1px solid #111;padding-top:6px;font-size:12px;}
      .disclaimer{margin-top:24px;font-size:11px;color:#555;text-align:center;font-style:italic;}
      @media print{body{padding:20px;}}
    </style></head><body>
      <div class="header-title">AYPHEN HMS</div>
      <div class="header-sub">MEDICO-LEGAL CASE CERTIFICATE</div>
      <hr class="rule-double"/><hr class="rule-double" style="margin-top:2px;"/>
      <div class="red-banner">MEDICO-LEGAL DOCUMENT &mdash; CONFIDENTIAL</div>
      <div class="details-grid">
        <div class="detail-item"><label>MLC #</label><span>${r.mlcNumber || '—'}</span></div>
        <div class="detail-item"><label>Date / Time</label><span>${r.dateTime ? new Date(r.dateTime).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</span></div>
        <div class="detail-item"><label>Nature of Injury</label><span>${r.natureOfInjury || '—'}</span></div>
        <div class="detail-item"><label>Brought By</label><span>${r.broughtBy || '—'}</span></div>
        <div class="detail-item"><label>Police Station</label><span>${r.policeStation || '—'}</span></div>
        <div class="detail-item"><label>FIR #</label><span>${r.firNumber || '—'}</span></div>
        <div class="detail-item"><label>Police Informed</label><span>${r.informedPolice ? 'Yes' : 'No'}</span></div>
        <div class="detail-item"><label>Status</label><span>${r.status || '—'}</span></div>
      </div>
      <div class="section"><div class="section-title">History of Injury</div><div class="section-body">${r.historyOfInjury || r.injuryHistory || '—'}</div></div>
      <div class="section"><div class="section-title">Examination Findings</div><div class="section-body">${r.examinationFindings || r.findings || '—'}</div></div>
      <div class="section"><div class="section-title">Opinion</div><div class="section-body">${r.opinion || '—'}</div></div>
      <div class="sig-footer"><div>Examining Doctor</div><div>Signature</div><div>Date</div></div>
      <div class="disclaimer">This certificate is issued for medico-legal purposes only.</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="MLC Register" subtitle="Medico-legal case register"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} /> Register MLC</button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search MLC # or injury..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        {['', 'OPEN', 'CLOSED', 'PENDING_POLICE'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === s ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>{['MLC #', 'Date/Time', 'Brought By', 'Nature of Injury', 'Police Station', 'FIR #', 'Police Informed', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)
                : records.length === 0
                  ? <tr><td colSpan={9}><EmptyState icon={<Shield size={36} />} title="No MLC records" description="Register a medico-legal case to get started" /></td></tr>
                  : records.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-red-700 font-mono">{r.mlcNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDateTime(r.dateTime || r.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.broughtBy || '—'}</td>
                      <td className="px-4 py-3 text-sm max-w-[180px] truncate" title={r.natureOfInjury}>{r.natureOfInjury}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.policeStation || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{r.firNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${r.informedPolice ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.informedPolice ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewRecord(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium flex items-center gap-1"><Eye size={11} /> View</button>
                          <button onClick={() => openEdit(r)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Edit</button>
                          <button onClick={() => handlePrintMLC(r)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Shield size={18} className="text-red-500" />
                {editRecord ? 'Edit MLC Record' : 'Register MLC Case'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID</label>
                  <input className="hms-input w-full" placeholder="Patient ID (optional)" value={form.patientId} onChange={e => sf('patientId', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Brought By</label>
                  <select className="hms-input w-full" value={form.broughtBy} onChange={e => sf('broughtBy', e.target.value)}>
                    {['POLICE', 'SELF', 'FAMILY', 'AMBULANCE', 'REFERRED'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nature of Injury *</label>
                <input className="hms-input w-full" placeholder="e.g. Road traffic accident, assault, fall..." value={form.natureOfInjury} onChange={e => sf('natureOfInjury', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Police Station</label>
                  <input className="hms-input w-full" value={form.policeStation} onChange={e => sf('policeStation', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">FIR Number</label>
                  <input className="hms-input w-full" value={form.firNumber} onChange={e => sf('firNumber', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select className="hms-input w-full" value={form.status} onChange={e => sf('status', e.target.value)}>
                    {['OPEN', 'PENDING_POLICE', 'CLOSED'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input type="checkbox" id="informedPolice" checked={form.informedPolice} onChange={e => sf('informedPolice', e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
                  <label htmlFor="informedPolice" className="text-sm font-medium text-gray-700">Police Informed</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">History of Injury</label>
                <textarea className="hms-input w-full" rows={3} placeholder="Detailed history of how injury occurred..." value={form.historyOfInjury} onChange={e => sf('historyOfInjury', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Examination Findings</label>
                <textarea className="hms-input w-full" rows={3} placeholder="Clinical examination findings..." value={form.examinationFindings} onChange={e => sf('examinationFindings', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Opinion / Remarks</label>
                <textarea className="hms-input w-full" rows={2} placeholder="Medical opinion..." value={form.opinion} onChange={e => sf('opinion', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editRecord ? 'Save Changes' : 'Register Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl sm:rounded-r-none w-full sm:w-[520px] h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Shield size={16} className="text-red-500" /> {viewRecord.mlcNumber}
                </h2>
                <p className="text-xs text-gray-400">{formatDateTime(viewRecord.dateTime || viewRecord.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { openEdit(viewRecord); setViewRecord(null); }} className="text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium">Edit</button>
                <button onClick={() => handlePrintMLC(viewRecord)} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} /> Print</button>
                <button onClick={() => setViewRecord(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between">
                <StatusBadge status={viewRecord.status} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${viewRecord.informedPolice ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Police Informed: {viewRecord.informedPolice ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-gray-400">Brought By</span><p className="font-medium">{viewRecord.broughtBy || '—'}</p></div>
                <div><span className="text-xs text-gray-400">Nature of Injury</span><p className="font-medium">{viewRecord.natureOfInjury || '—'}</p></div>
                <div><span className="text-xs text-gray-400">Police Station</span><p className="font-medium">{viewRecord.policeStation || '—'}</p></div>
                <div><span className="text-xs text-gray-400">FIR Number</span><p className="font-medium font-mono">{viewRecord.firNumber || '—'}</p></div>
              </div>
              {viewRecord.historyOfInjury && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">History of Injury</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{viewRecord.historyOfInjury}</p>
                </div>
              )}
              {viewRecord.examinationFindings && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Examination Findings</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{viewRecord.examinationFindings}</p>
                </div>
              )}
              {viewRecord.opinion && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Opinion</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{viewRecord.opinion}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
