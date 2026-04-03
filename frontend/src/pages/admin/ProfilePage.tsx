import { useEffect, useState, useRef } from 'react';
import { User, Mail, Shield, Phone, Building2, Clock, Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import api from '../../lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setProfile(data.data || data);
      } catch (err) {
        console.error('Failed to load profile:', err);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <TopBar title="My Profile" subtitle="View your account details" />
        <div className="hms-card p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-20 rounded-full bg-gray-200 mx-auto" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 bg-gray-100 rounded w-2/3 mx-auto" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 space-y-6">
        <TopBar title="My Profile" subtitle="View your account details" />
        <div className="hms-card p-8 text-center text-gray-500">Unable to load profile information.</div>
      </div>
    );
  }

  const fields = [
    { icon: User, label: 'Name', value: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.name || '—' },
    { icon: Mail, label: 'Email', value: profile.email || '—' },
    { icon: Shield, label: 'Role', value: profile.role || '—' },
    { icon: Phone, label: 'Phone', value: profile.phone || profile.mobile || '—' },
    { icon: Building2, label: 'Department', value: profile.department?.name || profile.departmentName || '—' },
    { icon: Building2, label: 'Organization', value: profile.tenant?.name || profile.organizationName || profile.tenantId || '—' },
    { icon: Clock, label: 'Last Login', value: profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : '—' },
  ];

  return (
    <div className="p-6 space-y-6">
      <TopBar title="My Profile" subtitle="View your account details" />

      <div className="hms-card max-w-2xl mx-auto">
        {/* Avatar header */}
        <div className="flex flex-col items-center py-8 border-b border-gray-100">
          <div className="relative group mb-3 cursor-pointer" onClick={() => photoRef.current?.click()}>
            <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <>{profile.firstName?.[0] || profile.name?.[0] || 'U'}{profile.lastName?.[0] || ''}</>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {photoUploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.name || 'User'}
          </h2>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 mt-1">
            {profile.role}
          </span>
        </div>

        {/* Profile fields */}
        <div className="divide-y divide-gray-100">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center px-6 py-4">
              <div className="flex items-center gap-3 w-40 text-gray-500">
                <Icon size={16} />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <span className="text-sm text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Additional info */}
        {profile.employeeId && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center">
            <div className="flex items-center gap-3 w-40 text-gray-500">
              <Shield size={16} />
              <span className="text-sm font-medium">Employee ID</span>
            </div>
            <span className="text-sm text-gray-900">{profile.employeeId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
