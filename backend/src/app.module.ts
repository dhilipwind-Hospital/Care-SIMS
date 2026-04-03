import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './modules/platform/platform.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LocationsModule } from './modules/locations/locations.module';
import { FeaturesModule } from './modules/features/features.module';
import { DoctorRegistryModule } from './modules/doctor-registry/doctor-registry.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PatientsModule } from './modules/patients/patients.module';
import { QueueModule } from './modules/queue/queue.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { LabModule } from './modules/lab/lab.module';
import { TriageModule } from './modules/triage/triage.module';
import { VitalsModule } from './modules/vitals/vitals.module';
import { WardsModule } from './modules/wards/wards.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { MedicationAdminModule } from './modules/medication-admin/medication-admin.module';
import { BillingModule } from './modules/billing/billing.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { OTModule } from './modules/ot/ot.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { ShiftHandoverModule } from './modules/shift-handover/shift-handover.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { DischargeSummaryModule } from './modules/discharge-summary/discharge-summary.module';
import { BloodBankModule } from './modules/blood-bank/blood-bank.module';
import { RadiologyModule } from './modules/radiology/radiology.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { ReferralModule } from './modules/referral/referral.module';
import { IcuModule } from './modules/icu/icu.module';
import { TelemedicineModule } from './modules/telemedicine/telemedicine.module';
import { DialysisModule } from './modules/dialysis/dialysis.module';
import { PhysiotherapyModule } from './modules/physiotherapy/physiotherapy.module';
import { AmbulanceModule } from './modules/ambulance/ambulance.module';
import { StaffAttendanceModule } from './modules/staff-attendance/staff-attendance.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AssetManagementModule } from './modules/asset-management/asset-management.module';
import { GrievanceModule } from './modules/grievance/grievance.module';
import { InfectionControlModule } from './modules/infection-control/infection-control.module';
import { ConsentModule } from './modules/consent/consent.module';
import { DietModule } from './modules/diet/diet.module';
import { MortuaryModule } from './modules/mortuary/mortuary.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SearchModule } from './modules/search/search.module';
import { WsGatewayModule } from './modules/ws-gateway/ws-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    PrismaModule,
    WsGatewayModule,
    AuthModule,
    PlatformModule,
    TenantsModule,
    LocationsModule,
    FeaturesModule,
    DoctorRegistryModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    PatientsModule,
    QueueModule,
    AppointmentsModule,
    ConsultationsModule,
    PrescriptionsModule,
    LabModule,
    TriageModule,
    VitalsModule,
    WardsModule,
    AdmissionsModule,
    MedicationAdminModule,
    BillingModule,
    PharmacyModule,
    OTModule,
    ReportsModule,
    AuditModule,
    NotificationsModule,
    VisitorsModule,
    ShiftHandoverModule,
    HousekeepingModule,
    DischargeSummaryModule,
    BloodBankModule,
    RadiologyModule,
    InsuranceModule,
    ReferralModule,
    IcuModule,
    TelemedicineModule,
    DialysisModule,
    PhysiotherapyModule,
    AmbulanceModule,
    StaffAttendanceModule,
    InventoryModule,
    AssetManagementModule,
    GrievanceModule,
    InfectionControlModule,
    ConsentModule,
    DietModule,
    MortuaryModule,
    UploadsModule,
    SearchModule,
  ],
})
export class AppModule {}
