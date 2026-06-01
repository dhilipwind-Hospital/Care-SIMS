// Single source of truth for the clinical specialty list shown in dropdowns
// across the app. Previously this list was hardcoded in three separate
// files (DoctorRegisterPage, PatientsPage) which drifted out of sync —
// the registration form showed 22 specialties, the patient appointment
// form only showed 8, so reception staff could pick a specialty that
// no doctor would ever match.
//
// Keep alphabetised so additions stay in order. If a tenant ever needs
// custom specialties beyond this list, the eventual upgrade is to
// promote this constant into a Specialty table on the backend — see
// DEPARTMENT_SPECIALTY_PLAN.md for the migration path.
export const SPECIALTIES: readonly string[] = [
  'Anesthesiology',
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'ENT',
  'Family Medicine',
  'Gastroenterology',
  'General Medicine',
  'General Surgery',
  'Gynecology',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Obstetrics',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Rheumatology',
  'Urology',
];
