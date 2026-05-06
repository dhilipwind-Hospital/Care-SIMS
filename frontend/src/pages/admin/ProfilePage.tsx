import { useEffect, useState, useRef } from 'react';
import {
  User, Mail, Shield, Phone, Building2, Clock, Camera, Loader2,
  Pencil, X, Lock, Eye, EyeOff, IdCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import api from '../../lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const p = data.data || data;
      setProfile(p);
      setEditForm({ firstName: p.firstName || '', lastName: p.lastName || '', phone: p.phone || p.mobile || '' });
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads/profile-picture', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Profile picture updated');
      setProfile((prev: any) => ({ ...prev, photoUrl: data.url }));
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to upload photo'); }
    finally { setPhotoUploading(false); if (photoRef.current) photoRef.current.value = ''; }
  };

  const handleSaveProfile = async () => {
    if (!editForm.firstName.trim()) { toast.error('First name required'); return; }
    setSaving(true);
    try {
      await api.patch('/auth/me', editForm);
      toast.success('Profile updated');
      setProfile((prev: any) => ({ ...prev, ...editForm }));
      setEditMode(false);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('All fields required'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setChangingPw(true);
    try {
      await api.put('/auth/me/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setShowPwModal(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setChangingPw(false); }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <TopBar title="My Profile" subtitle="Account details and settings" />
        <div className="hms-card p-8 max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-20 rounded-full bg-gray-200 mx-auto" />
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-5 bg-gray-100 rounded w-2/3 mx-auto" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 space-y-6">
        <TopBar title="My Profile" subtitle="Account details and settings" />
        <div className="hms-card p-8 max-w-2xl mx-auto text-center text-gray-500">Unable to load profile information.</div>
      </div>
    );
  }

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.name || 'User';

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <TopBar title="My Profile" subtitle="Account details and settings" />

      <div className="hms-card">
        {/* Avatar section */}
        <div className="flex flex-col items-center py-8 border-b border-gray-100">
          <div className="relative group mb-3 cursor-pointer" onClick={() => photoRef.current?.click()}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
              {profile.photoUrl
                ? <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                : <>{(profile.firstName?.[0] || 'U').toUpperCase()}{(profile.lastName?.[0] || '').toUpperCase()}</>}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {photoUploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 mt-1">{profile.role}</span>
          <p className="text-xs text-gray-400 mt-1">Click avatar to change photo</p>
        </div>

        {/* Profile fields / edit form */}
        {editMode ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                <input className="hms-input w-full" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                <input className="hms-input w-full" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone / Mobile</label>
              <input className="hms-input w-full" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditMode(false)} className="btn-secondary px-4 py-2 flex-1">Cancel</button>
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary px-4 py-2 flex-1 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[
              { icon: User, label: 'Name', value: displayName },
              { icon: Mail, label: 'Email', value: profile.email || '—' },
              { icon: Shield, label: 'Role', value: profile.role || '—' },
              { icon: Phone, label: 'Phone', value: profile.phone || profile.mobile || '—' },
              { icon: Building2, label: 'Department', value: profile.department?.name || profile.departmentName || '—' },
              { icon: Building2, label: 'Organization', value: profile.tenant?.name || profile.organizationName || profile.tenantId || '—' },
              { icon: Clock, label: 'Last Login', value: profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('en-IN') : '—' },
              ...(profile.employeeId ? [{ icon: IdCard, label: 'Employee ID', value: profile.employeeId }] : []),
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center px-6 py-4">
                <div className="flex items-center gap-3 w-40 text-gray-500 flex-shrink-0">
                  <Icon size={16} />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className="text-sm text-gray-900 flex-1">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {!editMode && (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setEditMode(true)} className="hms-card p-4 flex items-center gap-3 hover:border-teal-300 hover:shadow-md transition-all text-left">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Pencil size={16} className="text-teal-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">Edit Profile</div>
              <div className="text-xs text-gray-400">Update name & phone</div>
            </div>
          </button>
          <button onClick={() => setShowPwModal(true)} className="hms-card p-4 flex items-center gap-3 hover:border-teal-300 hover:shadow-md transition-all text-left">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Lock size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">Change Password</div>
              <div className="text-xs text-gray-400">Update your password</div>
            </div>
          </button>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Lock size={16} className="text-amber-500" /> Change Password</h2>
              <button onClick={() => setShowPwModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
                <div className="relative">
                  <input type={showCurrent ? 'text' : 'password'} className="hms-input w-full pr-10" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} className="hms-input w-full pr-10" placeholder="Min. 8 characters" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwForm.newPassword && pwForm.newPassword.length < 8 && (
                  <p className="text-xs text-red-500 mt-1">Must be at least 8 characters</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
                <input type="password" className="hms-input w-full" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowPwModal(false)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleChangePassword} disabled={changingPw} className="btn-primary flex items-center gap-2 px-4 py-2">
                {changingPw && <Loader2 size={14} className="animate-spin" />} Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
