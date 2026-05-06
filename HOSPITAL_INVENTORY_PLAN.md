# Hospital Inventory Requirements Plan
## Ayphen HMS — Comprehensive Inventory Management Guide

**Version:** 2.0  
**Date:** 2026-05-06  
**Scope:** All departments and areas of a multi-specialty hospital  
**Total Departments Covered:** 30+  
**Total Line Items:** 800+

---

## Table of Contents

1. [Master Categories & Units of Measure](#1-master-categories--units-of-measure)
2. [Emergency Department (ED/Casualty)](#2-emergency-department-edcasualty)
3. [Operation Theatre Complex (OT/OR)](#3-operation-theatre-complex-otor)
4. [Intensive Care Unit (ICU / MICU / SICU)](#4-intensive-care-unit-icu--micu--sicu)
5. [Cardiac ICU (CICU)](#5-cardiac-icu-cicu)
6. [Neonatal ICU (NICU)](#6-neonatal-icu-nicu)
7. [Paediatric ICU (PICU)](#7-paediatric-icu-picu)
8. [General Medical Ward](#8-general-medical-ward)
9. [General Surgical Ward](#9-general-surgical-ward)
10. [Obstetrics & Gynaecology (OBG) Ward](#10-obstetrics--gynaecology-obg-ward)
11. [Paediatric Ward](#11-paediatric-ward)
12. [Orthopaedic Ward](#12-orthopaedic-ward)
13. [Cardiology Department](#13-cardiology-department)
14. [Nephrology & Dialysis Unit](#14-nephrology--dialysis-unit)
15. [Oncology / Chemotherapy Unit](#15-oncology--chemotherapy-unit)
16. [Endoscopy & GI Suite](#16-endoscopy--gi-suite)
17. [Outpatient Department (OPD)](#17-outpatient-department-opd)
18. [Pharmacy](#18-pharmacy)
19. [Clinical Laboratory](#19-clinical-laboratory)
20. [Radiology & Imaging](#20-radiology--imaging)
21. [Blood Bank & Transfusion Medicine](#21-blood-bank--transfusion-medicine)
22. [CSSD (Central Sterile Supply Department)](#22-cssd-central-sterile-supply-department)
23. [Dietary & Nutrition Department](#23-dietary--nutrition-department)
24. [Physiotherapy & Rehabilitation](#24-physiotherapy--rehabilitation)
25. [Dermatology & Cosmetology](#25-dermatology--cosmetology)
26. [Ophthalmology](#26-ophthalmology)
27. [ENT (Ear, Nose & Throat)](#27-ent-ear-nose--throat)
28. [Dental Department](#28-dental-department)
29. [Psychiatry & Mental Health](#29-psychiatry--mental-health)
30. [Mortuary & Post-Mortem](#30-mortuary--post-mortem)
31. [Housekeeping & Biomedical Waste](#31-housekeeping--biomedical-waste)
32. [Laundry & Linen](#32-laundry--linen)
33. [Biomedical Engineering](#33-biomedical-engineering)
34. [Administration, Medical Records & IT](#34-administration-medical-records--it)
35. [Inventory Classification Matrix (ABC / VED / HML)](#35-inventory-classification-matrix)
36. [Reorder & Stock Level Formulas](#36-reorder--stock-level-formulas)
37. [Regulatory Compliance & Storage Requirements](#37-regulatory-compliance--storage-requirements)
38. [System Implementation Roadmap](#38-system-implementation-roadmap)

---

## 1. Master Categories & Units of Measure

### 1.1 Category Codes

| Code | Full Name | Typical Items |
|------|-----------|---------------|
| MED | Medicines & Drugs | Tablets, injections, syrups, vaccines, IV fluids, controlled substances |
| SURG | Surgical Supplies | Sutures, staples, drapes, instruments, implants |
| CONS | Consumables & Disposables | Gloves, syringes, catheters, cannulas, tubes, dressings |
| DIAG | Diagnostics & Reagents | Lab reagents, test kits, contrast media, stains, culture media |
| EQUIP | Equipment & Devices | Monitors, pumps, ventilators, beds, scopes — tracked assets |
| LINEN | Linen & Textiles | Bedsheets, pillow covers, patient gowns, surgical drapes (reusable) |
| HOUSE | Housekeeping Supplies | Cleaning agents, mops, bins, brooms, disinfectants |
| DIET | Dietary & Nutrition | Enteral feeds, supplements, infant formula, kitchen supplies |
| ADMIN | Administrative Supplies | Stationery, forms, wristbands, labels, IT accessories |
| BIO | Biomedical Spare Parts | Pump motors, probe cables, circuit boards, calibration tools |
| BLOOD | Blood & Blood Products | Whole blood, PRBC, FFP, platelets, cryoprecipitate, albumin |
| PPE | Personal Protective Equipment | Masks, gowns, gloves, shields, coveralls, radiation protection |
| IMPL | Implants & Prosthetics | Orthopaedic implants, dental implants, IOLs, stents, meshes |
| CHEM | Chemicals & Reagents | Industrial disinfectants, lab chemicals, sterilants |

### 1.2 Units of Measure (UOM)

| Code | Unit | Primary Use |
|------|------|-------------|
| PCS | Pieces | Individual items |
| BOX | Box | Bulk packaged consumables (50–100 per box) |
| PKT | Packet | Gauze, cotton, dressings, small packs |
| VIAL | Vial | Multi-dose injectable medications |
| AMP | Ampoule | Single-dose injections |
| TAB | Tablets (strip/bottle) | Oral solid medications |
| CAP | Capsules | Oral capsules |
| BTL | Bottle | Liquids, syrups, solutions (50–5000mL) |
| BAG | Bag/Pouch | IV fluids, blood products, nutrition bags |
| ROLL | Roll | Bandages, tapes, films, linen |
| LTR | Litre | Bulk disinfectants, cleaning agents |
| KG | Kilogram | Bulk chemicals, dietary items |
| MTR | Metre | Tubing, cable, fabric |
| SET | Set | Bundled components (IV set, catheter set) |
| KIT | Kit | Pre-assembled procedure kits |
| PAIR | Pair | Gloves (surgical), crutches, stockings |
| UNIT | Unit | Blood units, calibration units |
| REAM | Ream | Paper (500 sheets) |
| CYL | Cylinder | Medical gas cylinders |
| CART | Cartridge | Printer cartridges, point-of-care cartridges |
| SACHET | Sachet | ORS, oral powder sachets |
| STRIP | Strip | Blister packs, glucose test strips |

---

## 2. Emergency Department (ED/Casualty)

### 2.1 Crash Cart & Resuscitation Medications

| Item | Category | UOM | Min Stock | Reorder | Max | Storage | Notes |
|------|----------|-----|-----------|---------|-----|---------|-------|
| Adrenaline (Epinephrine) 1mg/1mL | MED | AMP | 30 | 50 | 150 | Ambient | Cardiac arrest; check crash cart daily |
| Atropine Sulphate 0.6mg/1mL | MED | AMP | 20 | 40 | 120 | Ambient | Bradycardia, organophosphate poisoning |
| Adenosine 6mg/2mL | MED | VIAL | 10 | 20 | 60 | Ambient | SVT; use within 60s of drawing |
| Amiodarone 150mg/3mL | MED | VIAL | 15 | 30 | 80 | Ambient | VT/VF; light sensitive |
| Lignocaine (Lidocaine) 2% 5mL | MED | VIAL | 20 | 35 | 100 | Ambient | Arrhythmia, local anesthesia |
| Sodium Bicarbonate 8.4% 10mL | MED | VIAL | 15 | 30 | 80 | Ambient | Metabolic acidosis, TCA overdose |
| Calcium Gluconate 10% 10mL | MED | AMP | 20 | 35 | 100 | Ambient | Hypocalcemia, hyperkalemia, CCB OD |
| Calcium Chloride 10% 10mL | MED | AMP | 10 | 20 | 60 | Ambient | Preferred in cardiac arrest over gluconate |
| Dextrose 50% 20mL | MED | VIAL | 20 | 40 | 120 | Ambient | Hypoglycemia |
| Glucagon 1mg | MED | VIAL | 10 | 20 | 60 | 2–8°C | Beta-blocker/CCB OD, hypoglycemia |
| Hydrocortisone Sodium Succinate 100mg | MED | VIAL | 25 | 40 | 120 | Ambient | Anaphylaxis, adrenal crisis |
| Methylprednisolone 125mg | MED | VIAL | 10 | 20 | 60 | Ambient | Severe allergic reactions, spinal injury |
| Adrenaline 1mg/10mL (pre-diluted) | MED | AMP | 15 | 25 | 60 | Ambient | Anaphylaxis IM use |
| Chlorpheniramine 10mg/1mL | MED | AMP | 20 | 35 | 100 | Ambient | Anaphylaxis |
| Promethazine 25mg/1mL | MED | AMP | 20 | 35 | 100 | Ambient | Anaphylaxis, nausea |

### 2.2 Emergency Analgesics & Sedation (Controlled)

| Item | Category | UOM | Min Stock | Reorder | Max | Notes |
|------|----------|-----|-----------|---------|-----|-------|
| Morphine Sulphate 10mg/1mL | MED | AMP | 20 | 40 | 120 | CD — double lock; register |
| Fentanyl 50mcg/1mL (0.1mg/2mL) | MED | AMP | 20 | 40 | 100 | CD — rapid onset, titrate carefully |
| Ketamine 500mg/10mL | MED | VIAL | 10 | 20 | 60 | CD — dissociative; airway maintained |
| Midazolam 5mg/1mL | MED | AMP | 15 | 30 | 80 | CD — procedural sedation |
| Diazepam 10mg/2mL | MED | AMP | 20 | 40 | 100 | Seizure, status epilepticus |
| Lorazepam 4mg/1mL | MED | AMP | 15 | 30 | 80 | Status epilepticus first line |
| Phenobarbitone 200mg/1mL | MED | AMP | 10 | 20 | 60 | Refractory seizures, neonatal seizures |
| Phenytoin 250mg/5mL | MED | AMP | 15 | 25 | 60 | Status epilepticus second line |
| Levetiracetam 500mg/5mL | MED | VIAL | 10 | 20 | 60 | Status epilepticus, loading dose |
| Naloxone 0.4mg/1mL | MED | AMP | 15 | 30 | 80 | Opioid reversal |
| Flumazenil 0.1mg/1mL | MED | AMP | 10 | 20 | 60 | Benzodiazepine reversal |
| Tramadol 100mg/2mL | MED | AMP | 20 | 40 | 100 | Moderate pain |
| Ketorolac 30mg/1mL | MED | AMP | 20 | 40 | 100 | Pain, renal colic |
| Paracetamol IV 1g/100mL | MED | BAG | 30 | 50 | 150 | Fever, pain (IV) |
| Diclofenac 75mg/3mL | MED | AMP | 20 | 40 | 100 | Musculoskeletal pain |

### 2.3 Cardiovascular & Vasopressors

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Noradrenaline 4mg/4mL | MED | AMP | 25 | 80 | Septic shock vasopressor |
| Dopamine 200mg/5mL | MED | AMP | 20 | 60 | Cardiogenic shock |
| Dobutamine 250mg/20mL | MED | VIAL | 15 | 50 | Low cardiac output |
| Vasopressin 20IU/1mL | MED | AMP | 10 | 40 | Refractory shock |
| Nitroglycerin 50mg/10mL | MED | VIAL | 10 | 40 | ACS, hypertensive emergency |
| Sodium Nitroprusside 50mg | MED | VIAL | 5 | 20 | Hypertensive crisis; light protect |
| Labetalol 100mg/20mL | MED | VIAL | 10 | 40 | Hypertensive emergency |
| Esmolol 2500mg/250mL | MED | BAG | 5 | 20 | Rate control, AF |
| Verapamil 5mg/2mL | MED | AMP | 10 | 40 | SVT, AF rate control |
| Digoxin 0.5mg/2mL | MED | AMP | 10 | 40 | AF, heart failure |
| Furosemide 20mg/2mL | MED | AMP | 30 | 100 | Acute pulmonary oedema |
| Alteplase (tPA) 50mg | MED | VIAL | 5 | 15 | STEMI (no cath lab), massive PE, stroke |
| Heparin 25000IU/5mL | MED | VIAL | 20 | 60 | ACS, DVT, PE |
| Enoxaparin 40mg/0.4mL | MED | VIAL | 20 | 60 | DVT prophylaxis, ACS |
| Streptokinase 15Lac IU | MED | VIAL | 5 | 15 | STEMI (alternative thrombolytic) |
| Aspirin 300mg (soluble/chewable) | MED | TAB | 30 | 100 | ACS loading dose |
| Clopidogrel 300mg tab | MED | TAB | 20 | 60 | ACS loading dose |
| Ticagrelor 180mg tab | MED | TAB | 10 | 40 | ACS (preferred dual antiplatelet) |

### 2.4 IV Fluids (Emergency Stock)

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Normal Saline 0.9% 500mL | MED | BAG | 200 | 600 | |
| Normal Saline 0.9% 100mL | MED | BAG | 100 | 300 | Drug diluent |
| Ringer's Lactate 500mL | MED | BAG | 200 | 600 | Trauma resuscitation preferred |
| Dextrose 5% 500mL | MED | BAG | 100 | 400 | |
| Dextrose 10% 500mL | MED | BAG | 50 | 150 | Hypoglycemia, neonates |
| Dextrose-Saline (D5NS) 500mL | MED | BAG | 80 | 250 | |
| Plasmalyte 500mL | MED | BAG | 50 | 150 | Balanced crystalloid |
| Colloid (Gelofusine/Voluven) 500mL | MED | BAG | 30 | 100 | Volume resuscitation |
| Mannitol 20% 500mL | MED | BAG | 20 | 60 | Cerebral oedema, raised ICP |
| Sodium Bicarbonate 1.26% 500mL | MED | BAG | 15 | 50 | Metabolic acidosis correction |
| Potassium Chloride 15% Concentrate | MED | VIAL | 30 | 80 | IV admixture only — HIGH ALERT |
| Magnesium Sulphate 50% 2mL | MED | AMP | 20 | 60 | Eclampsia, hypoMg, torsades |
| Albumin 20% 100mL | MED | BTL | 10 | 30 | Septic shock, hypoalbuminaemia |
| Packed Red Blood Cells | BLOOD | UNIT | 10 | 30 | Cross-matched stock |
| Fresh Frozen Plasma | BLOOD | UNIT | 10 | 30 | Coagulopathy, massive transfusion |
| Platelet Concentrate | BLOOD | UNIT | 5 | 15 | Thrombocytopenia |

### 2.5 Antibiotics (Emergency Empirical)

| Item | Category | UOM | Reorder | Max | Common Indication |
|------|----------|-----|---------|-----|-------------------|
| Ceftriaxone 1g IV | MED | VIAL | 30 | 100 | Sepsis, meningitis, pneumonia |
| Cefazolin 1g IV | MED | VIAL | 20 | 60 | Surgical prophylaxis |
| Piperacillin-Tazobactam 4.5g | MED | VIAL | 20 | 80 | Broad-spectrum sepsis |
| Meropenem 1g | MED | VIAL | 20 | 60 | MDR organisms, severe sepsis |
| Imipenem-Cilastatin 500mg | MED | VIAL | 10 | 40 | Severe infections |
| Vancomycin 500mg | MED | VIAL | 20 | 60 | MRSA, gram-positive sepsis |
| Metronidazole 500mg/100mL | MED | BAG | 30 | 100 | Anaerobic/intra-abdominal |
| Clindamycin 600mg/4mL | MED | AMP | 15 | 50 | Soft tissue, necrotizing fasciitis |
| Amikacin 500mg/2mL | MED | VIAL | 15 | 50 | Gram-negative sepsis |
| Gentamicin 80mg/2mL | MED | AMP | 15 | 50 | Gram-negative, synergy |
| Azithromycin 500mg IV | MED | VIAL | 10 | 40 | Atypical pneumonia |
| Ciprofloxacin 400mg/200mL | MED | BAG | 15 | 50 | UTI, enteric fever |
| Fluconazole 200mg/100mL | MED | BAG | 10 | 40 | Candida sepsis |
| Aciclovir 500mg | MED | VIAL | 10 | 30 | HSV encephalitis |
| Amphotericin B 50mg | MED | VIAL | 5 | 20 | Fungal sepsis |
| Doxycycline 100mg IV | MED | VIAL | 10 | 30 | Rickettsial disease |

### 2.6 Airway & Ventilation Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Endotracheal Tube 6.0 cuffed | CONS | PCS | 10 | 40 | |
| Endotracheal Tube 6.5 cuffed | CONS | PCS | 10 | 40 | |
| Endotracheal Tube 7.0 cuffed | CONS | PCS | 15 | 50 | |
| Endotracheal Tube 7.5 cuffed | CONS | PCS | 15 | 50 | Most common adult female |
| Endotracheal Tube 8.0 cuffed | CONS | PCS | 15 | 50 | Most common adult male |
| Endotracheal Tube 8.5 cuffed | CONS | PCS | 10 | 40 | |
| ETT (Uncuffed) 4.0/4.5/5.0 | CONS | PCS | 5 | 20 | Paediatric |
| Reinforced (Armoured) ETT 7.0/7.5 | CONS | PCS | 5 | 20 | ENT, prone position |
| Laryngoscope Blade (Macintosh 3) | CONS | PCS | 10 | 30 | Disposable preferred |
| Laryngoscope Blade (Macintosh 4) | CONS | PCS | 10 | 30 | |
| Laryngoscope Blade (Miller 2) | CONS | PCS | 5 | 15 | Paediatric/difficult airway |
| Video Laryngoscope Blade | CONS | PCS | 5 | 15 | Difficult airway |
| Stylet (Bougie) — Adult | CONS | PCS | 10 | 40 | Difficult intubation aid |
| Stylet (Bougie) — Paeds | CONS | PCS | 5 | 20 | |
| LMA Classic Size 3 | CONS | PCS | 5 | 20 | Supraglottic airway |
| LMA Classic Size 4 | CONS | PCS | 5 | 20 | |
| LMA Classic Size 5 | CONS | PCS | 3 | 12 | Large adult |
| i-gel Supraglottic Airway Size 3/4 | CONS | PCS | 5 | 20 | Rescue airway, no cuff |
| Oropharyngeal Airway 60mm/80mm/90mm | CONS | PCS | 10 | 40 | |
| Nasopharyngeal Airway 6.0/7.0 | CONS | PCS | 10 | 30 | |
| Oxygen Mask (Non-rebreather) | CONS | PCS | 30 | 100 | |
| Venturi Mask 24%/28%/35%/40%/60% | CONS | PCS | 20 | 60 | Controlled O2 delivery |
| Simple Face Mask | CONS | PCS | 20 | 80 | |
| Nasal Cannula (Adult) | CONS | PCS | 40 | 150 | |
| Nasal Cannula (Paeds) | CONS | PCS | 20 | 80 | |
| High Flow Nasal Cannula Set | CONS | PCS | 10 | 30 | HFNO |
| CPAP Mask (Full face) | CONS | PCS | 5 | 15 | NIV |
| BiPAP Circuit | CONS | PCS | 5 | 15 | NIV |
| Tracheostomy Tube Size 7/8 (cuffed) | CONS | PCS | 5 | 20 | |
| Tracheostomy Tube Size 7/8 (uncuffed) | CONS | PCS | 5 | 15 | |
| Suction Catheter 10Fr/12Fr/14Fr | CONS | PCS | 50 | 200 | |
| Yankauer Suction Tip | CONS | PCS | 30 | 100 | Oropharyngeal suction |
| Portable Suction Tubing | CONS | PCS | 20 | 80 | |
| HME Filter | CONS | PCS | 20 | 80 | Ventilated patients |
| CO2 Detector (Colorimetric) | CONS | PCS | 10 | 40 | ETT placement confirmation |
| Cuff Pressure Gauge (Manometer) | EQUIP | PCS | 3 | 6 | Asset — check regularly |
| BVM Adult (Reusable) | EQUIP | PCS | 6 | 10 | Asset |
| BVM Paediatric (Reusable) | EQUIP | PCS | 4 | 8 | Asset |
| BVM Neonatal | EQUIP | PCS | 2 | 4 | Asset |
| Bag Valve Mask (Disposable Adult) | CONS | PCS | 20 | 60 | Single use |

### 2.7 Vascular Access & Monitoring Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| IV Cannula 14G (large bore) | CONS | PCS | 20 | 80 | Trauma resus |
| IV Cannula 16G | CONS | PCS | 30 | 100 | Major blood loss |
| IV Cannula 18G | CONS | BOX | 10 | 40 | Most common adult (50/box) |
| IV Cannula 20G | CONS | BOX | 10 | 40 | |
| IV Cannula 22G | CONS | BOX | 10 | 40 | Elderly, fragile veins |
| IV Cannula 24G | CONS | BOX | 5 | 20 | Paediatric |
| IV Cannula 26G | CONS | BOX | 3 | 12 | Neonatal |
| IO (Intraosseous) Needle Adult | CONS | PCS | 5 | 20 | EZio/Jamshidi — last resort access |
| IO Needle Paediatric | CONS | PCS | 5 | 20 | |
| Central Line Kit (Triple Lumen) | SURG | KIT | 10 | 30 | |
| Central Line Kit (Double Lumen) | SURG | KIT | 5 | 20 | |
| Arterial Line Kit 20G | SURG | KIT | 10 | 30 | |
| IV Extension Set 15cm | CONS | PCS | 50 | 200 | |
| IV Extension Set 100cm | CONS | PCS | 30 | 100 | |
| 3-Way Stopcock | CONS | PCS | 50 | 200 | |
| IV Infusion Set (Standard) | CONS | BOX | 15 | 60 | (20/box) |
| IV Infusion Set (Burette 150mL Paeds) | CONS | BOX | 5 | 20 | |
| Blood Transfusion Set | CONS | PCS | 30 | 100 | |
| Pressure Infuser Bag 500mL | CONS | PCS | 10 | 30 | Rapid infusion |
| Tourniquets (Latex-free) | CONS | PCS | 30 | 100 | |
| Tourniquet (Pneumatic combat) | CONS | PCS | 5 | 20 | Trauma haemorrhage |
| ECG Electrodes (Disposable) | CONS | PKT | 30 | 120 | (10/pkt) |
| ECG Paper Roll 50mm | CONS | ROLL | 10 | 40 | |
| SpO2 Probe (Disposable Adult) | CONS | PCS | 20 | 80 | |
| SpO2 Probe (Disposable Paeds) | CONS | PCS | 10 | 40 | |
| NIBP Cuff Disposable (Adult) | CONS | PCS | 20 | 60 | |
| NIBP Cuff Disposable (Paeds) | CONS | PCS | 10 | 30 | |
| Temperature Probe (Oral/Axillary) | CONS | PCS | 20 | 60 | |
| Rectal Temperature Probe | CONS | PCS | 10 | 30 | |
| Defibrillator Pads (Adult self-adhesive) | CONS | PAIR | 15 | 50 | |
| Defibrillator Pads (Paeds) | CONS | PAIR | 5 | 20 | |
| Defibrillator Gel | CONS | BTL | 5 | 15 | For paddle-type defibrillators |

### 2.8 Urinary & GI Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Foley Catheter 12Fr silicone | CONS | PCS | 10 | 40 |
| Foley Catheter 14Fr silicone | CONS | PCS | 20 | 60 |
| Foley Catheter 16Fr silicone | CONS | PCS | 20 | 60 |
| Foley Catheter 18Fr silicone | CONS | PCS | 15 | 50 |
| Foley Catheter 20Fr silicone (haematuria) | CONS | PCS | 10 | 30 |
| Urine Drainage Bag 2L | CONS | PCS | 40 | 150 |
| Urine Drainage Bag with hourly meter | CONS | PCS | 20 | 60 |
| Nasogastric Tube 8Fr (Paeds) | CONS | PCS | 10 | 40 |
| Nasogastric Tube 12Fr | CONS | PCS | 15 | 50 |
| Nasogastric Tube 14Fr | CONS | PCS | 20 | 60 |
| Nasogastric Tube 16Fr | CONS | PCS | 20 | 60 |
| Ryle's Tube 18Fr | CONS | PCS | 10 | 40 |
| Salem Sump Tube 14/16Fr | CONS | PCS | 10 | 30 |
| Rectal Tube 24Fr/28Fr | CONS | PCS | 5 | 20 |

### 2.9 Wound & Orthopaedic Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Sterile Dressing 10x10cm | CONS | PKT | 50 | 200 |
| Sterile Dressing 20x20cm | CONS | PKT | 20 | 80 |
| Non-adherent Dressing (Mepilex/Mepitel) | CONS | PKT | 15 | 50 |
| Wound Closure Strips 6mm | CONS | BOX | 10 | 40 |
| Wound Closure Strips 12mm | CONS | BOX | 10 | 40 |
| Tissue Adhesive (Dermabond/Histoacryl) | CONS | PCS | 10 | 30 |
| Elastic Adhesive Bandage (EAB) 7.5cm | CONS | ROLL | 20 | 80 |
| Crepe Bandage 5cm | CONS | ROLL | 20 | 80 |
| Crepe Bandage 10cm | CONS | ROLL | 20 | 80 |
| Plaster of Paris 7.5cm | CONS | ROLL | 15 | 60 |
| Plaster of Paris 10cm | CONS | ROLL | 15 | 60 |
| Plaster of Paris 15cm | CONS | ROLL | 10 | 40 |
| Fibreglass Cast 3"/4" | CONS | ROLL | 10 | 30 |
| Orthopaedic Stockinette 3"/4" | CONS | ROLL | 10 | 40 |
| Cast Padding (Webril) 3"/4" | CONS | ROLL | 10 | 40 |
| Cervical Collar Soft (S/M/L) | CONS | PCS | 5 | 20 |
| Cervical Collar Hard (Philadelphia) | CONS | PCS | 5 | 15 |
| Backslab Splint Set | SURG | KIT | 5 | 20 |
| Arm Sling | CONS | PCS | 10 | 30 |
| Cotton Wool Roll 500g | CONS | ROLL | 15 | 60 |

### 2.10 Gloves & PPE (Emergency Stock)

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Sterile Surgical Gloves 6.0 | CONS | PAIR | 10 | 40 |
| Sterile Surgical Gloves 6.5 | CONS | PAIR | 20 | 80 |
| Sterile Surgical Gloves 7.0 | CONS | PAIR | 20 | 80 |
| Sterile Surgical Gloves 7.5 | CONS | PAIR | 20 | 80 |
| Sterile Surgical Gloves 8.0 | CONS | PAIR | 10 | 40 |
| Nitrile Exam Gloves Small | CONS | BOX | 20 | 80 |
| Nitrile Exam Gloves Medium | CONS | BOX | 30 | 120 |
| Nitrile Exam Gloves Large | CONS | BOX | 20 | 80 |
| Nitrile Exam Gloves XL | CONS | BOX | 10 | 40 |
| Surgical Mask (3-ply) | PPE | BOX | 20 | 80 |
| N95 Respirator FFP2 | PPE | BOX | 10 | 40 |
| Face Shield | PPE | PCS | 20 | 60 |
| Apron (Disposable waterproof) | PPE | PKT | 20 | 80 |
| Isolation Gown (full) | PPE | PKT | 10 | 40 |
| Eye Protection (Goggles) | PPE | PCS | 10 | 30 |
| Shoe Cover (Disposable) | PPE | PKT | 10 | 40 |
| Cap (Disposable) | PPE | PKT | 10 | 40 |

### 2.11 Blood Collection & Diagnostics

| Item | Category | UOM | Reorder | Max | Tube Color / Purpose |
|------|----------|-----|---------|-----|----------------------|
| EDTA Tube 3mL (CBC) | CONS | BOX | 15 | 60 | Lavender/Purple |
| Plain Tube 5mL (serum) | CONS | BOX | 15 | 60 | Red |
| SST Tube 5mL (serum separator) | CONS | BOX | 15 | 60 | Gold |
| Citrate Tube 3mL (coagulation) | CONS | BOX | 10 | 40 | Blue — fill to line |
| Fluoride Oxalate 2mL (glucose) | CONS | BOX | 10 | 40 | Grey |
| Heparin Tube 3mL (ABG backup) | CONS | BOX | 10 | 40 | Green |
| Blood Culture Bottle (Aerobic) | DIAG | PCS | 30 | 100 | Bactec/BacT ALERT |
| Blood Culture Bottle (Anaerobic) | DIAG | PCS | 20 | 80 | |
| ABG Syringe Kit (Heparinized) | CONS | BOX | 10 | 30 | Arterial blood gas |
| Urine Container 60mL (sterile) | CONS | PCS | 50 | 200 | |
| Stool Container | CONS | PCS | 20 | 80 | |
| Cerebrospinal Fluid (CSF) Tube | CONS | PCS | 10 | 40 | Numbered 1/2/3 |
| Vacutainer Holder | CONS | PCS | 30 | 100 | |
| Vacutainer Needle 21G | CONS | BOX | 20 | 80 | |
| Butterfly Needle 21G/23G | CONS | BOX | 10 | 40 | Fragile veins |
| Glucose Test Strip (Glucometer) | CONS | BOX | 10 | 30 | 50/box |
| Lancet | CONS | BOX | 10 | 30 | 100/box |
| Urine Dipstick 10-parameter | DIAG | BOX | 10 | 30 | 50/box |
| Pregnancy Test (hCG strip) | DIAG | BOX | 5 | 20 | 25/box |
| Malaria Rapid Test (Ag P.falciparum/vivax) | DIAG | BOX | 5 | 20 | 25/box |
| Dengue NS1 + IgG/IgM Combo | DIAG | BOX | 5 | 20 | |
| COVID-19 Antigen Rapid Test | DIAG | BOX | 10 | 40 | |
| Troponin I Rapid Test | DIAG | BOX | 5 | 20 | POCT for ACS |
| D-Dimer Rapid Test | DIAG | BOX | 5 | 20 | DVT/PE screening |
| CRP Rapid Test | DIAG | BOX | 5 | 20 | |
| HbA1c Rapid Cartridge | DIAG | CART | 5 | 20 | POCT analyzer |

### 2.12 Procedural Kits & Miscellaneous

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Chest Drain Tube 28Fr | SURG | PCS | 5 | 20 | Pleural effusion/haemothorax |
| Chest Drain Tube 32Fr | SURG | PCS | 5 | 20 | Haemothorax |
| Chest Drain Tube 36Fr | SURG | PCS | 3 | 10 | Large haemothorax |
| Seldinger Chest Drain Kit 12Fr | SURG | KIT | 5 | 15 | Pneumothorax |
| Underwater Seal Drain | SURG | PCS | 5 | 20 | |
| Pleural Aspiration Needle Kit | SURG | KIT | 5 | 15 | Diagnostic tap |
| Peritoneal Lavage Kit | SURG | KIT | 3 | 10 | FAST negative, trauma |
| Lumbar Puncture Kit | SURG | KIT | 5 | 15 | Meningitis, SAH |
| Spinal Needle 22G/23G | CONS | PCS | 10 | 30 | |
| Bone Marrow Aspiration Needle | SURG | PCS | 3 | 10 | |
| Pericardiocentesis Needle Kit | SURG | KIT | 3 | 10 | Cardiac tamponade |
| Fogarty Embolectomy Catheter | SURG | PCS | 3 | 10 | Peripheral arterial occlusion |
| Syringe 1mL (insulin) | CONS | BOX | 5 | 20 | |
| Syringe 2mL | CONS | BOX | 10 | 40 | |
| Syringe 5mL | CONS | BOX | 10 | 40 | |
| Syringe 10mL | CONS | BOX | 10 | 40 | |
| Syringe 20mL | CONS | BOX | 5 | 20 | |
| Syringe 50mL (enteral/irrigation) | CONS | BOX | 5 | 20 | |
| Needle 18G (drawing up) | CONS | BOX | 5 | 20 | |
| Needle 21G | CONS | BOX | 10 | 40 | |
| Needle 23G | CONS | BOX | 10 | 40 | |
| Needle 25G (intradermal/SC) | CONS | BOX | 5 | 20 | |
| Alcohol Swabs (70% IPA) | CONS | BOX | 20 | 80 | 100/box |
| Chlorhexidine Swabs | CONS | BOX | 10 | 40 | |
| Povidone Iodine Solution 10% 500mL | CONS | BTL | 20 | 80 | |
| Chlorhexidine 2% in IPA 500mL | CONS | BTL | 20 | 80 | |
| Normal Saline 20mL (flush ampoule) | MED | AMP | 50 | 200 | IV line flush |
| Normal Saline 10mL (flush) | MED | AMP | 50 | 200 | |
| Heparin Flush 10IU/mL 5mL | MED | VIAL | 20 | 80 | Maintain line patency |
| Triage Tags (colour-coded 4-tier) | ADMIN | PKT | 10 | 30 | Mass casualty |
| Patient Wristband (white printable) | ADMIN | ROLL | 10 | 30 | |
| Patient Wristband (red allergy) | ADMIN | ROLL | 5 | 20 | |
| Sharps Container 5L | CONS | PCS | 20 | 60 | |
| Clinical Waste Bag Yellow 15L | CONS | PKT | 30 | 100 | |
| Specimen Transport Bag | CONS | PKT | 20 | 80 | |
| Portable O2 Cylinder D-size | EQUIP | CYL | 5 | 10 | For transport |
| Portable O2 Regulator | EQUIP | PCS | 5 | 10 | Asset |
| Suture Tray (Minor procedure) | SURG | KIT | 10 | 30 | |

### 2.13 Emergency Equipment Assets (Minimum Quantities)

| Equipment | Min Units | Check Frequency | Notes |
|-----------|-----------|-----------------|-------|
| Crash Cart (Adult) — stocked | 2 | Daily checklist | |
| Crash Cart (Paeds) — stocked | 1 | Daily checklist | |
| Defibrillator / Cardioverter | 2 | Daily battery check | |
| AED (accessible in triage) | 1 | Monthly test | |
| Portable Ventilator (transport) | 2 | Weekly check | |
| Mechanical CPR Device (LUCAS/AutoPulse) | 1 | Monthly service | |
| Video Laryngoscope | 1 | Before each use | |
| Difficult Airway Trolley | 1 | Weekly stock check | |
| Ultrasound (POCUS) | 1 | Daily | FAST, line placement |
| Point-of-Care ABG Analyzer | 1 | Daily calibration | |
| Glucometer | 4 | Daily QC | |
| Portable Monitor (ECG/SpO2/NIBP/Temp/EtCO2) | 4 | Weekly | |
| Transport Monitor | 2 | Before each use | |
| Infusion Pump | 8 | PPM monthly | |
| Syringe Pump | 8 | PPM monthly | |
| Portable Suction Unit | 4 | Weekly | |
| Triage Wheelchair | 4 | Weekly | |
| Stretcher/Trolley | 6 | Weekly | |
| Spinal Board | 2 | Monthly | |
| Scoop Stretcher | 2 | Monthly | |
| Vacuum Mattress | 1 | Monthly | |

---

## 3. Operation Theatre Complex (OT/OR)

### 3.1 Anaesthesia Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Propofol 200mg/20mL (1%) | MED | VIAL | 30 | 100 | TIVA, induction |
| Propofol 500mg/50mL (1%) | MED | VIAL | 20 | 60 | TCI infusion |
| Thiopentone Sodium 500mg | MED | VIAL | 20 | 60 | Induction, head injury |
| Etomidate 20mg/10mL | MED | AMP | 15 | 50 | Haemodynamically unstable |
| Ketamine 500mg/10mL | MED | VIAL | 15 | 50 | Paeds induction, burns, analgesia |
| Dexmedetomidine 200mcg/2mL | MED | VIAL | 10 | 40 | Sedation, adjunct |
| Sevoflurane 250mL | MED | BTL | 10 | 30 | Maintenance, paeds mask induction |
| Isoflurane 250mL | MED | BTL | 8 | 24 | Maintenance |
| Desflurane 240mL | MED | BTL | 5 | 20 | Fast wakeup, day surgery |
| Nitrous Oxide Cylinder | MED | CYL | 3 | 10 | Supplement analgesia |
| Oxygen Cylinder F-size | MED | CYL | 5 | 20 | Backup for pipeline |
| Suxamethonium (Succinylcholine) 100mg | MED | VIAL | 20 | 60 | Rapid sequence intubation |
| Rocuronium 50mg/5mL | MED | VIAL | 25 | 80 | NMB agent |
| Vecuronium 10mg | MED | VIAL | 20 | 60 | NMB agent |
| Atracurium 50mg/5mL | MED | AMP | 15 | 50 | NMB — organ-independent elimination |
| Cis-Atracurium 10mg/5mL | MED | AMP | 10 | 40 | |
| Neostigmine 2.5mg/1mL | MED | AMP | 20 | 60 | NMB reversal |
| Sugammadex 200mg/2mL | MED | VIAL | 10 | 30 | Rapid rocuronium reversal |
| Glycopyrrolate 0.2mg/1mL | MED | AMP | 15 | 50 | With neostigmine |
| Atropine 0.6mg/1mL | MED | AMP | 20 | 60 | Bradycardia during anaesthesia |
| Bupivacaine 0.5% Isobaric 20mL | MED | VIAL | 20 | 80 | Epidural, nerve blocks |
| Bupivacaine 0.5% Hyperbaric 4mL | MED | VIAL | 20 | 80 | Spinal anaesthesia |
| Ropivacaine 0.75% 10mL | MED | VIAL | 15 | 60 | Epidural, nerve blocks |
| Ropivacaine 0.2% 200mL | MED | BAG | 10 | 30 | Epidural infusion |
| Levobupivacaine 0.5% | MED | VIAL | 10 | 40 | Lower cardiotoxicity |
| Lignocaine 2% 20mL | MED | VIAL | 20 | 60 | Topical, IV, infiltration |
| Lignocaine 10% Spray | MED | BTL | 10 | 30 | Airway topicalisation |
| Fentanyl 500mcg/10mL | MED | AMP | 20 | 60 | Opioid intraop |
| Fentanyl 100mcg/2mL | MED | AMP | 20 | 60 | |
| Remifentanil 1mg/2mg | MED | VIAL | 10 | 40 | TIVA/TCI — ultra-short |
| Sufentanil 250mcg/5mL | MED | AMP | 5 | 20 | Cardiac surgery |
| Morphine 10mg/1mL | MED | AMP | 20 | 60 | CD |
| Hydromorphone 2mg/1mL | MED | AMP | 10 | 30 | CD |
| Alfentanil 5mg/10mL | MED | AMP | 5 | 20 | |
| Ondansetron 4mg/2mL | MED | AMP | 30 | 100 | PONV prophylaxis |
| Dexamethasone 8mg/2mL | MED | AMP | 20 | 80 | PONV, airway oedema |
| Tranexamic Acid 500mg/5mL | MED | AMP | 20 | 80 | Reduce surgical blood loss |
| Neostigmine 2.5mg + Atropine 1.2mg | MED | AMP | 15 | 50 | Reversal combination |
| Physostigmine 1mg | MED | AMP | 5 | 20 | Central anticholinergic syndrome |
| Dantrolene Sodium 20mg | MED | VIAL | 10 | 30 | Malignant hyperthermia (MUST STOCK) |
| Labetalol 100mg/20mL | MED | VIAL | 10 | 30 | Intraop hypertension |
| Esmolol 100mg/10mL | MED | VIAL | 10 | 30 | Intraop rate control |
| Vasopressin 20IU/1mL | MED | AMP | 10 | 30 | Vasoconstriction |
| Methylergonovine 0.2mg/1mL | MED | AMP | 10 | 30 | Postpartum haemorrhage (OBG OT) |
| Oxytocin 5IU/1mL | MED | AMP | 20 | 60 | Uterotonic (OBG OT) |
| Carboprost 250mcg/1mL | MED | AMP | 5 | 15 | PPH |
| Misoprostol 200mcg tab | MED | TAB | 10 | 30 | PPH |
| Protamine Sulphate 50mg/5mL | MED | VIAL | 10 | 30 | Heparin reversal (cardiac) |
| Heparin 25000IU/5mL | MED | VIAL | 15 | 50 | Anticoagulation during bypass |
| Ephedrine 30mg/1mL | MED | AMP | 20 | 60 | Spinal hypotension |
| Phenylephrine 10mg/1mL | MED | VIAL | 10 | 40 | Spinal hypotension, vasoconstriction |
| Metaraminol 10mg/1mL | MED | VIAL | 10 | 30 | Vasopressor |

### 3.2 IV Fluids (OT Requirement)

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Normal Saline 0.9% 500mL | MED | BAG | 100 | 400 |
| Normal Saline 0.9% 1000mL | MED | BAG | 50 | 200 |
| Normal Saline 0.9% 100mL | MED | BAG | 50 | 200 |
| Ringer's Lactate 500mL | MED | BAG | 100 | 400 |
| Ringer's Lactate 1000mL | MED | BAG | 50 | 200 |
| Plasmalyte 500mL | MED | BAG | 50 | 150 |
| Dextrose 5% 500mL | MED | BAG | 50 | 200 |
| Dextrose 10% 500mL | MED | BAG | 20 | 80 |
| Colloid (Gelofusine/Voluven) 500mL | MED | BAG | 20 | 80 |
| Albumin 4% 500mL | MED | BTL | 10 | 30 |
| Mannitol 20% 500mL | MED | BAG | 15 | 50 |

### 3.3 Surgical Drapes & Packs

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Universal Drape Pack (4-piece) | SURG | PKT | 20 | 80 | |
| Abdominal Laparotomy Drape | SURG | PKT | 25 | 80 | With hand/instrument pouch |
| Caesarean Section Pack | SURG | PKT | 20 | 60 | |
| Hip Drape (total arthroplasty) | SURG | PKT | 10 | 30 | |
| Knee Drape | SURG | PKT | 10 | 30 | |
| Shoulder Drape | SURG | PKT | 5 | 20 | |
| Craniotomy Drape | SURG | PKT | 10 | 30 | Includes side fenestrations |
| Cardiovascular Drape Pack | SURG | PKT | 10 | 30 | |
| Laparoscopy Drape (7-piece) | SURG | PKT | 15 | 50 | |
| Ophthalmic Drape (fenestrated) | SURG | PKT | 10 | 40 | |
| ENT / Head-neck Drape | SURG | PKT | 10 | 30 | |
| Urological Drape (cystoscopy) | SURG | PKT | 10 | 30 | |
| Paediatric Universal Drape | SURG | PKT | 10 | 30 | |
| Sterile Table Drape (mayo tray) | SURG | PCS | 30 | 100 | |
| Sterile Back Table Cover | SURG | PCS | 30 | 100 | |
| Adhesive Incise Drape (Ioban) | SURG | PCS | 20 | 60 | |
| Adhesive Incise Drape (plain) | SURG | PCS | 30 | 80 | |
| Wound Protector Retractor (small/medium/large) | SURG | PCS | 10 | 30 | |
| Sterile Surgical Gown (SMS fabric) | SURG | PCS | 80 | 300 | |
| Sterile Surgical Gown (reinforced) | SURG | PCS | 30 | 100 | High fluid procedures |
| Sterile Surgical Towel | SURG | PCS | 150 | 500 | |
| Sterile Gauze 4x4" (counted) | SURG | PKT | 80 | 300 | 10/pkt |
| Lap Sponge (Laparotomy sponge, counted) | SURG | PKT | 50 | 200 | Radioopaque marker |
| Neuro Patty / Cottonoid | SURG | PKT | 10 | 30 | |
| Surgical Suction Canister 1L | SURG | PCS | 40 | 150 | |
| Surgical Suction Canister 2L | SURG | PCS | 20 | 80 | |
| Surgical Suction Tubing (Yankauer+) | SURG | PCS | 40 | 150 | |
| Cell Saver Blood Recovery Reservoir | SURG | PCS | 5 | 15 | Autotransfusion |

### 3.4 Sutures — Complete List

| Item | Category | UOM | Reorder | Max | Use |
|------|----------|-----|---------|-----|-----|
| Vicryl 0 (1-metric) | SURG | BOX | 5 | 15 | Deep fascia, viscera |
| Vicryl 1-0 (2-metric) | SURG | BOX | 5 | 15 | Fascia, muscle |
| Vicryl 2-0 (3-metric) | SURG | BOX | 5 | 20 | Subcutaneous, soft tissue |
| Vicryl 3-0 (2-metric) | SURG | BOX | 5 | 20 | Subcutaneous, vessel ties |
| Vicryl 4-0 (1.5-metric) | SURG | BOX | 5 | 15 | Plastic, paeds |
| Vicryl 5-0 | SURG | BOX | 3 | 10 | Fine repairs |
| Vicryl Rapide 3-0/4-0 | SURG | BOX | 3 | 10 | Skin, dissolves in 10 days |
| Vicryl Plus (antibacterial) 2-0/3-0 | SURG | BOX | 5 | 15 | Infection risk cases |
| PDS II 0 | SURG | BOX | 5 | 15 | Slow-absorbing fascia |
| PDS II 1-0 | SURG | BOX | 5 | 15 | Abdominal wall closure |
| PDS II 2-0 | SURG | BOX | 5 | 15 | Urological, cardiovascular |
| PDS II 3-0 | SURG | BOX | 3 | 10 | Paeds |
| Monocryl 3-0/4-0 | SURG | BOX | 5 | 15 | Subcuticular skin closure |
| Prolene (Polypropylene) 2-0 | SURG | BOX | 5 | 20 | Abdominal wall, hernia |
| Prolene 3-0 | SURG | BOX | 5 | 20 | Vessel anastomosis, hernia |
| Prolene 4-0 | SURG | BOX | 5 | 15 | Vascular, plastic |
| Prolene 5-0 | SURG | BOX | 3 | 10 | Microvascular, ophthalmic |
| Prolene 6-0 | SURG | BOX | 3 | 10 | Vascular anastomosis |
| Prolene 7-0 | SURG | BOX | 2 | 8 | Cardiac, microvascular |
| Nylon 2-0 | SURG | BOX | 3 | 10 | Skin closure (tension) |
| Nylon 3-0 | SURG | BOX | 5 | 20 | General skin closure |
| Nylon 4-0 | SURG | BOX | 5 | 15 | Fine skin, face |
| Nylon 5-0 | SURG | BOX | 3 | 10 | Face, ophthalmic |
| Nylon 6-0 | SURG | BOX | 2 | 8 | Ophthalmic, microsurgery |
| Silk 1-0 (ties) | SURG | BOX | 3 | 12 | Ligatures, vessel ties |
| Silk 2-0 | SURG | BOX | 3 | 12 | Ties, stay sutures |
| Silk 3-0 | SURG | BOX | 3 | 10 | General |
| Chromic Catgut 0 | SURG | BOX | 3 | 10 | Soft tissue, slowly absorbed |
| Chromic Catgut 2-0 | SURG | BOX | 3 | 10 | Mucosa |
| Plain Catgut 2-0/3-0 | SURG | BOX | 3 | 10 | Rapidly absorbed mucosa |
| Ethibond (Polyester) 2-0 | SURG | BOX | 3 | 10 | Cardiac valve repair |
| Gore-Tex (PTFE) 4-0/5-0 | SURG | BOX | 2 | 6 | Vascular, cardiac |
| Staple Skin Closure (35W/55W) | SURG | BOX | 5 | 20 | Scalp, trunk |
| Staple Remover | SURG | PCS | 10 | 40 | |
| Linear Stapler (Thoracoabdominal) | SURG | PCS | 3 | 10 | Bowel resection |
| Circular Stapler 25mm/28mm/33mm | SURG | PCS | 3 | 10 | Colorectal anastomosis |
| Endo GIA (Laparoscopic) 45mm/60mm | SURG | PCS | 5 | 15 | Laparoscopic resection |
| Endoclip (5mm, titanium) | SURG | BOX | 5 | 15 | Laparoscopic haemostasis |
| Haemoclip (large/medium) | SURG | BOX | 5 | 15 | Open surgery |

### 3.5 Haemostasis & Specialty Items

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Bone Wax (2.5g) | SURG | PCS | 10 | 30 | Bony bleeding |
| Surgicel (Oxidised Cellulose) 5x7.5cm | SURG | PCS | 15 | 40 | Topical haemostat |
| Surgicel Fibrillar | SURG | PCS | 10 | 30 | Fine surfaces |
| Gelfoam Sponge | SURG | PCS | 15 | 40 | |
| Floseal Haemostatic Matrix | SURG | PCS | 5 | 15 | High-cost, neurosurgery |
| Tisseel Fibrin Sealant | SURG | KIT | 5 | 10 | Anastomosis, CSF leak |
| Bipolar Absorbable Haemostat | SURG | PCS | 5 | 15 | |
| Vascular Graft Dacron 6mm/8mm/10mm | IMPL | PCS | 2 | 6 | Vascular surgery |
| PTFE Vascular Graft | IMPL | PCS | 2 | 6 | |
| Prosthetic Mesh (Prolene) | IMPL | PCS | 5 | 15 | Hernia repair |
| Biologic Mesh | IMPL | PCS | 3 | 8 | Contaminated hernia |
| Vessel Loop (blue/yellow/red) | SURG | PCS | 15 | 50 | |
| Bulldog Clamp | SURG | PCS | 5 | 20 | Vascular temporary occlusion |
| Silastic Sloop | SURG | PCS | 5 | 20 | |

### 3.6 Electrosurgery, Scopes & Energy Devices

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Monopolar Diathermy Pencil (disposable) | SURG | PCS | 30 | 100 | |
| Monopolar Diathermy Pencil (reusable) | EQUIP | PCS | 5 | 10 | Asset |
| Bipolar Forceps (disposable) | SURG | PCS | 20 | 60 | |
| Patient Return Electrode (dispersive pad) | SURG | PCS | 30 | 100 | |
| Diathermy Extension Cable | SURG | PCS | 5 | 15 | |
| Harmonic Scalpel Blade (5mm) | SURG | PCS | 5 | 15 | Ultrasonic dissection |
| Harmonic Scalpel Blade (10mm) | SURG | PCS | 3 | 10 | |
| LigaSure Vessel Sealer (5mm) | SURG | PCS | 5 | 15 | Advanced bipolar |
| LigaSure (10mm open) | SURG | PCS | 3 | 10 | |
| Trocar 5mm (disposable) | SURG | PCS | 15 | 50 | |
| Trocar 10mm (disposable) | SURG | PCS | 15 | 50 | |
| Trocar 12mm (disposable) | SURG | PCS | 10 | 40 | |
| Trocar 15mm (disposable) | SURG | PCS | 5 | 20 | |
| Trocar Balloon (Hasson) | SURG | PCS | 5 | 15 | Open Hasson technique |
| Laparoscopy Irrigation/Suction Cannula | SURG | PCS | 10 | 40 | |
| CO2 Gas (for laparoscopy) | CONS | CYL | 5 | 15 | Medical grade CO2 |
| Veress Needle (disposable) | SURG | PCS | 10 | 30 | Pneumoperitoneum |
| Specimen Retrieval Bag (endobag) | SURG | PCS | 10 | 30 | |
| Robotic Instrument Tip Guard | CONS | PCS | 5 | 15 | If robotic suite present |

### 3.7 Nerve Stimulators & Regional Anaesthesia

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Epidural Catheter 18G | CONS | PCS | 20 | 60 |
| Epidural Needle (Tuohy) 18G | CONS | PCS | 20 | 60 |
| Epidural LOR Syringe | CONS | PCS | 20 | 60 |
| Epidural Filter 0.2 micron | CONS | PCS | 20 | 60 |
| Epidural Catheter Connector | CONS | PCS | 20 | 60 |
| Spinal Needle 25G (Quincke) | CONS | PCS | 20 | 60 |
| Spinal Needle 26G (Atraucan/Whitacre) | CONS | PCS | 20 | 60 |
| Spinal Needle 27G (Whitacre) | CONS | PCS | 10 | 40 |
| Combined Spinal-Epidural (CSE) Kit | SURG | KIT | 10 | 30 |
| Peripheral Nerve Block Needle (Stimuplex) | CONS | PCS | 10 | 30 |
| Peripheral Nerve Block Catheter Kit | SURG | KIT | 5 | 20 |
| Echogenic Nerve Block Needle | CONS | PCS | 10 | 30 |
| Insulating Tape (for blocks) | CONS | ROLL | 5 | 15 |

### 3.8 Skin Prep & Infection Control (OT)

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Chlorhexidine 2% + IPA 70% Scrub Brush | CONS | PCS | 30 | 100 |
| Chlorhexidine Applicator (CHG) | CONS | PCS | 20 | 80 |
| Betadine Solution 500mL | CONS | BTL | 20 | 60 |
| Betadine Scrub 500mL | CONS | BTL | 20 | 60 |
| Alcohol 70% Isopropyl 500mL | CONS | BTL | 20 | 60 |
| Surgical Skin Marker (sterile) | CONS | PCS | 20 | 80 |
| Sterile Ruler | CONS | PCS | 10 | 30 |
| Hair Clipper Blade (disposable) | CONS | PCS | 20 | 60 |
| Eye Patches (sterile) | CONS | PCS | 20 | 60 |
| Throat Pack (pre-moistened) | CONS | PCS | 20 | 60 |
| Dental Guard (mouth prop) | CONS | PCS | 10 | 30 |
| OT Hand Rub Alcohol 500mL | PPE | BTL | 30 | 100 |
| Surgical Shoe Cover (disposable) | PPE | PKT | 20 | 80 |
| OT Cap (disposable) | PPE | PKT | 20 | 80 |
| OT Mask | PPE | BOX | 20 | 80 |

### 3.9 Patient Monitoring (OT) Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Anaesthesia Breathing Circuit Adult | CONS | PCS | 20 | 60 |
| Anaesthesia Breathing Circuit Paeds | CONS | PCS | 10 | 30 |
| Anaesthesia Breathing Circuit Neonatal | CONS | PCS | 5 | 20 |
| BIS (Bispectral Index) Sensor Adult | CONS | PCS | 10 | 30 |
| Nerve Stimulator Electrode (percutaneous) | CONS | PKT | 10 | 40 |
| Invasive Arterial Pressure Transducer Kit | CONS | KIT | 20 | 60 |
| CVP Transducer Tubing Kit | CONS | KIT | 15 | 50 |
| Cerebral Oximetry (NIRS) Sensor | CONS | PCS | 5 | 15 |
| Temperature Probe (oesophageal) | CONS | PCS | 10 | 30 |
| Temperature Probe (bladder) | CONS | PCS | 10 | 30 |
| Foley Catheter Temp-Sensing | CONS | PCS | 10 | 30 |
| CO2 Sampling Line (EtCO2) | CONS | PCS | 20 | 60 |
| Warming Blanket (forced air) | CONS | PCS | 20 | 60 |
| Warming Blanket (underbody) | CONS | PCS | 10 | 30 |
| Fluid Warming Set | CONS | SET | 15 | 50 |
| Nasogastric Tube (intraop) 12Fr/14Fr | CONS | PCS | 10 | 30 |
| Urethral Catheter 14Fr (intraop) | CONS | PCS | 20 | 60 |
| Jackson-Pratt Drain (closed drain) | CONS | PCS | 15 | 50 |
| Blake Drain | CONS | PCS | 10 | 30 |
| Penrose Drain | CONS | PCS | 10 | 30 |
| Closed Wound Suction Drain (Redivac) | CONS | PCS | 10 | 30 |
| Chest Drain Tube 24Fr/28Fr | CONS | PCS | 5 | 20 |
| Abdominal Drain Tube | CONS | PCS | 10 | 30 |
| T-Tube (Biliary) | CONS | PCS | 5 | 15 |
| Ureteric Stent (JJ stent) | IMPL | PCS | 5 | 15 |
| Nephrostomy Tube | SURG | PCS | 3 | 10 |
| Surgical Loupes (reusable) | EQUIP | PCS | 3 | 5 | Asset |

## 4. Intensive Care Unit (ICU / MICU / SICU)

### 4.1 ICU Sedation, Analgesia & Infusion Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Propofol 200mg/20mL | MED | VIAL | 40 | 150 | Long-term sedation |
| Midazolam 15mg/3mL | MED | AMP | 30 | 100 | CD |
| Lorazepam 4mg/1mL | MED | AMP | 20 | 80 | CD |
| Dexmedetomidine 200mcg/2mL | MED | VIAL | 20 | 60 | Cooperative sedation |
| Fentanyl 500mcg/10mL | MED | AMP | 30 | 100 | CD — analgesia infusion |
| Morphine 10mg/1mL | MED | AMP | 30 | 100 | CD |
| Hydromorphone 2mg/1mL | MED | AMP | 15 | 50 | CD |
| Remifentanil 2mg | MED | VIAL | 10 | 40 | CD — short procedures |
| Ketamine 500mg/10mL | MED | VIAL | 10 | 40 | CD — analgesic sedation |
| Rocuronium 50mg/5mL | MED | VIAL | 20 | 80 | NMB for ventilator dyssynchrony |
| Atracurium 50mg/5mL | MED | AMP | 10 | 40 | NMB — organ independent |
| Sugammadex 200mg/2mL | MED | VIAL | 5 | 20 | Rocuronium reversal |
| Cisatracurium 10mg/5mL | MED | AMP | 10 | 40 | ARDS — NMB |

### 4.2 ICU Vasopressors & Cardiovascular

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Noradrenaline 4mg/4mL | MED | AMP | 30 | 100 | First-line vasopressor |
| Vasopressin 20IU/1mL | MED | AMP | 15 | 50 | Second-line vasopressor |
| Terlipressin 0.5mg/5mL | MED | VIAL | 10 | 30 | Hepatorenal syndrome |
| Adrenaline 1mg/1mL | MED | AMP | 30 | 100 | Refractory shock |
| Dobutamine 250mg/20mL | MED | VIAL | 15 | 50 | Low output states |
| Dopamine 200mg/5mL | MED | AMP | 10 | 40 | Renal dose/ backup |
| Milrinone 20mg/20mL | MED | VIAL | 5 | 20 | Cardiogenic shock, RHF |
| Levosimendan 12.5mg/5mL | MED | VIAL | 3 | 10 | Acute decompensated HF |
| Sodium Nitroprusside 50mg | MED | VIAL | 5 | 20 | Hypertensive crisis; light protect |
| Nitroglycerin 50mg/10mL | MED | VIAL | 10 | 40 | |
| Amiodarone 150mg/3mL | MED | VIAL | 15 | 50 | |
| Digoxin 0.5mg/2mL | MED | AMP | 10 | 40 | |
| Adenosine 6mg/2mL | MED | VIAL | 10 | 30 | |
| Esmolol 2500mg/250mL | MED | BAG | 5 | 20 | |
| Labetalol 100mg/20mL | MED | VIAL | 10 | 30 | |
| Furosemide 20mg/2mL | MED | AMP | 40 | 150 | Diuresis management |
| Torsemide 10mg/2mL | MED | AMP | 10 | 40 | Loop diuretic alternative |
| Acetazolamide 500mg | MED | VIAL | 5 | 20 | Metabolic alkalosis |
| Spironolactone 50mg tab | MED | TAB | 5 | 20 | |
| Hydralazine 20mg/1mL | MED | AMP | 5 | 20 | Hypertension (alternative) |

### 4.3 ICU Anticoagulation & Blood

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Heparin 25000IU/5mL | MED | VIAL | 25 | 80 | DVT prophylaxis, CRRT |
| Heparin 5000IU/5mL | MED | VIAL | 20 | 60 | Flush concentration |
| Enoxaparin 40mg/0.4mL | MED | VIAL | 30 | 100 | DVT prophylaxis |
| Enoxaparin 60mg/0.6mL | MED | VIAL | 20 | 60 | Treatment dose (lower weight) |
| Enoxaparin 80mg/0.8mL | MED | VIAL | 20 | 60 | Treatment dose |
| Warfarin 5mg tab | MED | TAB | 5 | 20 | |
| Protamine Sulphate 50mg/5mL | MED | VIAL | 10 | 30 | Heparin reversal |
| Tranexamic Acid 500mg/5mL | MED | AMP | 20 | 60 | Haemorrhage control |
| Vitamin K 10mg/1mL | MED | AMP | 15 | 50 | Anticoagulant reversal |
| Vitamin K 10mg tab (oral) | MED | TAB | 5 | 20 | |
| Prothrombin Complex Concentrate 500IU | MED | VIAL | 5 | 15 | Urgent warfarin reversal |
| Andexanet Alfa (reversal for rivaroxaban) | MED | VIAL | 3 | 8 | High-cost reversal agent |
| Desmopressin (DDAVP) 4mcg/1mL | MED | AMP | 5 | 20 | Uremic platelet dysfunction |
| Packed Red Blood Cells | BLOOD | UNIT | 20 | 60 | 24h stock maintained |
| Fresh Frozen Plasma | BLOOD | UNIT | 15 | 50 | |
| Platelets (Random / SDP) | BLOOD | UNIT | 10 | 30 | |
| Cryoprecipitate | BLOOD | UNIT | 10 | 30 | DIC, fibrinogen < 1.5g/L |
| Albumin 20% 100mL | MED | BTL | 10 | 30 | |
| Albumin 4% 500mL | MED | BTL | 5 | 20 | |

### 4.4 ICU Antibiotics & Antivirals

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Piperacillin-Tazobactam 4.5g | MED | VIAL | 30 | 100 |
| Meropenem 1g | MED | VIAL | 30 | 100 |
| Imipenem-Cilastatin 500mg | MED | VIAL | 15 | 50 |
| Ertapenem 1g | MED | VIAL | 10 | 40 |
| Vancomycin 500mg | MED | VIAL | 30 | 100 |
| Teicoplanin 400mg | MED | VIAL | 10 | 40 |
| Linezolid 600mg/300mL | MED | BAG | 10 | 40 |
| Colistin 150mg | MED | VIAL | 15 | 50 |
| Tigecycline 50mg | MED | VIAL | 10 | 30 |
| Amikacin 500mg/2mL | MED | VIAL | 15 | 50 |
| Metronidazole 500mg/100mL | MED | BAG | 30 | 100 |
| Fluconazole 200mg/100mL | MED | BAG | 15 | 50 |
| Caspofungin 70mg (loading) | MED | VIAL | 5 | 15 |
| Caspofungin 50mg (maintenance) | MED | VIAL | 5 | 15 |
| Voriconazole 200mg IV | MED | VIAL | 5 | 15 |
| Anidulafungin 100mg | MED | VIAL | 3 | 10 |
| Aciclovir 500mg | MED | VIAL | 10 | 30 |
| Ganciclovir 500mg | MED | VIAL | 5 | 15 |
| Oseltamivir 75mg cap | MED | CAP | 10 | 30 |
| Cotrimoxazole 480mg/5mL | MED | AMP | 10 | 30 |

### 4.5 ICU Electrolytes, Nutrition & Metabolic

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Potassium Chloride 15% (HIGH ALERT) | MED | VIAL | 30 | 100 | Only in ICU/pharmacy |
| Potassium Chloride 10mEq/100mL premix | MED | BAG | 20 | 80 | Ready-to-infuse |
| Potassium Phosphate 15mmol/10mL | MED | VIAL | 15 | 50 | |
| Magnesium Sulphate 50% 10mL | MED | AMP | 20 | 60 | |
| Magnesium Sulphate 20% 100mL | MED | BAG | 10 | 40 | Slow replacement |
| Calcium Gluconate 10% 10mL | MED | AMP | 20 | 60 | Hypocalcaemia |
| Sodium Bicarbonate 8.4% 50mL | MED | VIAL | 15 | 50 | |
| Sodium Bicarbonate 1.26% 500mL | MED | BAG | 10 | 30 | Slow correction |
| Sodium Chloride 0.9% 500mL | MED | BAG | 100 | 400 | |
| Sodium Chloride 3% 500mL | MED | BAG | 10 | 30 | Severe hyponatraemia; HIGH ALERT |
| Dextrose 50% 20mL | MED | VIAL | 20 | 80 | Hypoglycaemia |
| Dextrose 10% 500mL | MED | BAG | 30 | 100 | |
| TPN (3-in-1 bag, central) 2000kcal | MED | BAG | 15 | 50 | 2-in-1 also |
| TPN (peripheral 1000kcal) | MED | BAG | 10 | 30 | |
| Lipid Emulsion (Smoflipid) 250mL | MED | BAG | 10 | 30 | |
| Amino Acid Solution 500mL | MED | BAG | 10 | 30 | |
| Enteral Feed (Standard) 500mL | DIET | BTL | 30 | 100 | |
| Enteral Feed (High protein) 500mL | DIET | BTL | 20 | 80 | |
| Enteral Feed (Renal) 500mL | DIET | BTL | 10 | 40 | |
| Enteral Feed (Diabetic) 500mL | DIET | BTL | 10 | 40 | |
| Enteral Feed (ICU immune-modulating) | DIET | BTL | 10 | 30 | |
| Thiamine (Vit B1) 100mg/2mL | MED | AMP | 15 | 50 | Wernicke's prevention |
| Thiamine 300mg/3mL (high dose) | MED | AMP | 5 | 20 | |
| Multivitamin IV | MED | VIAL | 10 | 40 | |
| Trace Elements IV | MED | VIAL | 10 | 30 | |
| Zinc Sulphate 50mg/1mL | MED | VIAL | 5 | 20 | |
| Selenium 400mcg/5mL | MED | VIAL | 5 | 15 | |
| Insulin (Actrapid Regular) 100IU/10mL | MED | VIAL | 15 | 50 | TGC protocol |
| Glucagon 1mg kit | MED | KIT | 5 | 15 | |
| Sodium Acetate 20% | MED | VIAL | 5 | 20 | Metabolic acidosis, TPN |
| Phosphate 1mmol/mL 10mL | MED | AMP | 10 | 30 | Hypophosphataemia |

### 4.6 ICU Renal & GI Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Pantoprazole 40mg IV | MED | VIAL | 40 | 150 |
| Esomeprazole 40mg IV | MED | VIAL | 20 | 80 |
| Ranitidine 50mg/2mL | MED | AMP | 20 | 60 |
| Sucralfate 1g/5mL suspension | MED | BTL | 5 | 20 |
| Metoclopramide 10mg/2mL | MED | AMP | 20 | 80 |
| Ondansetron 4mg/2mL | MED | AMP | 30 | 100 |
| Erythromycin 250mg (prokinetic) | MED | VIAL | 10 | 30 |
| Lactulose 667mg/mL | MED | BTL | 5 | 20 |
| Rifaximin 550mg tab | MED | TAB | 5 | 20 |
| Neomycin 500mg tab | MED | TAB | 5 | 15 |
| Polyethylene Glycol Sachet | MED | SACHET | 10 | 30 |
| Senna 15mg tab | MED | TAB | 5 | 20 |
| Dexamethasone 4mg/1mL | MED | AMP | 20 | 80 |
| Methylprednisolone 500mg | MED | VIAL | 10 | 30 |
| Hydrocortisone 100mg | MED | VIAL | 20 | 60 |

### 4.7 ICU CRRT & Ventilator Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| CRRT Circuit (Prismaflex/AN69) | CONS | SET | 10 | 30 | |
| CRRT Hemofilter M100/M150 | CONS | PCS | 10 | 30 | |
| CRRT Substitution Fluid 5L (Prismocal) | CONS | BAG | 20 | 60 | |
| CRRT Dialysate 5L | CONS | BAG | 20 | 60 | |
| CRRT Blood Tubing Set | CONS | SET | 10 | 30 | |
| Dialysis Catheter (Quinton) 11.5Fr | SURG | PCS | 5 | 15 | |
| Dialysis Catheter 13.5Fr (tunnelled) | SURG | PCS | 3 | 10 | |
| Ventilator Circuit (Adult reusable) | CONS | PCS | 10 | 30 | Change every 7 days |
| Ventilator Circuit (disposable) | CONS | PCS | 20 | 60 | |
| HME Filter | CONS | PCS | 40 | 150 | Change every 48h |
| HME with EtCO2 port | CONS | PCS | 10 | 40 | |
| Closed Suction System (72hr) | CONS | PCS | 20 | 80 | |
| Suction Catheter 12Fr/14Fr | CONS | PCS | 60 | 250 | |
| ETT Holder (AnchorFast) | CONS | PCS | 20 | 60 | |
| Tracheostomy Kit (percutaneous) | SURG | KIT | 5 | 15 | |
| Tracheostomy Tube Cuffed 7.0/8.0 | CONS | PCS | 10 | 30 | |
| Tracheostomy Tube Fenestrated | CONS | PCS | 5 | 15 | |
| Tracheostomy Inner Cannula (disposable) | CONS | PCS | 30 | 100 | |
| Subglottic Suctioning ETT | CONS | PCS | 10 | 30 | VAP prevention |
| NG Tube 16Fr (fine bore) | CONS | PCS | 20 | 60 | |
| Post-pyloric Feeding Tube | CONS | PCS | 5 | 20 | |
| Pressure Transducer Kit (arterial/CVP) | CONS | KIT | 30 | 100 | |
| IV Extension Manifold | CONS | PCS | 30 | 100 | |
| Anti-reflux IV Connector | CONS | PCS | 30 | 100 | |
| Cuff Pressure Monitoring Syringe | CONS | PCS | 10 | 30 | |
| Positioning Wedge/Foam | CONS | PCS | 10 | 30 | Prone positioning |
| Prone Positioning Pillow Set | CONS | SET | 3 | 10 | ARDS prone |
| Silicone Foam Dressing (pressure ulcer) | CONS | PCS | 20 | 60 | Sacral, heel |
| Sacral Foam Dressing (Mepilex Border) | CONS | PCS | 20 | 60 | |
| Heel Protector Boot | CONS | PCS | 10 | 30 | |
| Mouth Care Kit (chlorhexidine 0.12%) | CONS | KIT | 30 | 100 | VAP bundle |
| Eye Lubricant (Lacrilube/Hypromellose) | MED | VIAL | 20 | 60 | Sedated patient eye care |
| Eye Tape (Transpore) | CONS | ROLL | 10 | 30 | |
| Anti-embolic Stockings (TED stockings) | CONS | PAIR | 20 | 60 | |
| Sequential Compression Device Sleeve | CONS | PCS | 10 | 30 | DVT prevention |
| Leg Raise Wedge | CONS | PCS | 10 | 30 | |

---

## 5. Cardiac ICU (CICU)

### 5.1 Cardiac-Specific Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Heparin 5000IU/mL (continuous infusion) | MED | VIAL | 20 | 60 | ACS, post-cardiac catheterisation |
| Bivalirudin 250mg | MED | VIAL | 5 | 15 | HIT, PCI anticoagulation |
| Alteplase 100mg | MED | VIAL | 3 | 10 | Massive PE, STEMI |
| Eptifibatide (Integrilin) 75mg | MED | VIAL | 3 | 10 | GP IIb/IIIa inhibitor, PCI |
| Tirofiban 12.5mg | MED | VIAL | 3 | 10 | GP IIb/IIIa |
| Abciximab (ReoPro) | MED | VIAL | 2 | 6 | High-risk PCI |
| Adenosine 6mg/2mL | MED | VIAL | 15 | 50 | SVT, stress echo |
| Isoprenaline 1mg/5mL | MED | AMP | 10 | 30 | Bradycardia, heart block |
| Magnesium Sulphate 50% | MED | AMP | 20 | 60 | Torsades, hypoMg |
| Amiodarone 300mg (bolus) | MED | VIAL | 15 | 50 | |
| Propafenone 70mg | MED | AMP | 5 | 20 | AF cardioversion |
| Flecainide 150mg/15mL | MED | AMP | 5 | 15 | SVT, AF |
| Sotolol 80mg tab | MED | TAB | 5 | 20 | AF maintenance |
| Digoxin 0.25mg tab | MED | TAB | 5 | 20 | AF rate control |
| Ivabradine 5mg tab | MED | TAB | 5 | 15 | |
| Sacubitril/Valsartan 50/100/200mg | MED | TAB | 5 | 15 | HFrEF |
| Empagliflozin 10mg tab | MED | TAB | 5 | 15 | HF with T2DM |
| Eplerenone 25mg tab | MED | TAB | 5 | 15 | Post-MI heart failure |

### 5.2 Cardiac Procedure Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Arterial Sheath 5Fr/6Fr | SURG | PCS | 10 | 30 |
| Guide Wire 0.035" J-tip | CONS | PCS | 10 | 30 |
| Temporary Pacing Electrode | CONS | PCS | 5 | 15 |
| Pacing Lead (transvenous) | CONS | PCS | 3 | 10 |
| Swan-Ganz Catheter | SURG | PCS | 3 | 10 |
| Intra-aortic Balloon Pump (IABP) Set | SURG | KIT | 2 | 6 |
| IABP Catheter 34cc/40cc | CONS | PCS | 2 | 6 |
| Impella (mechanical support) | SURG | PCS | 1 | 3 |
| Pressure Monitoring Kit | CONS | KIT | 20 | 60 |
| Defibrillator Pads (AED/Manual) | CONS | PAIR | 15 | 50 |
| Transcutaneous Pacing Pads | CONS | PAIR | 5 | 20 |
| ECG 12-lead Cable | EQUIP | PCS | 5 | 10 |
| Holter Monitor Electrode | CONS | PKT | 10 | 30 |

---

## 6. Neonatal ICU (NICU)

### 6.1 NICU Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Poractant Alfa (Curosurf) 120mg/1.5mL | MED | VIAL | 5 | 20 | Surfactant therapy — RDS |
| Poractant Alfa 240mg/3mL | MED | VIAL | 3 | 10 | Large premature |
| Beractant (Survanta) 200mg/8mL | MED | VIAL | 3 | 10 | Surfactant alternative |
| Caffeine Citrate 20mg/1mL | MED | VIAL | 15 | 50 | Apnoea of prematurity |
| Aminophylline 25mg/1mL | MED | AMP | 10 | 30 | Apnoea (second line) |
| Indomethacin 1mg (IV) | MED | VIAL | 5 | 20 | PDA closure |
| Ibuprofen IV 5mg/1mL | MED | VIAL | 5 | 15 | PDA closure |
| Alprostadil (PGE1) 500mcg/1mL | MED | AMP | 5 | 15 | Keep ductus open — cyanotic CHD |
| Phenobarbitone 200mg/1mL | MED | AMP | 10 | 30 | Neonatal seizures |
| Phenytoin 250mg/5mL | MED | AMP | 5 | 15 | Neonatal seizures |
| Levetiracetam 100mg/1mL | MED | VIAL | 5 | 15 | |
| Midazolam 5mg/1mL | MED | AMP | 10 | 30 | CD |
| Vitamin K1 1mg/0.1mL | MED | AMP | 30 | 100 | Prophylactic — all neonates |
| Erythromycin 50mg/5mL suspension | MED | BTL | 5 | 20 | Prokinetic, gastric emptying |
| Hydrocortisone 5mg/1mL | MED | VIAL | 10 | 30 | Adrenal insufficiency, CLD |
| Dexamethasone 4mg/1mL | MED | AMP | 10 | 30 | Extubation, BPD |
| Furosemide 10mg/1mL | MED | AMP | 15 | 50 | Fluid overload |
| Dopamine 40mg/1mL (concentrate) | MED | AMP | 10 | 30 | |
| Dobutamine 250mg/20mL | MED | VIAL | 10 | 30 | |
| Noradrenaline 4mg/4mL | MED | AMP | 5 | 20 | |
| Milrinone 10mg/10mL | MED | VIAL | 5 | 15 | Low output |
| Sildenafil 10mg/1mL IV | MED | VIAL | 3 | 10 | Pulmonary hypertension |
| Nitric Oxide (iNO) cylinder | MED | CYL | 1 | 3 | Persistent pulmonary HTN |
| Aciclovir 25mg/5mL | MED | VIAL | 5 | 15 | Neonatal HSV |
| Cefotaxime 500mg | MED | VIAL | 15 | 50 | Neonatal sepsis |
| Ampicillin 500mg | MED | VIAL | 15 | 50 | GBS, Listeria |
| Gentamicin 10mg/1mL | MED | AMP | 20 | 60 | |
| Vancomycin 500mg | MED | VIAL | 10 | 30 | |
| Fluconazole 2mg/1mL (neonatal dilution) | MED | VIAL | 5 | 15 | |
| Neonatal TPN (amino acid/dextrose/lipid) | MED | BAG | 15 | 50 | |
| 10% Dextrose 100mL | MED | BAG | 30 | 100 | |

### 6.2 NICU Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Endotracheal Tube 2.0 uncuffed | CONS | PCS | 5 | 20 |
| Endotracheal Tube 2.5 uncuffed | CONS | PCS | 10 | 30 |
| Endotracheal Tube 3.0 uncuffed | CONS | PCS | 10 | 30 |
| Endotracheal Tube 3.5 uncuffed | CONS | PCS | 10 | 30 |
| Umbilical Venous Catheter (UVC) 3.5Fr | SURG | PCS | 5 | 20 |
| Umbilical Venous Catheter 5Fr | SURG | PCS | 5 | 15 |
| Umbilical Arterial Catheter (UAC) 3.5Fr | SURG | PCS | 5 | 15 |
| PICC Line 1.9Fr (neonatal) | SURG | PCS | 5 | 15 |
| IV Cannula 24G | CONS | BOX | 5 | 20 |
| IV Cannula 26G | CONS | BOX | 5 | 15 |
| Neonatal CPAP Nasal Prong (Short) S/M/L | CONS | PCS | 10 | 30 |
| Neonatal CPAP Circuit | CONS | PCS | 5 | 20 |
| Neonatal Ventilator Circuit | CONS | PCS | 5 | 20 |
| Neonatal HME Filter | CONS | PCS | 20 | 80 |
| Neonatal Suction Catheter 6Fr/8Fr | CONS | PCS | 30 | 100 |
| Neonatal Feeding Tube 5Fr/6Fr | CONS | PCS | 20 | 60 |
| Neonatal Enteral Syringe 1mL/2mL/5mL | CONS | PCS | 30 | 100 |
| Neonatal Monitoring Electrode | CONS | PKT | 20 | 80 |
| Neonatal SpO2 Probe (wrap type) | CONS | PCS | 10 | 40 |
| Neonatal BP Cuff Size 1/2/3/4 | CONS | PCS | 10 | 30 |
| Phototherapy Eye Patch | CONS | PCS | 20 | 80 |
| Phototherapy Eye Shield | CONS | PCS | 20 | 80 |
| Incubator Port Cover | CONS | PCS | 10 | 30 |
| Sterile Gloves 5.5/6.0 (neonatal procedures) | CONS | PAIR | 10 | 40 |
| Neonatal Resuscitation Mask (00/0/1) | CONS | PCS | 5 | 15 |
| Surfactant Administration Catheter | CONS | PCS | 5 | 15 |
| Closed Incubator Cover (blanket) | LINEN | PCS | 10 | 30 |

---

## 7. Paediatric ICU (PICU)

### 7.1 PICU Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Midazolam 1mg/1mL (diluted) | MED | VIAL | 15 | 50 | Paeds sedation |
| Ketamine 500mg/10mL | MED | VIAL | 10 | 30 | Paeds procedural sedation |
| Fentanyl 50mcg/1mL | MED | AMP | 15 | 50 | |
| Morphine 10mg/1mL | MED | AMP | 15 | 50 | CD |
| Diazepam 5mg/2.5mL rectal | MED | AMP | 10 | 30 | Acute seizure at home / transport |
| Lorazepam 4mg/1mL | MED | AMP | 10 | 30 | Status epilepticus |
| Phenobarbitone 200mg/1mL | MED | AMP | 10 | 30 | |
| Levetiracetam 500mg/5mL | MED | VIAL | 10 | 30 | |
| Adenosine 6mg/2mL | MED | VIAL | 10 | 30 | Paeds SVT (weight-based) |
| Salbutamol 5mg/2.5mL nebule | MED | PCS | 20 | 80 | Status asthmaticus |
| Magnesium Sulphate 50% | MED | AMP | 15 | 50 | Status asthmaticus IV |
| Ipratropium 0.5mg/2mL nebule | MED | PCS | 20 | 80 | |
| IV Methylprednisolone 40mg | MED | VIAL | 15 | 50 | |
| Adrenaline 1:1000 for nebulisation | MED | AMP | 10 | 30 | Croup |
| Dexamethasone 4mg/1mL | MED | AMP | 15 | 50 | Croup, cerebral oedema |
| Budesonide 0.5mg/2mL nebule | MED | PCS | 20 | 60 | Croup |
| Mannitol 20% | MED | BAG | 10 | 30 | Raised ICP |
| Hypertonic Saline 3% | MED | BAG | 5 | 20 | TBI, hyponatraemia |
| Cefotaxime 1g | MED | VIAL | 20 | 60 | Meningitis, sepsis |
| Ceftriaxone 1g | MED | VIAL | 20 | 60 | |
| Ampicillin-Sulbactam 1.5g | MED | VIAL | 15 | 50 | |
| Meropenem 500mg/1g | MED | VIAL | 20 | 60 | |
| Vancomycin 500mg | MED | VIAL | 15 | 50 | |
| Paracetamol 150mg/1mL drops | MED | BTL | 10 | 30 | |
| Ibuprofen 100mg/5mL susp | MED | BTL | 10 | 30 | |

### 7.2 PICU Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| ETT 4.0 (uncuffed/cuffed) | CONS | PCS | 10 | 30 |
| ETT 4.5 | CONS | PCS | 10 | 30 |
| ETT 5.0 | CONS | PCS | 10 | 30 |
| ETT 5.5 | CONS | PCS | 10 | 30 |
| ETT 6.0 cuffed (older child) | CONS | PCS | 10 | 30 |
| LMA Size 1.5/2/2.5 (paeds) | CONS | PCS | 5 | 15 |
| Paeds Laryngoscope Blade (Miller 1/2) | CONS | PCS | 5 | 15 |
| IV Cannula 22G/24G | CONS | BOX | 10 | 30 |
| Burette Set (paeds) | CONS | BOX | 10 | 30 |
| Paediatric CPAP Mask S/M | CONS | PCS | 5 | 15 |
| Paeds Ventilator Circuit | CONS | PCS | 10 | 30 |
| Paeds Suction Catheter 8Fr/10Fr | CONS | PCS | 40 | 150 |
| Nasogastric Tube 6Fr/8Fr/10Fr | CONS | PCS | 15 | 50 |
| Foley Catheter 8Fr/10Fr | CONS | PCS | 10 | 30 |
| Paeds SpO2 Probe | CONS | PCS | 10 | 30 |
| Paeds NIBP Cuff (infant/child/small adult) | CONS | PCS | 10 | 30 |
| Paeds ECG Electrode | CONS | PKT | 20 | 80 |
| Intraosseous Needle (Paeds) | CONS | PCS | 5 | 20 |

---

## 8. General Medical Ward

### 8.1 Common Cardiac & Antihypertensive

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Amlodipine 5mg tab | MED | BOX | 5 | 20 |
| Amlodipine 10mg tab | MED | BOX | 5 | 15 |
| Telmisartan 40mg/80mg tab | MED | BOX | 5 | 20 |
| Ramipril 5mg/10mg tab | MED | BOX | 5 | 20 |
| Enalapril 5mg tab | MED | BOX | 3 | 12 |
| Losartan 50mg tab | MED | BOX | 5 | 15 |
| Metoprolol 25mg/50mg tab | MED | BOX | 5 | 20 |
| Carvedilol 6.25mg/12.5mg tab | MED | BOX | 5 | 15 |
| Bisoprolol 5mg/10mg tab | MED | BOX | 5 | 15 |
| Atenolol 50mg tab | MED | BOX | 3 | 12 |
| Hydrochlorothiazide 25mg tab | MED | BOX | 3 | 10 |
| Furosemide 40mg tab | MED | BOX | 5 | 20 |
| Furosemide 20mg/2mL IV | MED | AMP | 20 | 80 |
| Spironolactone 25mg/50mg tab | MED | BOX | 3 | 12 |
| Digoxin 0.25mg tab | MED | BOX | 3 | 10 |
| Aspirin 75mg/150mg tab | MED | BOX | 5 | 20 |
| Clopidogrel 75mg tab | MED | BOX | 5 | 20 |
| Ticagrelor 90mg tab | MED | BOX | 3 | 10 |
| Atorvastatin 10mg/20mg/40mg tab | MED | BOX | 5 | 20 |
| Rosuvastatin 10mg/20mg tab | MED | BOX | 3 | 10 |
| Isosorbide Mononitrate 20mg tab | MED | BOX | 3 | 10 |
| GTN sublingual 0.5mg tab | MED | BOX | 3 | 10 |

### 8.2 Diabetes Management

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Metformin 500mg/1g tab | MED | BOX | 5 | 20 |
| Glibenclamide 5mg tab | MED | BOX | 3 | 12 |
| Gliclazide 30mg/80mg tab | MED | BOX | 3 | 10 |
| Glipizide 5mg tab | MED | BOX | 3 | 10 |
| Sitagliptin 50mg/100mg tab | MED | BOX | 3 | 10 |
| Vildagliptin 50mg tab | MED | BOX | 3 | 10 |
| Empagliflozin 10mg/25mg tab | MED | BOX | 3 | 10 |
| Dapagliflozin 10mg tab | MED | BOX | 3 | 10 |
| Pioglitazone 15mg/30mg tab | MED | BOX | 3 | 10 |
| Insulin Glargine (Lantus) 100IU/mL | MED | VIAL | 5 | 20 |
| Insulin Detemir (Levemir) | MED | VIAL | 5 | 15 |
| Insulin Degludec 100IU/mL | MED | VIAL | 3 | 10 |
| Insulin Aspart (Novorapid) | MED | VIAL | 5 | 20 |
| Insulin Lispro (Humalog) | MED | VIAL | 5 | 15 |
| Insulin Regular (Actrapid) | MED | VIAL | 10 | 30 |
| Insulin Premix 30/70 | MED | VIAL | 5 | 20 |
| Insulin Pen (BD InnoLet/Flexpen) | CONS | PCS | 10 | 30 |
| Insulin Pen Needle 4mm/6mm/8mm | CONS | BOX | 5 | 20 |
| Glucose Test Strip (for ward glucometer) | CONS | BOX | 10 | 30 |
| Lancet (28G/30G) | CONS | BOX | 10 | 30 |

### 8.3 Respiratory Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Salbutamol Inhaler 100mcg (MDI) | MED | PCS | 10 | 30 |
| Salbutamol 2.5mg/2.5mL Nebule | MED | PCS | 20 | 80 |
| Ipratropium 0.5mg/2mL Nebule | MED | PCS | 20 | 80 |
| Budesonide 0.5mg/2mL Nebule | MED | PCS | 10 | 30 |
| Formoterol+Budesonide Turbuhaler | MED | PCS | 5 | 20 |
| Tiotropium 18mcg Inhaler | MED | PCS | 5 | 15 |
| Prednisolone 5mg/10mg/20mg tab | MED | BOX | 5 | 20 |
| Hydrocortisone 100mg IV | MED | VIAL | 20 | 60 |
| Theophylline 100mg/200mg tab | MED | BOX | 3 | 10 |
| Aminophylline 250mg/10mL IV | MED | AMP | 10 | 30 |
| Montelukast 10mg tab | MED | BOX | 3 | 10 |
| Fexofenadine 120mg tab | MED | BOX | 3 | 10 |
| Cetirizine 10mg tab | MED | BOX | 3 | 10 |
| Loratadine 10mg tab | MED | BOX | 3 | 10 |
| Chlorpheniramine 4mg tab | MED | BOX | 3 | 10 |
| Nebuliser Mask (adult) | CONS | PCS | 20 | 60 |
| Nebuliser Mask (paeds) | CONS | PCS | 10 | 30 |
| Nebuliser Tubing | CONS | PCS | 20 | 60 |
| Spacer Device | CONS | PCS | 10 | 30 |
| Peak Flow Meter | EQUIP | PCS | 5 | 10 |

### 8.4 GI, Hepatic & Renal

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Pantoprazole 40mg IV/tab | MED | VIAL | 30 | 100 |
| Esomeprazole 20mg/40mg tab | MED | BOX | 5 | 20 |
| Rabeprazole 20mg tab | MED | BOX | 3 | 10 |
| Famotidine 20mg tab | MED | BOX | 3 | 10 |
| Ondansetron 4mg/8mg tab | MED | BOX | 5 | 20 |
| Metoclopramide 10mg IV/tab | MED | AMP | 20 | 60 |
| Domperidone 10mg tab | MED | BOX | 5 | 20 |
| Domperidone 1mg/1mL susp | MED | BTL | 5 | 15 |
| Sucralfate 1g tab | MED | BOX | 5 | 15 |
| Antacid Suspension 200mL | MED | BTL | 5 | 20 |
| Loperamide 2mg cap | MED | BOX | 3 | 10 |
| Bisacodyl 5mg tab | MED | BOX | 3 | 10 |
| Lactulose 10g/15mL | MED | BTL | 5 | 20 |
| Senna 15mg tab | MED | BOX | 3 | 10 |
| Ursodeoxycholic Acid 300mg tab | MED | BOX | 3 | 10 |
| Silymarin (Milk Thistle) 140mg | MED | BOX | 3 | 10 |
| N-Acetyl Cysteine 600mg tab | MED | BOX | 3 | 10 |
| N-Acetyl Cysteine 200mg/1mL IV | MED | VIAL | 5 | 20 |
| Rifaximin 550mg tab | MED | TAB | 5 | 15 |
| Terlipressin 0.5mg IV | MED | VIAL | 5 | 15 |
| Octreotide 100mcg/1mL | MED | AMP | 5 | 15 |

### 8.5 Neurological & Psychiatric

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Aspirin 75mg tab | MED | BOX | 5 | 20 |
| Clopidogrel 75mg tab | MED | BOX | 5 | 20 |
| Rivaroxaban 15mg/20mg tab | MED | BOX | 3 | 10 |
| Apixaban 5mg tab | MED | BOX | 3 | 10 |
| Phenytoin 100mg tab | MED | BOX | 3 | 10 |
| Valproate 200mg/500mg tab | MED | BOX | 3 | 10 |
| Valproate 400mg/4mL IV | MED | VIAL | 5 | 15 |
| Carbamazepine 200mg tab | MED | BOX | 3 | 10 |
| Lamotrigine 25mg/50mg/100mg tab | MED | BOX | 3 | 10 |
| Levetiracetam 250mg/500mg tab | MED | BOX | 3 | 10 |
| Gabapentin 100mg/300mg cap | MED | BOX | 3 | 10 |
| Pregabalin 75mg/150mg cap | MED | BOX | 3 | 10 |
| Sumatriptan 50mg tab | MED | BOX | 3 | 10 |
| Donepezil 5mg tab | MED | BOX | 3 | 10 |
| Rivastigmine 1.5mg cap | MED | BOX | 3 | 10 |
| Haloperidol 5mg/1mL IM | MED | AMP | 10 | 30 |
| Haloperidol 5mg tab | MED | BOX | 3 | 10 |
| Olanzapine 10mg IM | MED | VIAL | 5 | 15 |
| Lorazepam 2mg/1mL IM | MED | AMP | 10 | 30 |
| Quetiapine 25mg/100mg tab | MED | BOX | 3 | 10 |

---

## 9. General Surgical Ward

### 9.1 Post-Operative Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Paracetamol 1g IV | MED | BAG | 30 | 100 |
| Tramadol 100mg/2mL IV | MED | AMP | 20 | 80 |
| Morphine 10mg/1mL | MED | AMP | 15 | 50 |
| Ketorolac 30mg/1mL IV | MED | AMP | 20 | 60 |
| Ondansetron 4mg/2mL IV | MED | AMP | 30 | 100 |
| Metoclopramide 10mg/2mL IV | MED | AMP | 20 | 60 |
| Enoxaparin 40mg SC | MED | VIAL | 30 | 80 |
| Ceftriaxone 1g IV | MED | VIAL | 30 | 80 |
| Metronidazole 500mg/100mL IV | MED | BAG | 30 | 80 |
| Pantoprazole 40mg IV | MED | VIAL | 30 | 100 |
| Lactulose 10g/15mL | MED | BTL | 5 | 20 |
| Bisacodyl 5mg supp | MED | PCS | 20 | 60 |

### 9.2 Surgical Wound Care

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Povidone-Iodine 10% 500mL | CONS | BTL | 20 | 60 |
| Hydrogen Peroxide 3% 500mL | CONS | BTL | 10 | 30 |
| Normal Saline 100mL (wound wash) | MED | BAG | 30 | 100 |
| Sterile Gauze 4x4" | CONS | PKT | 50 | 200 |
| Sterile Gauze 8x8" | CONS | PKT | 20 | 80 |
| Non-adherent Paraffin Dressing (Jelonet) | CONS | PKT | 20 | 60 |
| Negative Pressure Wound Therapy Dressing Kit | CONS | KIT | 5 | 15 |
| NPWT Foam (Black/White) | CONS | PCS | 10 | 30 |
| Alginate Dressing (Sorbalgon/Kaltostat) | CONS | PKT | 10 | 30 |
| Silver Dressing (Aquacel Ag) | CONS | PKT | 10 | 30 |
| Zinc Oxide Paste | CONS | BTL | 5 | 20 |
| Adhesive Transparent Film (Tegaderm) | CONS | PKT | 20 | 60 |
| Suture Removal Kit | SURG | KIT | 20 | 60 |
| Staple Remover | SURG | PCS | 10 | 30 |
| Wound Irrigation Syringe 30mL | CONS | PCS | 20 | 60 |
| Wound Measurement Ruler | CONS | PCS | 10 | 30 |
| Drain Dressing | CONS | PKT | 20 | 60 |
| Colostomy Bag (one-piece) | CONS | PCS | 20 | 60 |
| Colostomy Bag (two-piece base plate) | CONS | PCS | 10 | 30 |
| Colostomy Pouch (drainable) | CONS | PCS | 10 | 30 |
| Colostomy Paste / Barrier Cream | CONS | BTL | 5 | 20 |
| Ileostomy Bag | CONS | PCS | 10 | 30 |

---

## 10. Obstetrics & Gynaecology (OBG) Ward

### 10.1 Obstetric Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Oxytocin 5IU/1mL | MED | AMP | 30 | 100 | Labour induction/PPH |
| Oxytocin 10IU/1mL | MED | AMP | 20 | 60 | |
| Methylergonovine 0.2mg/1mL | MED | AMP | 20 | 60 | PPH (not with hypertension) |
| Carboprost (15-methyl PGF2α) 250mcg | MED | AMP | 10 | 30 | Refractory PPH |
| Misoprostol 200mcg tab | MED | TAB | 20 | 60 | PPH, induction, abortion |
| Dinoprostone (PGE2) Gel 0.5mg | MED | VIAL | 5 | 15 | Cervical ripening |
| Nifedipine 10mg tab (tocolytic) | MED | BOX | 5 | 20 | Preterm labour |
| Atosiban 7.5mg/0.9mL | MED | VIAL | 5 | 15 | Tocolytic (preferred) |
| Magnesium Sulphate 50% 5mL | MED | AMP | 20 | 60 | Eclampsia, neuroprotection |
| Labetalol 100mg/20mL | MED | VIAL | 10 | 30 | Hypertension in pregnancy |
| Hydralazine 20mg/1mL | MED | AMP | 10 | 30 | Acute severe hypertension |
| Nifedipine SR 30mg tab | MED | BOX | 5 | 20 | Chronic antihypertensive |
| Methyldopa 250mg tab | MED | BOX | 5 | 20 | Antihypertensive in pregnancy |
| Betamethasone 6mg/1mL | MED | AMP | 15 | 40 | Foetal lung maturity |
| Dexamethasone 6mg/1mL | MED | AMP | 10 | 30 | Foetal lung maturity (alt) |
| Iron Sucrose 100mg/5mL IV | MED | VIAL | 20 | 60 | Anaemia |
| Ferric Carboxymaltose 500mg | MED | VIAL | 10 | 30 | Severe iron deficiency |
| Folic Acid 5mg tab | MED | BOX | 5 | 15 | |
| Ferrous Sulphate 200mg tab | MED | BOX | 5 | 15 | |
| Progesterone 400mg vaginal cap | MED | BOX | 5 | 15 | Threatened miscarriage |
| Hydroxyprogesterone 250mg/1mL | MED | AMP | 5 | 15 | Preterm prevention |
| Anti-D Immunoglobulin 300mcg | MED | AMP | 10 | 30 | Rh-ve mothers |
| Rh Immune Globulin 300mcg | MED | AMP | 10 | 30 | |
| Heparin 5000IU SC | MED | VIAL | 20 | 60 | VTE prophylaxis |
| Enoxaparin 40mg SC | MED | VIAL | 20 | 60 | |
| Lignocaine 1% 20mL | MED | VIAL | 20 | 60 | Perineal infiltration |
| Ketamine 500mg (for obstetric anaesthesia) | MED | VIAL | 5 | 20 | |
| Carbetocin 100mcg/1mL | MED | AMP | 10 | 30 | Elective CS PPH prevention |

### 10.2 OBG Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Cardiotocography (CTG) Paper Roll | CONS | ROLL | 20 | 60 |
| CTG Electrode (fetal scalp) | CONS | PCS | 10 | 30 |
| Uterine Contraction Transducer | CONS | PCS | 5 | 15 |
| Intrauterine Pressure Catheter | CONS | PCS | 3 | 10 |
| Cusco's Vaginal Speculum (disposable) | CONS | PCS | 20 | 80 |
| Cusco's Speculum (reusable — CSSD) | EQUIP | PCS | 10 | 20 |
| Sims' Speculum | EQUIP | PCS | 10 | 20 |
| Amniotic Hook (Amnihook) | CONS | PCS | 10 | 30 |
| Foley Catheter 14Fr (post delivery) | CONS | PCS | 20 | 60 |
| Episiotomy Scissors | SURG | PCS | 5 | 10 |
| Cord Clamp | CONS | PCS | 50 | 200 |
| Cord Blood Collection Tube | CONS | PCS | 20 | 80 |
| Neonatal Suction Bulb | CONS | PCS | 20 | 80 |
| Ventouse (Vacuum Extractor) | SURG | PCS | 3 | 8 |
| Kiwi Complete Vacuum Cup | SURG | PCS | 5 | 10 |
| Obstetric Forceps (Wrigley's/Neville-Barnes) | EQUIP | PCS | 3 | 6 |
| Episiotomy Repair Kit | SURG | KIT | 10 | 30 |
| Perineal Ice Pack | CONS | PCS | 20 | 60 |
| Maternity Pad (super absorbent) | CONS | PKT | 20 | 80 |
| Breast Pump (hospital grade) | EQUIP | PCS | 3 | 6 |
| Breast Pump Set (disposable kit) | CONS | SET | 10 | 30 |
| Nipple Shields | CONS | PCS | 10 | 30 |
| Colostrum Collection Syringe | CONS | PCS | 20 | 60 |
| IUD (Copper T) | IMPL | PCS | 10 | 30 |
| IUD (Levonorgestrel 52mg — Mirena) | IMPL | PCS | 5 | 15 |
| Contraceptive Implant (Implanon) | IMPL | PCS | 5 | 10 |
| Endometrial Pipelle (biopsy) | SURG | PCS | 10 | 20 |
| Hysteroscopy Fluid (0.9% NS 3L bag) | MED | BAG | 10 | 30 |
| Laparoscopy CO2 (gynaecology) | CONS | CYL | 3 | 10 |
| Papsmear Kit (cervical brush + slide) | DIAG | KIT | 20 | 60 |
| Liquid-based cytology vial | DIAG | PCS | 20 | 60 |
| HPV Test Sample Kit | DIAG | KIT | 10 | 30 |

## 11. Paediatric Ward

### 11.1 Paediatric Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Paracetamol 120mg/5mL syrup | MED | BTL | 10 | 30 |
| Paracetamol 250mg/5mL syrup | MED | BTL | 10 | 30 |
| Ibuprofen 100mg/5mL susp | MED | BTL | 10 | 30 |
| Amoxicillin 125mg/5mL susp | MED | BTL | 10 | 30 |
| Amoxicillin 250mg/5mL susp | MED | BTL | 10 | 30 |
| Amoxicillin-Clavulanate 228mg/5mL susp | MED | BTL | 10 | 30 |
| Cotrimoxazole 240mg/5mL susp | MED | BTL | 5 | 20 |
| Cefixime 100mg/5mL susp | MED | BTL | 5 | 20 |
| Azithromycin 200mg/5mL susp | MED | BTL | 5 | 20 |
| Metronidazole 200mg/5mL susp | MED | BTL | 5 | 20 |
| Zinc Sulphate 20mg/5mL drops | MED | BTL | 10 | 30 |
| ORS Sachet 200mL preparation | MED | SACHET | 30 | 100 |
| Vitamin A 100000IU capsule | MED | CAP | 5 | 20 |
| Vitamin D3 400IU drops | MED | BTL | 5 | 20 |
| Ferrous Sulphate 25mg/1mL drops | MED | BTL | 5 | 20 |
| Multivitamin Syrup | MED | BTL | 5 | 20 |
| Salbutamol 0.5mg/1mL Nebule | MED | PCS | 20 | 60 |
| Ipratropium 0.25mg/1mL Nebule | MED | PCS | 10 | 40 |
| Budesonide 0.5mg/2mL Nebule | MED | PCS | 10 | 30 |
| Prednisolone 5mg tab | MED | BOX | 3 | 10 |
| Ondansetron 4mg Wafer | MED | BOX | 5 | 15 |
| Domperidone 1mg/1mL susp | MED | BTL | 5 | 20 |
| Lactulose 3.3g/5mL | MED | BTL | 5 | 15 |
| Chloral Hydrate 250mg/5mL | MED | BTL | 3 | 10 |
| Ceftriaxone 500mg/1g IV | MED | VIAL | 20 | 60 |
| Ampicillin 250mg/500mg IV | MED | VIAL | 20 | 60 |
| Gentamicin 40mg/2mL (80mg) | MED | AMP | 15 | 50 |
| Phenobarbitone 15mg/1mL drops | MED | BTL | 3 | 10 |
| Chlorpromazine 25mg tab | MED | BOX | 3 | 10 |
| Albendazole 400mg tab | MED | BOX | 5 | 15 |
| Mebendazole 100mg tab | MED | BOX | 5 | 15 |

### 11.2 Paediatric Ward Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| IV Cannula 22G/24G | CONS | BOX | 10 | 30 |
| IV Cannula 26G (neonatal/infant) | CONS | BOX | 5 | 15 |
| Burette Set 150mL | CONS | BOX | 10 | 30 |
| Nasogastric Tube 5Fr/6Fr/8Fr | CONS | PCS | 10 | 30 |
| Foley Catheter 8Fr/10Fr | CONS | PCS | 10 | 20 |
| Paediatric Arm Splint Board | CONS | PCS | 10 | 30 |
| Paediatric Nebuliser Mask | CONS | PCS | 10 | 30 |
| Paediatric O2 Mask | CONS | PCS | 10 | 30 |
| Paediatric Nasal Cannula | CONS | PCS | 20 | 60 |
| Paediatric SpO2 Probe | CONS | PCS | 10 | 30 |
| Paediatric BP Cuff (infant/child) | CONS | PCS | 10 | 30 |
| Feeding Bottle (sterile) | CONS | PCS | 10 | 30 |
| Neonatal Syringe 1mL/2mL | CONS | PCS | 30 | 100 |
| Cot Sides/Bed Rails (asset) | EQUIP | PCS | 5 | 10 |

---

## 12. Orthopaedic Ward

### 12.1 Orthopaedic Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Tramadol 100mg/2mL IV | MED | AMP | 20 | 60 |
| Morphine 10mg/1mL SC | MED | AMP | 15 | 50 |
| Ketorolac 30mg IV | MED | AMP | 20 | 60 |
| Diclofenac 75mg IM | MED | AMP | 20 | 60 |
| Celecoxib 200mg cap | MED | BOX | 5 | 20 |
| Pregabalin 75mg/150mg | MED | BOX | 5 | 20 |
| Calcium Carbonate 1.25g tab | MED | BOX | 5 | 20 |
| Vitamin D3 60000IU cap/sachet | MED | BOX | 5 | 20 |
| Alendronate 70mg weekly | MED | BOX | 3 | 10 |
| Risedronate 35mg weekly | MED | BOX | 3 | 10 |
| Zoledronic Acid 5mg/100mL | MED | BAG | 3 | 10 |
| Enoxaparin 40mg SC | MED | VIAL | 30 | 80 |
| Rivaroxaban 10mg tab | MED | BOX | 5 | 20 |
| Cefazolin 1g IV (prophylaxis) | MED | VIAL | 30 | 80 |
| Tranexamic Acid 1g IV | MED | AMP | 20 | 60 |

### 12.2 Orthopaedic Consumables & Implants

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Plaster of Paris 4"/6"/8" | CONS | ROLL | 20 | 80 |
| Fibreglass Cast 3"/4" | CONS | ROLL | 15 | 50 |
| Cast Padding (Webril) | CONS | ROLL | 20 | 80 |
| Orthopaedic Stockinette 2"/3"/4" | CONS | ROLL | 15 | 60 |
| Cast Cutter Blade | CONS | PCS | 5 | 20 |
| Traction Rope/Pulley Set | CONS | SET | 3 | 10 |
| Thomas Splint | EQUIP | PCS | 3 | 8 |
| Böhler Stirrup | EQUIP | PCS | 3 | 8 |
| External Fixator Frame (standard) | IMPL | PCS | 3 | 8 |
| External Fixator Pins 4mm/5mm | IMPL | PCS | 10 | 30 |
| K-Wire 1.2mm/1.6mm/2.0mm | IMPL | PCS | 20 | 60 |
| Steinmann Pin 3mm/4mm | IMPL | PCS | 10 | 30 |
| Locking Nail (Femur/Tibia) | IMPL | PCS | 3 | 8 |
| DHS Plate + Screw | IMPL | SET | 3 | 8 |
| DCS Plate | IMPL | SET | 2 | 6 |
| Locking Compression Plate (LCP) | IMPL | SET | 3 | 8 |
| Dynamic Axial Fixator | IMPL | SET | 2 | 6 |
| TBW Wire (tension band) | IMPL | SET | 5 | 15 |
| Cortical Screw 4.5mm | IMPL | PCS | 20 | 60 |
| Cancellous Screw 6.5mm | IMPL | PCS | 20 | 60 |
| Bone Cement (PMMA) — hip/knee | IMPL | PCS | 3 | 10 |
| Total Hip Prosthesis (Cementless) | IMPL | SET | 2 | 6 |
| Total Knee Implant | IMPL | SET | 2 | 6 |
| Hemi-arthroplasty (Austin Moore) | IMPL | PCS | 3 | 8 |
| Spinal Cage (PEEK) | IMPL | PCS | 2 | 6 |
| Pedicle Screw Set | IMPL | SET | 2 | 6 |
| Drain (Hemovac/Redivac) | CONS | PCS | 10 | 30 |
| Aquacel Ag Wound Dressing | CONS | PKT | 10 | 30 |

---

## 13. Cardiology Department

### 13.1 Cardiac Catheterisation Lab (Cath Lab) Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Guiding Catheter JL 3.5/4.0/4.5/5.0 | SURG | PCS | 5 | 15 | Coronary angiography |
| Guiding Catheter JR 3.5/4.0 | SURG | PCS | 5 | 15 | |
| Diagnostic Catheter (Multi-purpose) | SURG | PCS | 5 | 15 | |
| Coronary Guide Wire 0.014" | CONS | PCS | 10 | 30 | PCI |
| Coronary Balloon Catheter (PTCA) | SURG | PCS | 5 | 15 | |
| Drug Eluting Stent (DES) 2.5–4.0mm | IMPL | PCS | 5 | 15 | |
| Bare Metal Stent (BMS) | IMPL | PCS | 3 | 10 | |
| Bioresorbable Stent | IMPL | PCS | 2 | 6 | |
| Coronary Atherectomy Burr | SURG | PCS | 2 | 6 | Rotablation |
| Cutting Balloon 2.5/3.0mm | SURG | PCS | 3 | 8 | |
| Intracoronary Ultrasound (IVUS) Catheter | SURG | PCS | 2 | 6 | |
| FFR Wire (Pressure wire) | CONS | PCS | 3 | 8 | |
| Stent Retrieval System | SURG | PCS | 2 | 6 | |
| Vascular Closure Device (AngioSeal/Proglide) | SURG | PCS | 5 | 15 | Haemostasis post cath |
| Femoral Sheath 6Fr/7Fr/8Fr | SURG | PCS | 10 | 30 | |
| Radial Sheath 5Fr/6Fr | SURG | PCS | 10 | 30 | Radial access |
| Contrast Media Iopamidol/Omnipaque 370 | DIAG | VIAL | 20 | 60 | |
| Contrast Syringe (50mL) | CONS | PCS | 20 | 60 | |
| Y-Connector | CONS | PCS | 20 | 60 | |
| Transducer (disposable) | CONS | PCS | 15 | 50 | |
| Manifold 3-way | CONS | PCS | 15 | 50 | |
| Inflation Device (indeflator) | CONS | PCS | 10 | 30 | |
| Haemostasis Valve | CONS | PCS | 10 | 30 | |
| Compression Bandage (TR Band) | CONS | PCS | 20 | 60 | Radial compression |

### 13.2 Electrophysiology & Pacing

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Pacemaker Lead (Ventricular) | IMPL | PCS | 2 | 5 |
| Pacemaker Lead (Atrial) | IMPL | PCS | 2 | 5 |
| Single Chamber Pacemaker Generator | IMPL | PCS | 1 | 3 |
| Dual Chamber Pacemaker Generator | IMPL | PCS | 1 | 3 |
| ICD Device | IMPL | PCS | 1 | 2 |
| CRT-D Device | IMPL | PCS | 1 | 2 |
| EP Catheter (Diagnostic) | SURG | PCS | 3 | 8 |
| EP Catheter (Ablation) | SURG | PCS | 3 | 8 |
| Radiofrequency Ablation Catheter | SURG | PCS | 3 | 8 |
| Cryoablation Catheter | SURG | PCS | 2 | 5 |
| Pacemaker Generator Bag/Pocket Irrigant | CONS | PCS | 5 | 15 |

---

## 14. Nephrology & Dialysis Unit

### 14.1 Haemodialysis Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Dialyser (High flux polysulfone 1.6m²) | CONS | PCS | 30 | 100 | Single use |
| Dialyser (Low flux) | CONS | PCS | 20 | 60 | |
| Dialysis Blood Tubing Set (Arterial + Venous) | CONS | SET | 30 | 100 | |
| Fistula Needle 15G | CONS | BOX | 20 | 60 | (50/box) |
| Fistula Needle 16G | CONS | BOX | 20 | 60 | |
| Haemodialysis Catheter 11.5Fr (temporary) | SURG | PCS | 5 | 15 | |
| Tunnelled Dialysis Catheter 13.5Fr | SURG | PCS | 3 | 10 | |
| AVF/Graft Patch (PTFE) | IMPL | PCS | 2 | 6 | Stenosis repair |
| Dialysis Concentrate (Bicarbonate A+B) | CONS | BTL | 30 | 100 | Per session |
| Dialysis Water (RO Water check) | — | — | — | — | Monitor by Engineering |
| Heparin 1000IU/1mL (dialysis) | MED | VIAL | 30 | 100 | |
| Sodium Citrate 4% Lock Solution | MED | VIAL | 20 | 60 | Catheter lock |
| Normal Saline 0.9% 1000mL (priming) | MED | BAG | 60 | 200 | |
| Dialysis Needle Cap | CONS | PCS | 30 | 100 | |
| Luer Lock Cap | CONS | PCS | 30 | 100 | |
| Pressure Monitoring Line | CONS | PCS | 30 | 100 | |
| Air Detector Segment | CONS | PCS | 20 | 60 | |
| Transducer Protector | CONS | PCS | 30 | 100 | |

### 14.2 Peritoneal Dialysis

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| PD Catheter (Tenckhoff Curled) | SURG | PCS | 3 | 10 |
| PD Dialysate 1.5% Dextrose 2L | MED | BAG | 30 | 100 |
| PD Dialysate 2.5% Dextrose 2L | MED | BAG | 20 | 60 |
| PD Dialysate 4.25% Dextrose 2L | MED | BAG | 10 | 30 |
| PD Disconnect System (Y-set) | CONS | SET | 20 | 60 |
| PD Catheter Cap | CONS | PCS | 20 | 60 |
| PD Connecting Kit | CONS | KIT | 20 | 60 |
| Transfer Set (CAPD) | CONS | SET | 20 | 60 |
| Povidone Iodine Cap | CONS | PCS | 20 | 60 |

### 14.3 Renal Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Erythropoietin (EPO) 4000IU/0.4mL | MED | VIAL | 10 | 30 |
| Darbepoetin Alfa 40mcg/0.4mL | MED | VIAL | 5 | 15 |
| Iron Sucrose 100mg/5mL IV | MED | VIAL | 20 | 60 |
| Ferric Carboxymaltose 500mg | MED | VIAL | 10 | 30 |
| Calcium Acetate 667mg tab | MED | BOX | 5 | 20 |
| Sevelamer 800mg tab | MED | BOX | 5 | 15 |
| Cinacalcet 30mg/60mg tab | MED | BOX | 3 | 10 |
| Paricalcitol 2mcg/1mL IV | MED | VIAL | 5 | 15 |
| Calcitriol 0.25mcg cap | MED | BOX | 3 | 10 |
| Sodium Bicarbonate 500mg tab | MED | BOX | 5 | 15 |
| Kayexalate (sodium polystyrene) | MED | PKT | 10 | 30 |
| Patiromer 8.4g sachet | MED | SACHET | 5 | 20 |
| Sodium Zirconium Cyclosilicate 10g | MED | SACHET | 5 | 15 |

---

## 15. Oncology / Chemotherapy Unit

### 15.1 Pre-medication & Supportive Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Ondansetron 8mg/4mL IV | MED | VIAL | 30 | 100 | Emesis prophylaxis |
| Granisetron 3mg/3mL IV | MED | VIAL | 10 | 40 | 5-HT3 antagonist |
| Palonosetron 0.25mg/5mL IV | MED | VIAL | 10 | 30 | 5-HT3 antagonist (long acting) |
| Aprepitant 80mg/125mg cap | MED | BOX | 5 | 15 | NK1 antagonist |
| Fosaprepitant 150mg IV | MED | VIAL | 5 | 15 | NK1 IV |
| Dexamethasone 8mg/2mL IV | MED | AMP | 20 | 60 | Pre-chemo |
| Lorazepam 2mg tab | MED | BOX | 5 | 15 | Anxiety, anticipatory nausea |
| Ranitidine 50mg IV / Famotidine IV | MED | AMP | 10 | 30 | Pre-taxane |
| Chlorpheniramine 10mg IV | MED | AMP | 10 | 30 | Pre-taxane hypersensitivity |
| Hydrocortisone 100mg IV | MED | VIAL | 10 | 30 | |
| Filgrastim (G-CSF) 300mcg/0.5mL | MED | VIAL | 10 | 30 | Febrile neutropenia prevention |
| Pegfilgrastim 6mg/0.6mL | MED | VIAL | 5 | 10 | Once-per-cycle G-CSF |
| Allopurinol 100mg tab | MED | BOX | 5 | 20 | Tumour lysis prevention |
| Rasburicase 1.5mg | MED | VIAL | 3 | 10 | Acute tumour lysis |
| Mesna 400mg/4mL | MED | VIAL | 10 | 30 | Uroprotection with cyclophosphamide |
| Amifostine 500mg | MED | VIAL | 5 | 10 | Cisplatin renoprotection |
| Leucovorin (Folinic Acid) 50mg | MED | VIAL | 10 | 30 | MTX rescue, FOLFOX |
| Calcium Folinate 50mg | MED | VIAL | 10 | 30 | |
| Zoledronic Acid 4mg/5mL | MED | VIAL | 5 | 15 | Bone metastases |
| Denosumab 120mg | MED | VIAL | 5 | 10 | Bone metastases |

### 15.2 Common Chemotherapy Drugs (Sample — customise per formulary)

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Cisplatin 50mg/50mL | MED | VIAL | 5 | 15 |
| Carboplatin 450mg/45mL | MED | VIAL | 5 | 15 |
| Oxaliplatin 100mg/20mL | MED | VIAL | 5 | 15 |
| Paclitaxel 300mg/50mL | MED | VIAL | 5 | 15 |
| Docetaxel 80mg/4mL | MED | VIAL | 5 | 10 |
| Doxorubicin 50mg/25mL | MED | VIAL | 5 | 10 |
| Epirubicin 50mg/25mL | MED | VIAL | 5 | 10 |
| Cyclophosphamide 1g | MED | VIAL | 5 | 15 |
| Ifosfamide 1g/2g | MED | VIAL | 3 | 10 |
| Gemcitabine 1g | MED | VIAL | 5 | 15 |
| 5-Fluorouracil 500mg/10mL | MED | VIAL | 10 | 30 |
| Capecitabine 500mg tab | MED | BOX | 3 | 10 |
| Methotrexate 500mg/20mL | MED | VIAL | 5 | 15 |
| Vincristine 1mg/1mL | MED | VIAL | 5 | 15 |
| Vinorelbine 50mg/5mL | MED | VIAL | 3 | 10 |
| Etoposide 100mg/5mL | MED | VIAL | 5 | 15 |
| Irinotecan 100mg/5mL | MED | VIAL | 5 | 10 |
| Topotecan 4mg/4mL | MED | VIAL | 3 | 8 |
| Bleomycin 15IU | MED | VIAL | 3 | 10 |
| Rituximab 500mg/50mL | MED | VIAL | 3 | 8 |
| Trastuzumab 440mg | MED | VIAL | 2 | 6 |
| Bevacizumab 400mg/16mL | MED | VIAL | 2 | 6 |
| Imatinib 100mg/400mg tab | MED | BOX | 3 | 10 |
| Erlotinib 150mg tab | MED | BOX | 3 | 10 |
| Afatinib 40mg tab | MED | BOX | 3 | 8 |
| Tamoxifen 20mg tab | MED | BOX | 5 | 15 |
| Letrozole 2.5mg tab | MED | BOX | 5 | 15 |
| Anastrozole 1mg tab | MED | BOX | 5 | 15 |
| Bicalutamide 50mg tab | MED | BOX | 5 | 15 |

### 15.3 Oncology Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| PICC Line Kit (4Fr/5Fr) | SURG | KIT | 10 | 30 | Long-term chemo access |
| Implanted Port (Portacath) | IMPL | PCS | 3 | 10 | |
| Huber Needle (non-coring) 20G | CONS | PCS | 20 | 60 | Portacath access |
| Chemotherapy Gloves (double) | PPE | PAIR | 50 | 200 | Cytotoxic handling |
| Chemotherapy Gown (imperme.) | PPE | PCS | 30 | 100 | |
| Chemotherapy Spill Kit | CONS | KIT | 5 | 15 | |
| Luer-lock IV Set (chemo rated) | CONS | SET | 20 | 60 | |
| Closed System Transfer Device | CONS | PCS | 10 | 30 | Cytotoxic preparation safety |
| Cytotoxic Waste Bin (purple) | CONS | PCS | 10 | 30 | |
| Cytotoxic Waste Bag | CONS | PKT | 20 | 60 | |
| Safety Goggles | PPE | PCS | 10 | 20 | |
| N95 Respirator | PPE | BOX | 5 | 20 | |
| Laminar Air Flow Hood Filter | CONS | PCS | 2 | 6 | |
| IV Infusion Pump Set (chemo) | CONS | SET | 20 | 60 | |

---

## 16. Endoscopy & GI Suite

### 16.1 Endoscopy Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Midazolam 5mg/1mL IV | MED | AMP | 15 | 50 | CD — conscious sedation |
| Fentanyl 50mcg/1mL IV | MED | AMP | 15 | 50 | CD |
| Propofol 200mg/20mL | MED | VIAL | 20 | 60 | Deep sedation |
| Ketamine 500mg/10mL | MED | VIAL | 5 | 20 | |
| Naloxone 0.4mg/1mL | MED | AMP | 10 | 30 | Reversal |
| Flumazenil 0.1mg/1mL | MED | AMP | 10 | 30 | Reversal |
| Buscopan (Hyoscine) 20mg/1mL | MED | AMP | 10 | 30 | Reduce peristalsis |
| Glucagon 1mg IV | MED | VIAL | 5 | 15 | Relax duodenum for ERCP |
| Lignocaine 4% Spray (airway) | MED | BTL | 5 | 15 | Oropharyngeal topicalisation |
| Lignocaine Gel 2% 30g | MED | BTL | 10 | 30 | Colonoscope lubrication |
| Simethicone 80mg tab (pre-procedure) | MED | BOX | 5 | 20 | Reduce gas |
| Polyethylene Glycol (bowel prep) | MED | PKT | 20 | 60 | Colonoscopy prep |
| Sodium Picosulfate Sachet | MED | SACHET | 10 | 30 | Alternative bowel prep |
| Adrenaline 1:10000 (endoscopic) | MED | VIAL | 10 | 30 | Haemostasis injection |
| Absolute Ethanol (sclerotherapy) | MED | VIAL | 5 | 15 | Varices/GIST |
| Polidocanol Sclerosant 1% | MED | VIAL | 5 | 15 | Variceal sclerotherapy |
| Cyanoacrylate Glue | CONS | VIAL | 5 | 10 | Gastric varices |
| Band Ligation Kit (6-shooter) | CONS | KIT | 5 | 15 | Variceal banding |
| Haemostatic Powder (Hemospray) | CONS | KIT | 3 | 8 | Acute GI bleed |
| Metal Haemostasis Clip (Resolution) | CONS | PCS | 10 | 30 | Polypectomy, bleeding |
| APC (argon plasma coagulation) probe | CONS | PCS | 5 | 10 | |
| Cystotome for ESD/EMR | CONS | PCS | 3 | 8 | |
| Polypectomy Snare (hot/cold) | CONS | PCS | 10 | 30 | |
| Biopsy Forceps (standard) | CONS | PCS | 20 | 60 | |
| Biopsy Forceps (Jumbo) | CONS | PCS | 10 | 30 | |
| Cytology Brush | CONS | PCS | 10 | 30 | |
| ERCP Cannula | CONS | PCS | 5 | 15 | |
| Sphincterotome | CONS | PCS | 5 | 15 | |
| ERCP Guide Wire 0.035" | CONS | PCS | 5 | 15 | |
| Biliary Stent (Plastic) 7Fr/10Fr | CONS | PCS | 5 | 15 | |
| Biliary Self-Expanding Metal Stent | IMPL | PCS | 3 | 8 | |
| Pancreatic Stent 5Fr | CONS | PCS | 3 | 8 | |
| Nasobiliary Drain | CONS | PCS | 3 | 8 | |
| Oesophageal Dilation Balloon | CONS | PCS | 5 | 15 | |
| TTS Balloon (through the scope) | CONS | PCS | 5 | 10 | |
| PEG Kit (percutaneous gastrostomy) | SURG | KIT | 3 | 8 | |

### 16.2 Scope Cleaning & Disinfection

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| High-level Disinfectant (OPA/Cidex) 5L | CHEM | BTL | 5 | 20 |
| Enzymatic Detergent 500mL | CHEM | BTL | 10 | 30 |
| Scope Channel Cleaning Brush | CONS | PCS | 10 | 30 |
| Scope Channel Cleaning Brush (biopsy) | CONS | PCS | 10 | 30 |
| Scope Mouthpiece | CONS | PCS | 20 | 60 |
| Bite Block / Bite Guard | CONS | PCS | 20 | 60 |
| Scope Transport Container | EQUIP | PCS | 3 | 6 |
| Leak Tester | EQUIP | PCS | 2 | 4 |
| Alcohol 70% 500mL (final rinse) | CONS | BTL | 10 | 30 |
| Sterile Water 500mL (final rinse) | CONS | BTL | 10 | 30 |

---

## 17. Outpatient Department (OPD)

### 17.1 Consultation Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Examination Gloves (S/M/L/XL) | CONS | BOX | 30 | 120 |
| Tongue Depressor (wooden) | CONS | PKT | 20 | 80 |
| Cotton Buds Sterile | CONS | PKT | 10 | 40 |
| Cusco's Vaginal Speculum (disposable) | CONS | PCS | 20 | 80 |
| Disposable Proctoscope | CONS | PCS | 10 | 30 |
| Disposable Otoscope Specula | CONS | BOX | 5 | 20 |
| Disposable Nasal Speculum | CONS | PCS | 10 | 30 |
| BP Cuff (Disposable — Adult) | CONS | PCS | 15 | 50 |
| Stethoscope Cover (Sterile) | CONS | PCS | 20 | 60 |
| Thermometer (oral disposable) | CONS | BOX | 5 | 20 |
| Disposable Peak Flow Mouthpiece | CONS | PCS | 10 | 30 |
| Urine Dipstick 10-parameter | DIAG | BOX | 10 | 30 |
| Pregnancy Test Strip | DIAG | BOX | 5 | 20 |
| ECG Paper Roll (for ECG machine) | CONS | ROLL | 10 | 40 |
| Electrode Gel (for ECG/Doppler) | CONS | BTL | 10 | 30 |
| Pulmonary Function Test Mouthpiece | CONS | PCS | 10 | 30 |
| Spirometry Bacterial Filter | CONS | PCS | 10 | 30 |
| Bandage/Dressing Trolley Covers | CONS | ROLL | 5 | 20 |
| IV Cannula 20G/22G | CONS | BOX | 5 | 20 |
| Syringe 5mL/10mL | CONS | BOX | 10 | 30 |
| Alcohol Swabs | CONS | BOX | 10 | 40 |
| Saline Flush 10mL | MED | AMP | 20 | 80 |

### 17.2 Procedure Room (OPD Minor Surgery)

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Minor Surgery Pack | SURG | KIT | 10 | 30 |
| Local Anaesthetic (Lignocaine 1% 20mL) | MED | VIAL | 20 | 60 |
| Bupivacaine 0.5% 20mL | MED | VIAL | 10 | 30 |
| Sterile Drape (small fenestrated) | SURG | PCS | 20 | 60 |
| Sterile Gauze 4x4" | CONS | PKT | 30 | 100 |
| Suture Tray | SURG | KIT | 10 | 30 |
| Sutures (Nylon 3-0/4-0) | SURG | BOX | 5 | 20 |
| Skin Stapler | SURG | PCS | 5 | 20 |
| Staple Remover | SURG | PCS | 10 | 30 |
| Needle Holder | EQUIP | PCS | 5 | 10 |
| Toothed Forceps | EQUIP | PCS | 5 | 10 |
| Scissors (suture) | EQUIP | PCS | 5 | 10 |
| Abscess Drainage Kit | SURG | KIT | 5 | 15 |
| Wart/Mole Punch (dermal biopsy) | SURG | PCS | 5 | 15 |
| Sebaceous Cyst Excision Pack | SURG | KIT | 5 | 10 |

---

## 18. Pharmacy

### 18.1 Drug Categories & Inventory Scope

| Category | Examples | Storage |
|----------|----------|---------|
| Oral Solids (tablets/capsules) | Thousands of SKUs | 15–25°C, dry, FIFO |
| Oral Liquids (syrups/drops) | >200 SKUs | 15–25°C; some refrigerated |
| Topical (creams/ointments) | >100 SKUs | 15–25°C |
| Ophthalmic (drops/ointment) | >50 SKUs | 2–8°C after opening |
| Ear/Nasal Drops | >30 SKUs | Ambient |
| Injectables (IV/IM/SC) | >500 SKUs | Ambient/cold chain |
| IV Fluids | 20–30 SKUs | Ambient bulk store |
| Controlled Substances | 30–50 SKUs | Double-lock cabinet |
| Vaccines/Biologicals | 50–80 SKUs | 2–8°C validated fridge |
| Radiopharmaceuticals | 5–10 SKUs | Lead shield; short-lived |
| Surgical/External use | >100 SKUs | Ambient |
| Herbal/Ayurvedic | 20–50 SKUs | As per label |

### 18.2 Controlled Drug Storage (Schedule H/H1/X)

| Class | Example Drugs | Security Requirement |
|-------|--------------|---------------------|
| Opioids (Schedule X) | Morphine, Fentanyl, Pethidine, Codeine | Iron double-lock cabinet, Narcotics Register, dual pharmacist sign-off |
| Benzodiazepines (H1) | Midazolam, Diazepam, Lorazepam | Locked cabinet, prescribed by authorized doctor only |
| Barbiturates (H1) | Phenobarbitone, Thiopentone | Locked storage |
| Ketamine (H1) | Ketamine HCl | Locked, log maintained |
| High-Alert Medications | KCl concentrate, Concentrated Na, Insulin, Heparin, NTG | Separate shelf with RED label; double-check protocol |

### 18.3 Pharmacy Operations & Equipment

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Medicine Dispensing Pouch (S/M/L) | ADMIN | PKT | 30 | 100 |
| Prescription Label Paper (A4) | ADMIN | REAM | 10 | 30 |
| Pharmacy Bag (paper) | ADMIN | PKT | 20 | 80 |
| Pharmacy Bag (plastic, childproof) | ADMIN | PKT | 20 | 80 |
| Amber Bottle 30mL | CONS | PCS | 20 | 80 |
| Amber Bottle 60mL | CONS | PCS | 20 | 80 |
| Amber Bottle 100mL | CONS | PCS | 20 | 80 |
| Amber Bottle 200mL | CONS | PCS | 20 | 80 |
| Child-Resistant Closure Caps | CONS | PKT | 20 | 80 |
| Counting Tray (stainless/plastic) | EQUIP | PCS | 5 | 10 |
| Spatula (stainless steel) | EQUIP | PCS | 10 | 20 |
| Mortar & Pestle (glass, porcelain) | EQUIP | PCS | 3 | 6 |
| Pill Splitter | EQUIP | PCS | 5 | 10 |
| Pill Crusher | EQUIP | PCS | 5 | 10 |
| Mixing Bowls (S/M/L) | EQUIP | PCS | 5 | 10 |
| Measuring Cylinder 100mL/500mL | EQUIP | PCS | 5 | 10 |
| Suppository Mould | EQUIP | PCS | 3 | 6 |
| Weighing Balance (Class II) | EQUIP | PCS | 2 | 4 |
| Refrigerator Thermometer (min/max) | EQUIP | PCS | 10 | 20 |
| Humidity/Temp Logger | EQUIP | PCS | 5 | 10 |
| Dispensing Robot Cassette | CONS | PCS | 3 | 10 |
| Barcode Scanner | EQUIP | PCS | 3 | 6 |
| Dispensing Label Printer | EQUIP | PCS | 2 | 4 |
| Label Ribbon | CONS | ROLL | 5 | 15 |
| Autoclave Bag (pharmacy) | CONS | PKT | 10 | 30 |
| Gloves (nitrile, for dispensing) | CONS | BOX | 20 | 80 |
| Apron (pharmacy) | PPE | PCS | 5 | 15 |

### 18.4 Cold Chain & Vaccine Storage

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Polio Vaccine (OPV) | MED | VIAL | 20 | 60 |
| Hepatitis B Vaccine (adult) | MED | VIAL | 20 | 60 |
| Influenza Vaccine (seasonal) | MED | VIAL | 20 | 60 |
| Typhoid Vi Polysaccharide | MED | VIAL | 10 | 30 |
| Hepatitis A Vaccine | MED | VIAL | 10 | 30 |
| MMR Vaccine | MED | VIAL | 10 | 30 |
| Pneumococcal 23-val (PPSV23) | MED | VIAL | 10 | 30 |
| Meningococcal ACWY | MED | VIAL | 5 | 15 |
| HPV Vaccine (4-val/9-val) | MED | VIAL | 5 | 15 |
| Rabies Vaccine (PCECV) | MED | VIAL | 10 | 30 |
| Anti-rabies Serum (ERIG) | MED | VIAL | 5 | 15 |
| Tetanus Toxoid 0.5mL | MED | VIAL | 20 | 60 |
| TIG (Human Tetanus Immunoglobulin) | MED | VIAL | 5 | 15 |
| Anti-Snake Venom (Polyvalent) | MED | VIAL | 10 | 30 |
| Anti-Scorpion Venom | MED | VIAL | 5 | 15 |
| Human Immunoglobulin IV (IVIG) | MED | VIAL | 5 | 15 |
| Varicella Zoster IG | MED | VIAL | 3 | 10 |
| Anti-thymocyte Globulin | MED | VIAL | 3 | 8 |
| Insulin (all types) — see wards | MED | VIAL | 20 | 60 |
| GLP-1 Agonist (Semaglutide pen) | MED | PCS | 5 | 15 |
| Erythropoietin 4000IU | MED | VIAL | 10 | 30 |

---

## 19. Clinical Laboratory

### 19.1 Haematology

| Item | Category | UOM | Reorder | Max | Analyzer |
|------|----------|-----|---------|-----|----------|
| CBC 5-part Diff Reagent Pack | DIAG | UNIT | 5 | 15 | Sysmex XN/Beckman |
| Haemoglobin Standard | DIAG | BTL | 5 | 15 | |
| Reticulocyte Reagent | DIAG | BTL | 5 | 15 | |
| CD4 Count Reagent | DIAG | KIT | 3 | 10 | Flow cytometry |
| Peripheral Smear Stain (Giemsa) | DIAG | BTL | 5 | 15 | |
| Leishman Stain | DIAG | BTL | 5 | 15 | |
| May-Grünwald Stain | DIAG | BTL | 5 | 10 | |
| ESR Westergren Method Solution | DIAG | BTL | 5 | 15 | |
| Bleeding Time / Clotting Time Kit | DIAG | KIT | 5 | 15 | |
| D-Dimer Reagent | DIAG | KIT | 5 | 15 | |
| Fibrinogen Reagent | DIAG | KIT | 5 | 10 | |
| PT/INR Reagent (Thromboplastin) | DIAG | KIT | 5 | 15 | |
| APTT Reagent | DIAG | KIT | 5 | 15 | |
| Anti-Xa Assay Kit | DIAG | KIT | 3 | 10 | |
| Bone Marrow Biopsy Trephine Needle | SURG | PCS | 3 | 10 | |
| Bone Marrow Aspiration Needle | SURG | PCS | 3 | 10 | |

### 19.2 Biochemistry

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| LFT Panel Reagent (ALT/AST/ALP/Bili/Albumin/Protein) | DIAG | KIT | 5 | 15 |
| RFT Panel Reagent (Urea/Creatinine/UA/eGFR) | DIAG | KIT | 5 | 15 |
| Lipid Panel Reagent (Cholesterol/TG/HDL/LDL) | DIAG | KIT | 5 | 15 |
| Electrolyte Reagent (Na/K/Cl/CO2) | DIAG | KIT | 5 | 15 |
| Blood Glucose Reagent | DIAG | KIT | 5 | 15 |
| HbA1c Reagent | DIAG | KIT | 5 | 15 |
| Amylase/Lipase Reagent | DIAG | KIT | 5 | 10 |
| CRP Reagent | DIAG | KIT | 5 | 15 |
| Procalcitonin (PCT) Reagent | DIAG | KIT | 5 | 15 |
| Troponin I/T Reagent | DIAG | KIT | 5 | 15 |
| NT-proBNP Reagent | DIAG | KIT | 5 | 10 |
| Thyroid Panel Reagent (TSH/FT3/FT4) | DIAG | KIT | 5 | 15 |
| Cortisol Reagent | DIAG | KIT | 3 | 10 |
| Vitamin D (25-OH) Reagent | DIAG | KIT | 5 | 15 |
| Ferritin/Serum Iron/TIBC Reagent | DIAG | KIT | 5 | 15 |
| Calcium/Phosphate/Magnesium Reagent | DIAG | KIT | 5 | 15 |
| PSA Total/Free Reagent | DIAG | KIT | 3 | 10 |
| AFP/CEA/CA-125/CA 19-9 Reagent | DIAG | KIT | 3 | 10 |
| Beta-HCG Quantitative | DIAG | KIT | 3 | 10 |
| HIV Ag/Ab Combo Reagent | DIAG | KIT | 5 | 15 |
| HBsAg Reagent | DIAG | KIT | 5 | 15 |
| HCV Ab Reagent | DIAG | KIT | 5 | 15 |
| VDRL Reagent (Syphilis) | DIAG | KIT | 5 | 15 |
| Widal Test Antigen Kit | DIAG | KIT | 5 | 15 |
| Blood Culture Bottle (BacT/ALERT) Aerobic | DIAG | PCS | 50 | 200 |
| Blood Culture Bottle Anaerobic | DIAG | PCS | 30 | 100 |
| Paediatric Blood Culture Bottle | DIAG | PCS | 20 | 80 |
| Mycobacteria Culture Bottle (MGIT) | DIAG | PCS | 10 | 30 |

### 19.3 Microbiology

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Blood Agar Plate | DIAG | PCS | 30 | 100 |
| MacConkey Agar Plate | DIAG | PCS | 30 | 100 |
| Chocolate Agar Plate | DIAG | PCS | 20 | 60 |
| CLED Agar (Urine) | DIAG | PCS | 20 | 60 |
| Thayer-Martin Plate (GC) | DIAG | PCS | 10 | 30 |
| Sabouraud Dextrose Agar | DIAG | PCS | 15 | 50 |
| Tryptic Soy Broth | DIAG | BTL | 10 | 30 |
| Thioglycollate Broth | DIAG | BTL | 10 | 30 |
| Mueller-Hinton Agar | DIAG | PCS | 15 | 50 |
| Antibiotic Sensitivity Disc Panel | DIAG | PKT | 10 | 30 |
| Kirby-Bauer Discs (Beta-lactam/Quinolone/Aminoglycoside) | DIAG | PKT | 10 | 30 |
| Gram Stain Kit (Crystal Violet/Iodine/Safranin) | DIAG | SET | 5 | 15 |
| AFB (Ziehl-Neelsen) Stain Set | DIAG | SET | 5 | 10 |
| India Ink (Cryptococcus) | DIAG | BTL | 3 | 10 |
| KOH 10% (fungal wet mount) | DIAG | BTL | 5 | 15 |
| Methylene Blue | DIAG | BTL | 5 | 15 |
| MALDI-TOF Target Plate | DIAG | PCS | 5 | 15 |
| MALDI Matrix Solution (HCCA) | DIAG | BTL | 3 | 10 |
| Urine Mid-stream Collection Kit | CONS | KIT | 20 | 60 |
| HVS / ECS Swab (charcoal) | CONS | PCS | 20 | 60 |
| Throat Swab | CONS | PCS | 20 | 60 |
| Sputum Collection Container | CONS | PCS | 20 | 60 |
| Sterile Specimen Container 60mL | CONS | PCS | 30 | 100 |
| Sterile Stool Container | CONS | PCS | 20 | 80 |
| Parasitology Concentration Kit | DIAG | KIT | 5 | 15 |
| Formalin 10% (stool/tissue fixative) | CHEM | BTL | 10 | 30 |
| Transport Medium (Amies) | CONS | PCS | 20 | 60 |
| Stuart Transport Medium | CONS | PCS | 10 | 40 |

### 19.4 Serology & Immunology

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Dengue NS1 + IgM/IgG Combo | DIAG | BOX | 10 | 30 |
| Malaria Ag (P.falciparum/P.vivax) | DIAG | BOX | 10 | 30 |
| Typhoid IgM Rapid | DIAG | BOX | 10 | 30 |
| Leptospira IgM ELISA | DIAG | KIT | 5 | 15 |
| Scrub Typhus IgM | DIAG | BOX | 5 | 15 |
| COVID-19 Antigen Rapid | DIAG | BOX | 10 | 40 |
| COVID-19 RT-PCR Reagent | DIAG | KIT | 5 | 15 |
| Influenza A+B Rapid Antigen | DIAG | BOX | 10 | 30 |
| Hepatitis B Surface Antigen ELISA | DIAG | KIT | 5 | 15 |
| Anti-HCV ELISA | DIAG | KIT | 5 | 15 |
| HIV 1+2 Ag/Ab 4th Gen ELISA | DIAG | KIT | 5 | 15 |
| RPR/VDRL Reagent | DIAG | KIT | 5 | 15 |
| TPHA Reagent (confirmatory syphilis) | DIAG | KIT | 5 | 10 |
| ANA (Antinuclear Ab) | DIAG | KIT | 3 | 10 |
| ANCA (c-ANCA / p-ANCA) | DIAG | KIT | 3 | 10 |
| Rheumatoid Factor | DIAG | KIT | 5 | 10 |
| Anti-CCP Reagent | DIAG | KIT | 3 | 10 |
| Complement C3/C4 Reagent | DIAG | KIT | 3 | 10 |
| IgG/IgM/IgA Quantitative | DIAG | KIT | 3 | 10 |

### 19.5 Lab General Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| EDTA Tube 3mL (lavender) | CONS | BOX | 20 | 80 |
| Plain Tube 5mL (red) | CONS | BOX | 20 | 80 |
| SST Tube 5mL (gold) | CONS | BOX | 20 | 80 |
| Sodium Citrate Tube 3mL (blue) | CONS | BOX | 10 | 40 |
| Fluoride Oxalate 2mL (grey) | CONS | BOX | 10 | 40 |
| Sodium Heparin 5mL (green) | CONS | BOX | 10 | 40 |
| Paediatric EDTA 1mL | CONS | BOX | 10 | 30 |
| Serum Separator Gel Tube | CONS | BOX | 20 | 80 |
| Vacutainer Holder | CONS | PCS | 30 | 100 |
| Multi-sample Needle 21G | CONS | BOX | 20 | 80 |
| Butterfly Needle 23G | CONS | BOX | 10 | 40 |
| Glass Slides (pre-cleaned) | CONS | BOX | 20 | 60 |
| Frosted Slides | CONS | BOX | 10 | 30 |
| Coverslips 22x22/22x50mm | CONS | BOX | 10 | 40 |
| Immersion Oil (Type B) | CONS | BTL | 5 | 15 |
| Xylene (Histology grade) 500mL | CHEM | BTL | 5 | 15 |
| Ethanol 100% (Histology grade) | CHEM | BTL | 5 | 15 |
| Haematoxylin Solution | CHEM | BTL | 5 | 10 |
| Eosin Solution | CHEM | BTL | 5 | 10 |
| DPX Mountant | CHEM | BTL | 5 | 10 |
| Disposable Pipette Tips 10µL | CONS | BOX | 20 | 80 |
| Disposable Pipette Tips 100µL | CONS | BOX | 20 | 80 |
| Disposable Pipette Tips 1000µL | CONS | BOX | 20 | 80 |
| Microcentrifuge Tubes 1.5mL | CONS | PKT | 20 | 60 |
| Microcentrifuge Tubes 0.5mL | CONS | PKT | 10 | 40 |
| Cuvettes (disposable polystyrene) | CONS | PKT | 10 | 40 |
| Urine Container 60mL (sterile) | CONS | PCS | 50 | 200 |
| Stool Container 60mL | CONS | PCS | 30 | 100 |
| Biosafety Bag Yellow 15L | CONS | PKT | 30 | 100 |
| Sharps Container 5L/11L | CONS | PCS | 20 | 60 |
| Lab Coat (white, washable) | PPE | PCS | 10 | 20 |
| Nitrile Gloves (S/M/L) | PPE | BOX | 30 | 100 |
| Safety Spectacles | PPE | PCS | 10 | 20 |
| Cryoprotection Gloves | PPE | PAIR | 5 | 10 |
| Parafilm | CONS | ROLL | 5 | 15 |
| Centrifuge Tubes 15mL/50mL | CONS | PKT | 10 | 40 |
| Filter Paper (Whatman No. 1) | CONS | PKT | 5 | 15 |
| pH Paper/Strips | DIAG | PKT | 5 | 15 |
| Calibration Standards (Liquid) | DIAG | BTL | 5 | 15 |
| QC Material Level 1/2/3 | DIAG | BTL | 5 | 15 |

## 20. Radiology & Imaging

### 20.1 General Radiology Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| X-Ray Film 35x43cm (Chest/Abdomen) | CONS | BOX | 15 | 60 |
| X-Ray Film 24x30cm (Extremities) | CONS | BOX | 15 | 60 |
| X-Ray Film 18x24cm (Hands/Feet) | CONS | BOX | 10 | 40 |
| X-Ray Cassette (CR) | EQUIP | PCS | 5 | 10 |
| CR Phosphor Plate | EQUIP | PCS | 3 | 8 |
| DR Detector Cleaning Kit | CONS | KIT | 3 | 10 |
| Dry Thermal Film (DR printer) 35x43 | CONS | BOX | 10 | 40 |
| X-Ray Developing Solution 5L | CONS | BTL | 5 | 15 |
| X-Ray Fixer Solution 5L | CONS | BTL | 5 | 15 |
| Darkroom Safe Light Bulb | CONS | PCS | 3 | 8 |

### 20.2 CT Scanner

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| CT Contrast (Iopamidol 370mg/mL) 100mL | MED | VIAL | 30 | 100 | Iodinated |
| CT Contrast (Iohexol Omnipaque 350) 100mL | MED | VIAL | 20 | 80 | |
| CT Contrast (Non-ionic Low Osmolarity) 50mL | MED | VIAL | 20 | 60 | Paeds/renal compromise |
| Contrast Injector Syringe 200mL | CONS | PCS | 20 | 60 | Power injector |
| Contrast Injector Tubing Set | CONS | SET | 20 | 60 | |
| Premedication (Hydrocortisone 100mg) | MED | VIAL | 10 | 30 | Contrast allergy pre-med |
| Metformin Hold Protocol forms | ADMIN | PKT | 5 | 20 | |
| IV Cannula 18G (for contrast injection) | CONS | PCS | 20 | 80 | |
| Saline 500mL flush | MED | BAG | 30 | 100 | Post contrast flush |
| Disposable Table Cover/Sheet | CONS | ROLL | 10 | 30 | |

### 20.3 MRI Suite

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| MRI Contrast (Gadolinium DTPA) 15mL | MED | VIAL | 15 | 50 | Gadopentetate/Gadobutrol |
| MRI Contrast 10mL (paeds) | MED | VIAL | 5 | 20 | Weight-based dosing |
| MRI Safe IV Cannula (non-ferrous) | CONS | PCS | 10 | 30 | MRI-compatible |
| MRI Safe IV Extension Set | CONS | SET | 10 | 30 | |
| MRI Contrast Injector Syringe | CONS | PCS | 10 | 30 | |
| MRI-Compatible SpO2 Probe | CONS | PCS | 5 | 15 | |
| MRI Ear Plugs (disposable) | CONS | PKT | 20 | 80 | |
| MRI Safety Questionnaire Forms | ADMIN | PKT | 10 | 30 | |
| MRI Gown (cotton, non-metallic) | LINEN | PCS | 20 | 40 | |
| MRI Bore Pillow (foam) | CONS | PCS | 5 | 15 | |
| Quench Button Cover | CONS | PCS | 2 | 4 | |
| MRI Suite Emergency O2 Cylinder (Alu) | EQUIP | CYL | 2 | 4 | Aluminium — MRI safe |
| Sedation Protocol (Midazolam/Propofol) | MED | VIAL | 5 | 15 | Paediatric/claustrophobic |

### 20.4 Ultrasound

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Ultrasound Gel 5L | CONS | BTL | 10 | 30 |
| Ultrasound Probe Cover (latex-free) | CONS | PKT | 15 | 50 |
| Transvaginal Probe Cover | CONS | PKT | 10 | 30 |
| Ultrasound Transmission Gel (alcohol-free) | CONS | BTL | 10 | 30 |
| Biopsy Guide (transducer-mounted) | CONS | PCS | 5 | 15 |
| Tru-cut Biopsy Needle 16G/18G | SURG | PCS | 10 | 30 |
| Fine Needle Aspiration Needle 22G/23G | CONS | PCS | 10 | 30 |
| Biopsy Container (formalin 10%) 30mL | CONS | PCS | 20 | 60 |
| Specimen Label (colour-coded) | ADMIN | PKT | 20 | 60 |

### 20.5 Fluoroscopy / Interventional Radiology

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Barium Sulfate Suspension (HD) | MED | BTL | 5 | 20 |
| Barium Sulfate Powder 200g | MED | PKT | 5 | 15 |
| Water Soluble Contrast (Gastrografin) 100mL | MED | BTL | 5 | 20 |
| Pigtail Drainage Catheter 8Fr/10Fr | SURG | PCS | 5 | 15 |
| PTBD Catheter | SURG | PCS | 3 | 8 |
| Nephrostomy Catheter | SURG | PCS | 3 | 8 |
| IVC Filter (optional) | IMPL | PCS | 2 | 5 |
| Guidewire 0.035" Bentson | CONS | PCS | 10 | 30 |
| Sheath 5Fr/6Fr | SURG | PCS | 10 | 30 |
| Embolization Coil | CONS | PCS | 3 | 10 |
| Arterial Closure Device | SURG | PCS | 5 | 15 |

### 20.6 Radiation Protection

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Lead Apron (0.35mm Pb equiv, full) | PPE | PCS | 10 | 20 |
| Lead Thyroid Collar | PPE | PCS | 10 | 20 |
| Lead Gonadal Shield (male/female) | PPE | PCS | 10 | 20 |
| Lead Gloves | PPE | PAIR | 5 | 10 |
| Lead Spectacles | PPE | PCS | 5 | 10 |
| Personal Dosimeter (TLD Badge) | PPE | PCS | 30 | 60 |
| Film Badge | PPE | PCS | 30 | 60 |
| Lead Glass Panel (mobile shield) | EQUIP | PCS | 2 | 4 |
| Radiation Warning Signs | ADMIN | PCS | 5 | 10 |

---

## 21. Blood Bank & Transfusion Medicine

### 21.1 Blood Components

| Component | Type | Storage Temp | Shelf Life | Min Units | Notes |
|-----------|------|-------------|------------|-----------|-------|
| Whole Blood 450mL | BLOOD | 2–6°C | 35 days | 10 | Type-specific |
| Packed RBC (PRBC) | BLOOD | 2–6°C | 42 days | 20 | Per blood group |
| Leucodepleted PRBC | BLOOD | 2–6°C | 42 days | 10 | Immunocompromised/repeat Tx |
| Washed PRBC | BLOOD | 2–6°C | 24h after washing | 5 | IgA deficiency |
| Irradiated PRBC | BLOOD | 2–6°C | 28 days | 5 | Post-transplant |
| Fresh Frozen Plasma (FFP) | BLOOD | ≤−18°C | 12 months | 15 | |
| Cryoprecipitate | BLOOD | ≤−18°C | 12 months | 10 | Fibrinogen, F.VIII |
| Platelet Concentrate (RDP) | BLOOD | 20–24°C agitated | 5 days | 10 | |
| Single Donor Platelet (SDP) | BLOOD | 20–24°C agitated | 5 days | 5 | |
| Granulocyte Concentrate | BLOOD | 20–24°C | 24h | 2 | Rare — severe neutropenia |
| Albumin 25% 50mL | BLOOD | 2–8°C | Per label | 10 | |
| Albumin 4% / 5% 500mL | BLOOD | 2–8°C | Per label | 5 | |
| Human Anti-D Immunoglobulin | MED | 2–8°C | Per label | 10 | |
| IVIG 5g/100mL | MED | 2–8°C | Per label | 5 | |

### 21.2 Blood Bank Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Blood Bag Single 450mL (CPD/CPDA) | CONS | PCS | 50 | 200 | Donation |
| Blood Bag Double (Additive Solution) | CONS | PCS | 30 | 120 | |
| Blood Bag Triple | CONS | PCS | 20 | 80 | PRBC + FFP + Buffy coat |
| Blood Bag Quadruple | CONS | PCS | 10 | 40 | All 4 components |
| Paediatric Blood Bag 100mL | CONS | PCS | 10 | 30 | Neonatal transfusion |
| Blood Transfusion Set (170 micron) | CONS | PCS | 50 | 200 | |
| Leucodepletion Filter | CONS | PCS | 20 | 60 | Bedside leucodepletion |
| Platelet Transfusion Set | CONS | PCS | 20 | 80 | |
| Neonatal Blood Transfusion Set | CONS | PCS | 10 | 30 | |
| Segment Sealer | EQUIP | PCS | 3 | 6 | |
| Plasma Extractor | EQUIP | PCS | 2 | 4 | Manual press |
| Sterile Connecting Device (TSCD) | CONS | PCS | 20 | 60 | Sterile docking |
| ABO Grouping Serum Anti-A (1mL) | DIAG | BTL | 10 | 30 | |
| ABO Grouping Serum Anti-B | DIAG | BTL | 10 | 30 | |
| Anti-D (IgM) Serum | DIAG | BTL | 10 | 30 | Rh typing |
| Anti-H Lectin | DIAG | BTL | 5 | 10 | Bombay blood group |
| Coombs Serum (polyspecific AHG) | DIAG | BTL | 5 | 15 | |
| Monospecific Anti-IgG | DIAG | BTL | 5 | 10 | |
| Monospecific Anti-C3d | DIAG | BTL | 5 | 10 | |
| Bromelain Solution | DIAG | BTL | 3 | 8 | Enzyme technique |
| LISS (Low Ionic Strength Solution) | DIAG | BTL | 5 | 10 | |
| Gel Card (Neutral + AHG) | DIAG | PKT | 10 | 30 | Column agglutination |
| Cell Screening Reagent (2-cell/3-cell) | DIAG | KIT | 5 | 15 | Antibody screen |
| Coombscard/Gel Panel | DIAG | KIT | 5 | 15 | |
| Blood Bag Label (thermal printable) | ADMIN | ROLL | 10 | 30 | |
| Compatibility Form / Crossmatch Form | ADMIN | PKT | 10 | 30 | |
| Isopropyl Alcohol 70% 1L | CONS | BTL | 20 | 60 | Skin prep for phlebotomy |
| Povidone-Iodine 10% 500mL | CONS | BTL | 10 | 30 | |
| Blood Donor Needle 16G | CONS | BOX | 5 | 20 | |
| Cryoprotectant (for stem cells) | CONS | BTL | 2 | 6 | |
| Sterile Gloves (for blood bank procedures) | CONS | PAIR | 20 | 60 | |

---

## 22. CSSD (Central Sterile Supply Department)

### 22.1 Sterilisation Process Consumables

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Self-sealing Sterilisation Pouches 75x200mm | CONS | BOX | 20 | 80 | |
| Self-sealing Sterilisation Pouches 100x250mm | CONS | BOX | 20 | 80 | |
| Self-sealing Sterilisation Pouches 150x300mm | CONS | BOX | 15 | 60 | |
| Self-sealing Pouches 200x350mm | CONS | BOX | 10 | 40 | |
| Sterilisation Flat Roll (50cm x 200m) | CONS | ROLL | 10 | 30 | Custom sizing |
| Sterilisation Wrap Crepe 45x45cm | CONS | PKT | 20 | 80 | 2-layer wrapping |
| Sterilisation Wrap Crepe 60x60cm | CONS | PKT | 15 | 60 | |
| Sterilisation Wrap Crepe 75x75cm | CONS | PKT | 10 | 40 | |
| Sterilisation Wrap 90x90cm | CONS | PKT | 10 | 30 | Large sets |
| SMS Non-woven Wrap | CONS | PKT | 10 | 30 | Water-repellent |
| Chemical Indicator Tape Class 1 (3M comply) | CONS | ROLL | 20 | 60 | Steam |
| Chemical Indicator Tape EO Class 1 | CONS | ROLL | 10 | 30 | Ethylene oxide |
| Chemical Indicator Strip Class 5 (integrating) | CONS | BOX | 10 | 40 | Inside pack |
| Chemical Indicator Strip Class 6 (emulating) | CONS | BOX | 10 | 30 | |
| Bowie-Dick Test Pack | DIAG | PCS | 30 | 120 | Daily pre-vacuum test |
| Biological Indicator Vial (Geobacillus stearothermophilus) | DIAG | PKT | 10 | 40 | Weekly steam BI |
| Biological Indicator EO (Bacillus atrophaeus) | DIAG | PKT | 5 | 20 | EO sterilisation |
| BI Incubator (50°C spore reader) | EQUIP | PCS | 2 | 4 | |
| Rapid BI 1-hour Read | DIAG | PKT | 10 | 30 | Implant release |
| Load Control Labels | ADMIN | ROLL | 10 | 30 | |
| Load Record Form | ADMIN | PKT | 10 | 30 | |
| Autoclave Tape Reel | CONS | ROLL | 10 | 30 | |

### 22.2 Decontamination Chemicals

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Enzymatic Detergent (multi-enzyme) 5L | CHEM | BTL | 20 | 80 | Pre-soak, automated washers |
| Enzymatic Detergent Powder 1kg | CHEM | KG | 20 | 60 | Manual soak |
| Neutral Detergent 5L | CHEM | BTL | 10 | 40 | General instrument wash |
| Instrument Lubricant (surgical milk) | CHEM | BTL | 5 | 20 | Post-cleaning |
| Alcide/OPA 0.55% (endoscope disinfectant) | CHEM | BTL | 5 | 20 | HLD for endoscopes |
| Glutaraldehyde 2% (Cidex) 5L | CHEM | BTL | 5 | 20 | HLD — ventilated area |
| Acecide (Peracetic Acid) 35% | CHEM | BTL | 3 | 10 | Automated endoscope reprocessors |
| Cidex OPA 3.4L | CHEM | BTL | 5 | 15 | |
| STERRAD Cassette (H2O2 plasma) | CONS | PCS | 5 | 15 | Low-temp sterilisation |
| EO Gas Cartridge 100g | CONS | PCS | 5 | 10 | Ethylene oxide |
| Formaldehyde 37% (Formalin) 1L | CHEM | BTL | 5 | 15 | Sterilisation cabinet |
| Distilled/Demineralised Water 5L | CHEM | BTL | 20 | 60 | Steam quality water |

### 22.3 Instrument Trays & Organisation

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Stainless Steel Tray (Small) | EQUIP | PCS | 20 | 50 |
| Stainless Steel Tray (Large) | EQUIP | PCS | 10 | 30 |
| Instrument Container Basket | EQUIP | PCS | 10 | 30 |
| Mesh Bottom Tray | EQUIP | PCS | 10 | 30 |
| Silicone Mat (instrument protection) | CONS | PCS | 10 | 30 |
| Instrument Tag / ID Label | ADMIN | ROLL | 5 | 20 |
| Instrument Count Sheet | ADMIN | PKT | 10 | 30 |
| Rubber Bands (sterilisation-grade) | CONS | PKT | 5 | 20 |
| Scope Cleaning Brush (2mm/3mm/5mm) | CONS | PCS | 10 | 30 |
| Ultrasonic Cleaner Basket | EQUIP | PCS | 3 | 8 |
| Autoclave Door Gasket | BIO | PCS | 3 | 8 |
| Autoclave Chamber Drain Filter | BIO | PCS | 3 | 8 |
| Sterile Water for Autoclaving 5L | CONS | BTL | 20 | 60 |

---

## 23. Dietary & Nutrition Department

### 23.1 Clinical Nutrition Products

| Item | Category | UOM | Reorder | Max | Target Patient |
|------|----------|-----|---------|-----|----------------|
| Fresubin Original (1kcal/mL) 500mL | DIET | BTL | 30 | 100 | General EN |
| Fresubin HP Energy (1.5kcal/mL) | DIET | BTL | 20 | 80 | High calorie/protein |
| Ensure Plus Advance 400g | DIET | PCS | 20 | 80 | Oral supplement |
| Ensure Enlive (HMB + protein) | DIET | PCS | 10 | 30 | Muscle wasting |
| Nepro HP (1.8kcal/mL) | DIET | BTL | 10 | 40 | Renal patients on dialysis |
| Suplena (0.9kcal/mL) | DIET | BTL | 10 | 30 | CKD (non-dialysis) |
| Glucerna SR (0.9kcal/mL) | DIET | BTL | 20 | 60 | Diabetic |
| Diabetasource AC | DIET | BTL | 10 | 40 | Diabetic |
| Pulmocare | DIET | BTL | 10 | 30 | COPD / resp failure |
| Hepatamine | DIET | BTL | 5 | 20 | Hepatic encephalopathy |
| Immunonutrition (Impact Oral) | DIET | SACHET | 10 | 30 | Pre/post-op immune modulation |
| Nutrison MCT (malabsorption) | DIET | BTL | 10 | 30 | GI disease |
| Peptamen AF (elemental) | DIET | BTL | 10 | 30 | Malabsorption, pancreatitis |
| Jevity 1.2 (fibre-containing) | DIET | BTL | 20 | 80 | Constipation-prone |
| Osmolite 1.2 (fibre-free) | DIET | BTL | 20 | 80 | Ileus-prone |
| Paediatric Pediasure 400g | DIET | PCS | 10 | 30 | Paed malnutrition |
| Pediasure Peptide | DIET | BTL | 5 | 20 | Paed GI disease |
| Neocate (amino acid–based infant) | DIET | PCS | 5 | 15 | CMPA, malabsorption |
| Similac NeoSure (preterm infant) | DIET | PCS | 5 | 15 | |
| Human Milk Fortifier (Nestle FM85) | DIET | SACHET | 5 | 20 | VLBW neonates |
| ORS (WHO standard 200mL) | MED | SACHET | 50 | 200 | |
| Clear Liquid Supplement (broth/juice) | DIET | BTL | 30 | 100 | Pre-op, post-op liquids |
| Thickener (Resource ThickenUp) | DIET | PKT | 10 | 30 | Dysphagia patients |

### 23.2 Enteral Feeding Equipment

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Enteral Feeding Pump Set (500mL bag) | CONS | SET | 20 | 80 |
| Enteral Feeding Pump Set (1000mL bag) | CONS | SET | 20 | 80 |
| Gravity Feeding Set (60mL/h drop) | CONS | SET | 20 | 60 |
| Enteral Syringe 60mL (catheter tip) | CONS | PCS | 30 | 100 |
| Enteral Syringe 30mL | CONS | PCS | 20 | 60 |
| NG Tube 14Fr/16Fr (for feeding) | CONS | PCS | 20 | 60 |
| PEG Tube Replacement (16Fr/20Fr) | CONS | PCS | 5 | 15 |
| G-Tube Balloon Replacement | CONS | PCS | 5 | 10 |
| Post-pyloric Tube (10Fr jejunal) | CONS | PCS | 5 | 15 |
| pH Test Strip (gastric placement check) | DIAG | PKT | 5 | 20 |
| Tube Holder / Bridle | CONS | PCS | 10 | 30 |

### 23.3 Kitchen Equipment & Supplies

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Patient Meal Tray (melamine) | CONS | PCS | 100 | 300 |
| Disposable Plate | CONS | PKT | 30 | 100 |
| Disposable Cup 200mL | CONS | PKT | 30 | 100 |
| Disposable Cutlery Set | CONS | PKT | 30 | 100 |
| Disposable Bowl | CONS | PKT | 30 | 100 |
| Food Service Gloves (PE) | PPE | BOX | 20 | 80 |
| Disposable Apron | PPE | PKT | 20 | 80 |
| Hair Net | PPE | PKT | 20 | 80 |
| Colour-coded Chopping Board Set | EQUIP | SET | 3 | 6 |
| Food Probe Thermometer | EQUIP | PCS | 5 | 10 |
| Allergen Menu Label | ADMIN | PKT | 10 | 30 |
| Diet Request Form | ADMIN | PKT | 10 | 30 |
| Food Temperature Log Sheet | ADMIN | PKT | 10 | 30 |
| HACCP Checklist Forms | ADMIN | PKT | 10 | 30 |

---

## 24. Physiotherapy & Rehabilitation

### 24.1 Electrotherapy Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| TENS Electrodes (46x46mm self-adhesive) | CONS | PKT | 10 | 40 |
| TENS Electrodes (50x90mm) | CONS | PKT | 10 | 30 |
| TENS Lead Wire | CONS | PCS | 5 | 15 |
| Ultrasound Therapy Gel 5L | CONS | BTL | 10 | 30 |
| Ultrasound Couplant Gel 250mL | CONS | BTL | 10 | 30 |
| IFT (Interferential) Electrode Pad | CONS | PKT | 10 | 30 |
| Wax Bath Paraffin Wax 4kg | CONS | KG | 10 | 40 |
| Wax Bath Mineral Oil 1L | CONS | BTL | 5 | 20 |
| LASER Therapy Protective Goggles | PPE | PCS | 5 | 10 |
| Shortwave Diathermy Electrode Pad | CONS | PKT | 5 | 20 |

### 24.2 Exercise & Manual Therapy

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Theraband Resistance Band Light (yellow) | CONS | ROLL | 5 | 15 |
| Theraband Medium (red) | CONS | ROLL | 5 | 15 |
| Theraband Heavy (green) | CONS | ROLL | 5 | 15 |
| Theraband X-Heavy (blue) | CONS | ROLL | 3 | 10 |
| Exercise Ball 65cm/75cm | EQUIP | PCS | 3 | 8 |
| Hand Grip Strengthener | EQUIP | PCS | 5 | 10 |
| Putty (therapy, various grades) | CONS | PCS | 5 | 15 |
| Parallel Bars (asset) | EQUIP | PCS | 2 | 4 |
| Traction Rope + Harness Set | CONS | SET | 3 | 8 |
| Pulley System (overhead) | EQUIP | PCS | 3 | 6 |

### 24.3 Orthosis & Mobility Aids

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Axillary Crutch (Adult pair) | EQUIP | PAIR | 5 | 15 |
| Axillary Crutch (Paeds pair) | EQUIP | PAIR | 3 | 8 |
| Forearm Crutch (Lofstrand) | EQUIP | PAIR | 3 | 8 |
| Walking Frame (Zimmer, standard) | EQUIP | PCS | 5 | 10 |
| Rollator Walker (4-wheel) | EQUIP | PCS | 3 | 8 |
| Walking Stick | EQUIP | PCS | 5 | 15 |
| Quad Stick | EQUIP | PCS | 3 | 8 |
| Wheelchair (standard) | EQUIP | PCS | 5 | 10 |
| Wheelchair (reclining) | EQUIP | PCS | 3 | 6 |
| Transfer Belt (Gait Belt) | CONS | PCS | 5 | 10 |
| Soft Cervical Collar (S/M/L) | CONS | PCS | 5 | 20 |
| Hard Collar (Philadelphia S/M/L) | CONS | PCS | 5 | 15 |
| TLSO (Thoracolumbar brace) | CONS | PCS | 3 | 8 |
| Lumbar Support Belt | CONS | PCS | 5 | 15 |
| Knee Immobilizer (S/M/L) | CONS | PCS | 5 | 15 |
| Hinged Knee Brace | CONS | PCS | 3 | 10 |
| Wrist Splint (Cock-up) | CONS | PCS | 5 | 15 |
| Thumb Spica Splint | CONS | PCS | 5 | 15 |
| Resting Hand Splint | CONS | PCS | 3 | 10 |
| Ankle Splint (AFO) | CONS | PCS | 3 | 10 |
| Heel Cup | CONS | PCS | 10 | 30 |
| Treatment Table Cover (disposable) | CONS | ROLL | 10 | 30 |
| Gym/Exercise Mat | EQUIP | PCS | 5 | 8 |
| Anti-embolic Stockings (S/M/L) | CONS | PAIR | 20 | 60 |
| Cold Gel Pack | CONS | PCS | 10 | 30 |
| Hot Pack (Hydrocollator pad) | CONS | PCS | 10 | 30 |
| Moist Heat Pack Cover | CONS | PCS | 10 | 30 |

---

## 25. Dermatology & Cosmetology

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Dermal Punch Biopsy 3mm/4mm/6mm | SURG | PCS | 10 | 30 |
| Shave Excision Blade | SURG | PCS | 10 | 30 |
| Cryotherapy Liquid Nitrogen Spray | CONS | PCS | 5 | 15 |
| Cryotherapy Cotton Swab | CONS | PKT | 10 | 30 |
| Trichloroacetic Acid (TCA) 30%/50% | CHEM | BTL | 3 | 10 |
| Salicylic Acid 20%/40% Ointment | MED | BTL | 5 | 15 |
| Phenol Solution 88% | CHEM | BTL | 3 | 8 |
| Lignocaine Cream (EMLA) | MED | BTL | 10 | 30 |
| Lignocaine 1% injection | MED | VIAL | 20 | 60 |
| Dermatoscopy Cover (disposable) | CONS | PCS | 20 | 60 |
| Skin Graft Knife (Humby's) | SURG | PCS | 3 | 8 |
| Skin Graft Mesher | EQUIP | PCS | 1 | 2 |
| Split Skin Graft Board | CONS | PCS | 5 | 10 |
| Silicone Gel Sheet | CONS | PCS | 10 | 30 |
| Betadine Ointment 5g | MED | PCS | 10 | 30 |
| Silver Sulphadiazine Cream 25g | MED | BTL | 10 | 30 |
| Mafenide Acetate Cream | MED | BTL | 5 | 15 |
| Mupirocin 2% Ointment | MED | BTL | 10 | 30 |
| KOH 10% for fungal wet mount | DIAG | BTL | 5 | 15 |
| Skin Scraping Kit | SURG | KIT | 10 | 20 |
| Wood's Lamp (UV lamp) | EQUIP | PCS | 1 | 2 |

---

## 26. Ophthalmology

### 26.1 Ophthalmic Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Tropicamide 1% Drops | MED | BTL | 10 | 30 |
| Phenylephrine 2.5% / 10% Drops | MED | BTL | 10 | 30 |
| Pilocarpine 2% Drops | MED | BTL | 5 | 15 |
| Timolol 0.5% Drops | MED | BTL | 5 | 20 |
| Brimonidine 0.2% Drops | MED | BTL | 5 | 15 |
| Dorzolamide 2% Drops | MED | BTL | 5 | 15 |
| Latanoprost 0.005% Drops | MED | BTL | 5 | 15 |
| Ciprofloxacin 0.3% Drops | MED | BTL | 10 | 30 |
| Moxifloxacin 0.5% Drops | MED | BTL | 10 | 30 |
| Chloramphenicol 0.5% Drops | MED | BTL | 5 | 20 |
| Tobramycin 0.3% Drops | MED | BTL | 5 | 15 |
| Prednisolone 1% Drops | MED | BTL | 10 | 30 |
| Dexamethasone 0.1% Drops | MED | BTL | 10 | 30 |
| Ketorolac 0.5% Drops | MED | BTL | 10 | 30 |
| Nepafenac 0.1% Drops | MED | BTL | 5 | 20 |
| Hypromellose 0.3% (Tear substitute) | MED | BTL | 10 | 30 |
| Sodium Hyaluronate Drops | MED | BTL | 5 | 20 |
| Cyclopentolate 1% Drops | MED | BTL | 5 | 15 |
| Acetazolamide 250mg tab (glaucoma) | MED | BOX | 5 | 15 |
| Mannitol 20% IV (acute angle closure) | MED | BAG | 5 | 20 |
| Ranibizumab (Lucentis) 2.3mg | MED | VIAL | 3 | 8 |
| Bevacizumab 1.25mg (off-label) | MED | VIAL | 3 | 8 |
| Aflibercept (Eylea) 2mg | MED | VIAL | 3 | 8 |
| Viscoelastic (Healon/ProVisc) | SURG | VIAL | 5 | 15 |
| Trypan Blue 0.1% (for CCC) | SURG | VIAL | 5 | 15 |
| Triamcinolone 4mg Intravitreal | MED | VIAL | 3 | 10 |

### 26.2 Ophthalmic Surgical & Consumable

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Intraocular Lens (IOL) — Monofocal | IMPL | PCS | 10 | 30 |
| IOL — Toric (astigmatism) | IMPL | PCS | 5 | 15 |
| IOL — Multifocal | IMPL | PCS | 5 | 10 |
| Phaco Handpiece (disposable tip) | CONS | PCS | 5 | 20 |
| Phaco Cassette | CONS | PCS | 10 | 30 |
| Phaco Sleeve | CONS | PCS | 10 | 30 |
| I/A Handpiece | CONS | PCS | 5 | 15 |
| Viscoelastic Cannula | CONS | PCS | 10 | 30 |
| BSS (Balanced Salt Solution) 500mL | MED | BTL | 10 | 30 |
| Ophthalmic Irrigating Solution 250mL | MED | BTL | 10 | 30 |
| Ophthalmic Drape (fenestrated) | SURG | PKT | 20 | 60 |
| Ophthalmic Sponges (Weck-Cel) | SURG | PKT | 10 | 30 |
| Eye Pad (sterile) | CONS | PCS | 30 | 100 |
| Eye Shield (perforated) | CONS | PCS | 20 | 60 |
| Cataract Knife 2.5mm/2.8mm | SURG | PCS | 5 | 15 |
| Paracentesis Blade 15° | SURG | PCS | 5 | 15 |
| Retrobulbar Needle | CONS | PCS | 10 | 30 |
| Ophthalmic Suture 10-0 Nylon | SURG | BOX | 3 | 10 |
| Ophthalmic Suture 8-0 Vicryl | SURG | BOX | 3 | 10 |
| Fluorescein Dye Strip | DIAG | PKT | 10 | 30 |
| Rose Bengal Strip | DIAG | PKT | 5 | 20 |
| Tonometer Tip Cover | CONS | BOX | 5 | 20 |
| Amsler Grid Chart | ADMIN | PCS | 5 | 10 |

---

## 27. ENT (Ear, Nose & Throat)

### 27.1 ENT Medications & Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Lignocaine 4% Topical Spray | MED | BTL | 10 | 30 |
| Lignocaine 10% Spray | MED | BTL | 5 | 15 |
| Otrivin (Xylometazoline) 0.1% Nasal | MED | BTL | 10 | 30 |
| Adrenaline 1:1000 (for nasal pack) | MED | AMP | 10 | 30 |
| Flucortin/Fluticasone Nasal Spray | MED | BTL | 10 | 30 |
| Antibiotic Ear Drops (Sofradex/Ciprofloxacin) | MED | BTL | 10 | 30 |
| Clotrimazole 1% Ear Drops | MED | BTL | 5 | 20 |
| Ototopic Anaesthetic Drop | MED | BTL | 5 | 15 |
| Sodium Bicarbonate 5% Ear Drops (wax) | MED | BTL | 5 | 20 |
| Anterior Nasal Pack (Merocel ribbon gauze) | CONS | PCS | 20 | 60 |
| Posterior Nasal Pack (Brighton balloon) | CONS | PCS | 5 | 20 |
| Epistat Nasal Tampon | CONS | PCS | 10 | 30 |
| Aural Syringe | EQUIP | PCS | 5 | 10 |
| Suction Tip (Baron/Frazier) | CONS | PCS | 10 | 30 |
| Suction Tubing (ENT fine) | CONS | PCS | 10 | 30 |
| Grommet (Ventilation Tube) | IMPL | PCS | 10 | 30 |
| ENT Drape Pack | SURG | PKT | 10 | 30 |
| Nasal Speculum (Vienna, disposable) | CONS | PCS | 20 | 60 |
| Nasopharyngoscope Sheath | CONS | PCS | 5 | 15 |
| Rigid Nasal Endoscope 0°/30°/70° | EQUIP | PCS | 2 | 4 |
| FESS Shaver Blade 4mm | CONS | PCS | 5 | 10 |
| FESS Shaver Blade (Microdebrider) | CONS | PCS | 3 | 8 |
| Myringotomy Knife | SURG | PCS | 5 | 15 |
| Ear Wick | CONS | PCS | 20 | 60 |
| Mastoid Dressing | CONS | PKT | 10 | 30 |
| Tracheostomy Kit (bedside percutaneous) | SURG | KIT | 3 | 8 |
| Laryngeal Mirror | EQUIP | PCS | 5 | 10 |
| Tongue Depressor (curved, St. Clair Thomson) | EQUIP | PCS | 5 | 10 |
| Microlaryngoscopy ETT 5mm | CONS | PCS | 3 | 10 |

---

## 28. Dental Department

### 28.1 Dental Medications

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Lignocaine 2% with Adrenaline 1:80000 (cartridge) | MED | BOX | 10 | 30 |
| Lignocaine 2% plain (cartridge) | MED | BOX | 5 | 20 |
| Mepivacaine 3% (cartridge) | MED | BOX | 5 | 15 |
| Topical Anaesthetic Gel (Benzocaine 20%) | MED | BTL | 5 | 20 |
| Eugenol (ZOE base) | MED | BTL | 5 | 15 |
| Zinc Oxide Powder | MED | BTL | 5 | 15 |
| Cavity Liner (Calcium Hydroxide paste) | MED | BTL | 5 | 15 |
| Chlorhexidine 0.2% Mouthwash | MED | BTL | 10 | 30 |
| Sodium Hypochlorite 2.5% (irrigant) | CHEM | BTL | 10 | 30 |
| EDTA Solution 17% (chelation) | CHEM | BTL | 5 | 20 |
| Formocresol | MED | BTL | 3 | 10 |
| Ferric Sulphate 20% | MED | BTL | 3 | 10 |
| Silver Diamine Fluoride (SDF 38%) | MED | BTL | 3 | 10 |
| Fluoride Gel (APF 1.23%) | MED | BTL | 5 | 15 |
| Fluoride Varnish | MED | PCS | 10 | 30 |
| Analgesic (Ibuprofen 400mg/Paracetamol) | MED | BOX | 5 | 20 |
| Amoxicillin 500mg tab (post extraction) | MED | BOX | 5 | 15 |
| Metronidazole 400mg tab | MED | BOX | 5 | 15 |

### 28.2 Dental Consumables & Materials

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Dental Needle (Short/Long) | CONS | BOX | 10 | 30 |
| Dental Cartridge Syringe | EQUIP | PCS | 5 | 10 |
| Dental Bur (RA/FG assorted) | CONS | PKT | 10 | 30 |
| Diamond Bur (tapered/round) | CONS | PKT | 10 | 30 |
| Orthodontic Bur (finishing) | CONS | PKT | 5 | 15 |
| Composite Resin (shade A2/A3/B2) | MED | VIAL | 5 | 15 |
| Dentine Bonding Agent | MED | BTL | 5 | 15 |
| Etch Gel (37% Phosphoric Acid) | MED | VIAL | 5 | 15 |
| GIC Powder+Liquid (Type II) | MED | KIT | 5 | 15 |
| Amalgam Capsule (Pre-mixed 2-spill) | MED | PKT | 5 | 15 |
| Zinc Phosphate Cement | MED | KIT | 5 | 10 |
| Resin Cement (Dual-cure) | MED | KIT | 3 | 10 |
| Impression Material (Alginate 1kg) | MED | PKT | 5 | 15 |
| Vinyl Polysiloxane (VPS) Heavy/Light | MED | CART | 3 | 8 |
| Gutta Percha Cone (ISO sizes) | CONS | PKT | 10 | 30 |
| Paper Point (ISO sizes) | CONS | PKT | 10 | 30 |
| K-File / H-File Assorted | CONS | PKT | 10 | 30 |
| Rotary NiTi File System | CONS | PKT | 5 | 15 |
| Suture 3-0 / 4-0 Vicryl (dental) | SURG | BOX | 5 | 15 |
| Dental Floss Roll | CONS | ROLL | 5 | 20 |
| Matrix Band (Tofflemire/Ivory) | CONS | PKT | 5 | 15 |
| Wedge (wooden/plastic) | CONS | PKT | 5 | 15 |
| Rubber Dam Kit | SURG | KIT | 5 | 10 |
| Dental X-Ray Film (periapical) | CONS | PKT | 10 | 30 |
| Dental X-Ray Film (bitewing) | CONS | PKT | 10 | 30 |
| Protective Lead Apron (dental) | PPE | PCS | 3 | 6 |
| Dental Bib (disposable) | CONS | PKT | 20 | 80 |
| Saliva Ejector | CONS | PKT | 10 | 40 |
| HVE Tip (High Volume Evacuator) | CONS | PKT | 10 | 30 |
| Prophy Cup/Brush | CONS | PKT | 10 | 30 |
| Prophy Paste | CONS | PKT | 5 | 20 |
| Dental Mirror/Explorer/Probe | EQUIP | PCS | 5 | 10 |
| Dental Forceps (Upper/Lower Universal) | EQUIP | PCS | 3 | 8 |
| Dental Elevators (Warwick/Couplands) | EQUIP | PCS | 3 | 8 |
| Suction Tip (dental) | CONS | PKT | 10 | 40 |
| Dental Gloves (non-powdered) | CONS | BOX | 20 | 80 |
| Dental Mask (procedure grade) | PPE | BOX | 20 | 80 |
| Sterilisation Pouch (dental) | CONS | BOX | 10 | 40 |
| Dental Implant (Titanium screw) | IMPL | PCS | 5 | 15 |
| Implant Cover Screw | IMPL | PCS | 5 | 15 |
| Bone Graft Material (synthetic) | IMPL | PCS | 3 | 10 |
| Collagen Membrane (guided bone regen) | IMPL | PCS | 3 | 10 |

---

## 29. Psychiatry & Mental Health

### 29.1 Psychiatric Medications

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Haloperidol 5mg/1mL IM | MED | AMP | 15 | 50 | Rapid tranquillisation |
| Haloperidol 5mg tab | MED | BOX | 5 | 20 | |
| Olanzapine 10mg IM | MED | VIAL | 10 | 30 | Acute agitation |
| Olanzapine 5mg/10mg tab | MED | BOX | 5 | 20 | |
| Risperidone 1mg/2mg/4mg tab | MED | BOX | 5 | 20 | |
| Aripiprazole 10mg/15mg tab | MED | BOX | 3 | 10 | |
| Quetiapine 25mg/100mg/200mg tab | MED | BOX | 5 | 15 | |
| Clozapine 25mg/100mg tab | MED | BOX | 3 | 10 | WBC monitoring required |
| Chlorpromazine 100mg tab | MED | BOX | 3 | 10 | |
| Trifluoperazine 5mg tab | MED | BOX | 3 | 10 | |
| Diazepam 10mg/2mL IV | MED | AMP | 15 | 50 | CD — acute agitation |
| Lorazepam 4mg/1mL IM | MED | AMP | 10 | 30 | CD — preferred IM |
| Midazolam 5mg/1mL | MED | AMP | 10 | 30 | CD |
| Biperiden 2mg tab | MED | BOX | 5 | 15 | EPS |
| Biperiden 5mg/1mL IM | MED | AMP | 5 | 20 | EPS — acute dystonia |
| Trihexyphenidyl 2mg tab | MED | BOX | 5 | 15 | EPS maintenance |
| Lithium Carbonate 300mg/400mg tab | MED | BOX | 5 | 15 | Bipolar; monitor levels |
| Valproate 200mg/500mg tab | MED | BOX | 5 | 15 | |
| Lamotrigine 25mg/100mg tab | MED | BOX | 3 | 10 | |
| Carbamazepine 200mg tab | MED | BOX | 3 | 10 | |
| Fluoxetine 10mg/20mg cap | MED | BOX | 5 | 15 | |
| Sertraline 50mg/100mg tab | MED | BOX | 5 | 15 | |
| Escitalopram 10mg/20mg tab | MED | BOX | 5 | 15 | |
| Venlafaxine 75mg/150mg cap | MED | BOX | 3 | 10 | |
| Mirtazapine 15mg/30mg tab | MED | BOX | 3 | 10 | |
| Amitriptyline 25mg/75mg tab | MED | BOX | 3 | 10 | |
| Clomipramine 10mg/25mg tab | MED | BOX | 3 | 10 | OCD |
| Buspirone 5mg/10mg tab | MED | BOX | 3 | 10 | |
| Naltrexone 50mg tab | MED | BOX | 3 | 10 | Alcohol/opioid dependence |
| Disulfiram 500mg tab | MED | BOX | 3 | 10 | Alcohol dependence |
| Bupropion 150mg/300mg tab | MED | BOX | 3 | 10 | Smoking cessation |
| Varenicline 1mg tab | MED | BOX | 3 | 10 | |
| Thiamine 100mg IV/tab | MED | AMP | 10 | 30 | Alcohol withdrawal |
| Chlordiazepoxide 10mg tab | MED | BOX | 5 | 15 | CD — alcohol withdrawal |

### 29.2 ECT (Electroconvulsive Therapy) Consumables

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| ECT Electrode Gel | CONS | BTL | 5 | 15 |
| ECT Electrodes (disposable) | CONS | PAIR | 10 | 30 |
| Bite Block (rubber/plastic) | CONS | PCS | 10 | 30 |
| BVM (ECT room) | EQUIP | PCS | 1 | 2 |
| Suxamethonium 100mg (for MECT) | MED | VIAL | 5 | 20 |
| Propofol 200mg/20mL | MED | VIAL | 5 | 20 |
| Glycopyrrolate 0.2mg | MED | AMP | 5 | 15 |
| Atropine 0.6mg | MED | AMP | 5 | 15 |
| SpO2 Probe | CONS | PCS | 5 | 15 |
| IV Cannula 20G | CONS | BOX | 3 | 10 |

---

## 30. Mortuary & Post-Mortem

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Body Bag (Adult 180cm) | CONS | PCS | 10 | 30 |
| Body Bag (Bariatric 250cm) | CONS | PCS | 3 | 10 |
| Body Bag (Paediatric) | CONS | PCS | 5 | 15 |
| Body Bag (Neonatal) | CONS | PCS | 5 | 15 |
| Body Tag (Plastic waterproof) | ADMIN | PCS | 50 | 200 |
| Body Tag String | ADMIN | PKT | 10 | 30 |
| Mortuary Trolley Sheet | LINEN | PCS | 10 | 30 |
| Identification Wristband | ADMIN | ROLL | 5 | 15 |
| Formaldehyde 40% (Formalin) | CHEM | LTR | 10 | 30 |
| Phenol | CHEM | LTR | 5 | 20 |
| Sodium Carbonate 10% | CHEM | BTL | 5 | 15 |
| Post-Mortem Fluid (Embalming) | CHEM | BTL | 5 | 15 |
| Absorbent Cotton Sawdust | CONS | KG | 10 | 30 |
| Heavy Duty Mortuary Gloves | PPE | PAIR | 10 | 40 |
| Apron (heavy rubber) | PPE | PCS | 5 | 10 |
| Full Face Shield | PPE | PCS | 5 | 10 |
| Coverall (Tyvek type) | PPE | PCS | 10 | 30 |
| Gumboots / Overshoes | PPE | PAIR | 5 | 10 |
| Post-Mortem Dissection Kit | SURG | KIT | 3 | 6 |
| Post-Mortem Suture (Nylon 0, curved) | SURG | ROLL | 3 | 10 |
| Histopathology Specimen Jar (formalin) | CONS | PCS | 20 | 60 |
| Organ Container | CONS | PCS | 10 | 30 |
| Death Certificate Pad | ADMIN | PKT | 5 | 20 |
| Cause of Death Certificate | ADMIN | PKT | 5 | 20 |
| Register of Deaths (bound) | ADMIN | PCS | 2 | 5 |
| Disinfectant Spray 1L (mortuary-grade) | CHEM | BTL | 10 | 30 |
| UV Decontamination Light | EQUIP | PCS | 1 | 2 |

---

## 31. Housekeeping & Biomedical Waste Management

### 31.1 Cleaning & Disinfection Supplies

| Item | Category | UOM | Reorder | Max | Application |
|------|----------|-----|---------|-----|-------------|
| Sodium Hypochlorite 1% Solution | HOUSE | LTR | 200 | 600 | Floor/surface disinfection |
| Sodium Hypochlorite 5% (bleach concentrate) | HOUSE | LTR | 50 | 200 | Preparation of 1% |
| Quaternary Ammonium Compound (Quaternary) | HOUSE | LTR | 50 | 200 | Surface disinfection |
| Hydrogen Peroxide 6% Spray | HOUSE | LTR | 20 | 80 | Terminal cleaning |
| Portable H2O2 Fumigation Solution | HOUSE | LTR | 10 | 30 | Isolation room decontamination |
| Hospital-Grade Floor Cleaner (pH neutral) | HOUSE | LTR | 100 | 400 | |
| Heavy-Duty Descaler/Acid Cleaner | HOUSE | LTR | 20 | 80 | Toilet, drain, scale |
| Glass / Surface Spray Cleaner | HOUSE | LTR | 20 | 80 | |
| Liquid Hand Soap 5L (non-antimicrobial) | HOUSE | BTL | 30 | 120 | General handwashing |
| Antimicrobial Hand Soap (chlorhexidine) | CONS | BTL | 20 | 80 | Clinical handwashing |
| Alcohol Hand Rub 500mL (70% IPA) | CONS | BTL | 150 | 500 | Hand hygiene stations |
| Alcohol Hand Rub 100mL (pocket) | CONS | BTL | 100 | 400 | Mobile/bedside |
| Foaming Hand Sanitiser 1L | CONS | BTL | 30 | 100 | Dispensers |
| Microfiber Mop Head (flat) | HOUSE | PCS | 30 | 100 | Colour-coded per zone |
| Microfiber Mop Head (tube/looped) | HOUSE | PCS | 20 | 80 | |
| Mop Handle (telescopic) | HOUSE | PCS | 15 | 40 | |
| Mop Bucket with Wringer 15L | EQUIP | PCS | 5 | 15 | |
| Microfiber Cloth (colour-coded: Red/Green/Blue/Yellow) | HOUSE | PCS | 60 | 200 | Red = toilet, Green = clinical, Blue = general |
| Scrub Brush (floor) | HOUSE | PCS | 10 | 30 | |
| Hand Scrub Brush (nail brush) | HOUSE | PCS | 20 | 60 | |
| Squeegee | HOUSE | PCS | 10 | 30 | |
| Broom & Dustpan Set | HOUSE | SET | 10 | 30 | |
| Lobby Duster (dry) | HOUSE | PCS | 10 | 30 | |
| Air Freshener (automatic sensor) | HOUSE | PCS | 20 | 60 | |
| Air Freshener Refill | HOUSE | PCS | 30 | 100 | |
| Toilet Paper Roll (2-ply) | HOUSE | PKT | 100 | 400 | |
| Paper Towel (Z-fold) | HOUSE | PKT | 100 | 400 | Hand drying |
| Tissues (pocket/box) | HOUSE | PKT | 30 | 120 | |
| Toilet Brush | HOUSE | PCS | 20 | 60 | |
| WC Block (rim hanger) | HOUSE | PCS | 20 | 80 | |
| Spill Kit (blood/body fluid) | CONS | KIT | 20 | 60 | Per spill station |
| Spill Kit (chemical) | CONS | KIT | 10 | 30 | Lab/pharmacy |
| Heavy Duty Rubber Gloves | PPE | PAIR | 50 | 200 | Cleaning |
| Boots/Overshoes (housekeeping) | PPE | PAIR | 20 | 60 | |
| Protective Apron (plastic) | PPE | PKT | 20 | 80 | |
| Duster/Lint-free Cloth | HOUSE | PCS | 20 | 60 | |

### 31.2 Biomedical Waste Segregation (BMW Rules 2016 — India)

| Waste Category | Colour | Bag/Container Type | Items | Reorder | Max |
|---------------|--------|-------------------|-------|---------|-----|
| Category 1 — Human Anatomical | Yellow | Bag (Yellow) | Body parts, organ specimens | 50 | 200 |
| Category 2 — Animal Anatomical | Yellow | Bag (Yellow) | From animal house | 10 | 40 |
| Category 3 — Microbiology Lab | Yellow | Bag (Yellow) | Culture plates, specimens | 30 | 120 |
| Category 4 — Sharps/Waste | Translucent | Puncture-proof container | Needles, blades, glass | 50 | 200 |
| Category 5 — Discarded/Outdated Drugs | Black | Bag (Black) | Expired medications | 20 | 80 |
| Category 6 — Cytotoxic/Chemo Waste | Black | Bag (Black, Purple) | Chemo drugs, contaminated items | 20 | 80 |
| Category 7 — Chemical Waste | Red/Black | Labelled Container | Disinfectant waste, mercury | 10 | 30 |
| Category 8 — Soiled Linen | Red | Bag (Red) | Contaminated linen | 50 | 200 |
| Category 9 — General | Black | Bag (Black) | Non-hazardous waste | 100 | 400 |

| Waste Container/Bag | Category | UOM | Reorder | Max |
|---------------------|----------|-----|---------|-----|
| Yellow Bag 15L | CONS | PKT | 50 | 200 |
| Yellow Bag 30L | CONS | PKT | 30 | 120 |
| Red Bag 15L | CONS | PKT | 50 | 200 |
| Red Bag 30L | CONS | PKT | 20 | 80 |
| Black Bag 30L | CONS | PKT | 80 | 300 |
| Black Bag 60L | CONS | PKT | 50 | 200 |
| Blue/White Bag (recyclable) | CONS | PKT | 30 | 100 |
| Sharps Container 1L | CONS | PCS | 30 | 100 |
| Sharps Container 5L | CONS | PCS | 50 | 200 |
| Sharps Container 11L | CONS | PCS | 20 | 60 |
| Puncture-proof Container (for blades) | CONS | PCS | 20 | 60 |
| Pharmaceutical Waste Box (Cardboard) | CONS | PCS | 20 | 80 |
| Cytotoxic Waste Bin (purple) | CONS | PCS | 10 | 30 |
| Pathological Waste Container (sealed) | CONS | PCS | 10 | 30 |
| BMW Bag Tie (zip/twist) | CONS | PKT | 50 | 200 |
| BMW Route Chart (laminated) | ADMIN | PCS | 5 | 10 |
| BMW Manifest Form | ADMIN | PKT | 10 | 30 |

---

## 32. Laundry & Linen

### 32.1 Linen Inventory (Par Stock per 100 beds)

| Item | Category | UOM | Par Stock | Notes |
|------|----------|-----|-----------|-------|
| Bedsheet (plain white 160x260cm) | LINEN | PCS | 400 | 4x occupancy |
| Fitted Sheet (hospital mattress) | LINEN | PCS | 300 | |
| Pillow Cover | LINEN | PCS | 400 | |
| Blanket (light cotton) | LINEN | PCS | 200 | |
| Blanket (heavy woollen) | LINEN | PCS | 100 | |
| Mattress Protector (waterproof) | LINEN | PCS | 200 | |
| Draw Sheet (Mackintosh) | LINEN | PCS | 200 | |
| Patient Gown (full back open) | LINEN | PCS | 300 | |
| Patient Shorts | LINEN | PCS | 200 | |
| Theatre Gown (OT patient) | LINEN | PCS | 150 | |
| OT Cap (staff reusable) | LINEN | PCS | 100 | |
| OT Scrub Suit (S/M/L/XL) | LINEN | PCS | 200 | |
| Staff Uniforms | LINEN | PCS | As per headcount | |
| Hand Towel | LINEN | PCS | 300 | |
| Bath Towel | LINEN | PCS | 200 | |
| ICU Cubicle Curtain | LINEN | PCS | 50 | |
| Cubicle Curtain (ward) | LINEN | PCS | 150 | |
| Surgical Drape (reusable, green 90x90) | LINEN | PCS | 200 | CSSD processed |
| Surgical Towel (reusable) | LINEN | PCS | 300 | |
| Reusable Mask (cloth) | LINEN | PCS | 100 | |
| Physiotherapy Gown | LINEN | PCS | 50 | |

### 32.2 Laundry Operations Supplies

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Institutional Detergent Powder 25kg | HOUSE | PKT | 20 | 60 |
| Liquid Detergent 20L | HOUSE | BTL | 10 | 30 |
| Fabric Softener 10L | HOUSE | BTL | 5 | 20 |
| Chlorine Bleach (3%–5%) 20L | HOUSE | BTL | 10 | 30 |
| Stain Remover (enzyme-based) 5L | HOUSE | BTL | 5 | 20 |
| Sour (Neutraliser) 5L | HOUSE | BTL | 5 | 15 |
| Laundry Sour + Softener Combo | HOUSE | BTL | 5 | 15 |
| Laundry Bag Red (infectious linen) | CONS | PKT | 20 | 80 |
| Laundry Bag White (clean linen) | CONS | PKT | 20 | 80 |
| Laundry Bag Net (for delicates) | CONS | PCS | 10 | 30 |
| Linen Count Sheet (pad) | ADMIN | PKT | 10 | 30 |
| Linen Trolley (large canvas) | EQUIP | PCS | 5 | 10 |
| Linen Pressing Board (padded) | EQUIP | PCS | 3 | 6 |

---

## 33. Biomedical Engineering

### 33.1 Spare Parts & Components

| Item | Category | UOM | Reorder | Max | Notes |
|------|----------|-----|---------|-----|-------|
| Infusion Pump Battery (various models) | BIO | PCS | 20 | 60 | Replace every 2 years |
| Infusion Pump Drive Mechanism | BIO | PCS | 5 | 15 | |
| Syringe Pump Motor | BIO | PCS | 5 | 10 | |
| Syringe Pump Clamp Assembly | BIO | PCS | 5 | 10 | |
| ECG Lead Set (3-lead) | BIO | PCS | 10 | 30 | |
| ECG Lead Set (5-lead) | BIO | PCS | 10 | 30 | |
| ECG Lead Set (10-electrode 12-lead) | BIO | SET | 5 | 15 | |
| SpO2 Reusable Sensor (Adult) | BIO | PCS | 10 | 30 | |
| SpO2 Reusable Sensor (Paeds) | BIO | PCS | 5 | 15 | |
| SpO2 Reusable Sensor (Neonatal) | BIO | PCS | 5 | 15 | |
| SpO2 Probe Extension Cable | BIO | PCS | 10 | 20 | |
| NIBP Cuff Adult (reusable) | BIO | PCS | 10 | 30 | |
| NIBP Cuff Paeds/Neonatal (reusable) | BIO | PCS | 5 | 20 | |
| NIBP Tubing Assembly | BIO | PCS | 5 | 20 | |
| Temperature Probe (oral) | BIO | PCS | 10 | 30 | |
| Temperature Probe (rectal/oesophageal) | BIO | PCS | 5 | 15 | |
| Ventilator Exhalation Valve Assembly | BIO | PCS | 5 | 15 | |
| Ventilator Flow Sensor | BIO | PCS | 5 | 15 | |
| Ventilator O-ring Seal Kit | BIO | KIT | 5 | 15 | |
| Ventilator Exhalation Diaphragm | BIO | PCS | 3 | 10 | |
| CPAP/BiPAP Blower Assembly | BIO | PCS | 3 | 8 | |
| Autoclave Door Gasket (Si rubber) | BIO | PCS | 3 | 8 | |
| Autoclave Temperature Sensor | BIO | PCS | 3 | 8 | |
| Autoclave Safety Valve | BIO | PCS | 3 | 6 | |
| Defibrillator Battery Pack | BIO | PCS | 5 | 10 | |
| Defibrillator Capacitor | BIO | PCS | 3 | 8 | |
| AED Battery | BIO | PCS | 5 | 10 | |
| Monitor Display Screen | BIO | PCS | 3 | 6 | |
| Monitor Screen Protector Film | BIO | PCS | 10 | 30 | |
| Pulse Oximeter PCB | BIO | PCS | 3 | 8 | |
| Ultrasound Probe Cable | BIO | PCS | 3 | 6 | |
| Ultrasound Transducer Gel Pad | BIO | PCS | 5 | 10 | |
| Portable X-Ray Battery | BIO | PCS | 3 | 8 | |
| Suction Machine Filter | BIO | PCS | 10 | 30 | |
| Suction Regulator | BIO | PCS | 5 | 15 | |
| Medical Gas Outlet (O2/Air/N2O) | BIO | PCS | 5 | 15 | |
| O2 Flowmeter (0–15 L/min) | BIO | PCS | 10 | 20 | |
| O2 Humidifier Bottle | BIO | PCS | 10 | 30 | |
| Calibration Gas Mixture Cylinder | BIO | CYL | 3 | 6 | For ABG, gas analyzers |
| Leak Test Pump (sphygmo) | BIO | PCS | 5 | 10 | |
| IEC 60601 Safety Tester Probe | BIO | PCS | 3 | 6 | |
| Electrical Safety Analyser | EQUIP | PCS | 1 | 2 | Asset |
| Ground Tester | EQUIP | PCS | 2 | 4 | |
| Oscilloscope (bench, for repair) | EQUIP | PCS | 1 | 2 | |
| Soldering Iron + Station | EQUIP | PCS | 2 | 4 | |
| Multimeter (biomedical grade) | EQUIP | PCS | 3 | 6 | |

### 33.2 Preventive Maintenance Supplies

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Medical Equipment Oil (white mineral) | CONS | BTL | 5 | 15 |
| Electronic Contact Cleaner Spray | CONS | BTL | 5 | 15 |
| Conformal Coating Spray | CONS | BTL | 3 | 10 |
| Cable Ties (assorted sizes) | CONS | PKT | 10 | 30 |
| Electrical Tape | CONS | ROLL | 10 | 30 |
| Heat Shrink Tube Set | CONS | KIT | 5 | 10 |
| Screw Assortment Set | CONS | SET | 5 | 10 |
| Fuse Assortment Set | CONS | SET | 5 | 10 |
| Label Maker Tape | CONS | ROLL | 5 | 15 |
| Equipment Log Book | ADMIN | PCS | 20 | 50 |
| PPM Checklist Forms | ADMIN | PKT | 10 | 30 |

---

## 34. Administration, Medical Records & IT

### 34.1 Clinical Documentation

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| OPD Case Sheet | ADMIN | PKT | 20 | 80 |
| IP Admission Form | ADMIN | PKT | 20 | 80 |
| History & Physical Exam Sheet | ADMIN | PKT | 20 | 80 |
| Nursing Assessment Form | ADMIN | PKT | 20 | 80 |
| Medication Administration Record (MAR) | ADMIN | PKT | 20 | 80 |
| Fluid Balance Chart | ADMIN | PKT | 20 | 80 |
| Vital Signs Chart | ADMIN | PKT | 30 | 100 |
| Nursing Progress Notes | ADMIN | PKT | 20 | 80 |
| Doctor Progress Notes | ADMIN | PKT | 20 | 80 |
| Surgical Consent Form | ADMIN | PKT | 20 | 80 |
| Anaesthesia Consent Form | ADMIN | PKT | 20 | 80 |
| Procedure Consent Form | ADMIN | PKT | 20 | 80 |
| Discharge Summary Form | ADMIN | PKT | 20 | 80 |
| Referral Letter Pad | ADMIN | PKT | 10 | 30 |
| Investigation Request Form (Lab) | ADMIN | PKT | 20 | 80 |
| Investigation Request Form (Radiology) | ADMIN | PKT | 10 | 40 |
| Blood Transfusion Request Form | ADMIN | PKT | 10 | 30 |
| Do-Not-Resuscitate (DNR) Form | ADMIN | PKT | 5 | 20 |
| Incident Report Form | ADMIN | PKT | 10 | 30 |
| Mortuary Release Form | ADMIN | PKT | 5 | 20 |
| Prescription Pad (doctor) | ADMIN | PKT | 20 | 80 |

### 34.2 Identification & Labels

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Patient Wristband (Printable, White) | ADMIN | ROLL | 15 | 50 |
| Patient Wristband (Red — Allergy Alert) | ADMIN | ROLL | 10 | 30 |
| Patient Wristband (Yellow — Fall Risk) | ADMIN | ROLL | 10 | 30 |
| Patient Wristband (Pink — DNR) | ADMIN | ROLL | 5 | 20 |
| Patient Wristband (Blue — Paeds) | ADMIN | ROLL | 5 | 20 |
| Barcode Label (patient sticky) | ADMIN | ROLL | 20 | 80 |
| Specimen Label (preprinted / blank) | ADMIN | ROLL | 20 | 60 |
| Drug Allergy Alert Sticker | ADMIN | ROLL | 5 | 20 |
| High Alert Medication Label (RED) | ADMIN | ROLL | 5 | 20 |
| Look-Alike Sound-Alike Label | ADMIN | ROLL | 5 | 15 |
| Cytotoxic Hazard Label | ADMIN | ROLL | 5 | 15 |
| Blood Product Label | ADMIN | ROLL | 10 | 30 |
| Refrigeration Required Label | ADMIN | ROLL | 5 | 15 |
| Biohazard Label | ADMIN | ROLL | 5 | 20 |

### 34.3 Stationery & Office

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| A4 Paper 80GSM (500 sheets) | ADMIN | REAM | 100 | 400 |
| A5 Paper 80GSM | ADMIN | REAM | 20 | 80 |
| A3 Paper (for reports/charts) | ADMIN | REAM | 10 | 30 |
| Ballpoint Pen Blue | ADMIN | BOX | 20 | 80 |
| Ballpoint Pen Black | ADMIN | BOX | 20 | 80 |
| Ballpoint Pen Red | ADMIN | BOX | 10 | 40 |
| Permanent Marker Black/Red | ADMIN | BOX | 10 | 40 |
| Highlighter (yellow/green) | ADMIN | BOX | 5 | 20 |
| Pencil HB | ADMIN | BOX | 5 | 20 |
| Eraser | ADMIN | PKT | 5 | 20 |
| Sharpener | ADMIN | PCS | 5 | 15 |
| Stapler (standard) | ADMIN | PCS | 10 | 20 |
| Staples 26/6 (1000/box) | ADMIN | BOX | 10 | 30 |
| Staple Remover | ADMIN | PCS | 10 | 20 |
| Scissors (office) | ADMIN | PCS | 10 | 20 |
| Paper Clips (box of 100) | ADMIN | BOX | 5 | 20 |
| Rubber Bands (100g) | ADMIN | PKT | 5 | 20 |
| Binder Clips (25mm/32mm) | ADMIN | BOX | 5 | 20 |
| Punching Machine (2-hole) | ADMIN | PCS | 5 | 10 |
| Filing Folder (L-type clear) | ADMIN | PKT | 20 | 80 |
| Case File (Manila) | ADMIN | PKT | 20 | 80 |
| Archive Box | ADMIN | PCS | 20 | 80 |
| Stamp Pad (blue/red/black) | ADMIN | PCS | 10 | 20 |
| Rubber Stamp (doctor/dept) | ADMIN | PCS | 10 | 20 |
| Envelope (A4/A5/C5/DL) | ADMIN | PKT | 10 | 30 |
| Correction Fluid (White-out) | ADMIN | PCS | 5 | 20 |
| Adhesive Tape (Scotch/cello) | ADMIN | ROLL | 10 | 30 |
| Double-sided Tape | ADMIN | ROLL | 5 | 15 |
| Sticky Notes (75x75mm) | ADMIN | PKT | 10 | 30 |
| Calendar (desk/wall) | ADMIN | PCS | 10 | 20 |

### 34.4 Printing & IT Peripherals

| Item | Category | UOM | Reorder | Max |
|------|----------|-----|---------|-----|
| Laser Printer Toner (Monochrome) | ADMIN | PCS | 10 | 30 |
| Laser Printer Toner (Colour C/M/Y/K) | ADMIN | PCS | 5 | 15 |
| Inkjet Cartridge (Black) | ADMIN | PCS | 5 | 15 |
| Inkjet Cartridge (Colour) | ADMIN | PCS | 5 | 15 |
| Thermal Printer Roll 80mm | ADMIN | ROLL | 20 | 80 |
| Thermal Printer Roll 57mm | ADMIN | ROLL | 10 | 40 |
| Barcode Printer Ribbon (Black/Wax) | ADMIN | ROLL | 10 | 30 |
| Barcode Label Stock 50x25mm | ADMIN | ROLL | 20 | 60 |
| Barcode Label Stock 100x50mm | ADMIN | ROLL | 10 | 30 |
| Wristband Label Roll (82x25mm) | ADMIN | ROLL | 15 | 50 |
| Printer Drum Cartridge | ADMIN | PCS | 3 | 8 |
| Mouse (USB/Wireless) | ADMIN | PCS | 10 | 20 |
| Keyboard (USB/Wireless) | ADMIN | PCS | 10 | 20 |
| USB Flash Drive 16GB/32GB | ADMIN | PCS | 10 | 20 |
| Ethernet Patch Cable 1m | ADMIN | PCS | 20 | 60 |
| Ethernet Patch Cable 3m | ADMIN | PCS | 10 | 30 |
| Network Cable Cat6 (per metre bulk) | ADMIN | MTR | 100 | 300 |
| Power Strip (6-outlet, surge) | ADMIN | PCS | 10 | 20 |
| UPS Battery Replacement | ADMIN | PCS | 5 | 10 |
| Screen Cleaning Wipe | ADMIN | PKT | 10 | 30 |
| Compressed Air Can (keyboard cleaning) | ADMIN | PCS | 5 | 15 |

---

## 35. Inventory Classification Matrix

### 35.1 ABC Analysis (by Annual Consumption Value)

| Class | % of Total Items | % of Annual Value | Management Strategy |
|-------|-----------------|-------------------|---------------------|
| A | 10% | 70–80% | Weekly physical count, tight reorder control, dual sourcing, low safety stock, manager approval for purchase |
| B | 20% | 15–25% | Monthly count, moderate safety stock, standard procurement |
| C | 70% | 5–10% | Quarterly count, bulk ordering, high safety stock, blanket PO acceptable |

**Typical A-class hospital items:** Contrast agents, volatile anaesthetics (sevoflurane/desflurane), cardiac drugs (tPA, bivalirudin), ICU sedation (propofol, dexmedetomidine), monoclonal antibodies, imported implants, special blood products  
**Typical B-class:** IV antibiotics, surgical sutures, enteral nutrition, standard implants, ECG leads  
**Typical C-class:** Cotton rolls, stationery, wound tape, housekeeping consumables, routine forms

### 35.2 VED Analysis (by Criticality)

| Class | Meaning | Consequence of Stockout | Buffer Policy |
|-------|---------|------------------------|---------------|
| V — Vital | Patient life depends on it | Mortality, irreversible harm | 2–4 week buffer; dual supplier; emergency PO process |
| E — Essential | Significant clinical impact | Delay, substitution possible | 1–2 week buffer; approved substitution list |
| D — Desirable | Quality/convenience benefit | Inconvenience only | Order as needed; bulk purchasing acceptable |

**Vital examples:** Adrenaline, O2, blood products, defibrillator pads, ETT, vasopressors, insulin, antivenoms, crash cart drugs, MH treatment (dantrolene), surfactant  
**Essential examples:** Most IV antibiotics, IV fluids, sterile gloves, sutures, anaesthetic agents, ECG electrodes  
**Desirable examples:** Stationery, dietary supplements (oral), physiotherapy accessories, comfort items

### 35.3 HML Analysis (by Unit Cost)

| Class | Unit Cost Threshold | Example |
|-------|--------------------|---------| 
| H — High | >₹5,000 per unit | Implants, DES stents, phaco cassettes, biologics, CRRT circuits |
| M — Medium | ₹500–₹5,000 | IV sets, ECG electrodes, diagnostic kits, moderate-cost drugs |
| L — Low | <₹500 | Cotton, gauze, syringes, basic consumables, stationery |

### 35.4 SDE Analysis (by Supplier Availability)

| Class | Availability | Action |
|-------|-------------|--------|
| S — Scarce | Imported; long lead time (>30 days) | Maintain 6–8 weeks stock; import schedule |
| D — Difficult | Regional; lead time 7–14 days | 2–4 week stock |
| E — Easily Available | Local; 24–48h delivery | 1 week stock sufficient |

### 35.5 FNSD Analysis (Usage Rate)

| Class | Usage | Criterion |
|-------|-------|-----------|
| F — Fast Moving | Used daily/weekly | Review monthly; auto-reorder |
| N — Normal Moving | Used monthly | Review quarterly |
| S — Slow Moving | <12x/year | Review annually; controlled stock |
| D — Dead Stock | Not used in 12 months | Evaluate for disposal; write-off protocol |

---

## 36. Reorder & Stock Level Formulas

### 36.1 Core Formulas

```
Average Daily Consumption (ADC) = Total Consumption in Period / Days in Period

Lead Time Demand (LTD) = ADC × Lead Time (days)

Safety Stock (SS) = (Maximum Daily Consumption − ADC) × Lead Time
  → For Vital items: SS = 2 × LTD

Reorder Level (ROL) = LTD + SS

Maximum Stock Level = ROL + Economic Order Quantity (EOQ)

Minimum Stock Level = ROL − (ADC × Average Lead Time)

Economic Order Quantity (EOQ) = √(2 × Annual Demand × Ordering Cost / Holding Cost per Unit)

Days of Stock = Current Quantity / ADC

Consumption Rate Variance = (Actual Consumption − Planned Consumption) / Planned × 100%

Turn-over Ratio = Annual Consumption / Average Stock
```

### 36.2 Lead Time Reference by Supplier Type

| Supplier Type | Normal Lead Time | Emergency Lead Time | Buffer Days |
|--------------|-----------------|--------------------|-----------| 
| Local distributor (city) | 4–24 hours | 2–4 hours | 3 days |
| Regional distributor | 1–3 days | Same day possible | 7 days |
| National supplier | 5–10 days | 3–5 days | 14 days |
| Import (via freight) | 30–45 days | 15–20 days (air) | 30–45 days |
| Import (specialty, cold chain) | 45–60 days | 30 days | 45–60 days |
| Blood bank (internal) | Immediate (crossmatch) | — | Per component shelf life |

### 36.3 Department-wise Buffer Stock Guide

| Department / Area | Buffer Days | Rationale |
|-------------------|-------------|-----------|
| Emergency / Resuscitation | 14 days | Unpredictable surges, no substitution acceptable |
| ICU (MICU/SICU/CICU) | 14 days | High turnover, critical items |
| NICU / PICU | 14 days | Rare specialised items, weight-based dosing |
| OT Complex | 10 days | Elective + emergency; implant lead time |
| General Wards (Medical/Surgical) | 7 days | Moderate predictability |
| OBG Ward | 10 days | Unpredictable delivery events |
| Dialysis Unit | 7 days | Session-based; predictable per census |
| Pharmacy (dispensing) | 10 days | Patient variability; high SKU count |
| Blood Bank | Per component shelf life + 3 days | Short shelf (platelets = 5 days; PRBC = 42 days) |
| Laboratory | 10 days | Reagent stability; kit size vs. daily use |
| Radiology | 7 days | Contrast shelf life manageable |
| CSSD | 7 days | Continuous daily demand |
| Oncology / Chemo | 10 days | Cycles scheduled; some imported agents |
| Dietary | 7 days | Perishables + supplements |
| Housekeeping | 21 days | Bulk items; non-critical |
| Administration / IT | 30 days | Very low criticality; bulk purchasing |

---

## 37. Regulatory Compliance & Storage Requirements

### 37.1 Drug Storage Regulations (India)

| Requirement | Guideline | Action |
|-------------|-----------|--------|
| Schedule H / H1 Drugs | Drugs & Cosmetics Act | Doctor prescription mandatory; pharmacy records |
| Schedule X (Narcotic/Psychotropic) | NDPS Act 1985 | Double-lock iron cabinet; narcotic register (Form 6); pharmacist + doctor sign-off |
| Cold Chain Vaccines | WHO EPI Standards | Validated 2–8°C fridge; twice-daily temp log; cold chain monitor IQ/OQ/PQ |
| FIFO/FEFO Rotation | Hospital policy + GMP | Expiry date check monthly; first-expiry items at front |
| High Alert Medications | ISMP / NABH Standard | Separate shelf; RED label; double-check protocol; no storage on ward except ICU |
| Cytotoxic Drug Handling | Pharmacy (India) Guidelines | Vertical laminar airflow; PPE; waste segregation; spill protocol |
| Drug Expiry Management | Monthly audit mandatory | Expired drugs quarantined; returned to supplier or disposed per BMW Rules |

### 37.2 Biomedical Waste Rules (BMW 2016 — India)

| Category | Colour Coding | Treatment | Disposal |
|----------|--------------|-----------|---------|
| Yellow (Anatomical, Microbio, Soiled Waste) | Yellow | Incineration / Deep burial | CBMWTF or on-site |
| Red (Recyclable contaminated plastics) | Red | Autoclave/Microwaving then recycle | Authorised recycler |
| White Translucent (Sharps) | White | Autoclave + shred OR chemical treatment | CBMWTF |
| Blue (Glassware, broken) | Blue | Disinfection + breaking | Authorised recycler |
| Black (General solid waste) | Black | Compaction / Landfill | Municipal |

### 37.3 Equipment Maintenance Standards

| Equipment Type | Calibration Frequency | Standard | Certificate |
|---------------|----------------------|----------|-------------|
| Infusion / Syringe Pumps | Annually | IEC 60601-2-24 | OEM/Biomedical |
| Ventilators | 6-monthly | IEC 60601-2-12 | OEM |
| Defibrillators / AEDs | Quarterly (function) + Annual (full service) | IEC 60601-2-4 | OEM |
| Monitors (ECG/SpO2/NIBP) | Annually | IEC 60601 | Biomedical |
| Autoclaves (CSSD) | Daily BD test + Monthly BI + Annual validation | EN 285 / IS 7916 | NABL lab |
| Weighing balances (Pharmacy) | 6-monthly | ISO OIML | Accredited lab |
| Refrigerators (Pharmacy/BB) | Daily min/max log; Annual qualification | WHO PQS | In-house + OEM |
| Ultrasound Equipment | Annually | IEC 60601-2-37 | OEM |
| X-Ray / CT / MRI | Quality Control tests per AERB guidelines | AERB | AERB Inspector |
| Lab Analyzers | QC daily + Calibration per reagent lot + Annual | ISO 15189 | NABL |
| Glucometers (ward) | QC daily (Level 1/2) | ISO 15197 | Lab |

### 37.4 NABH Accreditation — Inventory-Related Standards

| Standard | Requirement |
|----------|-------------|
| MOM.1 | Drug formulary maintained; reviewed annually |
| MOM.2 | Emergency medications available 24/7; crash cart checks documented |
| MOM.3 | Drug storage requirements met (temp, security, segregation) |
| MOM.4 | Controlled substance register maintained |
| MOM.5 | Expired drug management protocol |
| MOM.6 | High-alert medication policy implemented |
| MOM.7 | Drug reconciliation at admission/discharge |
| FMS.1 | Preventive maintenance schedule for all medical equipment |
| FMS.2 | Recall protocol for medical devices |
| ICM.1 | Biomedical waste segregation and documentation |
| PRE.1 | Purchase process documented; vendor qualification |

---

## 38. System Implementation Roadmap

### 38.1 Current HMS Inventory Capabilities

Based on the Ayphen HMS Inventory module (`/backend/src/modules/inventory/`):

| Feature | Status |
|---------|--------|
| Item master (code, name, category, UOM, reorder, max stock, unit cost, supplier) | ✅ Available |
| Stock-in (GRN recording) | ✅ Available |
| Stock-out (issue recording) | ✅ Available |
| Adjustment (write-off, count correction) | ✅ Available |
| Low-stock alert list | ✅ Available |
| Item search & filter | ✅ Available |
| Basic reports | ✅ Available |

### 38.2 Recommended Enhancements (Priority Order)

| Priority | Feature | Business Justification |
|----------|---------|----------------------|
| P1 — Critical | **Batch & Lot Tracking with Expiry Dates** | Mandatory for medications, blood, reagents; FIFO/FEFO enforcement |
| P1 — Critical | **Multi-location (Ward/Department) Stock** | Track where items are physically held; prevent phantom stock |
| P1 — Critical | **Goods Receipt Note (GRN) Workflow** | Verify delivery against PO; catch short shipments and substitutions |
| P1 — Critical | **Barcode / QR Code Integration** | Bedside scanning; pharmacy dispensing verification; stock-take accuracy |
| P2 — High | **Auto Purchase Order Generation** | When stock hits ROL; reduce manual follow-up |
| P2 — High | **Inter-department Transfer Tracking** | From central store → ward; prevents loss |
| P2 — High | **Wastage & Write-off Module** | Expired, damaged, spillage; regulatory compliance |
| P2 — High | **Supplier Management with Lead Times** | Multiple suppliers per item; lead time variance tracking |
| P3 — Medium | **ABC / VED / HML Classification Tags** | Enable analytics-driven procurement |
| P3 — Medium | **Consumption Analytics Dashboard** | Trend analysis; seasonal demand prediction |
| P3 — Medium | **Cold Chain Temperature Monitoring Integration** | Pharmacy fridge, blood bank; alert on excursion |
| P3 — Medium | **Kitting / Bill of Materials (BOM)** | IV start kit, dressing pack = pre-defined item bundles |
| P4 — Low | **RFID Asset Tracking** | High-value equipment (pumps, ventilators, monitors) |
| P4 — Low | **Integration with Pharmacy Dispensing** | Auto stock-out on medication administration |
| P4 — Low | **Integration with EMR/Lab/OT Orders** | Demand-driven forecasting from clinical systems |
| P4 — Low | **Vendor Portal** | Online PO acknowledgement; e-invoice; shipment tracking |

### 38.3 Data Migration Checklist (When seeding new hospital)

```
□ Upload Master Item List with correct UOM and category codes
□ Set reorder levels per department (use this document as reference)
□ Set max stock levels per department
□ Enter supplier details + lead times for each item
□ Configure ABC/VED classification for all items
□ Set up location (department) hierarchy
□ Load opening stock balances with batch numbers and expiry dates
□ Configure alert thresholds (email / SMS / in-app)
□ Define approval matrix for purchase orders (by value)
□ Set controlled substance flag for Schedule X / H1 items
□ Set High-Alert Medication flag for ISMP list
□ Configure cold chain items (flag requires refrigeration)
```

### 38.4 Suggested Category Codes for Ayphen HMS System

```
MED     — Medicines & Drugs
SURG    — Surgical Supplies  
CONS    — Consumables & Disposables
DIAG    — Diagnostics & Reagents
EQUIP   — Equipment & Tracked Assets
LINEN   — Linen & Textiles
HOUSE   — Housekeeping Supplies
DIET    — Dietary & Nutrition
ADMIN   — Administrative Supplies
BIO     — Biomedical Spare Parts
BLOOD   — Blood & Blood Products
PPE     — Personal Protective Equipment
IMPL    — Implants & Prosthetics
CHEM    — Chemicals & Lab Reagents
```

### 38.5 Suggested UOM Master for Ayphen HMS

```
PCS     — Pieces
BOX     — Box (specify qty per box in description)
PKT     — Packet
VIAL    — Vial
AMP     — Ampoule
TAB     — Tablets (per strip or bottle)
CAP     — Capsules
BTL     — Bottle
BAG     — Bag / Pouch
ROLL    — Roll
LTR     — Litre
KG      — Kilogram
MTR     — Metre
SET     — Set
KIT     — Kit
PAIR    — Pair
UNIT    — Unit (blood product, reagent)
REAM    — Ream (500 sheets paper)
CYL     — Cylinder (gas)
CART    — Cartridge
SACHET  — Sachet
STRIP   — Strip / Blister Pack
```

---

*This is a comprehensive living reference document. Reorder levels should be validated against actual 3-month rolling consumption data and adjusted quarterly. Items marked with (!) are HIGH-ALERT and require special dispensing protocols.*

**Document Authority:** Hospital Pharmacist + Store Manager + Medical Superintendent  
**Review Cycle:** Quarterly  
**Version Control:** Update version number when adding new departments or items  
**Next Review:** 2026-08-06  
**Total Departments Covered:** 30  
**Total Line Items (estimated):** 1,200+
