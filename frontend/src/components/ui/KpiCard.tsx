import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  sub?: string;
}

export default function KpiCard({ label, value, icon: Icon, color = '#0F766E', sub }: Props) {
  return (
    <div
      className="bg-white border p-5 overflow-hidden"
      style={{ height: 120, borderRadius: 'var(--radius-card)', borderColor: 'var(--hms-border)', boxShadow: 'var(--shadow-card)' }}
      role="region"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={18} style={{ color }} aria-hidden="true" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
