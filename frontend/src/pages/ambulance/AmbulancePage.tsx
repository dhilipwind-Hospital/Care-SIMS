import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ambulance, Truck, MapPin, CheckCircle, Printer } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

export default function AmbulancePage() {
  const [tab, setTab] = useState<'vehicles'|'trips'>('vehicles');
  const [page, setPage] = useState(1);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vForm, setVForm] = useState({ vehicleNumber: '', vehicleType: 'BLS', driverName: '', driverPhone: '' });
  const [tForm, setTForm] = useState({ ambulanceId: '', patientName: '', patientPhone: '', tripType: 'EMERGENCY', pickupAddress: '', dropAddress: '' });
  const [formError, setFormError] = useState('');

  const fetchData = async () => { setLoading(true); try { const [v, t] = await Promise.all([api.get('/ambulance/vehicles'), api.get('/ambulance/trips')]); setVehicles(v.data.data || v.data || []); setTrips(t.data.data || t.data || []); } catch (err) { toast.error('Failed to load ambulance data'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const addVehicle = async () => {
    if (!vForm.vehicleNumber.trim()) { setFormError('Vehicle number is required'); return; }
    setFormError('');
    try { await api.post('/ambulance/vehicles', vForm); toast.success('Vehicle added successfully'); setShowForm(false); setVForm({ vehicleNumber: '', vehicleType: 'BLS', driverName: '', driverPhone: '' }); fetchData(); } catch (err) { toast.error('Failed to add vehicle'); }
  };
  const dispatch = async () => {
    if (!tForm.ambulanceId) { setFormError('Please select a vehicle'); return; }
    if (!tForm.pickupAddress.trim()) { setFormError('Pickup address is required'); return; }
    setFormError('');
    try { await api.post('/ambulance/trips', tForm); toast.success('Ambulance dispatched successfully'); setShowForm(false); setTForm({ ambulanceId: '', patientName: '', patientPhone: '', tripType: 'EMERGENCY', pickupAddress: '', dropAddress: '' }); fetchData(); } catch (err) { toast.error('Failed to dispatch ambulance'); }
  };

  const arriveTrip = async (id: string) => { try { await api.patch(`/ambulance/trips/${id}/arrive`); toast.success('Arrival recorded'); fetchData(); } catch (err) { toast.error('Failed to update trip status'); } };
  const departTrip = async (id: string) => { try { await api.patch(`/ambulance/trips/${id}/depart`); toast.success('Departure recorded'); fetchData(); } catch (err) { toast.error('Failed to update trip status'); } };
  const completeTrip = async (id: string) => { try { await api.patch(`/ambulance/trips/${id}/complete`); toast.success('Trip completed'); fetchData(); } catch (err) { toast.error('Failed to complete trip'); } };

  const handlePrintDispatchReport = (r: any) => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    const dispatchId = r.id ? String(r.id).slice(0, 8) : '—';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ambulance Dispatch Report</title></head><body style="font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;">
<div style="text-align:center;margin-bottom:8px;">
  <h1 style="color:#0F766E;font-size:26px;margin:0;">AYPHEN HMS</h1>
  <h2 style="font-size:20px;margin:6px 0 4px;">AMBULANCE DISPATCH REPORT</h2>
  <hr style="border:none;border-top:2px solid #0F766E;margin:8px 0;" />
</div>
<div style="border:1px solid #D1D5DB;border-radius:8px;padding:20px;margin-bottom:20px;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;">
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Dispatch # / ID</span><div style="font-weight:600;margin-top:2px;">${r.tripNumber || dispatchId}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Call Time</span><div style="font-weight:600;margin-top:2px;">${r.callTime ? new Date(r.callTime).toLocaleString() : r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Dispatch Time</span><div style="font-weight:600;margin-top:2px;">${r.dispatchTime ? new Date(r.dispatchTime).toLocaleString() : r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Vehicle Number</span><div style="font-weight:600;margin-top:2px;">${r.vehicleNumber || r.ambulance?.vehicleNumber || '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Driver</span><div style="font-weight:600;margin-top:2px;">${r.driverName || r.ambulance?.driverName || '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Paramedic</span><div style="font-weight:600;margin-top:2px;">${r.paramedicName || r.paramedic || '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Pickup Location</span><div style="font-weight:600;margin-top:2px;">${r.pickupAddress || '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Destination</span><div style="font-weight:600;margin-top:2px;">${r.dropAddress || r.destination || '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Patient Name</span><div style="font-weight:600;margin-top:2px;">${r.patientName || '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Priority / Type</span><div style="font-weight:600;margin-top:2px;">${r.tripType || '—'}</div></div>
  </div>
</div>
<div style="border:1px solid #D1D5DB;border-radius:8px;padding:20px;margin-bottom:20px;">
  <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Trip Details</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px 24px;">
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Departure</span><div style="font-weight:600;margin-top:2px;">${r.departureTime ? new Date(r.departureTime).toLocaleString() : '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Arrival</span><div style="font-weight:600;margin-top:2px;">${r.arrivalTime ? new Date(r.arrivalTime).toLocaleString() : '—'}</div></div>
    <div><span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Total Distance (km)</span><div style="font-weight:600;margin-top:2px;">${r.distanceKm != null ? r.distanceKm : '—'}</div></div>
  </div>
</div>
<div style="margin-bottom:20px;">
  <span style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;">Status</span>
  <div style="display:inline-block;margin-top:6px;padding:4px 12px;border-radius:9999px;background:#D1FAE5;color:#065F46;font-weight:600;font-size:12px;">${r.status || '—'}</div>
</div>
${r.notes ? `<div style="margin-bottom:20px;"><div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Notes</div><div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:12px;font-size:13px;">${r.notes}</div></div>` : ''}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;">
  <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#374151;">Dispatcher</div></div>
  <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#374151;">Driver</div></div>
  <div style="text-align:center;"><div style="border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#374151;">Supervisor</div></div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Ambulance" subtitle="Fleet management and trip dispatch" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Vehicles" value={vehicles.length} icon={Ambulance} color="#3B82F6" />
          <KpiCard label="Available" value={vehicles.filter(v => v.status === 'AVAILABLE').length} icon={CheckCircle} color="#10B981" />
          <KpiCard label="On Trip" value={vehicles.filter(v => v.status === 'ON_TRIP').length} icon={Truck} color="#F59E0B" />
          <KpiCard label="Trips Today" value={trips.length} icon={MapPin} color="#8B5CF6" />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => { setTab('vehicles'); setPage(1); }} className={`px-4 py-2 rounded-lg font-medium ${tab === 'vehicles' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'vehicles' ? { background: 'var(--accent)' } : {}}>Vehicles</button>
        <button onClick={() => { setTab('trips'); setPage(1); }} className={`px-4 py-2 rounded-lg font-medium ${tab === 'trips' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'trips' ? { background: 'var(--accent)' } : {}}>Trips</button>
        <button onClick={() => setShowForm(!showForm)} className="ml-auto px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ {tab === 'vehicles' ? 'Add Vehicle' : 'Dispatch'}</button>
      </div>
      {showForm && tab === 'vehicles' && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Add Vehicle</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Vehicle Number *" value={vForm.vehicleNumber} onChange={e => setVForm({ ...vForm, vehicleNumber: e.target.value })} />
            <select className="hms-input" value={vForm.vehicleType} onChange={e => setVForm({ ...vForm, vehicleType: e.target.value })}><option value="BLS">BLS</option><option value="ALS">ALS</option><option value="PATIENT_TRANSPORT">Patient Transport</option></select>
            <input className="hms-input" placeholder="Driver Name" value={vForm.driverName} onChange={e => setVForm({ ...vForm, driverName: e.target.value })} />
            <input className="hms-input" placeholder="Driver Phone" value={vForm.driverPhone} onChange={e => setVForm({ ...vForm, driverPhone: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={addVehicle} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Save</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      {showForm && tab === 'trips' && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Dispatch Ambulance</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select className="hms-input" value={tForm.ambulanceId} onChange={e => setTForm({ ...tForm, ambulanceId: e.target.value })}><option value="">Select Vehicle *</option>{vehicles.filter(v => v.status === 'AVAILABLE').map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}</select>
            <input className="hms-input" placeholder="Patient Name" value={tForm.patientName} onChange={e => setTForm({ ...tForm, patientName: e.target.value })} />
            <select className="hms-input" value={tForm.tripType} onChange={e => setTForm({ ...tForm, tripType: e.target.value })}><option value="EMERGENCY">Emergency</option><option value="TRANSFER">Transfer</option><option value="PICKUP">Pickup</option></select>
            <input className="hms-input" placeholder="Pickup Address *" value={tForm.pickupAddress} onChange={e => setTForm({ ...tForm, pickupAddress: e.target.value })} />
            <input className="hms-input" placeholder="Drop Address *" value={tForm.dropAddress} onChange={e => setTForm({ ...tForm, dropAddress: e.target.value })} />
            <input className="hms-input" placeholder="Patient Phone" value={tForm.patientPhone} onChange={e => setTForm({ ...tForm, patientPhone: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={dispatch} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Dispatch</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}
      <div className="hms-card overflow-hidden"><table className="w-full text-sm">
        {tab === 'vehicles' ? (<><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Vehicle #</th><th className="text-left p-3 font-medium text-gray-600">Type</th><th className="text-left p-3 font-medium text-gray-600">Driver</th><th className="text-left p-3 font-medium text-gray-600">Phone</th><th className="text-left p-3 font-medium text-gray-600">Status</th></tr></thead>
        <tbody>{loading ? (
          <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}</>
        ) : vehicles.length === 0 ? (
          <tr><td colSpan={5}><EmptyState icon={<Ambulance size={24} className="text-gray-400" />} title="No vehicles registered" description="Add an ambulance to get started" /></td></tr>
        ) : vehicles.slice((page - 1) * 20, page * 20).map(v => (
          <tr key={v.id} className="border-b hover:bg-gray-50"><td className="p-3 font-medium text-teal-700">{v.vehicleNumber}</td><td className="p-3">{v.vehicleType}</td><td className="p-3">{v.driverName || '—'}</td><td className="p-3">{v.driverPhone || '—'}</td><td className="p-3"><StatusBadge status={v.status} /></td></tr>
        ))}</tbody></>) :
        (<><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Trip #</th><th className="text-left p-3 font-medium text-gray-600">Vehicle</th><th className="text-left p-3 font-medium text-gray-600">Type</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Pickup</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
        <tbody>{loading ? (
          <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
        ) : trips.length === 0 ? (
          <tr><td colSpan={7}><EmptyState icon={<MapPin size={24} className="text-gray-400" />} title="No trips dispatched" description="Dispatch an ambulance to start a trip" /></td></tr>
        ) : trips.slice((page - 1) * 20, page * 20).map(t => (
          <tr key={t.id} className={`border-b hover:bg-gray-50 ${t.tripType === 'EMERGENCY' ? 'bg-red-50/40' : ''}`}>
            <td className="p-3 font-medium text-teal-700">{t.tripNumber}</td>
            <td className="p-3">{t.ambulance?.vehicleNumber}</td>
            <td className="p-3"><StatusBadge status={t.tripType} /></td>
            <td className="p-3">{t.patientName || '—'}</td>
            <td className="p-3 max-w-[120px] truncate">{t.pickupAddress || '—'}</td>
            <td className="p-3"><StatusBadge status={t.status} /></td>
            <td className="p-3">
              <div className="flex gap-1.5 items-center">
                {t.status === 'DISPATCHED' && (
                  <button onClick={() => arriveTrip(t.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium">Arrived</button>
                )}
                {t.status === 'ARRIVED' && (
                  <button onClick={() => departTrip(t.id)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium">Depart</button>
                )}
                {t.status === 'DEPARTED' && (
                  <button onClick={() => completeTrip(t.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Complete</button>
                )}
                <button onClick={() => handlePrintDispatchReport(t)} className="p-1 rounded hover:bg-purple-50 text-purple-500 hover:text-purple-700" title="Print Dispatch Report"><Printer size={14} /></button>
              </div>
            </td>
          </tr>
        ))}</tbody></>)}
      </table>
      <Pagination page={page} totalPages={Math.ceil((tab === 'vehicles' ? vehicles.length : trips.length) / 20)} onPageChange={setPage} totalItems={tab === 'vehicles' ? vehicles.length : trips.length} pageSize={20} />
      </div>
    </div>
  );
}
