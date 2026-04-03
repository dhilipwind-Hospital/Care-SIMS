import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface Props {
  endpoint: string;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  onUploaded: (result: { url: string; filename: string }) => void;
}

export default function FileUpload({ endpoint, accept = 'image/*', maxSizeMB = 5, label = 'Upload File', onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size must be under ${maxSizeMB}MB`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data);
      toast.success('File uploaded successfully');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        dragOver ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
      {uploading ? (
        <Loader2 size={24} className="mx-auto text-teal-600 animate-spin" />
      ) : (
        <Upload size={24} className="mx-auto text-gray-400" />
      )}
      <p className="mt-2 text-sm text-gray-600">{uploading ? 'Uploading...' : label}</p>
      <p className="text-xs text-gray-400 mt-1">Max {maxSizeMB}MB</p>
    </div>
  );
}
