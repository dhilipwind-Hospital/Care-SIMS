const map: Record<string, string> = {
  // Queue
  WAITING: 'bg-amber-100 text-amber-700',
  WAITING_FOR_DOCTOR: 'bg-amber-100 text-amber-700',
  CALLED: 'bg-blue-100 text-blue-700',
  CONSULTING: 'bg-indigo-100 text-indigo-700',

  // General workflow
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
  NO_SHOW: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-gray-100 text-gray-500 line-through',
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-gray-100 text-gray-500',
  SCHEDULED: 'bg-teal-100 text-teal-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  ESCALATED: 'bg-red-100 text-red-700',
  ACKNOWLEDGED: 'bg-teal-100 text-teal-700',

  // Billing
  PAID: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
  OVERDUE: 'bg-red-100 text-red-700',
  FINALIZED: 'bg-teal-100 text-teal-700',

  // Lab
  ORDERED: 'bg-blue-100 text-blue-700',
  COLLECTED: 'bg-purple-100 text-purple-700',
  IN_LAB: 'bg-indigo-100 text-indigo-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  RESULTS_READY: 'bg-green-100 text-green-700',
  VALIDATED: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-green-100 text-green-700',

  // Clinical
  CRITICAL: 'bg-red-100 text-red-700',
  NORMAL: 'bg-gray-100 text-gray-600',
  URGENT: 'bg-amber-100 text-amber-700',
  EMERGENCY: 'bg-red-100 text-red-700',
  ELECTIVE: 'bg-blue-100 text-blue-700',
  DAYCARE: 'bg-teal-100 text-teal-700',

  // Admissions
  ADMITTED: 'bg-blue-100 text-blue-700',
  DISCHARGED: 'bg-gray-100 text-gray-600',
  TRANSFERRED: 'bg-purple-100 text-purple-700',
  ABSCONDED: 'bg-red-100 text-red-700',

  // Pharmacy
  SENT_TO_PHARMACY: 'bg-teal-100 text-teal-700',
  DISPENSED: 'bg-green-100 text-green-700',
  DISPENSING: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',

  // Blood bank
  CROSS_MATCHED: 'bg-purple-100 text-purple-700',
  ADMINISTERING: 'bg-indigo-100 text-indigo-700',
  AVAILABLE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  RESERVED: 'bg-amber-100 text-amber-700',
  ISSUED: 'bg-teal-100 text-teal-700',

  // Equipment / Assets
  OPERATIONAL: 'bg-green-100 text-green-700',
  NEEDS_MAINTENANCE: 'bg-amber-100 text-amber-700',
  UNDER_MAINTENANCE: 'bg-amber-100 text-amber-700',
  UNDER_REPAIR: 'bg-amber-100 text-amber-700',
  DECOMMISSIONED: 'bg-gray-100 text-gray-500',
  STERILIZED: 'bg-green-100 text-green-700',
  PENDING_STERILIZATION: 'bg-amber-100 text-amber-700',
  QUARANTINED: 'bg-red-100 text-red-700',

  // OT
  IN_OPERATION: 'bg-red-100 text-red-700',
  SETUP: 'bg-amber-100 text-amber-700',
  CLEANING: 'bg-yellow-100 text-yellow-700',

  // Housekeeping
  ASSIGNED: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-green-100 text-green-700',

  // Doctor registry
  VERIFIED_STATUS: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',

  // Subscription
  TRIAL: 'bg-amber-100 text-amber-700',
  STANDARD: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-teal-100 text-teal-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
  STARTER: 'bg-gray-100 text-gray-600',

  // Insurance
  CLAIM_SUBMITTED: 'bg-blue-100 text-blue-700',
  CLAIM_APPROVED: 'bg-green-100 text-green-700',
  CLAIM_REJECTED: 'bg-red-100 text-red-700',

  // Consent
  SIGNED: 'bg-green-100 text-green-700',
  REVOKED: 'bg-red-100 text-red-700',

  // Visitor
  CHECKED_IN: 'bg-green-100 text-green-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',

  // Ambulance
  DISPATCHED: 'bg-blue-100 text-blue-700',
  EN_ROUTE: 'bg-amber-100 text-amber-700',
  ON_SCENE: 'bg-red-100 text-red-700',
  RETURNING: 'bg-teal-100 text-teal-700',

  // Mortuary
  RELEASED: 'bg-green-100 text-green-700',
  AWAITING_RELEASE: 'bg-amber-100 text-amber-700',

  // Diet
  SERVED: 'bg-green-100 text-green-700',

  // Infection control
  OPEN: 'bg-red-100 text-red-700',
  MONITORING: 'bg-amber-100 text-amber-700',
  CONTAINED: 'bg-teal-100 text-teal-700',

  // Telemedicine
  STARTED: 'bg-blue-100 text-blue-700',
  ENDED: 'bg-gray-100 text-gray-600',

  // Attendance
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  HALF_DAY: 'bg-amber-100 text-amber-700',
  LATE: 'bg-orange-100 text-orange-700',
  ON_LEAVE: 'bg-gray-100 text-gray-500',

  // Referral
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',

  // Grievance
  NEW: 'bg-blue-100 text-blue-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-gray-100 text-gray-600',

  // Occupancy
  OCCUPIED: 'bg-red-100 text-red-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
};

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = map[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`} role="status" aria-label={`Status: ${(label || status).replace(/_/g, ' ')}`}>
      {(label || status).replace(/_/g, ' ')}
    </span>
  );
}
