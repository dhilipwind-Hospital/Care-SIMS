import { useEffect, useState } from 'react';
import { UserCheck, Users, Clock, LogOut, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const emptyForm = { visitorName: '', relationship: '', phone: '', idType: '', idNumber: '', patientId: '', purpose: 'VISIT', notes: '' };

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchActiveCount = async () => {
    try {
      const { data } = await api.get('/visitors/active-count');
      setActiveCount(data.activeVisitors ?? 0);
    } catch (err) { console.error('Failed to fetch active visitor count:', err); }
  };

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/visitors');
      setVisitors(data.data || data || []);
    } catch (err) { toast.error('Failed to load visitors'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchVisitors(); fetchActiveCount(); }, []);

  const checkedIn = visitors.filter(v => v.status === 'CHECKED_IN').length;
  const checkedOut = visitors.filter(v => v.status === 'CHECKED_OUT').length;

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const editRecord = (v: any) => {
    setForm({
      visitorName: v.visitorName || '',
      relationship: v.relationship || '',
      phone: v.phone || '',
      idType: v.idType || '',
      idNumber: v.idNumber || '',
      patientId: v.patientId || '',
      purpose: v.purpose || 'VISIT',
      notes: v.notes || '',
    });
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await api.patch(`/visitors/${editingId}`, form);
        toast.success('Visitor updated successfully');
      } else {
        await api.post('/visitors', form);
        toast.success('Visitor checked in successfully');
      }
      resetForm();
      fetchVisitors();
      fetchActiveCount();
    } catch (err) { toast.error(editingId ? 'Failed to update visitor' : 'Failed to check in visitor'); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete this visitor record?')) return; try { await api.delete(`/visitors/${id}`); toast.success('Visitor deleted'); fetchVisitors(); fetchActiveCount(); } catch (err) { toast.error('Failed to delete visitor'); } };

  const handleCheckOut = async (id: string) => {
    try {
      await api.patch(`/visitors/${id}/checkout`);
      toast.success('Visitor checked out');
      fetchVisitors();
      fetchActiveCount();
    } catch (err) { toast.error('Failed to check out visitor'); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Visitor Management" subtitle="Track patient visitors check-in and check-out" />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Today" value={visitors.length} icon={Users} color="#3B82F6" />
        <KpiCard label="Active Visitors" value={activeCount} icon={UserCheck} color="#10B981" />
        <KpiCard label="Checked Out" value={checkedOut} icon={LogOut} color="#6B7280" />
        <KpiCard label="Avg. Duration" value={visitors.length > 0 ? `${Math.round(visitors.filter(v => v.checkOutTime).reduce((s, v) => s + (new Date(v.checkOutTime).getTime() - new Date(v.checkInTime).getTime()) / 60000, 0) / Math.max(visitors.filter(v => v.checkOutTime).length, 1))}m` : '—'} icon={Clock} color="#F59E0B" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => { if (showForm && !editingId) { resetForm(); } else { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true); } }} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>
          + Check In Visitor
        </button>
      </div>

      {showForm && (
        <div className="hms-card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Visitor' : 'New Visitor Check-In'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Visitor Name *" value={form.visitorName} onChange={e => setForm({ ...form, visitorName: e.target.value })} />
            <select className="hms-input" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
              <option value="">Relationship *</option>
              <option value="SPOUSE">Spouse</option>
              <option value="PARENT">Parent</option>
              <option value="CHILD">Child</option>
              <option value="SIBLING">Sibling</option>
              <option value="RELATIVE">Relative</option>
              <option value="FRIEND">Friend</option>
              <option value="COLLEAGUE">Colleague</option>
              <option value="OTHER">Other</option>
            </select>
            <input className="hms-input" placeholder="Phone *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <select className="hms-input" value={form.idType} onChange={e => setForm({ ...form, idType: e.target.value })}>
              <option value="">ID Type</option>
              <option value="AADHAAR">Aadhaar</option>
              <option value="PAN">PAN</option>
              <option value="DRIVING_LICENSE">Driving License</option>
              <option value="PASSPORT">Passport</option>
            </select>
            <input className="hms-input" placeholder="ID Number" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
            <select className="hms-input" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}>
              <option value="VISIT">Patient Visit</option>
              <option value="DELIVERY">Delivery</option>
              <option value="OFFICIAL">Official</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <textarea className="hms-input w-full" placeholder="Notes" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>{editingId ? 'Update' : 'Check In'}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="hms-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--surface)' }}>
              <th className="text-left p-3 font-medium text-gray-600">Visitor</th>
              <th className="text-left p-3 font-medium text-gray-600">Relationship</th>
              <th className="text-left p-3 font-medium text-gray-600">Phone</th>
              <th className="text-left p-3 font-medium text-gray-600">Purpose</th>
              <th className="text-left p-3 font-medium text-gray-600">Check In</th>
              <th className="text-left p-3 font-medium text-gray-600">Check Out</th>
              <th className="text-left p-3 font-medium text-gray-600">Status</th>
              <th className="text-left p-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
            ) : visitors.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={<Users size={24} className="text-gray-400" />} title="No visitors recorded today" description="Check in a visitor to start tracking" /></td></tr>
            ) : visitors.slice((page - 1) * 20, page * 20).map(v => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{v.visitorName}</td>
                <td className="p-3">{v.relationship}</td>
                <td className="p-3">{v.phone}</td>
                <td className="p-3">{v.purpose}</td>
                <td className="p-3">{new Date(v.checkInTime).toLocaleTimeString()}</td>
                <td className="p-3">{v.checkOutTime ? new Date(v.checkOutTime).toLocaleTimeString() : '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {v.status === 'CHECKED_IN' ? 'In' : 'Out'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1.5">
                    {v.status === 'CHECKED_IN' && (
                      <>
                        <button onClick={() => editRecord(v)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium" title="Edit visitor"><Pencil size={13} className="inline mr-0.5" />Edit</button>
                        <button onClick={() => handleCheckOut(v.id)} className="text-sm text-red-600 hover:underline">Check Out</button>
                      </>
                    )}
                    <button onClick={() => handleDelete(v.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete visitor"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(visitors.length / 20)} onPageChange={setPage} totalItems={visitors.length} pageSize={20} />
      </div>
    </div>
  );
}
