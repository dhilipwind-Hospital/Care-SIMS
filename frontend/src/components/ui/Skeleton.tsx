interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}

/** Skeleton row for tables — mimics a full table row */
export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="animate-pulse bg-gray-200 rounded h-4" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for KPI cards — 4 cards in a row */
export function SkeletonKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 p-5 overflow-hidden" style={{ height: 120, borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="animate-pulse bg-gray-200 rounded h-3 w-24" />
            <div className="animate-pulse bg-gray-200 rounded-lg w-9 h-9" />
          </div>
          <div className="animate-pulse bg-gray-200 rounded h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Full page skeleton with KPI cards + table */
export function SkeletonPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="animate-pulse bg-gray-200 rounded h-6 w-48 mb-2" />
          <div className="animate-pulse bg-gray-200 rounded h-3 w-64" />
        </div>
        <div className="animate-pulse bg-gray-200 rounded-lg h-9 w-9" />
      </div>
      {/* KPI row */}
      <SkeletonKpiRow />
      {/* Table */}
      <div className="hms-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="animate-pulse bg-gray-200 rounded h-5 w-36" />
        </div>
        <table className="w-full">
          <thead>
            <tr>
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="px-4 py-3 bg-gray-50">
                  <div className="animate-pulse bg-gray-200 rounded h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} cols={6} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
