import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/I18nContext';
import { LABEL_TO_I18N_KEY } from '../../lib/i18n';
import { clearAuth } from '../../lib/auth';
import ayphenLogo from '../../assets/ayphen-logo.svg';
import {
  LayoutDashboard, Users, Calendar, ClipboardList, FlaskConical,
  Activity, Bed, Pill, Scissors, FileText, BarChart3, Bell,
  Shield, Heart, CreditCard, UserCheck, Stethoscope, Building2, Layers, MapPin, Settings,
  UserPlus, ArrowRightLeft, Sparkles, FileBadge, LogOut, Search, Lock,
  Droplets, ScanLine, ShieldCheck, GitBranch, Monitor, Video,
  HeartPulse, Dumbbell, Ambulance, Clock, Package, Wrench,
  MessageSquare, Bug, FileCheck, UtensilsCrossed, Skull, Siren, Baby, Award, Star,
} from 'lucide-react';

export type NavItem = { label: string; icon: React.ElementType; path: string; module?: string };

// Base nav items per UI role — each item optionally gated by a module flag
export const navByRole: Record<string, NavItem[]> = {
  RECEPTION: [
    { label: 'Queue Dashboard',      icon: LayoutDashboard, path: '/app/queue',           module: 'MOD_QUEUE' },
    { label: 'Patient Registration', icon: Users,           path: '/app/patients',        module: 'MOD_PAT_REG' },
    { label: 'Appointments',         icon: Calendar,        path: '/app/appointments',    module: 'MOD_APPT' },
    { label: 'Billing',              icon: CreditCard,      path: '/app/billing',         module: 'MOD_BILL_OPD' },
    { label: 'Insurance/TPA',        icon: ShieldCheck,     path: '/app/insurance',       module: 'MOD_INSURANCE' },
    { label: 'Ambulance',            icon: Ambulance,       path: '/app/ambulance',       module: 'MOD_AMBULANCE' },
    { label: 'Visitor Management',   icon: UserPlus,        path: '/app/visitors',        module: 'MOD_VISITOR' },
    { label: 'Emergency',            icon: Siren,           path: '/app/emergency' },
    { label: 'Grievance',            icon: MessageSquare,   path: '/app/grievance',       module: 'MOD_GRIEVANCE' },
    { label: 'Patient Feedback',     icon: Star,            path: '/app/feedback' },
    { label: 'Notifications',        icon: Bell,            path: '/app/notifications' },
  ],
  DOCTOR: [
    { label: 'My Dashboard',       icon: LayoutDashboard,  path: '/app/doctor/queue',        module: 'MOD_QUEUE' },
    { label: 'Patient Queue',      icon: ClipboardList,    path: '/app/doctor/queue',        module: 'MOD_QUEUE' },
    { label: 'Consultations',       icon: ClipboardList,    path: '/app/doctor/consultations',module: 'MOD_CONSULT' },
    { label: 'New Consultation',    icon: Stethoscope,      path: '/app/doctor/consultation', module: 'MOD_CONSULT' },
    { label: 'Prescriptions',      icon: Pill,             path: '/app/doctor/prescriptions',module: 'MOD_RX' },
    { label: 'Lab Orders',         icon: FlaskConical,     path: '/app/doctor/lab-orders',   module: 'MOD_LAB_ORD' },
    { label: 'Radiology',          icon: ScanLine,         path: '/app/radiology',           module: 'MOD_RADIOLOGY' },
    { label: 'Referral',           icon: GitBranch,        path: '/app/referral',            module: 'MOD_REFERRAL' },
    { label: 'Telemedicine',       icon: Video,            path: '/app/telemedicine',        module: 'MOD_TELEMEDICINE' },
    { label: 'Consent Forms',      icon: FileCheck,        path: '/app/consent',             module: 'MOD_CONSENT' },
    { label: 'Discharge Summary',  icon: FileBadge,        path: '/app/discharge-summary',   module: 'MOD_DISCHARGE' },
    { label: 'Medical Certificates', icon: Award,          path: '/app/certificates' },
    { label: 'Birth & Death',      icon: Baby,             path: '/app/birth-death' },
    { label: 'Emergency',          icon: Siren,            path: '/app/emergency' },
    { label: 'Shift Handover',     icon: ArrowRightLeft,   path: '/app/shift-handover',      module: 'MOD_SHIFT_HANDOVER' },
    { label: 'Notifications',      icon: Bell,             path: '/app/notifications' },
  ],
  NURSE: [
    { label: 'Triage',              icon: Heart,           path: '/app/nurse/triage',      module: 'MOD_TRIAGE' },
    { label: 'Vitals Recording',    icon: Activity,        path: '/app/nurse/vitals',      module: 'MOD_VITALS' },
    { label: 'Ward Management',     icon: Bed,             path: '/app/nurse/wards',       module: 'MOD_WARD' },
    { label: 'Medication Admin',    icon: Pill,            path: '/app/nurse/mar',         module: 'MOD_MED_ADMIN' },
    { label: 'Admissions',          icon: UserCheck,       path: '/app/nurse/admissions',  module: 'MOD_ADMISSION' },
    { label: 'ICU Monitoring',      icon: Monitor,         path: '/app/icu',               module: 'MOD_ICU' },
    { label: 'Blood Bank',          icon: Droplets,        path: '/app/blood-bank',        module: 'MOD_BLOOD_BANK' },
    { label: 'Dialysis',            icon: HeartPulse,      path: '/app/dialysis',          module: 'MOD_DIALYSIS' },
    { label: 'Diet & Nutrition',    icon: UtensilsCrossed, path: '/app/diet',              module: 'MOD_DIET' },
    { label: 'Infection Control',   icon: Bug,             path: '/app/infection-control', module: 'MOD_INFECTION_CTRL' },
    { label: 'Consent Forms',       icon: FileCheck,       path: '/app/consent',           module: 'MOD_CONSENT' },
    { label: 'Discharge Summary',   icon: FileBadge,       path: '/app/discharge-summary', module: 'MOD_DISCHARGE' },
    { label: 'Shift Handover',      icon: ArrowRightLeft,  path: '/app/shift-handover',    module: 'MOD_SHIFT_HANDOVER' },
    { label: 'Housekeeping',        icon: Sparkles,        path: '/app/housekeeping',      module: 'MOD_HOUSEKEEPING' },
    { label: 'Visitor Management',  icon: UserPlus,        path: '/app/visitors',          module: 'MOD_VISITOR' },
    { label: 'Notifications',       icon: Bell,            path: '/app/notifications' },
  ],
  PHARMACY: [
    { label: 'Dispense',        icon: Pill,      path: '/app/pharmacy',                  module: 'MOD_PHARMA_FULL' },
    { label: 'Inventory',       icon: BarChart3, path: '/app/pharmacy/inventory',        module: 'MOD_PHARMA_FULL' },
    { label: 'Purchase Orders', icon: FileText,  path: '/app/pharmacy/purchase-orders',  module: 'MOD_PHARMA_PO' },
    { label: 'Returns',         icon: Activity,  path: '/app/pharmacy/returns',          module: 'MOD_PHARMA_RETURNS' },
    { label: 'Reports',         icon: BarChart3, path: '/app/pharmacy/reports',          module: 'MOD_PHARMA_REPORTS' },
    { label: 'Billing',         icon: CreditCard,path: '/app/billing',                   module: 'MOD_BILL_OPD' },
    { label: 'Notifications',   icon: Bell,      path: '/app/notifications' },
  ],
  LAB: [
    { label: 'Sample Processing', icon: FlaskConical, path: '/app/lab',          module: 'MOD_LAB_FULL' },
    { label: 'Test Results',      icon: FileText,     path: '/app/lab/results',  module: 'MOD_LAB_FULL' },
    { label: 'Quality Control',   icon: Shield,       path: '/app/lab/qc',       module: 'MOD_LAB_QC' },
    { label: 'Reports',           icon: BarChart3,    path: '/app/admin/reports', module: 'MOD_REPORTS' },
    { label: 'Notifications',     icon: Bell,         path: '/app/notifications' },
  ],
  BILLING: [
    { label: 'Billing & Invoices', icon: CreditCard, path: '/app/billing',       module: 'MOD_BILL_OPD' },
    { label: 'Reports',            icon: BarChart3,   path: '/app/admin/reports', module: 'MOD_REPORTS' },
    { label: 'Notifications',      icon: Bell,        path: '/app/notifications' },
  ],
  OT: [
    { label: 'Queue Dashboard',       icon: LayoutDashboard, path: '/app/queue',        module: 'MOD_QUEUE' },
    { label: 'Patient Registration',  icon: Users,           path: '/app/patients',     module: 'MOD_PAT_REG' },
    { label: 'Appointments',          icon: Calendar,        path: '/app/appointments', module: 'MOD_APPT' },
    { label: 'Billing',               icon: CreditCard,      path: '/app/billing',      module: 'MOD_BILL_OPD' },
    { label: 'Operation Theatre',     icon: Scissors,        path: '/app/ot',           module: 'MOD_OT_SCHEDULE' },
    { label: 'Notifications',         icon: Bell,            path: '/app/notifications' },
  ],
  ADMIN: [
    { label: 'Dashboard',           icon: LayoutDashboard, path: '/app/admin' },
    { label: 'Users & Staff',       icon: Users,           path: '/app/admin/users' },
    { label: 'Roles & Permissions', icon: Shield,          path: '/app/admin/roles' },
    { label: 'Departments',         icon: ClipboardList,   path: '/app/admin/departments' },
    { label: 'Consultations',       icon: Stethoscope,     path: '/app/doctor/consultations', module: 'MOD_CONSULT' },
    { label: 'Locations',           icon: MapPin,          path: '/app/admin/locations' },
    { label: 'Blood Bank',          icon: Droplets,        path: '/app/blood-bank',          module: 'MOD_BLOOD_BANK' },
    { label: 'Radiology',           icon: ScanLine,        path: '/app/radiology',           module: 'MOD_RADIOLOGY' },
    { label: 'Insurance/TPA',       icon: ShieldCheck,     path: '/app/insurance',           module: 'MOD_INSURANCE' },
    { label: 'ICU Management',      icon: Monitor,         path: '/app/icu',                 module: 'MOD_ICU' },
    { label: 'Dialysis',            icon: HeartPulse,      path: '/app/dialysis',            module: 'MOD_DIALYSIS' },
    { label: 'Physiotherapy',       icon: Dumbbell,        path: '/app/physiotherapy',       module: 'MOD_PHYSIOTHERAPY' },
    { label: 'Ambulance',           icon: Ambulance,       path: '/app/ambulance',           module: 'MOD_AMBULANCE' },
    { label: 'Telemedicine',        icon: Video,           path: '/app/telemedicine',        module: 'MOD_TELEMEDICINE' },
    { label: 'Staff Attendance',    icon: Clock,           path: '/app/staff-attendance',    module: 'MOD_ATTENDANCE' },
    { label: 'Inventory',           icon: Package,         path: '/app/inventory',           module: 'MOD_INVENTORY' },
    { label: 'Asset Management',    icon: Wrench,          path: '/app/asset-management',    module: 'MOD_ASSETS' },
    { label: 'Grievance',           icon: MessageSquare,   path: '/app/grievance',           module: 'MOD_GRIEVANCE' },
    { label: 'Infection Control',   icon: Bug,             path: '/app/infection-control',   module: 'MOD_INFECTION_CTRL' },
    { label: 'Diet & Nutrition',    icon: UtensilsCrossed, path: '/app/diet',                module: 'MOD_DIET' },
    { label: 'Mortuary',            icon: Skull,           path: '/app/mortuary',            module: 'MOD_MORTUARY' },
    { label: 'Visitor Management',  icon: UserPlus,        path: '/app/visitors',            module: 'MOD_VISITOR' },
    { label: 'Housekeeping',        icon: Sparkles,        path: '/app/housekeeping',        module: 'MOD_HOUSEKEEPING' },
    { label: 'Shift Handover',      icon: ArrowRightLeft,  path: '/app/shift-handover',      module: 'MOD_SHIFT_HANDOVER' },
    { label: 'Emergency',           icon: Siren,           path: '/app/emergency' },
    { label: 'Birth & Death',       icon: Baby,            path: '/app/birth-death' },
    { label: 'Medical Certificates', icon: Award,          path: '/app/certificates' },
    { label: 'Payroll',             icon: CreditCard,      path: '/app/payroll' },
    { label: 'Work Orders',        icon: Wrench,          path: '/app/work-orders' },
    { label: 'MLC Register',       icon: Shield,          path: '/app/mlc' },
    { label: 'Medical Records',    icon: FileText,        path: '/app/mrd' },
    { label: 'NICU',                icon: Baby,            path: '/app/nicu' },
    { label: 'Clinical Pathways',  icon: GitBranch,       path: '/app/clinical-pathways' },
    { label: 'Wound Care',         icon: Heart,           path: '/app/wound-care' },
    { label: 'Antimicrobial',      icon: Pill,            path: '/app/antimicrobial' },
    { label: 'Palliative Care',    icon: HeartPulse,      path: '/app/palliative-care' },
    { label: 'Home Care',          icon: Activity,        path: '/app/home-care' },
    { label: 'Vendor Management',   icon: Building2,       path: '/app/vendors' },
    { label: 'Purchase Indents',   icon: FileText,        path: '/app/purchase-indents' },
    { label: 'Central Store',      icon: Package,         path: '/app/central-store' },
    { label: 'Linen & Laundry',   icon: Sparkles,        path: '/app/linen' },
    { label: 'Waste Management',   icon: Bug,             path: '/app/waste-management' },
    { label: 'Quality (NABH)',     icon: Shield,          path: '/app/quality' },
    { label: 'Health Packages',    icon: Heart,           path: '/app/health-packages' },
    { label: 'Duty Roster',         icon: Calendar,        path: '/app/duty-roster' },
    { label: 'CSSD',                icon: Shield,          path: '/app/cssd' },
    { label: 'Patient Feedback',    icon: Star,            path: '/app/feedback' },
    { label: 'Reports',             icon: BarChart3,       path: '/app/admin/reports',       module: 'MOD_REPORTS' },
    { label: 'Audit Logs',          icon: Shield,          path: '/app/admin/audit',         module: 'MOD_AUDIT' },
    { label: 'Org Settings',        icon: Settings,        path: '/app/admin/settings' },
    { label: 'MFA Setup',           icon: Shield,          path: '/app/admin/mfa' },
    { label: 'Notifications',       icon: Bell,            path: '/app/notifications' },
  ],
  PLATFORM_OWNER: [
    { label: 'Platform Overview', icon: LayoutDashboard, path: '/app/platform' },
    { label: 'Organizations',     icon: Building2,       path: '/app/platform/organizations' },
    { label: 'Doctor Registry',   icon: UserCheck,       path: '/app/platform/doctors' },
    { label: 'Subscriptions',     icon: CreditCard,      path: '/app/platform/subscriptions' },
    { label: 'Feature Modules',   icon: Layers,          path: '/app/platform/features' },
    { label: 'Platform Audit',    icon: Shield,          path: '/app/platform/audit' },
    { label: 'Notifications',     icon: Bell,            path: '/app/notifications' },
  ],
  PLATFORM_ADMIN: [
    { label: 'Platform Overview', icon: LayoutDashboard, path: '/app/platform' },
    { label: 'Organizations',     icon: Building2,       path: '/app/platform/organizations' },
    { label: 'Doctor Registry',   icon: UserCheck,       path: '/app/platform/doctors' },
    { label: 'Subscriptions',     icon: CreditCard,      path: '/app/platform/subscriptions' },
    { label: 'Feature Modules',   icon: Layers,          path: '/app/platform/features' },
    { label: 'Platform Audit',    icon: Shield,          path: '/app/platform/audit' },
    { label: 'Notifications',     icon: Bell,            path: '/app/notifications' },
  ],
  PATIENT: [
    { label: 'My Dashboard',      icon: LayoutDashboard, path: '/app/patient/portal' },
    { label: 'Book Appointment',  icon: Calendar,        path: '/app/patient/appointments' },
    { label: 'Medical Records',   icon: FileText,        path: '/app/patient/records' },
    { label: 'Prescriptions',     icon: Pill,            path: '/app/patient/prescriptions' },
    { label: 'Lab Reports',       icon: FlaskConical,    path: '/app/patient/lab' },
    { label: 'Billing',           icon: CreditCard,      path: '/app/patient/billing' },
    { label: 'Vitals History',    icon: Activity,        path: '/app/patient/vitals' },
    { label: 'Notifications',     icon: Bell,            path: '/app/notifications' },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'ADMIN PANEL', DOCTOR: 'DOCTOR MENU', NURSE: 'NURSE STATION',
  RECEPTION: 'MAIN MENU', PHARMACY: 'PHARMACY', LAB: 'LABORATORY',
  BILLING: 'BILLING', OT: 'MAIN MENU', PLATFORM_OWNER: 'PLATFORM', PLATFORM_ADMIN: 'PLATFORM',
  PATIENT: 'PATIENT PORTAL',
};

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const ROLE_I18N_KEY: Record<string, string> = {
  ADMIN: 'role.admin', DOCTOR: 'role.doctor', NURSE: 'role.nurse',
  RECEPTION: 'role.reception', PHARMACY: 'role.pharmacy', LAB: 'role.lab',
  BILLING: 'role.billing', OT: 'role.ot', PLATFORM_OWNER: 'role.platformOwner',
  PLATFORM_ADMIN: 'role.platformAdmin', PATIENT: 'role.patient',
};

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const role = user?.role || 'RECEPTION';
  const enabledModules: string[] = user?.enabledModules || [];

  // Filter items by module — show item if no module gate OR if module is enabled for the org
  const allItems = navByRole[role] || navByRole['RECEPTION'];
  const navItems = allItems.filter(item =>
    !item.module || enabledModules.length === 0 || enabledModules.includes(item.module)
  );

  const handleNavClick = () => { if (onMobileClose) onMobileClose(); };

  const sidebarContent = (
    <>
      {/* Logo — Platform Admin sees Ayphen logo, org users see their org name with building icon */}
      <div className="px-8 flex items-center gap-3" style={{ height: 88, borderBottom: '1px solid var(--sidebar-border)' }}>
        {role === 'PLATFORM_OWNER' || role === 'PLATFORM_ADMIN' ? (
          <img src={ayphenLogo} alt="Ayphen" className="w-8 h-8 flex-shrink-0" />
        ) : user?.tenantLogoUrl ? (
          <img src={user.tenantLogoUrl} alt={user?.tenantName || 'Logo'} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <span className="text-white font-bold text-lg leading-tight truncate">
          {role === 'PLATFORM_OWNER' || role === 'PLATFORM_ADMIN'
            ? 'Ayphen HMS'
            : user?.tenantName || 'Hospital'}
        </span>
      </div>

      {/* Search trigger */}
      <div className="px-4 pt-3">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            if (onMobileClose) onMobileClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--sidebar-text)' }}
        >
          <Search size={16} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.1)' }}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-2">
        <p className="text-sm px-4 py-4" style={{ color: 'var(--sidebar-text)' }}>
          {ROLE_I18N_KEY[role] ? t(ROLE_I18N_KEY[role]) : (ROLE_LABEL[role] || role.replace(/_/g, ' '))}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              onClick={handleNavClick}
              className="flex items-center gap-4 px-4 py-3 text-base font-normal transition-all"
              style={{
                borderRadius: 'var(--radius-pill)',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              }}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="flex-1 truncate">{LABEL_TO_I18N_KEY[item.label] ? t(LABEL_TO_I18N_KEY[item.label]) : item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="px-8 py-6" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-base font-normal truncate" style={{ color: 'var(--sidebar-active-text)' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-base truncate" style={{ color: 'var(--sidebar-text)' }}>
              {role === 'PATIENT' ? (user?.tenantName || user?.email) : user?.email}
            </div>
          </div>
          <Link
            to="/app/change-password"
            className="transition-colors flex-shrink-0 hover:text-white"
            style={{ color: 'var(--sidebar-text)' }}
            title="Change Password"
          >
            <Lock size={18} />
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="transition-colors flex-shrink-0 hover:text-white"
            style={{ color: 'var(--sidebar-text)' }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <div
        className="hidden lg:flex fixed left-0 top-0 h-screen flex-col z-40"
        style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {sidebarContent}
      </div>

      {/* Mobile sidebar — overlay drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <div
            className="relative h-screen flex flex-col z-10"
            style={{ width: 280, background: 'var(--sidebar-bg)' }}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl z-10">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <LogOut size={22} className="text-red-500" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-1">{t('action.logout')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">{t('msg.confirmLogout')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('action.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (role === 'PATIENT') {
                    clearAuth();
                    window.location.replace('/patient/login');
                  } else {
                    logout();
                  }
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                {t('action.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
