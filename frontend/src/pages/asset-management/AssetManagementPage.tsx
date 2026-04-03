import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Package, AlertTriangle, CheckCircle, History, X, Check } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function AssetManagementPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState<string | null>(null);
  const [form, setForm] = useState({ assetCode: '', name: '', category: 'MEDICAL_EQUIPMENT', brand: '', model: '', serialNumber: '', purchaseDate: '', purchaseCost: '' });
  const [maintForm, setMaintForm] = useState({ maintenanceType: 'PREVENTIVE', description: '', scheduledDate: '' });
  const [formError, setFormError] = useState('');

  // Maintenance history modal state
  const [historyModal, setHistoryModal] = useState<{ assetId: string; assetName: string } | null>(null);
  const [maintHistory, setMaintHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/assets'); setAssets(data.data || data || []); } catch (err) { toast.error('Failed to load assets'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.assetCode.trim() || !form.name.trim()) { setFormError('Asset code and name are required'); return; }
    setFormError('');
    try { await api.post('/assets', { ...form, purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined }); toast.success('Asset added successfully'); setShowForm(false); setForm({ assetCode: '', name: '', category: 'MEDICAL_EQUIPMENT', brand: '', model: '', serialNumber: '', purchaseDate: '', purchaseCost: '' }); fetchData(); } catch (err) { toast.error('Failed to add asset'); }
  };

  const scheduleMaintenance = async () => {
    if (!showMaintenance) return;
    if (!maintForm.description.trim()) { setFormError('Description is required'); return; }
    setFormError('');
    try { await api.post(`/assets/${showMaintenance}/maintenance`, maintForm); toast.success('Maintenance scheduled successfully'); setShowMaintenance(null); setMaintForm({ maintenanceType: 'PREVENTIVE', description: '', scheduledDate: '' }); fetchData(); } catch (err) { toast.error('Failed to schedule maintenance'); }
  };

  const viewMaintenanceHistory = async (assetId: string, assetName: string) => {
    setHistoryModal({ assetId, assetName });
    setHistoryLoading(true);
    setMaintHistory([]);
    try {
      const { data } = await api.get(`/assets/${assetId}/maintenance`);
      setMaintHistory(data.data || data || []);
    } catch (err) { console.error('Failed to load maintenance history:', err); toast.error('Failed to load maintenance history'); } finally { setHistoryLoading(false); }
  };

  const completeMaintenance = async (maintId: string) => {
    try {
      await api.patch(`/assets/maintenance/${maintId}/complete`, { notes: 'Completed' });
      toast.success('Maintenance marked as completed');
      // Refresh the history modal
      if (historyModal) {
        const { data } = await api.get(`/assets/${historyModal.assetId}/maintenance`);
        setMaintHistory(data.data || data || []);
      }
      fetchData();
    } catch (err) { console.error('Failed to complete maintenance:', err); toast.error('Failed to complete maintenance'); }
  };

  const active = assets.filter(a => a.status === 'ACTIVE').length;
  const maintenance = assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;
  const disposed = assets.filter(a => a.status === 'DISPOSED').length;

  const maintStatusColor: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Asset Management" subtitle="Track hospital assets and maintenance" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Assets" value={assets.length} icon={Package} color="#3B82F6" />
          <KpiCard label="Active" value={active} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Maintenance" value={maintenance} icon={Wrench} color="#F59E0B" />
          <KpiCard label="Disposed" value={disposed} icon={AlertTriangle} color="#EF4444" />
        </div>
      )}
      <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Add Asset</button></div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Add Asset</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Asset Code *" value={form.assetCode} onChange={e => setForm({ ...form, assetCode: e.target.value })} />
            <input className="hms-input" placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className="hms-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="MEDICAL_EQUIPMENT">Medical Equipment</option><option value="IT">IT</option><option value="FURNITURE">Furniture</option><option value="VEHICLE">Vehicle</option></select>
            <input className="hms-input" placeholder="Brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            <input className="hms-input" placeholder="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            <input className="hms-input" placeholder="Serial Number" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
            <input className="hms-input" type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
            <input className="hms-input" type="number" placeholder="Purchase Cost" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Save</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      {showMaintenance && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Schedule Maintenance</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <select className="hms-input" value={maintForm.maintenanceType} onChange={e => setMaintForm({ ...maintForm, maintenanceType: e.target.value })}><option value="PREVENTIVE">Preventive</option><option value="CORRECTIVE">Corrective</option><option value="CALIBRATION">Calibration</option></select>
            <input className="hms-input" placeholder="Description *" value={maintForm.description} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} />
            <input className="hms-input" type="date" value={maintForm.scheduledDate} onChange={e => setMaintForm({ ...maintForm, scheduledDate: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={scheduleMaintenance} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Schedule</button><button onClick={() => setShowMaintenance(null)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Code</th><th className="text-left p-3 font-medium text-gray-600">Name</th><th className="text-left p-3 font-medium text-gray-600">Category</th><th className="text-left p-3 font-medium text-gray-600">Brand</th><th className="text-left p-3 font-medium text-gray-600">Condition</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
      <tbody>{loading ? (
        <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
      ) : assets.length === 0 ? (
        <tr><td colSpan={7} className="p-0">
          <EmptyState icon={<Package size={36} />} title="No assets registered" description="Add hospital equipment and assets to start tracking" />
        </td></tr>
      ) : assets.slice((page - 1) * 20, page * 20).map(a => (
        <tr key={a.id} className="border-b hover:bg-gray-50">
          <td className="p-3 font-medium text-teal-700">{a.assetCode}</td>
          <td className="p-3">{a.name}</td><td className="p-3">{a.category?.replace(/_/g, ' ')}</td>
          <td className="p-3">{a.brand || '—'}</td><td className="p-3">{a.condition}</td>
          <td className="p-3"><StatusBadge status={a.status} /></td>
          <td className="p-3">
            <div className="flex gap-1.5">
              <button onClick={() => viewMaintenanceHistory(a.id, a.name)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium inline-flex items-center gap-1"><History size={12} />History</button>
              {a.status === 'ACTIVE' && (
                <button onClick={() => setShowMaintenance(a.id)} className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 font-medium">Maintenance</button>
              )}
            </div>
          </td>
        </tr>
      ))}</tbody></table>
      <Pagination page={page} totalPages={Math.ceil(assets.length / 20)} onPageChange={setPage} totalItems={assets.length} pageSize={20} />
      </div>

      {/* Maintenance History Modal */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setHistoryModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Maintenance History</h3>
                <p className="text-xs text-gray-500 mt-0.5">{historyModal.assetName}</p>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600">Description</th>
                  <th className="text-left p-3 font-medium text-gray-600">Scheduled</th>
                  <th className="text-left p-3 font-medium text-gray-600">Completed</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                </tr></thead>
                <tbody>
                  {historyLoading ? (
                    <>{Array.from({ length: 3 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                  ) : maintHistory.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No maintenance records</td></tr>
                  ) : maintHistory.map(m => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{m.maintenanceType}</span>
                      </td>
                      <td className="p-3 max-w-[200px] truncate">{m.description}</td>
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : '—'}</td>
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{m.completedDate ? new Date(m.completedDate).toLocaleDateString() : '—'}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${maintStatusColor[m.status] || 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                      </td>
                      <td className="p-3">
                        {(m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED') && (
                          <button onClick={() => completeMaintenance(m.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium inline-flex items-center gap-1"><Check size={12} />Complete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
