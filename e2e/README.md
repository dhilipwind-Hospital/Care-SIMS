# Ayphen HMS — E2E / API Test Suite

Reconstructed into the repo after the working copy in `/tmp` was purged by the OS.
Version-controlled here so it survives and can run in CI.

## Contents

| File | What it does | Browser? |
|---|---|---|
| `journey.spec.ts` | **The 12-act patient journey** — register → appointment → triage → consult (ICD persisted) → prescription → pharmacy dispense → lab (collect→process→results→validate) → admit → OT → billing (invoice+payment) → patient portal → discharge. UI-driven, every assertion API/DB-verified. **12/12 passing.** | Yes |
| `patient-selfbooking.spec.ts` | **Self-booking** (the gap journey Act 11 leaves — it only confirms the portal *loads*). 4 tests: (1) portal API contract book→list→cancel; (2) portal doctor-name enrichment guard; (3) portal UI booking; (4) **staff** SelfBookingPage UI booking. Each books then cancels, so it self-cleans. `FE_URL=http://localhost:5555 npx playwright test patient-selfbooking.spec.ts` runs it against a local/preview build. See note below. | Partly |
| `regression-creates.mjs` | Smoke test: POSTs ~36 create endpoints, asserts 201. Fastest check. | No |
| `verify-fixes.spec.ts` | Consultation-complete (structured ICD persists) + discharge-approve (admission → DISCHARGED), both DB-verified. | Yes |
| `verify-wave8-fixes.spec.ts` | Create flows: Referral, Birth, Consent, MLC. | Yes |
| `wave5.spec.ts` | Create flows: Radiology order, Blood Bank donor, Lab QC run, Pharmacy receive-batch. | Yes |
| `render-check.spec.ts` | Smoke: changed pages still render on production (no crash). | Yes |

> **Not yet included:** the `sweep-*` specs (broad page-render coverage) were lost in the `/tmp`
> purge and still need rebuilding.

> **`patient-selfbooking.spec.ts` — the "doctor name" test is a deploy guard.** Test 2
> (`…resolves the doctor name`) asserts `doctorName` is populated in the portal's *My Appointments*.
> It **fails until the `auth.service.getPatientAppointments` enrichment fix is deployed** to the
> backend, then goes green — the failure message says exactly this. Tests 1 (API) and 3 (UI) pass
> against current production. Every test books then cancels via the patient-scoped API, so a
> failed/interrupted run leaves no orphan appointment.
>
> **Test 4 (staff `SelfBookingPage`) is a FRONTEND deploy guard.** The deployed page still (a) crashes
> rendering slot objects and (b) sends a `reason` field the DTO rejects — so it fails against current
> production and passes once the frontend fix is deployed. Verified locally against the prod backend
> with `FE_URL=http://localhost:5555` (point the vite dev `/api` proxy at the prod backend first).

## CI

`.github/workflows/ci.yml` runs this suite automatically:

- **Every PR/push** — frontend + backend typecheck (gates the actual code in the ref).
- **Push to main** — waits until `GET /api/health` reports the pushed commit (Render sets
  `RENDER_GIT_COMMIT`), so the suite never runs against the previous deploy, then runs
  the regression smoke + all Playwright specs against production.
- **Nightly (03:00 IST) + manual dispatch** — same suite, no commit wait.

One-time setup: add a repo secret **`E2E_ORG_JSON`** containing the full contents of your
filled-in `org.json` (Settings → Secrets and variables → Actions, or
`gh secret set E2E_ORG_JSON < org.json`). Without it the e2e job skips with a notice.

## Setup

```bash
cd ayphen-hms/e2e
npm install
npx playwright install chromium
cp org.json.example org.json    # then fill in the seeded test-org credentials
```

## Run

```bash
npm run regression                          # API smoke (node, no browser) — fastest
npm test                                     # all browser specs
npx playwright test verify-fixes.spec.ts     # a single spec
```

## `org.json`

- `api` — backend base URL **including** the `/api` global prefix, e.g. `https://care-sims.onrender.com/api`
- `password` — shared password for the seeded test-org logins
- `logins` — email per role (admin, reception, nurse, wardnurse, chargenurse, pharmacy, lab, billing, doctor, patient)

`org.json` is git-ignored (holds credentials). Only `org.json.example` is tracked.

The Render backend is free-tier and cold-starts (~30–60s). Warm it before a run so first login doesn't time out:

```bash
curl -s https://care-sims.onrender.com/ >/dev/null
```

## Gotchas learned the hard way (keep these in mind when editing specs)

- **Never use `waitForLoadState('networkidle')`** — the app holds a ws-gateway WebSocket open, so it
  never settles. With `navigationTimeout` unset (default 0 = inherit the whole test budget) it will
  silently consume the entire run. `actionTimeout`/`navigationTimeout` are now set in the config.
- **Scope patient pickers to the modal.** Several pages have their own search box behind the modal
  (e.g. billing's "Search invoice or patient…"), so a loose `/Search/i` types into the wrong input.
- **Use exact button names.** `/Dispense/i` also matches the sidebar nav item and the tab; the real
  button is "Dispense Medications".
- **Use a unique time slot per run.** The app correctly rejects double-booking a doctor or surgeon,
  so a hardcoded time collides with previous runs (`SLOT` is derived from the run stamp).
- **Request bodies must match the DTO exactly** — the global ValidationPipe uses
  `forbidNonWhitelisted`, so an extra key gets the whole request rejected.

## See the run as a gallery

After a journey run, turn the captured screenshots into a single self-contained HTML page:

```bash
npx playwright test journey.spec.ts   # writes results.json + shots/*.png
node build-gallery.mjs                 # -> journey-gallery.html (images embedded, open in a browser)
```

`build-gallery.mjs` reads `results.json` (per-act status + detail) and `shots/*.png`, compresses each
with `sips`, and embeds them as base64 — so the output works offline and can be published as an artifact.
