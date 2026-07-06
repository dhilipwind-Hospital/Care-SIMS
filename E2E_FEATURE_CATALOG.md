# Ayphen HMS — E2E Feature & Functionality Catalog (Coverage-Annotated)

This catalog inventories every E2E-testable feature of the Ayphen HMS, grouped by clinical domain, and annotates each with its current automated browser/API test coverage. Derived from the per-domain feature maps and the coverage inventory (Playwright specs: `journey.spec.ts`, `wave5/wave8`, `verify-*`, `sweep-*`, `render-check`; plus the API-layer harness `regression-creates.mjs`).

**Coverage legend**
- ✅ **COVERED_UI** — a real-browser Playwright test drives this flow (often API-authoritative on assertions).
- 🟡 **API_ONLY** — verified at the HTTP layer only; the page usually renders in a load-sweep but no test drives its form.
- ⬜ **NOT_COVERED** — no E2E yet.

---

## Coverage at a glance

**Headline: the 12-act patient journey (`journey.spec.ts`) is fully automated end-to-end in a real browser:**

| Act | Flow |
|----|------|
| 1 | Reception registers a new patient (validated, MRN generated) |
| 2 | Reception books an appointment (patient typeahead → doctor → date/time) |
| 3 | Triage nurse records chief complaint + vitals (BP/HR/Temp/SpO2) + acuity |
| 4 | Doctor SOAP consultation → Complete (structured ICD **J06.9** persisted) + inline lab order |
| 5 | Doctor writes prescription (Calpol 500, BD) → auto-sent to pharmacy |
| 6 | Pharmacist dispenses from the queue |
| 7 | Lab: Mark Collected → Start Processing → Enter Results → Validate |
| 8 | Ward nurse admits patient (ward/bed/doctor) |
| 9 | OT: add room → schedule → Start → Complete surgery |
| 10 | Billing: create invoice → collect full payment (PAID) |
| 11 | Patient portal: dedicated login → select-hospital → portal loads |
| 12 | Discharge: Create Draft → Approve → admission flips DISCHARGED (API-verified) |

**Additional COVERED_UI flows (beyond the journey):** Radiology order create, Blood Bank donor register, Lab QC run, Pharmacy receive-stock-batch, Referral create, Birth/Death/MLC/Consent/Certificate register, Clinical pathway assign, plus standalone regression specs (`verify-fixes`, `verify-wave8-fixes`) and render sweeps across ~73 admin routes, 8 patient-portal screens, 6 platform-console screens, and doctor availability.

**Approximate coverage distribution:**
- ✅ COVERED_UI: ~30 feature flows (the full clinical spine + several diagnostic/records create paths)
- 🟡 API_ONLY: ~20 create endpoints verified at HTTP layer (insurance, ICU beds, diet, physiotherapy, palliative, MAR schedule, transfusion, consultations-list, antimicrobial, wound-care, clinical protocol, etc.)
- ⬜ NOT_COVERED: the large majority of secondary actions — edits, status transitions, cancels, prints, CSV exports, most supply-chain modules, most nursing-support modules, patient-portal write actions, and all AI-assist endpoints.

---

## Front Office & Patient Access

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Patients — Register** (`/app/patients`) | Register form (personal/address/visit/medical/emergency/insurance), Save/Reset, POST `/patients` | Reception fills first/last/phone/DOB, submits, sees success toast + new MRN | ✅ (journey Act 1; API `regression-creates`) |
| **Patients — List/Search/CSV** (`/app/patients`) | Debounced search, paginate, Export CSV | List renders + drives journey typeaheads; export only render-swept | ✅ (render/search); export ⬜ |
| **Patients — View detail** | Eye drawer (demographics/emergency) | Drawer opens; render-only | ⬜ |
| **Patients — Edit + photo** | Pencil edit, upload photo, PUT `/patients/:id` | Edit name/allergies, upload JPEG/PNG | ⬜ |
| **Patients — Medical history panel** | History drawer, tabs (Consults/Rx/Lab/Vitals chart/Admissions/Invoices) | Aggregated history via `/patients/:id/history` | ⬜ |
| **Patients — AI history summary** | View cached / refresh Gemini summary | Backend-only; not surfaced | ⬜ |
| **Appointments — Book** (`/app/appointments`) | Typeahead, doctor/dept filter, date/time/type, POST `/appointments` | Reception books appt, sees "Appointment created" | ✅ (journey Act 2; deep-link `?book=1`; API) |
| **Appointments — Reschedule/Edit** | Change doctor/date/slot/status, PUT `/appointments/:id` | Reschedule a non-completed appt | ⬜ |
| **Appointments — Cancel** | PATCH `/appointments/:id/cancel` | Cancel a SCHEDULED appt | ⬜ |
| **Appointments — Print slip** | Client-side print | Printable appt slip | ⬜ |
| **Appointments — Availability grid** | Doctor+date slot grid, GET `/appointments/slots` | Color-coded available/booked grid | ⬜ |
| **Appointments — Filters/KPIs/CSV** | Date filter, status chips, KPIs, Export CSV | Filter + export list | ⬜ |
| **Self-Booking wizard** (`/app/appointments/self-booking`) | 3-step: doctor → date/slot → patient/type/reason, POST `/appointments` | "Booking Confirmed!" screen | ⬜ |
| **Queue — Issue token** (`/app/queue`) | Patient/doctor/priority, POST `/queue/token` | Reception issues token | ⬜ |
| **Queue — Call/Complete** | Call→CALLED, Complete→COMPLETED, filters, WS `queue:updated`, CSV | Call then complete a waiting token | ⬜ (render-only) |
| **Telemedicine — Schedule** (`/app/telemedicine`) | Patient/doctor search, platform, datetime, POST `/telemedicine/sessions` | Doctor schedules teleconsult | ⬜ |
| **Telemedicine — Lifecycle** | Start/End/Cancel/Join/Delete | Session state transitions | ⬜ |
| **Referrals — Create/Edit** (`/app/referral`) | Patient + dept + doctor + urgency, POST `/referrals` | Create referral; `referredToDeptId` API-verified | ✅ (`verify-wave8-fixes`; API) |
| **Referrals — Workflow** | Accept/Decline/Complete/Delete, All↔My toggle, print | Destination team accepts/completes | ⬜ |
| **Feedback — Record** (`/app/feedback`) | Patient, star rating, NPS slider, POST `/feedback` | Reception records CSAT/NPS | ⬜ |
| **Feedback — Analytics/Review** | KPIs, distribution bars, mark Reviewed | View NPS + review entry | ⬜ |
| **Grievance — Register** (`/app/grievance`) | Complainant/category/severity/subject, POST `/grievances` | File a grievance ticket | ⬜ |
| **Grievance — Workflow** | Assign/Resolve/Escalate/Feedback/Delete/Print | Assign → resolve/escalate | ⬜ |
| **Health Packages — Manage** (`/app/health-packages`) | New/Edit package, tests, demographics, POST `/health-packages` | Admin creates package | ⬜ |
| **Health Packages — Book/Status** | Book patient, advance status (BOOKED→…→COMPLETED) | Book + advance per-row dropdown | ⬜ |
| **Global Search** (header) | GET `/search?q` cross-entity | Any user types global search | ⬜ |
| **Patient Portal — Register** (`/patient/register`) | Name/email/DOB/password, POST `/auth/patient/register` | Self-registration → "Account Created!" | ⬜ |
| **Patient Portal — Login/Hospital select** (`/patient/login`) | Sign in, select-org token | Login → select-hospital → portal | ✅ (journey Act 11) |
| **Patient Portal — Dashboard** (`/app/patient/portal`) | Stats, quick tiles, upcoming appts | Welcome banner + counts render | ✅ (journey Act 11 + `sweep-others`) |
| **Patient Portal — Records/Vitals/Timeline** | `/auth/patient/me/*`, filters, refresh | Expandable cards render | ✅ render; filters/refresh ⬜ |
| **Patient Portal — Book appt** (`/app/patient/appointments`) | Dept filter, doctor, slot, POST `/auth/patient/me/appointments` | Multi-step self-book render-verified; submit ⬜ | ✅ render; submit ⬜ |
| **Patient Portal — Cancel/Reschedule** | PATCH cancel/reschedule (ownership-enforced) | Cancel or reschedule own appt | ⬜ |
| **Patient Portal — Rx/Lab view+print** | List, expand, client print | Screens render | ✅ render; print ⬜ |
| **Patient Portal — Billing** (`/app/patient/billing`) | Filter, expand, Pay (demo ONLINE), print | Screen renders; pay flow ⬜ | ✅ render; pay ⬜ |

---

## Doctor & Clinical

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Doctor Patient Queue** (`/app/doctor/queue`) | Call Next, Consult→IN_CONSULTATION→navigate, No-Show, Done, filters | Doctor clicks Consult → lands on consultation screen | ✅ (journey Act 4 entry; queue buttons render-only) |
| **Doctor Consultation — SOAP** (`/app/doctor/consultation`) | Fill S/O/A/P + ICD, Complete `/consultations/:id/complete`, auto-stub | Complete consult → DRAFT→COMPLETED + structured ICD persists | ✅ (journey Act 4 + `verify-fixes`; API) |
| **Consultation — Inline lab order** | New Lab Order, tests, Place Order | Order CBC from Orders tab | ✅ (journey Act 4 best-effort; API) |
| **Consultation — AI summary** | Load/Refresh Gemini card | Not driven | ⬜ |
| **Consultation — Quick actions** | Write Rx / Admit / Follow-up navigations | Hand-off into Rx/Admit/Follow-up flows | ✅ (destinations covered Acts 2/5/8; buttons not asserted) |
| **Consultations List** (`/app/doctor/consultations`) | Filter, search, expand detail, Complete, paginate | Browse + complete a draft | 🟡 (create/complete via API; list buttons render-only) |
| **Prescriptions** (`/app/doctor/prescriptions`) | New Rx, drug search, dosage/freq, Save + auto send-pharmacy, print | Write Rx → sent to pharmacy → billed | ✅ (journey Act 5; API) |
| **My Availability** (`/app/doctor/availability`) | Weekly hours, consult fee, leaves | Save schedule/fee/leave | ✅ render only; form submits ⬜ |
| **Clinical Pathways — Protocols** (`/app/clinical-pathways`) | New Protocol, view, print | Create care protocol | 🟡 (protocol create is prereq POST; modal not asserted) |
| **Clinical Pathways — Assign** | Assign Pathway (patient+protocol+notes) | Assign pathway → API-verified | ✅ (`verify-pathways`) |
| **Antimicrobial Stewardship** (`/app/antimicrobial`) | New Record (drug/route/dose/duration), dashboard, print | Record antibiotic usage | 🟡 render-only |
| **Wound Care** (`/app/wound-care`) | New Assessment (type/stage/measurements/pain), print | Nurse records wound assessment | 🟡 render-only (View button unwired) |
| **Flow Charts** (`/app/flowcharts`) | Tab nav, zoom/pan | Browse static process diagrams | ✅ (render-only) |

---

## Nursing & Inpatient

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Wards & Beds — Add/Edit Ward** (`/app/nurse/wards`) | Ward modal (name/type/floor/beds), POST/PUT `/wards` | Create ward with occupancy bar | ⬜ (wards seeded via API) |
| **Wards — Add Bed** | Bed modal, POST `/wards/:id/beds` | Add bed → AVAILABLE in bed map | 🟡 (free bed seeded via API before Act 8) |
| **Wards — Bed status transitions** | Reserve/Maint/Release/Mark Available/Clean, PATCH beds/:id/status | Recolour bed tile + update KPIs | ⬜ |
| **Wards — Occupancy KPIs/map** | `/wards/occupancy` + `/wards` | KPI cards + bed map render | ✅ (render-only) |
| **Admissions — Admit** (`/app/nurse/admissions`) | Patient typeahead, ward/bed/doctor, POST `/admissions` | Admit patient → new inpatient row | ✅ (journey Act 8; API) |
| **Admissions — Transfer Bed** | New ward/bed, PATCH transfer-bed | Transfer active admission | ⬜ |
| **Admissions — Prepare Discharge** | Deep-link → discharge-summary | Prepare → approve flips DISCHARGED | ✅ (end-state Act 12) |
| **Admissions — View/Print** | Detail drawer, print admission form | View/print admission | ✅ render; modal/print ⬜ |
| **Triage — Record** (`/app/nurse/triage`) | Chief complaint + vitals + priority, POST `/triage` | Save Vitals with acuity | ✅ (journey Act 3; API) |
| **Triage — Assign doctor** | Search + attach assignedDoctorId | Assign-doctor modal | ⬜ |
| **Triage — Order labs** | Lab modal (requires doctor), POST `/lab/orders` | Order labs from triage | 🟡 (endpoint API-covered) |
| **Triage — AI suggest** | POST `/triage/ai-suggest`, Apply Priority | AI card + apply | ⬜ |
| **Vitals Recording** (`/app/nurse/vitals`) | Pick from queue, BP/HR/Temp/SpO2, POST `/vitals` | Save Vitals → toast | ✅ (via Act 3; standalone ⬜) |
| **MAR — Administer (5-Rights)** (`/app/nurse/mar`) | Give → tick 5 rights → PATCH administer | Administer scheduled dose | ⬜ |
| **MAR — Withhold** | Reason modal, PATCH withhold | Withhold with reason | ⬜ |
| **MAR — Schedule** | Schedule form, POST `/medication-admin/schedule` | Create MAR entry | 🟡 (API-covered w/ ACTIVE admission) |
| **Discharge Summary — Create Draft** (`/app/discharge-summary`) | Pick admission, auto-fill, POST `/discharge-summary` | Create DRAFT summary | ✅ (journey Act 12 + `verify-fixes`) |
| **Discharge — Approve** | PATCH approve (releases bed, emails, DISCHARGED) | Approve → admission DISCHARGED | ✅ (Act 12; API-authoritative) |
| **Discharge — AI draft / Edit / Print** | POST draft-with-ai; PATCH edit; print PDF | Gemini fill / edit / print | ⬜ (AI/print) |
| **Diet — Create order** (`/app/diet`) | Patient + active admission, diet type/targets, POST `/diet/orders` | Create diet order | 🟡 (API-covered) |
| **Diet — Plan/Serve/Feedback meal** | POST meals, PATCH serve/feedback | Plan → serve → record consumption | ⬜ |
| **Shift Handover — Create/Submit/Ack** (`/app/shift-handover`) | Draft (alerts/tasks/notes) → Submit → Acknowledge | Draft→Submitted→Acknowledged | ⬜ |
| **Duty Roster — Add shift / Swap / Leave** (`/app/duty-roster`) | POST shift; swap/approve; leave apply/approve | Add shift + leave workflow | ⬜ |

---

## Diagnostics (Lab / Radiology / Blood Bank)

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Laboratory — Sample→Result workflow** (`/app/lab`) | Mark Collected → Start Processing → Enter Results → Mark Resulted → Validate | Full ORDERED→RESULTED→VALIDATED chain | ✅ (journey Act 7; order seeded via API) |
| **Laboratory — Order detail view / Print / CSV** | View modal, print report, Export CSV | Read + export | ⬜ |
| **Lab Results — Enter/Validate** (`/app/lab/results`) | Multi-row results POST; PATCH validate | Add rows → validate | ✅ (shared endpoint, Act 7) |
| **Lab QC — Record QC run** (`/app/lab/qc`) | Lot/test/expected/obtained, POST `/lab/qc/runs`, auto PASS/WARN/FAIL | Record QC run → API-verified | ✅ (`wave5` LabQC; API) |
| **Lab QC — Calibration** | Add Calibration, POST `/lab/qc/calibrations` | CURRENT/DUE/OVERDUE rows | ⬜ |
| **Radiology — Create/Edit order** (`/app/radiology`) | Patient search, modality/body part/priority, POST `/radiology/orders` | Create ORDERED imaging order | ✅ (`wave5`; API); edit/filter ⬜ |
| **Radiology — Report result + Validate** | Add Result, POST `/radiology/results`; PATCH validate | Report → REPORTED → validated | ⬜ |
| **Radiology — Attach/View/Print** | Upload report, detail modal, print | Attach PDF + view/print | ⬜ |
| **Blood Bank — Register donor** (`/app/blood-bank`) | Name/DOB/phone/group, POST `/blood-bank/donors` | Add donor → API-verified | ✅ (`wave5`; API) |
| **Blood Bank — Donation / Inventory** | Record Donation POST; group/status filters | Add bag + browse | ⬜ |
| **Blood Bank — Order transfusion** | Patient/bag/component, POST `/blood-bank/transfusions` | Create ORDERED transfusion | 🟡 (endpoint API-covered) |
| **Blood Bank — Crossmatch/Administer/Print** | PATCH crossmatch/administer, print certificate | ORDERED→CROSS_MATCHED→administered | ⬜ |

---

## Pharmacy & Supply Chain

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Pharmacy — Dispense queue** (`/app/pharmacy`) | Select Rx, filter, notes, POST `/pharmacy/prescriptions/:id/dispense` | Dispense from queue → "Dispensed" | ✅ (journey Act 6) |
| **Pharmacy — Hold/Reject** | PATCH status ON_HOLD/REJECTED | Hold or reject selected Rx | ⬜ |
| **Pharmacy — Manual dispense** | POST `/pharmacy/manual-dispense` | ⚠ endpoint absent in controller → likely 404 | ⬜ |
| **Pharmacy — Barcode scan / Inventory tab / CSV** | Scan match, drawer, Export CSV | Browse batches + export | ⬜ |
| **Pharmacy Inventory — Add/Edit drug** (`/app/pharmacy/inventory`) | POST/PUT `/pharmacy/drugs`, search, category filter | Add drug to formulary | ⬜ |
| **Purchase Orders — Receive batch** (`/app/pharmacy/purchase-orders`) | Drug picker, batch/expiry/qty/cost, POST `/pharmacy/batches` | Receive stock batch → qty API-verified | ✅ (`wave5` + `verify-pharmacy`; API) |
| **Pharmacy Returns — Create/Review** (`/app/pharmacy/returns`) | POST `/pharmacy/returns`; Approve (credit)/Reject | File → approve/reject return | ⬜ |
| **Pharmacy Reports** (`/app/pharmacy/reports`) | Date range, GET `/reports/pharmacy`, low-stock/expiry, CSV | Run dispensing report + export | ⬜ |
| **Inventory (General)** (`/app/inventory`) | Add item POST; Stock In/Out; 6 browse tabs | Add item / receipt / issue | ⬜ |
| **Central Store** (`/app/central-store`) | Add/edit item; RECEIPT/ISSUE/RETURN/DAMAGE/ADJUST txns | Record stock movement | ⬜ |
| **Purchase Indent** (`/app/purchase-indents`) | Create → Submit → Approve/Reject → Receive goods (→ Central Store) | Full procurement chain | ⬜ |
| **Vendors** (`/app/vendors`) | Add/edit, activate/deactivate, contracts | Manage vendor + contract | ⬜ |
| **CSSD** (`/app/cssd`) | Create batch; Start/Complete (BI/CI); sets issue/return | Sterilization cycle | ⬜ (⚠ set issue/return path mismatch → 404) |
| **Linen** (`/app/linen`) | Add type; ISSUE/COLLECT/LAUNDRY/DAMAGE txns | Record linen movement | ⬜ |

---

## Surgery & Critical Care

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **OT — Schedule surgery** (`/app/ot`) | Patient/room/procedure/surgeon/date/time/type, POST `/ot/bookings` | Schedule → booking appears | ✅ (journey Act 9; API) |
| **OT — Add room** | Room name/type/class, POST `/ot/rooms` | Add theatre if none | ✅ (journey Act 9; API) |
| **OT — Start/Complete surgery** | PATCH start/complete (blood units, complications, notes); OT Live tiles | Start → Complete with notes | ✅ (journey Act 9) |
| **OT — Pre-op / Intra-op anaesthesia** | ASA/airway/Mallampati; induction/drug timeline/fluid balance | Anaesthetist records assessment | ⬜ |
| **ICU** (`/app/icu`) | Create ICU bed, POST `/icu/beds` | Create ICU bed | 🟡 (API-only) |
| **Physiotherapy** (`/app/physiotherapy`) | Order + session, POST `/physiotherapy/orders` & `/sessions` | Create order + session | 🟡 (API-only) |
| **Palliative Care** (`/app/palliative-care`) | Record, POST `/palliative-care` | Create palliative record | 🟡 (API-only) |
| **Dialysis / NICU / Home-care / Emergency / Ambulance** | Domain create/status flows | Various | ⬜ (render-only) |

---

## Billing, Insurance & HR

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Billing — Create invoice + collect payment** (`/app/billing`) | New Invoice, line items, Finalize, Collect Payment (Full), print | Invoice → payment → PAID | ✅ (journey Act 10; API) |
| **Billing — Cancel / Add item / Payment history** | PATCH cancel; add item to DRAFT; view payments | Manage an invoice | ⬜ |
| **Insurance — Policy + Claim** (`/app/insurance`) | POST `/insurance/policies` and `/insurance/claims` | Create policy → file claim | 🟡 (API-only) |
| **Insurance — Claim workflow** | Submit/Approve/Reject/Settle | Claim lifecycle | ⬜ |
| **Payroll** (`/app/payroll`) | Salary structure, run payroll, payslips | Generate payslip | ⬜ |
| **Staff Attendance** (`/app/staff-attendance`) | Clock-in/out, POST `/staff-attendance/clock-in` | Clock in a shift | 🟡 (API-only) |

---

## Records, Compliance & Quality

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Birth & Death Registry** (`/app/birth-death`) | Register Birth / Register Death, POST `/vital-records/*` | Register birth (blank numerics ok) | ✅ (`wave8`/`verify-wave8-fixes`) |
| **Certificates** (`/app/certificates`) | Issue certificate (FITNESS/etc.), POST `/certificates` | Issue certificate | ✅ (`wave8`; API) |
| **Consent** (`/app/consent`) | Record consent (procedure/doctor), POST `/consents` | Record consent | ✅ (`verify-wave8-fixes`) |
| **MLC Register** (`/app/mlc`) | Register MLC case (with/without patient), POST `/mlc` | Register medico-legal case | ✅ (`verify-wave8-fixes`) |
| **MRD / Mortuary / Audit / Quality / Infection Control / Home-care** | Domain create/status flows; audit log browse | Various | ⬜ (render-only) |

---

## Admin, Platform & Facilities

| Module (route) | Key testable actions | Realistic E2E flow | Coverage |
|---|---|---|---|
| **Admin Dashboard** (`/app/admin`) | KPI cards, location filter, drilldowns | View ops/clinical/revenue KPIs | ✅ (render-only, `sweep-admin`) |
| **Users / Roles / Departments / Locations** (`/app/admin/*`) | Create/edit user, assign role, add dept/location | Onboard a staff member | ⬜ |
| **Reports** (`/app/admin/reports`, `/app/reports`) | 8 report tabs, date range, CSV + print | Run + export a report | ⬜ |
| **Audit Log** (`/app/admin/audit`) | Filter by user/action/entity | Browse audit trail | ✅ render; filter ⬜ |
| **Platform Console** (`/app/platform/*`) | Tenants, plans, feature flags | Platform-admin ops | ✅ (render-only, 6 screens) |
| **Asset Mgmt / Work Orders / Housekeeping / Waste / Visitors** | Create + status flows | Facilities ops | ⬜ (visitors create 🟡 API-only) |
| **Notifications** (`/app/notifications`) | List, mark read | Read notifications | ✅ (render-only) |

---

## What we can do now — highest-value NOT_COVERED flows to automate next

**Tier 1 — high clinical value, quick wins** (page renders; endpoints stable; just drive the form):
1. **Appointment Cancel + Reschedule** — completes the lifecycle half-covered by Act 2. *Quick win.*
2. **Queue Call/Complete transitions** — token lifecycle + WebSocket signal. *Quick win.*
3. **Ward bed status transitions + Add Ward/Bed modals** — currently all API-seeded. *Quick win.*
4. **MAR Administer (5-Rights) + Withhold** — high patient-safety value. *Moderate* (needs admission + schedule).
5. **Radiology Report Result + Validate** — order create already ✅; completes the diagnostic loop. *Quick win.*

**Tier 2 — completes supply-chain & revenue paths:**
6. **Purchase Indent full workflow** (create → submit → approve → receive-goods). *Involved.*
7. **Pharmacy Returns create + review** and **Blood Bank transfusion crossmatch→administer**. *Moderate.*
8. **Patient Portal write actions** (self-book submit, cancel/reschedule, pay invoice). *Moderate.*

**Tier 3 — regression traps (likely real 404 bugs, worth a targeted test):**
9. **Pharmacy Manual Dispense** — POST `/pharmacy/manual-dispense` has no matching controller route.
10. **CSSD Set Issue/Return** — frontend calls `/cssd/batches/:id/issue|return` but backend exposes `/cssd/items/:id/...` → endpoint mismatch.

**Deferred:** AI-assist endpoints (non-deterministic → better as contract/mock tests); pure client-side Print windows and CSV exports (low-risk render-only).
