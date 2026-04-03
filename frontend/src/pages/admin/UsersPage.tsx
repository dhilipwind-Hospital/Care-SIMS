import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Users, UserPlus, Shield, Edit2, X, ToggleLeft, ToggleRight, UserCheck, UserX, Clock, ChevronDown, Camera, Loader2 } from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', roleId: '', departmentId: '' };

type Tab = 'staff' | 'pending';

export default function UsersPage() {
  const [activeTab, setActiveTab]   = useState<Tab>('staff');
  const [users, setUsers]           = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [roles, setRoles]           = useState<any[]>([]);
  const [depts, setDepts]           = useState<any[]>([]);
  const [locations, setLocations]   = useState<any[]>([]);

  // Pending approvals
  const [pending, setPending]             = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Approve modal
  const [approving, setApproving]         = useState<any>(null);
  const [approveRoleId, setApproveRoleId] = useState('');
  const [approveLocationId, setApproveLocationId] = useState('');

  // Inline role change
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  // Add modal
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState(EMPTY_FORM);
  const [addError, setAddError]   = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Edit modal
  const [editing, setEditing]       = useState<any>(null);
  const [editForm, setEditForm]     = useState<any>({});
  const [editError, setEditError]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Photo upload
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Escape key to close modals
  useEscapeClose(showAdd, () => setShowAdd(false));
  useEscapeClose(!!editing, () => setEditing(null));
  useEscapeClose(!!approving, () => setApproving(null));

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { page, limit: 20 } });
      setUsers(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) { toast.error('Failed to load users'); } finally { setLoading(false); }
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    try {
      const { data } = await api.get('/users/pending-self-reg');
      setPending(Array.isArray(data) ? data : data.data || []);
    } catch (err) { toast.error('Failed to load pending registrations'); } finally { setPendingLoading(false); }
  };

  const fetchMeta = async () => {
    try {
      const [r, d, l] = await Promise.all([
        api.get('/roles', { params: { limit: 50 } }),
        api.get('/org/departments', { params: { limit: 50 } }),
        api.get('/org/locations').catch((err) => { console.error('Failed to fetch locations:', err); return { data: [] }; }),
      ]);
      setRoles(r.data.data || r.data || []);
      setDepts(d.data.data || d.data || []);
      setLocations(l.data.data || l.data || []);
    } catch (err) { toast.error('Failed to load roles and departments'); }
  };

  useEffect(() => { fetchUsers(); }, [page]);
  useEffect(() => { fetchMeta(); fetchPending(); }, []);

  /* ── Approve / Reject self-registration ── */
  const openApproveModal = (u: any) => {
    setApproving(u);
    setApproveRoleId(u.roleId || '');
    setApproveLocationId(u.primaryLocationId || '');
  };

  const handleApprove = async () => {
    if (!approveRoleId) { toast.error('Please select a role'); return; }
    if (!approveLocationId) { toast.error('Please select a location'); return; }
    setActionLoading(approving.id);
    try {
      await api.patch(`/users/self-reg/${approving.id}/approve`, { roleId: approveRoleId, locationId: approveLocationId });
      toast.success(`${approving.firstName} ${approving.lastName} approved successfully`);
      setApproving(null);
      fetchPending();
      fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to approve user'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (u: any) => {
    if (!confirm(`Reject and remove registration request from ${u.firstName} ${u.lastName}?`)) return;
    setActionLoading(u.id);
    try {
      await api.patch(`/users/self-reg/${u.id}/reject`);
      toast.success(`Registration request from ${u.firstName} ${u.lastName} rejected`);
      fetchPending();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to reject user'); }
    finally { setActionLoading(null); }
  };

  /* ── Deactivate / Reactivate (dedicated endpoints) ── */
  const toggleActive = async (u: any) => {
    const endpoint = u.isActive ? 'deactivate' : 'reactivate';
    try {
      await api.patch(`/users/${u.id}/${endpoint}`);
      toast.success(`User ${u.isActive ? 'deactivated' : 'reactivated'}`);
      fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to toggle user status'); }
  };

  /* ── Change role inline ── */
  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { roleId });
      toast.success('Role updated successfully');
      setRoleChanging(null);
      fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to change role'); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) { setAddError('First and last name are required'); return; }
    if (!addForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) { setAddError('Enter a valid email address'); return; }
    if (addForm.password.length < 8) { setAddError('Password must be at least 8 characters'); return; }
    setAddSaving(true); setAddError('');
    try {
      await api.post('/users', addForm);
      toast.success('User created successfully');
      setShowAdd(false); setAddForm(EMPTY_FORM);
      fetchUsers();
    } catch (err: any) { setAddError(err.response?.data?.message || 'Failed to create user'); toast.error(err.response?.data?.message || 'Failed to create user'); }
    finally { setAddSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editing || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/uploads/user/${editing.id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo uploaded successfully');
      setEditing((prev: any) => ({ ...prev, photoUrl: data.url }));
      fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to upload photo'); }
    finally { setPhotoUploading(false); if (photoInputRef.current) photoInputRef.current.value = ''; }
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, roleId: u.roleId || u.role?.id || '', departmentId: u.departmentId || u.department?.id || '' });
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true); setEditError('');
    try {
      await api.put(`/users/${editing.id}`, editForm);
      toast.success('User updated successfully');
      setEditing(null);
      fetchUsers();
    } catch (err: any) { setEditError(err.response?.data?.message || 'Failed to update user'); toast.error(err.response?.data?.message || 'Failed to update user'); }
    finally { setEditSaving(false); }
  };

  const active     = users.filter(u => u.isActive).length;
  const roleGroups = [...new Set(users.map(u => u.role?.name).filter(Boolean))].length;

  const tabClass = (t: Tab) =>
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === t ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`;

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Users & Staff" subtitle="Manage staff accounts, approvals, and roles"
        actions={
          <button onClick={() => { setShowAdd(true); setAddForm(EMPTY_FORM); setAddError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <UserPlus size={15} /> Add User
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Staff"        value={total}            icon={Users}  color="#0F766E" />
        <KpiCard label="Active"             value={active}           icon={Shield} color="#10B981" />
        <KpiCard label="Pending Approvals"  value={pending.length}   icon={Clock}  color="#F59E0B" />
        <KpiCard label="Distinct Roles"     value={roleGroups}       icon={Shield} color="#3B82F6" />
      </div>

      {/* ── TAB SWITCHER ── */}
      <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl w-fit">
        <button className={tabClass('staff')} onClick={() => setActiveTab('staff')}>
          <span className="flex items-center gap-2"><Users size={14} /> Staff Members</span>
        </button>
        <button className={tabClass('pending')} onClick={() => { setActiveTab('pending'); fetchPending(); }}>
          <span className="flex items-center gap-2">
            <Clock size={14} /> Pending Approvals
            {pending.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{pending.length}</span>
            )}
          </span>
        </button>
      </div>

      {/* ── ADD USER MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Add Staff User</h3>
                <p className="text-xs text-gray-400 mt-0.5">Create a new staff account</p>
              </div>
              <button type="button" onClick={() => setShowAdd(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 grid grid-cols-2 gap-4">
              {([
                { key: 'firstName', label: 'First Name', type: 'text',     req: true,  span: false },
                { key: 'lastName',  label: 'Last Name',  type: 'text',     req: true,  span: false },
                { key: 'email',     label: 'Email',      type: 'email',    req: true,  span: true  },
                { key: 'password',  label: 'Password',   type: 'password', req: true,  span: true  },
              ] as { key: keyof typeof addForm; label: string; type: string; req: boolean; span: boolean }[]).map(({ key, label, type, req, span }) => (
                <div key={key} className={span ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label} {req && <span className="text-red-500">*</span>}</label>
                  <input required={req} type={type} value={addForm[key]}
                    onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={addForm.roleId} onChange={e => setAddForm(f => ({ ...f, roleId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select role...</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <select value={addForm.departmentId} onChange={e => setAddForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select department...</option>
                  {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {addError && <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{addError}</div>}
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={addSaving}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {addSaving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Edit User</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editing.firstName} {editing.lastName}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            {/* Photo Upload */}
            <div className="flex items-center gap-4 px-6 pt-5">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {editing.photoUrl ? (
                    <img src={editing.photoUrl} alt="User photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 text-lg font-bold">{editing.firstName?.[0]}{editing.lastName?.[0]}</span>
                  )}
                </div>
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {photoUploading ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-700">Profile Photo</p>
                <p className="text-xs">Click to upload (max 5MB)</p>
              </div>
            </div>
            <form onSubmit={handleEdit} className="p-6 grid grid-cols-2 gap-4">
              {([
                { key: 'firstName', label: 'First Name', span: false },
                { key: 'lastName',  label: 'Last Name',  span: false },
                { key: 'email',     label: 'Email',      span: true  },
              ] as { key: string; label: string; span: boolean }[]).map(({ key, label, span }) => (
                <div key={key} className={span ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input value={editForm[key] || ''} onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={editForm.roleId || ''} onChange={e => setEditForm((f: any) => ({ ...f, roleId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">No role</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <select value={editForm.departmentId || ''} onChange={e => setEditForm((f: any) => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">No department</option>
                  {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {editError && <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{editError}</div>}
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={editSaving}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── APPROVE MODAL ── */}
      {approving && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Approve Registration</h3>
                <p className="text-xs text-gray-400 mt-0.5">{approving.firstName} {approving.lastName} ({approving.email})</p>
              </div>
              <button type="button" onClick={() => setApproving(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assign Role <span className="text-red-500">*</span></label>
                <select value={approveRoleId} onChange={e => setApproveRoleId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select role...</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assign Location <span className="text-red-500">*</span></label>
                <select value={approveLocationId} onChange={e => setApproveLocationId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select location...</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setApproving(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleApprove} disabled={actionLoading === approving.id}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  <UserCheck size={14} /> {actionLoading === approving.id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PENDING APPROVALS TAB ── */}
      {activeTab === 'pending' && (
        <div className="hms-card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Pending Self-Registrations</h3>
            <p className="text-xs text-gray-400 mt-0.5">{pending.length} pending request{pending.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Current Role', 'Registered', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingLoading ? (
                  <>{Array.from({ length: 3 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                ) : pending.length === 0 ? (
                  <tr><td colSpan={6} className="p-0"><EmptyState icon={<UserCheck size={36} />} title="No pending registrations" description="All self-registration requests have been handled" /></td></tr>
                ) : pending.map(u => (
                  <tr key={u.id} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-gray-900">{u.firstName} {u.lastName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '---'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-medium">
                        {u.role?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '---'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openApproveModal(u)} disabled={actionLoading === u.id}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium disabled:opacity-50 transition-colors">
                          <UserCheck size={12} /> Approve
                        </button>
                        <button onClick={() => handleReject(u)} disabled={actionLoading === u.id}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium disabled:opacity-50 transition-colors">
                          <UserX size={12} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── USERS TABLE ── */}
      {activeTab === 'staff' && (
        <div className="hms-card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Staff Members</h3>
            <p className="text-xs text-gray-400 mt-0.5">{total} total accounts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Department', 'Location', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="p-0"><EmptyState icon={<Users size={36} />} title="No staff users found" description="Add staff members to manage your hospital team" /></td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-gray-900">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-gray-400">{u.employeeId || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {roleChanging === u.id ? (
                        <select
                          autoFocus
                          defaultValue={u.roleId || u.role?.id || ''}
                          onChange={e => { handleRoleChange(u.id, e.target.value); }}
                          onBlur={() => setRoleChanging(null)}
                          className="text-xs border border-teal-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                          <option value="" disabled>Select role...</option>
                          {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      ) : (
                        <button onClick={() => setRoleChanging(u.id)}
                          className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-medium hover:bg-purple-100 transition-colors"
                          title="Click to change role">
                          {u.role?.name || '---'}
                          <ChevronDown size={10} />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.department?.name || '---'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.location?.name || '---'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(u)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold transition-colors ${u.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        title={u.isActive ? 'Click to deactivate' : 'Click to reactivate'}>
                        {u.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(u)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium">
                        <Edit2 size={11} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} totalItems={total} pageSize={20} />
        </div>
      )}
    </div>
  );
}
