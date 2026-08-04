# Demo flow — Reception → Triage → Doctor (updated 2026-08-03)

Replaces Stations 1–2 of the 10-station demo script. Every step below was verified in a real
browser against the live deploy (`9d36016`) on 2026-08-03; test data was removed afterwards.

**What changed:** registration used to be a dead end — it wrote a patient record and nothing else.
It now *starts a visit*, which is what makes the next two stations light up. The old demo needed a
manual detour through Queue Dashboard → Issue Token; that step is gone.

---

## Before you start

- **URL:** https://care-sims.vercel.app · password for every account: `Demo@1234`
- **Reception:** `reception@simsbox.demo` (Priya Menon) — **Branch Clinic**
- **Nurse:** `nurse@simsbox.demo` (Asha Rao)
- **Doctor:** the doctor account for **Dr. Meera Iyer**
- ⚠ **Warm the backend first** — Render is free-tier and cold-starts ~30–60s:
  `curl -s https://care-sims.onrender.com/api/health`
- ⚠ **Use a ≥1600px window.** At 1280px the Appointments *Actions* column clips "Cancel"/"Print".
  (Measured at 1600px: no clipping, no horizontal scroll. The "Check In" label used to wrap to two
  lines even at 1600px — fixed with `whitespace-nowrap`.)
- ⚠ **Two locations exist.** Priya is at *Branch Clinic*, so she sees the three doctors affiliated
  there — **Dr. Meera Iyer** (General Medicine), **Dr. Anjali Krishnan** (Pediatrics) and
  **Dr. Sanjay Pillai** (Emergency). Dr. Rahul Sharma is at *Main Campus* and correctly never
  appears. Registering patients against different doctors is what makes the nurse's department
  chips appear.

---

## Station 1 — Reception registers a walk-in  *(≈90s)*

- Log in as **reception@simsbox.demo** → **Patient Registration**
- Point out the list: a **TODAY** column, and an amber **⊕ Triage** button on every row.
  Everyone reads `—` — nobody has a visit yet.
- Click **Register New Patient**
- Fill sections 1–2 (name, phone, gender; address if you want to show the structured fields)
- **Section 3 — Visit Details is the money shot.** Call out that these fields used to be
  collected and thrown away:
  - **Department** → `General Medicine`
  - **Preferred Doctor** → a **real dropdown** of affiliated doctors (was a free-text box) →
    `Dr. Meera Iyer`
  - **Priority** → `Urgent`
  - **Chief Complaint** → `"Chest pain since morning"`
  - **"Add to today's queue"** is ticked by default — read the helper text aloud:
    *"Issues a queue token so the patient appears in the nurse's triage worklist."*
- Click **✓ Register Patient & Generate Token**
- ✅ **Toast names the token number** — e.g. *"Registered — queue token #1 issued"*
- Back on the list, the new row now shows an amber **`#1 Awaiting triage`** pill,
  and **that row's Triage button is greyed out** while every other row stays clickable

> **Alt path — patient already registered:** click the amber **Triage** button on any `—` row.
> It issues the token in one click. Idempotent: clicking twice reuses the same token, it never
> queues the patient twice.

---

## Station 2 — Nurse triages from a worklist  *(≈90s)*

- Log in as **nurse@simsbox.demo** → **Triage**
- ✅ **"Waiting for Triage" panel at the top** — this is the new part. Before, the nurse had a
  blind search box and had to already know who had walked in.
- The entry carries everything reception captured:
  `#1 · Uitest Walkin · SIMS-8062860 · Dr. Meera Iyer · Chest pain since morning · 0 min`
  - token badge turns **red** for URGENT/EMERGENCY
  - wait time turns **red past 30 minutes**
- **Click the entry** → patient banner and Chief Complaint prefill automatically. Nobody retypes.
- Record vitals (BP systolic/diastolic, heart rate), pick an acuity on the right
  (**Semi-Urgent** is the default green option — the labels are Emergency / Critical / Urgent /
  Semi-Urgent / Routine, *not* RED/YELLOW/GREEN)
- **Complete Triage & Assign Doctor**
- ✅ Patient **disappears from the worklist** — it's derived from "tokens with no triage record",
  so it drains by itself
- ✅ Back in reception, the pill has flipped to teal **`#1 Triaged`**

---

## Station 3 — Doctor sees them  *(≈45s)*

- Log in as the **Dr. Meera Iyer** account → **My Queue**
- ✅ The patient is there, priority carried through from triage acuity
  (RED/ORANGE → `EMERGENCY`, YELLOW → `URGENT`), so **Call Next picks the sickest first**
- **Call** → **Start Consultation** → continue into the existing consultation demo

---

## Station 1b — Appointment check-in *(optional, ≈30s)*

Use this when the story is "patient booked ahead" rather than "patient walked in".

- **Appointments** → the date picker **defaults to today, which has no appointments** — the list
  looks empty until you set a date that has rows (e.g. `2026-07-30`). Set it *before* you start
  talking, or the demo opens on an empty table. Note it renders DD/MM/YYYY.
- Every SCHEDULED row leads with an amber **⇥ Check In** button (correctly absent on CANCELLED rows)
- Click it → toast reads **"Checked in — token #N"**, and the button is **replaced by a teal
  `✓ Checked in #N` pill** so the row still shows it happened after the toast fades
- The patient joins the same triage worklist as a walk-in, carrying the doctor and the reason
- Clicking twice is safe — it reuses the same token rather than queueing the patient again

---

## The one-line pitch

> *"Reception registers the patient once. That single act creates the visit — and the patient
> immediately appears in the nurse's triage worklist and the doctor's queue, with the complaint,
> the assigned doctor and the priority already filled in. Nobody retypes anything, and reception
> can see exactly where every patient is."*

---

## Talking points if asked

- **Where does the queue number come from?** Allocated under a Postgres advisory lock scoped to
  (site, day) — verified with 8 simultaneous check-ins producing tokens 1–8 with zero collisions.
- **Can a patient get queued twice?** No. Every path — registration, the Triage button, appointment
  check-in, and nurse triage — reuses a patient's live token for the day.
- **Multi-site?** Token numbers restart per location per day, and a patient is always queued at the
  desk doing the checking-in, not at their home branch.
- **Can we still register without starting a visit?** Yes — untick "Add to today's queue"
  (pre-registration, records-only, imports).

---

## Known rough edges — steer around these

| Issue | Impact on demo |
|---|---|
| Only 1 doctor + 1 department at Branch Clinic | Don't demo the department→doctor filter |
| Appointments Actions column clips <1600px | Use a wide window |
| TYPE column shows `WALK_IN` vs `WALKIN` inconsistently | Cosmetic, pre-existing raw enum |
| **Referral list shows patient UUIDs instead of names** | **Avoid Station 4 (Referral) — still unfixed** |
