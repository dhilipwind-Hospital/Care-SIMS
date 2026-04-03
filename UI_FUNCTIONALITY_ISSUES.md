# Ayphen HMS — UI & Functionality Issues

> **Audited**: 2026-03-30
> **Scope**: All 83 frontend pages, 16 components, 4 contexts
> **Total Issues Found**: 32

---

## Summary

| Category | Count | High | Medium | Low |
|----------|:-----:|:----:|:------:|:---:|
| UI Inconsistencies | 7 | 0 | 7 | 0 |
| Functional Issues | 9 | 4 | 5 | 0 |
| Code Quality | 5 | 1 | 3 | 1 |
| Accessibility | 5 | 2 | 3 | 0 |
| Page-Specific | 6 | 1 | 5 | 0 |
| **Total** | **32** | **8** | **23** | **1** |

---

## HIGH Priority (8 issues)

### H1. Pagination Not Resetting When Filters Change
**Impact**: User stays on page 5, changes filter, gets empty results because page 5 doesn't exist with new filter.

**Affected Files**:
- `pages/admin/UsersPage.tsx` — `useEffect` depends on `[page]` only
- `pages/appointments/AppointmentsPage.tsx` — depends on `[date, statusFilter, page]`
- `pages/billing/BillingPage.tsx` — depends on `[search, statusFilter, page]`
- `pages/patients/PatientsPage.tsx` — depends on `[search, page]`
- `pages/lab/LabPage.tsx` — depends on `[statusFilter, page]`

**Fix**: Add `setPage(1)` in every filter/search onChange handler.

---

### H2. Missing Loading States on Buttons During API Calls
**Impact**: Users can click buttons multiple times, triggering duplicate API calls (double dispense, double discharge, etc.)

**Affected Files**:
- `pages/lab/LabPage.tsx` — `updateStatus()` no loading state
- `pages/nurse/MARPage.tsx` — `administer()` no loading state
- `pages/appointments/AppointmentsPage.tsx` — `handleCancel()` no loading state
- `pages/doctor/DoctorQueuePage.tsx` — `startConsult()`, `markNoShow()` no loading
- `pages/nurse/AdmissionsPage.tsx` — `handleDischarge()` no loading
- `pages/ot/OTPage.tsx` — `start/complete` surgery buttons inline, no disabled state
- `pages/queue/QueueDashboard.tsx` — `callToken()`, `completeToken()` no loading

**Fix**: Add `submitting` state, disable button during API call, show spinner.

---

### H3. PatientsPage Search Without Debounce
**Impact**: API call fires on every keystroke — typing "Rajesh" sends 6 API requests.

**File**: `pages/patients/PatientsPage.tsx` line ~62
- `useEffect` depends on `[search, page]` — triggers immediate refetch

**Fix**: Add 300ms debounce (same pattern as AppointmentsPage/BillingPage).

---

### H4. Stale Data When Returning to Pages
**Impact**: User edits a patient, navigates away, returns — sees old data until manual refresh.

**Affected**: ALL pages that fetch on `useEffect([], [])` (mount-only).

**Root Cause**: No cache invalidation or refetch-on-focus. React Query would fix this but isn't used.

**Fix Options**:
- Add `useEffect` with location dependency to refetch on navigation
- Or adopt React Query with `staleTime` configuration

---

### H5. Color-Only Status Indicators (Accessibility)
**Impact**: Colorblind users (8% of males) cannot distinguish states.

**Affected Files**:
- `pages/notifications/NotificationsPage.tsx` — unread dot is color-only (blue circle, no text)
- `pages/doctor/DoctorQueuePage.tsx` — priority only shown via row background color
- `pages/nurse/TriagePage.tsx` — triage level uses color-coded badges but some lack text
- `pages/icu/IcuPage.tsx` — bed status shown with color-only indicators

**Fix**: Always include text labels alongside color indicators. Use icons + text, not just colored dots.

---

### H6. Clickable Table Rows Without Keyboard Support
**Impact**: Screen reader users and keyboard-only users cannot interact with clickable rows.

**Affected Files**:
- `pages/pharmacy/PharmacyPage.tsx` — `<tr onClick>` without `role="button"` or `onKeyDown`
- `pages/doctor/DoctorQueuePage.tsx` — clickable queue items
- `pages/platform/PlatformDashboard.tsx` — org rows clickable

**Fix**: Add `role="button"`, `tabIndex={0}`, `onKeyDown={e => e.key === 'Enter' && handler()}`.

---

### H7. DoctorQueuePage Doesn't Auto-Refresh
**Impact**: Doctor doesn't see new patients added to their queue until manual page refresh.

**File**: `pages/doctor/DoctorQueuePage.tsx`
- Fetches once on mount, no interval polling
- WebSocket `queue:updated` event exists but may not trigger refetch here

**Fix**: Add `setInterval(fetchQueue, 30000)` or subscribe to WebSocket `queue:updated`.

---

### H8. Missing Inline Error Feedback
**Impact**: When an API call fails, only a toast appears briefly. No persistent error message near the affected element.

**Affected**: ALL pages — every error is `toast.error()` only. No inline error banners or field-level errors after failed mutations.

**Fix**: Add error state near action buttons. Show "Failed to save — Retry?" inline.

---

## MEDIUM Priority (23 issues)

### UI Inconsistencies

#### M1. Inconsistent Page Padding
- Some pages: `p-6`
- Some pages: `p-5`
- Some modals: `p-4`
**Fix**: Standardize all pages to `p-6`, all modal content to `p-5`.

#### M2. Inconsistent Card Styling
- Some pages: `.hms-card` class
- Some pages: inline `bg-white rounded-xl shadow-sm border`
- Some pages: `style={{ background: '#F5F7FA' }}`
**Fix**: Use `.hms-card` everywhere, remove inline card styles.

#### M3. Inconsistent Button Styling
Three different patterns in use:
1. `style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}`
2. `style={{ background: 'var(--accent)' }}`
3. `className="bg-teal-600 hover:bg-teal-700"`
**Fix**: Create `.btn-primary`, `.btn-secondary`, `.btn-danger` utility classes in index.css.

#### M4. Inconsistent Table Header Styling
- Some: `bg-gray-50 text-xs uppercase text-gray-500`
- Some: `style={{ background: 'var(--surface)' }}`
- Some: `className="border-b font-medium text-gray-600"`
**Fix**: Standardize to CSS variable-based table headers.

#### M5. Inconsistent Input Field Styling
- Some: `.hms-input` class
- Some: inline `border border-gray-200 rounded-xl px-3 py-2`
- Border radius varies: `rounded-xl` vs `rounded-lg` vs `rounded-md`
**Fix**: Use `.hms-input` everywhere.

#### M6. Inconsistent Icon Sizes
- Lucide `size={13}`, `size={14}`, `size={15}`, `size={16}`, `size={18}`, `size={20}`
- Action buttons: some `size={13}`, others `size={16}`
**Fix**: Standardize: action icons `size={14}`, page icons `size={20}`, KPI icons `size={24}`.

#### M7. Hardcoded Colors in Print Templates
- `BillingPage.tsx` — inline HTML with hardcoded `#0f766e`
- `LabPage.tsx` — print HTML with hardcoded colors
- `pages/doctor/PrescriptionsPage.tsx` — print with hardcoded colors
**Fix**: Use CSS variables in print templates or extract to a shared print stylesheet.

### Functional Issues

#### M8. Modals Don't Close on Escape Key
**Affected**: Most modals across the application only close via X button or backdrop click.

**Files**: UsersPage, DepartmentsPage, AppointmentsPage, BillingPage, OTPage, AdmissionsPage, BloodBankPage, InsurancePage, and more.

**Fix**: Add `useEffect` with keydown listener for Escape in every modal, or create a shared `useEscapeClose(setOpen)` hook.

#### M9. Inconsistent Confirmation Patterns
- Some deletions use `window.confirm()` (native browser dialog)
- Some use custom confirmation modals with styled UI
- DepartmentsPage and LocationsPage use separate confirm state

**Fix**: Create a shared `ConfirmDialog` component and use it everywhere.

#### M10. Dropdowns Don't Highlight Current Selection
- Role dropdown in UsersPage shows "Select role..." even after selection
- Doctor dropdown in AppointmentsPage doesn't visually distinguish selected doctor

**Fix**: Style selected `<option>` or use a custom select component with visual feedback.

#### M11. Date Inputs Without min/max Constraints
- Appointment booking allows past dates via keyboard (only JS-validated)
- Maintenance scheduling allows past dates

**Fix**: Add `min={new Date().toISOString().split('T')[0]}` to date inputs.

#### M12. Numbers Without Consistent Formatting
- Some currency values use `toLocaleString('en-IN')` — good
- Others show raw numbers without formatting
- No shared currency formatter

**Fix**: Create a `formatCurrency(amount)` utility and use everywhere.

### Code Quality

#### M13. Unused State Variables
- `AppointmentsPage.tsx` — `locationFilter` state declared, set, but never used in render
- Various pages may have leftover state from earlier refactors

**Fix**: Run `npx eslint --fix` or manually audit state usage.

#### M14. Duplicate API Calls
- `PharmacyPage.tsx` — fetches prescriptions then filters client-side; could use server-side filter
- Multiple pages fetch the same dropdown data (doctors, departments) independently

**Fix**: Use shared hooks for common data (`useDoctors()`, `useDepartments()`).

#### M15. Inline Functions in JSX onClick
- Complex logic inside `onClick={() => { ... }}` instead of separate handler functions
- Especially in OTPage, OTLiveMonitorPage — multi-line API calls inline

**Fix**: Extract inline handlers to named functions for readability.

### Accessibility

#### M16. Buttons Missing type="button" Inside Forms
**Impact**: Buttons inside `<form>` without `type="button"` will submit the form when clicked.

**Affected**: Modal close/cancel buttons in UsersPage, DepartmentsPage, WardsPage, AppointmentsPage, and others.

**Fix**: Add `type="button"` to all non-submit buttons.

#### M17. Inputs Without id + Matching htmlFor
**Affected**: Most form inputs across the application lack `id` attributes and their `<label>` elements lack `htmlFor`.

**Fix**: Add `id` to every input, add `htmlFor` to every label.

#### M18. Non-Interactive Elements With Click Handlers
- `<div onClick>` and `<tr onClick>` without `role`, `tabIndex`, or `onKeyDown`

**Fix**: Use `<button>` for clickable elements, or add `role="button" tabIndex={0}`.

---

## LOW Priority (1 issue)

### L1. Unused Imports
- Various pages import icons or components they don't use
- Adds to bundle size marginally

**Fix**: Run linter with `no-unused-imports` rule.

---

## Page-Specific Issues

### P1. PharmacyPage: Revenue Display
Revenue KPI falls back to hardcoded check if backend doesn't respond. Should show "N/A" or skeleton instead.

### P2. BillingPage: Print Without Selection
Print button is always clickable. Prints empty window if no invoice selected. Should be disabled when nothing is selected.

### P3. PatientsPage: Gender Not Validated
Form defaults `gender: 'MALE'` but never validates it. User could submit with wrong default.

### P4. AppointmentsPage: Slots Not Shown Until Doctor Selected
Edit modal doesn't show available time slots until both doctor AND date are selected. Should show helpful message.

### P5. DoctorQueuePage: No-Show Without Loading
`markNoShow()` triggers API but button stays enabled during the call. Could double-trigger.

### P6. AdminDashboard: KPI Grid Changed
Grid was changed from 3 to 4 columns for Active Visitors KPI, but might not look balanced if 4th card value is 0.

---

## Recommended Fix Order

### Phase 1 — Critical UX (fixes user-facing bugs)
1. H1: Pagination reset on filter change (all list pages)
2. H2: Button loading states (all action buttons)
3. H3: PatientsPage search debounce
4. H5: Color-only indicators (add text labels)

### Phase 2 — Consistency (visual polish)
5. M3: Standardize button styles (create .btn-primary/.btn-secondary)
6. M5: Standardize input styles (use .hms-input everywhere)
7. M2: Standardize card styles (use .hms-card everywhere)
8. M4: Standardize table headers
9. M12: Create shared currency formatter

### Phase 3 — Accessibility
10. M16: Add type="button" to all non-submit buttons
11. M17: Add id/htmlFor to inputs/labels
12. H6: Add keyboard support to clickable rows
13. M8: Add Escape key to all modals

### Phase 4 — Code Quality
14. M13: Remove unused state variables
15. M14: Extract shared data hooks
16. L1: Remove unused imports

---

*This document lists all currently known UI and functionality issues in the Ayphen HMS application as of 2026-03-30.*
