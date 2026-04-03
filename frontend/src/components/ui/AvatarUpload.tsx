import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface Props {
  currentUrl?: string | null;
  endpoint: string;
  size?: number;
  onUploaded: (url: string) => void;
}

export default function AvatarUpload({ currentUrl, endpoint, size = 80, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.url);
      toast.success('Photo updated');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error('Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div
        className="rounded-full overflow-hidden bg-gray-100 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-2xl font-bold">?</span>
        )}
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-colors shadow"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
