# Ayphen HMS — Integration Gaps Report

> **Generated**: 2026-03-27
> **Scope**: Cross-reference of 378 backend endpoints vs ~200 frontend API calls
> **Stack**: React + TypeScript (frontend) | NestJS + Prisma + PostgreSQL (backend)

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Backend Endpoints** | 378 |
| **Frontend API Calls** | ~200 |
| **Unused Backend Endpoints** | ~155 |
| **Coverage** | ~53% |
| **Critical Gaps** | 12 |
| **High Gaps** | 18 |
| **Medium Gaps** | 25+ |

---

## 1. Critical Gaps — Core Features Missing from Frontend

### 1.1 User Management — No Admin Approval Workflow
**Backend has, Frontend missing:**
- `GET /users/pending-self-reg` — List pending staff self-registrations
- `PATCH /self-reg/:id/approve` — Approve self-registered staff
- `PATCH /self-reg/:id/reject` — Reject self-registered staff
- `PATCH /:id/deactivate` — Deactivate user
- `PATCH /:id/reactivate` — Reactivate user
- `PATCH /:id/role` — Change user role

**Impact**: Staff self-register via `StaffRegisterPage` but admins have **no UI to approve or reject** them. Deactivated users cannot be managed.

---

### 1.2 Auth — No Profile or Password Management
**Backend has, Frontend missing:**
- `GET /auth/me` — Get current user profile
- `PUT /auth/me/password` — Change password
- `POST /auth/mfa/verify` — Verify MFA at login

**Impact**: Users **cannot change their password** or view their profile. MFA setup exists (`MfaSetupPage`) but MFA verification at login is not wired up — MFA is effectively decorative.

---

### 1.3 Patient Management — No Edit or History
**Backend has, Frontend missing:**
- `PUT /patients/:id` — Update patient record
- `GET /patients/:id/history` — Get patient medical history
- `GET /patients/:id/access-log` — Get patient access log

**Impact**: Once a patient is registered, **their record cannot be edited**. No way to view consolidated medical history or who accessed the patient record.

---

### 1.4 Consultations — No Standalone UI
**Backend has, Frontend missing:**
- `GET /consultations` — List all consultations
- `GET /consultations/:id` — View consultation detail
- `PUT /consultations/:id` — Edit consultation
- `PATCH /consultations/:id/complete` — Complete consultation

**Impact**: Consultations can only be created from `ConsultationPage` (via doctor queue flow). **No list view, no edit capability, no completion workflow**. Admins and nurses cannot view consultation records.

---

### 1.5 Admissions — Missing Core Actions
**Backend has, Frontend missing:**
- `POST /admissions` — Admit patient (frontend only has discharge)
- `GET /admissions/:id` — View admission detail
- `PUT /admissions/:id` — Update admission
- `PATCH /admissions/:id/transfer-bed` — Transfer patient to another bed

**Impact**: `AdmissionsPage` shows a list and can discharge, but **cannot admit patients, view details, or transfer beds**.

---

### 1.6 Billing — Missing Line Items and Payment History
**Backend has, Frontend missing:**
- `POST /billing/invoices/:id/line-items` — Add line items to invoice
- `GET /billing/invoices/:id` — View invoice detail

**Impact**: Invoices are created as a flat amount. **No itemized billing UI** — cannot add consultation fees, lab charges, medication costs as separate line items. No invoice detail view.

---

### 1.7 Blood Bank — 6 of 9 Endpoints Unused
**Backend has, Frontend missing:**
- `GET /blood-bank/donors/:id` — View donor detail
- `POST /donations` — Record blood donation
- `POST /transfusions` — Order blood transfusion
- `PATCH /transfusions/:id/crossmatch` — Crossmatch blood
- `PATCH /transfusions/:id/administer` — Administer transfusion
- `GET /blood-bank/inventory` — Detailed inventory (only summary is used)

**Impact**: Blood bank page can only register donors and view summary. **No donation recording, no transfusion workflow, no crossmatching**.

---

### 1.8 Wards — Occupancy and Bed CRUD Missing
**Backend has, Frontend missing:**
- `POST /wards` — Create ward
- `PUT /wards/:id` — Update ward
- `POST /wards/:wardId/beds` — Add beds to ward
- `GET /wards/occupancy` — View ward occupancy stats

**Impact**: `WardsPage` only shows wards and can toggle bed status, but **cannot create wards, add beds, or view occupancy dashboards**.

---

### 1.9 Discharge Summary — No Detail View or Edit
**Backend has, Frontend missing:**
- `GET /discharge-summary/:id` — View discharge summary detail
- `PATCH /discharge-summary/:id` — Update/edit discharge summary
- `GET /discharge-summary/admission/:admissionId` — Get by admission

**Impact**: Discharge summaries can be created and approved, but **cannot be viewed in detail or edited** after creation.

---

### 1.10 OT — No Booking Creation or Edit
**Backend has, Frontend missing:**
- `POST /ot/bookings` — Schedule OT booking
- `PUT /ot/bookings/:id` — Update OT booking

**Impact**: `OTPage` shows bookings and can start/complete them, but **there is no way to schedule a new surgery or edit booking details** from the frontend.

---

### 1.11 Prescriptions — Missing Status & Cancel
**Backend has, Frontend missing:**
- `PATCH /prescriptions/:id/status` — Update prescription status (used by PharmacyPage but not PrescriptionsPage)
- `PATCH /prescriptions/:id/cancel` — Cancel prescription

**Impact**: Doctors **cannot cancel a prescription** they've written. No prescription lifecycle management from the doctor's side.

---

### 1.12 Reports — 4 of 5 Endpoints Unused
**Backend has, Frontend missing:**
- `GET /reports/patients` — Patient statistics report
- `GET /reports/revenue` — Revenue analytics report
- `GET /reports/opd` — OPD performance report
- `GET /reports/ipd` — IPD analytics report

**Impact**: `ReportsPage` and `AdminDashboard` only use `/reports/dashboard`. **No detailed analytics, no revenue drilldown, no OPD/IPD reports**.

---

## 2. High Gaps — Important Features Missing

### 2.1 Medication Administration — Partial
**Backend has, Frontend missing:**
- `POST /medication-admin/schedule` — Schedule medication
- `GET /medication-admin/mar/:admissionId` — Get full MAR for admission

**Frontend uses**: `GET /medication-admin/pending` and `PATCH /:id/administer`
**Gap**: Cannot schedule new medications or view the full MAR grid by admission.

---

### 2.2 Doctor Affiliations — No Dedicated Management UI
**Backend has, Frontend missing:**
- `GET /doctors/affiliations/tenant` — (used only for appointment dropdowns)
- `POST /doctors/affiliations` — Add affiliation
- `PATCH /doctors/affiliations/:id` — Update affiliation
- `GET /doctors/by-location/:locationId` — Doctors by location
- `PUT /doctors/:id` — Update doctor profile

**Gap**: No UI for managing doctor affiliations, schedules, fees, or profile edits.

---

### 2.3 Appointments — No Edit or Detail View
**Backend has, Frontend missing:**
- `GET /appointments/:id` — View appointment detail
- `PUT /appointments/:id` — Reschedule/edit appointment
- `GET /appointments/slots` — (used in SelfBookingPage but not AppointmentsPage)

**Gap**: Appointments can be created and cancelled, but **cannot be rescheduled or viewed in detail**.

---

### 2.4 Housekeeping — Task Lifecycle Incomplete
**Backend has, Frontend missing:**
- `PATCH /housekeeping/:id/assign` — Assign task to staff
- `PATCH /housekeeping/:id/start` — Start task
- `PATCH /housekeeping/:id/complete` — Complete task
- `PATCH /housekeeping/:id/verify` — Verify completed task

**Frontend uses**: Generic `PUT /:id` and action shortcuts.
**Gap**: The full assign → start → complete → verify workflow buttons may not match backend routes exactly.

---

### 2.5 Inventory — Transaction History and Low-Stock Alerts
**Backend has, Frontend missing:**
- `GET /inventory/transactions` — View stock transaction history
- `GET /inventory/low-stock` — Low-stock alerts

**Gap**: No visibility into stock movement history or automated low-stock warnings.

---

### 2.6 Lab — Missing Order Detail and Result Entry
**Backend has, Frontend missing:**
- `GET /lab/orders/:id` — View order detail
- `POST /lab/orders/:id/results` — Enter results for order
- `PATCH /lab/orders/:id/status` — (used in LabPage, but no result entry UI)

**Gap**: Lab technicians **cannot enter test results** from the frontend. They can only update order status and view/validate results that somehow got entered.

---

### 2.7 ICU — No Monitoring Record Entry
**Backend has, Frontend missing:**
- `POST /icu/monitoring` — Record ICU monitoring data
- `GET /icu/monitoring/admission/:admissionId` — View monitoring history

**Gap**: ICU page shows beds and dashboard, but **cannot record hourly monitoring observations** (ventilator settings, drip rates, vitals).

---

### 2.8 Consent — Missing Detail View and Patient Filter
**Backend has, Frontend missing:**
- `GET /consents/:id` — View consent detail
- `GET /consents/patient/:patientId` — Get consents by patient
- `DELETE /consents/:id` — Delete consent (backend has it, frontend uses revoke only)

---

### 2.9 Infection Control — No Edit
**Backend has, Frontend missing:**
- `PATCH /infection-control/:id` — Edit infection record
- `GET /infection-control/:id` — View detail

---

### 2.10 Staff Attendance — Mark, My, Summary Missing
**Backend has, Frontend missing:**
- `POST /staff-attendance/mark` — Admin mark attendance for staff
- `GET /staff-attendance/my` — Employee view own attendance
- `GET /staff-attendance/summary` — Attendance summary report

**Gap**: Staff can clock in/out, but **admins cannot mark attendance, employees cannot view their history, and no summary reports**.

---

### 2.11 Dialysis — Machine CRUD Incomplete
**Backend has, Frontend missing:**
- `POST /dialysis/machines` — Add dialysis machine
- `PATCH /dialysis/machines/:id` — Update machine details

**Gap**: Dialysis page shows machines but **cannot add new machines or edit existing ones**.

---

### 2.12 Grievance — Assignment and Feedback
**Backend has, Frontend missing:**
- `PATCH /grievances/:id/assign` — Assign grievance to staff
- `PATCH /grievances/:id/feedback` — Record feedback on resolved grievance

---

### 2.13 Insurance — Policy and Claim Edit
**Backend has, Frontend missing:**
- `GET /insurance/policies/:id` — View policy detail
- `PATCH /insurance/policies/:id` — Edit policy
- `PATCH /insurance/claims/:id` — Edit claim
- `GET /insurance/policies/patient/:patientId` — Get patient's policies

---

### 2.14 Platform Admin — Org Location Management
**Backend has, Frontend partially uses:**
- `PATCH /platform/organizations/:id/features/:moduleId/enable` — Enable feature (separate from toggle)
- `PATCH /platform/organizations/:id/features/:moduleId/disable` — Disable feature (separate from toggle)
- `PATCH /platform/organizations/:id/locations/:locId` — Update org location (partially used)

---

### 2.15 Uploads — Not Integrated into Any Page
**Backend has, Frontend missing:**
- `POST /uploads/profile-picture` — Upload profile picture
- `POST /uploads/document` — Upload document
- `POST /uploads/user/:userId/photo` — Upload user photo
- `POST /uploads/patient/:patientId/photo` — Upload patient photo

**Gap**: Upload endpoints exist but **no page uses them**. No profile picture upload, no document attachment.

---

### 2.16 Tenant Features — Self-Service Feature Toggle
**Backend has, Frontend missing:**
- `GET /tenants/me/features` — View enabled features
- `PATCH /tenants/me/features/:id` — Toggle features on/off

**Gap**: Org admins **cannot self-manage module toggles**. Feature management is only available via platform admin.

---

### 2.17 Referrals — My Referrals View
**Backend has, Frontend missing:**
- `GET /referrals/my-referrals` — View referrals assigned to current doctor

---

### 2.18 Radiology — Results and Modalities
**Backend has, Frontend missing:**
- `POST /radiology/results` — Add radiology result
- `PATCH /radiology/results/:id/validate` — Validate result
- `GET /radiology/modalities` — List available modalities (CT, MRI, X-ray, etc.)

**Gap**: Radiology orders can be created but **results cannot be entered or validated**.

---

## 3. Medium Gaps — Enhancement Opportunities

### 3.1 Search Module — Not Used
- `GET /search` endpoint exists but no frontend consumer (no command palette yet)

### 3.2 Vitals — Admission and Consultation Vitals
**Backend has, Frontend missing:**
- `GET /vitals/consultation/:consultationId` — Vitals linked to consultation
- `GET /vitals/admission/:admissionId` — Vitals during admission

### 3.3 Notifications — Full Integration
- `PATCH /notifications/:id/read` — Individual mark read (frontend uses mark-all only)

### 3.4 Queue — Stats Endpoint
- `GET /queue/stats` — Queue statistics (not shown on dashboard)

### 3.5 Triage — Lookup Endpoints
**Backend has, Frontend missing:**
- `GET /triage/by-token/:tokenId` — Get triage by queue token
- `GET /triage/by-patient/:patientId` — Get triage by patient
- `PUT /triage/:id` — Update triage record

### 3.6 Shift Handover — Detail View
- `GET /shift-handover/:id` — View handover detail

### 3.7 Visitors — Active Count
- `GET /visitors/active-count` — Show active visitor count (good for dashboard KPI)

### 3.8 Pharmacy — Stock and Alert Views
**Backend has, Frontend partially uses:**
- `GET /pharmacy/stock` — Full stock view (not a dedicated page)
- `GET /pharmacy/expiry-alerts` — Used in PharmacyReportsPage
- `GET /pharmacy/low-stock` — Used in PharmacyReportsPage
- Pharmacy export endpoint exists but no ExportButton added

### 3.9 Platform — Feature List
- `GET /platform/features` — List all available feature modules (not displayed anywhere)

### 3.10 Appointments — Slots Not Used in Staff Booking
- `GET /appointments/slots` — Available slots by doctor/date (used in patient self-booking but not in staff `AppointmentsPage`)

### 3.11 Diet — Meal CRUD and Feedback
**Backend has, Frontend missing:**
- `POST /meals` — Plan meal
- `PATCH /meals/:id/feedback` — Meal feedback
- `PATCH /diet/orders/:id` — Update diet order

### 3.12 Mortuary — Dashboard Stats
- `GET /mortuary/dashboard/stats` — Used on page, but individual `GET /:id` detail view missing

### 3.13 Export Endpoints — Created but Not All Wired
**Backend has:**
- `GET /patients/export`
- `GET /appointments/export`
- `GET /billing/invoices/export`
- `GET /lab/orders/export`
- `GET /pharmacy/drugs/export`
- `GET /queue/export`

**Frontend**: None of these have ExportButton components yet.

---

## 4. Method Mismatches — Will Fail at Runtime

| Frontend Call | File | Backend Expects | Result |
|---|---|---|---|
| `PUT /housekeeping/:id` | HousekeepingPage | No `PUT` — has `PATCH /:id/assign`, `/start`, `/complete`, `/verify` | **404** |
| `PUT /radiology/orders/:id` | RadiologyPage | No `PUT` — only `POST`, `GET`, `DELETE` on orders | **404** |
| `PUT /staff-attendance/:id` | StaffAttendancePage | No `PUT` — has `POST /mark`, `PATCH /clock-out` | **404** |
| `PUT /consents/:id` | ConsentPage | No `PUT` — has `PATCH /:id/revoke` and `DELETE /:id` | **404** |
| `PUT /referrals/:id` | ReferralPage | No `PUT` — has `PATCH` actions only | **404** |
| `PUT /visitors/:id` | VisitorsPage | No `PUT` — has `PATCH /:id/checkout` | **404** |

---

## 5. Frontend Pages with Zero or Minimal Backend Integration

| Page | API Calls | Issue |
|------|-----------|-------|
| `PlatformFeaturesPage.tsx` | 0 | Entirely static content, no API |
| `PlatformOrganizationsPage.tsx` | 0 | Static display (PlatformDashboard handles org list) |
| `DoctorOrgSelectorPage.tsx` | 0 | No data fetch for org list |
| `PatientAppointmentsPage.tsx` | 1 (POST only) | Can book but cannot list patient's appointments |
| `QueueDashboard.tsx` | 2 | Missing stats, export, no real-time |

---

## 6. Prioritized Action Plan

### Phase A — Fix Runtime Failures (Immediate)
- [ ] Fix 6 HTTP method mismatches (PUT → PATCH/proper routes)
- [ ] Wire up `GET /triage` list endpoint properly

### Phase B — Critical Feature Gaps (Week 1)
- [ ] Build User Approval UI (pending, approve, reject, deactivate)
- [ ] Build Patient Edit form (`PUT /patients/:id`)
- [ ] Build Patient History page (`GET /patients/:id/history`)
- [ ] Build Consultation List + Detail + Edit pages
- [ ] Build Admission Create + Transfer Bed UI
- [ ] Build OT Booking creation form
- [ ] Build Invoice Line Items UI
- [ ] Add password change UI (`PUT /auth/me/password`)
- [ ] Wire MFA verification into login flow

### Phase C — High Feature Gaps (Week 2-3)
- [ ] Build Blood Bank full workflow (donation, transfusion, crossmatch)
- [ ] Build Ward + Bed CRUD
- [ ] Build Lab Result Entry UI
- [ ] Build ICU Monitoring Entry
- [ ] Build Reports pages (patients, revenue, OPD, IPD)
- [ ] Build Doctor Affiliation Management
- [ ] Build Appointment Edit/Reschedule
- [ ] Wire upload endpoints into Patient and User pages
- [ ] Build Staff Attendance admin views (mark, summary)
- [ ] Build Radiology Results entry + validation

### Phase D — Medium Gaps (Week 4)
- [ ] Add ExportButton to 6+ pages with existing export endpoints
- [ ] Build Command Palette using `/search` endpoint
- [ ] Add queue stats to QueueDashboard
- [ ] Add tenant self-service feature toggles
- [ ] Add visitor active count to dashboard
- [ ] Wire individual notification mark-read
- [ ] Add triage lookup by token/patient
- [ ] Add discharge summary detail + edit views

---

## 7. Coverage Heatmap by Module

| Module | Backend Endpoints | Frontend Calls | Coverage | Priority |
|--------|:-:|:-:|:-:|:-:|
| Auth | 20 | 10 | 50% | Critical |
| Users | 12 | 5 | 42% | Critical |
| Patients | 8 | 2 | 25% | Critical |
| Consultations | 5 | 1 | 20% | Critical |
| Admissions | 6 | 2 | 33% | Critical |
| Billing | 8 | 5 | 63% | Critical |
| Blood Bank | 9 | 3 | 33% | Critical |
| OT | 7 | 5 | 71% | High |
| Wards | 7 | 2 | 29% | Critical |
| Reports | 5 | 1 | 20% | Critical |
| Lab | 10 | 6 | 60% | High |
| Pharmacy | 10 | 8 | 80% | Low |
| Appointments | 7 | 5 | 71% | High |
| Prescriptions | 7 | 4 | 57% | High |
| Queue | 8 | 3 | 38% | Medium |
| Ambulance | 9 | 7 | 78% | Low |
| Discharge Summary | 6 | 3 | 50% | High |
| ICU | 6 | 4 | 67% | High |
| Dialysis | 9 | 6 | 67% | Medium |
| Insurance | 10 | 6 | 60% | Medium |
| Infection Control | 7 | 4 | 57% | Medium |
| Grievance | 8 | 4 | 50% | Medium |
| Housekeeping | 8 | 4 | 50% | Medium |
| Mortuary | 7 | 5 | 71% | Low |
| Radiology | 7 | 3 | 43% | High |
| Referral | 8 | 6 | 75% | Low |
| Telemedicine | 7 | 5 | 71% | Low |
| Consent | 6 | 4 | 67% | Medium |
| Diet | 10 | 5 | 50% | Medium |
| Physiotherapy | 7 | 3 | 43% | Medium |
| Staff Attendance | 7 | 4 | 57% | Medium |
| Shift Handover | 6 | 4 | 67% | Low |
| Visitors | 6 | 4 | 67% | Low |
| Asset Management | 7 | 3 | 43% | Medium |
| Audit | 2 | 1 | 50% | Low |
| Inventory | 8 | 4 | 50% | Medium |
| Notifications | 4 | 4 | 100% | Done |
| Roles | 7 | 6 | 86% | Low |
| Departments | 4 | 4 | 100% | Done |
| Locations | 7 | 4 | 57% | Low |
| Features | 4 | 2 | 50% | Medium |
| Tenants | 5 | 2 | 40% | Medium |
| Platform | 22 | 16 | 73% | Low |
| Doctor Registry | 8 | 5 | 63% | Medium |
| Medication Admin | 4 | 2 | 50% | High |
| Uploads | 4 | 0 | 0% | High |
| Search | 1 | 0 | 0% | Medium |
| Vitals | 4 | 2 | 50% | Medium |
| Triage | 5 | 2 | 40% | Medium |

---

*This report provides a complete gap analysis between the backend API and frontend UI of Ayphen HMS as of 2026-03-27. Prioritize Phase A (runtime fixes) and Phase B (critical gaps) for immediate action.*
