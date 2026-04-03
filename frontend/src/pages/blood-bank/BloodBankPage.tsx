import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Droplets, Users, Package, Activity, Eye, Syringe, Search, AlertTriangle, X } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

// ─── Helpers ────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const defaultExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + 35);
  return d.toISOString().slice(0, 10);
};
const isExpiringSoon = (dt: string) => {
  const diff = (new Date(dt).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 7;
};

export default function BloodBankPage() {
  const [tab, setTab] = useState<'donors' | 'inventory' | 'transfusions'>('donors');
  const [donors, setDonors] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, byGroup: {} });
  const [inventory, setInventory] = useState<any[]>([]);
  const [transfusions, setTransfusions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Donor registration form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE', bloodGroup: 'A', rhFactor: 'POSITIVE', phone: '', locationId: '' });
  const [formError, setFormError] = useState('');

  // Donor detail modal
  const [donorDetail, setDonorDetail] = useState<any>(null);
  const [showDonorDetail, setShowDonorDetail] = useState(false);
  const [donorDetailLoading, setDonorDetailLoading] = useState(false);

  // Donation form modal
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [donationDonor, setDonationDonor] = useState<any>(null);
  const [donationForm, setDonationForm] = useState({ bagNumber: '', volumeMl: '450', donationDate: today(), expiryDate: defaultExpiry(), notes: '' });
  const [donationError, setDonationError] = useState('');
  const [donationSubmitting, setDonationSubmitting] = useState(false);

  // Inventory filters
  const [invGroupFilter, setInvGroupFilter] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('');

  // Transfusion order form
  const [showTransfusionForm, setShowTransfusionForm] = useState(false);
  const [transfusionForm, setTransfusionForm] = useState({
    patientId: '', admissionId: '', bagNumber: '', component: 'WHOLE_BLOOD',
    bloodGroup: 'A', rhFactor: 'POSITIVE', volumeMl: '450', orderedById: '', locationId: '',
  });
  const [transfusionError, setTransfusionError] = useState('');
  const [transfusionSubmitting, setTransfusionSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Crossmatch modal
  const [showCrossmatchModal, setShowCrossmatchModal] = useState(false);
  const [crossmatchId, setCrossmatchId] = useState('');
  const [crossmatchSubmitting, setCrossmatchSubmitting] = useState(false);

  // Administer modal
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [administerId, setAdministerId] = useState('');
  const [administerForm, setAdministerForm] = useState({ reaction: '', reactionDetails: '' });
  const [administerSubmitting, setAdministerSubmitting] = useState(false);

  // Escape key to close modals
  useEscapeClose(showForm, () => setShowForm(false));
  useEscapeClose(showDonorDetail, () => setShowDonorDetail(false));
  useEscapeClose(showDonationForm, () => setShowDonationForm(false));
  useEscapeClose(showTransfusionForm, () => { setShowTransfusionForm(false); setSelectedPatient(null); setPatientSearch(''); setPatients([]); });
  useEscapeClose(showCrossmatchModal, () => setShowCrossmatchModal(false));
  useEscapeClose(showAdministerModal, () => setShowAdministerModal(false));

  // ─── Data fetching ────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        api.get('/blood-bank/donors'),
        api.get('/blood-bank/inventory/summary'),
      ]);
      setDonors(d.data.data || d.data || []);
      setSummary(s.data.data || s.data || { total: 0, byGroup: {} });
    } catch (err) {
      console.error('Failed to load blood bank data:', err);
      toast.error('Failed to load blood bank data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const params: any = {};
      if (invGroupFilter) params.bloodGroup = invGroupFilter;
      if (invStatusFilter) params.status = invStatusFilter;
      const { data } = await api.get('/blood-bank/inventory', { params });
      setInventory(data.data || data || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      toast.error('Failed to load inventory');
    }
  };

  const fetchTransfusions = async () => {
    try {
      const { data } = await api.get('/blood-bank/transfusions');
      setTransfusions(data.data || data || []);
    } catch (err) {
      console.error('Failed to load transfusions:', err);
      toast.error('Failed to load transfusions');
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (tab === 'inventory') fetchInventory(); }, [tab, invGroupFilter, invStatusFilter]);
  useEffect(() => { if (tab === 'transfusions') fetchTransfusions(); }, [tab]);

  // Patient search debounce
  const searchPatients = async (q: string) => {
    if (!q || q.length < 2) { setPatients([]); return; }
    setPatientLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { q, limit: 8 } });
      setPatients(data.data || data || []);
    } catch (err) {
      console.error('Failed to search patients:', err);
      setPatients([]);
    } finally {
      setPatientLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // ─── Handlers ─────────────────────────────────────────────────────
  const handleAddDonor = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { setFormError('First and last name are required'); return; }
    if (form.phone.trim() && !/^[6-9]\d{9}$/.test(form.phone.trim())) { setFormError('Enter a valid 10-digit Indian mobile number'); return; }
    setFormError('');
    try {
      await api.post('/blood-bank/donors', form);
      toast.success('Donor registered successfully');
      setShowForm(false);
      setForm({ firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE', bloodGroup: 'A', rhFactor: 'POSITIVE', phone: '', locationId: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to register donor:', err);
      toast.error('Failed to register donor');
    }
  };

  const handleViewDonor = async (id: string) => {
    setDonorDetailLoading(true);
    setShowDonorDetail(true);
    try {
      const { data } = await api.get(`/blood-bank/donors/${id}`);
      setDonorDetail(data.data || data);
    } catch (err) {
      console.error('Failed to load donor details:', err);
      toast.error('Failed to load donor details');
      setShowDonorDetail(false);
    } finally {
      setDonorDetailLoading(false);
    }
  };

  const openDonationForm = (donor: any) => {
    setDonationDonor(donor);
    setDonationForm({ bagNumber: '', volumeMl: '450', donationDate: today(), expiryDate: defaultExpiry(), notes: '' });
    setDonationError('');
    setShowDonationForm(true);
  };

  const handleRecordDonation = async () => {
    if (!donationForm.bagNumber.trim()) { setDonationError('Bag number is required'); return; }
    if (!donationForm.volumeMl || Number(donationForm.volumeMl) <= 0) { setDonationError('Volume must be greater than 0'); return; }
    if (!donationForm.expiryDate) { setDonationError('Expiry date is required'); return; }
    setDonationError('');
    setDonationSubmitting(true);
    try {
      await api.post('/blood-bank/donations', {
        donorId: donationDonor.id,
        locationId: donationDonor.locationId || '',
        bloodGroup: donationDonor.bloodGroup,
        rhFactor: donationDonor.rhFactor,
        bagNumber: donationForm.bagNumber,
        volumeMl: Number(donationForm.volumeMl),
        donationDate: donationForm.donationDate,
        expiryDate: donationForm.expiryDate,
        notes: donationForm.notes,
      });
      toast.success('Donation recorded successfully');
      setShowDonationForm(false);
      fetchData();
    } catch (err) {
      console.error('Failed to record donation:', err);
      toast.error('Failed to record donation');
    } finally {
      setDonationSubmitting(false);
    }
  };

  const handleOrderTransfusion = async () => {
    if (!transfusionForm.patientId) { setTransfusionError('Patient is required'); return; }
    if (!transfusionForm.bagNumber.trim()) { setTransfusionError('Bag number is required'); return; }
    if (!transfusionForm.volumeMl || Number(transfusionForm.volumeMl) <= 0) { setTransfusionError('Volume must be greater than 0'); return; }
    setTransfusionError('');
    setTransfusionSubmitting(true);
    try {
      await api.post('/blood-bank/transfusions', {
        ...transfusionForm,
        volumeMl: Number(transfusionForm.volumeMl),
      });
      toast.success('Transfusion order placed');
      setShowTransfusionForm(false);
      setTransfusionForm({ patientId: '', admissionId: '', bagNumber: '', component: 'WHOLE_BLOOD', bloodGroup: 'A', rhFactor: 'POSITIVE', volumeMl: '450', orderedById: '', locationId: '' });
      setSelectedPatient(null);
      setPatientSearch('');
      fetchTransfusions();
    } catch (err) {
      console.error('Failed to place transfusion order:', err);
      toast.error('Failed to place transfusion order');
    } finally {
      setTransfusionSubmitting(false);
    }
  };

  const handleCrossmatch = async () => {
    setCrossmatchSubmitting(true);
    try {
      await api.patch(`/blood-bank/transfusions/${crossmatchId}/crossmatch`);
      toast.success('Crossmatch verified');
      setShowCrossmatchModal(false);
      fetchTransfusions();
    } catch (err) {
      console.error('Failed to verify crossmatch:', err);
      toast.error('Failed to verify crossmatch');
    } finally {
      setCrossmatchSubmitting(false);
    }
  };

  const handleAdminister = async () => {
    setAdministerSubmitting(true);
    try {
      await api.patch(`/blood-bank/transfusions/${administerId}/administer`, administerForm);
      toast.success('Transfusion administration started');
      setShowAdministerModal(false);
      setAdministerForm({ reaction: '', reactionDetails: '' });
      fetchTransfusions();
    } catch (err) {
      console.error('Failed to start administration:', err);
      toast.error('Failed to start administration');
    } finally {
      setAdministerSubmitting(false);
    }
  };

  // ─── Modal component ────────────────────────────────────────────
  const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b">
            <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    );
  };

  // ─── Pagination helpers ──────────────────────────────────────────
  const PAGE_SIZE = 20;
  const paginate = (arr: any[]) => arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Blood Bank" subtitle="Manage donors, inventory and transfusions" />

      {/* KPI Cards */}
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Donors" value={donors.length} icon={Users} color="#3B82F6" />
          <KpiCard label="Available Units" value={summary.total} icon={Package} color="#10B981" />
          <KpiCard label="Blood Groups" value={Object.keys(summary.byGroup || {}).length} icon={Droplets} color="#EF4444" />
          <KpiCard label="Donations" value={donors.reduce((s: number, d: any) => s + (d.totalDonations || 0), 0)} icon={Activity} color="#F59E0B" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['donors', 'inventory', 'transfusions'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${tab === t ? 'text-white' : 'border text-gray-600'}`}
            style={tab === t ? { background: 'var(--accent)' } : {}}>
            {t}
          </button>
        ))}
        {tab === 'donors' && (
          <button onClick={() => setShowForm(!showForm)} className="ml-auto px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Add Donor</button>
        )}
        {tab === 'transfusions' && (
          <button onClick={() => { setShowTransfusionForm(true); setTransfusionError(''); }} className="ml-auto px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Order Transfusion</button>
        )}
      </div>

      {/* ════════════════════════ DONORS TAB ════════════════════════ */}
      {tab === 'donors' && (
        <>
          {/* Add donor form */}
          {showForm && (
            <div className="hms-card p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Register Donor</h3>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="grid grid-cols-3 gap-4">
                <input className="hms-input" placeholder="First Name *" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                <input className="hms-input" placeholder="Last Name *" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                <input className="hms-input" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
                <select className="hms-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
                <select className="hms-input" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option></select>
                <select className="hms-input" value={form.rhFactor} onChange={e => setForm({ ...form, rhFactor: e.target.value })}><option value="POSITIVE">Rh+</option><option value="NEGATIVE">Rh-</option></select>
                <input className="hms-input" placeholder="Phone *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddDonor} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Save</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          {/* Donors table */}
          <div className="hms-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--surface)' }}>
                  <th className="text-left p-3 font-medium text-gray-600">Donor ID</th>
                  <th className="text-left p-3 font-medium text-gray-600">Name</th>
                  <th className="text-left p-3 font-medium text-gray-600">Blood Group</th>
                  <th className="text-left p-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left p-3 font-medium text-gray-600">Donations</th>
                  <th className="text-left p-3 font-medium text-gray-600">Last Donation</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={8} />)}</>
                ) : donors.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon={<Droplets size={24} className="text-gray-400" />} title="No donors registered" description="Register a donor to get started" /></td></tr>
                ) : paginate(donors).map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-teal-700">{d.donorId}</td>
                    <td className="p-3">{d.firstName} {d.lastName}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {d.bloodGroup}{d.rhFactor === 'POSITIVE' ? '+' : '-'}
                      </span>
                    </td>
                    <td className="p-3">{d.phone}</td>
                    <td className="p-3">{d.totalDonations || 0}</td>
                    <td className="p-3">{d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : '\u2014'}</td>
                    <td className="p-3"><StatusBadge status={d.status || 'ACTIVE'} /></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleViewDonor(d.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="View Details">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => openDonationForm(d)} className="p-1.5 rounded-lg hover:bg-gray-100 text-teal-600" title="Record Donation">
                          <Syringe size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={Math.ceil(donors.length / PAGE_SIZE)} onPageChange={setPage} totalItems={donors.length} pageSize={PAGE_SIZE} />
          </div>
        </>
      )}

      {/* ════════════════════════ INVENTORY TAB ════════════════════════ */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="hms-card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Blood Inventory by Group</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(summary.byGroup || {}).map(([group, count]) => (
                <div key={group} className="p-4 rounded-lg border text-center">
                  <div className="text-2xl font-bold text-red-600">{count as number}</div>
                  <div className="text-sm text-gray-500 mt-1">{group}</div>
                </div>
              ))}
              {Object.keys(summary.byGroup || {}).length === 0 && (
                <div className="col-span-4"><EmptyState icon={<Package size={24} className="text-gray-400" />} title="No inventory data" description="Blood units will appear after donations are processed" /></div>
              )}
            </div>
          </div>

          {/* Detailed inventory table */}
          <div className="hms-card overflow-hidden">
            <div className="p-4 border-b flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Blood Bags</h3>
              <select className="hms-input w-auto text-sm" value={invGroupFilter} onChange={e => { setInvGroupFilter(e.target.value); setPage(1); }}>
                <option value="">All Groups</option>
                <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
              </select>
              <select className="hms-input w-auto text-sm" value={invStatusFilter} onChange={e => { setInvStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option><option value="RESERVED">Reserved</option><option value="ISSUED">Issued</option><option value="EXPIRED">Expired</option>
              </select>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--surface)' }}>
                  <th className="text-left p-3 font-medium text-gray-600">Bag Number</th>
                  <th className="text-left p-3 font-medium text-gray-600">Blood Group</th>
                  <th className="text-left p-3 font-medium text-gray-600">Component</th>
                  <th className="text-left p-3 font-medium text-gray-600">Volume (ml)</th>
                  <th className="text-left p-3 font-medium text-gray-600">Collection Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Expiry Date</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={<Package size={24} className="text-gray-400" />} title="No blood bags found" description="Adjust filters or record donations to add inventory" /></td></tr>
                ) : paginate(inventory).map(bag => (
                  <tr key={bag.id} className={`border-b hover:bg-gray-50 ${isExpiringSoon(bag.expiryDate) ? 'bg-amber-50' : ''}`}>
                    <td className="p-3 font-medium text-teal-700">{bag.bagNumber}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {bag.bloodGroup}{bag.rhFactor === 'POSITIVE' ? '+' : '-'}
                      </span>
                    </td>
                    <td className="p-3">{(bag.component || '').replace(/_/g, ' ')}</td>
                    <td className="p-3">{bag.volumeMl}</td>
                    <td className="p-3">{new Date(bag.collectionDate).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 ${isExpiringSoon(bag.expiryDate) ? 'text-amber-600 font-medium' : ''}`}>
                        {isExpiringSoon(bag.expiryDate) && <AlertTriangle size={13} />}
                        {new Date(bag.expiryDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3"><StatusBadge status={bag.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={Math.ceil(inventory.length / PAGE_SIZE)} onPageChange={setPage} totalItems={inventory.length} pageSize={PAGE_SIZE} />
          </div>
        </div>
      )}

      {/* ════════════════════════ TRANSFUSIONS TAB ════════════════════════ */}
      {tab === 'transfusions' && (
        <div className="hms-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ background: 'var(--surface)' }}>
                <th className="text-left p-3 font-medium text-gray-600">Patient ID</th>
                <th className="text-left p-3 font-medium text-gray-600">Bag Number</th>
                <th className="text-left p-3 font-medium text-gray-600">Blood Group</th>
                <th className="text-left p-3 font-medium text-gray-600">Component</th>
                <th className="text-left p-3 font-medium text-gray-600">Volume (ml)</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Ordered</th>
                <th className="text-left p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfusions.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={<Syringe size={24} className="text-gray-400" />} title="No transfusion orders" description="Place a transfusion order to get started" /></td></tr>
              ) : paginate(transfusions).map(tx => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-teal-700">{tx.patientId?.slice(0, 8) || '\u2014'}</td>
                  <td className="p-3">{tx.bagNumber}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      {tx.bloodGroup}{tx.rhFactor === 'POSITIVE' ? '+' : '-'}
                    </span>
                  </td>
                  <td className="p-3">{(tx.component || '').replace(/_/g, ' ')}</td>
                  <td className="p-3">{tx.volumeMl}</td>
                  <td className="p-3"><StatusBadge status={tx.status} /></td>
                  <td className="p-3">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {tx.status === 'ORDERED' && (
                        <button onClick={() => { setCrossmatchId(tx.id); setShowCrossmatchModal(true); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">
                          Crossmatch
                        </button>
                      )}
                      {tx.status === 'CROSS_MATCHED' && (
                        <button onClick={() => { setAdministerId(tx.id); setAdministerForm({ reaction: '', reactionDetails: '' }); setShowAdministerModal(true); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                          Administer
                        </button>
                      )}
                      {!['ORDERED', 'CROSS_MATCHED'].includes(tx.status) && (
                        <span className="text-xs text-gray-400">\u2014</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(transfusions.length / PAGE_SIZE)} onPageChange={setPage} totalItems={transfusions.length} pageSize={PAGE_SIZE} />
        </div>
      )}

      {/* ════════════════════════ MODALS ════════════════════════ */}

      {/* Donor Detail Modal */}
      <Modal open={showDonorDetail} onClose={() => setShowDonorDetail(false)} title="Donor Details">
        {donorDetailLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : donorDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Donor ID:</span> <span className="font-medium">{donorDetail.donorId}</span></div>
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{donorDetail.firstName} {donorDetail.lastName}</span></div>
              <div><span className="text-gray-500">Blood Group:</span> <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{donorDetail.bloodGroup}{donorDetail.rhFactor === 'POSITIVE' ? '+' : '-'}</span></div>
              <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{donorDetail.gender}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{donorDetail.phone || '\u2014'}</span></div>
              <div><span className="text-gray-500">Date of Birth:</span> <span className="font-medium">{donorDetail.dateOfBirth ? new Date(donorDetail.dateOfBirth).toLocaleDateString() : '\u2014'}</span></div>
              <div><span className="text-gray-500">Total Donations:</span> <span className="font-medium">{donorDetail.totalDonations || 0}</span></div>
              <div><span className="text-gray-500">Last Donation:</span> <span className="font-medium">{donorDetail.lastDonationDate ? new Date(donorDetail.lastDonationDate).toLocaleDateString() : '\u2014'}</span></div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={donorDetail.status || 'ACTIVE'} /></div>
            </div>
            {/* Donation history */}
            {donorDetail.donations && donorDetail.donations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Donation History</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2 font-medium text-gray-600">Donation #</th>
                        <th className="text-left p-2 font-medium text-gray-600">Bag</th>
                        <th className="text-left p-2 font-medium text-gray-600">Date</th>
                        <th className="text-left p-2 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donorDetail.donations.map((dn: any) => (
                        <tr key={dn.id} className="border-b">
                          <td className="p-2 font-medium">{dn.donationNumber}</td>
                          <td className="p-2">{dn.bagNumber}</td>
                          <td className="p-2">{new Date(dn.collectionDate || dn.createdAt).toLocaleDateString()}</td>
                          <td className="p-2"><StatusBadge status={dn.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Record Donation Modal */}
      <Modal open={showDonationForm} onClose={() => setShowDonationForm(false)} title="Record Donation">
        {donationDonor && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <span className="font-medium">{donationDonor.firstName} {donationDonor.lastName}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {donationDonor.bloodGroup}{donationDonor.rhFactor === 'POSITIVE' ? '+' : '-'}
              </span>
            </div>
            {donationError && <p className="text-sm text-red-600">{donationError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bag Number *</label>
                <input className="hms-input" placeholder="e.g. BAG-001" value={donationForm.bagNumber} onChange={e => setDonationForm({ ...donationForm, bagNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Volume (ml)</label>
                <input className="hms-input" type="number" value={donationForm.volumeMl} onChange={e => setDonationForm({ ...donationForm, volumeMl: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Donation Date</label>
                <input className="hms-input" type="date" value={donationForm.donationDate} onChange={e => setDonationForm({ ...donationForm, donationDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date *</label>
                <input className="hms-input" type="date" value={donationForm.expiryDate} onChange={e => setDonationForm({ ...donationForm, expiryDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea className="hms-input" rows={2} placeholder="Optional notes..." value={donationForm.notes} onChange={e => setDonationForm({ ...donationForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleRecordDonation} disabled={donationSubmitting} className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ background: 'var(--accent)' }}>
                {donationSubmitting ? 'Saving...' : 'Record Donation'}
              </button>
              <button onClick={() => setShowDonationForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Order Transfusion Modal */}
      <Modal open={showTransfusionForm} onClose={() => { setShowTransfusionForm(false); setSelectedPatient(null); setPatientSearch(''); setPatients([]); }} title="Order Blood Transfusion">
        <div className="space-y-4">
          {transfusionError && <p className="text-sm text-red-600">{transfusionError}</p>}

          {/* Patient search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Patient *</label>
            {selectedPatient ? (
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                <span className="text-gray-400">{selectedPatient.patientId}</span>
                <button onClick={() => { setSelectedPatient(null); setTransfusionForm(f => ({ ...f, patientId: '' })); setPatientSearch(''); }}
                  className="ml-auto p-1 hover:bg-gray-200 rounded"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Search by name, phone or patient ID..."
                  className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {(patients.length > 0 || patientLoading) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 max-h-48 overflow-y-auto">
                    {patientLoading ? <div className="p-3 text-sm text-gray-400">Searching...</div> : patients.map(p => (
                      <button key={p.id} type="button" onClick={() => {
                        setSelectedPatient(p);
                        setTransfusionForm(f => ({ ...f, patientId: p.id }));
                        setPatients([]);
                        setPatientSearch('');
                      }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                        <span className="font-medium">{p.firstName} {p.lastName}</span>
                        <span className="text-gray-400 ml-2">{p.patientId} {p.phone ? `\u00b7 ${p.phone}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bag Number *</label>
              <input className="hms-input" placeholder="e.g. BAG-001" value={transfusionForm.bagNumber} onChange={e => setTransfusionForm({ ...transfusionForm, bagNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Component</label>
              <select className="hms-input" value={transfusionForm.component} onChange={e => setTransfusionForm({ ...transfusionForm, component: e.target.value })}>
                <option value="WHOLE_BLOOD">Whole Blood</option>
                <option value="PACKED_RBC">Packed RBC</option>
                <option value="PLATELETS">Platelets</option>
                <option value="FFP">FFP</option>
                <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
              <select className="hms-input" value={transfusionForm.bloodGroup} onChange={e => setTransfusionForm({ ...transfusionForm, bloodGroup: e.target.value })}>
                <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rh Factor</label>
              <select className="hms-input" value={transfusionForm.rhFactor} onChange={e => setTransfusionForm({ ...transfusionForm, rhFactor: e.target.value })}>
                <option value="POSITIVE">Rh+</option><option value="NEGATIVE">Rh-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Volume (ml)</label>
              <input className="hms-input" type="number" value={transfusionForm.volumeMl} onChange={e => setTransfusionForm({ ...transfusionForm, volumeMl: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleOrderTransfusion} disabled={transfusionSubmitting} className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ background: 'var(--accent)' }}>
              {transfusionSubmitting ? 'Ordering...' : 'Place Order'}
            </button>
            <button onClick={() => { setShowTransfusionForm(false); setSelectedPatient(null); setPatientSearch(''); }} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Crossmatch Confirmation Modal */}
      <Modal open={showCrossmatchModal} onClose={() => setShowCrossmatchModal(false)} title="Verify Crossmatch">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Confirm that the crossmatch test has been performed and the blood is compatible for transfusion.</p>
          <div className="flex gap-2">
            <button onClick={handleCrossmatch} disabled={crossmatchSubmitting} className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ background: 'var(--accent)' }}>
              {crossmatchSubmitting ? 'Verifying...' : 'Confirm Compatible'}
            </button>
            <button onClick={() => setShowCrossmatchModal(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Administer Transfusion Modal */}
      <Modal open={showAdministerModal} onClose={() => setShowAdministerModal(false)} title="Administer Transfusion">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Start the blood transfusion. Record any reactions observed.</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reaction (if any)</label>
            <select className="hms-input" value={administerForm.reaction} onChange={e => setAdministerForm({ ...administerForm, reaction: e.target.value })}>
              <option value="">None</option>
              <option value="MILD">Mild</option>
              <option value="MODERATE">Moderate</option>
              <option value="SEVERE">Severe</option>
            </select>
          </div>
          {administerForm.reaction && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reaction Details</label>
              <textarea className="hms-input" rows={2} placeholder="Describe the reaction..." value={administerForm.reactionDetails} onChange={e => setAdministerForm({ ...administerForm, reactionDetails: e.target.value })} />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleAdminister} disabled={administerSubmitting} className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ background: 'var(--accent)' }}>
              {administerSubmitting ? 'Starting...' : 'Start Transfusion'}
            </button>
            <button onClick={() => setShowAdministerModal(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
