import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  app: 'Dashboard',
  queue: 'Queue',
  patients: 'Patients',
  appointments: 'Appointments',
  billing: 'Billing',
  doctor: 'Doctor',
  consultation: 'Consultation',
  prescriptions: 'Prescriptions',
  'lab-orders': 'Lab Orders',
  nurse: 'Nursing',
  triage: 'Triage',
  vitals: 'Vitals',
  wards: 'Wards',
  admissions: 'Admissions',
  mar: 'MAR',
  lab: 'Laboratory',
  results: 'Results',
  qc: 'Quality Control',
  pharmacy: 'Pharmacy',
  inventory: 'Inventory',
  'purchase-orders': 'Purchase Orders',
  returns: 'Returns',
  reports: 'Reports',
  ot: 'Operation Theatre',
  live: 'Live Monitor',
  equipment: 'Equipment',
  admin: 'Admin',
  users: 'Users',
  roles: 'Roles',
  departments: 'Departments',
  audit: 'Audit Log',
  locations: 'Locations',
  settings: 'Settings',
  mfa: 'MFA Setup',
  notifications: 'Notifications',
  patient: 'Patient',
  portal: 'Portal',
  records: 'Medical Records',
  visitors: 'Visitors',
  'shift-handover': 'Shift Handover',
  housekeeping: 'Housekeeping',
  'discharge-summary': 'Discharge Summary',
  'blood-bank': 'Blood Bank',
  radiology: 'Radiology',
  insurance: 'Insurance',
  referral: 'Referrals',
  icu: 'ICU',
  telemedicine: 'Telemedicine',
  dialysis: 'Dialysis',
  physiotherapy: 'Physiotherapy',
  ambulance: 'Ambulance',
  'staff-attendance': 'Staff Attendance',
  'asset-management': 'Asset Management',
  grievance: 'Grievance',
  'infection-control': 'Infection Control',
  consent: 'Consent',
  diet: 'Diet & Nutrition',
  mortuary: 'Mortuary',
  platform: 'Platform',
  organizations: 'Organizations',
  subscriptions: 'Subscriptions',
  features: 'Features',
  doctors: 'Doctors',
  'self-booking': 'Self Booking',
};

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Don't render for root/app-only paths
  if (segments.length <= 1) return null;

  // Build breadcrumb items from segments after 'app'
  const appIndex = segments.indexOf('app');
  if (appIndex === -1) return null;

  const crumbs = segments.slice(appIndex + 1);
  if (crumbs.length <= 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
      <Link to="/app" className="hover:text-teal-600 transition-colors" aria-label="Home">
        <Home size={12} />
      </Link>
      {crumbs.map((segment, i) => {
        const path = '/app/' + crumbs.slice(0, i + 1).join('/');
        const label = routeLabels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const isLast = i === crumbs.length - 1;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight size={10} className="text-gray-300" />
            {isLast ? (
              <span className="text-gray-600 font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-teal-600 transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
