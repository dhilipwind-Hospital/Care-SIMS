import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pill, Package, TrendingDown, X, Barcode, ClipboardList, CheckCircle } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import ExportButton from '../../components/ui/ExportButton';
import api from '../../lib/api';
import { formatTime, formatDate } from '../../lib/format';

const STATUS_BADGE: Record<string, string> = {
  SENT_TO_PHARMACY: 'bg-amber-100 text-amber-700',
  PENDING:          'bg-amber-100 text-amber-700',
  READY:            'bg-blue-100 text-blue-700',
  DISPENSED:        'bg-green-100 text-green-700',
  URGENT:           'bg-red-100 text-red-700',
  ON_HOLD:          'bg-gray-100 text-gray-600',
};

export default function PharmacyPage() {
  const [drugs,         setDrugs]         = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<'dispense'|'inventory'>('dispense');
  const [selectedRx,    setSelectedRx]    = useState<any>(null);
  const [selectedDrug,  setSelectedDrug]  = useState<any>(null);
  const [pharmNotes,    setPharmNotes]    = useState('');
  const [dispensing,    setDispensing]    = useState(false);
  const [dispensed,     setDispensed]     = useState<Record<string, boolean>>({});
  const [queueFilter,   setQueueFilter]   = useState<'all'|'pending'|'ready'>('all');
  const [revenueToday,  setRevenueToday]  = useState<string>('--');
  const [rxPage,        setRxPage]        = useState(1);
  const [rxTotal,       setRxTotal]       = useState(0);
  const [drugPage,      setDrugPage]      = useState(1);
  const [drugTotal,     setDrugTotal]     = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [drugsRes, rxRes] = await Promise.all([
        api.get('/pharmacy/drugs', { params: { page: drugPage, limit: 20 } }),
        api.get('/prescriptions', { params: { page: rxPage, limit: 20 } }),
      ]);
      setDrugs(drugsRes.data.data || []);
      setDrugTotal(drugsRes.data.meta?.total || 0);
      setRxTotal(rxRes.data.meta?.total || 0);

      // Fetch pharmacy revenue
      api.get('/reports/dashboard').then(({ data }) => {
        const rev = data?.pharmacyRevenue ?? data?.todayRevenue ?? 0;
        setRevenueToday(`₹${Number(rev).toLocaleString('en-IN')}`);
      }).catch((err) => { console.error('Failed to fetch pharmacy revenue:', err); });
      const all: any[] = rxRes.data.data || [];
      const pending = all.filter((r: any) =>
        ['SENT_TO_PHARMACY','PENDING','READY','URGENT'].includes(r.status)
      );
      setPrescriptions(pending);
      if (!selectedRx && pending.length > 0) setSelectedRx(pending[0]);
    } catch (err) { toast.error('Operation failed'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [rxPage, drugPage]);

  const lowStock    = drugs.filter(d => d.batches?.some((b: any) => b.quantityInStock < 20)).length;
  const dispensedToday = Object.keys(dispensed).length;
  const outOfStock  = drugs.filter(d => {
    const total = d.batches?.reduce((s: number, b: any) => s + b.quantityInStock, 0) || 0;
    return total === 0;
  }).length;

  const handleDispense = async () => {
    if (!selectedRx) return;
    setDispensing(true);
    try {
      await api.post(`/pharmacy/prescriptions/${selectedRx.id}/dispense`, { notes: pharmNotes });
      setDispensed(d => ({ ...d, [selectedRx.id]: true }));
      setPharmNotes('');
      toast.success('Prescription dispensed');
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to dispense'); }
    finally { setDispensing(false); }
  };

  const handleHold = async () => {
    if (!selectedRx) return;
    try {
      await api.patch(`/prescriptions/${selectedRx.id}/status`, { status: 'ON_HOLD' });
      toast.success('Prescription placed on hold');
      fetchData();
    } catch (err) { toast.error('Operation failed'); }
  };

  const handleReject = async () => {
    if (!selectedRx) return;
    try {
      await api.patch(`/prescriptions/${selectedRx.id}/status`, { status: 'REJECTED' });
      toast.success('Prescription rejected');
      fetchData();
    } catch (err) { toast.error('Operation failed'); }
  };

  const filteredRx = prescriptions.filter(rx => {
    if (queueFilter === 'pending') return ['SENT_TO_PHARMACY','PENDING'].includes(rx.status);
    if (queueFilter === 'ready')   return rx.status === 'READY';
    return true;
  });

  const totalAmount = selectedRx?.medications?.reduce((sum: number, m: any) => {
    return sum + (m.pricePerUnit || 0) * (m.quantity || 1);
  }, 0);

  return (
    <div className="p-6 space-y-5">
      <TopBar
        title="Pharmacy Dispense"
        subtitle="Prescription queue &amp; medication dispensing"
        actions={
          <div className="flex gap-2">
            <ExportButton endpoint="/pharmacy/drugs/export" filename={`pharmacy-${new Date().toISOString().slice(0, 10)}.csv`} />
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 font-medium">
              <Barcode size={14} /> Scan Barcode
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <ClipboardList size={14} /> + Manual Entry
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Pending Rx" value={prescriptions.length} icon={Package} color="#F59E0B"
          sub={prescriptions.length === 1 ? '1 urgent' : `${prescriptions.length} total`} />
        <KpiCard label="Dispensed Today" value={dispensedToday} icon={CheckCircle} color="#10B981"
          sub="Already dispensed" />
        <KpiCard label="Low / Out of Stock" value={lowStock + outOfStock} icon={TrendingDown} color="#EF4444"
          sub={`${outOfStock} critical items`} />
        <KpiCard label="Revenue Today" value={revenueToday} icon={Pill} color="#0F766E"
          sub="Pharmacy billing" />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
        {([['dispense','Dispense'],['inventory','Inventory']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === val ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dispense' && (
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Left: Prescription Queue */}
          <div className="flex-1 hms-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Prescription Queue</h3>
              <div className="flex gap-1">
                {([['all','All'],['pending','Pending'],['ready','Ready']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => { setQueueFilter(val); setRxPage(1); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      queueFilter === val
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {['Rx #','Patient','Doctor','Items','Status','Time'].map(h => (
                      <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                  ) : filteredRx.length === 0 ? (
                    <tr><td colSpan={6} className="p-0"><EmptyState title="No prescriptions" description="No prescriptions to display." /></td></tr>
                  ) : filteredRx.map(rx => (
                    <tr
                      key={rx.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRx(rx)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRx(rx); } }}
                      className={`cursor-pointer transition-colors ${
                        selectedRx?.id === rx.id
                          ? 'bg-teal-50 border-l-4 border-l-teal-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-teal-700">{rx.prescriptionNumber || rx.id?.slice(0,8)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{rx.patient?.firstName} {rx.patient?.lastName}</div>
                        <div className="text-xs text-gray-400">{rx.patient?.patientId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {rx.doctor ? `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName?.[0] || ''}.` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {rx.medications?.length || 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          STATUS_BADGE[rx.status] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {rx.status === 'SENT_TO_PHARMACY' ? 'Pending' : rx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {rx.createdAt ? formatTime(rx.createdAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={rxPage} totalPages={Math.ceil(rxTotal / 20)} onPageChange={setRxPage} totalItems={rxTotal} pageSize={20} />
          </div>

          {/* Right: Selected Prescription + Dispense Actions */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4">

            {/* Selected Prescription */}
            <div className="hms-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">Selected Prescription</span>
                {selectedRx && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedRx.status === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedRx.status === 'SENT_TO_PHARMACY' ? 'Rx Hold' : selectedRx.status}
                  </span>
                )}
              </div>
              {selectedRx ? (
                <div className="p-5 space-y-4">
                  {/* Patient + Doctor */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Patient</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRx.patient?.firstName} {selectedRx.patient?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Doctor</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedRx.doctor ? `Dr. ${selectedRx.doctor.firstName}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Date</p>
                      <p className="text-sm text-gray-700">
                        {selectedRx.createdAt ? formatDate(selectedRx.createdAt) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Priority</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
                        {selectedRx.status === 'URGENT' ? 'High' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  {/* Medications List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Prescribed Medications</p>
                      <span className="text-xs text-gray-400">{selectedRx.medications?.length || 0} items</span>
                    </div>
                    {selectedRx.medications?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedRx.medications.map((med: any, i: number) => {
                          const drug = drugs.find(d => d.id === med.drugId || d.genericName?.toLowerCase() === med.medicationName?.toLowerCase());
                          const stock = drug?.batches?.reduce((s: number, b: any) => s + b.quantityInStock, 0) || 0;
                          const stockBadge = !drug
                            ? 'bg-yellow-100 text-yellow-700'
                            : stock === 0
                              ? 'bg-red-100 text-red-700'
                              : stock < 20
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700';
                          const stockLabel = !drug ? 'No Stock' : stock === 0 ? 'Out' : stock < 20 ? 'Low Stock' : 'In Stock';
                          return (
                            <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900">{med.medicationName || med.name || `Med ${i+1}`}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${stockBadge}`}>{stockLabel}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                              </p>
                              {med.instructions && (
                                <p className="text-xs text-gray-400 mt-0.5">{med.instructions}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-400 text-center">Select a prescription to view medications</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 text-sm">Select a prescription from the queue</div>
              )}
            </div>

            {/* Dispense Actions */}
            <div className="hms-card p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Dispense Actions</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pharmacist Notes</label>
                <textarea
                  value={pharmNotes}
                  onChange={e => setPharmNotes(e.target.value)}
                  rows={3}
                  placeholder="Add dispensing instructions or notes…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-gray-500">Total Amount</span>
                <span className="font-bold text-gray-900">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
              </div>
              <button
                onClick={handleDispense}
                disabled={!selectedRx || dispensing || dispensed[selectedRx?.id]}
                className="w-full py-2.5 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                {dispensed[selectedRx?.id] ? (
                  <><CheckCircle size={15} /> Dispensed</>
                ) : dispensing ? 'Dispensing…' : (
                  <><Pill size={14} /> Dispense Medications</>
                )}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleHold}
                  disabled={!selectedRx}
                  className="py-2 rounded-lg border border-gray-200 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-40"
                >
                  Hold
                </button>
                <button
                  onClick={handleReject}
                  disabled={!selectedRx}
                  className="py-2 rounded-lg border border-red-200 text-sm text-red-600 font-medium hover:bg-red-50 transition-all disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="hms-card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Drug Inventory</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Drug Name','Generic','Form','Schedule','Stock','Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                ) : drugs.length === 0 ? (
                  <tr><td colSpan={6} className="p-0"><EmptyState title="No drugs registered" description="No drugs found in inventory." /></td></tr>
                ) : drugs.map(d => {
                  const totalStock = d.batches?.reduce((s: number, b: any) => s + b.quantityInStock, 0) || 0;
                  const isLow = totalStock < 20;
                  return (
                    <tr key={d.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.brandName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.genericName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.dosageForm}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{d.scheduleClass || 'OTC'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{totalStock}</span>
                        {isLow && <span className="ml-2 text-xs text-red-500">Low</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedDrug(d)} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 font-medium">View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={drugPage} totalPages={Math.ceil(drugTotal / 20)} onPageChange={setDrugPage} totalItems={drugTotal} pageSize={20} />
        </div>
      )}
      {/* Drug detail panel */}
      {selectedDrug && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedDrug(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">{selectedDrug.brandName}</h2>
                <p className="text-xs text-gray-400">{selectedDrug.genericName} · {selectedDrug.dosageForm}</p>
              </div>
              <button onClick={() => setSelectedDrug(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[['Manufacturer', selectedDrug.manufacturer || '—'], ['Schedule', selectedDrug.scheduleClass || 'OTC'], ['Strength', selectedDrug.strength || '—'], ['Unit', selectedDrug.unitOfMeasure || '—']].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                    <p className="font-semibold text-sm text-gray-900">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Stock Batches</p>
                {selectedDrug.batches?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDrug.batches.map((b: any) => (
                      <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                        b.quantityInStock < 20 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                      }`}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Batch {b.batchNumber}</p>
                          <p className="text-xs text-gray-500">Exp: {b.expiryDate ? formatDate(b.expiryDate) : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${b.quantityInStock < 20 ? 'text-red-600' : 'text-gray-900'}`}>{b.quantityInStock}</p>
                          <p className="text-xs text-gray-400">units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No batch data available</p>
                )}
              </div>
              <div className="p-4 bg-teal-50 rounded-xl">
                <p className="text-xs text-gray-500">Total Stock</p>
                <p className="text-2xl font-black text-teal-700">
                  {selectedDrug.batches?.reduce((s: number, b: any) => s + b.quantityInStock, 0) || 0}
                  <span className="text-sm font-normal text-teal-500 ml-1">units</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
