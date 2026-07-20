# Ayphen HMS — Full E2E UI Test Plan (Visual-First)

**Mission:** browser-test **every feature** of the app end-to-end, **deeply** (happy path + validation +
role access + state transitions + empty/error states), with **visual evidence for every step** — so the
result is a browsable gallery + report you can *see*, not a claim you have to trust.

**Target:** the live deployed app (`https://care-sims.vercel.app`) backed by Render + Supabase.
**Excluded:** AI features (per standing direction).
**Already verified (re-validated here as a regression baseline):** the 12-act core patient journey +
the 3 shipped fixes (consultation complete+ICD, OT duplicate-room 400, discharge clarity) + C1 triage
(confirmed correct).

---

## 1. What "visual-first" means here (the core of this plan)

Every test produces **see-it-yourself evidence**, layered:

| Layer | Artifact | What you see | Tool |
|---|---|---|---|
| Per-step still | `shots/<wave>-<module>-<step>.png` (full-page) | the actual rendered screen at each action | `page.screenshot({fullPage:true})` |
| Per-flow video | `*.webm` | a screen recording of the browser clicking through | Playwright `video: 'on'` |
| Per-flow trace | `trace.zip` | scrubbable frame-by-frame DOM timeline (DOM + network + console per click) | Playwright `trace: 'on'` → `show-trace` |
| Browsable report | `pw-report/index.html` | thumbnails per test, click to enlarge, embedded video + trace, green/red status | `playwright show-report` |
| Contact sheet | `gallery/index.html` | one scrollable page of every screenshot with captions | generated gallery |
| Visual baseline (optional) | `__screenshots__/*.png` + pixel diff | regressions highlighted in red on changed screens | `expect(page).toHaveScreenshot()` |
| Data truth | `results.json` + API/DB cross-check | proof the pixels match real persisted records | live API / Prisma |

**Rule:** a step is **PASS** only when (a) the UI visibly succeeded **and** (b) the record is confirmed in
the DB/API. Pixels alone are never enough; data alone isn't "visual." Both, always.

**Capture points per feature (minimum 4 stills):** ① screen loaded · ② form filled · ③ success state
(toast/badge) · ④ list/detail showing the new record. Plus a still for every validation/error case.

---

## 2. What "deep" means — the 7 test dimensions per feature

Each feature is exercised across these dimensions (not just "does it open"):

1. **Loads** — route renders for the right role, no `ErrorBoundary`/blank/403.
2. **Reads** — existing/seeded data lists; search/filter/pagination work.
3. **Creates (happy path)** — the primary create/flow completes; success toast + record appears.
4. **Validates** — submit with missing/invalid fields → inline/toast errors are shown (captured visually).
5. **Transitions** — status/state changes (e.g. DRAFT→FINAL, SCHEDULED→COMPLETED) reflect in badges + DB.
6. **Role access** — allowed personas succeed; a denied persona is redirected/blocked (captured).
7. **Edge/empty/error** — empty-state UI, duplicate/conflict handling, server-error toast text captured.

Not every dimension applies to every screen (some are read-only dashboards) — the matrix marks N/A.

---

## 3. Environment, data & personas

- **Org:** dedicated `e2e*` tenant, all 66 features enabled, all logins `Demo@1234`.
- **Personas:** `admin` (all-access fallback), `reception`, `nurse`, `wardnurse`, `chargenurse`,
  `pharmacy`, `lab`, `billing` `@<slug>.local`; `doctor.demo@<slug>.local`; `patient1@<slug>.local`;
  platform `admin@ayphen.io`.
- **Seed prerequisites** (created via API in setup so dependent flows don't BLOCK):
  vendor + inventory item (PO/store), donor + blood unit (blood bank), ambulance vehicle (dispatch),
  instrument set (CSSD), salary structure (payroll), an active admission (MAR/discharge/diet).
- **Viewport:** 1440×900 (≥lg so right-column actions render); a mobile pass (390×844) for patient portal.

---

## 4. Full feature inventory & coverage waves

> Route + gating role from `frontend/src/App.tsx`. "Deep cases" = the dimensions (§2) to exercise.
> Exact field selectors are extracted from source at execution time (the proven recipe step).

### Wave 0 — Auth, onboarding & shell  *(gateways everything)*
| Route | Persona | Deep cases (visual capture) |
|---|---|---|
| `/` Landing | public | loads, primary CTAs, nav to logins |
| `/login` | all | valid login → role redirect; invalid → error toast; forgot-password flow; show/hide pw |
| `/doctor/select-org` | doctor | org list → select → lands on doctor queue |
| `/patient/login` → `/patient/select-hospital` | patient | login → pick hospital → portal |
| `/patient/register`, `/doctors/register`, `/staff/register` | public | registration form validation + submit |
| `/reset-password` | token | reset flow renders |
| `/app/profile`, `/app/change-password`, `/app/notifications` | any | load + edit/save |
| App shell | each role | sidebar shows role-correct items; brand/logo; role redirect on `/app` |

### Wave 1 — Core patient journey  *(regression of the verified 12 acts)*
Register → Appointment → Triage (acuity persists) → Consultation (COMPLETED + ICD) → Prescription →
Pharmacy dispense → Lab order+result+validate → Admit → OT schedule→start→complete → Billing invoice+pay →
Patient portal → Discharge (summary→approve). *Each act re-screenshotted; asserts DB state.*

### Wave 2 — Reception & front office
| Route | Persona | Deep cases |
|---|---|---|
| `/app/queue` Queue dashboard | reception | token list, call next, status transitions |
| `/app/patients` | reception | register (validation: phone 10-digit, last name), search, edit, view detail |
| `/app/appointments` (+ self-booking) | reception | book (slot conflict error), reschedule, cancel, slots |
| `/app/visitors` | reception | issue pass → check-out |
| `/app/ambulance` | reception | create dispatch → status transition |
| `/app/grievance`, `/app/feedback` | reception | log entry |
| `/app/health-packages` | reception | view/assign package |

### Wave 3 — Doctor & clinical encounter
| Route | Persona | Deep cases |
|---|---|---|
| `/app/doctor/queue`, `/doctor/consultations` | doctor | queue → open patient; list/filter |
| `/app/doctor/consultation` | doctor | SOAP + ICD diagnosis → **Complete** (status COMPLETED, structured Dx) |
| `/app/doctor/prescriptions` | doctor | create Rx → send to pharmacy; cancel |
| `/app/doctor/lab-orders` | doctor | order tests |
| `/app/referral` | doctor | create referral |
| `/app/telemedicine` | doctor | schedule tele-consult (roomUrl) |
| `/app/certificates`, `/app/consent` | doctor | issue certificate / capture consent |
| `/app/clinical-pathways`, `/app/wound-care`, `/app/antimicrobial`, `/app/palliative-care`, `/app/home-care` | doctor/nurse | open + primary action (flag known "View" stubs) |
| `/app/doctor/availability`, `/app/admin/doctor-availability` | doctor/admin | set availability/leave |

### Wave 4 — Nursing, wards & inpatient
| Route | Persona | Deep cases |
|---|---|---|
| `/app/nurse/triage` | nurse | acuity select **persists** (RED/YELLOW), vitals, assign doctor |
| `/app/nurse/vitals` | nurse | record vitals; abnormal flag |
| `/app/nurse/wards` | nurse | ward + bed create; bed status transition |
| `/app/nurse/admissions` | wardnurse | admit (bed→OCCUPIED), transfer bed, discharge→summary→approve |
| `/app/nurse/mar` | wardnurse | 5-rights administer; withhold w/ reason; overdue highlight |
| `/app/icu`, `/app/nicu` | nurse/doctor | chart/observation entry |
| `/app/dialysis`, `/app/physiotherapy` | nurse/doctor | schedule + record session |
| `/app/shift-handover` | nurse | create handover |
| `/app/diet` | nurse | diet order |
| `/app/discharge-summary` | nurse | create draft → approve (cascades admission discharge) |

### Wave 5 — Lab, pharmacy, radiology, blood bank
| Route | Persona | Deep cases |
|---|---|---|
| `/app/lab`, `/app/lab/results`, `/app/lab/qc` | lab | order, enter results, validate (order→RESULTED), QC run PASS/WARN/FAIL |
| `/app/pharmacy` (+ inventory, purchase-orders, returns, reports) | pharmacy | dispense (stock↓), receive batch, PO, return, reports |
| `/app/radiology` | doctor/lab | imaging order → report |
| `/app/blood-bank` | nurse/doctor | donor → unit → crossmatch/issue |
| `/app/inventory`, `/app/central-store`, `/app/purchase-indents` | pharmacy/nurse | item, store issue, indent→approve |

### Wave 6 — Billing & finance
| Route | Persona | Deep cases |
|---|---|---|
| `/app/billing` | billing | invoice + line items → payment (DRAFT→PAID), finalize, cancel, partial |
| `/app/insurance` | billing | TPA/claim against invoice |
| `/app/payroll` | admin | payroll run / payslip |

### Wave 7 — OT
| Route | Persona | Deep cases |
|---|---|---|
| `/app/ot` | admin/ot | add room (**duplicate→friendly 400**), schedule (surgeon conflict error), start→complete |
| `/app/ot/live` | ot | live monitor renders |
| `/app/ot/equipment` | ot | add equipment, sterilize |

### Wave 8 — Records, medico-legal & compliance
| Route | Persona | Deep cases |
|---|---|---|
| `/app/mrd` | admin | record request / movement |
| `/app/mlc` | doctor/nurse | MLC register entry (mlcNumber) |
| `/app/birth-death` | doctor/nurse | birth record + death record |
| `/app/mortuary` | nurse | body in/out register |
| `/app/infection-control` | nurse | surveillance entry |
| `/app/quality` | admin | incident/quality log |
| `/app/admin/audit`, `/app/platform/audit` | admin/platform | audit log lists + filter (read-only) |

### Wave 9 — Facilities, supply chain & workforce ops
| Route | Persona | Deep cases |
|---|---|---|
| `/app/cssd` | nurse/ot | sterilization cycle start→complete |
| `/app/linen` | nurse | issue → return |
| `/app/waste-management` | nurse | collection → manifest pipeline |
| `/app/housekeeping` | nurse | task create → done |
| `/app/vendors` | admin | add vendor |
| `/app/asset-management` | admin | add asset + AMC |
| `/app/work-orders` | admin | create → status workflow (OPEN→IN_PROGRESS→DONE) |
| `/app/duty-roster` | admin | shift assignment |
| `/app/staff-attendance` | staff | check-in/attendance |

### Wave 10 — Admin & Platform console
| Route | Persona | Deep cases |
|---|---|---|
| `/app/admin`, `/admin/users`, `/admin/roles`, `/admin/departments`, `/admin/locations`, `/admin/settings`, `/admin/mfa`, `/admin/reports` | admin | dashboard KPIs; create user (then it logs in); role perms; dept; location; settings save; MFA setup; reports tabs + CSV export |
| `/app/platform`, `/platform/organizations`, `/subscriptions`, `/features`, `/doctors`, `/audit` | platform | create org + seed + enable features; subscription; feature toggle; doctor verify/reject |

### Wave 11 — Patient portal  *(+ mobile viewport pass)*
| Route | Persona | Deep cases |
|---|---|---|
| `/app/patient/portal` + appointments/records/prescriptions/lab/billing/vitals/timeline | patient | each tab loads **their own** records; book self-appointment; responsive at 390px |

---

## 5. The visual deliverable — what you'll get to see

1. **`pw-report/index.html`** — the main browsable report: every test as a card with status, expandable
   steps, **thumbnail screenshots (click to zoom)**, embedded **video**, and the **trace** viewer link.
2. **`gallery/index.html`** — a single-scroll **contact sheet**: every screenshot with a caption
   (`Wave · Module · Step · PASS/FAIL`), grouped by wave — the fastest way to eyeball the whole app.
3. **`shots/`** — all raw full-page PNGs (named `NN-module-step-RESULT.png`).
4. **`videos/`, `traces/`** — per-flow recordings for the high-value flows (journey, OT, discharge, billing).
5. **`COVERAGE_MATRIX.md`** — module × 7-dimensions grid (✅/❌/N-A) with a link to each screenshot, plus a
   single headline **verified-coverage %**.
6. **`FINDINGS.md`** — every bug/odd behavior with repro + screenshot + (if fixed) the commit.

---

## 6. Execution model (ultracode workflow fan-out)

1. **Setup** — provision/refresh org; API-seed Wave prerequisites; build login + screenshot helpers.
2. **Recipe pass (parallel)** — per module, extract real selectors from source (placeholders, button text,
   modals, debounced selects) → a per-screen recipe.
3. **Spec pass (parallel by wave)** — generate one Playwright spec per wave; `video/trace/screenshot on`;
   each test runs the 7 dimensions; append to `results.json`.
4. **Verify pass (adversarial)** — re-check every "PASS" against the DB; capture error toasts verbatim.
5. **Assemble visuals** — build `gallery/index.html` + `COVERAGE_MATRIX.md`; open `pw-report`.
6. **Report** — headline coverage %, findings, and the visual gallery link.

**Scale:** ~95 routes × (avg 2–4 deep cases) ≈ **250–400 test steps**, ~600–900 screenshots, ~10 videos.
**Phasing:** run **Wave 0+1 first** (auth + journey regression) as a smoke gate, then Waves 2–11.
Suggest 1 wave per batch so results are reviewable as they land.

---

## 7. Definition of done & exit criteria

- Every route in §4 has a coverage-matrix row with each applicable dimension marked + screenshot link.
- Every create flow is **data-verified** (not just visually).
- All validation/error/role-denied cases have a captured screenshot.
- `gallery/index.html` + `pw-report` render the full visual catalog.
- A single **verified-coverage %** is reported, with `FINDINGS.md` listing all issues (fixed or filed).

---

## 8. Risks & expected partials

- **Stub/placeholder screens** (e.g. some AntimicrobialPage / ClinicalPathways "View" buttons) → record as
  "Loads ✅ / Creates N-A (placeholder)", a real finding, not a hard fail.
- **Prerequisite chains** (PO→GRN, donor→issue) → missing setup shows BLOCKED, not a bug.
- **Infra flakiness** (Render cold start, Supabase intermittency) → retries + waits; assert on persisted
  state/list rows, never on auto-dismissing toasts (lesson from the OT-test flake).
- **Transient-render captures** → add a short settle + a `toHaveClass`/`toBeVisible` assertion before the
  screenshot so stills match the asserted state (lesson from the triage capture).
- **Patient portal needs email** at registration to create a login — covered explicitly in Wave 11/C2.
