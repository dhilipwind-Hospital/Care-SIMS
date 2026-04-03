# Ayphen HMS — Module Gap Audit (Final)

> **Generated**: 2026-03-27
> **Scope**: 49 backend modules, 380+ endpoints, 329 frontend API calls
> **Coverage**: ~65% of backend endpoints consumed by frontend

---

## Summary

| Metric | Count |
|--------|-------|
| Total Backend Modules | 49 |
| Modules COMPLETE (100%) | 23 |
| Modules MOSTLY COMPLETE (75%+) | 17 |
| Modules PARTIAL (<75%) | 8 |
| Empty Modules | 1 |
| Total Unused Endpoints | ~55 |

---

## Complete Modules (23) — No Action Needed

| Module | Endpoints | Used | Status |
|--------|:-:|:-:|:-:|
| Ambulance | 9 | 9 | 100% |
| Consultations | 5 | 5 | 100% |
| Departments | 4 | 4 | 100% |
| Discharge Summary | 6 | 6 | 100% |
| ICU | 6 | 6 | 100% |
| Notifications | 4 | 4 | 100% |
| OT | 7 | 7 | 100% |
| Prescriptions | 7 | 7 | 100% |
| Reports | 5 | 5 | 100% |
| Roles | 7 | 7 | 100% |
| Search | 1 | 1 | 100% |
| Shift Handover | 6 | 6 | 100% |
| Tenants | 5 | 5 | 100% |
| Wards | 7 | 7 | 100% |
| Billing | 8 | 7 | 88% |
| Blood Bank | 10 | 9 | 90% |
| Diet | 10 | 8 | 80% |
| Insurance | 10 | 9 | 90% |
| Lab | 10 | 9 | 90% |
| Patients | 8 | 7 | 88% |
| Pharmacy | 10 | 8 | 80% |
| Queue | 8 | 7 | 88% |
| Radiology | 8 | 7 | 88% |

---

## Mostly Complete Modules (17) — Minor Gaps

### Auth (17/19 used)
| Unused Endpoint | Impact |
|---|---|
| `GET /auth/me` | No user profile page |
| `GET /auth/patient/me/profile` | No patient profile view |

### Users (11/12 used)
| Unused | Impact |
|---|---|
| `PATCH /users/:id/reactivate` | Can deactivate but not reactivate from UI |

### Doctor Registry (6/8 used)
| Unused | Impact |
|---|---|
| `PUT /doctors/:id` | Cannot edit doctor profile |
| `GET /doctors/by-location/:locationId` | No location-filtered doctor list |

### Referral (6/9 used)
| Unused | Impact |
|---|---|
| `GET /referrals/:id` | No referral detail view |
| `GET /referrals/my-referrals` | Doctors can't see their own referrals |
| `DELETE /referrals/:id` | No delete button |

### Staff Attendance (6/8 used)
| Unused | Impact |
|---|---|
| `PATCH /staff-attendance/:id` | Edit endpoint exists but not wired |
| `DELETE /staff-attendance/:id` | No delete button |

### Triage (3/5 used)
| Unused | Impact |
|---|---|
| `GET /triage/by-token/:tokenId` | Lookup by token not wired |
| `GET /triage/by-patient/:patientId` | Lookup by patient not wired |

### Visitors (5/7 used)
| Unused | Impact |
|---|---|
| `GET /visitors/:id` | No visitor detail view |
| `DELETE /visitors/:id` | No delete button |

### Locations (4/7 used)
| Unused | Impact |
|---|---|
| `GET /org/locations/:id` | No location detail |
| `PATCH /org/locations/:id/deactivate` | No deactivate toggle |
| `DELETE /org/locations/:id` | No delete button |

### Admissions (5/6 used)
| Unused | Impact |
|---|---|
| `PUT /admissions/:id` | No admission edit form |

### Grievance (4/8 used)
| Unused | Impact |
|---|---|
| `GET /grievances/:id` | No detail view |
| `PATCH /grievances/:id/assign` | No assignment workflow |
| `PATCH /grievances/:id/feedback` | No feedback form |
| `DELETE /grievances/:id` | No delete button |

### Housekeeping (4/9 used)
| Unused | Impact |
|---|---|
| `PATCH /:id/assign` | No assign button |
| `PATCH /:id/start` | No start button |
| `PATCH /:id/complete` | No complete button |
| `PATCH /:id/verify` | No verify button |
| `DELETE /:id` | No delete button |

*Note: Frontend uses dynamic `PATCH /${action}` routing — these may work at runtime if the action name matches.*

### Telemedicine (5/7 used)
| Unused | Impact |
|---|---|
| `GET /telemedicine/sessions/:id` | No session detail |
| `DELETE /telemedicine/sessions/:id` | No delete |

### Mortuary (5/7 used)
| Unused | Impact |
|---|---|
| `GET /mortuary/:id` | No detail view |
| `DELETE /mortuary/:id` | No delete |

### Dialysis (7/9 used)
| Unused | Impact |
|---|---|
| `PATCH /dialysis/machines/:id` | Can't edit machine details |

### Vitals (2/4 used)
| Unused | Impact |
|---|---|
| `GET /vitals/consultation/:consultationId` | No consultation-linked vitals |
| `GET /vitals/admission/:admissionId` | No admission-linked vitals |

### Platform (17/22 used)
| Unused | Impact |
|---|---|
| `GET /platform/features` | Feature catalog not displayed |
| `POST /platform/organizations/:id/locations` | Can't add org locations from platform |
| `GET /platform/organizations/:id/locations` | Can't view org locations list |
| `PATCH .../features/:moduleId/enable` | Separate enable endpoint (toggle used instead) |
| `PATCH .../features/:moduleId/disable` | Separate disable endpoint (toggle used instead) |

---

## Partial Modules (8) — Significant Gaps

### Medication Administration (2/4 used — 50%)
| Unused | Impact | Priority |
|---|---|---|
| `GET /medication-admin/mar/:admissionId` | **No full MAR grid view** | High |
| `POST /medication-admin/schedule` | **Can't schedule medications** | High |

### Inventory (4/8 used — 50%)
| Unused | Impact | Priority |
|---|---|---|
| `GET /inventory/items/:id` | No item detail | Low |
| `PATCH /inventory/items/:id` | No item edit | Medium |
| `GET /inventory/transactions` | **No stock transaction history** | High |
| `GET /inventory/low-stock` | **No low-stock alerts view** | High |

### Uploads (2/4 used — 50%)
| Unused | Impact | Priority |
|---|---|---|
| `POST /uploads/profile-picture` | Generic upload not used | Low |
| `POST /uploads/document` | **No document attachment anywhere** | Medium |

### Asset Management (3/7 used — 43%)
| Unused | Impact | Priority |
|---|---|---|
| `GET /assets/:id` | No asset detail view | Low |
| `PATCH /assets/:id` | No asset edit | Medium |
| `GET /assets/:id/maintenance` | **No maintenance history** | Medium |
| `PATCH /assets/maintenance/:id/complete` | **Can't complete maintenance** | High |

### Audit (1/2 used — 50%)
| Unused | Impact | Priority |
|---|---|---|
| `GET /audit/patient-access` | **No patient access log viewer** | Medium |

### Consent (4/7 used — 57%)
| Unused | Impact | Priority |
|---|---|---|
| `DELETE /consents/:id` | No delete button | Low |
| `GET /consents/patient/:patientId` | No patient consent history | Medium |

### Infection Control (4/7 used — 57%)
| Unused | Impact | Priority |
|---|---|---|
| `GET /infection-control/:id` | No detail view | Low |
| `PATCH /infection-control/:id` | No edit form | Medium |
| `DELETE /infection-control/:id` | No delete | Low |

### Physiotherapy (3/7 used — 43%)
| Unused | Impact | Priority |
|---|---|---|
| `GET /physiotherapy/orders/:id` | No order detail | Low |
| `PATCH /physiotherapy/orders/:id` | No order edit | Medium |
| `GET /physiotherapy/orders/:id/sessions` | **No session history** | High |
| `DELETE /physiotherapy/orders/:id` | No delete | Low |

---

## Export Endpoints — All Created, Not All Wired

| Export Endpoint | Frontend Button |
|---|---|
| `GET /patients/export` | ExportButton exists |
| `GET /appointments/export` | ExportButton exists |
| `GET /billing/invoices/export` | ExportButton exists |
| `GET /lab/orders/export` | ExportButton exists |
| `GET /pharmacy/drugs/export` | ExportButton exists |
| `GET /queue/export` | ExportButton exists |

All 6 export endpoints have ExportButton components wired.

---

## Empty Module

| Module | Status |
|---|---|
| `doctor-affiliations` | No controller, no service — empty placeholder. Affiliation logic lives in `doctor-registry` module instead. |

---

## Feature Completeness by Department

### Clinical (Core)
| Feature | Status |
|---|---|
| Patient Registration + Edit | Done |
| Patient History | Done |
| OPD Queue + Token | Done |
| Doctor Consultation (SOAP) | Done |
| Prescriptions + Pharmacy | Done |
| Lab Orders + Results + Validation | Done |
| Radiology Orders + Results + Validation | Done |
| Triage + Vitals | Done |
| Admissions + Transfer + Discharge | Done |
| Discharge Summary + Edit | Done |
| Medication Administration | **Partial** — pending/administer works, MAR grid + scheduling missing |

### Surgical
| Feature | Status |
|---|---|
| OT Room Management | Done |
| OT Booking + Schedule | Done |
| OT Live Monitor (WebSocket) | Done |

### Support Services
| Feature | Status |
|---|---|
| Billing + Line Items + Payments | Done |
| Insurance Policies + Claims | Done |
| Blood Bank (Donors + Donations + Transfusions) | Done |
| Diet Orders + Meals + Feedback | Done |
| Physiotherapy | **Partial** — session history missing |
| ICU Monitoring | Done |
| Dialysis | Done |

### Operations
| Feature | Status |
|---|---|
| Ward + Bed CRUD + Occupancy | Done |
| Housekeeping Tasks | **Partial** — assign/start/complete/verify workflow buttons |
| Asset Management | **Partial** — maintenance completion missing |
| Inventory | **Partial** — stock transactions + low-stock alerts missing |
| Staff Attendance + Summary | Done |
| Shift Handover | Done |
| Visitor Management + Active Count | Done |

### Administrative
| Feature | Status |
|---|---|
| User Management + Approval | Done |
| Role + Permission Management | Done |
| Department + Location CRUD | Done |
| Org Settings + Feature Toggles | Done |
| MFA Setup + Login Verification | Done |
| Password Change | Done |
| Audit Logs | **Partial** — patient access log missing |

### Platform Admin
| Feature | Status |
|---|---|
| Organization Registry | Done |
| Doctor Registry + Affiliations | Done |
| Subscription Management | Done |
| Platform Audit | Done |
| Feature Management | Done |

### Cross-Cutting
| Feature | Status |
|---|---|
| Command Palette (Cmd+K) | Done |
| WebSocket Real-Time | Done |
| Dark Mode | Done |
| i18n (EN/HI/TA) | Done |
| CSV Export (6 modules) | Done |
| File Upload (Patient + User Photos) | Done |
| Global Error Boundary | Done |
| Token Refresh + Session Timeout | Done |
| Mobile Responsive Sidebar | Done |
| Breadcrumb Navigation | Done |
| Skeleton Loaders | Done |
| Empty States | Done |
| Toast Notifications | Done |

---

## Recommended Next Steps (Priority Order)

### Quick Wins (< 30 min each)
1. Wire `GET /inventory/transactions` + `GET /inventory/low-stock` into InventoryPage
2. Wire `GET /physiotherapy/orders/:id/sessions` session history
3. Wire `PATCH /assets/maintenance/:id/complete` maintenance completion
4. Wire `GET /audit/patient-access` into AuditPage
5. Add delete buttons to 8 modules (referral, visitors, mortuary, telemedicine, consent, infection-control, radiology, physiotherapy)

### Medium Effort
6. Build MAR grid view (`GET /medication-admin/mar/:admissionId`)
7. Build medication scheduling (`POST /medication-admin/schedule`)
8. Wire housekeeping assign/start/complete/verify workflow buttons
9. Add `GET /auth/me` user profile page

### Phase 5 (Quality)
10. DTO validation across all endpoints
11. Rate limiting on auth
12. Replace count()+1 IDs with DB sequences
13. Unit tests
14. CI/CD

---

*This audit represents the final state of Ayphen HMS as of 2026-03-27 after all integration gap fixes.*
