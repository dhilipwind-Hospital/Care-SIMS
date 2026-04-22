/**
 * APACHE II Score Calculator
 * Simplified version using available ICU monitoring fields.
 * Score range: 0-71 (higher = sicker)
 *
 * Uses 12 physiological variables. Some variables require lab data
 * that may not always be available — missing values score 0 (normal).
 */
export function calculateApacheII(data: {
  temperatureC?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  pao2?: number | null;
  fio2?: number | null;
  arterialPh?: number | null;
  serumSodium?: number | null;
  serumPotassium?: number | null;
  serumCreatinine?: number | null;
  hematocrit?: number | null;
  wbc?: number | null;
  gcs?: number | null;
}): number {
  let score = 0;

  // 1. Temperature (rectal °C)
  const temp = data.temperatureC ? Number(data.temperatureC) : null;
  if (temp !== null) {
    if (temp >= 41) score += 4;
    else if (temp >= 39) score += 3;
    else if (temp >= 38.5) score += 1;
    else if (temp >= 36) score += 0;
    else if (temp >= 34) score += 1;
    else if (temp >= 32) score += 2;
    else if (temp >= 30) score += 3;
    else score += 4;
  }

  // 2. Mean Arterial Pressure
  if (data.systolicBp && data.diastolicBp) {
    const map = Math.round(Number(data.diastolicBp) + (Number(data.systolicBp) - Number(data.diastolicBp)) / 3);
    if (map >= 160) score += 4;
    else if (map >= 130) score += 3;
    else if (map >= 110) score += 2;
    else if (map >= 70) score += 0;
    else if (map >= 50) score += 2;
    else score += 4;
  }

  // 3. Heart Rate
  const hr = data.heartRate;
  if (hr !== null && hr !== undefined) {
    if (hr >= 180) score += 4;
    else if (hr >= 140) score += 3;
    else if (hr >= 110) score += 2;
    else if (hr >= 70) score += 0;
    else if (hr >= 55) score += 2;
    else if (hr >= 40) score += 3;
    else score += 4;
  }

  // 4. Respiratory Rate
  const rr = data.respiratoryRate;
  if (rr !== null && rr !== undefined) {
    if (rr >= 50) score += 4;
    else if (rr >= 35) score += 3;
    else if (rr >= 25) score += 1;
    else if (rr >= 12) score += 0;
    else if (rr >= 10) score += 1;
    else if (rr >= 6) score += 2;
    else score += 4;
  }

  // 5. A-a gradient or PaO2 (simplified — use PaO2 if FiO2 < 50%, else A-a)
  const pao2 = data.pao2 ? Number(data.pao2) : null;
  const fio2 = data.fio2 ? Number(data.fio2) : null;
  if (pao2 !== null && fio2 !== null && fio2 < 50) {
    if (pao2 > 70) score += 0;
    else if (pao2 >= 61) score += 1;
    else if (pao2 >= 55) score += 3;
    else score += 4;
  }

  // 6. Arterial pH
  const ph = data.arterialPh ? Number(data.arterialPh) : null;
  if (ph !== null) {
    if (ph >= 7.7) score += 4;
    else if (ph >= 7.6) score += 3;
    else if (ph >= 7.5) score += 1;
    else if (ph >= 7.33) score += 0;
    else if (ph >= 7.25) score += 2;
    else if (ph >= 7.15) score += 3;
    else score += 4;
  }

  // 7. Serum Sodium
  const na = data.serumSodium ? Number(data.serumSodium) : null;
  if (na !== null) {
    if (na >= 180) score += 4;
    else if (na >= 160) score += 3;
    else if (na >= 155) score += 2;
    else if (na >= 150) score += 1;
    else if (na >= 130) score += 0;
    else if (na >= 120) score += 2;
    else score += 3;
  }

  // 8. Serum Potassium
  const k = data.serumPotassium ? Number(data.serumPotassium) : null;
  if (k !== null) {
    if (k >= 7) score += 4;
    else if (k >= 6) score += 3;
    else if (k >= 5.5) score += 1;
    else if (k >= 3.5) score += 0;
    else if (k >= 3) score += 1;
    else if (k >= 2.5) score += 2;
    else score += 4;
  }

  // 9. Serum Creatinine
  const cr = data.serumCreatinine ? Number(data.serumCreatinine) : null;
  if (cr !== null) {
    if (cr >= 3.5) score += 4;
    else if (cr >= 2) score += 3;
    else if (cr >= 1.5) score += 2;
    else if (cr >= 0.6) score += 0;
    else score += 2;
  }

  // 10. Hematocrit
  const hct = data.hematocrit ? Number(data.hematocrit) : null;
  if (hct !== null) {
    if (hct >= 60) score += 4;
    else if (hct >= 50) score += 2;
    else if (hct >= 46) score += 1;
    else if (hct >= 30) score += 0;
    else if (hct >= 20) score += 2;
    else score += 4;
  }

  // 11. White Blood Count (×1000)
  const wbc = data.wbc ? Number(data.wbc) : null;
  if (wbc !== null) {
    if (wbc >= 40) score += 4;
    else if (wbc >= 20) score += 2;
    else if (wbc >= 15) score += 1;
    else if (wbc >= 3) score += 0;
    else if (wbc >= 1) score += 2;
    else score += 4;
  }

  // 12. Glasgow Coma Score (15 - GCS)
  const gcs = data.gcs;
  if (gcs !== null && gcs !== undefined) {
    score += (15 - gcs);
  }

  return score;
}

/**
 * SOFA Score Calculator
 * Sequential Organ Failure Assessment — tracks organ dysfunction daily.
 * Score range: 0-24 (each of 6 organs scored 0-4)
 */
export function calculateSOFA(data: {
  pao2?: number | null;
  fio2?: number | null;
  plateletCount?: number | null;
  bilirubinMg?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  gcs?: number | null;
  serumCreatinine?: number | null;
  urineOutputMl?: number | null;
}): number {
  let score = 0;

  // 1. Respiration — PaO2/FiO2 ratio
  const pao2 = data.pao2 ? Number(data.pao2) : null;
  const fio2 = data.fio2 ? Number(data.fio2) : null;
  if (pao2 !== null && fio2 !== null && fio2 > 0) {
    const ratio = pao2 / (fio2 / 100); // FiO2 stored as % (e.g., 40 = 40%)
    if (ratio < 100) score += 4;
    else if (ratio < 200) score += 3;
    else if (ratio < 300) score += 2;
    else if (ratio < 400) score += 1;
  }

  // 2. Coagulation — Platelets (×10³/µL)
  const plt = data.plateletCount ? Number(data.plateletCount) : null;
  if (plt !== null) {
    if (plt < 20) score += 4;
    else if (plt < 50) score += 3;
    else if (plt < 100) score += 2;
    else if (plt < 150) score += 1;
  }

  // 3. Liver — Bilirubin (mg/dL)
  const bili = data.bilirubinMg ? Number(data.bilirubinMg) : null;
  if (bili !== null) {
    if (bili >= 12) score += 4;
    else if (bili >= 6) score += 3;
    else if (bili >= 2) score += 2;
    else if (bili >= 1.2) score += 1;
  }

  // 4. Cardiovascular — MAP (simplified, no vasopressor dose tracking)
  if (data.systolicBp && data.diastolicBp) {
    const map = Math.round(Number(data.diastolicBp) + (Number(data.systolicBp) - Number(data.diastolicBp)) / 3);
    if (map < 70) score += 1;
  }

  // 5. CNS — Glasgow Coma Scale
  const gcs = data.gcs;
  if (gcs !== null && gcs !== undefined) {
    if (gcs < 6) score += 4;
    else if (gcs < 10) score += 3;
    else if (gcs < 13) score += 2;
    else if (gcs < 15) score += 1;
  }

  // 6. Renal — Creatinine (mg/dL) or urine output
  const cr = data.serumCreatinine ? Number(data.serumCreatinine) : null;
  const uo = data.urineOutputMl;
  if (cr !== null) {
    if (cr >= 5) score += 4;
    else if (cr >= 3.5) score += 3;
    else if (cr >= 2) score += 2;
    else if (cr >= 1.2) score += 1;
  } else if (uo !== null && uo !== undefined) {
    // 24h urine output approximation (assume single entry = ~4h window)
    const estimated24h = uo * 6;
    if (estimated24h < 200) score += 4;
    else if (estimated24h < 500) score += 3;
  }

  return score;
}
