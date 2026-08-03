# Registration → Triage → Doctor: what needs to be done

**Date:** 2026-08-03
**Status:** ✅ **BUILT** — Option A, all four phases. Verified end-to-end against the live Sims Box org.
**Trigger:** reception registers a patient, picks a doctor, and the patient reaches no downstream station.

> **What shipped** — see §8 for the verification log.
> Registration now issues a queue token (opt-in checkbox, on by default), the doctor
> picker is real, the nurse has a live "Waiting for Triage" worklist, reception shows a
> per-patient stage pill with an "Advance to Triage" button, and appointments have
> Check In. Token numbering is now race-safe.

---

## 1. The problem in one sentence

Patient registration is a **dead end**: it writes a `Patient` row and nothing else — no queue token, no triage signal, no doctor assignment — so no downstream station ever learns the patient exists.

### 1.1 What the registration form throws away

The entire **Visit Details** block is decorative.

| Field | Sent by `register()`? | Stored by backend? | Column exists? |
|---|---|---|---|
| Visit Type | no | — | no |
| Department | no | — | no |
| **Preferred Doctor** | no | — | no |
| Priority | no | — | no |
| Chief Complaint | **yes** | **no** — silently dropped | no |

`register()` ([`frontend/src/pages/patients/PatientsPage.tsx`](frontend/src/pages/patients/PatientsPage.tsx) `register()`) omits four of the five from the POST body. Chief Complaint *is* sent and the DTO validates it, then `patients.service.create` never writes it.

The `Patient` model has no column for any of them. That is arguably **correct** — these are visit-level facts, not patient-level ones — but the form collects them anyway and reports success.

Two further problems in that same block:

- **Preferred Doctor is a free-text input** (`placeholder="Dr. Rajesh Kumar"`), not a picker. It could never have captured a doctor ID.
- **Department is populated from `SPECIALTIES`**, a hardcoded 22-item frontend constant — not the tenant's real `departments` table (Sims Box has 5).

### 1.2 Why the patient can't reach a doctor

Doctor worklists read **queue tokens**, never patients:

```
GET /queue/doctor/:doctorId
  → queueToken.findMany({ tenantId, doctorId, queueDate: today })
```

Registration creates no token, so there is no path — even a correctly stored preferred doctor would surface nowhere.

### 1.3 Why the nurse can't find them either

The triage station (`/app/nurse/triage`) is **pull-based**. The nurse types a name into a free-text box, gets ≤8 results from `/patients`, and fills the form. There is **no worklist** of patients waiting for triage, because nothing upstream marks anyone as waiting.

`grep -rni "advance to|send to triage|advanceTo"` across frontend and backend returns nothing. The concept does not exist under any name.

### 1.4 What already works

The reverse linkage is well built. `triage.service.create` already:

- reuses the patient's live queue token for today, or mints one if absent;
- maps acuity to queue priority (`RED`/`ORANGE` → `EMERGENCY`, `YELLOW` → `URGENT`);
- writes `TriageRecord.queueTokenId` to link the two.

So **triage → queue → doctor is solid**. Only **registration → triage** is missing.

There is also a partial version of the "don't act twice" rule, on the wrong side of the workflow: `TriagePage` builds `triagedTodayPatientIds` and filters already-triaged patients out of the nurse's own search dropdown. Reception can't see it.

---

## 2. The key finding that makes this cheap

**`QueueToken` already has every column needed. No schema migration is required for the core flow.**

```
QueueToken: doctorId, departmentId, visitType, priority, notes, appointmentId,
            status, tokenNumber, queueDate, locationId, patientId
```

`IssueTokenDto` already accepts all of them. The work is wiring, not modelling.

Likewise the triage worklist needs **no new status enum**: "pending triage" is simply *today's tokens with no `TriageRecord` pointing at them*, and `TriageRecord.queueTokenId` already exists.

---

## 3. Decision required before building

**Should the Visit Details fields start a visit at registration, or be removed from the form?**

- **Option A — make them real** (recommended). Matches what reception clearly expects from the form. Closes the registration→triage, registration→doctor, and reception-visibility gaps in one change.
- **Option B — delete the block.** Smaller. Visits then start only via Appointments or Queue → Issue Token. Reception must do two steps for every walk-in.

Everything below assumes **Option A**.

---

## 4. Work items

### Phase 1 — Registration starts a visit

**1.1 Real doctor picker** *(frontend)*
Replace the free-text Preferred Doctor input with a picker backed by `GET /doctors/by-location/:locationId`. Store the **doctor ID**, not a typed name.
✅ No roles change needed — `SYS_RECEPTIONIST` is already authorised on that endpoint (verified in `doctor-registry.controller.ts`).

**1.2 Real department source** *(backend + frontend)*
Currently a hardcoded constant. Two routes:
- **1.2a** Widen `GET /org/departments` from `@Roles('SYS_ORG_ADMIN')` to include `SYS_RECEPTIONIST` + `SYS_FRONT_OFFICE`, and drive the dropdown from it.
- **1.2b** *(simpler, recommended)* Drop the separate dropdown and derive department from the chosen doctor's affiliation — the same fallback already shipped for the Appointments list. One less thing for reception to get wrong.

**1.3 Send the fields** *(frontend)*
`register()` must include `visitType`, `departmentId`, `doctorId`, `priority`, `chiefComplaint`.

**1.4 Issue a queue token on registration** *(backend)*
`patients.service.create` optionally mints a token in the **same transaction** when visit details are present:
- `priority`: `Normal|Urgent|Emergency` → `NORMAL|URGENT|EMERGENCY`
- `chiefComplaint` → `token.notes` (matches what `triage.create` already does)
- `queueDate` **must** use `startOfDayUtc` — local midnight breaks the `@db.Date` read/write on this IST server (documented at the top of `queue.service.ts`).

**1.5 "Add to today's queue" checkbox** *(frontend)*
So records-only / pre-registration still works without forcing a visit.

**1.6 Extract the token-number helper** *(backend, cleanup)*
The `findFirst(orderBy: tokenNumber desc) + 1` logic already exists **twice** (`queue.service`, `triage.service`). Registration would be the third copy. Extract it once.

---

### Phase 2 — Triage worklist *(the actual payoff)*

**2.1 `GET /triage/pending`** *(backend)*
Today's queue tokens with no `TriageRecord` referencing them. No migration, no new status.

**2.2 Nurse worklist UI** *(frontend)*
Replace the blind patient search on `TriagePage` with a live list of pending patients. Clicking one pre-fills the form **and passes `queueTokenId`** so `triage.create` reuses that token instead of minting a second one — branch 1 of its existing logic, already built.

> Phase 2 is where the value is. Phase 1 alone just moves the search burden around.

---

### Phase 3 — Reception visibility

**3.1 Stage flag on `GET /patients`** *(backend)*
Batch-resolve today's token + triage record per patient, return
`visitStatus: NOT_STARTED | AWAITING_TRIAGE | TRIAGED | IN_CONSULTATION | COMPLETED`.
**Must be batched** — a per-row lookup N+1s across 20 rows.

**3.2 "Advance to Triage" button + status pill** *(frontend)*
On the reception row, disabled once advanced. This is the originally requested behaviour — note it lands in **Phase 3**, and depends on 1.4 and 3.1.

---

### Phase 4 — Appointment check-in

**4.1** Check-in button on appointment rows → issues a token stamped with `appointmentId`. Same mechanism as 1.4, different starting point. Closes the gap where booking an appointment leaves the patient invisible to the queue.

---

## 5. Risks and gotchas

| # | Risk | Detail |
|---|---|---|
| 1 | **Doctor ID duality** | `doctorId` may be a `TenantUser` **or** a `DoctorRegistry` id, with no FK either way. A doctor's JWT `sub` is their **DoctorRegistry** id, and `/queue/doctor/:sub` matches on that — so registration must store the **DoctorRegistry** id or the patient won't appear in the doctor's queue. (Confirmed: Sims Box appointments store `a4213e7f…` = Dr. Rahul Sharma's registry id.) |
| 2 | **Token-number race** | `findFirst(desc) + 1` is an unlocked read-modify-write. Two concurrent registrations produce duplicate token numbers. Same class as the payment lost-update race already fixed. Worth closing while touching this code. |
| 3 | **Vocabulary mismatch** | Form `visitType` is `OPD - Walk-in / OPD - Appointment / Emergency / IPD`; `QueueToken.visitType` defaults to `NEW` and `triage.create` hardcodes `'NEW'`. Agree one vocabulary before wiring. |
| 4 | **Departments vs SPECIALTIES** | 22 hardcoded specialty strings vs 5 real Sims Box departments. Reception picking "Cardiology" when no such department exists creates orphan data. Resolved by 1.2b. |
| 5 | **Feature flags** | Triage sits behind `MOD_TRIAGE`, registration behind `MOD_PAT_REG`. A tenant with registration but not triage must not see the Advance button. |
| 6 | **Double-token risk** | If reception advances *and* the nurse triages a walk-in independently, two tokens could exist. `triage.create`'s reuse branch already guards this — Phase 1 must reuse the same lookup, not invent its own. |

---

## 6. Suggested order

1. **Phase 1** — registration issues a token (fixes the dead end)
2. **Phase 2** — triage worklist (delivers the value)
3. **Phase 3** — reception button + status pill (the originally requested UI)
4. **Phase 4** — appointment check-in (same mechanism, cheap once 1.4 exists)

Phases 1+2 are the meaningful unit; shipping 1 without 2 leaves the nurse still searching blind.

---

## 8. Verification log (2026-08-03, live Sims Box org)

Walked the whole path against real data on a local backend pointed at the production DB.
Every artifact created during the run was deleted afterwards (`queueDate = today` tokens: 0 remaining).

| # | Check | Result |
|---|---|---|
| 1 | Register with visit details | `SIMS-8062860` + **queue token #1**, `priority=URGENT`, doctor `a4213e7f`, department resolved to a real `Department` UUID, complaint stored on `notes` |
| 2 | Address round-trip | `{line1, line2, city, state, pinCode}` — all five persisted |
| 3 | `GET /triage/pending` | `#1 Flowtest Walkin URGENT Dr.Sharma wait 1m "Fever and body ache for 3 days"` |
| 4 | `GET /patients` stage | `AWAITING_TRIAGE` + token #1; every other patient `NOT_STARTED` |
| 5 | Doctor's own queue | patient present, `WAITING / URGENT` |
| 6 | Nurse triages off the worklist | triage record links `queueTokenId` — **token reused, not duplicated** (1 token, not 2) |
| 7 | Pending after triage | drops to 0; reception flips to `TRIAGED` |
| 8 | Advance to Triage | fresh token #2, `reused=false` |
| 9 | Advance again (idempotency) | same token #2, `reused=true` |
| 10 | **Race test** — 8 concurrent advances, one location | tokens 1–8, **zero duplicates** |
| 11 | Appointment Check In | token #9 with `appointmentId` stamped, `visitType=APPOINTMENT` |
| 12 | Regression: Queue Dashboard Issue Token | still works, and now dedupes (2 calls → 1 token) |

### Two things the live run caught that the plan missed

1. **`pg_advisory_xact_lock` returns `void`**, which Prisma's `$queryRaw` cannot deserialize
   (`Failed to deserialize column of type 'void'`) — every registration 500'd. Fixed by using
   `$executeRaw`.
2. **`advanceToTriage` originally queued at the *patient's* home location**, so a receptionist at
   site A would push a patient into site B's queue where neither they nor their nurses could see
   them. Now uses the actor's location, falling back to the patient's.

---

## 7. Related known issues (not in scope, same root cause)

- **Referral list shows patient UUIDs instead of names** — `ReferralPage.tsx` renders `{r.patientId}` raw; `referral.service` never includes the patient relation. Same "bare FK string, no relation, no resolution" pattern already fixed in OT, Appointments, and Queue.
- The recurring class: several models store an FK as a bare string with **no Prisma `@relation`**, so any list screen reading `row.x.name` renders `—` or a UUID forever. Nothing fails, nothing logs. Worth a systematic sweep.
