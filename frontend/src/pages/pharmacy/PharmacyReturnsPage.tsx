import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RotateCcw, Clock, CheckCircle, XCircle, Plus, Search, X } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../lib/api';

interface PharmacyReturn {
  id: string;
  returnNumber: string;
  source: string;
  drugName: string;
  batchNumber?: string;
  quantityReturned: number;
  returnReason: string;
  condition: string;
  disposition: string;
  status: string;
  creditAmount?: number;
  reviewNotes?: string;
  notes?: string;
  createdAt: string;
}

export default function PharmacyReturnsPage() {
  const [returns, setReturns] = useState<PharmacyReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ ret: PharmacyReturn; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [reviewForm, setReviewForm] = useState({ creditAmount: '', reviewNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    source: 'PATIENT',
    patientId: '',
    drugName: '',
    batchNumber: '',
    quantityReturned: 1,
    returnReason: 'PRESCRIPTION_CHANGED',
    condition: 'SEALED',
    disposition: 'RETURN_TO_STOCK',
    notes: '',
  });

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pharmacy/returns');
      setReturns(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const filtered = returns.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.drugName?.toLowerCase().includes(q) ||
      r.returnNumber?.toLowerCase().includes(q) ||
      r.returnReason?.toLowerCase().includes(q) ||
      r.source?.toLowerCase().includes(q)
    );
  });

  const totalReturns = returns.length;
  const pending = returns.filter((r) => r.status === 'PENDING_REVIEW').length;
  const approved = returns.filter((r) => r.status === 'APPROVED').length;
  const rejected = returns.filter((r) => r.status === 'REJECTED').length;

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.drugName.trim()) {
      toast.error('Drug name is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/pharmacy/returns', {
        ...form,
        quantityReturned: Number(form.quantityReturned),
      });
      toast.success('Return submitted successfully');
      setShowForm(false);
      setForm({
        source: 'PATIENT',
        patientId: '',
        drugName: '',
        batchNumber: '',
        quantityReturned: 1,
        returnReason: 'PRESCRIPTION_CHANGED',
        condition: 'SEALED',
        disposition: 'RETURN_TO_STOCK',
        notes: '',
      });
      fetchReturns();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (ret: PharmacyReturn, action: 'APPROVED' | 'REJECTED') => {
    setReviewModal({ ret, action });
    setReviewForm({ creditAmount: '', reviewNotes: '' });
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const payload: any = {
        status: reviewModal.action,
        reviewNotes: reviewForm.reviewNotes || undefined,
      };
      if (reviewModal.action === 'APPROVED' && reviewForm.creditAmount) {
        payload.creditAmount = parseFloat(reviewForm.creditAmount);
      }
      await api.patch(`/pharmacy/returns/${reviewModal.ret.id}/review`, payload);
      toast.success(reviewModal.action === 'APPROVED' ? 'Return approved' : 'Return rejected');
      setReviewModal(null);
      fetchReturns();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to review return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar
        title="Pharmacy Returns"
        subtitle="Process medication returns and credit notes"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            <Plus size={15} /> New Return
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Returns" value={totalReturns} icon={RotateCcw} color="#0F766E" />
        <KpiCard label="Pending Review" value={pending} icon={Clock} color="#F59E0B" />
        <KpiCard label="Approved" value={approved} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Rejected" value={rejected} icon={XCircle} color="#EF4444" />
      </div>

      {/* New Return Form */}
      {showForm && (
        <div className="hms-card p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">New Return Record</h3>
          <form onSubmit={submitReturn} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Source', key: 'source', type: 'select', options: ['PATIENT', 'WARD', 'EXPIRED'] },
              { label: 'Patient ID (if applicable)', key: 'patientId', type: 'text' },
              { label: 'Drug Name', key: 'drugName', type: 'text', required: true },
              { label: 'Batch Number', key: 'batchNumber', type: 'text' },
              { label: 'Quantity Returned', key: 'quantityReturned', type: 'number', required: true },
              {
                label: 'Return Reason',
                key: 'returnReason',
                type: 'select',
                options: [
                  'DUPLICATE_DISPENSE',
                  'PRESCRIPTION_CHANGED',
                  'PATIENT_DISCHARGED',
                  'DRUG_NOT_SUITABLE',
                  'EXCESS_QUANTITY',
                  'DEFECTIVE',
                  'EXPIRED',
                ],
              },
              { label: 'Condition', key: 'condition', type: 'select', options: ['SEALED', 'OPENED', 'DAMAGED'] },
              { label: 'Disposition', key: 'disposition', type: 'select', options: ['RETURN_TO_STOCK', 'DISPOSE', 'QUARANTINE'] },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {f.options!.map((o) => (
                      <option key={o} value={o}>
                        {o.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    min={f.type === 'number' ? 1 : undefined}
                    value={(form as any)[f.key]}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                )}
              </div>
            ))}
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                {submitting ? 'Submitting...' : 'Submit Return'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Returns Table */}
      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Returns Queue</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search returns..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Return #</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Drug</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No returns found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-teal-700">{r.returnNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.source}</td>
                    <td className="px-4 py-3 text-sm font-medium">{r.drugName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.returnReason?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.quantityReturned}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.condition}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'PENDING_REVIEW' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openReviewModal(r, 'APPROVED')}
                            className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md font-medium hover:bg-green-100 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReviewModal(r, 'REJECTED')}
                            className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md font-medium hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {reviewModal.action === 'APPROVED' ? 'Approve' : 'Reject'} Return
              </h3>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p>
                  <span className="font-medium text-gray-700">Return:</span> {reviewModal.ret.returnNumber}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Drug:</span> {reviewModal.ret.drugName}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Qty:</span> {reviewModal.ret.quantityReturned} |{' '}
                  <span className="font-medium text-gray-700">Condition:</span> {reviewModal.ret.condition} |{' '}
                  <span className="font-medium text-gray-700">Disposition:</span>{' '}
                  {reviewModal.ret.disposition?.replace(/_/g, ' ')}
                </p>
              </div>

              {reviewModal.action === 'APPROVED' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Credit Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={reviewForm.creditAmount}
                    onChange={(e) => setReviewForm((p) => ({ ...p, creditAmount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Review Notes</label>
                <textarea
                  value={reviewForm.reviewNotes}
                  onChange={(e) => setReviewForm((p) => ({ ...p, reviewNotes: e.target.value }))}
                  rows={3}
                  placeholder={
                    reviewModal.action === 'APPROVED'
                      ? 'Optional notes for approval...'
                      : 'Reason for rejection...'
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submitting}
                className={`px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 ${
                  reviewModal.action === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting
                  ? 'Processing...'
                  : reviewModal.action === 'APPROVED'
                  ? 'Approve Return'
                  : 'Reject Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
