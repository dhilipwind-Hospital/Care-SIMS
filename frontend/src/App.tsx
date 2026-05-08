import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import PatientLayout from './components/layout/PatientLayout';

// ── Lazy page imports (code splitting) ──────────────────────────────────────
const LandingPage                = lazy(() => import('./pages/LandingPage'));
const LoginPage                  = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage          = lazy(() => import('./pages/ResetPasswordPage'));
const NotFoundPage               = lazy(() => import('./pages/NotFoundPage'));
const StaffRegisterPage          = lazy(() => import('./pages/StaffRegisterPage'));

// Queue / Reception
const QueueDashboard             = lazy(() => import('./pages/queue/QueueDashboard'));

// Patients
const PatientsPage               = lazy(() => import('./pages/patients/PatientsPage'));

// Appointments
const AppointmentsPage           = lazy(() => import('./pages/appointments/AppointmentsPage'));
const SelfBookingPage            = lazy(() => import('./pages/appointments/SelfBookingPage'));

// Billing
const BillingPage                = lazy(() => import('./pages/billing/BillingPage'));

// Doctor
const DoctorQueuePage            = lazy(() => import('./pages/doctor/DoctorQueuePage'));
const ConsultationPage           = lazy(() => import('./pages/doctor/ConsultationPage'));
const ConsultationsListPage      = lazy(() => import('./pages/doctor/ConsultationsListPage'));
const PrescriptionsPage          = lazy(() => import('./pages/doctor/PrescriptionsPage'));
const DoctorOrgSelectorPage      = lazy(() => import('./pages/doctor/DoctorOrgSelectorPage'));
const DoctorRegisterPage         = lazy(() => import('./pages/doctor/DoctorRegisterPage'));

// Lab
const LabPage                    = lazy(() => import('./pages/lab/LabPage'));
const LabResultsPage             = lazy(() => import('./pages/lab/LabResultsPage'));
const LabQCPage                  = lazy(() => import('./pages/lab/LabQCPage'));

// Pharmacy
const PharmacyPage               = lazy(() => import('./pages/pharmacy/PharmacyPage'));
const PharmacyInventoryPage      = lazy(() => import('./pages/pharmacy/PharmacyInventoryPage'));
const PurchaseOrdersPage         = lazy(() => import('./pages/pharmacy/PurchaseOrdersPage'));
const PharmacyReturnsPage        = lazy(() => import('./pages/pharmacy/PharmacyReturnsPage'));
const PharmacyReportsPage        = lazy(() => import('./pages/pharmacy/PharmacyReportsPage'));

// Nurse
const WardsPage                  = lazy(() => import('./pages/nurse/WardsPage'));
const AdmissionsPage             = lazy(() => import('./pages/nurse/AdmissionsPage'));
const TriagePage                 = lazy(() => import('./pages/nurse/TriagePage'));
const VitalsPage                 = lazy(() => import('./pages/nurse/VitalsPage'));
const MARPage                    = lazy(() => import('./pages/nurse/MARPage'));

// OT
const OTPage                     = lazy(() => import('./pages/ot/OTPage'));
const OTLiveMonitorPage          = lazy(() => import('./pages/ot/OTLiveMonitorPage'));
const OTEquipmentPage            = lazy(() => import('./pages/ot/OTEquipmentPage'));

// Reports / Audit / Notifications
const ReportsPage                = lazy(() => import('./pages/reports/ReportsPage'));
const AuditPage                  = lazy(() => import('./pages/audit/AuditPage'));
const NotificationsPage          = lazy(() => import('./pages/notifications/NotificationsPage'));

// Admin
const AdminDashboard             = lazy(() => import('./pages/admin/AdminDashboard'));
const UsersPage                  = lazy(() => import('./pages/admin/UsersPage'));
const DepartmentsPage            = lazy(() => import('./pages/admin/DepartmentsPage'));
const RolesPage                  = lazy(() => import('./pages/admin/RolesPage'));
const LocationsPage              = lazy(() => import('./pages/admin/LocationsPage'));
const OrgSettingsPage            = lazy(() => import('./pages/admin/OrgSettingsPage'));
const MfaSetupPage               = lazy(() => import('./pages/admin/MfaSetupPage'));
const ChangePasswordPage         = lazy(() => import('./pages/admin/ChangePasswordPage'));
const ProfilePage                = lazy(() => import('./pages/admin/ProfilePage'));

// Platform
const PlatformDashboard          = lazy(() => import('./pages/platform/PlatformDashboard'));
const PlatformOrganizationsPage  = lazy(() => import('./pages/platform/PlatformOrganizationsPage'));
const PlatformSubscriptionsPage  = lazy(() => import('./pages/platform/PlatformSubscriptionsPage'));
const PlatformFeaturesPage       = lazy(() => import('./pages/platform/PlatformFeaturesPage'));
const DoctorRegistryPage         = lazy(() => import('./pages/platform/DoctorRegistryPage'));
const PlatformAuditPage          = lazy(() => import('./pages/platform/PlatformAuditPage'));

// Patient portal
const PatientRegisterPage        = lazy(() => import('./pages/patient/PatientRegisterPage'));
const PatientLoginPage           = lazy(() => import('./pages/patient/PatientLoginPage'));
const PatientOrgSelectorPage     = lazy(() => import('./pages/patient/PatientOrgSelectorPage'));
const PatientPortalPage          = lazy(() => import('./pages/patient/PatientPortalPage'));
const PatientAppointmentsPage    = lazy(() => import('./pages/patient/PatientAppointmentsPage'));
const PatientMedicalRecordsPage  = lazy(() => import('./pages/patient/PatientMedicalRecordsPage'));
const PatientPrescriptionsPage   = lazy(() => import('./pages/patient/PatientPrescriptionsPage'));
const PatientLabReportsPage      = lazy(() => import('./pages/patient/PatientLabReportsPage'));
const PatientBillingPage         = lazy(() => import('./pages/patient/PatientBillingPage'));
const PatientVitalsPage          = lazy(() => import('./pages/patient/PatientVitalsPage'));

// Operations
const VisitorsPage               = lazy(() => import('./pages/visitors/VisitorsPage'));
const ShiftHandoverPage          = lazy(() => import('./pages/shift-handover/ShiftHandoverPage'));
const HousekeepingPage           = lazy(() => import('./pages/housekeeping/HousekeepingPage'));
const DischargeSummaryPage       = lazy(() => import('./pages/discharge-summary/DischargeSummaryPage'));
const AmbulancePage              = lazy(() => import('./pages/ambulance/AmbulancePage'));
const StaffAttendancePage        = lazy(() => import('./pages/staff-attendance/StaffAttendancePage'));
const InventoryPage              = lazy(() => import('./pages/inventory/InventoryPage'));
const AssetManagementPage        = lazy(() => import('./pages/asset-management/AssetManagementPage'));
const GrievancePage              = lazy(() => import('./pages/grievance/GrievancePage'));

// Clinical
const BloodBankPage              = lazy(() => import('./pages/blood-bank/BloodBankPage'));
const RadiologyPage              = lazy(() => import('./pages/radiology/RadiologyPage'));
const InsurancePage              = lazy(() => import('./pages/insurance/InsurancePage'));
const ReferralPage               = lazy(() => import('./pages/referral/ReferralPage'));
const IcuPage                    = lazy(() => import('./pages/icu/IcuPage'));
const TelemedicinePage           = lazy(() => import('./pages/telemedicine/TelemedicinePage'));
const DialysisPage               = lazy(() => import('./pages/dialysis/DialysisPage'));
const PhysiotherapyPage          = lazy(() => import('./pages/physiotherapy/PhysiotherapyPage'));
const InfectionControlPage       = lazy(() => import('./pages/infection-control/InfectionControlPage'));
const ConsentPage                = lazy(() => import('./pages/consent/ConsentPage'));
const DietPage                   = lazy(() => import('./pages/diet/DietPage'));
const MortuaryPage               = lazy(() => import('./pages/mortuary/MortuaryPage'));
const PayrollPage                = lazy(() => import('./pages/payroll/PayrollPage'));
const WorkOrdersPage             = lazy(() => import('./pages/work-orders/WorkOrdersPage'));
const MlcRegisterPage            = lazy(() => import('./pages/mlc-register/MlcRegisterPage'));
const MrdPage                    = lazy(() => import('./pages/mrd/MrdPage'));
const NicuPage                   = lazy(() => import('./pages/nicu/NicuPage'));
const ClinicalPathwaysPage       = lazy(() => import('./pages/clinical-pathways/ClinicalPathwaysPage'));
const WoundCarePage              = lazy(() => import('./pages/wound-care/WoundCarePage'));
const AntimicrobialPage          = lazy(() => import('./pages/antimicrobial-stewardship/AntimicrobialPage'));
const PalliativeCarePage         = lazy(() => import('./pages/palliative-care/PalliativeCarePage'));
const HomeCarePage               = lazy(() => import('./pages/home-care/HomeCarePage'));
const VendorPage                 = lazy(() => import('./pages/vendor/VendorPage'));
const PurchaseIndentPage         = lazy(() => import('./pages/purchase-indent/PurchaseIndentPage'));
const CentralStorePage           = lazy(() => import('./pages/central-store/CentralStorePage'));
const LinenPage                  = lazy(() => import('./pages/linen/LinenPage'));
const WasteManagementPage        = lazy(() => import('./pages/waste-management/WasteManagementPage'));
const QualityPage                = lazy(() => import('./pages/quality/QualityPage'));
const HealthPackagesPage         = lazy(() => import('./pages/health-packages/HealthPackagesPage'));
const DutyRosterPage             = lazy(() => import('./pages/duty-roster/DutyRosterPage'));
const CssdPage                   = lazy(() => import('./pages/cssd/CssdPage'));
const EmergencyPage              = lazy(() => import('./pages/emergency/EmergencyPage'));
const BirthDeathPage             = lazy(() => import('./pages/birth-death/BirthDeathPage'));
const CertificatesPage           = lazy(() => import('./pages/certificates/CertificatesPage'));
const FeedbackPage               = lazy(() => import('./pages/feedback/FeedbackPage'));
const FlowChartsPage             = lazy(() => import('./pages/flowcharts/FlowChartsPage'));

// ── Suspense fallback ────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role;
  if (role === 'PLATFORM_OWNER' || role === 'PLATFORM_ADMIN') return <Navigate to="/app/platform" replace />;
  if (role === 'ADMIN')    return <Navigate to="/app/admin" replace />;
  if (role === 'DOCTOR')   return <Navigate to="/app/doctor/queue" replace />;
  if (role === 'NURSE')    return <Navigate to="/app/nurse/triage" replace />;
  if (role === 'LAB')      return <Navigate to="/app/lab" replace />;
  if (role === 'PHARMACY') return <Navigate to="/app/pharmacy" replace />;
  if (role === 'BILLING')  return <Navigate to="/app/billing" replace />;
  if (role === 'OT')       return <Navigate to="/app/ot" replace />;
  if (role === 'RECEPTION')return <Navigate to="/app/queue" replace />;
  if (role === 'PATIENT')  return <Navigate to="/app/patient/portal" replace />;
  return <Navigate to="/app/queue" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/doctors/register" element={<DoctorRegisterPage />} />
        <Route path="/staff/register" element={<StaffRegisterPage />} />
        <Route path="/doctor/select-org" element={<DoctorOrgSelectorPage />} />
        <Route path="/patient/register" element={<PatientRegisterPage />} />
        <Route path="/patient/login" element={<PatientLoginPage />} />
        <Route path="/patient/select-hospital" element={<PatientOrgSelectorPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<RootRedirect />} />

          {/* ── Shared (all authenticated users) ── */}
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* ── Reception ── */}
          <Route path="queue" element={<RoleRoute roles={['RECEPTION', 'ADMIN', 'OT']}><QueueDashboard /></RoleRoute>} />
          <Route path="patients" element={<RoleRoute roles={['RECEPTION', 'ADMIN', 'DOCTOR', 'NURSE', 'OT']}><PatientsPage /></RoleRoute>} />
          <Route path="appointments" element={<RoleRoute roles={['RECEPTION', 'ADMIN', 'DOCTOR', 'OT']}><AppointmentsPage /></RoleRoute>} />
          <Route path="appointments/self-booking" element={<SelfBookingPage />} />

          {/* ── Doctor ── */}
          <Route path="doctor/queue" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><DoctorQueuePage /></RoleRoute>} />
          <Route path="doctor/consultations" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><ConsultationsListPage /></RoleRoute>} />
          <Route path="doctor/consultation" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><ConsultationPage /></RoleRoute>} />
          <Route path="doctor/prescriptions" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><PrescriptionsPage /></RoleRoute>} />
          <Route path="doctor/lab-orders" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><LabPage /></RoleRoute>} />

          {/* ── Nurse ── */}
          <Route path="nurse/triage" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><TriagePage /></RoleRoute>} />
          <Route path="nurse/vitals" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><VitalsPage /></RoleRoute>} />
          <Route path="nurse/wards" element={<RoleRoute roles={['NURSE', 'ADMIN']}><WardsPage /></RoleRoute>} />
          <Route path="nurse/admissions" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><AdmissionsPage /></RoleRoute>} />
          <Route path="nurse/mar" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><MARPage /></RoleRoute>} />

          {/* ── Lab ── */}
          <Route path="lab" element={<RoleRoute roles={['LAB', 'DOCTOR', 'ADMIN']}><LabPage /></RoleRoute>} />
          <Route path="lab/results" element={<RoleRoute roles={['LAB', 'DOCTOR', 'ADMIN']}><LabResultsPage /></RoleRoute>} />
          <Route path="lab/qc" element={<RoleRoute roles={['LAB', 'ADMIN']}><LabQCPage /></RoleRoute>} />

          {/* ── Pharmacy ── */}
          <Route path="pharmacy" element={<RoleRoute roles={['PHARMACY', 'ADMIN']}><PharmacyPage /></RoleRoute>} />
          <Route path="pharmacy/inventory" element={<RoleRoute roles={['PHARMACY', 'ADMIN']}><PharmacyInventoryPage /></RoleRoute>} />
          <Route path="pharmacy/purchase-orders" element={<RoleRoute roles={['PHARMACY', 'ADMIN']}><PurchaseOrdersPage /></RoleRoute>} />
          <Route path="pharmacy/returns" element={<RoleRoute roles={['PHARMACY', 'ADMIN']}><PharmacyReturnsPage /></RoleRoute>} />
          <Route path="pharmacy/reports" element={<RoleRoute roles={['PHARMACY', 'ADMIN']}><PharmacyReportsPage /></RoleRoute>} />

          {/* ── Billing ── */}
          <Route path="billing" element={<RoleRoute roles={['BILLING', 'RECEPTION', 'PHARMACY', 'ADMIN', 'OT']}><BillingPage /></RoleRoute>} />

          {/* ── OT ── */}
          <Route path="ot" element={<RoleRoute roles={['OT', 'DOCTOR', 'NURSE', 'ADMIN']}><OTPage /></RoleRoute>} />
          <Route path="ot/live" element={<RoleRoute roles={['OT', 'DOCTOR', 'NURSE', 'ADMIN']}><OTLiveMonitorPage /></RoleRoute>} />
          <Route path="ot/equipment" element={<RoleRoute roles={['OT', 'ADMIN']}><OTEquipmentPage /></RoleRoute>} />

          {/* ── Admin ── */}
          <Route path="admin" element={<RoleRoute roles={['ADMIN']}><AdminDashboard /></RoleRoute>} />
          <Route path="admin/users" element={<RoleRoute roles={['ADMIN']}><UsersPage /></RoleRoute>} />
          <Route path="admin/roles" element={<RoleRoute roles={['ADMIN']}><RolesPage /></RoleRoute>} />
          <Route path="admin/departments" element={<RoleRoute roles={['ADMIN']}><DepartmentsPage /></RoleRoute>} />
          <Route path="admin/reports" element={<RoleRoute roles={['ADMIN', 'LAB', 'BILLING']}><ReportsPage /></RoleRoute>} />
          <Route path="admin/audit" element={<RoleRoute roles={['ADMIN']}><AuditPage /></RoleRoute>} />
          <Route path="admin/locations" element={<RoleRoute roles={['ADMIN']}><LocationsPage /></RoleRoute>} />
          <Route path="admin/settings" element={<RoleRoute roles={['ADMIN']}><OrgSettingsPage /></RoleRoute>} />
          <Route path="admin/mfa" element={<RoleRoute roles={['ADMIN']}><MfaSetupPage /></RoleRoute>} />

          {/* ── Patient Portal — uses PatientLayout (see sibling route below) ── */}

          {/* ── Clinical Shared (doctors, nurses, admin) ── */}
          <Route path="blood-bank" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><BloodBankPage /></RoleRoute>} />
          <Route path="radiology" element={<RoleRoute roles={['DOCTOR', 'LAB', 'ADMIN']}><RadiologyPage /></RoleRoute>} />
          <Route path="insurance" element={<RoleRoute roles={['BILLING', 'RECEPTION', 'ADMIN']}><InsurancePage /></RoleRoute>} />
          <Route path="referral" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><ReferralPage /></RoleRoute>} />
          <Route path="icu" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><IcuPage /></RoleRoute>} />
          <Route path="telemedicine" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><TelemedicinePage /></RoleRoute>} />
          <Route path="dialysis" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><DialysisPage /></RoleRoute>} />
          <Route path="physiotherapy" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><PhysiotherapyPage /></RoleRoute>} />
          <Route path="discharge-summary" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><DischargeSummaryPage /></RoleRoute>} />
          <Route path="consent" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><ConsentPage /></RoleRoute>} />
          <Route path="diet" element={<RoleRoute roles={['NURSE', 'ADMIN']}><DietPage /></RoleRoute>} />
          <Route path="infection-control" element={<RoleRoute roles={['NURSE', 'ADMIN']}><InfectionControlPage /></RoleRoute>} />
          <Route path="mortuary" element={<RoleRoute roles={['NURSE', 'ADMIN']}><MortuaryPage /></RoleRoute>} />
          <Route path="payroll" element={<RoleRoute roles={['ADMIN']}><PayrollPage /></RoleRoute>} />
          <Route path="work-orders" element={<RoleRoute roles={['ADMIN', 'NURSE', 'DOCTOR', 'RECEPTION']}><WorkOrdersPage /></RoleRoute>} />
          <Route path="mlc" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'RECEPTION', 'ADMIN']}><MlcRegisterPage /></RoleRoute>} />
          <Route path="mrd" element={<RoleRoute roles={['ADMIN']}><MrdPage /></RoleRoute>} />
          <Route path="nicu" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><NicuPage /></RoleRoute>} />
          <Route path="clinical-pathways" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><ClinicalPathwaysPage /></RoleRoute>} />
          <Route path="wound-care" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><WoundCarePage /></RoleRoute>} />
          <Route path="antimicrobial" element={<RoleRoute roles={['DOCTOR', 'PHARMACY', 'ADMIN']}><AntimicrobialPage /></RoleRoute>} />
          <Route path="palliative-care" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><PalliativeCarePage /></RoleRoute>} />
          <Route path="home-care" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><HomeCarePage /></RoleRoute>} />
          <Route path="vendors" element={<RoleRoute roles={['ADMIN', 'PHARMACY']}><VendorPage /></RoleRoute>} />
          <Route path="purchase-indents" element={<RoleRoute roles={['ADMIN', 'NURSE', 'PHARMACY', 'LAB']}><PurchaseIndentPage /></RoleRoute>} />
          <Route path="central-store" element={<RoleRoute roles={['ADMIN', 'NURSE', 'PHARMACY']}><CentralStorePage /></RoleRoute>} />
          <Route path="linen" element={<RoleRoute roles={['ADMIN', 'NURSE']}><LinenPage /></RoleRoute>} />
          <Route path="waste-management" element={<RoleRoute roles={['ADMIN', 'NURSE']}><WasteManagementPage /></RoleRoute>} />
          <Route path="quality" element={<RoleRoute roles={['ADMIN']}><QualityPage /></RoleRoute>} />
          <Route path="health-packages" element={<RoleRoute roles={['ADMIN', 'RECEPTION', 'DOCTOR']}><HealthPackagesPage /></RoleRoute>} />
          <Route path="duty-roster" element={<RoleRoute roles={['ADMIN', 'NURSE', 'DOCTOR', 'RECEPTION', 'PHARMACY', 'LAB', 'OT']}><DutyRosterPage /></RoleRoute>} />
          <Route path="cssd" element={<RoleRoute roles={['NURSE', 'OT', 'ADMIN']}><CssdPage /></RoleRoute>} />
          <Route path="emergency" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'RECEPTION', 'ADMIN']}><EmergencyPage /></RoleRoute>} />
          <Route path="birth-death" element={<RoleRoute roles={['DOCTOR', 'NURSE', 'ADMIN']}><BirthDeathPage /></RoleRoute>} />
          <Route path="certificates" element={<RoleRoute roles={['DOCTOR', 'ADMIN']}><CertificatesPage /></RoleRoute>} />
          <Route path="feedback" element={<RoleRoute roles={['RECEPTION', 'NURSE', 'ADMIN']}><FeedbackPage /></RoleRoute>} />

          {/* ── Operations (reception, nurse, admin) ── */}
          <Route path="visitors" element={<RoleRoute roles={['RECEPTION', 'NURSE', 'ADMIN']}><VisitorsPage /></RoleRoute>} />
          <Route path="shift-handover" element={<RoleRoute roles={['NURSE', 'DOCTOR', 'ADMIN']}><ShiftHandoverPage /></RoleRoute>} />
          <Route path="housekeeping" element={<RoleRoute roles={['NURSE', 'ADMIN']}><HousekeepingPage /></RoleRoute>} />
          <Route path="ambulance" element={<RoleRoute roles={['RECEPTION', 'NURSE', 'ADMIN']}><AmbulancePage /></RoleRoute>} />
          <Route path="staff-attendance" element={<RoleRoute roles={['ADMIN', 'NURSE', 'DOCTOR', 'RECEPTION', 'PHARMACY', 'LAB', 'BILLING', 'OT']}><StaffAttendancePage /></RoleRoute>} />
          <Route path="inventory" element={<RoleRoute roles={['PHARMACY', 'NURSE', 'ADMIN']}><InventoryPage /></RoleRoute>} />
          <Route path="asset-management" element={<RoleRoute roles={['ADMIN']}><AssetManagementPage /></RoleRoute>} />
          <Route path="grievance" element={<RoleRoute roles={['RECEPTION', 'ADMIN']}><GrievancePage /></RoleRoute>} />

          {/* ── Platform ── */}
          <Route path="platform" element={<RoleRoute roles={['PLATFORM_OWNER', 'PLATFORM_ADMIN']}><PlatformDashboard /></RoleRoute>} />
          <Route path="platform/organizations" element={<RoleRoute roles={['PLATFORM_OWNER', 'PLATFORM_ADMIN']}><PlatformOrganizationsPage /></RoleRoute>} />
          <Route path="platform/subscriptions" element={<RoleRoute roles={['PLATFORM_OWNER', 'PLATFORM_ADMIN']}><PlatformSubscriptionsPage /></RoleRoute>} />
          <Route path="platform/features" element={<RoleRoute roles={['PLATFORM_OWNER', 'PLATFORM_ADMIN']}><PlatformFeaturesPage /></RoleRoute>} />
          <Route path="platform/doctors" element={<RoleRoute roles={['PLATFORM_OWNER', 'PLATFORM_ADMIN']}><DoctorRegistryPage /></RoleRoute>} />
          <Route path="platform/audit" element={<RoleRoute roles={['PLATFORM_OWNER', 'PLATFORM_ADMIN']}><PlatformAuditPage /></RoleRoute>} />
          <Route path="flowcharts" element={<ProtectedRoute><FlowChartsPage /></ProtectedRoute>} />
        </Route>

        {/* ── Patient Portal — dedicated PatientLayout (no staff sidebar) ── */}
        <Route path="/app/patient" element={<ProtectedRoute><PatientLayout /></ProtectedRoute>}>
          <Route path="portal"        element={<RoleRoute roles={['PATIENT']}><PatientPortalPage /></RoleRoute>} />
          <Route path="appointments"  element={<RoleRoute roles={['PATIENT']}><PatientAppointmentsPage /></RoleRoute>} />
          <Route path="records"       element={<RoleRoute roles={['PATIENT']}><PatientMedicalRecordsPage /></RoleRoute>} />
          <Route path="prescriptions" element={<RoleRoute roles={['PATIENT']}><PatientPrescriptionsPage /></RoleRoute>} />
          <Route path="lab"           element={<RoleRoute roles={['PATIENT']}><PatientLabReportsPage /></RoleRoute>} />
          <Route path="billing"       element={<RoleRoute roles={['PATIENT']}><PatientBillingPage /></RoleRoute>} />
          <Route path="vitals"        element={<RoleRoute roles={['PATIENT']}><PatientVitalsPage /></RoleRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/** Catches unhandled promise rejections and uncaught errors, shows a toast. */
function GlobalErrorHandler() {
  const recentErrors = useRef(new Set<string>());

  useEffect(() => {
    function getErrorKey(error: unknown): string {
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      return String(error);
    }

    function showErrorToast(key: string) {
      // Deduplicate: don't show the same error toast within 5 seconds
      if (recentErrors.current.has(key)) return;
      recentErrors.current.add(key);
      setTimeout(() => recentErrors.current.delete(key), 5000);

      toast.error('Something went wrong. Please try again or refresh the page.');
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const key = getErrorKey(event.reason);
      console.error('Unhandled promise rejection:', event.reason);
      showErrorToast(key);
    }

    function handleError(event: ErrorEvent) {
      const key = getErrorKey(event.error || event.message);
      console.error('Uncaught error:', event.error || event.message);
      showErrorToast(key);
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <BrowserRouter>
                <GlobalErrorHandler />
                <AppRoutes />
              </BrowserRouter>
            </SocketProvider>
          </AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '8px', fontSize: '14px' } }} />
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
