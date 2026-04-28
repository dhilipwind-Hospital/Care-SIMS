import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import QueueDashboard from './pages/queue/QueueDashboard';
import PatientsPage from './pages/patients/PatientsPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import BillingPage from './pages/billing/BillingPage';
import DoctorQueuePage from './pages/doctor/DoctorQueuePage';
import ConsultationPage from './pages/doctor/ConsultationPage';
import ConsultationsListPage from './pages/doctor/ConsultationsListPage';
import PrescriptionsPage from './pages/doctor/PrescriptionsPage';
import LabPage from './pages/lab/LabPage';
import PharmacyPage from './pages/pharmacy/PharmacyPage';
import WardsPage from './pages/nurse/WardsPage';
import AdmissionsPage from './pages/nurse/AdmissionsPage';
import TriagePage from './pages/nurse/TriagePage';
import VitalsPage from './pages/nurse/VitalsPage';
import MARPage from './pages/nurse/MARPage';
import OTPage from './pages/ot/OTPage';
import OTLiveMonitorPage from './pages/ot/OTLiveMonitorPage';
import OTEquipmentPage from './pages/ot/OTEquipmentPage';
import ReportsPage from './pages/reports/ReportsPage';
import AuditPage from './pages/audit/AuditPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import PlatformDashboard from './pages/platform/PlatformDashboard';
import PlatformOrganizationsPage from './pages/platform/PlatformOrganizationsPage';
import PlatformSubscriptionsPage from './pages/platform/PlatformSubscriptionsPage';
import PlatformFeaturesPage from './pages/platform/PlatformFeaturesPage';
import DoctorRegistryPage from './pages/platform/DoctorRegistryPage';
import LabResultsPage from './pages/lab/LabResultsPage';
import LabQCPage from './pages/lab/LabQCPage';
import PharmacyInventoryPage from './pages/pharmacy/PharmacyInventoryPage';
import PurchaseOrdersPage from './pages/pharmacy/PurchaseOrdersPage';
import PharmacyReturnsPage from './pages/pharmacy/PharmacyReturnsPage';
import PharmacyReportsPage from './pages/pharmacy/PharmacyReportsPage';
import SelfBookingPage from './pages/appointments/SelfBookingPage';
import DoctorOrgSelectorPage from './pages/doctor/DoctorOrgSelectorPage';
import DoctorRegisterPage from './pages/doctor/DoctorRegisterPage';
import StaffRegisterPage from './pages/StaffRegisterPage';
import RolesPage from './pages/admin/RolesPage';
import LocationsPage from './pages/admin/LocationsPage';
import OrgSettingsPage from './pages/admin/OrgSettingsPage';
import PlatformAuditPage from './pages/platform/PlatformAuditPage';
import PatientRegisterPage from './pages/patient/PatientRegisterPage';
import PatientLoginPage from './pages/patient/PatientLoginPage';
import PatientOrgSelectorPage from './pages/patient/PatientOrgSelectorPage';
import PatientPortalPage from './pages/patient/PatientPortalPage';
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage';
import PatientMedicalRecordsPage from './pages/patient/PatientMedicalRecordsPage';
import PatientPrescriptionsPage from './pages/patient/PatientPrescriptionsPage';
import PatientLabReportsPage from './pages/patient/PatientLabReportsPage';
import PatientBillingPage from './pages/patient/PatientBillingPage';
import PatientVitalsPage from './pages/patient/PatientVitalsPage';
import VisitorsPage from './pages/visitors/VisitorsPage';
import ShiftHandoverPage from './pages/shift-handover/ShiftHandoverPage';
import HousekeepingPage from './pages/housekeeping/HousekeepingPage';
import DischargeSummaryPage from './pages/discharge-summary/DischargeSummaryPage';
import BloodBankPage from './pages/blood-bank/BloodBankPage';
import RadiologyPage from './pages/radiology/RadiologyPage';
import InsurancePage from './pages/insurance/InsurancePage';
import ReferralPage from './pages/referral/ReferralPage';
import IcuPage from './pages/icu/IcuPage';
import TelemedicinePage from './pages/telemedicine/TelemedicinePage';
import DialysisPage from './pages/dialysis/DialysisPage';
import PhysiotherapyPage from './pages/physiotherapy/PhysiotherapyPage';
import AmbulancePage from './pages/ambulance/AmbulancePage';
import StaffAttendancePage from './pages/staff-attendance/StaffAttendancePage';
import InventoryPage from './pages/inventory/InventoryPage';
import AssetManagementPage from './pages/asset-management/AssetManagementPage';
import GrievancePage from './pages/grievance/GrievancePage';
import InfectionControlPage from './pages/infection-control/InfectionControlPage';
import ConsentPage from './pages/consent/ConsentPage';
import DietPage from './pages/diet/DietPage';
import MortuaryPage from './pages/mortuary/MortuaryPage';
import PayrollPage from './pages/payroll/PayrollPage';
import WorkOrdersPage from './pages/work-orders/WorkOrdersPage';
import MlcRegisterPage from './pages/mlc-register/MlcRegisterPage';
import MrdPage from './pages/mrd/MrdPage';
import NicuPage from './pages/nicu/NicuPage';
import ClinicalPathwaysPage from './pages/clinical-pathways/ClinicalPathwaysPage';
import WoundCarePage from './pages/wound-care/WoundCarePage';
import AntimicrobialPage from './pages/antimicrobial-stewardship/AntimicrobialPage';
import PalliativeCarePage from './pages/palliative-care/PalliativeCarePage';
import HomeCarePage from './pages/home-care/HomeCarePage';
import VendorPage from './pages/vendor/VendorPage';
import PurchaseIndentPage from './pages/purchase-indent/PurchaseIndentPage';
import CentralStorePage from './pages/central-store/CentralStorePage';
import LinenPage from './pages/linen/LinenPage';
import WasteManagementPage from './pages/waste-management/WasteManagementPage';
import QualityPage from './pages/quality/QualityPage';
import HealthPackagesPage from './pages/health-packages/HealthPackagesPage';
import DutyRosterPage from './pages/duty-roster/DutyRosterPage';
import CssdPage from './pages/cssd/CssdPage';
import EmergencyPage from './pages/emergency/EmergencyPage';
import BirthDeathPage from './pages/birth-death/BirthDeathPage';
import CertificatesPage from './pages/certificates/CertificatesPage';
import FeedbackPage from './pages/feedback/FeedbackPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import MfaSetupPage from './pages/admin/MfaSetupPage';
import ChangePasswordPage from './pages/admin/ChangePasswordPage';
import ProfilePage from './pages/admin/ProfilePage';

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

        {/* ── Patient Portal ── */}
        <Route path="patient/portal" element={<RoleRoute roles={['PATIENT']}><PatientPortalPage /></RoleRoute>} />
        <Route path="patient/appointments" element={<RoleRoute roles={['PATIENT']}><PatientAppointmentsPage /></RoleRoute>} />
        <Route path="patient/records" element={<RoleRoute roles={['PATIENT']}><PatientMedicalRecordsPage /></RoleRoute>} />
        <Route path="patient/prescriptions" element={<RoleRoute roles={['PATIENT']}><PatientPrescriptionsPage /></RoleRoute>} />
        <Route path="patient/lab" element={<RoleRoute roles={['PATIENT']}><PatientLabReportsPage /></RoleRoute>} />
        <Route path="patient/billing" element={<RoleRoute roles={['PATIENT']}><PatientBillingPage /></RoleRoute>} />
        <Route path="patient/vitals" element={<RoleRoute roles={['PATIENT']}><PatientVitalsPage /></RoleRoute>} />

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
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
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
