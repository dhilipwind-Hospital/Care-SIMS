# UI checklist — what to click, what you should see

Everything below is deployed (`2db330f`) and was verified in a browser on 2026-08-03,
except the two items marked ⊘ at the bottom.

**Before you start**
- Warm the backend (Render free-tier cold-starts 30–60s): `curl -s https://care-sims.onrender.com/api/health`
- Open https://care-sims.vercel.app at **≥1600px** width
- Password for every account: `Demo@1234`

| Role | Login |
|---|---|
| Reception (Priya Menon, Branch Clinic) | `reception@simsbox.demo` |
| Nurse (Asha Rao) | `nurse@simsbox.demo` |
| Doctor (Dr. Meera Iyer) | `doctor@simsbox.demo` |
| Admin (Sims Admin) | `admin@simsbox.demo` |

---

## 1 · Reception — the patient list
`reception@simsbox.demo` → **Patient Registration**

- [ ] A **TODAY** column sits between TYPE and ACTIONS (it replaced "Registered")
- [ ] Every row has an amber **⊕ Triage** button *before* the View / Edit / History / Access Log icons
- [ ] With nobody checked in, every TODAY cell reads `—` and every Triage button is clickable

## 2 · Register a walk-in
**Register New Patient** → scroll to **③ Visit Details**

- [ ] **Preferred Doctor is a dropdown**, not a text box — the old build had a free-text field with placeholder "Dr. Rajesh Kumar"
- [ ] **Department** is a dropdown listing only departments that have a doctor behind them
- [ ] **"Add to today's queue"** is present and **ticked by default**, with helper text naming the nurse's triage worklist

Fill in: first/last name, phone, Department `General Medicine`, Preferred Doctor `Dr. Meera Iyer`,
Priority `Urgent`, Chief Complaint `Chest pain since morning`. Submit.

- [ ] Toast reads **"Registered — queue token #N issued"** (it names the number)

## 3 · Reception reflects the visit
Back on the list, search the patient you just created.

- [ ] TODAY shows an amber pill: **`#N Awaiting triage`**
- [ ] **That row's Triage button is greyed and unclickable** — hovering shows *"Already in today's workflow"*
- [ ] Every other row's Triage button is still amber and live

## 4 · Nurse — the worklist
`nurse@simsbox.demo` → **Triage**

- [ ] A **"Waiting for Triage"** panel sits at the top of the left column, above the search box, with a count badge and a Refresh link
- [ ] Your patient is listed as: `#N · Name · MRN · Dr. Meera Iyer · <the complaint> · 0 min`
- [ ] The token badge is **red** for Urgent/Emergency, grey otherwise
- [ ] Wait time turns **red past 30 minutes**
- [ ] **Click the entry** → the patient banner fills and Chief Complaint prefills. Nobody retypes.

## 5 · Complete the triage
- [ ] Enter vitals (BP systolic/diastolic, heart rate)
- [ ] Pick an acuity on the right — labels are **Emergency / Critical / Urgent / Semi-Urgent / Routine** (not RED/YELLOW/GREEN)
- [ ] **Complete Triage & Assign Doctor**
- [ ] The patient **disappears from Waiting for Triage** on its own

## 6 · Reception flips
Return to Patient Registration, search the patient again.

- [ ] TODAY now shows a teal pill: **`#N Triaged`**

## 7 · Doctor — the queue
`doctor@simsbox.demo` → **Patient Queue**

- [ ] `MY PATIENTS TODAY 1` / `WAITING 1`
- [ ] Your patient is in the table at token `#N`
- [ ] **CHIEF COMPLAINT is populated** — not `—`. Before triage it shows reception's wording; after triage the nurse's assessment replaces it
- [ ] PRIORITY reflects the acuity (Emergency/Critical → `EMERGENCY`, Urgent → `URGENT`, else `ROUTINE`)
- [ ] **Consult** and **No-Show** buttons are present

---

## 8 · Appointment check-in
`reception@simsbox.demo` → **Appointments**

- [ ] ⚠ The date defaults to **today, which has no appointments** — set it to `2026-07-30` first, or the table looks empty
- [ ] SCHEDULED rows lead with an amber **⇥ Check In**; CANCELLED rows show **only Print**
- [ ] Click Check In → toast **"Checked in — token #N"**
- [ ] **The button is replaced by a teal `✓ Checked in #N` pill** — the evidence survives after the toast fades
- [ ] That patient now appears in the nurse's Waiting for Triage list too
- [ ] Appt # / Doctor / Dept / Time / Type are all populated (no blanks, no dashes)

## 9 · Advance an already-registered patient
On the patient list, pick any row whose TODAY reads `—`.

- [ ] Click the amber **Triage** button
- [ ] Toast: **"<Name> sent to triage — token #N"**
- [ ] The pill appears and the button greys out
- [ ] Clicking again is impossible (disabled), and the API reuses the token rather than issuing a second one

## 10 · Referral
Any role with access → **Referral**

- [ ] The **Patient** column shows **names with the MRN beneath** — it used to print a raw UUID
- [ ] **Print** a referral → the letter carries Patient Name, Patient ID, Age/Gender and Contact

---

## Department-wise queueing

Branch Clinic now has a doctor in three departments, so the department features are demoable:

| Doctor | Department | Login |
|---|---|---|
| Dr. Meera Iyer | General Medicine | `doctor@simsbox.demo` |
| Dr. Anjali Krishnan | Pediatrics | `pediatrics@simsbox.demo` |
| Dr. Sanjay Pillai | Emergency | `emergency@simsbox.demo` |

- Register patients against **different doctors**; each token takes that doctor's department automatically
- The nurse's **Waiting for Triage** panel then shows **filter chips with per-department counts**
  (they stay hidden while everyone is in one department — that is deliberate, not a bug)
- To scope a nurse to one department: **Admin → Users & Staff → Edit** → tick Departments.
  None ticked = sees every department, which is how every account starts.
- **▲▼ on each row** reorders the queue manually, on both the nurse worklist and the doctor's queue.
  The arrows are disabled across urgency bands — you cannot lift a routine patient above an emergency.

## ⊘ Still not demoable on this data

- **Dr. Rahul Sharma** is at Main Campus, so he never appears in Priya's dropdown — correct
  location scoping, not a fault.
- Tokens created before 2026-08-04 show **Unassigned**; only new ones carry a department.

## Clearing your test data

Everything above creates real rows. To reset: delete today's queue tokens and their triage records,
then the test patients. Tokens are scoped to (tenant, location, `queueDate` = today at UTC midnight).
