# Ayphen HMS — Complete Application Flow Reference

> Version: 2026-05-08 | Stack: NestJS + Prisma + PostgreSQL (port 6666) · React + TypeScript + Vite + Tailwind CSS (port 5555)

---

## Application Summary

- **Ayphen HMS** is a cloud-based, multi-tenant Hospital Management System (SaaS) designed to serve multiple hospitals and clinics from a single deployment.
- Every record is isolated by `tenantId`, ensuring complete data separation between organisations.
- The system covers the full hospital workflow — from patient registration and appointment booking through clinical care, pharmacy, lab, billing, and discharge.
- Built on a **NestJS + Prisma + PostgreSQL** backend (port 6666) and a **React + TypeScript + Vite + Tailwind CSS** frontend (port 5555).
- Supports **11 distinct user roles**: Platform Owner, Platform Admin, Admin, Doctor, Nurse, Receptionist, Pharmacy, Lab, Billing, OT, and Patient.
- **Four separate login paths** exist: staff login, doctor login (multi-org support), patient self-service login, and platform admin login.
- Doctors can be affiliated with multiple organisations and choose their active org at login.
- Patients register and log in through a dedicated **Patient Portal** with a clean layout (no staff sidebar), allowing them to book appointments, view prescriptions, lab reports, billing, and vitals.
- The appointment booking system shows real-time available slots (30-min intervals, 08:00–17:00) by doctor and date, with Sundays blocked.
- **JWT-based authentication** with access + refresh tokens, optional TOTP-based MFA, rate limiting, and FCM push notification support.
- The frontend has **107 pages** and the backend has **72 modules** covering over 350 API endpoints.
- A global **Command Palette** (Cmd+K) enables cross-module search across patients, appointments, invoices, prescriptions, admissions, lab orders, and queue entries.
- Pharmacy uses **FEFO (First-Expiry-First-Out)** batch depletion for inventory management.
- The **Medication Administration Record (MAR)** enforces a 5-Rights verification checklist (Patient, Drug, Dose, Route, Time) before any dose is recorded.
- Clinical modules include: Emergency & Triage (ESI scoring), ICU/NICU, Operating Theatre scheduling, Dialysis, Physiotherapy, Wound Care, Palliative Care, Telemedicine, and Blood Bank.
- Operational modules cover: CSSD sterilization tracking, Waste Management manifests, Work Orders, Duty Roster with shift swap approvals, Housekeeping, Linen, and Asset Management.
- Compliance and record-keeping modules include: Audit Log, Birth/Death Records, MLC Register, Infection Control, Antimicrobial Stewardship, Clinical Pathways, and Quality Management.
- HR modules include Staff Attendance, Payroll, Duty Roster, and Shift Handover.
- The **Reports** module generates summaries across 8 categories: Lab, Pharmacy, Appointments, Inventory, Billing, Admissions, Staff, and Quality — with CSV export and print support.
- Platform Admins manage tenant onboarding, feature flags, and cross-tenant analytics from a dedicated platform dashboard.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Authentication & Roles](#2-authentication--roles)
3. [Platform Admin Flows](#3-platform-admin-flows)
4. [Staff Portal — Core Clinical Flows](#4-staff-portal--core-clinical-flows)
5. [Patient Portal](#5-patient-portal)
6. [Module Reference — All 72 Modules](#6-module-reference--all-72-modules)
7. [Data Model Summary](#7-data-model-summary)
8. [API Endpoint Map](#8-api-endpoint-map)

---

## 1. System Architecture

### Overview

Ayphen HMS is a **multi-tenant SaaS hospital management system**. Every record is scoped by a `tenantId` (Organisation). A single deployment serves unlimited hospitals/clinics.

```
Browser (React SPA)
        │
        ▼
  Vite Dev Server :5555
        │  REST + WebSocket
        ▼
  NestJS API :6666
        │
        ├── Prisma ORM
        │       │
        │       └── PostgreSQL (Supabase)
        │
        ├── JWT Auth (access + refresh tokens)
        ├── Throttle Guard (rate limiting)
        ├── WebSocket Gateway (ws-gateway)
        └── Firebase Cloud Messaging (push notifications)
```

### Key Architectural Decisions

| Concern | Solution |
|---------|----------|
| Multi-tenancy | Every table has `tenantId`; all queries filter by it |
| Auth identity | `TenantUser` (staff), `DoctorAccount` (doctors), `PatientAccount` (patients), `PlatformUser` (super admin) |
| Patient records | `PatientAccount` (login) ≠ `Patient` (clinical). Linked by email via `resolvePatientRecord()` |
| Sequential IDs | `generateSequentialId()` utility used across all modules (e.g., `PAT-0001`, `RX-0042`) |
| Role isolation | Frontend `RoleRoute` + backend `@Roles()` guard on every sensitive endpoint |
| Code splitting | React.lazy() + Suspense wraps every page component in App.tsx |

---

## 2. Authentication & Roles

### 2.1 Login Flows

There are **four separate login paths**:

#### Staff Login (`POST /auth/login`)
- Used by: ADMIN, NURSE, RECEPTION, PHARMACY, LAB, BILLING, OT, etc.
- Flow:
  1. Submit email + password → server validates `TenantUser`, returns `accessToken` + `refreshToken`
  2. If MFA enabled → `POST /auth/mfa/verify` with TOTP code
  3. Token stored in `localStorage` via `auth.ts`
  4. Redirect to `/app/dashboard`

#### Doctor Login (`POST /auth/doctor/login`)
- Doctors may be affiliated with multiple organisations
- Flow:
  1. Submit credentials → returns `accessToken` with `type: 'doctor'`
  2. If single affiliation → automatic org selection
  3. If multiple → show org selector → `POST /auth/doctor/select-org` with `affiliationId`
  4. New token issued with `tenantId` scoped to selected org
  5. Redirect to `/app/doctor/consultations`

#### Patient Login (`POST /auth/patient/login`)
- Flow:
  1. Patient registers via `POST /auth/patient/register` (creates `PatientAccount`)
  2. Login → token with `type: 'patient'`
  3. If linked to multiple orgs → `POST /auth/patient/select-org` with `tenantId + locationId`
  4. Redirect to `/app/patient/portal`

#### Platform Login (`POST /auth/platform/login`)
- Used by: PLATFORM_OWNER, PLATFORM_ADMIN
- No `tenantId` in token — sees all organisations
- Redirect to `/platform/dashboard`

### 2.2 Token Management

```
POST /auth/refresh        → exchange refreshToken for new accessToken
GET  /auth/me             → current user profile
PATCH /auth/me            → update name/phone
PUT  /auth/me/password    → change password
POST /auth/forgot-password → send reset email
POST /auth/reset-password  → consume reset token
POST /auth/device-token    → register FCM push token
DELETE /auth/device-token  → unregister FCM push token
```

### 2.3 MFA (TOTP)

```
POST /auth/mfa/setup      → generate QR code secret
POST /auth/mfa/activate   → confirm code to enable
POST /auth/mfa/verify     → verify code on login
```

### 2.4 User Roles & Permissions

| Role | Scope | Main Pages |
|------|-------|------------|
| `PLATFORM_OWNER` | All tenants | Platform dashboard, tenants, users, features |
| `PLATFORM_ADMIN` | All tenants | Same as PLATFORM_OWNER |
| `ADMIN` | Own tenant | All staff pages + admin settings |
| `DOCTOR` | Own tenant (scoped) | Consultations, prescriptions, lab orders, OT scheduling |
| `NURSE` | Own tenant | MAR, vitals, ward rounds, wound care, shift handover |
| `RECEPTION` | Own tenant | Appointments, queue, admissions, visitors |
| `PHARMACY` | Own tenant | Dispense, inventory, purchase indents |
| `LAB` | Own tenant | Lab orders, results, QC, calibration |
| `BILLING` | Own tenant | Invoices, insurance, health packages |
| `OT` | Own tenant | OT scheduling, CSSD |
| `PATIENT` | Own org (PatientAccount) | Portal, appointments, records, prescriptions, billing |

---

## 3. Platform Admin Flows

### 3.1 Tenant Management

```
GET    /tenants               → list all organisations
POST   /tenants               → create new organisation (name, subdomain, plan)
GET    /tenants/:id           → org detail + stats
PATCH  /tenants/:id           → update org settings
DELETE /tenants/:id           → deactivate org
GET    /tenants/:id/stats     → usage metrics
```

**Flow:** Platform admin logs in → `/platform/dashboard` shows org count, user count, active subscriptions → Navigate to `/platform/tenants` → Create/edit orgs → Assign features.

### 3.2 Feature Flags

```
GET    /features              → all feature flags
POST   /features              → create flag
PATCH  /features/:id          → toggle on/off
DELETE /features/:id          → remove flag
GET    /features/tenant/:tenantId → flags for org
POST   /features/tenant/:tenantId → assign flag to org
```

### 3.3 Platform Users

```
GET    /platform/users        → list platform users
POST   /platform/users        → create platform admin
PATCH  /platform/users/:id    → update
DELETE /platform/users/:id    → remove
```

### 3.4 Platform Reports & Analytics

```
GET    /platform/analytics    → cross-tenant usage stats
GET    /platform/audit-log    → platform-level audit trail
```

---

## 4. Staff Portal — Core Clinical Flows

### 4.1 Patient Registration & Admission

#### Registration
1. Reception opens **Patients** page → `GET /patients` (paginated, searchable)
2. Click "New Patient" → form: name, DOB, gender, phone, address, blood group, emergency contact
3. Submit → `POST /patients` → auto-generates `patientId` (e.g., `PAT-0001`)
4. Patient card created with `tenantId` + `locationId`

```
GET    /patients              → list (search by name/phone/ID)
POST   /patients              → create
GET    /patients/:id          → full profile
PATCH  /patients/:id          → update demographics
DELETE /patients/:id          → soft-delete
GET    /patients/:id/history  → clinical history timeline
```

#### Admission
1. From patient profile or Admissions page → `POST /admissions`
2. Select ward, bed, admitting doctor, diagnosis
3. Generates `admissionNumber` (e.g., `ADM-0042`)
4. Bed status set to `OCCUPIED`

```
GET    /admissions            → active admissions list
POST   /admissions            → admit patient
GET    /admissions/:id        → admission detail
PATCH  /admissions/:id        → update (ward transfer, diagnosis change)
POST   /admissions/:id/discharge → discharge with summary
```

### 4.2 Appointment Booking (Staff Side)

```
GET    /appointments          → list with filters (date, doctor, status)
POST   /appointments          → create booking
GET    /appointments/:id      → detail
PATCH  /appointments/:id      → reschedule / update status
PATCH  /appointments/:id/cancel → cancel with reason
GET    /appointments/slots    → available slots for doctor+date
```

**Slot Logic:** `GET /appointments/slots?doctorId=&date=` checks existing bookings and returns 30-min slots 08:00–17:00, marking each `available: true/false`.

### 4.3 Doctor Consultation Flow

1. Doctor logs in → sees today's appointment queue
2. Opens **Consultation** page for a patient
3. Records: chief complaint, history, examination findings, diagnosis (ICD-10)
4. **Inline Lab Orders**: selects tests directly in consultation panel
5. **Prescriptions**: adds drugs with dosage/frequency/duration
6. Saves → `POST /consultations`

```
GET    /consultations         → list
POST   /consultations         → create (with vitals, notes, ICD codes)
GET    /consultations/:id     → full consultation
PATCH  /consultations/:id     → update
POST   /consultations/:id/lab-orders → attach lab orders
```

### 4.4 Prescription Flow

1. Doctor creates prescription during consultation or standalone
2. `POST /prescriptions` with `doctorId`, `patientId`, items array
3. Generates `rxNumber` (e.g., `RX-0007`)
4. Pharmacy sees pending prescriptions → dispense

```
GET    /prescriptions         → list (filter by status, patient, doctor)
POST   /prescriptions         → create
GET    /prescriptions/:id     → detail with items
PATCH  /prescriptions/:id     → update
POST   /prescriptions/:id/dispense → mark as dispensed (pharmacy)
GET    /prescriptions/:id/items → line items
```

### 4.5 Medication Administration (MAR)

1. Nurse opens **MAR** page → sees scheduled medications by patient/ward
2. Overdue doses highlighted in amber/red
3. Click "Administer" → **5-Rights Checklist** popup:
   - Right Patient, Right Drug, Right Dose, Right Route, Right Time
4. Confirm all 5 → mark administered
5. Click "Withhold" → modal for reason → `PATCH /medication-admin/:id/withhold`

```
GET    /medication-admin      → schedule list (filter by ward/date)
POST   /medication-admin      → create schedule entry
PATCH  /medication-admin/:id  → update administration record
PATCH  /medication-admin/:id/withhold → withhold with reason
```

### 4.6 Lab Workflow

1. Doctor orders tests (inline in consultation or standalone)
2. **Lab** page shows pending orders
3. Lab tech enters results: value, flag (HIGH/LOW/CRITICAL/NORMAL), reference range
4. Results auto-flagged → doctor notified

```
GET    /lab/orders            → pending/completed orders
POST   /lab/orders            → create order
GET    /lab/orders/:id        → order with results
PATCH  /lab/orders/:id        → update
POST   /lab/orders/:id/results → enter results
GET    /lab/results           → all results
GET    /lab/panels            → test panels
POST   /lab/panels            → create panel
GET    /lab/qc/runs           → QC run log
POST   /lab/qc/runs           → log QC run (auto PASS/WARN/FAIL)
GET    /lab/qc/calibrations   → calibration log
POST   /lab/qc/calibrations   → log calibration
```

### 4.7 Radiology Workflow

```
GET    /radiology/orders      → imaging orders
POST   /radiology/orders      → create order
PATCH  /radiology/orders/:id  → update
POST   /radiology/orders/:id/report → attach report/image
GET    /radiology/results     → completed studies
```

### 4.8 Pharmacy Workflow

1. Pharmacist sees pending prescriptions → `GET /prescriptions?status=PENDING`
2. Verifies drug, dose, patient allergy (barcode scan via ZXing supported)
3. Dispenses → `POST /prescriptions/:id/dispense`
4. Stock decremented via **FEFO** (First-Expiry-First-Out) batch depletion
5. Low-stock alert if quantity falls below threshold

```
GET    /pharmacy/inventory    → drug stock levels
GET    /pharmacy/low-stock    → items below threshold
POST   /pharmacy/dispense     → dispense medication
GET    /pharmacy/batches      → inventory batches (FEFO)
POST   /pharmacy/batches      → add batch
GET    /pharmacy/reports      → dispensing reports
```

### 4.9 Billing Flow

1. Billing staff opens invoice list → `GET /billing/invoices`
2. Create invoice → select patient, add line items (consultation, drugs, lab, bed charges)
3. Apply insurance or health package discount
4. Mark paid → `PATCH /billing/invoices/:id` with `status: 'PAID'`

```
GET    /billing/invoices      → invoice list
POST   /billing/invoices      → create invoice
GET    /billing/invoices/:id  → detail with items
PATCH  /billing/invoices/:id  → update / mark paid
POST   /billing/invoices/:id/email → email invoice PDF
GET    /billing/summary       → revenue summary
GET    /billing/pending       → unpaid invoices
```

### 4.10 Insurance

```
GET    /insurance/claims      → claims list
POST   /insurance/claims      → submit claim
PATCH  /insurance/claims/:id  → update claim status
GET    /insurance/providers   → insurer list
POST   /insurance/providers   → add insurer
GET    /insurance/preauth     → pre-authorization requests
POST   /insurance/preauth     → request pre-auth
```

### 4.11 Emergency & Triage

1. Patient arrives at emergency → Triage nurse assesses
2. `POST /triage` with vitals + chief complaint → auto-assigns ESI level (1–5)
3. Assigned to queue → doctor picks up

```
GET    /triage                → triage queue
POST   /triage                → create triage record
PATCH  /triage/:id            → update triage / assign bed
GET    /emergency             → emergency cases
POST   /emergency             → register emergency case
PATCH  /emergency/:id         → update
```

### 4.12 Operating Theatre (OT)

```
GET    /ot/schedules          → OT schedule
POST   /ot/schedules          → book OT slot
PATCH  /ot/schedules/:id      → update (surgeon, anaesthetist, room)
POST   /ot/schedules/:id/start   → mark surgery start
POST   /ot/schedules/:id/complete → mark surgery complete
GET    /ot/rooms              → OT rooms
```

### 4.13 ICU & NICU

```
GET    /icu                   → ICU patient list
POST   /icu                   → admit to ICU
PATCH  /icu/:id               → update ICU record (vitals, ventilator, drips)
POST   /icu/:id/transfer      → transfer out of ICU
GET    /nicu                  → NICU patient list
POST   /nicu                  → admit neonate
PATCH  /nicu/:id              → update NICU record
```

### 4.14 Ward Management

```
GET    /wards                 → ward list
POST   /wards                 → create ward
GET    /wards/:id/beds        → beds in ward with occupancy
POST   /wards/:id/beds        → add beds
PATCH  /wards/:id/beds/:bedId → update bed status
```

### 4.15 Discharge Summary

```
GET    /discharge-summary     → list
POST   /discharge-summary     → create (with diagnosis, treatment, follow-up)
GET    /discharge-summary/:id → full summary
PATCH  /discharge-summary/:id → update
POST   /discharge-summary/:id/print → generate PDF
```

---

## 5. Patient Portal

### 5.1 Layout

Patients use a **dedicated layout** (`PatientLayout`) — no staff sidebar. A clean top navigation bar with 7 items:

- Dashboard (Portal)
- Appointments
- Medical Records
- Prescriptions
- Lab Reports
- Billing
- Vitals

All routes live under `/app/patient/*` and require `PATIENT` role.

### 5.2 Patient Registration (Self-Service)

```
POST /auth/patient/register   → create PatientAccount
POST /auth/patient/login      → login
POST /auth/patient/select-org → link to hospital (tenantId + locationId)
```

### 5.3 Booking Appointments

1. Patient opens `/app/patient/appointments` → "Book Appointment" tab
2. Selects department → doctors list populates
3. Selects doctor → date picker enables (Sundays blocked)
4. Selects date → real slots load from `GET /appointments/slots?doctorId=&date=`
5. Slots grouped: Morning (before 12), Afternoon (12–17), Evening (after 17)
6. Click available slot → confirm booking → `POST /auth/patient/me/appointments`
7. Server resolves `PatientAccount` → `Patient` via email, creates appointment

### 5.4 My Appointments

```
GET  /auth/patient/me/appointments   → list with doctorName enrichment
PATCH /appointments/:id/cancel       → cancel booking
```

### 5.5 Patient Self-Service Endpoints

```
GET /auth/patient/me/appointments    → appointment history
POST /auth/patient/me/appointments   → book appointment
GET /auth/patient/me/prescriptions   → prescription history
GET /auth/patient/me/lab-reports     → lab results
GET /auth/patient/me/billing         → invoices and payment status
GET /auth/patient/me/vitals          → latest vitals
GET /auth/patient/me/profile         → demographic profile
```

---

## 6. Module Reference — All 72 Modules

### Administrative & Platform

| Module | Key Endpoints | Frontend Page |
|--------|--------------|---------------|
| **Auth** | `/auth/login`, `/auth/doctor/login`, `/auth/patient/login`, `/auth/me` | LoginPage, StaffRegisterPage |
| **Tenants** | `/tenants` CRUD, `/tenants/:id/stats` | `/platform/tenants` |
| **Platform** | `/platform/users`, `/platform/analytics` | `/platform/dashboard` |
| **Features** | `/features` CRUD, `/features/tenant/:id` | `/platform/features` |
| **Users** | `/users` CRUD (staff users) | AdminUsersPage |
| **Roles** | `/roles` CRUD | AdminRolesPage |
| **Departments** | `/departments` CRUD | AdminDepartmentsPage |
| **Locations** | `/locations` CRUD | AdminLocationsPage |
| **Audit** | `/audit` list, filters by module/user/action | AuditPage |
| **Notifications** | `/notifications` list, mark read, push via FCM | NotificationsPage |
| **Reports** | `/reports/lab`, `/reports/pharmacy`, `/reports/appointments`, `/reports/inventory` | ReportsPage (8 tabs) |
| **Search** | `/search?q=` (patients, appointments, invoices, prescriptions, admissions, lab orders, queue) | CommandPalette (Cmd+K) |
| **Uploads** | `/uploads` (file storage) | Used across modules |

### Clinical Modules

| Module | Key Endpoints | Frontend Page |
|--------|--------------|---------------|
| **Patients** | `/patients` CRUD, `/patients/:id/history` | PatientsPage |
| **Appointments** | `/appointments` CRUD, `/appointments/slots` | AppointmentsPage |
| **Consultations** | `/consultations` CRUD, inline lab orders | ConsultationPage |
| **Prescriptions** | `/prescriptions` CRUD, dispense | PrescriptionsPage, PatientPrescriptionsPage |
| **Medication Admin (MAR)** | `/medication-admin` CRUD, `/medication-admin/:id/withhold` | MARPage (Nurse) |
| **Lab** | `/lab/orders`, `/lab/results`, `/lab/qc/runs`, `/lab/qc/calibrations` | LabOrdersPage, LabResultsPage, LabQCPage |
| **Radiology** | `/radiology/orders`, `/radiology/results` | RadiologyPage |
| **Vitals** | `/vitals` CRUD | VitalsPage, PatientVitalsPage |
| **Admissions** | `/admissions` CRUD, discharge | AdmissionsPage |
| **Discharge Summary** | `/discharge-summary` CRUD | DischargeSummaryPage |
| **Wards** | `/wards` CRUD, `/wards/:id/beds` | WardsPage |

### Specialty Clinical

| Module | Key Endpoints | Frontend Page |
|--------|--------------|---------------|
| **Emergency** | `/emergency` CRUD | EmergencyPage |
| **Triage** | `/triage` CRUD, ESI scoring | TriagePage |
| **ICU** | `/icu` CRUD, transfer | ICUPage |
| **NICU** | `/nicu` CRUD | NICUPage |
| **OT** | `/ot/schedules` CRUD, start/complete | OTSchedulePage |
| **Dialysis** | `/dialysis` CRUD | DialysisPage |
| **Physiotherapy** | `/physiotherapy` CRUD | PhysiotherapyPage |
| **Wound Care** | `/wound-care` CRUD | WoundCarePage |
| **Palliative Care** | `/palliative-care` CRUD, home visits | PalliativeCarePage |
| **Home Care** | `/home-care` CRUD | HomeCarePage |
| **Telemedicine** | `/telemedicine` CRUD, room URL | TelemedicinePage |
| **Ambulance** | `/ambulance` CRUD | AmbulancePage |
| **Blood Bank** | `/blood-bank` CRUD | BloodBankPage |
| **Diet** | `/diet` CRUD, meal plans | DietPage |

### Administrative Clinical

| Module | Key Endpoints | Frontend Page |
|--------|--------------|---------------|
| **Billing** | `/billing/invoices` CRUD, email | BillingPage |
| **Insurance** | `/insurance/claims`, `/insurance/preauth` | InsurancePage |
| **Health Packages** | `/health-packages` CRUD | HealthPackagesPage |
| **Queue** | `/queue` CRUD, token management | QueuePage |
| **MLC Register** | `/mlc-register` CRUD | MLCRegisterPage |
| **Consent** | `/consent` CRUD | ConsentPage |
| **Certificates** | `/certificates` CRUD | CertificatesPage |
| **Discharge Summary** | `/discharge-summary` CRUD | DischargeSummaryPage |
| **Referral** | `/referral` CRUD | ReferralPage |
| **Feedback** | `/feedback` CRUD | FeedbackPage |
| **Grievance** | `/grievance` CRUD | GrievancePage |
| **Visitors** | `/visitors` CRUD | VisitorsPage |

### Operations & Support

| Module | Key Endpoints | Frontend Page |
|--------|--------------|---------------|
| **Inventory** | `/inventory` CRUD, batches, FEFO | InventoryPage (6 tabs) |
| **Pharmacy** | `/pharmacy` CRUD, dispense, low-stock | PharmacyPage |
| **Purchase Indent** | `/purchase-indent` CRUD, approve/reject | PurchaseIndentPage |
| **Central Store** | `/central-store` CRUD | CentralStorePage |
| **Vendor** | `/vendor` CRUD | VendorPage |
| **Asset Management** | `/asset-management` CRUD | AssetManagementPage |
| **CSSD** | `/cssd/batches` CRUD, issue/return | CssdPage |
| **Linen** | `/linen` CRUD | LinenPage |
| **Housekeeping** | `/housekeeping` CRUD | HousekeepingPage |
| **Waste Management** | `/waste-management` CRUD, manifest pipeline | WasteManagementPage |
| **Work Orders** | `/work-orders` CRUD, status workflow | WorkOrdersPage |

### HR & Compliance

| Module | Key Endpoints | Frontend Page |
|--------|--------------|---------------|
| **Staff Attendance** | `/staff-attendance` CRUD | StaffAttendancePage |
| **Duty Roster** | `/duty-roster` CRUD, swap request/approve | DutyRosterPage |
| **Payroll** | `/payroll` CRUD | PayrollPage |
| **Shift Handover** | `/shift-handover` CRUD | ShiftHandoverPage |
| **Doctor Registry** | `/doctor-registry` CRUD | DoctorRegistryPage |
| **Doctor Affiliations** | `/doctor-affiliations` CRUD | DoctorAffiliationsPage |
| **MRD** | `/mrd` CRUD | MRDPage |
| **Audit** | `/audit` log | AuditPage |
| **Birth/Death** | `/vital-records/births`, `/vital-records/deaths` CRUD + edit modal | BirthDeathPage |
| **Infection Control** | `/infection-control` CRUD | InfectionControlPage |
| **Quality** | `/quality` CRUD | QualityPage |
| **Antimicrobial Stewardship** | `/antimicrobial-stewardship` CRUD | AntimicrobialPage |
| **Clinical Pathways** | `/clinical-pathways` CRUD | ClinicalPathwaysPage |
| **Mortuary** | `/mortuary` CRUD | MortuaryPage |

---

## 7. Data Model Summary

### Core Entities

```
PlatformUser         id, email, passwordHash, role (PLATFORM_OWNER/PLATFORM_ADMIN)
Tenant               id, name, subdomain, plan, active
Location             id, tenantId, name, type (BRANCH/CLINIC/HOSPITAL)
TenantUser           id, tenantId, locationId, email, passwordHash, role, firstName, lastName
DoctorAccount        id, email, passwordHash (cross-tenant identity)
DoctorAffiliation    id, doctorAccountId, tenantId, locationId, specialization
PatientAccount       id, email, passwordHash (self-service login)
Patient              id, tenantId, locationId, patientNumber, firstName, lastName, DOB, gender
```

### Clinical Records

```
Appointment          id, tenantId, patientId, doctorId, date, time, status, type
Consultation         id, tenantId, patientId, doctorId, appointmentId, diagnosis, notes, icdCodes
Prescription         id, tenantId, patientId, doctorId, rxNumber, status
PrescriptionItem     id, prescriptionId, drugName, dosage, frequency, duration, qty
MedicationAdministration  id, tenantId, patientId, prescriptionId, scheduledTime, dosage, status
Admission            id, tenantId, patientId, admissionNumber, wardId, bedId, admittingDoctorId
Discharge            id, tenantId, admissionId, dischargeDate, summary, followUp
LabOrder             id, tenantId, patientId, doctorId, orderNumber, orderedAt, status
LabResult            id, labOrderId, testName, value, flag, referenceRange
Vitals               id, tenantId, patientId, bp, pulse, temperature, spo2, weight, height, recordedAt
```

### Pharmacy & Inventory

```
InventoryItem        id, tenantId, name, category, unit, quantity, reorderLevel
InventoryBatch       id, inventoryItemId, batchNumber, expiryDate, quantity (FEFO depletion)
PharmacyItem         id, tenantId, drugName, quantity, unitPrice, reorderLevel
```

### Billing

```
Invoice              id, tenantId, patientId, invoiceNumber, netTotal, status, paidAt
InvoiceItem          id, invoiceId, description, quantity, unitPrice, total
InsuranceClaim       id, tenantId, patientId, invoiceId, claimNumber, status, amount
```

### Operations

```
WorkOrder            id, tenantId, title, description, status, assignedTo, priority, dueDate
CssdBatch            id, tenantId, itemName, batchNumber, sterilizedAt, condition (STERILE/ISSUED/QUARANTINE)
WasteCollection      id, tenantId, category, weight, manifestNumber, status
DutyRoster           id, tenantId, userId, date, shiftStart, shiftEnd, swapStatus
```

---

## 8. API Endpoint Map

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Staff login |
| POST | `/auth/platform/login` | Public | Platform admin login |
| POST | `/auth/doctor/login` | Public | Doctor login |
| POST | `/auth/doctor/select-org` | JWT | Select doctor's org |
| POST | `/auth/patient/register` | Public | Patient self-register |
| POST | `/auth/patient/login` | Public | Patient login |
| POST | `/auth/patient/select-org` | JWT | Link patient to org |
| POST | `/auth/mfa/setup` | JWT | Init MFA |
| POST | `/auth/mfa/activate` | JWT | Enable MFA |
| POST | `/auth/mfa/verify` | JWT | Verify MFA code |
| POST | `/auth/forgot-password` | Public | Send reset email |
| POST | `/auth/reset-password` | Public | Reset with token |
| POST | `/auth/refresh` | Public | Refresh access token |
| GET | `/auth/me` | JWT | Current user profile |
| PATCH | `/auth/me` | JWT | Update profile |
| PUT | `/auth/me/password` | JWT | Change password |
| GET | `/auth/patient/me/appointments` | JWT | Patient's appointments |
| POST | `/auth/patient/me/appointments` | JWT | Book appointment |
| GET | `/auth/patient/me/prescriptions` | JWT | Patient's prescriptions |
| GET | `/auth/patient/me/lab-reports` | JWT | Patient's lab reports |
| GET | `/auth/patient/me/billing` | JWT | Patient's invoices |
| GET | `/auth/patient/me/vitals` | JWT | Patient's vitals |
| GET | `/auth/patient/me/profile` | JWT | Patient's profile |
| POST | `/auth/device-token` | JWT | Register FCM token |
| DELETE | `/auth/device-token` | JWT | Unregister FCM token |

### Patients

| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients` | List (search, paginate) |
| POST | `/patients` | Register new patient |
| GET | `/patients/:id` | Patient profile |
| PATCH | `/patients/:id` | Update demographics |
| DELETE | `/patients/:id` | Soft delete |
| GET | `/patients/:id/history` | Clinical timeline |

### Appointments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/appointments` | List with filters |
| POST | `/appointments` | Create booking |
| GET | `/appointments/:id` | Detail |
| PATCH | `/appointments/:id` | Update/reschedule |
| PATCH | `/appointments/:id/cancel` | Cancel |
| GET | `/appointments/slots` | Available slots |

### Clinical

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/consultations` | List/create |
| GET/PATCH | `/consultations/:id` | Detail/update |
| GET/POST | `/prescriptions` | List/create |
| PATCH | `/prescriptions/:id` | Update |
| POST | `/prescriptions/:id/dispense` | Pharmacy dispense |
| GET/POST | `/medication-admin` | MAR list/create |
| PATCH | `/medication-admin/:id` | Administer |
| PATCH | `/medication-admin/:id/withhold` | Withhold with reason |
| GET/POST | `/lab/orders` | Orders list/create |
| POST | `/lab/orders/:id/results` | Enter results |
| GET/POST | `/lab/qc/runs` | QC runs |
| GET/POST | `/lab/qc/calibrations` | Calibrations |
| GET/POST | `/vitals` | Vitals list/create |
| GET/POST | `/admissions` | Admissions |
| POST | `/admissions/:id/discharge` | Discharge |

### Billing & Insurance

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/billing/invoices` | Invoices |
| PATCH | `/billing/invoices/:id` | Update/pay |
| POST | `/billing/invoices/:id/email` | Email invoice |
| GET | `/billing/summary` | Revenue summary |
| GET/POST | `/insurance/claims` | Claims |
| PATCH | `/insurance/claims/:id` | Update claim |
| GET/POST | `/insurance/preauth` | Pre-authorizations |

### Operations

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/inventory` | Stock list/create |
| GET/POST | `/inventory/batches` | Batch tracking (FEFO) |
| GET/POST | `/work-orders` | Work orders |
| PATCH | `/work-orders/:id` | Update status |
| GET/POST | `/cssd/batches` | CSSD sterilization batches |
| PATCH | `/cssd/batches/:id/issue` | Issue to department |
| PATCH | `/cssd/batches/:id/return` | Return from department |
| GET/POST | `/waste-management` | Waste manifest |
| GET/POST | `/duty-roster` | Shift schedule |
| POST | `/duty-roster/:id/swap` | Request shift swap |
| PATCH | `/duty-roster/:id/approve-swap` | Approve swap |
| GET/POST | `/vital-records/births` | Birth records |
| GET/POST | `/vital-records/deaths` | Death records |
| PATCH | `/vital-records/births/:id` | Edit birth record |
| PATCH | `/vital-records/deaths/:id` | Edit death record |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports/lab` | Lab report summary |
| GET | `/reports/pharmacy` | Pharmacy dispensing report |
| GET | `/reports/appointments` | Appointment statistics |
| GET | `/reports/inventory` | Inventory usage report |
| GET | `/reports/billing` | Revenue report |
| GET | `/reports/admissions` | Admission statistics |
| GET | `/reports/staff` | Staff activity report |
| GET | `/reports/quality` | Quality metrics report |

### Search

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=` | Global search across 7 entity types: patients, appointments, invoices, prescriptions, admissions, lab orders, queue |

---

## Appendix: Application URL Map

| URL Pattern | Component | Role(s) |
|-------------|-----------|---------|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/doctor/login` | LoginPage (doctor mode) | Public |
| `/patient/login` | LoginPage (patient mode) | Public |
| `/platform/login` | LoginPage (platform mode) | Public |
| `/app/dashboard` | AdminDashboard | ADMIN |
| `/app/patients` | PatientsPage | ADMIN, RECEPTION, NURSE |
| `/app/appointments` | AppointmentsPage | RECEPTION, ADMIN |
| `/app/queue` | QueuePage | RECEPTION |
| `/app/admissions` | AdmissionsPage | ADMIN, RECEPTION |
| `/app/billing` | BillingPage | BILLING, ADMIN |
| `/app/insurance` | InsurancePage | BILLING, ADMIN |
| `/app/pharmacy` | PharmacyPage | PHARMACY |
| `/app/inventory` | InventoryPage | PHARMACY, ADMIN |
| `/app/lab/orders` | LabOrdersPage | LAB |
| `/app/lab/results` | LabResultsPage | LAB, DOCTOR |
| `/app/lab/qc` | LabQCPage | LAB |
| `/app/radiology` | RadiologyPage | LAB, ADMIN |
| `/app/doctor/consultations` | ConsultationPage | DOCTOR |
| `/app/doctor/prescriptions` | PrescriptionsPage | DOCTOR |
| `/app/doctor/telemedicine` | TelemedicinePage | DOCTOR |
| `/app/nurse/mar` | MARPage | NURSE |
| `/app/nurse/vitals` | VitalsPage | NURSE |
| `/app/nurse/wound-care` | WoundCarePage | NURSE |
| `/app/nurse/shift-handover` | ShiftHandoverPage | NURSE |
| `/app/ot` | OTSchedulePage | OT, ADMIN |
| `/app/icu` | ICUPage | NURSE, DOCTOR |
| `/app/nicu` | NICUPage | NURSE, DOCTOR |
| `/app/emergency` | EmergencyPage | NURSE, DOCTOR, RECEPTION |
| `/app/triage` | TriagePage | NURSE |
| `/app/cssd` | CssdPage | OT |
| `/app/duty-roster` | DutyRosterPage | ADMIN |
| `/app/staff-attendance` | StaffAttendancePage | ADMIN |
| `/app/payroll` | PayrollPage | ADMIN |
| `/app/work-orders` | WorkOrdersPage | ADMIN |
| `/app/waste-management` | WasteManagementPage | ADMIN |
| `/app/birth-death` | BirthDeathPage | ADMIN, RECEPTION |
| `/app/audit` | AuditPage | ADMIN |
| `/app/reports` | ReportsPage | ADMIN, BILLING |
| `/platform/dashboard` | PlatformDashboard | PLATFORM_OWNER, PLATFORM_ADMIN |
| `/platform/tenants` | TenantsPage | PLATFORM_OWNER, PLATFORM_ADMIN |
| `/platform/features` | FeaturesPage | PLATFORM_OWNER, PLATFORM_ADMIN |
| `/app/patient/portal` | PatientPortalPage | PATIENT |
| `/app/patient/appointments` | PatientAppointmentsPage | PATIENT |
| `/app/patient/records` | PatientMedicalRecordsPage | PATIENT |
| `/app/patient/prescriptions` | PatientPrescriptionsPage | PATIENT |
| `/app/patient/lab` | PatientLabReportsPage | PATIENT |
| `/app/patient/billing` | PatientBillingPage | PATIENT |
| `/app/patient/vitals` | PatientVitalsPage | PATIENT |

---

*Generated by Ayphen HMS — 2026-05-08*
