import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Plus, Edit2, Trash2, Users, CheckSquare, Square, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

const MODULES = [
  { id: 'MOD_QUEUE', label: 'Queue Management', resource: 'queue' },
  { id: 'MOD_PATIENTS', label: 'Patient Records', resource: 'patients' },
  { id: 'MOD_APPOINTMENTS', label: 'Appointments', resource: 'appointments' },
  { id: 'MOD_CONSULT', label: 'Consultations', resource: 'consultations' },
  { id: 'MOD_RX', label: 'Prescriptions', resource: 'prescriptions' },
  { id: 'MOD_LAB_ORD', label: 'Lab Orders', resource: 'lab_orders' },
  { id: 'MOD_LAB_RES', label: 'Lab Results', resource: 'lab_results' },
  { id: 'MOD_VITALS', label: 'Vitals Recording', resource: 'vitals' },
  { id: 'MOD_TRIAGE', label: 'Triage', resource: 'triage' },
  { id: 'MOD_WARD', label: 'Ward / Beds', resource: 'wards' },
  { id: 'MOD_MED_ADMIN', label: 'Medication Admin (MAR)', resource: 'medication_admin' },
  { id: 'MOD_BILLING', label: 'Invoices & Billing', resource: 'invoices' },
  { id: 'MOD_PHARMA_FULL', label: 'Pharmacy Dispense', resource: 'pharmacy_dispense' },
  { id: 'MOD_INVENTORY', label: 'Pharmacy Inventory', resource: 'inventory' },
  { id: 'MOD_PO', label: 'Purchase Orders', resource: 'purchase_orders' },
  { id: 'MOD_OT', label: 'OT Schedule', resource: 'ot' },
  { id: 'MOD_REPORTS', label: 'Reports & Analytics', resource: 'reports' },
  { id: 'MOD_AUDIT', label: 'Audit Logs', resource: 'audit_logs' },
  { id: 'MOD_USERS', label: 'User Management', resource: 'users' },
  { id: 'MOD_ROLES', label: 'Role Management', resource: 'roles' },
];

const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT'] as const;
type Action = typeof ACTIONS[number];

const SPECIAL_FLAGS = [
  { id: 'CROSS_LOCATION_ACCESS', label: 'Cross-Location Access', desc: 'View patient records from other locations (audited)' },
  { id: 'DISCOUNT_APPROVE', label: 'Discount Approve', desc: 'Approve billing discounts above threshold' },
  { id: 'OVERRIDE_DRUG_ALLERGY', label: 'Override Drug Allergy', desc: 'Override allergy block with mandatory documentation' },
  { id: 'CONTROLLED_SUBSTANCE', label: 'Controlled Substance', desc: 'Authorize controlled substance dispense' },
  { id: 'REPORT_EXPORT', label: 'Report Export', desc: 'Export reports including PHI data' },
  { id: 'USER_ADMIN', label: 'User Admin', desc: 'Manage users within the organization' },
  { id: 'ROLE_ADMIN', label: 'Role Admin', desc: 'Create and edit custom roles' },
  { id: 'AUDIT_VIEWER', label: 'Audit Viewer', desc: 'View audit logs' },
];

type PermMatrix = Record<string, Partial<Record<Action, boolean>>>;

interface RoleForm {
  name: string;
  description: string;
  permissions: PermMatrix;
  specialFlags: string[];
}

const INIT_FORM: RoleForm = {
  name: '',
  description: '',
  permissions: {},
  specialFlags: [],
};

const ACTION_COLORS: Record<Action, string> = {
  VIEW: '#0F766E',
  CREATE: '#2563EB',
  EDIT: '#D97706',
  DELETE: '#DC2626',
  APPROVE: '#7C3AED',
  EXPORT: '#0891B2',
};

function PermCell({ checked, onChange, color }: { checked: boolean; onChange: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-110"
      style={checked ? { background: `${color}20`, color } : { background: '#F3F4F6', color: '#D1D5DB' }}
      title={checked ? 'Enabled' : 'Disabled'}
    >
      {checked ? <CheckSquare size={16} /> : <Square size={16} />}
    </button>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(INIT_FORM);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/roles');
      setRoles(data.data || data || []);
    } catch (err) { toast.error('Failed to load roles'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRoles(); }, []);

  const togglePerm = (moduleId: string, action: Action) => {
    setForm(f => {
      const prev = f.permissions[moduleId]?.[action] || false;
      return {
        ...f,
        permissions: {
          ...f.permissions,
          [moduleId]: { ...(f.permissions[moduleId] || {}), [action]: !prev },
        },
      };
    });
  };

  const toggleFlag = (flag: string) => {
    setForm(f => ({
      ...f,
      specialFlags: f.specialFlags.includes(flag)
        ? f.specialFlags.filter(x => x !== flag)
        : [...f.specialFlags, flag],
    }));
  };

  const openNew = () => {
    setEditId(null);
    setForm(INIT_FORM);
    setShowForm(true);
  };

  const openEdit = (role: any) => {
    setEditId(role.id);
    const permMatrix: PermMatrix = {};
    (role.permissions || []).forEach((p: any) => {
      if (!permMatrix[p.moduleId]) permMatrix[p.moduleId] = {};
      permMatrix[p.moduleId][p.action as Action] = true;
    });
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: permMatrix,
      specialFlags: role.specialFlags || [],
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const permissionsArray = Object.entries(form.permissions).flatMap(([moduleId, actions]) =>
        Object.entries(actions || {})
          .filter(([, v]) => v)
          .map(([action]) => {
            const mod = MODULES.find(m => m.id === moduleId);
            return { moduleId, resource: mod?.resource || moduleId.toLowerCase(), action };
          })
      );
      const payload = {
        name: form.name,
        description: form.description,
        permissions: permissionsArray,
        specialFlags: form.specialFlags,
      };
      if (editId) {
        await api.put(`/roles/${editId}`, { name: payload.name, description: payload.description });
        await api.put(`/roles/${editId}/permissions`, { permissions: permissionsArray });
        await api.put(`/roles/${editId}/special-flags`, { flags: form.specialFlags });
      } else {
        await api.post('/roles', payload);
      }
      toast.success(editId ? 'Role updated successfully' : 'Role created successfully');
      setShowForm(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/roles/${id}`);
      toast.success('Role deleted');
      setDeleteConfirm(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <TopBar
        title="Roles & Permissions"
        subtitle="Define custom roles with granular module-level access control"
        actions={
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
          >
            <Plus size={15} /> New Role
          </button>
        }
      />

      {/* Info banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 text-sm text-purple-800 flex items-start gap-3">
        <Lock size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>Fully Customizable RBAC</strong> — Create custom roles with any combination of module permissions.
          System roles (marked with a lock) cannot be deleted. Permission changes take effect on next user login.
        </div>
      </div>

      {/* Roles table */}
      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">All Roles</h3>
          <span className="text-xs text-gray-400">{roles.length} roles</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Role Name', 'Description', 'Type', 'Permissions', 'Users', 'Actions'].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 text-left bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
              ) : roles.length === 0 ? (
                <tr><td colSpan={6} className="p-0"><EmptyState icon={<Shield size={36} />} title="No roles configured" description="Create your first custom role to define access permissions" /></td></tr>
              ) : roles.map(role => (
                <tr key={role.id} className="hover:bg-gray-50 border-t border-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield size={15} className={role.isSystem ? 'text-purple-500' : 'text-teal-500'} />
                      <span className="font-semibold text-sm text-gray-900">{role.name}</span>
                      {role.isSystem && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">System</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{role.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${role.isSystem ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                      {role.isSystem ? 'System Role' : 'Custom Role'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {(role.permissions?.length || 0)} permission{(role.permissions?.length || 0) !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Users size={13} />
                      {role._count?.users || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(role)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium"
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={() => setDeleteConfirm(role.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Role?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently delete this custom role. Users assigned to it will need to be reassigned.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold bg-red-500 hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="px-8 py-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editId ? 'Edit Role' : 'Create Custom Role'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Configure module-level permissions for this role</p>
            </div>

            <form onSubmit={handleSave}>
              <div className="px-8 py-6 space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. Senior Ward Sister"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
                    <input
                      type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Brief description of this role"
                    />
                  </div>
                </div>

                {/* Permission Matrix */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">Permission Matrix</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {ACTIONS.map(a => (
                        <span key={a} className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACTION_COLORS[a] }} />
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_repeat(6,40px)] gap-0 bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Module</div>
                      {ACTIONS.map(a => (
                        <div key={a} className="text-xs font-semibold text-center" style={{ color: ACTION_COLORS[a] }}>{a.charAt(0)}</div>
                      ))}
                    </div>

                    {MODULES.map(mod => {
                      const isExpanded = expandedModule === mod.id;
                      const activeCount = Object.values(form.permissions[mod.id] || {}).filter(Boolean).length;
                      return (
                        <div key={mod.id} className="border-b border-gray-100 last:border-0">
                          <div className="grid grid-cols-[1fr_repeat(6,40px)] gap-0 px-4 py-2.5 hover:bg-gray-50 items-center">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedModule(isExpanded ? null : mod.id)}>
                              <span className="text-sm text-gray-700 font-medium">{mod.label}</span>
                              {activeCount > 0 && (
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{activeCount} active</span>
                              )}
                              {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </div>
                            {ACTIONS.map(action => (
                              <div key={action} className="flex items-center justify-center">
                                <PermCell
                                  checked={!!form.permissions[mod.id]?.[action]}
                                  onChange={() => togglePerm(mod.id, action)}
                                  color={ACTION_COLORS[action]}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Special Flags */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Special Permission Flags</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {SPECIAL_FLAGS.map(flag => (
                      <button
                        key={flag.id}
                        type="button"
                        onClick={() => toggleFlag(flag.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          form.specialFlags.includes(flag.id)
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          form.specialFlags.includes(flag.id) ? 'bg-purple-500 text-white' : 'bg-gray-200'
                        }`}>
                          {form.specialFlags.includes(flag.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                        </div>
                        <div>
                          <div className={`text-sm font-semibold ${form.specialFlags.includes(flag.id) ? 'text-purple-800' : 'text-gray-700'}`}>
                            {flag.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{flag.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {Object.values(form.permissions).reduce((sum, m) => sum + Object.values(m || {}).filter(Boolean).length, 0)} permissions selected
                  {form.specialFlags.length > 0 && `, ${form.specialFlags.length} special flag${form.specialFlags.length > 1 ? 's' : ''}`}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 text-sm rounded-xl text-white font-semibold disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}
                  >
                    {saving ? 'Saving…' : editId ? 'Update Role' : 'Create Role'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
