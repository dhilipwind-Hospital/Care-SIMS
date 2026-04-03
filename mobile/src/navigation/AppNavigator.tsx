import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { colors } from '../theme/colors';
import type { UserRole } from '../types';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SelectOrgScreen from '../screens/auth/SelectOrgScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Doctor Screens
import DoctorQueueScreen from '../screens/doctor/DoctorQueueScreen';
import ConsultationsScreen from '../screens/doctor/ConsultationsScreen';
import ConsultationDetailScreen from '../screens/doctor/ConsultationDetailScreen';
import DoctorPrescriptionsScreen from '../screens/doctor/PrescriptionsScreen';
import PatientSearchScreen from '../screens/doctor/PatientSearchScreen';
import PatientSummaryScreen from '../screens/doctor/PatientSummaryScreen';
import DoctorProfileScreen from '../screens/doctor/DoctorProfileScreen';

// Patient Screens
import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import PatientAppointmentsScreen from '../screens/patient/PatientAppointmentsScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import PatientPrescriptionsScreen from '../screens/patient/PatientPrescriptionsScreen';
import PatientLabReportsScreen from '../screens/patient/PatientLabReportsScreen';
import PatientBillingScreen from '../screens/patient/PatientBillingScreen';
import PatientVitalsScreen from '../screens/patient/PatientVitalsScreen';
import PatientProfileScreen from '../screens/patient/PatientProfileScreen';

// Lab Tech Screens
import LabOrdersScreen from '../screens/lab/LabOrdersScreen';
import LabOrderDetailScreen from '../screens/lab/LabOrderDetailScreen';
import LabResultEntryScreen from '../screens/lab/LabResultEntryScreen';
import LabResultsScreen from '../screens/lab/LabResultsScreen';

// Pharmacy Screens
import PharmacyDispenseScreen from '../screens/pharmacy/PharmacyDispenseScreen';
import PharmacyInventoryScreen from '../screens/pharmacy/PharmacyInventoryScreen';
import PharmacyAlertsScreen from '../screens/pharmacy/PharmacyAlertsScreen';
import PharmacyReturnsScreen from '../screens/pharmacy/PharmacyReturnsScreen';

// Placeholder screen for tabs that don't have dedicated screens yet
import { View, Text, StyleSheet } from 'react-native';

function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={placeholderStyles.container}>
      <Ionicons name="construct-outline" size={48} color={colors.textMuted} />
      <Text style={placeholderStyles.title}>{route.name}</Text>
      <Text style={placeholderStyles.subtitle}>Coming soon</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

// ─── Type Definitions ────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  SelectOrg: undefined;
  ForgotPassword: undefined;
};

// Doctor stack param lists
export type DoctorQueueStackParamList = {
  QueueMain: undefined;
};
export type DoctorConsultationsStackParamList = {
  ConsultationsMain: undefined;
  ConsultationDetail: { consultationId: string };
};
export type DoctorPatientsStackParamList = {
  PatientsMain: undefined;
  PatientSummary: { patientId: string };
};
export type DoctorPrescriptionsStackParamList = {
  PrescriptionsMain: undefined;
};
export type DoctorProfileStackParamList = {
  ProfileMain: undefined;
};

// Patient stack param lists
export type PatientHomeStackParamList = {
  HomeMain: undefined;
  BookAppointment: undefined;
  PatientPrescriptions: undefined;
  PatientLabReports: undefined;
  PatientBilling: undefined;
  PatientVitals: undefined;
};
export type PatientAppointmentsStackParamList = {
  AppointmentsMain: undefined;
  BookAppointment: undefined;
};
export type PatientLabReportsStackParamList = {
  LabReportsMain: undefined;
};
export type PatientPrescriptionsStackParamList = {
  PrescriptionsMain: undefined;
};
export type PatientProfileStackParamList = {
  ProfileMain: undefined;
};

// Lab stack param lists
export type LabOrdersStackParamList = {
  LabOrdersMain: undefined;
  LabOrderDetail: { orderId: string };
  LabResultEntry: { orderId: string };
};
export type LabResultsStackParamList = {
  LabResultsMain: undefined;
};

// Pharmacy stack param lists
export type PharmacyDispenseStackParamList = {
  DispenseMain: undefined;
};
export type PharmacyInventoryStackParamList = {
  InventoryMain: undefined;
};
export type PharmacyAlertsStackParamList = {
  AlertsMain: undefined;
};
export type PharmacyReturnsStackParamList = {
  ReturnsMain: undefined;
};

// Other roles (keep placeholders)
export type HomeStackParamList = { HomeMain: undefined };
export type TriageStackParamList = { TriageMain: undefined };
export type VitalsStackParamList = { VitalsMain: undefined };
export type WardsStackParamList = { WardsMain: undefined };
export type AdmissionsStackParamList = { AdmissionsMain: undefined };
export type BillingStackParamList = { BillingMain: undefined };
export type NotificationsStackParamList = { NotificationsMain: undefined };
export type QueueStackParamList = { QueueMain: undefined };
export type AppointmentsStackParamList = { AppointmentsMain: undefined };

// ─── Navigator Instances ─────────────────────────────────────────────
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Generic stack wrapper for placeholder tabs
function makeTabStack(name: string) {
  return function TabStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={`${name}Main`} component={PlaceholderScreen} />
      </Stack.Navigator>
    );
  };
}

// ─── Doctor Tab Stacks ──────────────────────────────────────────────
const DoctorQueueStack = createNativeStackNavigator<DoctorQueueStackParamList>();
function DoctorQueueStackScreen() {
  return (
    <DoctorQueueStack.Navigator screenOptions={{ headerShown: false }}>
      <DoctorQueueStack.Screen name="QueueMain" component={DoctorQueueScreen} />
    </DoctorQueueStack.Navigator>
  );
}

const DoctorConsultationsStack = createNativeStackNavigator<DoctorConsultationsStackParamList>();
function DoctorConsultationsStackScreen() {
  return (
    <DoctorConsultationsStack.Navigator screenOptions={{ headerShown: false }}>
      <DoctorConsultationsStack.Screen name="ConsultationsMain" component={ConsultationsScreen} />
      <DoctorConsultationsStack.Screen name="ConsultationDetail" component={ConsultationDetailScreen} />
    </DoctorConsultationsStack.Navigator>
  );
}

const DoctorPatientsStack = createNativeStackNavigator<DoctorPatientsStackParamList>();
function DoctorPatientsStackScreen() {
  return (
    <DoctorPatientsStack.Navigator screenOptions={{ headerShown: false }}>
      <DoctorPatientsStack.Screen name="PatientsMain" component={PatientSearchScreen} />
      <DoctorPatientsStack.Screen name="PatientSummary" component={PatientSummaryScreen} />
    </DoctorPatientsStack.Navigator>
  );
}

const DoctorPrescriptionsStack = createNativeStackNavigator<DoctorPrescriptionsStackParamList>();
function DoctorPrescriptionsStackScreen() {
  return (
    <DoctorPrescriptionsStack.Navigator screenOptions={{ headerShown: false }}>
      <DoctorPrescriptionsStack.Screen name="PrescriptionsMain" component={DoctorPrescriptionsScreen} />
    </DoctorPrescriptionsStack.Navigator>
  );
}

const DoctorProfileStack = createNativeStackNavigator<DoctorProfileStackParamList>();
function DoctorProfileStackScreen() {
  return (
    <DoctorProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <DoctorProfileStack.Screen name="ProfileMain" component={DoctorProfileScreen} />
    </DoctorProfileStack.Navigator>
  );
}

// ─── Patient Tab Stacks ─────────────────────────────────────────────
const PatientHomeStack = createNativeStackNavigator<PatientHomeStackParamList>();
function PatientHomeStackScreen() {
  return (
    <PatientHomeStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientHomeStack.Screen name="HomeMain" component={PatientHomeScreen} />
      <PatientHomeStack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <PatientHomeStack.Screen name="PatientPrescriptions" component={PatientPrescriptionsScreen} />
      <PatientHomeStack.Screen name="PatientLabReports" component={PatientLabReportsScreen} />
      <PatientHomeStack.Screen name="PatientBilling" component={PatientBillingScreen} />
      <PatientHomeStack.Screen name="PatientVitals" component={PatientVitalsScreen} />
    </PatientHomeStack.Navigator>
  );
}

const PatientAppointmentsStack = createNativeStackNavigator<PatientAppointmentsStackParamList>();
function PatientAppointmentsStackScreen() {
  return (
    <PatientAppointmentsStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientAppointmentsStack.Screen name="AppointmentsMain" component={PatientAppointmentsScreen} />
      <PatientAppointmentsStack.Screen name="BookAppointment" component={BookAppointmentScreen} />
    </PatientAppointmentsStack.Navigator>
  );
}

const PatientLabReportsStack = createNativeStackNavigator<PatientLabReportsStackParamList>();
function PatientLabReportsStackScreen() {
  return (
    <PatientLabReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientLabReportsStack.Screen name="LabReportsMain" component={PatientLabReportsScreen} />
    </PatientLabReportsStack.Navigator>
  );
}

const PatientPrescriptionsStack = createNativeStackNavigator<PatientPrescriptionsStackParamList>();
function PatientPrescriptionsStackScreen() {
  return (
    <PatientPrescriptionsStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientPrescriptionsStack.Screen name="PrescriptionsMain" component={PatientPrescriptionsScreen} />
    </PatientPrescriptionsStack.Navigator>
  );
}

const PatientProfileStack = createNativeStackNavigator<PatientProfileStackParamList>();
function PatientProfileStackScreen() {
  return (
    <PatientProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientProfileStack.Screen name="ProfileMain" component={PatientProfileScreen} />
    </PatientProfileStack.Navigator>
  );
}

// ─── Lab Tab Stacks ─────────────────────────────────────────────────
const LabOrdersStack = createNativeStackNavigator<LabOrdersStackParamList>();
function LabOrdersStackScreen() {
  return (
    <LabOrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <LabOrdersStack.Screen name="LabOrdersMain" component={LabOrdersScreen} />
      <LabOrdersStack.Screen name="LabOrderDetail" component={LabOrderDetailScreen} />
      <LabOrdersStack.Screen name="LabResultEntry" component={LabResultEntryScreen} />
    </LabOrdersStack.Navigator>
  );
}

const LabResultsStack = createNativeStackNavigator<LabResultsStackParamList>();
function LabResultsStackScreen() {
  return (
    <LabResultsStack.Navigator screenOptions={{ headerShown: false }}>
      <LabResultsStack.Screen name="LabResultsMain" component={LabResultsScreen} />
    </LabResultsStack.Navigator>
  );
}

// ─── Pharmacy Tab Stacks ────────────────────────────────────────────
const PharmacyDispenseStack = createNativeStackNavigator<PharmacyDispenseStackParamList>();
function PharmacyDispenseStackScreen() {
  return (
    <PharmacyDispenseStack.Navigator screenOptions={{ headerShown: false }}>
      <PharmacyDispenseStack.Screen name="DispenseMain" component={PharmacyDispenseScreen} />
    </PharmacyDispenseStack.Navigator>
  );
}

const PharmacyInventoryStack = createNativeStackNavigator<PharmacyInventoryStackParamList>();
function PharmacyInventoryStackScreen() {
  return (
    <PharmacyInventoryStack.Navigator screenOptions={{ headerShown: false }}>
      <PharmacyInventoryStack.Screen name="InventoryMain" component={PharmacyInventoryScreen} />
    </PharmacyInventoryStack.Navigator>
  );
}

const PharmacyAlertsStack = createNativeStackNavigator<PharmacyAlertsStackParamList>();
function PharmacyAlertsStackScreen() {
  return (
    <PharmacyAlertsStack.Navigator screenOptions={{ headerShown: false }}>
      <PharmacyAlertsStack.Screen name="AlertsMain" component={PharmacyAlertsScreen} />
    </PharmacyAlertsStack.Navigator>
  );
}

const PharmacyReturnsStack = createNativeStackNavigator<PharmacyReturnsStackParamList>();
function PharmacyReturnsStackScreen() {
  return (
    <PharmacyReturnsStack.Navigator screenOptions={{ headerShown: false }}>
      <PharmacyReturnsStack.Screen name="ReturnsMain" component={PharmacyReturnsScreen} />
    </PharmacyReturnsStack.Navigator>
  );
}

// ─── Nurse Tab Stacks ───────────────────────────────────────────────
import TriageScreen from '../screens/nurse/TriageScreen';
import VitalsScreen from '../screens/nurse/VitalsScreen';
import WardsScreen from '../screens/nurse/WardsScreen';
import AdmissionsScreen from '../screens/nurse/AdmissionsScreen';
import MARScreen from '../screens/nurse/MARScreen';

function TriageStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="TriageMain" component={TriageScreen} /></Stack.Navigator>; }
function VitalsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="VitalsMain" component={VitalsScreen} /></Stack.Navigator>; }
function WardsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="WardsMain" component={WardsScreen} /></Stack.Navigator>; }
function AdmissionsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="AdmissionsMain" component={AdmissionsScreen} /></Stack.Navigator>; }
function MARStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="MARMain" component={MARScreen} /></Stack.Navigator>; }

// ─── Reception Tab Stacks ───────────────────────────────────────────
import QueueScreen from '../screens/reception/QueueScreen';
import ReceptionPatientsScreen from '../screens/reception/ReceptionPatientsScreen';
import ReceptionAppointmentsScreen from '../screens/reception/ReceptionAppointmentsScreen';
import ReceptionBillingScreen from '../screens/reception/BillingScreen';

function ReceptionQueueStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="QueueMain" component={QueueScreen} /></Stack.Navigator>; }
function ReceptionPatientsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="PatientsMain" component={ReceptionPatientsScreen} /></Stack.Navigator>; }
function ReceptionAppointmentsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="AppointmentsMain" component={ReceptionAppointmentsScreen} /></Stack.Navigator>; }
function ReceptionBillingStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="BillingMain" component={ReceptionBillingScreen} /></Stack.Navigator>; }

// ─── OT Tab Stacks ──────────────────────────────────────────────────
import OTBookingsScreen from '../screens/ot/OTBookingsScreen';
import OTLiveScreen from '../screens/ot/OTLiveScreen';
import OTEquipmentScreen from '../screens/ot/OTEquipmentScreen';

function OTBookingsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="BookingsMain" component={OTBookingsScreen} /></Stack.Navigator>; }
function OTLiveStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="LiveMain" component={OTLiveScreen} /></Stack.Navigator>; }
function OTEquipmentStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="EquipmentMain" component={OTEquipmentScreen} /></Stack.Navigator>; }

// ─── Billing Tab Stacks ─────────────────────────────────────────────
import InvoicesScreen from '../screens/billing/InvoicesScreen';
import InvoiceDetailScreen from '../screens/billing/InvoiceDetailScreen';
import InsuranceScreen from '../screens/billing/InsuranceScreen';

const BillingInvoicesStack = createNativeStackNavigator();
function BillingInvoicesStackScreen() {
  return (
    <BillingInvoicesStack.Navigator screenOptions={{ headerShown: false }}>
      <BillingInvoicesStack.Screen name="InvoicesMain" component={InvoicesScreen} />
      <BillingInvoicesStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    </BillingInvoicesStack.Navigator>
  );
}
function InsuranceStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="InsuranceMain" component={InsuranceScreen} /></Stack.Navigator>; }

// ─── Platform Tab Stacks ────────────────────────────────────────────
import PlatformDashboardScreen from '../screens/platform/PlatformDashboardScreen';
import PlatformDoctorsScreen from '../screens/platform/PlatformDoctorsScreen';
import PlatformAuditScreen from '../screens/platform/PlatformAuditScreen';

export type PlatformDashboardStackParamList = { DashboardMain: undefined };
export type PlatformDoctorsStackParamList = { DoctorsMain: undefined };
export type PlatformAuditStackParamList = { AuditMain: undefined };

function PlatformDashboardStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="DashboardMain" component={PlatformDashboardScreen} /></Stack.Navigator>; }
function PlatformDoctorsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="DoctorsMain" component={PlatformDoctorsScreen} /></Stack.Navigator>; }
function PlatformAuditStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="AuditMain" component={PlatformAuditScreen} /></Stack.Navigator>; }

// ─── Shared Tab Stacks ──────────────────────────────────────────────
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

function NotificationsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="NotificationsMain" component={NotificationsScreen} /></Stack.Navigator>; }
function SettingsStackScreen() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="SettingsMain" component={SettingsScreen} /></Stack.Navigator>; }

// Keep placeholder for truly unbuilt screens
const HomeStack = makeTabStack('Home');
const ProfileStack = makeTabStack('Profile');

// ─── Tab Icon Mapper ─────────────────────────────────────────────────
type IoniconsName = keyof typeof Ionicons.glyphMap;

function getTabIcon(routeName: string, focused: boolean): IoniconsName {
  const icons: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
    Queue: { active: 'list', inactive: 'list-outline' },
    Consultations: { active: 'clipboard', inactive: 'clipboard-outline' },
    Patients: { active: 'people', inactive: 'people-outline' },
    Prescriptions: { active: 'document-text', inactive: 'document-text-outline' },
    Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
    Home: { active: 'home', inactive: 'home-outline' },
    Appointments: { active: 'calendar', inactive: 'calendar-outline' },
    'Lab Reports': { active: 'flask', inactive: 'flask-outline' },
    'Lab Orders': { active: 'flask', inactive: 'flask-outline' },
    Results: { active: 'document-text', inactive: 'document-text-outline' },
    Dispense: { active: 'medkit', inactive: 'medkit-outline' },
    Inventory: { active: 'cube', inactive: 'cube-outline' },
    Alerts: { active: 'alert-circle', inactive: 'alert-circle-outline' },
    Returns: { active: 'return-down-back', inactive: 'return-down-back-outline' },
    Triage: { active: 'pulse', inactive: 'pulse-outline' },
    Vitals: { active: 'heart', inactive: 'heart-outline' },
    Wards: { active: 'bed', inactive: 'bed-outline' },
    Admissions: { active: 'enter', inactive: 'enter-outline' },
    Billing: { active: 'card', inactive: 'card-outline' },
    Notifications: { active: 'notifications', inactive: 'notifications-outline' },
    Bookings: { active: 'cut', inactive: 'cut-outline' },
    Live: { active: 'pulse', inactive: 'pulse-outline' },
    Equipment: { active: 'construct', inactive: 'construct-outline' },
    Insurance: { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
    MAR: { active: 'medkit', inactive: 'medkit-outline' },
    Organizations: { active: 'business', inactive: 'business-outline' },
    Doctors: { active: 'people', inactive: 'people-outline' },
    Audit: { active: 'shield', inactive: 'shield-outline' },
  };

  const iconSet = icons[routeName];
  if (!iconSet) return focused ? 'ellipse' : 'ellipse-outline';
  return focused ? iconSet.active : iconSet.inactive;
}

// ─── Tab Bar Options ─────────────────────────────────────────────────
const tabScreenOptions = ({ route }: { route: { name: string } }) => ({
  headerShown: false,
  tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
    const iconName = getTabIcon(route.name, focused);
    return <Ionicons name={iconName} size={size} color={color} />;
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: 4,
    height: 56,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
});

// ─── Role-Based Tabs ─────────────────────────────────────────────────
function DoctorTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Queue" component={DoctorQueueStackScreen} />
      <Tab.Screen name="Consultations" component={DoctorConsultationsStackScreen} />
      <Tab.Screen name="Patients" component={DoctorPatientsStackScreen} />
      <Tab.Screen name="Prescriptions" component={DoctorPrescriptionsStackScreen} />
      <Tab.Screen name="Profile" component={DoctorProfileStackScreen} />
    </Tab.Navigator>
  );
}

function PatientTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={PatientHomeStackScreen} />
      <Tab.Screen name="Appointments" component={PatientAppointmentsStackScreen} />
      <Tab.Screen name="Lab Reports" component={PatientLabReportsStackScreen} />
      <Tab.Screen name="Prescriptions" component={PatientPrescriptionsStackScreen} />
      <Tab.Screen name="Profile" component={PatientProfileStackScreen} />
    </Tab.Navigator>
  );
}

function NurseTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Triage" component={TriageStackScreen} />
      <Tab.Screen name="Vitals" component={VitalsStackScreen} />
      <Tab.Screen name="Wards" component={WardsStackScreen} />
      <Tab.Screen name="Admissions" component={AdmissionsStackScreen} />
      <Tab.Screen name="Profile" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

function ReceptionTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Queue" component={ReceptionQueueStackScreen} />
      <Tab.Screen name="Patients" component={ReceptionPatientsStackScreen} />
      <Tab.Screen name="Appointments" component={ReceptionAppointmentsStackScreen} />
      <Tab.Screen name="Billing" component={ReceptionBillingStackScreen} />
      <Tab.Screen name="Profile" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

function OTTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Bookings" component={OTBookingsStackScreen} />
      <Tab.Screen name="Live" component={OTLiveStackScreen} />
      <Tab.Screen name="Equipment" component={OTEquipmentStackScreen} />
      <Tab.Screen name="Profile" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

function BillingTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Billing" component={BillingInvoicesStackScreen} />
      <Tab.Screen name="Insurance" component={InsuranceStackScreen} />
      <Tab.Screen name="Notifications" component={NotificationsStackScreen} />
      <Tab.Screen name="Profile" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

function PlatformTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Organizations" component={PlatformDashboardStackScreen} />
      <Tab.Screen name="Doctors" component={PlatformDoctorsStackScreen} />
      <Tab.Screen name="Audit" component={PlatformAuditStackScreen} />
      <Tab.Screen name="Notifications" component={NotificationsStackScreen} />
      <Tab.Screen name="Profile" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Queue" component={ReceptionQueueStackScreen} />
      <Tab.Screen name="Patients" component={ReceptionPatientsStackScreen} />
      <Tab.Screen name="Billing" component={BillingInvoicesStackScreen} />
      <Tab.Screen name="Notifications" component={NotificationsStackScreen} />
      <Tab.Screen name="Profile" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

function LabTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Lab Orders" component={LabOrdersStackScreen} />
      <Tab.Screen name="Results" component={LabResultsStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

function PharmacyTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dispense" component={PharmacyDispenseStackScreen} />
      <Tab.Screen name="Inventory" component={PharmacyInventoryStackScreen} />
      <Tab.Screen name="Alerts" component={PharmacyAlertsStackScreen} />
      <Tab.Screen name="Returns" component={PharmacyReturnsStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

function DefaultTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={ReceptionQueueStackScreen} />
      <Tab.Screen name="Notifications" component={NotificationsStackScreen} />
      <Tab.Screen name="Profile" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

function getRoleBasedTabs(role?: string) {
  switch (role) {
    case 'DOCTOR':
      return DoctorTabs;
    case 'PATIENT':
      return PatientTabs;
    case 'NURSE':
      return NurseTabs;
    case 'RECEPTION':
      return ReceptionTabs;
    case 'LAB':
      return LabTabs;
    case 'PHARMACY':
      return PharmacyTabs;
    case 'OT':
      return OTTabs;
    case 'BILLING':
      return BillingTabs;
    case 'PLATFORM_OWNER':
    case 'PLATFORM_ADMIN':
      return PlatformTabs;
    case 'ADMIN':
      return AdminTabs;
    default:
      return DefaultTabs;
  }
}

// ─── Auth Navigator ──────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SelectOrg" component={SelectOrgScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Main App Navigator ──────────────────────────────────────────────
export default function AppNavigator() {
  const { isLoading, isAuthenticated, user, affiliations } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // If we have affiliations but no user, show org selection
  if (!isAuthenticated && affiliations?.length) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="SelectOrg" component={SelectOrgScreen} />
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </AuthStack.Navigator>
    );
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  const TabsComponent = getRoleBasedTabs(user?.role);
  return <TabsComponent />;
}
