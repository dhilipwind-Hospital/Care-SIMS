# Ayphen HMS — Full Module UI Test Plan

**Goal:** browser-verify every remaining module's primary flow on the **live deployed app**
(`https://care-sims.vercel.app`) so a "works in the UI" claim is backed by evidence — not asserted.

**Status of what's already done (NOT re-tested here):** the 12-act core patient journey
(register → appointment → triage → consultation → prescription → dispense → lab → admit → OT →
billing → patient portal → discharge) is browser-verified and green, plus 3 shipped fixes
(consultation complete + ICD, OT duplicate-room 400, discharge clarity). This plan covers the
**~35 remaining modules** + **2 known caveats**.

**Out of scope:** all AI features (per standing direction).

---

## 1. Methodology (the proven harness)

Identical to what already worked for the core journey:

1. **Drive the real browser** — Playwright + headless Chromium against the deployed app.
2. **Persona login** — staff at `/login`, all passwords `Demo@1234`; admin (`admin@<slug>.local`)
   is the all-access fallback since `ADMIN` can reach nearly every route.
3. **Per-module test = 4 checks:**
   - **Loads** — route renders, no `ErrorBoundary`, no 403/`FeatureFlagGuard` block, not blank.
   - **Reads** — existing/seeded data lists without console errors.
   - **Creates** — exercise the module's PRIMARY create/action flow through the UI.
   - **Persists** — independently confirm the record via the live API / DB (defense in depth).
4. **Evidence** — full-page screenshot on every outcome; append to `results.json`
   (`{module, route, persona, loads, creates, verified, detail, screenshot}`).
5. **Resilience** — per-test try/catch, continue-on-failure, ≤3 retries/module then mark BLOCKED,
   capture any red error toast verbatim (those are findings).
6. **No fabrication** — a step is PASS only when the UI showed success AND the API/DB confirms it.

**Exit criteria per module:** Loads ✅ + Creates ✅ + Persists ✅ = PASS. Anything else = FAIL/BLOCKED
with the concrete reason + screenshot.

---

## 2. Environment & data prerequisites

- **Org:** reuse the provisioned `e2e*` org (all 66 features enabled) or provision a fresh one.
- **Logins:** `admin / reception / nurse / wardnurse / chargenurse / pharmacy / lab / billing
  @<slug>.local` + `doctor.demo@<slug>.local` + `patient1@<slug>.local`, all `Demo@1234`.
- **Seed prerequisites** (some modules need an upstream record first — created via API in setup):
  - Purchase Indent / Central Store / Vendors → at least 1 **vendor** + 1 **inventory item**.
  - Blood Bank issue → 1 **donor** + 1 **blood unit** in stock.
  - Payroll run → staff with **salary structure**.
  - Ambulance dispatch → 1 **ambulance** vehicle.
  - CSSD cycle → 1 **instrument set**.
  - Telemedicine / Referral → an existing **patient** + **doctor** (already seeded).

---

## 3. Test waves (grouped by domain & dependency)

> Route + role taken from `frontend/src/App.tsx`. "Primary flow" = the one create/action that proves
> the module works; exact form fields are mapped at execution time via the recipe-extraction step
> (same as the journey screens), so this plan stays honest about what's verified vs assumed.

### Wave A — Clinical services
| Module | Route | Persona | Primary flow to test | Verify |
|---|---|---|---|---|
| Radiology | `/app/radiology` | Doctor/Lab/Admin | Create imaging order → enter/verify report | order row + report status via API |
| Blood Bank | `/app/blood-bank` | Nurse/Doctor/Admin | Register donor → add unit → issue/crossmatch | unit status changes |
| ICU | `/app/icu` | Nurse/Doctor/Admin | Open ICU chart → record an observation/score | observation persisted |
| NICU | `/app/nicu` | Doctor/Nurse/Admin | Create neonate record → add a vitals/feed entry | neonate + entry persisted |
| Dialysis | `/app/dialysis` | Nurse/Doctor/Admin | Schedule a dialysis session → record it | session status |
| Physiotherapy | `/app/physiotherapy` | Nurse/Doctor/Admin | Create PT plan/session → log a session | session persisted |
| Emergency | `/app/emergency` | Doctor/Nurse/Reception/Admin | ED registration / triage entry | ED case created |
| Telemedicine | `/app/telemedicine` | Doctor/Admin | Schedule tele-consult (patient+doctor+room URL) | appt with roomUrl |

### Wave B — Records & medico-legal
| Module | Route | Persona | Primary flow | Verify |
|---|---|---|---|---|
| Insurance | `/app/insurance` | Billing/Reception/Admin | Create TPA/claim against an invoice | claim record |
| Referral | `/app/referral` | Doctor/Admin | Create outbound referral for a patient | referral row |
| MRD | `/app/mrd` | Admin | Raise a record-request / file-movement entry | request status |
| MLC | `/app/mlc` | Doctor/Nurse/Reception/Admin | Add an MLC register entry | mlcNumber generated |
| Birth/Death | `/app/birth-death` | Doctor/Nurse/Admin | Create a birth record AND a death record | both persisted |
| Certificates | `/app/certificates` | Doctor/Admin | Issue a certificate (e.g. fitness/medical) | certificate row |
| Consent | `/app/consent` | Doctor/Nurse/Admin | Capture a consent form for a patient | consent persisted |

### Wave C — Supply chain & facilities
| Module | Route | Persona | Primary flow | Verify |
|---|---|---|---|---|
| Inventory | `/app/inventory` | Pharmacy/Nurse/Admin | Create an item → stock issue/adjust | stock movement |
| Assets | `/app/asset-management` | Admin | Add an asset (+ AMC/warranty) | asset row |
| Purchase Indents | `/app/purchase-indents` | Admin/Nurse/Pharmacy/Lab | Raise an indent → submit for approval | indent status |
| Central Store | `/app/central-store` | Admin/Nurse/Pharmacy | Issue stock to a department | issue record |
| Vendors | `/app/vendors` | Admin/Pharmacy | Add a vendor | vendor row |
| CSSD | `/app/cssd` | Nurse/OT/Admin | Start a sterilization cycle → complete | cycle status |
| Linen | `/app/linen` | Admin/Nurse | Linen issue → return | transaction |
| Waste | `/app/waste-management` | Admin/Nurse | Record a waste collection → manifest pipeline | manifest status |
| Housekeeping | `/app/housekeeping` | Nurse/Admin | Create a housekeeping task → mark done | task status |

### Wave D — Workforce & operations
| Module | Route | Persona | Primary flow | Verify |
|---|---|---|---|---|
| Payroll | `/app/payroll` | Admin | Generate a payroll run / payslip | run record |
| Duty Roster | `/app/duty-roster` | Admin/most roles | Create a roster shift assignment | shift row |
| Staff Attendance | `/app/staff-attendance` | All staff | Mark check-in / attendance | attendance record |
| Visitors | `/app/visitors` | Reception/Nurse/Admin | Issue a visitor pass → check-out | pass status |
| Ambulance | `/app/ambulance` | Reception/Nurse/Admin | Create a dispatch → status transition | trip status |
| Quality | `/app/quality` | Admin | Log an incident / quality entry | record persisted |
| Audit | `/app/admin/audit` | Admin | Read-only: audit log lists + filters | rows render |
| Reports | `/app/admin/reports` | Admin/Lab/Billing | Open each report tab → export CSV/print | data + export |

### Wave E — Admin & platform console
| Module | Route | Persona | Primary flow | Verify |
|---|---|---|---|---|
| Users & Staff | `/app/admin/users` | Admin | Create a staff user (role + location) | user can log in |
| Roles & Permissions | `/app/admin/roles` | Admin | Create/edit a role's permissions | role persisted |
| Departments | `/app/admin/departments` | Admin | Create a department | dept row |
| Locations | `/app/admin/locations` | Admin | Add a location/branch | location row |
| Org Settings | `/app/admin/settings` | Admin | Update org profile/settings | change saved |
| Platform: Orgs | `/app/platform/organizations` | Platform | Create org / seed / enable features | org provisioned |
| Platform: Subscriptions | `/app/platform/subscriptions` | Platform | View/adjust a subscription | change saved |
| Platform: Features | `/app/platform/features` | Platform | Toggle a feature module for an org | flag flips |
| Platform: Doctor Registry | `/app/platform/doctors` | Platform | Verify/reject a doctor | status change |
| Platform: Audit | `/app/platform/audit` | Platform | Read-only audit list | rows render |

---

## 4. Caveat / bug investigations (not just feature checks)

### C1 — Triage acuity persists as GREEN regardless of selection
- **Repro (browser):** `/app/nurse/triage` → start triage → select **RED** (and again **YELLOW**) →
  save. Then `GET /api/triage?patientId=…` and read `triageLevel`.
- **If it persists wrong:** trace `frontend/src/pages/nurse/TriagePage.tsx` — the acuity control's
  bound state and the `triageLevel` field in the `POST /triage` payload (likely the select value
  isn't wired into the submit body, or defaults to GREEN). Confirm against
  `backend/.../triage.service.ts` (which maps level → queue priority).
- **Deliverable:** root-cause + fix + re-verify (RED in → RED persisted; queue priority EMERGENCY).

### C2 — Patient portal showed the seeded patient, not the journey patient
- **Hypothesis:** portal accounts are only auto-created when a patient is registered **with an email**
  (the journey patient had none). Is that intended, or should phone-only patients get portal access?
- **Test (browser):** register a patient **WITH** an email → confirm a `PatientAccount` is created →
  log in at `/patient/login` → `/patient/select-hospital` → confirm the portal shows **that
  patient's** appointment/Rx/lab/bill.
- **Deliverable:** confirm "email required for portal" as expected behavior, OR file a gap
  (offer portal enrolment for phone-only patients).

---

## 5. Execution model (how this gets run)

1. **Setup** — reuse `org.json` + the login helper; API-seed the Wave-C/D prerequisites (vendor,
   donor, ambulance, etc.).
2. **Recipe pass** — extract each module's primary-flow selectors from source (same approach used
   for the journey screens) so the specs use real placeholders/buttons, not guesses.
3. **Spec pass** — one Playwright spec per wave; persona logins; screenshot every outcome;
   API-verify each create.
4. **Verify pass** — adversarially re-check each "PASS" against the DB; capture error toasts.
5. **Report** — a **coverage matrix** (module × Loads/Creates/Persists), a **findings list** (bugs),
   screenshots, and a single honest **coverage %**.

> With ultracode on, waves run as a fan-out workflow: map recipes in parallel → generate+run specs
> per module → adversarially verify findings → synthesize the report.

**Scale estimate:** ~35 modules × (load + 1 create flow) ≈ **35–70 browser test cases**, plus the 2
bug investigations. Suggest running **Wave A as a pilot** to calibrate, then the rest.

---

## 6. Known risks & expected partials

- **Stub/placeholder pages:** some screens are known to have non-functional "View" buttons
  (e.g. AntimicrobialPage, ClinicalPathwaysPage). These will register as "Loads/Reads ✅, Creates n/a"
  — that's a real finding (placeholder), not a hard fail.
- **Prerequisite chains:** modules like Purchase Indent → PO → GRN need upstream records; missing
  setup will surface as BLOCKED, not a true bug.
- **Infra flakiness:** Render free-tier cold starts + intermittent Supabase → retries + waits.
- **Role gating:** a few screens are admin-only; tests use the correct persona (or admin fallback).
- **Transient-toast assertions:** assert on persisted state / list rows, not auto-dismissing toasts
  (lesson from the OT test flake).

---

## 7. Definition of done for the whole sweep

- Every module in §3 has a row in the coverage matrix with Loads/Creates/Persists results +
  a screenshot.
- C1 and C2 in §4 are root-caused (fixed if in scope, or filed with repro).
- A final report states the **verified coverage %** and lists all findings — so "works in the UI"
  becomes a number with evidence, not a claim.
