import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, LogIn, LogOut, Code2, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

interface MrdFile {
  id: string;
  fileNumber: string;
  currentLocation: string;
  codingComplete: boolean;
  incompleteNotes: boolean;
  icdCodes: string[];
  patient?: { name?: string; uhid?: string };
}

interface Dashboard {
  total?: number;
  checkedOut?: number;
  incomplete?: number;
  uncoded?: number;
}

export default function MrdPage() {
  const [records, setRecords] = useState<MrdFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<Dashboard>({});

  // Checkout modal state
  const [checkoutFile, setCheckoutFile] = useState<MrdFile | null>(null);
  const [checkedOutTo, setCheckedOutTo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ICD coding modal state
  const [codingFile, setCodingFile] = useState<MrdFile | null>(null);
  const [icdCodesInput, setIcdCodesInput] = useState('');
  const [codingComplete, setCodingComplete] = useState(false);
  const [codingLoading, setCodingLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, dash] = await Promise.all([
        api.get('/mrd/files', { params: { page, limit: 20 } }),
        api.get('/mrd/dashboard').catch(() => ({ data: {} })),
      ]);
      setRecords(list.data.data || []);
      setTotal(list.data.meta?.total || 0);
      setDashboard(dash.data.data || dash.data || {});
    } catch {
      toast.error('Failed to load MRD data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  // Check In — no modal
  const handleCheckIn = async (r: MrdFile) => {
    try {
      await api.patch(`/mrd/files/${r.id}/checkin`);
      toast.success('File checked in successfully');
      fetchData();
    } catch {
      toast.error('Failed to check in file');
    }
  };

  // Open checkout modal
  const openCheckout = (r: MrdFile) => {
    setCheckoutFile(r);
    setCheckedOutTo('');
    setPurpose('');
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutFile) return;
    if (!checkedOutTo.trim()) {
      toast.error('"Checked Out To" is required');
      return;
    }
    setCheckoutLoading(true);
    try {
      await api.patch(`/mrd/files/${checkoutFile.id}/checkout`, {
        checkedOutTo: checkedOutTo.trim(),
        purpose: purpose.trim(),
      });
      toast.success('File checked out successfully');
      setCheckoutFile(null);
      fetchData();
    } catch {
      toast.error('Failed to check out file');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Open ICD coding modal
  const openCoding = (r: MrdFile) => {
    setCodingFile(r);
    setIcdCodesInput(r.icdCodes?.join(', ') || '');
    setCodingComplete(r.codingComplete || false);
  };

  const handleCodingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codingFile) return;
    const icdCodes = icdCodesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setCodingLoading(true);
    try {
      await api.patch(`/mrd/files/${codingFile.id}/coding`, {
        icdCodes,
        codingComplete,
      });
      toast.success('ICD coding updated');
      setCodingFile(null);
      fetchData();
    } catch {
      toast.error('Failed to update ICD coding');
    } finally {
      setCodingLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <TopBar title="Medical Records Department" subtitle="Record file tracking and ICD coding" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Files" value={dashboard.total || 0} icon={FileText} color="#0F766E" />
        <KpiCard label="Checked Out" value={dashboard.checkedOut || 0} icon={LogOut} color="#F59E0B" />
        <KpiCard label="Incomplete Notes" value={dashboard.incomplete || 0} icon={FileText} color="#EF4444" />
        <KpiCard label="Uncoded" value={dashboard.uncoded || 0} icon={Code2} color="#3B82F6" />
      </div>

      {/* Files table */}
      <div className="hms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {['File #', 'Patient', 'Location', 'Coding Status', 'Incomplete Notes', 'ICD Codes', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonTableRow key={i} cols={7} />
                  ))}
                </>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={<FileText size={36} />} title="No medical record files" />
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-100">
                    <td className="px-4 py-3 text-sm font-semibold text-teal-700">{r.fileNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {r.patient?.name || '—'}
                      {r.patient?.uhid && (
                        <span className="ml-1 text-xs text-gray-400">({r.patient.uhid})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.currentLocation || 'RECORDS_ROOM'} />
                    </td>
                    <td className="px-4 py-3">
                      {r.codingComplete ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                          Complete
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.incompleteNotes ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Yes</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {r.icdCodes?.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.currentLocation !== 'CHECKED_OUT' && (
                          <button
                            onClick={() => openCheckout(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                            title="Check Out"
                          >
                            <LogOut size={12} />
                            Check Out
                          </button>
                        )}
                        {r.currentLocation === 'CHECKED_OUT' && (
                          <button
                            onClick={() => handleCheckIn(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            title="Check In"
                          >
                            <LogIn size={12} />
                            Check In
                          </button>
                        )}
                        <button
                          onClick={() => openCoding(r)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          title="ICD Coding"
                        >
                          <Code2 size={12} />
                          ICD Coding
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
          totalItems={total}
          pageSize={20}
        />
      </div>

      {/* Checkout Modal */}
      {checkoutFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Check Out File — {checkoutFile.fileNumber}
              </h2>
              <button
                onClick={() => setCheckoutFile(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCheckoutSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Checked Out To <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={checkedOutTo}
                  onChange={(e) => setCheckedOutTo(e.target.value)}
                  required
                  placeholder="Enter name or department"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Reason for checkout"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutFile(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {checkoutLoading ? 'Checking Out…' : 'Check Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ICD Coding Modal */}
      {codingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                ICD Coding — {codingFile.fileNumber}
              </h2>
              <button
                onClick={() => setCodingFile(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCodingSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ICD Codes (comma separated)
                </label>
                <textarea
                  value={icdCodesInput}
                  onChange={(e) => setIcdCodesInput(e.target.value)}
                  placeholder="E11, J18.9, I10"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="codingComplete"
                  type="checkbox"
                  checked={codingComplete}
                  onChange={(e) => setCodingComplete(e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="codingComplete" className="text-sm font-medium text-gray-700">
                  Mark as Coding Complete
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCodingFile(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={codingLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {codingLoading ? 'Saving…' : 'Save Coding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
