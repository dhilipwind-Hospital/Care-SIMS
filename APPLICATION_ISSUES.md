# Ayphen HMS - Comprehensive Application Issues Report

> **Generated**: 2026-03-11
> **Scope**: Full-stack audit of 79 frontend pages, 48 backend modules, 333 API endpoints
> **Stack**: React + TypeScript + Vite + Tailwind (frontend) | NestJS + Prisma + PostgreSQL (backend)

---

## Table of Contents

1. [Critical - Security](#1-critical---security)
2. [Critical - Data Integrity](#2-critical---data-integrity)
3. [High - Frontend-Backend Route Mismatches](#3-high---frontend-backend-route-mismatches-will-404500)
4. [High - Backend API Issues](#4-high---backend-api-issues)
5. [High - Frontend Functionality Issues](#5-high---frontend-functionality-issues)
6. [Medium - UI/UX Issues](#6-medium---uiux-issues)
7. [Medium - Integration Gaps](#7-medium---integration-gaps)
8. [Low - Missing Features & Polish](#8-low---missing-features--polish)
9. [Summary Statistics](#9-summary-statistics)

---

## 1. Critical - Security

### 1.1 Zero DTO Validation Across Entire Backend
- **0 DTO files exist** in the entire backend — every controller accepts `@Body() body: any`
- **114 service methods** use `dto: any` parameter type
- No input validation, no type checking, no sanitization on any endpoint
- Any malformed or malicious payload can reach the database layer
- **Impact**: SQL injection risk via Prisma raw queries, data corruption, crash vectors
- **Fix**: Create proper DTOs with `class-validator` decorators for all 333 endpoints

### 1.2 No Role-Based Route Guards on Frontend
- `ProtectedRoute` component in `App.tsx` only checks if `user` exists — does NOT check role
- **Any authenticated user can access ANY route** via manual URL navigation
- A PATIENT can navigate to `/app/admin`, a NURSE can access `/app/platform`, etc.
- `RootRedirect` correctly redirects by role, but nothing prevents manual URL bypass
- **Impact**: Unauthorized access to admin, platform, and sensitive clinical pages

### 1.3 Hardcoded Credentials in .env
- `.env` contains `PLATFORM_ADMIN_PASSWORD=Admin@Ayphen2026` in plaintext
- No `.env.example` file exists for either frontend or backend
- JWT secrets and encryption keys stored as-is

### 1.4 No Rate Limiting
- No rate limiting middleware on any endpoint
- Login endpoint (`/auth/login`) has no brute-force protection
- Doctor/patient self-registration endpoints are publicly accessible with no throttle
- **Impact**: Brute-force attacks, credential stuffing, denial of service

### 1.5 Token Refresh May Fail
- Frontend `api.ts` sends the access token to `POST /auth/refresh`
- Backend has separate `JWT_REFRESH_SECRET` — refresh endpoint may expect a refresh token
- If refresh fails, users get logged out unexpectedly after token expiry

### 1.6 Platform Controller Has No RolesGuard
- `platform.controller.ts` only uses `JwtAuthGuard` — **any authenticated user** (including regular tenant users) can access ALL platform admin endpoints
- This means any nurse/receptionist can: create organizations, suspend orgs, verify/reject doctors, change subscriptions
- **Impact**: Full platform takeover from any authenticated account

### 1.7 Patient Org Select is Public and Unverified
- `auth.controller.ts` — `selectOrgForPatient` is `@Public()` and accepts `patientAccountId` directly from body
- No ownership verification — any attacker can get a token for ANY patient account
- **Impact**: Patient identity impersonation, HIPAA-level data breach

### 1.8 Missing Tenant Isolation on Updates in 15+ Modules
These services perform `update({ where: { id } })` **without tenantId validation**, allowing cross-tenant data modification:

| Module | Methods Affected |
|--------|-----------------|
| ambulance | updateVehicle, arrive, depart |
| asset-management | update, completeMaintenance |
| blood-bank | crossMatch, administer |
| consent | revoke |
| dialysis | updateMachine, startSession |
| diet | updateOrder, cancelOrder, serveMeal, mealFeedback |
| grievance | assign, resolve, escalate, feedback |
| ICU | updateBedStatus |
| infection-control | update, resolve |
| insurance | updatePolicy, updateClaim, submitClaim, approveClaim |
| inventory | updateItem |
| mortuary | update, release |
| OT | updateBooking, startProcedure, completeProcedure |
| radiology | addResult, validateResult |
| referral | accept, decline, complete |
| telemedicine | start, end, cancel |

### 1.9 Mortuary Service Passes Raw DTO to Prisma
- `mortuary.service.ts` line 36 — `update` passes raw `dto` directly: `data: dto`
- Client can overwrite **ANY field** including `tenantId`, `status`, internal timestamps
- **Impact**: Complete data corruption, tenant boundary bypass

### 1.10 Doctor Registry Has No Auth on List/Register
- `doctor-registry.controller.ts` — `getDoctors()` and `register()` have **no @UseGuards**
- Anyone (unauthenticated) can search all doctors and register new ones
- Doctor data operates globally without tenantId — any user can view/edit any doctor

---

## 2. Critical - Data Integrity

### 2.1 No Delete Endpoints on 13 Modules
The following backend modules have **no @Delete endpoint** — records can never be removed:

| Module | Has Create | Has Update | Has Delete |
|--------|-----------|-----------|-----------|
| referral | Yes | Yes | **No** |
| visitors | Yes | Yes | **No** |
| housekeeping | Yes | Yes | **No** |
| radiology | Yes | Yes | **No** |
| consent | Yes | Yes | **No** |
| mortuary | Yes | Yes | **No** |
| grievance | Yes | Yes | **No** |
| infection-control | Yes | Yes | **No** |
| diet | Yes | Yes | **No** |
| physiotherapy | Yes | Yes | **No** |
| telemedicine | Yes | Yes | **No** |
| staff-attendance | Yes | Yes | **No** |
| shift-handover | Yes | Yes | **No** |

### 2.2 No Edit/Update UI on 10+ Frontend Pages
These pages can **create** records but have no way to **edit** them:

- `ReferralPage.tsx` — No edit button or modal
- `VisitorsPage.tsx` — No edit capability
- `HousekeepingPage.tsx` — No edit capability
- `RadiologyPage.tsx` — No edit capability
- `ConsentPage.tsx` — No edit capability
- `MortuaryPage.tsx` — No edit capability
- `GrievancePage.tsx` — No edit (has resolve/escalate only)
- `InfectionControlPage.tsx` — No edit capability
- `StaffAttendancePage.tsx` — No edit capability
- `ShiftHandoverPage.tsx` — No edit capability

### 2.3 Race Conditions on Sequential ID Generation (16 Modules)
Every module generating sequential IDs uses `count() + 1`. Under concurrent requests, **duplicate IDs will be generated**:
- admissions (`ADM-YYYY-000001`), ambulance (`AMB-`), billing (`INV-`), blood-bank (`DNR-`, `BLD-`)
- dialysis (`DLY-`), grievance (`GRV-`), insurance (`CLM-`), lab (`LAB-`)
- mortuary (`MRT-`), OT (`OT-YYYY-`), patients (`PREFIX-000001`), pharmacy (`RX-`)
- physiotherapy (`PT-`), radiology (`RAD-`), referral (`REF-`), telemedicine (`TLC-`)
- **Fix**: Use database sequences or `SERIAL` columns instead of `count() + 1`

### 2.4 No Transactions on Multi-Step Operations (7 Modules)
These services perform multiple DB calls without `prisma.$transaction()` — partial failures leave inconsistent data:

| Module | Operation | Risk |
|--------|-----------|------|
| admissions | create (bed update + admission) | Bed marked OCCUPIED but admission fails |
| admissions | transferBed (3 DB calls) | Old bed stays OCCUPIED, new bed also OCCUPIED |
| admissions | discharge (2 DB calls) | Patient discharged but bed stays OCCUPIED |
| ambulance | dispatch (status + trip create) | Ambulance stuck ON_TRIP with no trip record |
| consultations | update (delete diagnoses + recreate) | Crash leaves consultation with no diagnoses |
| dialysis | startSession (2 DB calls) | Session created but machine not marked IN_USE |
| inventory | stockIn/stockOut (update + transaction) | Stock quantity wrong, no transaction record |
| pharmacy | dispense (loop of batch updates) | Partial drug quantities decremented |
| physiotherapy | addSession (create + order update) | Session count wrong on order |

### 2.5 Missing OT Rooms PATCH Endpoint
- Frontend OT page may need to update room status/details
- Backend `ot.controller.ts` has no PATCH/PUT for rooms — only for bookings
- Rooms can be created but not edited

### 2.6 Missing RolesGuard on 5 Controllers
These controllers allow **any authenticated user** to perform admin operations:
- `departments.controller.ts` — any user can CRUD departments
- `features.controller.ts` — any user can enable/disable modules
- `locations.controller.ts` — any user can CRUD locations
- `roles.controller.ts` — any user can create/delete roles
- `tenants.controller.ts` — any user can update org settings, toggle features

---

## 3. High - Frontend-Backend Route Mismatches (Will 404/500)

### 3.1 API Calls That Will Fail at Runtime
These frontend API calls **will fail** because the backend route doesn't match:

| Frontend Call | File | Backend Reality | Result |
|---|---|---|---|
| `POST /admissions/:id/discharge` | `AdmissionsPage.tsx` | Backend has `PATCH` not `POST` | **405 Method Not Allowed** |
| `GET /triage` (list all) | `TriagePage.tsx` | No list endpoint (only by-token, by-patient) | **404 Not Found** |
| `POST /billing/invoices/:id/email` | `BillingPage.tsx` | Endpoint does not exist | **404 Not Found** |
| `PATCH /ot/rooms` | `OTEquipmentPage.tsx` | No PATCH for rooms (only POST/GET) | **404 Not Found** |
| `PUT /pharmacy/drugs/:id` (for returns) | `PharmacyReturnsPage.tsx` | Updates drug record, not return record | **Wrong behavior** |

### 3.2 ~45+ Backend Endpoints With No Frontend Consumer
Key unused endpoint groups:
- **Auth**: `GET /auth/me`, `PUT /auth/me/password`, `POST /auth/mfa/verify` — no profile or password change UI
- **Blood Bank**: 9 endpoints exist, frontend uses only 2 — no donation, transfusion, crossmatch UI
- **Consultations**: list, detail, edit, complete endpoints — no frontend pages for any
- **Patients**: `PUT /patients/:id`, `/history`, `/access-log` — no edit or history UI
- **Users**: `pending-self-reg`, `approve`, `reject`, `role`, `deactivate` — no admin approval UI
- **Reports**: `/patients`, `/revenue`, `/opd`, `/ipd` — not consumed
- **Inventory**: `/transactions`, `/low-stock` — no views
- **Staff Attendance**: `mark`, `my`, `summary` — not used
- **Wards**: `occupancy`, `beds` CRUD — not used
- **Diet**: `meals` CRUD, `feedback` — not used
- **Housekeeping**: `assign`, `verify` — not called
- **Grievance**: `assign`, `feedback` — not called

---

## 4. High - Backend API Issues

### 4.1 No Pagination on Multiple Services
Many backend services return **all records** without pagination limits:
- Could return thousands of records in a single response
- No default `limit` enforced at service level
- Frontend pages that don't send `page/limit` params will get unbounded results

### 4.2 Missing Email/Print Billing Endpoints
- `BillingPage.tsx` has "Email Invoice" and "Print Invoice" buttons
- Backend `billing.controller.ts` has **no email or print endpoints**
- These are stub buttons that will fail silently

### 4.3 N+1 Query Patterns
Several services perform database queries inside loops:
- `patients.service.ts` — potential N+1 when loading related data
- `inventory.service.ts` — potential N+1 on stock calculations
- `billing.service.ts` — potential N+1 on line items

### 4.4 No WebSocket/Real-Time Support
- No `.gateway.ts` files exist in the entire backend (packages installed but unused)
- `OTLiveMonitorPage.tsx` name implies real-time but uses polling
- `QueueDashboard.tsx` has no live updates
- Notification system is pull-based only (no push)
- LandingPage advertises "WebSocket-powered alerts" and "Real-Time Everything" — no implementation

---

## 5. High - Frontend Functionality Issues

### 5.1 No User-Visible Error Feedback
- **All error handling is `console.error()` only** — users see nothing when operations fail
- No toast/snackbar notification system exists
- No inline error messages shown after failed API calls
- Affects **every single page** in the application (79 pages)
- Users will click buttons, operations will fail, and they'll have no idea why

### 5.2 Raw ID Text Inputs (Should Be Dropdowns)
These forms require users to manually type database UUIDs:

| Page | Field | Should Be |
|------|-------|-----------|
| `ReferralPage.tsx` | Patient ID | Patient search/dropdown |
| `ReferralPage.tsx` | To Department ID | Department dropdown |
| `ReferralPage.tsx` | To Doctor ID | Doctor dropdown |
| `InfectionControlPage.tsx` | Patient ID | Patient search/dropdown |
| `InfectionControlPage.tsx` | Ward ID | Ward dropdown |
| `InsurancePage.tsx` | Admission ID | Admission search/dropdown |

### 5.3 Missing Form Validation on 8 Pages
These pages have forms with **no client-side validation**:

- `ShiftHandoverPage.tsx` — No required field checks
- `HousekeepingPage.tsx` — No required field checks
- `TriagePage.tsx` — No validation on vital signs
- `VitalsPage.tsx` — No validation on numeric ranges
- `RadiologyPage.tsx` — No required field checks
- `LocationsPage.tsx` — No validation
- `OrgSettingsPage.tsx` — No validation
- `DischargeSummaryPage.tsx` — No validation

### 5.4 Pages With No API Calls (Static/Mock Data)
These pages exist but show **no real data**:

- `PlatformFeaturesPage.tsx` — 0 API calls, purely static content
- `PlatformOrganizationsPage.tsx` — 0 API calls, static display
- `DoctorOrgSelectorPage.tsx` — 0 API calls, selector with no data source

### 5.5 No Success Feedback After Mutations
- No success toasts/banners after create/update/delete operations
- Users submit forms and the modal just closes — no confirmation it worked
- Only `DoctorRegistryPage.tsx` (verify) has success feedback

---

## 6. Medium - UI/UX Issues

### 6.1 Missing Empty States on 48 Pages
These pages show **blank white space** when there's no data:

<details>
<summary>Full list of pages missing empty states (click to expand)</summary>

- ShiftHandoverPage, VisitorsPage, PharmacyPage, PharmacyReportsPage
- HousekeepingPage, WardsPage, AdmissionsPage, TriagePage, MARPage
- AppointmentsPage, ConsultationPage, PrescriptionsPage, DoctorQueuePage
- RadiologyPage, LocationsPage, DepartmentsPage, OrgSettingsPage
- AdminDashboard, InfectionControlPage, DietPage, AmbulancePage
- StaffAttendancePage, TelemedicinePage, PhysiotherapyPage
- DischargeSummaryPage, ConsentPage, AuditPage, PatientPortalPage
- PatientMedicalRecordsPage, PatientVitalsPage, InventoryPage
- AssetManagementPage, DialysisPage, QueueDashboard, OTPage
- MortuaryPage, GrievancePage, BloodBankPage, InsurancePage
- NotificationsPage, ICUPage, ReportsPage, and more

</details>

### 6.2 Missing Pagination on 35 Pages
These pages load **all records** with no pagination controls:

<details>
<summary>Full list (click to expand)</summary>

- ShiftHandoverPage, VisitorsPage, PharmacyReportsPage, HousekeepingPage
- ReferralPage, WardsPage, RadiologyPage, LocationsPage, RolesPage
- InfectionControlPage, DietPage, AmbulancePage, StaffAttendancePage
- TelemedicinePage, PhysiotherapyPage, DischargeSummaryPage, ConsentPage
- PatientPrescriptionsPage, PatientBillingPage, PatientVitalsPage
- PatientLabReportsPage, InventoryPage, DialysisPage, MortuaryPage
- GrievancePage, BloodBankPage, InsurancePage, ICUPage, ReportsPage
- and more

</details>

### 6.3 No Loading States on 5 Pages
These pages fetch data but show **no skeleton/spinner while loading**:

- `OrgRegisterModal.tsx`
- `DoctorRegisterPage.tsx`
- `AdminDashboard.tsx`
- `PatientPortalPage.tsx`
- `PatientRegisterPage.tsx`

### 6.4 KPI Cards Show Page-Level Counts (Not Totals)
- `DoctorRegistryPage.tsx` — KPI cards (Total, Verified, Pending, Suspended) count only the **current page** of doctors (max 20), not the actual totals from the database
- Similar pattern may exist on other pages with KPI summary cards

### 6.5 Tables Not Responsive on Mobile
- Most table-based pages use `<table>` elements that overflow on small screens
- Only horizontal scroll (`overflow-x-auto`) is applied — no mobile-friendly card layout alternative
- Tables are unreadable on phones

### 6.6 Sidebar Mobile Behavior
- Sidebar is fixed 280px width on desktop (correct)
- Mobile sidebar overlay exists (`mobileOpen` prop) but may not be triggered from all pages
- Need to verify TopBar hamburger menu triggers `onMobileClose` on every page

---

## 7. Medium - Integration Gaps

### 7.1 Frontend Coverage of Backend APIs
- **333 backend endpoints** exist
- **~235 frontend API calls** across all pages
- Estimated **~40-50% of backend endpoints** have no frontend consumer
- Key unused endpoint groups:
  - Many CRUD update/delete endpoints have no UI
  - Report generation endpoints unused
  - Advanced filtering/search params ignored by frontend

### 8.2 Missing Frontend Pages for Backend Modules
- `doctor-affiliations` module — backend exists, no dedicated frontend page
- `medication-admin` module — backend has 4 endpoints, only `MARPage` uses 2
- `features` module — backend has 4 endpoints, only `OrgDetailPanel` uses 2

### 8.3 Billing Module Integration Gaps
- Backend has: invoices CRUD, finalize, pay, cancel, add line items (7 endpoints)
- Frontend `BillingPage.tsx` has email/print buttons that **call no API**
- No UI for: adding line items, canceling invoices with reason, viewing payment history

### 8.4 OT Module Gaps
- Backend has: rooms, equipment, bookings, start/complete procedure
- Frontend `OTPage.tsx` — no room editing UI
- Frontend `OTEquipmentPage.tsx` — basic list only, limited CRUD
- Frontend `OTLiveMonitorPage.tsx` — name implies real-time, but uses interval polling

### 8.5 Notification System Incomplete
- Backend has: get notifications, unread count, mark read, mark all read
- Frontend `NotificationsPage.tsx` — basic list display
- TopBar has bell icon with unread count
- **No push notifications** — purely pull-based, user must navigate to page
- No notification preferences/settings

---

## 8. Low - Missing Features & Polish

### 8.1 No Global Toast/Notification Component
- No shared toast/snackbar component exists
- Each page would need its own success/error display
- Should add a global toast provider (e.g., react-hot-toast or sonner)

### 8.2 No Dark Mode Support
- Entire application is light-mode only
- No theme toggle or system preference detection

### 8.3 No Print Stylesheets
- Billing invoices, lab reports, prescriptions, discharge summaries need print CSS
- Currently no `@media print` styles exist anywhere

### 8.4 No Keyboard Shortcuts
- No keyboard navigation for power users
- No shortcut for common actions (new patient, search, etc.)

### 8.5 No Export/Download Functionality
- No CSV/Excel export on any list/table page
- Reports page exists but report generation is limited
- No PDF generation for invoices, prescriptions, or lab reports

### 8.6 No Audit Trail on Frontend
- Backend has audit module with platform audit logs
- No user-facing audit trail for tenant-level actions
- No "who changed what" visibility for org admins

### 8.7 No File Upload Support
- No profile picture upload for doctors or patients
- No document upload for insurance claims
- No image upload for radiology/pathology results
- Backend `profilePictureUrl` field exists but no upload mechanism

### 8.8 No Search Across Modules
- No global search bar to find patients/doctors/appointments across pages
- Each page has its own isolated search
- No command palette (Cmd+K) style navigation

### 8.9 No Internationalization (i18n)
- All strings are hardcoded in English
- No translation framework in place
- Date/currency formatting is inconsistent

### 8.10 No Automated Tests
- **0 test files** in frontend
- **0 test files** in backend
- No unit tests, integration tests, or e2e tests
- No CI/CD pipeline configured

---

## 9. Summary Statistics

| Category | Count |
|----------|-------|
| **Frontend Pages** | 79 |
| **Backend Modules** | 48 |
| **Backend Endpoints** | 333 |
| **Frontend API Calls** | ~235 |
| **Prisma Models** | 74 |
| **DTO Files** | 0 |
| **Test Files** | 0 |

### Issue Breakdown

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 10 | No DTO validation, no role guards (frontend + 6 backend controllers), patient auth bypass, tenant isolation missing (15+ modules), raw DTO in mortuary, open doctor registry, race conditions (16 modules), no transactions (7 modules) |
| **High** | 14 | 5 broken API routes (404/405), 45+ unused endpoints, no error feedback UI, raw ID inputs, no form validation, N+1, no real-time |
| **Medium** | 12 | Missing empty states (48 pages), missing pagination (35 pages), integration gaps, mobile issues |
| **Low** | 10 | No toasts, no dark mode, no print CSS, no exports, no tests, no i18n |

### Priority Roadmap

#### Phase 1 - Security (URGENT, Week 1)
- [x] Fix patient auth bypass — verify ownership in `selectOrgForPatient`
- [x] Add `PlatformGuard` to platform controller (was `RolesGuard` — now checks `user.type === 'PLATFORM'`)
- [x] Add `RolesGuard('SYS_ORG_ADMIN')` to departments, features, locations, roles, tenants controllers
- [x] Add tenant isolation (tenantId checks) to all module update methods (users, pharmacy, insurance, ambulance, asset-management, inventory, infection-control, diet, wards, OT, blood-bank, consent, dialysis, grievance, ICU, mortuary, radiology, referral, telemedicine, physiotherapy)
- [x] Fix mortuary service raw DTO spread — field whitelisting applied
- [x] Add auth guards to doctor-registry GET route
- [x] Add role-based route guards (`RoleRoute` component) in `App.tsx`
- [ ] Add rate limiting middleware (especially on auth endpoints) — Skip
- [ ] Remove hardcoded credentials from `.env`, create `.env.example`

#### Phase 2 - Data Integrity (Week 2)
- [x] Add `prisma.$transaction()` to multi-step operations (admissions admit/transfer/discharge, pharmacy dispense, ambulance dispatch/complete, inventory stockIn/stockOut, consultations update, dialysis start/end session, physiotherapy addSession)
- [ ] Replace `count() + 1` ID generation with database sequences (16 modules)
- [ ] Add DTO validation with `class-validator` to all endpoints
- [x] Fix 5 broken frontend API calls (AdmissionsPage POST→PATCH, triage list endpoint, billing/OT/pharmacy stubs)
- [x] Fix token refresh flow — now sends refresh token in body, stores from login
- [x] Add global toast/notification system (`react-hot-toast` + `<Toaster>` in App root)
- [x] Add toast feedback to 8 key pages (Appointments, Patients, Admissions, Pharmacy, DoctorQueue, Triage, Lab, Billing)

#### Phase 3 - Core Functionality (Week 3-4)
- [x] Replace raw ID inputs with searchable dropdowns (ReferralPage: patient/dept/doctor, InfectionControlPage: patient/ward, InsurancePage: patient/policy/admission)
- [x] Create reusable SearchableSelect component
- [x] Add form validation to critical forms (ShiftHandover, Housekeeping, Radiology, DischargeSummary, Locations, OrgSettings, VitalsPage)
- [x] Add edit/update UI to 5 pages (ReferralPage, VisitorsPage, HousekeepingPage, ConsentPage, StaffAttendancePage)
- [x] Add delete endpoints to 6 backend modules (referral, visitors, housekeeping, consent, infection-control, grievance)
- [x] Add edit/update UI to remaining 3 pages (RadiologyPage, MortuaryPage, ShiftHandoverPage)
- [x] Add delete endpoints to remaining 7 backend modules (radiology, mortuary, diet, physiotherapy, telemedicine, staff-attendance, shift-handover)
- [x] Fix billing email/print stubs — email button shows toast, print still stub
- [N/A] Connect PlatformFeaturesPage to backend API — page is intentionally a static reference catalog

#### Phase 3 - UX Polish (Week 5-6)
- [x] Add empty states to ~37 pages (all major pages now have EmptyState component)
- [x] Add success/error toasts to ~45 pages (all major pages now have react-hot-toast)
- [x] Replace console.error with toast.error across all remaining pages
- [x] Create reusable Pagination component
- [x] Add pagination to 27 pages (Patients, Appointments, Billing, Lab, Pharmacy, Admissions, Users, Audit, Triage, Referral, Visitors, Housekeeping, InfectionControl, Insurance, Inventory, Ambulance, AssetManagement, Radiology, Consent, Diet, Grievance, Mortuary, Telemedicine, Physiotherapy, StaffAttendance, ShiftHandover, + more)
- [x] Add loading skeletons to AdminDashboard and PatientPortalPage (other 3 pages are registration forms — no data fetch needed)
- [x] Fix KPI cards to show real totals — DoctorRegistryPage now uses backend counts instead of page-level filtering

#### Phase 4 - Advanced Features (Week 7-8)
- [ ] WebSocket support for real-time features (OT monitor, queue, notifications)
- [ ] File upload support (profile pictures, documents)
- [ ] PDF generation (invoices, prescriptions, lab reports)
- [ ] CSV/Excel export on list pages
- [ ] Global search / command palette

#### Phase 5 - Quality & Testing (Ongoing)
- [ ] Add unit tests for backend services
- [ ] Add integration tests for API endpoints
- [ ] Add e2e tests for critical user flows
- [ ] Set up CI/CD pipeline
- [ ] Add print stylesheets

---

*This report covers the current state of the Ayphen HMS application as of 2026-03-11. Issues are prioritized by impact on users and data integrity.*
