import { useEffect, useState } from 'react';
import { MessageSquare, Clock, AlertTriangle, CheckCircle, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function GrievancePage() {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ complainantName: '', complainantPhone: '', complainantType: 'PATIENT', category: 'SERVICE', severity: 'MEDIUM', subject: '', description: '' });
  const [formError, setFormError] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [escalateId, setEscalateId] = useState<string | null>(null);
  const [escalatedTo, setEscalatedTo] = useState('');

  // Assign
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignToId, setAssignToId] = useState('');
  const [assignToName, setAssignToName] = useState('');

  // Feedback
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/grievances'); setGrievances(data.data || data || []); } catch (err) { toast.error('Failed to load grievances'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.complainantName.trim()) { setFormError('Complainant name is required'); return; }
    if (!form.subject.trim()) { setFormError('Subject is required'); return; }
    if (!form.description.trim()) { setFormError('Description is required'); return; }
    if (form.complainantPhone.trim() && !/^[6-9]\d{9}$/.test(form.complainantPhone.trim())) { setFormError('Enter a valid 10-digit Indian mobile number'); return; }
    setFormError('');
    try { await api.post('/grievances', form); toast.success('Grievance submitted successfully'); setShowForm(false); setForm({ complainantName: '', complainantPhone: '', complainantType: 'PATIENT', category: 'SERVICE', severity: 'MEDIUM', subject: '', description: '' }); fetchData(); } catch (err) { toast.error('Failed to submit grievance'); }
  };
  const handleResolve = (id: string) => { setResolveId(id); setResolution(''); };
  const confirmResolve = async () => { if (!resolveId || !resolution.trim()) return; try { await api.patch(`/grievances/${resolveId}/resolve`, { resolution }); toast.success('Grievance resolved'); fetchData(); } catch (err) { toast.error('Failed to resolve grievance'); } finally { setResolveId(null); setResolution(''); } };
  const handleEscalate = (id: string) => { setEscalateId(id); setEscalatedTo(''); };
  const confirmEscalate = async () => { if (!escalateId || !escalatedTo.trim()) return; try { await api.patch(`/grievances/${escalateId}/escalate`, { escalatedTo }); toast.success('Grievance escalated'); fetchData(); } catch (err) { toast.error('Failed to escalate grievance'); } finally { setEscalateId(null); setEscalatedTo(''); } };

  const handleAssign = (id: string) => { setAssignId(id); setAssignToId(''); setAssignToName(''); };
  const confirmAssign = async () => {
    if (!assignId || !assignToName.trim()) return;
    try {
      await api.patch(`/grievances/${assignId}/assign`, { assignedToId: assignToId || undefined, assignedToName: assignToName });
      toast.success('Grievance assigned');
      fetchData();
    } catch (err) { toast.error('Failed to assign grievance'); }
    finally { setAssignId(null); setAssignToId(''); setAssignToName(''); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Are you sure you want to delete this grievance?')) return; try { await api.delete(`/grievances/${id}`); toast.success('Grievance deleted'); fetchData(); } catch (err) { toast.error('Failed to delete grievance'); } };
  const handleFeedback = (id: string) => { setFeedbackId(id); setFeedbackRating(5); setFeedbackComments(''); };
  const confirmFeedback = async () => {
    if (!feedbackId) return;
    try {
      await api.patch(`/grievances/${feedbackId}/feedback`, { rating: feedbackRating, comments: feedbackComments });
      toast.success('Feedback submitted');
      fetchData();
    } catch (err) { toast.error('Failed to submit feedback'); }
    finally { setFeedbackId(null); setFeedbackRating(5); setFeedbackComments(''); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Grievance Management" subtitle="Track and resolve patient grievances" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Tickets" value={grievances.length} icon={MessageSquare} color="#3B82F6" />
          <KpiCard label="Open" value={grievances.filter(g => g.status === 'OPEN').length} icon={Clock} color="#F59E0B" />
          <KpiCard label="Escalated" value={grievances.filter(g => g.status === 'ESCALATED').length} icon={AlertTriangle} color="#EF4444" />
          <KpiCard label="Resolved" value={grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length} icon={CheckCircle} color="#10B981" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ New Grievance</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Register Grievance</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Complainant Name *" value={form.complainantName} onChange={e => setForm({ ...form, complainantName: e.target.value })} />
            <input className="hms-input" placeholder="Phone" value={form.complainantPhone} onChange={e => setForm({ ...form, complainantPhone: e.target.value })} />
            <select className="hms-input" value={form.complainantType} onChange={e => setForm({ ...form, complainantType: e.target.value })}><option value="PATIENT">Patient</option><option value="RELATIVE">Relative</option><option value="STAFF">Staff</option></select>
            <select className="hms-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="SERVICE">Service</option><option value="BILLING">Billing</option><option value="HYGIENE">Hygiene</option><option value="STAFF_BEHAVIOR">Staff Behavior</option><option value="OTHER">Other</option></select>
            <select className="hms-input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select>
            <input className="hms-input" placeholder="Subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          </div><textarea className="hms-input w-full" placeholder="Description *" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Submit</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Ticket #</th><th className="text-left p-3 font-medium text-gray-600">Complainant</th><th className="text-left p-3 font-medium text-gray-600">Category</th><th className="text-left p-3 font-medium text-gray-600">Severity</th><th className="text-left p-3 font-medium text-gray-600">Subject</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
      ) : grievances.length === 0 ? (
        <tr><td colSpan={7}><EmptyState icon={<MessageSquare size={24} className="text-gray-400" />} title="No grievances filed" description="Complaints will appear here when reported" /></td></tr>
      ) : grievances.map(g => (
        <tr key={g.id} className={`border-b hover:bg-gray-50 ${g.severity === 'CRITICAL' ? 'bg-red-50/40' : ''}`}>
          <td className="p-3 font-medium text-teal-700">{g.ticketNumber}</td>
          <td className="p-3">{g.complainantName}</td>
          <td className="p-3">{g.category}</td>
          <td className="p-3"><StatusBadge status={g.severity} /></td>
          <td className="p-3 max-w-[150px] truncate">{g.subject}</td>
          <td className="p-3"><StatusBadge status={g.status} /></td>
          <td className="p-3">
            <div className="flex gap-1.5 flex-wrap">
              {(g.status === 'OPEN' || g.status === 'SUBMITTED') && (
                <button onClick={() => handleAssign(g.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">Assign</button>
              )}
              {(g.status === 'OPEN' || g.status === 'SUBMITTED') && (
                <button onClick={() => handleDelete(g.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium inline-flex items-center gap-1" title="Delete grievance"><Trash2 size={11} /> Delete</button>
              )}
              {(g.status === 'OPEN' || g.status === 'ASSIGNED') && <>
                <button onClick={() => handleResolve(g.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Resolve</button>
                <button onClick={() => handleEscalate(g.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">Escalate</button>
              </>}
              {g.status === 'RESOLVED' && (
                <button onClick={() => handleFeedback(g.id)} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium flex items-center gap-1"><Star size={11} />Feedback</button>
              )}
            </div>
          </td>
        </tr>
      ))}</tbody></table></div>
      {resolveId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Resolution</h3>
            <textarea className="w-full border rounded-lg p-2 mb-4" rows={3} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Enter resolution..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setResolveId(null); setResolution(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmResolve} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {escalateId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Escalate Grievance</h3>
            <input className="w-full border rounded-lg p-2 mb-4" value={escalatedTo} onChange={e => setEscalatedTo(e.target.value)} placeholder="Escalate to (name/role)..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setEscalateId(null); setEscalatedTo(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmEscalate} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {assignId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Assign Grievance</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assignee Name <span className="text-red-500">*</span></label>
                <input className="w-full border rounded-lg p-2" value={assignToName} onChange={e => setAssignToName(e.target.value)} placeholder="Name of the person to assign..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assignee ID <span className="text-xs text-gray-400">(optional)</span></label>
                <input className="w-full border rounded-lg p-2" value={assignToId} onChange={e => setAssignToId(e.target.value)} placeholder="User ID (optional)..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setAssignId(null); setAssignToId(''); setAssignToName(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmAssign} disabled={!assignToName.trim()} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">Assign</button>
            </div>
          </div>
        </div>
      )}
      {feedbackId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Submit Feedback</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setFeedbackRating(n)}
                      className={`p-1 rounded transition-colors ${n <= feedbackRating ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}>
                      <Star size={24} fill={n <= feedbackRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Comments</label>
                <textarea className="w-full border rounded-lg p-2" rows={3} value={feedbackComments} onChange={e => setFeedbackComments(e.target.value)} placeholder="Your feedback..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setFeedbackId(null); setFeedbackRating(5); setFeedbackComments(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmFeedback} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Submit Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
