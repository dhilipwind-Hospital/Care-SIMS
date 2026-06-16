# AI Features — UI Test Plan
Tenant: **Apple**  Password (all logins): **Demo@1234**  Base URL: **care-sims.vercel.app**
Total time: 15-25 minutes for all 5

This plan was generated from the actual deployed frontend code. Every button label and field name below is what literally renders in the UI. Live API tests of all 5 features passed before this plan was written, so if a step fails in your browser the regression is in the FE rendering layer, not the AI integration.

---

## Credentials reference

| Role | Email | Password | Login URL | Used for |
|---|---|---|---|---|
| Admin | `admin@apple.local` | `Demo@1234` | /login | F1, F4, F5 |
| Doctor | `doctor.demo@apple.local` | `Demo@1234` | /doctor/login | F2 |
| Nurse | `nurse@apple.local` | `Demo@1234` | /login | F3 |

> All accounts target the **Apple** tenant. The doctor login is on a different route (`/doctor/login`, not `/login`).

---

## Pre-flight: confirm the deploy and key are good

Before doing any UI test, run **F4 first** — it has the fewest moving parts (no patient/admission selection, plain-text response, no JSON parsing). If F4 works, the model+key+routing are all good and any other failure is feature-specific.

---

## F1: Discharge Summary AI Draft

**Login**
- Email: `admin@apple.local`
- Password: `Demo@1234`
- URL: care-sims.vercel.app/login

**Where to find it (sidebar route)**
Sidebar → click "Discharge Summary".

**Pre-test setup (what data you need on screen)**
- At least one admission record must exist in the tenant (the AI button only appears after an admission is picked from the searchable dropdown).
- Be ready to discard the draft after testing — clicking "Create Draft" will persist the summary.

**Test 1 — Happy path**

Steps:
1. Click the teal "+ New Discharge Summary" button in the top-right of the page.
2. The "Create Discharge Summary" card opens. In the first dropdown labeled "Search admission *", type any patient name and pick an admission row.
3. As soon as the admission is selected, a purple-to-blue gradient button labeled "Generate Draft with AI" (with a Sparkles icon) appears in the header of the card, and a purple info banner appears below the heading: "AI uses the patient's consultations, prescriptions and lab orders during this admission to draft the fields. Review every field — the doctor is responsible for the final content."
4. Click "Generate Draft with AI".
5. Wait for the button to finish (it changes to "Drafting with AI…" with a spinning loader while the request is in flight).
6. After the toast appears, scroll down and inspect every field of the form (Diagnosis on Admission, Diagnosis on Discharge, Treatment Given, Investigation Summary, Condition at Discharge, Follow-up Instructions, Dietary Advice, Activity Restrictions, plus Admission Date / Discharge Date inputs).

Expected (in this order as you go through the steps):
- After clicking "+ New Discharge Summary", the form card appears with three SearchableSelect inputs ("Search admission *", "Search patient *", "Search doctor *") and date inputs.
- As soon as an admission is chosen, the gradient "Generate Draft with AI" button appears in the card header, and the purple info banner appears underneath.
- After clicking "Generate Draft with AI", the button label switches to "Drafting with AI…" with a spinning Loader2 icon and is disabled.
- Within a few seconds, a green toast appears reading exactly: "AI draft applied — review every field before saving".
- The Patient and Doctor selects auto-populate, the Admission Date and Discharge Date inputs auto-fill, and the diagnosis / treatment / investigation / condition / follow-up / dietary / activity textareas are populated with AI-generated text. If the AI returned discharge medications, they are appended to the Follow-up Instructions textarea under a "Discharge medications:" header.
- Approximate duration: ~3-5 seconds for the API call.

Pass criteria — ALL of these must be true:
- The "Generate Draft with AI" button is the EXACT label (not "Generate with AI", not "Draft with AI") and uses a purple-to-blue gradient background with a Sparkles icon.
- The toast "AI draft applied — review every field before saving" appears (success, green).
- The "Diagnosis on Admission *" textarea is non-empty after the draft applies.
- At least 4 of the 8 AI-driven textareas (diagnosisOnAdmission, diagnosisOnDischarge, treatmentGiven, investigationSummary, conditionAtDischarge, followUpInstructions, dietaryAdvice, activityRestrictions) are populated.
- The Admission Date input shows a real date value (not blank) after the draft applies.
- The purple info banner about AI using consultations/prescriptions/lab orders is visible above the form fields before clicking the AI button.

**Test 2 — Edge case (admission with no clinical activity)**

Steps:
1. Click "+ New Discharge Summary".
2. In "Search admission *", pick an Apple-tenant admission that has no consultations, prescriptions or lab orders inside the admission window (any of the seeded Apple admissions will do — they all have no clinical activity).
3. Click "Generate Draft with AI" and wait for the toast.
4. Read each AI-populated textarea.

Expected:
- The same green toast appears: "AI draft applied — review every field before saving".
- Every clinical textarea (Diagnosis on Admission, Diagnosis on Discharge, Treatment Given, Investigation Summary, Condition at Discharge, Follow-up Instructions, Dietary Advice, Activity Restrictions) contains the literal fallback string "To be reviewed by treating doctor" (or a very close variant from the prompt's fallback instructions).
- No "Discharge medications:" block is appended to Follow-up Instructions (because dischargeMedications was returned as an empty array).
- The Admission Date and Discharge Date inputs still auto-fill from the admission record.

Pass criteria:
- The toast still says "AI draft applied — review every field before saving" — the AI does NOT error out for low-data admissions.
- Each clinical textarea reads "To be reviewed by treating doctor" — i.e. the model honestly admits "I don't have data" rather than hallucinating a fake diagnosis.
- No fabricated drug names, lab values, or procedure names appear anywhere on the form.

**Reference: what the live API actually returned for this feature**
Live test returned all 9 fields populated. Apple admission had no clinical activity inside the admission window, so all fields came back "To be reviewed by treating doctor" — that is the deliberate fallback the prompt instructs. Took 3.4 seconds. Model: gemini-2.5-flash. dischargeMedications was an empty array.

**Verify in Supabase SQL Editor after the test**
```sql
SELECT feature, status, duration_ms, prompt_chars, response_chars,
       LEFT(response_head, 200) AS response_preview, created_at
FROM ai_audit_logs
WHERE feature = 'DISCHARGE_SUMMARY'
ORDER BY created_at DESC LIMIT 3;
```

Expected:
- A new row with feature = 'DISCHARGE_SUMMARY' and status = 'OK'.
- duration_ms in the range matching the live API timing above (~3000-5000 ms).
- response_chars should be > 100 for a real response.
- If status = 'ERROR', the error_message column will tell you why.

**Common ways this can fail**
- "Generate Draft with AI" button never appears after picking an admission → the admissionId is not getting set; check the SearchableSelect dropdown — you may have typed but not clicked a row. The button is gated on `form.admissionId` being truthy.
- Red toast "AI draft failed" or "AI could not produce a structured draft" → the backend Gemini call returned an error or unparseable JSON; check the network tab for the POST `/discharge-summary/admission/:id/draft-with-ai` response, and check `ai_audit_logs` for status = 'ERROR' with an error_message.
- Toast "Pick an admission first" → you clicked the AI button before selecting an admission; in practice the button is hidden until then, so this only fires if the admissionId state was cleared.
- AI button spins on "Drafting with AI…" for >30 seconds with no toast → the request is hanging; the Gemini API key may be missing or rate-limited on the backend, or the network call is stuck. Check the browser network tab for a pending request.
- All textareas remain blank after the success toast → the backend returned `data.draft = null` and the warning toast path was hit; verify the response shape in network tab matches `{ draft: { ... } }`.

---

## F2: Patient History AI Summary

**Login**
- Email: `doctor.demo@apple.local`
- Password: `Demo@1234`
- URL: care-sims.vercel.app/doctor/login

**Where to find it (sidebar route)**
Sidebar → click "New Consultation" → in the patient banner, type a name in "Search patient by name or ID…" and pick a patient (or pick from "Your queue today"). The "AI History Summary" card appears at the top of the Overview tab.

**Pre-test setup (what data you need on screen)**
- A patient must be selected (the AI card only renders when `patientId` is set).
- Patient should have at least some clinical history (prior consultations / admissions / labs) for the bullets to be meaningful — works on any seeded Apple patient.

**Test 1 — Happy path**

Steps:
1. Click "New Consultation" in the left sidebar.
2. In the "Select Patient to Begin Consultation" search box at the top, either type a patient name into "Search patient by name or ID…" or pick one from the "Your queue today" dropdown.
3. Click the patient row to select them — the patient banner (initials avatar + name + patient ID) appears.
4. Stay on the "Overview" tab (default). Locate the card with the purple left border at the top of the main column — header reads "AI History Summary" with a sparkles icon next to it.
5. If the card body shows the italic placeholder "No summary yet. Click Generate to build one from this patient's history.", click the purple-outlined "Generate" button in the top-right of the card.
6. If the card already has a cached summary, click the "Refresh" button (same position, with a circular-arrow icon) to regenerate.

Expected (in this order as you go through the steps):
- After selecting the patient, the purple-bordered "AI History Summary" card appears immediately. While the cached fetch runs, the body shows "Loading summary…" in light-grey italic.
- If a cache exists, the bullet text renders in the card body and the header shows a tiny grey "Generated <localized timestamp>" line next to the title.
- When you click Generate/Refresh, the button label changes to "Generating…" with a spinning Loader2 icon, and the button is disabled.
- On success: a green toast "AI summary refreshed" appears, the bullet text in the card updates (typical output is a 5-7 line recap starting with sex/allergies/chronic conditions and admission summary), and the "Generated …" timestamp updates to the current time.
- Approximate duration: 3-8 seconds for the AI POST; cached GET on patient pick is sub-second.

Pass criteria — ALL of these must be true:
- The card with the purple left border (`#7C3AED`), sparkles icon, and title "AI History Summary" is visible above the Triage Assessment / Subjective cards.
- The Generate/Refresh button shows the "Generating…" spinner state while the request is in flight.
- After completion, the toast text reads exactly "AI summary refreshed".
- The card body contains multi-line summary text (not the italic "No summary yet…" placeholder).
- The header shows a "Generated <date/time>" stamp matching roughly the moment you clicked the button.
- The disclaimer line "AI-generated. Verify with the patient and clinical chart before acting." is visible at the bottom of the card.

**Test 2 — Edge case (cache hit on reload)**

Steps:
1. With a summary already generated for the patient (from Test 1), note the "Generated <timestamp>" value in the card header.
2. Hard-refresh the page (Cmd+R / Ctrl+R) — you will land back on the patient search; reselect the same patient via the search box.
3. Watch the AI History Summary card body and header as the patient loads.
4. Do NOT click Generate/Refresh.

Expected:
- The card body briefly shows "Loading summary…" then immediately populates with the same bullet text as before.
- The "Generated <timestamp>" header value is IDENTICAL to the timestamp from step 1 (no new AI call was made — the cached row from `patients.ai_history_summary` is returned).
- No toast appears (because Refresh was not clicked).
- The button label reads "Refresh" (not "Generate") because a cached summary exists.

Pass criteria:
- The Generated timestamp after reload matches the pre-reload timestamp exactly.
- The button reads "Refresh", confirming cached state.
- No additional `PATIENT_HISTORY` row is written to `ai_audit_logs` for this reload (cache hit means no AI call).

**Reference: what the live API actually returned for this feature**
Live test: first GET returned cached=false (generated fresh), saved to patients.ai_history_summary. Second GET returned cached=true with same timestamp — proving no extra AI call. Sample bullet output started "Male, no known allergies or chronic conditions. Admitted 2026-..."

**Verify in Supabase SQL Editor after the test**
```sql
SELECT feature, status, duration_ms, prompt_chars, response_chars,
       LEFT(response_head, 200) AS response_preview, created_at
FROM ai_audit_logs
WHERE feature = 'PATIENT_HISTORY'
ORDER BY created_at DESC LIMIT 3;
```

Expected:
- A new row with feature = 'PATIENT_HISTORY' and status = 'OK'.
- duration_ms in the range matching the live API timing above.
- response_chars should be > 100 for a real response.
- If status = 'ERROR', the error_message column will tell you why.

**Common ways this can fail**
- Gemini API key missing / invalid — Generate spinner runs then a red toast appears with the backend error (e.g. "AI summary failed" or the API's `response.data.message`); card body stays on "No summary yet…". `ai_audit_logs` will show a row with status = 'ERROR'.
- Backend route `/patients/:id/ai-summary/refresh` returns 404/500 — same red toast "AI summary failed"; the "Generated" timestamp does NOT update and the bullets do not change.
- Cache invalidation broken — clicking Refresh succeeds (green toast) but the bullet text and "Generated …" stamp do not change on screen, indicating the response wasn't written back to state. Reloading and seeing the OLD timestamp confirms the write didn't happen.
- No patient selected — the entire purple-bordered card is absent (the card only renders when `patientId` is truthy); confirm the patient banner shows initials + name before troubleshooting the AI.
- Patient has zero history — summary still generates but reads as low-signal / sparse (e.g. "Insufficient prior records"); not a failure of the AI feature itself, but a sign the patient row is empty.

---

## F3: Triage AI Suggestion

**Login**
- Email: `nurse@apple.local`
- Password: `Demo@1234`
- URL: care-sims.vercel.app/login

**Where to find it (sidebar route)**
Sidebar → Triage (under NURSE STATION) → opens "Triage Station" page at `/app/nurse/triage`.

**Pre-test setup (what data you need on screen)**
- In the "Patient Banner" card at the top-left, type a name into the `Search patient by name or ID…` input and pick a patient from the dropdown (any patient not already triaged today). The banner will show the patient name, age, gender, and ID.
- Scroll to the "Vital Signs Recording" card and enter vitals (these get sent to the AI). Fields: `BP Systolic (mmHg)`, `BP Diastolic (mmHg)`, `Heart Rate (bpm)`, `Temp (°C)`, `SpO₂ (%)`, `Resp. Rate (/min)`, `Pain Scale (0-10)`.

**Test 1 — Happy path**

Steps:
1. Select a patient in the Patient Banner (search and click a result).
2. In the "Vital Signs Recording" card, enter: `BP Systolic` = 160, `BP Diastolic` = 95, `Heart Rate` = 110, `SpO₂` = 93, `Resp. Rate` = 24, `Pain Scale (0-10)` = 8.
3. Scroll to the "Chief Complaint & History" card. In the `Chief Complaint` field, type: `Chest pain radiating to left arm, shortness of breath, sweating`.
4. (Optional) Add to `Brief History`: `Started 2 hours ago, no prior cardiac history`.
5. Click the purple/blue gradient button labelled `Get AI Suggestion` (top-right of the "Chief Complaint & History" card; shows a sparkles icon).
6. Wait while the button text changes to `Thinking…` with a spinning loader.
7. When the result appears, read the new card that renders below "Chief Complaint & History" — it is titled `AI Triage Suggestion` with a Sparkles icon and a **purple left border (#7C3AED)**.
8. Click the `Apply Priority` button inside the AI card.
9. Look at the right-hand "Triage Priority" card and confirm the level the AI chose is now selected (the matching tile is highlighted with a coloured border + tinted background).

Expected (in this order as you go through the steps):
- After clicking `Get AI Suggestion`, the button immediately shows `Thinking…` with a spinning Loader2 icon and becomes disabled.
- After about 5–10 seconds, a new card appears with a purple left border, titled `AI Triage Suggestion` next to a purple Sparkles icon, with an `X` dismiss button in the top-right.
- Inside the card, top section: a coloured dot + bold text `Suggested: Critical` (for ORANGE) followed by the AI's one-sentence rationale in smaller grey text, with an `Apply Priority` button on the right (purple background).
- Below that: a red-tinted `RED FLAGS TO VERIFY` block with an AlertTriangle icon and a bulleted list (e.g. Hypoxia, severe chest pain, tachycardia).
- A two-column grid showing `DIFFERENTIAL` (bulleted list — ACS, Aortic Dissection, PE) and `RECOMMENDED DIAGNOSTICS` (bulleted list — ECG, Troponins, Chest X-ray, SpO2 monitoring).
- A grey line: `Suggested specialty: Cardiology`.
- Bottom of the card, separated by a thin top border: the disclaimer text starting `AI suggestion only. Nurse must review and the attending doctor must confirm…`.
- After clicking `Apply Priority`, a green toast appears: `Priority applied: ORANGE`, and the `Apply Priority` button disappears (it only renders when the form level differs from the AI's pick).
- Approximate duration: 5–10 seconds from click to card render.

Pass criteria — ALL of these must be true:
- The `AI Triage Suggestion` card actually appears with a visible purple left border.
- The `Suggested:` line shows one of RED/ORANGE/YELLOW/GREEN/BLACK (label form: Emergency/Critical/Urgent/Semi-Urgent/Routine) — for the chest-pain prompt it should be `Critical` (ORANGE) or `Emergency` (RED).
- At least one of `Differential` or `Recommended Diagnostics` is populated (non-empty bulleted list).
- The disclaimer at the bottom of the card ends with `No drug suggestions are provided.` (or shows the server-supplied warning) — verify NO drug/medication recommendations are anywhere in the card.
- Clicking `Apply Priority` changes the selected tile in the right-hand "Triage Priority" card (visible coloured border + tinted background) AND shows the toast `Priority applied: ORANGE` (or whatever level was suggested).

**Test 2 — Edge case (trivial complaint should drop to GREEN)**

Steps:
1. If the AI card from Test 1 is still visible, click the `X` in its top-right to dismiss it.
2. Clear the `Chief Complaint` field and replace it with: `Mild paper cut on finger, no bleeding now`.
3. Clear all the vitals you previously entered (delete the values so each field is empty / `—`).
4. Click `Get AI Suggestion` again.
5. Wait for the new AI Triage Suggestion card to render.

Expected:
- A new `AI Triage Suggestion` card appears within ~5–10 seconds.
- The `Suggested:` line shows `Semi-Urgent` (GREEN) or `Routine` (BLACK) — the coloured dot is green or grey, NOT red/orange.
- The `Red Flags to Verify` block is either absent OR contains nothing alarming (e.g. empty list, or only minor items).
- The differential list contains benign items (e.g. superficial laceration, minor skin injury), no life-threatening conditions like ACS / PE / sepsis.
- The disclaimer line is still present at the bottom.

Pass criteria:
- AI returns a green/black-tier priority for the trivial complaint (NOT ORANGE or RED).
- No drug names appear anywhere in the card.
- The rationale text actually mentions the trivial nature of the complaint (e.g. "minor", "superficial", "low acuity").
- The `Apply Priority` button still works and toasts `Priority applied: GREEN` (or BLACK) when clicked.

**Reference: what the live API actually returned for this feature**
Live test with chief complaint "Chest pain radiating to left arm, shortness of breath, sweating", BP 160/95, HR 110, SpO2 93, pain 8 returned:
- suggestedPriority: ORANGE
- priorityRationale: "Severe chest pain with radiation, shortness of breath, sweating, tachycardia, tachypnea, and hypoxia (SpO2 93%) in a high-risk patient indicate a critical, potentially life-threatening condition requiring immediate intervention."
- differentialConditions: ["Acute Coronary Syndrome (ACS)", "Aortic Dissection", "Pulmonary Embolism (PE)"]
- recommendedDiagnostics: ["12-lead ECG", "Cardiac Troponins", "Chest X-ray", "Continuous SpO2 monitoring"]
- recommendedSpecialty: Cardiology
- redFlags: ["Hypoxia (SpO2 93%)", "Severe chest pain (8/10)", "Tachycardia (HR 110 bpm)"]
Took 6.7 seconds. NO drug suggestions are returned by this feature — that is intentional.

**Verify in Supabase SQL Editor after the test**
```sql
SELECT feature, status, duration_ms, prompt_chars, response_chars,
       LEFT(response_head, 200) AS response_preview, created_at
FROM ai_audit_logs
WHERE feature = 'TRIAGE_SUGGESTION'
ORDER BY created_at DESC LIMIT 3;
```

Expected:
- A new row with feature = 'TRIAGE_SUGGESTION' and status = 'OK'.
- duration_ms in the range matching the live API timing above (roughly 4000–10000 ms).
- response_chars should be > 100 for a real response.
- If status = 'ERROR', the error_message column will tell you why.

**Common ways this can fail**
- Button is disabled / nothing happens on click: the `Get AI Suggestion` button is disabled until `Chief Complaint` has at least 1 non-whitespace character. If you click with a blank complaint you'll see a red toast `Enter the chief complaint first`. Fix: type the complaint, then click.
- Red toast `AI suggestion failed` (or a server error string) appears and no card renders: the backend `/triage/ai-suggest` call rejected — usually missing AI API key, rate-limit, or model timeout. Check `ai_audit_logs` for a row with `status = 'ERROR'` and read `error_message`.
- The button stays stuck on `Thinking…` for more than ~30 seconds: the request is hanging. Open the browser DevTools Network tab and look for `POST /triage/ai-suggest` — it will either be pending (backend stuck) or returning 500/504.
- The card renders but priority is obviously wrong (e.g. chest pain → GREEN): the AI returned weak JSON or the model is degraded. Sanity-check by reading the `priorityRationale` — if it doesn't reference the vitals/complaint you entered, the model is hallucinating.
- The `Apply Priority` button is missing inside the AI card: this is expected if the current `triageLevel` already matches the AI's suggestion — change the right-side priority tile to a different level and the `Apply Priority` button reappears.
- Any drug / medication name appears in the AI card: this is a regression — v1 explicitly excludes drug suggestions and the disclaimer states `No drug suggestions are provided.`. File a bug.

---

## F4: Revenue Insights

**Login**
- Email: `admin@apple.local`
- Password: `Demo@1234`
- URL: care-sims.vercel.app/login

**Where to find it (sidebar route)**
Sidebar → Reports (lands on Reports & Analytics) → click the "Revenue" tab in the tab bar.

**Pre-test setup (what data you need on screen)**
- None — works on a fresh load. The AI Insights card is independent of the date filter (the comment in the code says: "always looks at 'now'" — last 30 days vs the 30 days before). Apple tenant has 4 invoices total, which is enough for the API to respond with low-volume commentary.

**Test 1 — Happy path**

Steps:
1. After login, click "Reports" in the left sidebar (the BarChart3 icon labelled "Reports" pointing at `/app/admin/reports`).
2. Page title reads "Reports & Analytics" with subtitle "Hospital performance overview". The default tab is "Patient Statistics" — click the "Revenue" tab (DollarSign icon) in the gray rounded tab bar at the top.
3. Locate the card at the very top of the Revenue tab content with a purple left border (4px, color `#7C3AED`). The header reads "AI Revenue Insights" with a purple Sparkles icon and the muted sub-label "Last 30 days vs the 30 days before".
4. The card body shows the italic placeholder: "Click Generate to get AI commentary on what changed in the last month."
5. Click the button on the right of the card. While idle with no insights yet, it reads "Generate" with a Sparkles icon (purple border, purple text, `border-purple-200 text-purple-700`).
6. Wait for the API call to `/reports/ai-revenue-insights` to complete.

Expected (in this order as you go through the steps):
- Immediately after clicking, the button label changes to "Analysing…" with a spinning Loader2 icon, and the button becomes disabled (50% opacity).
- The card body replaces the placeholder with the italic loading line: "Looking at the last 60 days of invoices…"
- After roughly 4 seconds, the loader disappears, the button label changes to "Refresh" with a RefreshCw icon, and the card body fills with plain-text AI commentary (whitespace preserved, leading-relaxed), e.g. starting with something like "Gross billing increased from ₹0 to ₹9,776, driven by 4 new invoices in…".
- A muted sub-label appears next to "Last 30 days vs the 30 days before" reading "· Generated <local timestamp>".
- The disclaimer footer at the bottom of the card reads: "AI-generated commentary on past data — not a forecast. Verify against the underlying numbers below."
- Approximate duration: ~4 seconds (matches the live API timing).

Pass criteria — ALL of these must be true:
- The purple-left-border "AI Revenue Insights" card is visible at the top of the Revenue tab, above the four KPI cards (Total Billed / Total Collected / Outstanding / Invoices).
- The button transitions Generate → Analysing… → Refresh without errors and without a red toast.
- The card body shows multi-sentence plain-text commentary (no JSON, no code fences), and explicitly acknowledges the small number of invoices (Apple has 4 invoices total — the AI should not overstate trends).
- A "Generated <timestamp>" stamp appears next to the date-range sub-label after generation.
- The underlying KPI cards and Revenue Summary table below the AI card still render correctly and are unaffected by the AI call.

**Test 2 — Edge case (low-data honesty)**

Steps:
1. Stay on the Revenue tab after Test 1.
2. Click the "Refresh" button (RefreshCw icon) on the AI Revenue Insights card.
3. Read the regenerated commentary carefully.

Expected:
- Button cycles Refresh → Analysing… → Refresh again with a new "Generated <timestamp>".
- Commentary remains brief (Apple only has 4 invoices) and should explicitly note small sample size, low volume, or use hedging language like "based on limited data", "only N invoices", or similar — it should NOT confidently project trends, growth rates, or seasonality from 4 data points.
- No "Total Billed", "Outstanding", or other KPI tile values change in the rest of the tab.

Pass criteria:
- The new commentary text differs from Test 1 (or, if identical due to caching, the timestamp still updates) and remains under ~600 characters of plain markdown bullets/sentences.
- The text honestly acknowledges low volume rather than fabricating numbers — no claims like "strong growth" or specific percentages that aren't grounded in 4 invoices.
- No red error toast appears; the card never falls back to the gray italic "Click Generate…" placeholder.

**Reference: what the live API actually returned for this feature**
Live test returned: "Gross billing increased from ₹0 to ₹9,776, driven by 4 new invoices in..." (truncated at 600 chars in API test). Apple has 4 invoices total so commentary will be brief and explicitly call out low volume. Took 4.1 seconds. Plain markdown bullets, NOT structured JSON.

**Verify in Supabase SQL Editor after the test**
```sql
SELECT feature, status, duration_ms, prompt_chars, response_chars,
       LEFT(response_head, 200) AS response_preview, created_at
FROM ai_audit_logs
WHERE feature = 'REVENUE_INSIGHTS'
ORDER BY created_at DESC LIMIT 3;
```

Expected:
- A new row with feature = 'REVENUE_INSIGHTS' and status = 'OK'.
- duration_ms in the range matching the live API timing above (~3,500–5,000 ms).
- response_chars should be > 100 for a real response.
- If status = 'ERROR', the error_message column will tell you why.

**Common ways this can fail**
- The button stays stuck on "Analysing…" with the spinner forever — backend `/reports/ai-revenue-insights` endpoint is hanging or the API key is missing on the server. Look in the network tab for a pending or 500 response on `/reports/ai-revenue-insights`.
- The card silently reverts to the gray italic "Click Generate to get AI commentary on what changed in the last month." placeholder after Analysing… — the API returned a non-OK status (the catch block sets insights to null with no toast). Check the browser network tab for the failed call and inspect `ai_audit_logs` for an ERROR row.
- The button label never changes from "Generate" (with Sparkles) to "Refresh" (with RefreshCw) after a successful call — `r.data.insights` was empty/null. The API responded 200 but the LLM returned no text; look at `response_chars` in `ai_audit_logs` — it will be 0 or very small.
- The commentary text contains raw JSON, `{...}`, or schema-like keys instead of plain readable bullets — the system prompt isn't enforcing markdown output. Compare with the "Reference" snippet above.
- The "Generated <timestamp>" sub-label never appears even though commentary rendered — the backend isn't returning `generatedAt`. Functionally fine, but indicates a backend response-shape regression.

---

## F5: Seasonal Trends

**Login**
- Email: `admin@apple.local`
- Password: `Demo@1234`
- URL: care-sims.vercel.app/login

**Where to find it (sidebar route)**
Sidebar → Reports → click the "OPD Performance" tab.

**Pre-test setup (what data you need on screen)**
- None — works on a fresh load. The "AI Seasonal Trends" card sits at the top of the OPD Performance tab and is empty until you click Generate.

**Test 1 — Happy path**

Steps:
1. Log in with the credentials above.
2. In the left sidebar, click "Reports".
3. On the Reports page, click the "OPD Performance" tab in the tab row.
4. Locate the card at the very top of the tab with a purple left border, a purple sparkles icon, and the heading "AI Seasonal Trends".
5. Confirm the placeholder italic grey text reads: "Click Generate to see what conditions are trending this month vs the same month last year."
6. Click the "Generate" button on the right side of that card (small pill-shaped button with a purple sparkles icon and purple border).
7. Wait while the button switches to "Analysing…" with a spinning loader and the body text changes to "Looking at this month vs last year…".
8. Wait for the response to render in the card body.

Expected (in this order as you go through the steps):
- Immediately after clicking Generate, the button label changes from "Generate" to "Analysing…" and shows a spinning loader icon.
- The card body text replaces the placeholder with the italic grey "Looking at this month vs last year…" message.
- After ~3-6 seconds, the body fills with plain markdown bullet text (whitespace-pre-wrap) summarising this month vs the same month last year — e.g. "So far this June, total records are 2, up from 0 last June."
- The header line gains three small grey meta chips: the current month name (e.g. "June this year vs last year"), a "· 2 this year, 0 last year" volume chip, and a "· Generated <local timestamp>" chip.
- The button label changes from "Analysing…" to "Refresh" and the icon swaps to a circular refresh arrow.
- Below the body the small grey footnote reads: "Lookback only — what we saw, not what's coming. Use as a hint for stocking and rostering, not a forecast."
- Approximate duration: 4 seconds.

Pass criteria — ALL of these must be true:
- The card with the purple left border and "AI Seasonal Trends" title is at the top of the OPD Performance tab.
- After clicking Generate, narrative text (more than ~100 characters) appears in the card body referencing the current month and a year-over-year comparison.
- The header meta line shows the month name plus a "X this year, Y last year" chip with numeric values.
- A "Generated <timestamp>" chip with a real, current local time appears.
- The button now reads "Refresh" (not "Generate") and shows a circular refresh icon.
- The "Lookback only — what we saw, not what's coming…" footnote is visible underneath.

**Test 2 — Edge case (low-data honesty)**

Apple tenant has very sparse historical OPD data, so this verifies the AI is honest about small numbers rather than overclaiming a "trend".

Steps:
1. With the AI Seasonal Trends card already populated from Test 1, read the body text carefully.
2. Click "Refresh" once to regenerate.
3. Read the new body text and the volume chip in the header.

Expected:
- The volume chip shows very small integers (e.g. "· 2 this year, 0 last year" or similar single-digit values).
- The body uses cautious wording (e.g. "low volume — interpret with caution", "only N records", or a single comparison bullet without sweeping claims).
- The AI does NOT fabricate disease-specific spikes (no invented "dengue up 300%" type claims when raw counts are 0-2).
- The card still respects the "Lookback only" footnote and does not present itself as a forecast.

Pass criteria:
- Volume chip integers in the header match the magnitude of the narrative (no narrative claim of "hundreds of cases" when the chip says 2).
- Narrative text is plain markdown bullets, not raw JSON or a code block.
- If volumes are 0 or 1-2, the response includes a caveat about low data rather than a confident trend statement.

**Reference: what the live API actually returned for this feature**
Live test returned: "So far this June, total records are 2, up from 0 last June." Apple has very sparse historical data so commentary will be a single comparison bullet plus possibly a "low volume — interpret with caution" note. currentMonth field comes back as "June" with thisYearVolume=2, lastYearVolume=0. Took 4.2 seconds. Plain markdown bullets, NOT structured JSON.

**Verify in Supabase SQL Editor after the test**
```sql
SELECT feature, status, duration_ms, prompt_chars, response_chars,
       LEFT(response_head, 200) AS response_preview, created_at
FROM ai_audit_logs
WHERE feature = 'SEASONAL_TRENDS'
ORDER BY created_at DESC LIMIT 3;
```

Expected:
- A new row with feature = 'SEASONAL_TRENDS' and status = 'OK'.
- duration_ms in the range matching the live API timing above (roughly 3000-6000 ms).
- response_chars should be > 100 for a real response.
- If status = 'ERROR', the error_message column will tell you why.

**Common ways this can fail**
- Network/API failure: the button flips back to "Generate" with no body text and no meta chips appear — the `.catch(() => setTrends(null))` swallows the error silently, so there is no toast. Spot it by the absence of a "Generated <timestamp>" chip after waiting more than ~10 seconds.
- Stuck loading state: button stays on "Analysing…" with the spinner for more than ~15 seconds and the body keeps showing "Looking at this month vs last year…" — indicates the `/reports/ai-seasonal-trends` endpoint never returned. Check the Network tab for a hanging or 5xx request.
- Missing meta chips even when body text renders: the header shows the AI Seasonal Trends title but no month name and no "X this year, Y last year" chip — means the backend returned `insights` but not `currentMonth` / `thisYearVolume` / `lastYearVolume`, so the year-over-year comparison context is missing.

---

## End-to-end audit log check (run once after all 5 tests)

This single query confirms all 5 features were called, all succeeded, and shows their per-feature stats.

```sql
SELECT
  feature,
  status,
  COUNT(*)                  AS calls,
  ROUND(AVG(duration_ms))::int AS avg_ms,
  SUM(prompt_chars)         AS prompt_chars_total,
  SUM(response_chars)       AS response_chars_total,
  MAX(created_at)           AS most_recent
FROM ai_audit_logs
WHERE created_at > now() - interval '2 hours'
GROUP BY feature, status
ORDER BY feature, status;
```

Expected after running all 5 UI tests:

| feature | status | calls |
|---|---|---|
| DISCHARGE_SUMMARY | OK | at least 1 |
| PATIENT_HISTORY | OK | at least 1 |
| REVENUE_INSIGHTS | OK | at least 1 |
| SEASONAL_TRENDS | OK | at least 1 |
| TRIAGE_SUGGESTION | OK | at least 1 |

If any row shows `status = 'ERROR'`, run this to see why:

```sql
SELECT feature, error_message, created_at
FROM ai_audit_logs
WHERE status = 'ERROR'
ORDER BY created_at DESC LIMIT 10;
```

---

## Cost / token sanity check

Free tier limit: 1,500 requests/day. This query shows how many you have used:

```sql
SELECT
  COUNT(*) AS calls_last_24h,
  ROUND(SUM(prompt_chars) / 4.0)::int AS approx_input_tokens,
  ROUND(SUM(response_chars) / 4.0)::int AS approx_output_tokens
FROM ai_audit_logs
WHERE created_at > now() - interval '24 hours';
```

Walking through all 5 tests = ~6-10 calls. You will be nowhere near the limit.

---

## If a single feature fails — what to send back

Copy and send these three things:
1. Which test number failed (e.g. "F3 Test 1 step 4").
2. A screenshot of what you saw on screen.
3. The output of the per-feature audit query for that feature (it's in each feature's section above).

That is enough for me to diagnose without re-deploying or making you re-run anything.
