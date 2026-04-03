const map: Record<string, string> = {
  WAITING: 'bg-amber-100 text-amber-700',
  WAITING_FOR_DOCTOR: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
  NO_SHOW: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-gray-100 text-gray-500 line-through',
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-gray-100 text-gray-500',
  OVERDUE: 'bg-red-100 text-red-700',
  ORDERED: 'bg-blue-100 text-blue-700',
  COLLECTED: 'bg-purple-100 text-purple-700',
  IN_LAB: 'bg-indigo-100 text-indigo-700',
  RESULTS_READY: 'bg-green-100 text-green-700',
  CRITICAL: 'bg-red-100 text-red-700',
  SCHEDULED: 'bg-teal-100 text-teal-700',
  DISCHARGED: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-gray-100 text-gray-600',
  URGENT: 'bg-amber-100 text-amber-700',
  EMERGENCY: 'bg-red-100 text-red-700',
  SENT_TO_PHARMACY: 'bg-teal-100 text-teal-700',
  DISPENSED: 'bg-green-100 text-green-700',
  CROSS_MATCHED: 'bg-purple-100 text-purple-700',
  ADMINISTERING: 'bg-indigo-100 text-indigo-700',
  AVAILABLE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  RESERVED: 'bg-amber-100 text-amber-700',
  ISSUED: 'bg-teal-100 text-teal-700',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = map[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`} role="status" aria-label={`Status: ${status.replace(/_/g, ' ')}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
