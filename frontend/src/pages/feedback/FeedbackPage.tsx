import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Star, MessageSquare, Plus, X, Loader2, TrendingUp } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', visitType: 'OPD', overallRating: 4, npsScore: 8, comments: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        api.get('/feedback', { params: { page, limit: 20 } }),
        api.get('/feedback/analytics'),
      ]);
      setFeedbacks(list.data.data || []);
      setTotal(list.data.meta?.total || 0);
      setAnalytics(stats.data.data || stats.data || {});
    } catch { toast.error('Failed to load feedback'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSubmit = async () => {
    if (!form.patientId) { toast.error('Enter patient ID'); return; }
    setSubmitting(true);
    try {
      await api.post('/feedback', form);
      toast.success('Feedback submitted'); setShowForm(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleReview = async (id: string) => {
    try { await api.patch(`/feedback/${id}/review`); toast.success('Marked as reviewed'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const npsColor = (analytics?.nps || 0) >= 50 ? '#10B981' : (analytics?.nps || 0) >= 0 ? '#F59E0B' : '#EF4444';

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Patient Feedback" subtitle="Satisfaction surveys and quality metrics"
        actions={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Record Feedback</button>} />

      {/* Analytics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Responses" value={analytics?.totalResponses || 0} icon={MessageSquare} color="#3B82F6" />
        <KpiCard label="Avg Rating" value={`${analytics?.avgRating || 0}/5`} icon={Star} color="#F59E0B" />
        <KpiCard label="NPS Score" value={analytics?.nps ?? 0} icon={TrendingUp} color={npsColor} />
        <KpiCard label="5-Star Reviews" value={analytics?.ratingDistribution?.find((r: any) => r.rating === 5)?.count || 0} icon={Star} color="#10B981" />
      </div>

      {/* Rating distribution */}
      {analytics?.ratingDistribution && (
        <div className="hms-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(r => {
              const count = analytics.ratingDistribution.find((d: any) => d.rating === r)?.count || 0;
              const pct = analytics.totalResponses > 0 ? (count / analytics.totalResponses) * 100 : 0;
              return (
                <div key={r} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-6">{r}★</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: r >= 4 ? '#10B981' : r === 3 ? '#F59E0B' : '#EF4444' }} />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback list */}
      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Feedback</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10"><tr>
              {['Date', 'Visit Type', 'Rating', 'NPS', 'Comments', 'Status', 'Actions'].map(h => <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
              : feedbacks.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<MessageSquare size={36} />} title="No feedback yet" description="Record patient feedback to track satisfaction" /></td></tr>
              : feedbacks.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 border-t border-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{f.submittedAt ? formatDate(f.submittedAt) : formatDate(f.createdAt)}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.visitType} /></td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-amber-600">{'★'.repeat(f.overallRating || 0)}{'☆'.repeat(5 - (f.overallRating || 0))}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{f.npsScore ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[250px] truncate">{f.comments || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  <td className="px-4 py-3">
                    {f.status !== 'REVIEWED' && (
                      <button onClick={() => handleReview(f.id)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">Review</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
      </div>

      {/* Submit Feedback Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Record Patient Feedback</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID *</label><input className="hms-input w-full" placeholder="Patient UUID" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Visit Type</label>
                <select className="hms-input w-full" value={form.visitType} onChange={e => setForm({ ...form, visitType: e.target.value })}><option>OPD</option><option>IPD</option><option>ED</option></select></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Overall Rating (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setForm({ ...form, overallRating: r })}
                      className={`w-10 h-10 rounded-lg text-lg font-bold transition-all ${form.overallRating >= r ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">NPS (0-10): How likely to recommend?</label>
                <input type="range" min="0" max="10" value={form.npsScore} onChange={e => setForm({ ...form, npsScore: Number(e.target.value) })} className="w-full" />
                <div className="flex justify-between text-xs text-gray-400"><span>Not likely</span><span className="font-bold text-gray-700">{form.npsScore}</span><span>Very likely</span></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Comments</label><textarea className="hms-input w-full" rows={3} placeholder="Patient's feedback..." value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 px-4 py-2">
                {submitting && <Loader2 size={14} className="animate-spin" />} Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
