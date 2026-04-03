import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Plus, Edit2, Trash2, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const LOCATION_TYPE_COLOR: Record<string, string> = {
  MAIN:      'bg-teal-50 text-teal-700',
  BRANCH:    'bg-blue-50 text-blue-700',
  SATELLITE: 'bg-purple-50 text-purple-700',
  CAMP:      'bg-amber-50 text-amber-700',
};

const LOCATION_TYPES = ['MAIN', 'BRANCH', 'SATELLITE', 'CAMP'] as const;

interface Location {
  id: string;
  name: string;
  code?: string;
  locationCode?: string;
  type: string;
  isActive: boolean;
  phone?: string;
  email?: string;
  // Flat fields from API
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  // Legacy nested format
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pin?: string;
    country?: string;
  };
  createdAt: string;
}

const EMPTY_FORM = {
  name: '',
  code: '',
  type: 'BRANCH' as string,
  phone: '',
  email: '',
  address: { line1: '', line2: '', city: '', state: '', pin: '', country: 'India' },
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchLocations = () => {
    setLoading(true);
    api.get('/org/locations')
      .then(r => setLocations(r.data.data || r.data || []))
      .catch((err) => { console.error('Failed to load locations:', err); setLocations([]); toast.error('Failed to load locations'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLocations(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (loc: Location) => {
    setEditing(loc);
    setForm({
      name: loc.name,
      code: loc.locationCode || loc.code || '',
      type: loc.type,
      phone: loc.phone || '',
      email: loc.email || '',
      address: {
        line1: loc.addressLine1 || loc.address?.line1 || '',
        line2: loc.addressLine2 || loc.address?.line2 || '',
        city: loc.city || loc.address?.city || '',
        state: loc.state || loc.address?.state || '',
        pin: loc.pinCode || loc.address?.pin || '',
        country: loc.country || loc.address?.country || 'India',
      },
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) { setError('Location name is required.'); return; }
    if (!form.type) { setError('Location type is required.'); return; }
    if (form.phone && !/^[+]?\d[\d\s\-()]{6,}$/.test(form.phone.trim())) {
      setError('Please enter a valid phone number.'); return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.'); return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/org/locations/${editing.id}`, form);
        toast.success('Location updated successfully');
      } else {
        await api.post('/org/locations', form);
        toast.success('Location added successfully');
      }
      setShowModal(false);
      fetchLocations();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save location');
      toast.error(err.response?.data?.message || 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (loc: Location) => {
    try {
      await api.patch(`/org/locations/${loc.id}`, { isActive: !loc.isActive });
      toast.success(`Location ${loc.isActive ? 'deactivated' : 'activated'}`);
      fetchLocations();
    } catch (err) { toast.error('Failed to toggle location status'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/org/locations/${id}`);
      toast.success('Location deleted');
      setDeleteConfirm(null);
      fetchLocations();
    } catch (err) { toast.error('Failed to delete location'); }
  };

  const mainCount = locations.filter(l => l.type === 'MAIN').length;
  const activeCount = locations.filter(l => l.isActive).length;

  return (
    <div className="p-6 space-y-6">
      <TopBar
        title="Location Management"
        subtitle="Manage hospital branches, satellite clinics and camps"
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            <Plus size={15} /> Add Location
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Locations', value: locations.length, color: '#0F766E' },
          { label: 'Active', value: activeCount, color: '#10B981' },
          { label: 'Main', value: mainCount, color: '#3B82F6' },
          { label: 'Branches / Others', value: locations.length - mainCount, color: '#8B5CF6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="hms-card p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
            <div className="text-3xl font-black" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Locations list */}
      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">All Locations</h3>
          <p className="text-xs text-gray-400 mt-0.5">Manage physical locations across your organization</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading locations…</div>
        ) : locations.length === 0 ? (
          <EmptyState
            icon={<MapPin size={40} />}
            title="No locations configured"
            description="Add your hospital's main location to get started"
            action={
              <button
                onClick={openAdd}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                <Plus size={14} /> Add Location
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Location', 'Code', 'Type', 'Address', 'Contact', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {locations.slice((page - 1) * 20, page * 20).map(loc => (
                  <tr key={loc.id} className={`hover:bg-gray-50 ${!loc.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className={loc.isActive ? 'text-teal-600' : 'text-gray-400'} />
                        <span className="font-semibold text-sm text-gray-900">{loc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{loc.locationCode || loc.code || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${LOCATION_TYPE_COLOR[loc.type] || 'bg-gray-100 text-gray-600'}`}>
                        {loc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                      {[loc.addressLine1 || loc.address?.line1, loc.city || loc.address?.city, loc.state || loc.address?.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{loc.phone || '—'}</div>
                      {loc.email && <div className="text-gray-400">{loc.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(loc)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                          loc.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={loc.isActive ? 'Click to deactivate' : 'Click to activate'}>
                        {loc.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(loc)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium">
                          <Edit2 size={11} /> Edit
                        </button>
                        {loc.type !== 'MAIN' && (
                          <button onClick={() => setDeleteConfirm(loc.id)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium">
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={Math.ceil(locations.length / 20)} onPageChange={setPage} totalItems={locations.length} pageSize={20} />
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editing ? 'Edit Location' : 'Add New Location'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editing ? `Editing: ${editing.name}` : 'Add a new branch, satellite or camp'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ABC Hospital — Anna Nagar Branch"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location Code</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="CHN-01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {LOCATION_TYPES.filter(t => editing?.type === 'MAIN' ? true : t !== 'MAIN').map(t => (
                      <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 99999 99999"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="branch@hospital.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
                  <input
                    value={form.address.line1}
                    onChange={e => setForm(f => ({ ...f, address: { ...f.address, line1: e.target.value } }))}
                    placeholder="123, Anna Salai"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input
                    value={form.address.city}
                    onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                    placeholder="Chennai"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                  <input
                    value={form.address.state}
                    onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                    placeholder="Tamil Nadu"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PIN Code</label>
                  <input
                    value={form.address.pin}
                    onChange={e => setForm(f => ({ ...f, address: { ...f.address, pin: e.target.value } }))}
                    placeholder="600001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.name}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
              >
                <Save size={14} />
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Location?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently remove the location. Existing patient records linked to this location will remain but the location will no longer be selectable.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
