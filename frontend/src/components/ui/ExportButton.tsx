import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadCsv } from '../../lib/export';

interface Props {
  endpoint: string;
  params?: Record<string, any>;
  filename: string;
  label?: string;
}

export default function ExportButton({ endpoint, params = {}, filename, label = 'Export CSV' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await downloadCsv(endpoint, params, filename);
      toast.success('Export downloaded successfully');
    } catch (err) {
      console.error('Failed to export data:', err);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {label}
    </button>
  );
}
