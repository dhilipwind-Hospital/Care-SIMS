# Ayphen HMS - Pending Enhancements & Roadmap

> Last updated: 2026-03-09
> Overall Application Grade: **A (94/100)**
> Frontend Pages: 79 | Backend Modules: 48 | API Endpoints: 350+

---

## P0 - Critical Fixes (Do Immediately)

### 1. ~~Global Error Boundary~~ DONE
- [x] Added `ErrorBoundary` component wrapping entire app in `App.tsx`
- [x] Fallback UI with error message, "Refresh Page" and "Go Home" buttons

### 2. ~~Token Refresh & Session Management~~ DONE
- [x] Auto token refresh on 401 via `/api/auth/refresh` in `api.ts` interceptor
- [x] Request queuing during refresh to prevent race conditions
- [x] Session timeout warning dialog with countdown timer, "Stay Logged In" refresh button, auto-logout at 0

### 3. ~~Mobile Responsive Sidebar~~ DONE
- [x] Sidebar hidden on mobile (`lg:` breakpoint), shown as overlay drawer
- [x] Hamburger menu button in AppLayout mobile header
- [x] Backdrop overlay closes drawer on tap
- [x] ConsultationPage responsive layout fix (`flex-col lg:flex-row`, `w-full lg:w-80`)

### 4. ~~Form Input Validation~~ DONE
- [x] Login page: inline email format + password length validation with error messages
- [x] Validation on Patient Registration (name, phone, email), User Creation (name, email, password), Appointment Booking (date, doctor, patient, past-date check)
- [x] Phone number format validation (`/^[6-9]\d{9}$/`) on PatientsPage, PatientRegisterPage

---

## P1 - Major Enhancements (Do Soon)

### 5. ~~Loading & Empty State Improvements~~ DONE
- [x] Created reusable `Skeleton`, `SkeletonTableRow`, `SkeletonKpiRow`, `SkeletonPage` components
- [x] Integrated skeleton loaders into 30+ pages (replaced all "Loading…" text with animated skeletons)
- [x] Added `SkeletonKpiRow` for KPI cards during loading (DoctorQueuePage, QueueDashboard)
- [x] Empty state icons + subtitles added to DoctorQueuePage, QueueDashboard, PatientsPage, PrescriptionsPage, LabPage, BillingPage, AppointmentsPage

### 6. Print & Export Features (Partial)
- [x] **Print Invoice** — opens print-friendly invoice in new window with Ayphen HMS branding, line items, totals, and auto-triggers print dialog
- [x] **Email Invoice** — calls backend API `/billing/invoices/:id/email`, validates patient email exists
- [ ] **Barcode Scanning** — button in PharmacyPage not functional
- [x] **Lab Report PDF** — printable lab report with results table, reference ranges, critical flags, dual signatures
- [x] **Prescription Print** — printable prescription with medications table, dosage, frequency, doctor signature

### 7. ~~Hardcoded Data Cleanup~~ DONE
- [x] PharmacyPage revenue now fetched from `/api/reports/dashboard`
- [x] Audited all KPI cards — removed fake "+1 from yesterday" and "~15 min" hardcoded sub-text in QueueDashboard and BillingPage

### 8. ~~Notification System Enhancement~~ PARTIAL
- [x] TopBar notification bell now shows unread count from API
- [x] Bell is clickable — navigates to `/app/notifications`
- [ ] Add real-time notifications via WebSocket
- [ ] Add push notification support for critical alerts

### 9. ~~Logout Confirmation~~ DONE
- [x] Modal dialog with Cancel/Logout buttons before signing out
- [x] LogOut icon replaces ChevronDown in sidebar footer

---

## P2 - Frontend-Backend Gap Coverage — ALL DONE

All 20 P2 modules enhanced with: StatusBadge, SkeletonKpiRow, form validation, empty states, and action buttons for backend endpoints.

### 10. ~~Insurance & TPA Module~~ DONE
- [x] Claim submission form with policy validation, approval workflow buttons (Submit/Approve)
- [x] StatusBadge, SkeletonKpiRow, empty states for policies and claims tabs

### 11. ~~Telemedicine Module~~ DONE
- [x] Session management: Start/Cancel (SCHEDULED), End Session (IN_PROGRESS) actions
- [x] StatusBadge, SkeletonKpiRow, form validation, empty state

### 12. ~~ICU Monitoring Dashboard~~ DONE
- [x] Bed status management: AVAILABLE ↔ MAINTENANCE toggle buttons
- [x] StatusBadge on bed cards, SkeletonKpiRow, form validation, empty state

### 13. ~~Dialysis Module~~ DONE
- [x] StatusBadge on session rows and machine cards, SkeletonKpiRow
- [x] Form validation, empty states for sessions and machines tabs

### 14. ~~Blood Bank Module~~ DONE
- [x] Indian phone validation on donor registration, StatusBadge, SkeletonKpiRow
- [x] Empty states for donors and inventory tabs

### 15. ~~Physiotherapy Module~~ DONE
- [x] Add Session action (POST /physiotherapy/orders/:id/sessions)
- [x] Visual progress bar for completed/total sessions, StatusBadge, SkeletonKpiRow

### 16. ~~Diet & Nutrition Module~~ DONE
- [x] Cancel Order action (PATCH /diet/orders/:id/cancel)
- [x] StatusBadge for dietType and status, SkeletonKpiRow, empty states for both tabs

### 17. ~~Asset Management~~ DONE
- [x] Maintenance scheduling form (POST /assets/:id/maintenance) with type selection
- [x] StatusBadge, SkeletonKpiRow, empty state, Maintenance button for active assets

### 18. ~~Infection Control~~ DONE
- [x] StatusBadge for recordType, isolationType, and status
- [x] HAI row highlighting, SkeletonKpiRow, form validation, empty state

### 19. ~~Staff Attendance~~ DONE
- [x] StatusBadge, SkeletonKpiRow, improved empty state with Clock icon

### 20. ~~Housekeeping~~ DONE
- [x] StatusBadge, SkeletonKpiRow, form validation, empty state

### 21. ~~Mortuary Management~~ DONE
- [x] Release workflow with prompts (releasedTo, relationship, ID)
- [x] StatusBadge, SkeletonKpiRow, form validation (name + date required), empty state

### 22. ~~Visitor Management~~ DONE
- [x] StatusBadge, SkeletonKpiRow, form validation, empty state

### 23. ~~Referral System~~ DONE
- [x] Accept/Decline (PENDING), Complete (ACCEPTED) workflow actions
- [x] Emergency row highlighting, StatusBadge for urgency and status, SkeletonKpiRow

### 24. ~~Ambulance Module~~ DONE
- [x] Trip workflow: Arrive/Depart/Complete actions for trip status progression
- [x] Emergency trip highlighting, StatusBadge, SkeletonKpiRow, empty states for vehicles and trips

### 25. ~~Inventory (General)~~ DONE
- [x] Stock In/Out actions with quantity validation, low-stock row highlighting
- [x] StatusBadge, SkeletonKpiRow, form validation (code + name + category), empty state

### 26. ~~Consent Forms~~ DONE
- [x] StatusBadge for consent type and status, SkeletonKpiRow
- [x] Form validation (4 required fields), empty state

### 27. ~~Grievance Management~~ DONE
- [x] StatusBadge for severity and status, phone validation
- [x] Critical severity row highlighting, SkeletonKpiRow, form validation, empty state

### 28. ~~Shift Handover~~ DONE
- [x] StatusBadge, SkeletonKpiRow, form validation, empty state

### 29. ~~Discharge Summary~~ DONE
- [x] StatusBadge, SkeletonKpiRow, form validation, empty state

---

## P3 - UI/UX & Accessibility (Nice to Have)

### 30. Accessibility (WCAG Compliance) PARTIAL
- [x] Added ARIA labels on TopBar notification bell, KpiCard, StatusBadge, mobile hamburger menu
- [x] Added `aria-hidden="true"` to decorative icons (Bell, KpiCard icons, Menu)
- [x] StatusBadge now has `role="status"` with descriptive `aria-label`
- [x] KpiCard has `role="region"` with `aria-label` describing metric and value
- [x] Mobile nav button has `aria-expanded` state and `aria-label`
- [x] Main content area has `role="main"`
- [ ] Add keyboard navigation support for modals
- [ ] Add proper `alt` text for remaining images/icons
- [ ] Implement focus management in modals and dialogs

### 31. UI Consistency Standardization
- [ ] Standardize padding: choose between `p-4`, `p-5`, `p-6` (currently mixed)
- [ ] Standardize button styles across pages (some gradient, some solid)
- [ ] Create unified modal/dialog component (currently inline per page)
- [ ] Standardize table header styling across all list pages

### 32. Design Token System
- [ ] Define spacing scale in CSS variables (currently arbitrary Tailwind values)
- [ ] Define consistent button states (hover, active, disabled, loading)
- [ ] Add form validation styles (error, success, warning borders)
- [ ] Add page transition animations

### 33. ~~404 / Not Found Page~~ DONE
- [x] Created `NotFoundPage.tsx` with 404 icon, "Go Back" and "Home" buttons
- [x] Updated `App.tsx` catch-all route from `<Navigate to="/" />` to `<NotFoundPage />`
- [x] Added breadcrumb navigation — `Breadcrumb.tsx` component with 50+ route-to-label mappings, integrated into `TopBar.tsx`

### 34. Dark Mode Support
- [ ] Sidebar already uses dark theme
- [ ] Extend dark mode to main content area
- [ ] Add theme toggle in TopBar or user settings

### 35. Multi-language Support (i18n)
- [ ] All text is currently hardcoded in English
- [ ] Add i18n framework for Hindi, Tamil, and other regional languages
- [ ] Critical for pan-India hospital deployment

---

## P4 - Platform & Infrastructure

### 36. API Layer Improvements
- [ ] Add request caching strategy (React Query or SWR)
- [ ] Add request timeout handling in `api.ts`
- [ ] Add API versioning support (`/api/v1/`)
- [ ] Add request retry logic for network failures

### 37. Real-time Features (WebSocket)
- [ ] Backend has Socket.IO dependency installed
- [ ] Implement: Live queue updates, lab critical value alerts, OT status changes
- [ ] Add: Real-time bed availability updates for ward management
- [ ] Add: Chat between doctors/nurses for consultations

### 38. Reporting & Analytics Enhancement
- [ ] Backend has 5 report endpoints the frontend partially uses
- [ ] Build comprehensive analytics dashboard with charts
- [ ] Add: Revenue trends, patient demographics, department performance
- [ ] Add: Export to Excel/PDF for all reports

### 39. ~~MFA (Multi-Factor Authentication)~~ PARTIAL
- [x] Backend fully supports MFA setup and verification (POST /auth/mfa/setup, /activate, /verify)
- [x] Created `MfaSetupPage.tsx` — 4-step setup wizard (intro → QR code → OTP verify → success)
- [x] Added route `/app/admin/mfa` in App.tsx, sidebar nav item for ADMIN role
- [ ] Add: MFA enforcement for admin roles (require MFA at login)

### 40. Audit Log Viewer Enhancement
- [ ] Backend tracks comprehensive audit logs
- [ ] Frontend has basic audit page
- [ ] Add: Advanced filtering, date range picker, export, user activity timeline

---

## Completed Enhancements (Done)

- [x] Replace LUNARIS branding with Ayphen HMS for Platform Admin sidebar
- [x] Show organization name in sidebar for org users
- [x] Create Ayphen HMS logo (heart + medical cross, teal gradient)
- [x] Use Ayphen logo across Landing Page (navbar + footer) and Sidebar
- [x] Remove duplicate login buttons from Landing Page navbar
- [x] Simplify hero section CTAs (single "Get Started Free" button)
- [x] Fix DoctorQueuePage crash (`tokens.filter is not a function`)
- [x] P0.1 Global Error Boundary — crash recovery UI with retry/home buttons
- [x] P0.2 Token refresh — auto-refresh JWT on 401 with request queuing
- [x] P0.3 Mobile responsive sidebar — collapsible drawer + hamburger menu
- [x] P0.4 Login form validation — inline email/password validation with error messages
- [x] P1.1 Skeleton loader components — reusable KPI, table, and page skeletons
- [x] P1.2 Logout confirmation — modal dialog before logout
- [x] P1.3 Notification bell — badge count from API + clickable link to notifications
- [x] P1.4 Hardcoded data cleanup — PharmacyPage revenue fetched from API
- [x] P1.5 Skeleton loaders integrated into 30+ pages (all "Loading…" text replaced with animated SkeletonTableRow/SkeletonKpiRow)
- [x] P1.6 Print Invoice — functional print button in BillingPage with professional invoice layout
- [x] P0.2+ Session timeout warning — countdown dialog with "Stay Logged In" refresh + auto-logout
- [x] P0.3+ ConsultationPage mobile responsive fix — flex-col/flex-row breakpoints
- [x] P0.4+ Form validation — Patient Reg, User Creation, Appointment Booking + Indian phone number validation
- [x] P1.5+ Empty state icons — contextual icons + subtitles in 7 key pages
- [x] P1.6+ Prescription Print — printable Rx with medication table + doctor signature
- [x] P1.6+ Lab Report PDF — printable lab report with results, reference ranges, critical flags
- [x] P1.6+ Email Invoice — backend API call with patient email validation
- [x] P3.33 NotFoundPage — proper 404 page with Go Back / Home buttons
- [x] P3.30+ ARIA accessibility — labels on TopBar, KpiCard, StatusBadge, AppLayout
- [x] P2.10-29 All 20 P2 modules enhanced — StatusBadge, SkeletonKpiRow, form validation, empty states, action buttons for all backend endpoints
- [x] P3.33+ Breadcrumb navigation — route-aware breadcrumb component with 50+ label mappings, integrated into TopBar
- [x] P4.39 MFA Setup UI — 4-step wizard with QR code display, OTP verification, added to admin sidebar

---

## Architecture Summary

```
Frontend (React + TypeScript + Vite)
├── 79 Pages across 12 role-based modules
├── 6 Core Components (Layout, UI, Breadcrumb)
├── 68 Routes with role-based protection
├── Multi-tenant auth (tenant/platform/doctor/patient)
└── Tailwind CSS + Custom design tokens

Backend (NestJS + TypeScript)
├── 48 Business Modules
├── 350+ REST API Endpoints
├── PostgreSQL + Prisma ORM
├── JWT Auth + MFA + RBAC
├── Feature Flag System
└── Multi-tenant SaaS Architecture
```

## Priority Legend

| Priority | Meaning | Timeline |
|----------|---------|----------|
| **P0** | Critical — blocks user experience or causes crashes | This sprint |
| **P1** | Major — significantly improves usability | Next 2 sprints |
| **P2** | Backend-Frontend gaps — feature completeness | Next quarter |
| **P3** | Polish — UI/UX and accessibility improvements | Ongoing |
| **P4** | Infrastructure — scalability and platform features | Backlog |
