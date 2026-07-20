# Ayphen HMS — Create-Form Bug Audit ("strip-500" pattern)

**How found:** static cross-reference (service create × Prisma schema × frontend form) across 35 untested
modules. **Pattern:** a NOT-NULL column is set straight from `dto.x` with no default, while the UI form
omits it, sends it under a wrong key, or leaves a `*Id` empty (which `api.ts → stripEmptyIdFields` strips)
→ the value arrives `undefined` → **Prisma 500 on create**.

This is the same class already fixed live: `consent.doctorId`, `mlc.patientId`, `pharmacy ReceiveBatchDto.locationId`.

**Result: 14 modules affected, ~25 fields.** Prioritized below.

---

## 🔴 HIGH — create flow is structurally broken (500 on every/most attempts)

| Module | Endpoint | Field(s) | Cause | Suggested fix |
|---|---|---|---|---|
| **insurance** | POST /insurance/claims | `claimAmount` | form sends amount as **`totalAmount`** (wrong key) | service: `claimAmount: dto.claimAmount ?? dto.totalAmount ?? 0` |
| **insurance** | POST /insurance/claims | `patientId` | no patientId on the form | derive from the selected policy/admission |
| **insurance** | POST /insurance/policies | `planType` | form sends **`planName`** (wrong key) | `planType: dto.planType ?? dto.planName ?? ''` |
| **insurance** | POST /insurance/policies | `coverageAmount` | form sends **`sumInsured`** (wrong key) | `coverageAmount: dto.coverageAmount ?? dto.sumInsured ?? 0` |
| **antimicrobial** | POST /antimicrobial | `dose`, `frequency`, `startDate` | form has **no inputs** for these | add inputs, or default (`dose ?? ''`, `startDate ? new Date() : new Date()`) |
| **antimicrobial** | POST /antimicrobial | `patientId` | required picker, empty → stripped | validate presence (400) |
| **icu** | POST /icu/beds | `wardId` | form never sends it | add ward selector OR make column nullable |
| **icu** | POST /icu/beds | `icuType` | form sends **`bedType`** (wrong key) | `icuType: dto.icuType ?? dto.bedType ?? 'GENERAL_ICU'` |
| **icu** | POST /icu/monitoring | `patientId` | seeded from `bed.patientId` (field is `currentPatientId`) → empty → stripped | seed from `bed.currentPatientId` |
| **blood-bank** | POST /blood-bank/transfusions | `orderedById` | no UI field; empty → stripped | inject `CurrentUser('sub')` in controller/service |
| **clinical-pathways** | POST /clinical-pathways/pathways | `patientId`, `protocolId` | **no assign-pathway form exists** | build the form OR guard (400) |
| **diet** | POST /diet/orders | `doctorId` | no input | inject from JWT or make nullable |
| **insurance/medication-admin/palliative/physiotherapy** | various | `patientId`/`therapistId`/`treatmentGiven` | no input / wrong wiring | inject, derive, or add input |
| **palliative-care** | POST /palliative-care | `patientId` | service does `dto.patientId \|\| null` into a **NOT-NULL** column (invalid) | add picker OR make column `String?` |
| **physiotherapy** | POST /…/sessions | `therapistId`, `treatmentGiven` | `addSession` posts only `{notes}` | default/inject or build a real session form |
| **medication-admin** | POST /medication-admin/schedule | `locationId`, `patientId` | no location input; patientId unguarded | default locationId; guard patientId |

## 🟠 MED — 500s only for users whose JWT `locationId` is null (no primary location)

`asset-management`, `diet` (locationId), `emergency`, `infection-control`, `mortuary`, `visitors`,
`staff-attendance` (clock-in + mark) — all set `locationId: dto.locationId` (no fallback) and rely on the
controller's `body.locationId || lid`, but the JWT signs `locationId: locationId || null`, so a user without
a scoped location → `undefined` → NOT-NULL 500.

**Shared fix:** a server-side location resolver (fall back to the tenant's primary location), or guard with a
clean 400, instead of passing `undefined` into the NOT-NULL column.

---

## Fix strategy (by type)
1. **Wrong-key maps** (insurance ×3, icu icuType) — trivial, backend-only: `dto.right ?? dto.wrongKey`.
2. **Inject-from-JWT** (blood-bank orderedById, diet doctorId) — controller passes `CurrentUser('sub')`.
3. **Form-completeness** (antimicrobial dose/freq/startDate, physiotherapy session, clinical-pathways assign) —
   need UI inputs; product decision on which fields are mandatory.
4. **locationId class** (7 modules) — one shared resolver/guard.
5. **FK patientId** — never default to `''`/`null`; derive from a related record or require a UI picker.

## Systemic recommendation
The deeper root cause is `stripEmptyIdFields` (api.ts) silently dropping empty `*Id` fields that backends
treat as required-present. Consider: (a) only strip when the field is genuinely an optional FK, or (b) make
backends coalesce `undefined → null` for nullable FKs and validate truly-required ones with a clean 400 —
so this class can never 500 again.
