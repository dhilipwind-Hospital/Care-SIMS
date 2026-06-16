# Next 5 AI Features — Plan

Beyond the 5 already shipped (Discharge Summary, Patient History, Triage Suggestion, Revenue Insights, Seasonal Trends), here are the next five we could build. Each one is doable with our current data + Gemini. Honest risk and effort estimates below.

---

## 1. AI SOAP Note Auto-Draft

**What it does**
On the Consultation page, doctor types a few short notes ("fever 3 days, ear pain, mild redness") and clicks **Draft SOAP**. AI fills in Subjective / Objective / Assessment / Plan in clean structured form. Doctor edits, signs, saves.

**Where**
ConsultationPage → SOAP Notes tab → "Draft with AI" button at the top.

**Data needed**
- Already have: patient vitals, chief complaint, brief history, current Rx, allergies, AI history summary
- All inputs already on the page

**Effort:** ~half day

**Risk:** Medium — clinical content. Mitigated by doctor reviewing + signing every field before save. Disclaimer required.

**Why it matters**
Doctors spend significant time typing structured notes. This compresses that work to a 30-second review instead of 5 minutes of typing. Highest daily-use feature after Patient History summary.

---

## 2. AI Drug Safety Check on Prescription

**What it does**
When a doctor adds drugs to a prescription, AI checks each against the patient's:
- Listed allergies
- Current medications (interaction risk)
- Known conditions (contraindication risk)
- Age / pediatric flag

Returns a yellow/red banner per item: "Possible interaction with [drug] currently on patient's list — review." Never blocks; only warns.

**Where**
PrescriptionsPage → New Prescription form → real-time check as each drug is added.

**Data needed**
- Already have: patient allergies, currentMedications, existingConditions, ageYears
- Prescription items being added

**Effort:** ~1 day

**Risk:** Medium-high. This crosses into clinical safety. Mitigation:
- Frame as "suggestion to verify" — not a hard block
- Always require doctor confirmation
- "Verified by reference databases" wording is misleading — we'll be explicit that this is LLM-derived heuristic, not a curated drug interaction database

**Why it matters**
This is the closest we can get to a clinical safety net without licensing a real drug interaction database (which costs significant money — First Databank, Lexicomp, etc.). Better than nothing for catching obvious problems.

**Honest caveat:** if you want production-grade drug safety, you eventually need to license a real interaction database. AI is a stop-gap that catches obvious errors but will miss edge cases.

---

## 3. AI Lab Report Interpretation

**What it does**
When lab results are entered, AI generates a one-paragraph plain-English interpretation:
- What's normal / abnormal
- What the abnormalities together might suggest
- Any pattern flags ("trending down over past 3 results")

Shown on the Lab Results page next to the raw values. Two versions:
- **Clinical version** for the doctor (concise, uses medical terms)
- **Patient-friendly version** that can be printed/emailed with the report

**Where**
- LabResultsPage → "Interpret Results" button next to each completed order
- Patient portal → on the lab report view

**Data needed**
- Already have: lab order items, result values, reference ranges, abnormality flags
- For trending: patient's past lab results for the same test

**Effort:** ~1 day

**Risk:** Medium. Same as triage — clinical decision support. Mitigation: framed as "interpretation aid" not "diagnosis". Doctor signs off before patient sees it.

**Why it matters**
Patients increasingly want plain-English explanations of their lab work. Doctors want quick at-a-glance pattern recognition across multiple labs. Two clean use cases, same prompt.

---

## 4. AI Appointment No-Show Predictor

**What it does**
For every scheduled appointment, AI estimates the probability the patient won't show up, based on:
- Past appointment history (did they show?)
- Days between booking and appointment
- Day of week / time of day
- Distance from hospital (rough)
- Last visit recency

Returns a score + one-line reason ("patient missed 2 of last 3 appointments"). Front desk uses it to:
- Call high-risk patients to confirm
- Selectively overbook slots

**Where**
AppointmentsPage → new "No-show risk" column with red/yellow/green dots.

**Data needed**
- Already have: appointment status history per patient (we track SCHEDULED/COMPLETED/NO_SHOW)
- All other inputs already on patient + appointment records

**Effort:** ~1 day (with one caveat below)

**Risk:** Low — operational only. No clinical liability. Even if wildly wrong, the worst case is reception makes an unnecessary phone call.

**Honest caveat about doing this with an LLM**
LLMs are bad at numeric probability estimation. A proper no-show predictor wants a small statistical model (logistic regression) trained on the historical no-show data. With our small data volumes per tenant, a simple heuristic ("missed N of last M = high risk") will likely outperform Gemini AND a model.

**Honest framing:** do this as a **rule-based scorer with an LLM rationale**, not as an LLM prediction. AI writes the reason; SQL counts the risk.

---

## 5. AI Patient Education Leaflet Generator

**What it does**
At the end of a consultation, doctor clicks **Generate Patient Leaflet**. AI produces a one-page patient-friendly explanation of:
- Their diagnosis in plain language (8th-grade reading level)
- Why each prescribed medication was given
- What lifestyle changes help
- When to come back / red flags that warrant urgent return
- Follow-up date

Output in patient's preferred language (Tamil, Hindi, Telugu, English to start). Print, email, or send to patient portal.

**Where**
ConsultationPage → "Generate Patient Leaflet" button after consultation is saved.
Optional: auto-attach to discharge summary as well.

**Data needed**
- Already have: diagnosis, prescriptions, plan, follow-up notes
- Patient's preferred language (needs adding to Patient model, or default to tenant language)

**Effort:** ~half day for English; +half day for multi-language polish

**Risk:** Low-medium. Educational content, not clinical advice. Doctor reviews before printing. Standard disclaimer at the bottom.

**Why it matters**
Patient education materials are usually generic photocopied sheets. Personalized leaflets in the patient's language could meaningfully improve medication adherence and follow-up rates — both well-documented patient engagement metrics.

---

## Cross-cutting decisions if you want to build any of these

| Feature | Cache layer? | UI complexity | Migration needed? |
|---|---|---|---|
| 1. SOAP draft | No — fresh each time | Low | No |
| 2. Drug safety check | No | Medium | No |
| 3. Lab interpretation | Yes — cache on LabResult | Low | Yes (1 column) |
| 4. No-show predictor | Daily refresh per appointment | Medium | Yes (1 column on Appointment) |
| 5. Patient leaflet | No — fresh each visit | Medium (multi-language) | Yes (1 column on Patient for language) |

---

## My ranking if you ask which to do first

1. **#1 SOAP Auto-Draft** — biggest doctor time-save, no extra data needed, clean fit
2. **#3 Lab Interpretation** — high value, low risk, two use cases per build
3. **#5 Patient Leaflet** — visible to patients, helps loyalty + adherence
4. **#2 Drug Safety** — important but explain the limits honestly
5. **#4 No-show Predictor** — interesting but the honest implementation is rule-based, not really "AI"

---

## What I am NOT putting on this list (deliberately)

- **AI diagnosis** — too risky, regulators rightly scrutinize, drug suggestions are scope creep we already declined
- **AI chatbot for patients** — meaningful build effort + content moderation + needs separate channel/UX
- **AI radiology image reading** — needs computer vision models, not LLMs. Wrong tool, different stack
- **AI surgical scheduling** — operationally complex, not really an LLM problem
- **AI billing fraud detection** — needs structured ML over years of data, LLM is the wrong tool

These get name-checked in vendor pitches but each one is a separate company-sized product, not a feature.
