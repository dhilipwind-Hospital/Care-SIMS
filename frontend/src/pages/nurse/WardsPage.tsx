import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bed, Users, CheckCircle, Plus, Edit2, X, Save, Wrench, UserCheck } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';

const WARD_TYPES = ['GENERAL', 'ICU', 'NICU', 'PICU', 'HDU', 'ISOLATION', 'MATERNITY', 'PEDIATRIC', 'SURGICAL', 'PRIVATE'] as const;
const BED_TYPES = ['STANDARD', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'ISOLATION', 'CRADLE'] as const;

const EMPTY_WARD_FORM = { name: '', type: 'GENERAL', floor: '', totalBeds: '' };
const EMPTY_BED_FORM = { bedNumber: '', type: 'STANDARD', features: '' };

const STATUS_STYLES: Record<string, string> = {
  OCCUPIED: 'bg-red-100 text-red-700 border-red-200',
  MAINTENANCE: 'bg-gray-100 text-gray-500 border-gray-200',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-200',
  AVAILABLE: 'bg-green-100 text-green-700 border-green-200',
  CLEANING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const STATUS_ICONS: Record<string, string> = {
  OCCUPIED: '🛏️', AVAILABLE: '✅', MAINTENANCE: '🔧', RESERVED: '📋', CLEANING: '🧹',
};

export default function WardsPage() {
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [occupancy, setOccupancy] = useState<any[]>([]);

  // Ward modal state
  const [showWardModal, setShowWardModal] = useState(false);
  const [editingWard, setEditingWard] = useState<any>(null);
  const [wardForm, setWardForm] = useState(EMPTY_WARD_FORM);
  const [wardSubmitting, setWardSubmitting] = useState(false);
  const [wardError, setWardError] = useState('');

  // Bed modal state
  const [showBedModal, setShowBedModal] = useState(false);
  const [bedWardId, setBedWardId] = useState<string | null>(null);
  const [bedWardName, setBedWardName] = useState('');
  const [bedForm, setBedForm] = useState(EMPTY_BED_FORM);
  const [bedSubmitting, setBedSubmitting] = useState(false);
  const [bedError, setBedError] = useState('');

  const fetchWards = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/wards');
      setWards(data.data || data || []);
    } catch (err) { toast.error('Failed to load wards'); } finally { setLoading(false); }
  };

  const fetchOccupancy = async () => {
    try {
      const { data } = await api.get('/wards/occupancy');
      setOccupancy(data.data || data || []);
    } catch (err) { /* occupancy is supplementary, don't block */ }
  };

  // Escape key to close modals
  useEscapeClose(showWardModal, () => setShowWardModal(false));
  useEscapeClose(showBedModal, () => setShowBedModal(false));

  useEffect(() => { fetchWards(); fetchOccupancy(); }, []);

  // Aggregate KPI from occupancy endpoint
  const totalBeds = occupancy.reduce((s, o) => s + (o.totalBeds || 0), 0) || wards.reduce((s, w) => s + (w.beds?.length || w.totalBeds || 0), 0);
  const occupied = occupancy.reduce((s, o) => s + (o.occupiedBeds || 0), 0) || wards.reduce((s, w) => s + (w.beds?.filter((b: any) => b.status === 'OCCUPIED').length || 0), 0);
  const available = occupancy.reduce((s, o) => s + (o.availableBeds || 0), 0) || totalBeds - occupied;
  const maintenance = occupancy.reduce((s, o) => s + (o.maintenanceBeds || 0), 0);

  // Ward CRUD
  const openAddWard = () => {
    setEditingWard(null);
    setWardForm(EMPTY_WARD_FORM);
    setWardError('');
    setShowWardModal(true);
  };

  const openEditWard = (ward: any) => {
    setEditingWard(ward);
    setWardForm({
      name: ward.name || '',
      type: ward.type || 'GENERAL',
      floor: ward.floor?.toString() || ward.floorNumber?.toString() || '',
      totalBeds: ward.totalBeds?.toString() || '',
    });
    setWardError('');
    setShowWardModal(true);
  };

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardForm.name.trim()) { setWardError('Ward name is required'); return; }
    setWardSubmitting(true);
    setWardError('');
    try {
      const payload = {
        name: wardForm.name.trim(),
        type: wardForm.type,
        floor: wardForm.floor ? parseInt(wardForm.floor) : undefined,
        totalBeds: wardForm.totalBeds ? parseInt(wardForm.totalBeds) : undefined,
      };
      if (editingWard) {
        await api.put(`/wards/${editingWard.id}`, payload);
        toast.success('Ward updated successfully');
      } else {
        await api.post('/wards', payload);
        toast.success('Ward created successfully');
      }
      setShowWardModal(false);
      fetchWards();
      fetchOccupancy();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save ward';
      setWardError(msg);
      toast.error(msg);
    } finally { setWardSubmitting(false); }
  };

  // Bed CRUD
  const openAddBed = (wardId: string, wardName: string) => {
    setBedWardId(wardId);
    setBedWardName(wardName);
    setBedForm(EMPTY_BED_FORM);
    setBedError('');
    setShowBedModal(true);
  };

  const handleBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedForm.bedNumber.trim()) { setBedError('Bed number is required'); return; }
    setBedSubmitting(true);
    setBedError('');
    try {
      const payload: any = {
        bedNumber: bedForm.bedNumber.trim(),
        type: bedForm.type,
      };
      if (bedForm.features.trim()) {
        payload.features = bedForm.features.split(',').map(f => f.trim()).filter(Boolean);
      }
      await api.post(`/wards/${bedWardId}/beds`, payload);
      toast.success('Bed added successfully');
      setShowBedModal(false);
      fetchWards();
      fetchOccupancy();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add bed';
      setBedError(msg);
      toast.error(msg);
    } finally { setBedSubmitting(false); }
  };

  const updateBedStatus = async (bedId: string, status: string) => {
    try {
      await api.patch(`/wards/beds/${bedId}/status`, { status });
      toast.success('Bed status updated');
      fetchWards();
      fetchOccupancy();
    } catch (err) { toast.error('Failed to update bed status'); }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Wards & Bed Management" subtitle="Monitor ward occupancy and bed status"
        actions={
          <button onClick={openAddWard}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Add Ward
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Wards" value={wards.length} icon={Users} color="#0F766E" />
        <KpiCard label="Total Beds" value={totalBeds} icon={Bed} color="#3B82F6" />
        <KpiCard label="Occupied" value={occupied} icon={UserCheck} color="#F59E0B" />
        <KpiCard label="Available" value={available} icon={CheckCircle} color="#10B981" />
      </div>
      {maintenance > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Maintenance" value={maintenance} icon={Wrench} color="#EF4444" />
        </div>
      )}

      {/* Ward List */}
      <div className="space-y-4">
        {loading ? (
          <div className="hms-card p-12 text-center text-gray-400">Loading wards...</div>
        ) : wards.length === 0 ? (
          <div className="hms-card">
            <EmptyState icon={<Bed size={36} />} title="No wards configured" description="Add wards and beds to manage bed occupancy"
              action={
                <button onClick={openAddWard}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  <Plus size={14} /> Add Ward
                </button>
              }
            />
          </div>
        ) : wards.map(ward => {
          const beds = ward.beds || [];
          const wardOccupied = beds.filter((b: any) => b.status === 'OCCUPIED').length;
          const occupancyPct = beds.length > 0 ? Math.round((wardOccupied / beds.length) * 100) : 0;
          return (
            <div key={ward.id} className="hms-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                  <div className="text-sm text-gray-500">{ward.type} · Floor {ward.floor ?? ward.floorNumber ?? '—'} · {ward.gender || 'Mixed'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEditWard(ward)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium">
                    <Edit2 size={11} /> Edit
                  </button>
                  <button onClick={() => openAddBed(ward.id, ward.name)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">
                    <Plus size={11} /> Add Bed
                  </button>
                  <div className="text-right ml-2">
                    <div className="text-2xl font-bold text-teal-700">{wardOccupied}/{beds.length}</div>
                    <div className="text-xs text-gray-400">Occupied</div>
                  </div>
                </div>
              </div>
              {/* Occupancy bar */}
              <div className="h-2 bg-gray-100 rounded-full mb-4">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${occupancyPct}%`, background: occupancyPct > 80 ? '#EF4444' : occupancyPct > 60 ? '#F59E0B' : '#10B981' }} />
              </div>
              {/* Visual Bed Map */}
              {beds.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {beds.map((bed: any) => {
                    const activeAdmission = bed.admissions?.find((a: any) => a.status === 'ACTIVE');
                    const patientName = activeAdmission?.patient
                      ? `${activeAdmission.patient.firstName} ${activeAdmission.patient.lastName}`
                      : null;
                    const statusIcon = STATUS_ICONS[bed.status] || '🛏️';
                    return (
                      <div key={bed.id}
                        className={`relative rounded-xl p-3 border-2 transition-all hover:shadow-md ${STATUS_STYLES[bed.status] || STATUS_STYLES.AVAILABLE}`}>
                        {/* Header: bed number + icon */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold">{bed.bedNumber}</span>
                          <span className="text-lg">{statusIcon}</span>
                        </div>
                        {/* Type */}
                        <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">{bed.type || 'Standard'}</div>
                        {/* Patient name if occupied */}
                        {patientName && (
                          <div className="text-xs font-medium text-gray-800 truncate mb-1" title={patientName}>
                            {patientName}
                          </div>
                        )}
                        {activeAdmission && (
                          <div className="text-[10px] text-gray-500">Since {new Date(activeAdmission.admissionDate || activeAdmission.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                        )}
                        {/* Status badge */}
                        <div className={`mt-2 text-[10px] font-bold uppercase text-center px-2 py-1 rounded-full ${STATUS_STYLES[bed.status] || ''}`}>
                          {bed.status === 'CLEANING' ? 'Cleaning' : bed.status}
                        </div>
                        {/* Quick actions */}
                        <div className="flex gap-1 mt-2">
                          {bed.status === 'AVAILABLE' && (
                            <>
                              <button onClick={() => updateBedStatus(bed.id, 'RESERVED')} className="flex-1 text-[10px] py-1 bg-amber-50 text-amber-700 rounded font-medium hover:bg-amber-100">Reserve</button>
                              <button onClick={() => updateBedStatus(bed.id, 'MAINTENANCE')} className="flex-1 text-[10px] py-1 bg-gray-50 text-gray-600 rounded font-medium hover:bg-gray-100">Maint.</button>
                            </>
                          )}
                          {bed.status === 'RESERVED' && (
                            <button onClick={() => updateBedStatus(bed.id, 'AVAILABLE')} className="flex-1 text-[10px] py-1 bg-green-50 text-green-700 rounded font-medium hover:bg-green-100">Release</button>
                          )}
                          {bed.status === 'MAINTENANCE' && (
                            <button onClick={() => updateBedStatus(bed.id, 'AVAILABLE')} className="flex-1 text-[10px] py-1 bg-green-50 text-green-700 rounded font-medium hover:bg-green-100">Mark Available</button>
                          )}
                          {bed.status === 'CLEANING' && (
                            <button onClick={() => updateBedStatus(bed.id, 'AVAILABLE')} className="flex-1 text-[10px] py-1 bg-green-50 text-green-700 rounded font-medium hover:bg-green-100">Mark Clean</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-400 py-4">
                  No beds configured.{' '}
                  <button onClick={() => openAddBed(ward.id, ward.name)} className="text-teal-600 hover:underline font-medium">
                    Add beds
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bed Map Legend */}
      {wards.length > 0 && (
        <div className="flex items-center justify-center gap-5 text-xs text-gray-500">
          {[
            { status: 'AVAILABLE', label: 'Available', icon: '✅' },
            { status: 'OCCUPIED', label: 'Occupied', icon: '🛏️' },
            { status: 'RESERVED', label: 'Reserved', icon: '📋' },
            { status: 'CLEANING', label: 'Cleaning', icon: '🧹' },
            { status: 'MAINTENANCE', label: 'Maintenance', icon: '🔧' },
          ].map(item => (
            <div key={item.status} className="flex items-center gap-1.5">
              <span>{item.icon}</span>
              <div className={`w-3 h-3 rounded border ${STATUS_STYLES[item.status]}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Ward Modal */}
      {showWardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editingWard ? 'Edit Ward' : 'Add Ward'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingWard ? `Editing: ${editingWard.name}` : 'Create a new ward'}
                </p>
              </div>
              <button type="button" onClick={() => setShowWardModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleWardSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ward Name <span className="text-red-500">*</span></label>
                <input required value={wardForm.name} onChange={e => setWardForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. ICU Ward A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ward Type</label>
                <select value={wardForm.type} onChange={e => setWardForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {WARD_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
                  <input type="number" value={wardForm.floor} onChange={e => setWardForm(f => ({ ...f, floor: e.target.value }))}
                    placeholder="e.g. 2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Beds</label>
                  <input type="number" min="0" value={wardForm.totalBeds} onChange={e => setWardForm(f => ({ ...f, totalBeds: e.target.value }))}
                    placeholder="e.g. 20"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              {wardError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{wardError}</div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowWardModal(false)}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={wardSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  <Save size={14} />
                  {wardSubmitting ? 'Saving...' : editingWard ? 'Save Changes' : 'Create Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bed Modal */}
      {showBedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Add Bed</h2>
                <p className="text-xs text-gray-400 mt-0.5">Adding bed to: {bedWardName}</p>
              </div>
              <button type="button" onClick={() => setShowBedModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBedSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bed Number <span className="text-red-500">*</span></label>
                <input required value={bedForm.bedNumber} onChange={e => setBedForm(f => ({ ...f, bedNumber: e.target.value }))}
                  placeholder="e.g. B-101"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bed Type</label>
                <select value={bedForm.type} onChange={e => setBedForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {BED_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Features</label>
                <input value={bedForm.features} onChange={e => setBedForm(f => ({ ...f, features: e.target.value }))}
                  placeholder="e.g. Oxygen, Monitor, AC (comma-separated)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <p className="text-[10px] text-gray-400 mt-1">Comma-separated list of bed features</p>
              </div>

              {bedError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{bedError}</div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowBedModal(false)}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={bedSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  <Save size={14} />
                  {bedSubmitting ? 'Saving...' : 'Add Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
