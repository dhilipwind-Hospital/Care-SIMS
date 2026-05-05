# Ayphen HMS — Business Flow Charts
### May 2026

---

## 1. Platform Onboarding Flow

```mermaid
flowchart TD
    A([Ayphen Platform]) --> B[Platform Admin Login]
    B --> C[Create Organisation / Hospital]
    C --> D[Toggle Feature Modules ON/OFF]
    D --> E[Assign Subscription Plan]
    E --> F[Org Admin Account Created]
    F --> G[Org Admin configures\nDepartments · Locations · Roles]
    G --> H[Create Staff User Accounts]
    H --> I[Assign System Roles\nDoctor · Nurse · Pharmacist · Lab · Billing…]
    I --> J([Hospital Ready for Operations])
```

---

## 2. OPD Patient Journey

```mermaid
flowchart TD
    A([Patient Arrives]) --> B[Receptionist Registers Patient\nUHID Auto-Generated]
    B --> C[Book Appointment\nDoctor + Date + Slot]
    C --> D[Token Issued\nQueue Dashboard]
    D --> E[Doctor Calls Token]
    E --> F[Consultation\nSOAP Notes · Diagnosis · ICD Code]
    F --> G{Investigations\nRequired?}
    G -- Yes --> H[Lab Order / Radiology Order]
    H --> I[Sample Collected → Processed]
    I --> J[Results Entered\nCritical Values Flagged]
    J --> F
    G -- No --> K[Prescription Issued]
    K --> L[Pharmacist Dispenses\nBarcode Scan Verification]
    L --> M[Invoice Auto-Generated\nLine Items: Consult + Tests + Drugs]
    M --> N{Payment Mode}
    N -- Cash/Card/UPI --> O[Payment Recorded → Receipt]
    N -- Insurance/TPA --> P[Pre-Auth Sent → Claim Processed]
    P --> O
    O --> Q{Outcome}
    Q -- Discharge --> R([Patient Exits])
    Q -- Admit --> S([IPD Admission Flow])
    Q -- Refer --> T([Referral Flow])
```

---

## 3. IPD Admission & Inpatient Flow

```mermaid
flowchart TD
    A([Admission Order\nfrom Doctor / Emergency]) --> B[Bed Allocated\nVisual Bed Map]
    B --> C[Triage Assessment\nVitals · Category]
    C --> D[Nursing Care Loop]

    subgraph DAILY [Daily Inpatient Cycle]
        D --> E[Vitals Recorded\nEvery Shift]
        E --> F[Doctor Ward Round\nSOAP Notes · Treatment Changes]
        F --> G[MAR — Medication\nAdministration Logged]
        G --> H{Additional Care?}
        H -- Lab/Radiology --> I[Results → Doctor Review]
        H -- ICU Transfer --> J[ICU Monitoring\nAPACHE II · SOFA · Ventilator]
        H -- OT Needed --> K([OT Flow])
        H -- Wound Care --> L[Wound Assessment\nStage · Dimensions · Dressing]
        H -- Diet --> M[Diet Plan Assigned]
        I --> D
        J --> D
        L --> D
        M --> D
    end

    D --> N{Ready for Discharge?}
    N -- No --> D
    N -- Yes --> O[Discharge Summary Written\nDiagnosis · Treatment · Follow-up]
    O --> P[Consent Forms Signed]
    P --> Q[Final Invoice\nBed Charges + All Services]
    Q --> R[Payment Settled]
    R --> S{Post-Discharge Plan}
    S -- Follow-up Apt --> T[Appointment Booked]
    S -- Home Care --> U[Home Care Referral]
    S -- Palliative --> V[Palliative Care Referral]
    T --> W([Patient Discharged])
    U --> W
    V --> W
```

---

## 4. Emergency Department Flow

```mermaid
flowchart TD
    A([Patient Arrives\nWalk-in / Ambulance]) --> B[Quick Registration\nat Emergency Desk]
    B --> C[Triage Assessment]
    C --> D{Triage Colour}
    D -- 🔴 Red\nImmediate --> E[Resuscitation Bay]
    D -- 🟡 Yellow\nUrgent --> F[Treatment Room]
    D -- 🟢 Green\nMinor --> G[Wait Area]
    D -- ⚫ Black\nExpectant --> H[Comfort Care]
    E --> I[Emergency Doctor Assessment\nChief Complaint · Vitals · Investigations]
    F --> I
    G --> I
    I --> J{Is it MLC?}
    J -- Yes --> K[MLC Register\nAuto MLC Number\nPolice Station · FIR · Injury Nature]
    J -- No --> L[Treatment Given]
    K --> L
    L --> M{Disposition}
    M -- ADMIT --> N([IPD Admission Flow])
    M -- DISCHARGE --> O[ED Prescription + Billing → Exit]
    M -- TRANSFER --> P[Referral to Another Hospital]
```

---

## 5. Operation Theatre Flow

```mermaid
flowchart TD
    A([Doctor Books OT Slot\nProcedure · Surgeon · Theatre · Date]) --> B[Pre-Op Assessment\nAnaesthetist · ASA Grade · Fitness]
    B --> C[Consent Forms Signed\nSurgery · Anaesthesia · Blood]
    C --> D[CSSD — Instrument Request\nSterilisation Batch Created]
    D --> E[BI / CI Indicator Checked\nPASS / FAIL]
    E --> F{Indicators Pass?}
    F -- No --> D
    F -- Yes --> G[Instruments Issued to OT]
    G --> H[Pre-Op Checklist Completed\nNPO · Allergy · Site Mark · IV Access]
    H --> I[Surgery Starts\nIncision Time Logged]
    I --> J[Anaesthesia Record\nVitals Every 5 Min · Drugs Logged]
    J --> K[Procedure Steps Recorded\nBlood Units · Specimens · Implants]
    K --> L[Surgery Ends\nClosure Time Logged]
    L --> M[Recovery Room\nPost-Op Vitals · Handover to Ward]
    M --> N[CSSD Instruments Returned]
    N --> O[OT Charges Billed\nAnaesthesia + Consumables + Theatre Time]
    O --> P([Joins IPD Billing Flow])
```

---

## 6. Pharmacy Flow

```mermaid
flowchart TD
    A([Prescription from Doctor]) --> B[Pharmacist Views Prescription\nDrug · Dose · Duration]
    B --> C{Stock Available?}
    C -- No --> D[Raise Purchase Order\nto Vendor]
    D --> E[Receive PO\nStock Updated]
    E --> C
    C -- Yes --> F[Barcode Scan\nVerify Drug + Patient]
    F --> G[Dispense Drugs\nBatch + Expiry Checked]
    G --> H[Stock Auto-Decremented]
    H --> I{Full Dispense?}
    I -- Partial --> J[Return Processed\nStock Re-added]
    I -- Full --> K[Pharmacy Billing Entry]
    K --> L([Added to Patient Invoice])
    J --> K

    M([Background Process]) --> N{Stock Below\nReorder Level?}
    N -- Yes --> D
    N -- No --> O[Expiry Alerts\nSlow-Moving Reports]
```

---

## 7. Laboratory Flow

```mermaid
flowchart TD
    A([Lab Order from Doctor]) --> B[Sample Collection\nBarcode-Labelled Tube]
    B --> C[Lab Technician\nProcesses Sample]
    C --> D[Result Entry\nValue + Reference Range]
    D --> E{Critical Value?}
    E -- Yes --> F[Critical Flag Raised\nDoctor Notified]
    E -- No --> G[Result Available\nDoctor + Patient Portal]
    F --> G
    G --> H[QC Entry Logged\nMachine · Pass/Fail]
    H --> I{Part of Package?}
    I -- Yes --> J[Package Billing Auto-Applied]
    I -- No --> K[Test Fee Added to Invoice]
    J --> L([Result on Patient Timeline])
    K --> L
```

---

## 8. Billing & Insurance Flow

```mermaid
flowchart TD
    A([Services Rendered\nConsult · Tests · Drugs · Bed · OT]) --> B[Invoice Auto-Created\nItemised Line Items]
    B --> C[Billing Staff Reviews\nAdd / Edit Line Items]
    C --> D[Invoice Finalised]
    D --> E{Payment Mode}
    E -- Cash / Card / UPI --> F[Payment Recorded\nAmount · Method · Date]
    E -- Insurance / TPA --> G[Policy Verified\nPre-Auth Sent to TPA]
    G --> H{Pre-Auth Approved?}
    H -- Yes --> I[Cashless Claim Processed]
    H -- No --> J[Patient Pays &\nReimbursement Filed]
    I --> K[TPA Settles Amount]
    J --> K
    F --> L[Receipt Generated]
    K --> L
    L --> M([Invoice Closed\nZero Balance])
```

---

## 9. Staff Lifecycle Flow

```mermaid
flowchart TD
    A([New Staff Member]) --> B[Org Admin Creates User Account\nName · Email · Role]
    B --> C[Role & Permissions Assigned\nModule-level Read / Write / Delete]
    C --> D[Staff Logs In]
    D --> E[Daily Attendance\nClock-In]
    E --> F{Shift Type}
    F -- Morning --> G[Morning Shift Work]
    F -- Evening --> H[Evening Shift Work]
    F -- Night --> I[Night Shift Work]
    G --> J[Shift Handover Notes\nWritten at End of Shift]
    H --> J
    I --> J
    J --> K[Clock-Out]
    K --> L[Attendance Record Saved]
    L --> M[Month End → Payroll Processing\nBasic + DA + HRA + Allowances + OT]
    M --> N[Deductions Calculated\nPF + ESI + TDS]
    N --> O[Net Pay Computed]
    O --> P[Manager Approves Payroll]
    P --> Q[Mark as Paid]
    Q --> R([Payslip Generated])

    S([Leave Request]) --> T[Staff Submits Leave\nType · Dates · Reason]
    T --> U[Manager Approves / Rejects]
    U --> V[Roster Updated]
```

---

## 10. Patient Portal Flow

```mermaid
flowchart TD
    A([Patient Visits Website]) --> B{Has Account?}
    B -- No --> C[Self Registration\nor Given by Hospital]
    C --> D[Login with Credentials]
    B -- Yes --> D
    D --> E[Patient Dashboard]
    E --> F{What does Patient Want?}
    F -- Appointment --> G[Browse Available Slots\nSelect Doctor + Date + Time]
    G --> H[Appointment Booked\nConfirmation Shown]
    F -- Lab Reports --> I[View Results\nDownload PDF]
    F -- Prescriptions --> J[View Active Prescriptions\nDrug · Dose · Duration]
    F -- Bills --> K[View Invoice History\nAmount · Status · Payment Date]
    F -- Vitals --> L[Vitals History Graph\nBP · Pulse · Weight Over Time]
    F -- Medical Records --> M[View Past Consultations\nDiagnosis · Notes · Discharge Summary]
    H --> E
    I --> E
    J --> E
    K --> E
    L --> E
    M --> E
```

---

## 11. Quality & Compliance Flow

```mermaid
flowchart TD
    A([Incident Occurs]) --> B[Staff Logs Incident\nCategory · Severity · Description]
    B --> C[Quality Officer Reviews]
    C --> D[Root Cause Analysis]
    D --> E[Corrective Action Plan\nAction · Responsible · Due Date]
    E --> F[Action Implemented]
    F --> G{Resolved?}
    G -- No --> D
    G -- Yes --> H[Incident Closed]
    H --> I[Quality Indicator Updated\nDepartment KPI Dashboard]

    J([Infection Detected]) --> K[Infection Control Record\nOrganism · Isolation Type · Ward]
    K --> L{Outbreak?}
    L -- Yes --> M[Outbreak Alert\nAffected Patients Listed]
    M --> N[Containment Actions\nContact / Droplet / Airborne Precautions]
    L -- No --> O[HAI Surveillance Log]
    N --> O

    P([Antibiotic Prescribed]) --> Q[Antimicrobial Stewardship Review\nAntibiotic · Duration · Indication]
    Q --> R{Appropriate Use?}
    R -- Yes --> S[Approved]
    R -- No --> T[De-escalation Recommended]
```

---

## 12. End-to-End Master Flow (Summary)

```mermaid
flowchart LR
    PA([Platform Admin]) --> ORG[Create Hospital Org\nSet Modules + Subscription]
    ORG --> ADMIN[Org Admin\nSetup Users · Roles · Depts]
    ADMIN --> RECEP[Receptionist\nRegister · Appointments · Billing]
    RECEP --> QUEUE[Queue\nToken Management]
    QUEUE --> DOC[Doctor\nConsultation · Prescription · Orders]
    DOC --> LAB[Lab\nSample → Result]
    DOC --> RAD[Radiology\nOrder → Report]
    DOC --> PHARMA[Pharmacy\nDispense → Stock Update]
    DOC --> ADMIT{Admit?}
    ADMIT -- Yes --> NURSE[Nurse\nTriage · Vitals · MAR · Wards]
    NURSE --> ICU[ICU / OT / NICU\nSpecialty Care]
    ICU --> DISCHARGE[Discharge Summary\nConsent · Final Bill]
    DISCHARGE --> PORTAL[Patient Portal\nRecords · Appointments · Bills]
    ADMIT -- No --> BILLING[Billing\nInvoice · Payment · Insurance]
    LAB --> BILLING
    PHARMA --> BILLING
    BILLING --> PORTAL
    ADMIN --> REPORTS[Reports · Audit · Payroll\nDuty Roster · Staff Attendance]
```
