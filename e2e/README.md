# Ayphen HMS — E2E / API Test Suite

Reconstructed into the repo after the working copy in `/tmp` was purged by the OS.
Version-controlled here so it survives and can run in CI.

## Contents

| File | What it does | Browser? |
|---|---|---|
| `regression-creates.mjs` | Smoke test: POSTs ~36 create endpoints, asserts 201. Fastest check. | No |
| `verify-fixes.spec.ts` | Consultation-complete (structured ICD persists) + discharge-approve (admission → DISCHARGED), both DB-verified. | Yes |
| `verify-wave8-fixes.spec.ts` | Create flows: Referral, Birth, Consent, MLC. | Yes |
| `wave5.spec.ts` | Create flows: Radiology order, Blood Bank donor, Lab QC run, Pharmacy receive-batch. | Yes |
| `render-check.spec.ts` | Smoke: changed pages still render on production (no crash). | Yes |

> **Not yet included:** the full 12-act patient journey (`journey.spec.ts`) and the `sweep-*` specs
> were only partially recoverable from session history. They need to be rebuilt + re-tested — see
> "Rebuild journey" below.

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

## Rebuild journey.spec.ts

The 12-act patient journey (register → triage → consult → Rx → pharmacy → lab → admit → OT → billing →
portal → discharge, all DB-verified) is the highest-value spec but wasn't fully recoverable verbatim.
It can be regenerated from the session history and test-run to confirm 12/12 before committing.
