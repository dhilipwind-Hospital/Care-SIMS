import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench, CheckCircle, AlertTriangle, Users, Plus, ShieldCheck } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import api from '../../lib/api';

export default function OTEquipmentPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sterilizing, setSterilizing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', equipmentType: 'ANESTHESIA_MACHINE', serialNumber: '', otRoomId: '', condition: 'OPERATIONAL' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, sRes] = await Promise.all([
        api.get('/ot/equipment').catch((err) => { console.error('Failed to fetch OT equipment:', err); return { data: [] }; }),
        api.get('/users', { params: { limit: 30 } }).catch((err) => { console.error('Failed to fetch users:', err); return { data: { data: [] } }; }),
      ]);
      setEquipment(eRes.data?.data || eRes.data || []);
      setStaff(sRes.data?.data || sRes.data || []);
    } catch (err) { console.error('Failed to load OT equipment data:', err); toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const sterilized = equipment.filter(e => e.sterilizationStatus === 'STERILIZED').length;
  const maintenance = equipment.filter(e => e.condition === 'UNDER_REPAIR' || e.condition === 'NEEDS_MAINTENANCE').length;

  const addEquipment = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      await api.post('/ot/equipment', form);
      toast.success('Equipment added');
      setShowForm(false);
      setForm({ name: '', equipmentType: 'ANESTHESIA_MACHINE', serialNumber: '', otRoomId: '', condition: 'OPERATIONAL' });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add equipment'); }
  };

  const handleSterilize = async (id: string) => {
    setSterilizing(id);
    try {
      await api.patch(`/ot/equipment/${id}/sterilize`);
      toast.success('Equipment marked as sterilized');
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Sterilization failed'); } finally { setSterilizing(null); }
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const sterilColor: Record<string, string> = {
    STERILIZED: 'bg-green-100 text-green-700',
    PENDING_STERILIZATION: 'bg-amber-100 text-amber-700',
    IN_STERILIZATION: 'bg-blue-100 text-blue-700',
    QUARANTINED: 'bg-red-100 text-red-700',
  };
  const condColor: Record<string, string> = {
    OPERATIONAL: 'bg-green-100 text-green-700',
    NEEDS_MAINTENANCE: 'bg-amber-100 text-amber-700',
    UNDER_REPAIR: 'bg-orange-100 text-orange-700',
    DECOMMISSIONED: 'bg-red-100 text-red-700',
  };

  const sterilLabel: Record<string, string> = {
    STERILIZED: 'Sterilized',
    PENDING_STERILIZATION: 'Pending Sterilization',
    IN_STERILIZATION: 'In Sterilization',
    QUARANTINED: 'Quarantined',
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="OT Equipment & Resources" subtitle="Manage Equipment, Sterilization & Staff Allocation"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> Add Equipment
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Equipment" value={equipment.length} icon={Wrench} color="#0F766E" />
        <KpiCard label="Sterilized & Ready" value={sterilized} icon={CheckCircle} color="#10B981" />
        <KpiCard label="Under Maintenance" value={maintenance} icon={AlertTriangle} color="#F59E0B" />
        <KpiCard label="Staff on Duty" value={staff.length} icon={Users} color="#3B82F6" />
      </div>

      {showForm && (
        <div className="hms-card p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Add Equipment</h3>
          <form onSubmit={addEquipment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Equipment Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.equipmentType} onChange={e => setForm(f => ({ ...f, equipmentType: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {['ANESTHESIA_MACHINE','SURGICAL_TABLE','SURGICAL_LIGHTS','ESU','LAPAROSCOPY','C_ARM','VENTILATOR','SUCTION','MONITORING','AUTOCLAVE'].map(t => <option key={t}>{t}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
              <input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">OT Room ID</label>
              <input value={form.otRoomId} onChange={e => setForm(f => ({ ...f, otRoomId: e.target.value }))} placeholder="UUID of OT Room (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
              <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {['OPERATIONAL','NEEDS_MAINTENANCE','UNDER_REPAIR','DECOMMISSIONED'].map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div className="flex items-end gap-3">
              <button type="submit" className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="hms-card p-10 text-center text-gray-400 text-sm">Loading...</div> : (
        <div className="space-y-6">
          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Equipment Inventory</h3></div>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Equipment Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Serial #</th>
                <th className="px-4 py-3">OT Room</th><th className="px-4 py-3">Sterilization</th><th className="px-4 py-3">Last Sterilized</th><th className="px-4 py-3">Next Due</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {equipment.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">No equipment found</td></tr> :
                  equipment.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{e.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.equipmentType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.serialNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.otRoom?.name || '—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sterilColor[e.sterilizationStatus] || 'bg-gray-100 text-gray-600'}`}>{sterilLabel[e.sterilizationStatus] || e.sterilizationStatus}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.lastSterilizedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.nextSterilizationDue)}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${condColor[e.condition] || 'bg-gray-100 text-gray-600'}`}>{e.condition}</span></td>
                      <td className="px-4 py-3">
                        {e.sterilizationStatus === 'STERILIZED' ? (
                          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium inline-flex items-center gap-1"><CheckCircle size={12} /> Ready</span>
                        ) : (
                          <button
                            onClick={() => handleSterilize(e.id)}
                            disabled={sterilizing === e.id}
                            className="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-medium inline-flex items-center gap-1 disabled:opacity-50 transition-colors"
                          >
                            <ShieldCheck size={12} />
                            {sterilizing === e.id ? 'Sterilizing...' : 'Sterilize'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="hms-card">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Staff on Duty Today</h3></div>
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Staff Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Assigned OT</th><th className="px-4 py-3">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {staff.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No staff on duty</td></tr> :
                  staff.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.role}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.assignedOT || '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">{s.status || 'ON_DUTY'}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
