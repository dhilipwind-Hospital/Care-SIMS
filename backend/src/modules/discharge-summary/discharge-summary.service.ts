import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class DischargeSummaryService {
  private readonly logger = new Logger(DischargeSummaryService.name);
  constructor(private prisma: PrismaService, private ai: AiService) {}

  async list(tenantId: string, filters: { locationId?: string; status?: string; patientId?: string }) {
    const where: any = { tenantId };
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    return this.prisma.dischargeSummary.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, userId: string, dto: any) {
    const existing = await this.prisma.dischargeSummary.findUnique({
      where: { tenantId_admissionId: { tenantId, admissionId: dto.admissionId } },
    });
    if (existing) throw new BadRequestException('Discharge summary already exists for this admission');
    return this.prisma.dischargeSummary.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        admissionId: dto.admissionId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        admissionDate: new Date(dto.admissionDate),
        dischargeDate: dto.dischargeDate ? new Date(dto.dischargeDate) : null,
        diagnosisOnAdmission: dto.diagnosisOnAdmission,
        diagnosisOnDischarge: dto.diagnosisOnDischarge,
        proceduresPerformed: dto.proceduresPerformed,
        treatmentGiven: dto.treatmentGiven,
        investigationSummary: dto.investigationSummary,
        conditionAtDischarge: dto.conditionAtDischarge,
        dischargeMedications: dto.dischargeMedications,
        followUpInstructions: dto.followUpInstructions,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        dietaryAdvice: dto.dietaryAdvice,
        activityRestrictions: dto.activityRestrictions,
        status: 'DRAFT',
        preparedById: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const rec = await this.prisma.dischargeSummary.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Discharge summary not found');
    if (rec.status === 'APPROVED') throw new BadRequestException('Cannot edit approved discharge summary');
    const { id: _, tenantId: __, ...data } = dto;
    if (data.dischargeDate) data.dischargeDate = new Date(data.dischargeDate);
    if (data.followUpDate) data.followUpDate = new Date(data.followUpDate);
    return this.prisma.dischargeSummary.update({ where: { id }, data });
  }

  async approve(tenantId: string, id: string, userId: string) {
    const rec = await this.prisma.dischargeSummary.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Discharge summary not found');
    return this.prisma.dischargeSummary.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async getByAdmission(tenantId: string, admissionId: string) {
    return this.prisma.dischargeSummary.findUnique({
      where: { tenantId_admissionId: { tenantId, admissionId } },
    });
  }

  async getOne(tenantId: string, id: string) {
    const rec = await this.prisma.dischargeSummary.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Discharge summary not found');
    return rec;
  }

  // Gather admission + clinical context and ask Gemini to draft a
  // structured discharge summary. Returns the fields ready to drop into the
  // existing form; the doctor reviews/edits/saves via the normal create
  // endpoint. No row is written by this method.
  async draftWithAi(tenantId: string, admissionId: string, userId: string) {
    const admission = await this.prisma.admission.findFirst({
      where: { id: admissionId, tenantId },
      include: {
        patient: { select: { firstName: true, lastName: true, gender: true, dateOfBirth: true, allergies: true, ageYears: true } },
      },
    });
    if (!admission) throw new NotFoundException('Admission not found');

    // Pull the clinical context that happened during the admission window.
    const since = admission.admissionDate;
    const until = admission.dischargeDate || new Date();
    const [consultations, prescriptions, labOrders] = await Promise.all([
      this.prisma.consultation.findMany({
        where: { tenantId, patientId: admission.patientId, startedAt: { gte: since, lte: until } },
        orderBy: { startedAt: 'asc' },
        select: { chiefComplaint: true, assessment: true, plan: true, startedAt: true, completedAt: true,
                  diagnoses: { select: { description: true, icdCode: true, type: true } } },
      }),
      this.prisma.prescription.findMany({
        where: { tenantId, patientId: admission.patientId, issuedAt: { gte: since, lte: until } },
        orderBy: { issuedAt: 'asc' },
        select: { rxNumber: true, status: true, notes: true,
                  items: { select: { drugName: true, strength: true, dosage: true, frequency: true, durationDays: true, route: true } } },
      }),
      this.prisma.labOrder.findMany({
        where: { tenantId, patientId: admission.patientId, orderedAt: { gte: since, lte: until } },
        orderBy: { orderedAt: 'asc' },
        select: { orderNumber: true, items: { select: { testName: true } },
                  results: { select: { items: true, status: true } } },
      }),
    ]);

    const patient = admission.patient as any;
    const patientLine = `${patient?.firstName || ''} ${patient?.lastName || ''}, ${patient?.gender || ''}${patient?.ageYears ? `, ${patient.ageYears}y` : ''}`.trim();
    const allergies = Array.isArray(patient?.allergies) && patient.allergies.length ? patient.allergies.join(', ') : 'None known';

    const consultLines = consultations.map((c) => {
      const diag = (c.diagnoses || []).map((d) => `${d.icdCode || ''} ${d.description}`.trim()).join('; ');
      return `- ${c.startedAt?.toISOString().slice(0, 10)}: CC=${c.chiefComplaint || '—'}; Diagnoses=${diag || '—'}; Assessment=${c.assessment || '—'}; Plan=${c.plan || '—'}`;
    }).join('\n') || '(no consultations recorded — use admission diagnosis and standard care plan)';

    const rxLines = prescriptions.flatMap((rx) =>
      (rx.items || []).map((it) => `- ${it.drugName}${it.strength ? ` ${it.strength}` : ''}: ${it.dosage || ''} ${it.frequency || ''}${it.durationDays ? ` x ${it.durationDays}d` : ''}${it.route ? ` ${it.route}` : ''}`),
    ).join('\n') || '(no prescriptions recorded during stay)';

    const labLines = labOrders.map((lo) => {
      const tests = (lo.items || []).map((i) => i.testName).join(', ');
      return `- Order ${lo.orderNumber}: ${tests}`;
    }).join('\n') || '(no lab orders recorded during stay)';

    const systemInstruction = `You are a senior physician drafting a hospital discharge summary in clinical English used in India. Produce ONLY valid JSON matching this exact shape:
{
  "diagnosisOnAdmission": string,
  "diagnosisOnDischarge": string,
  "treatmentGiven": string,
  "investigationSummary": string,
  "conditionAtDischarge": string,                  // one of: STABLE, IMPROVED, UNCHANGED, WORSENED, DAMA, EXPIRED
  "followUpInstructions": string,
  "dietaryAdvice": string,
  "activityRestrictions": string,
  "dischargeMedications": [{ "drug": string, "dosage": string, "frequency": string, "duration": string }]
}

Rules:
- If the admission record provides a working diagnosis, USE IT to populate diagnosisOnAdmission verbatim. Do NOT write "To be reviewed" for that field when a diagnosis exists.
- If the admission record provides a discharge diagnosis, use it for diagnosisOnDischarge; otherwise infer it from the admission diagnosis (often the same condition, resolved) and prefix with "(Suggested) ".
- For treatmentGiven / investigationSummary / dischargeMedications: ONLY use what's actually recorded in CONSULTATIONS / PRESCRIPTIONS / LAB ORDERS during the stay. If empty, write "Per admission record — verify with treating doctor before finalising." rather than the bare "To be reviewed" placeholder.
- For followUpInstructions / dietaryAdvice / activityRestrictions: when no consult plan exists, draft a SAFE, GENERIC starting template based on the admission diagnosis (e.g. for gastroenteritis: "Oral rehydration as needed, soft bland diet, avoid spicy/oily food, return if vomiting or blood in stool"). Add a leading "(Draft) " prefix to mark it as a starting point.
- conditionAtDischarge: prefer "STABLE" if a discharge date is set and no worsening is recorded, else "To be reviewed".
- Do NOT invent test results, drug names, or specific dosages not present in the data.
- The doctor will edit and approve before this is finalised.`;

    const prompt = `PATIENT: ${patientLine}
ALLERGIES: ${allergies}

ADMISSION RECORD (authoritative — use these fields directly):
- Admission number: ${admission.admissionNumber}
- Admission type: ${admission.admissionType || 'unspecified'}
- Admission date: ${admission.admissionDate.toISOString().slice(0, 10)}
- Discharge date: ${admission.dischargeDate ? admission.dischargeDate.toISOString().slice(0, 10) : '(not yet discharged)'}
- Discharge type: ${admission.dischargeType || '(not specified)'}
- Diagnosis on admission: ${admission.diagnosisOnAdmission || '(not recorded)'}
- Discharge diagnosis: ${admission.dischargeDiagnosis || '(not recorded)'}
- Package: ${admission.packageName || '(none)'}

CONSULTATIONS DURING STAY:
${consultLines}

PRESCRIPTIONS DURING STAY:
${rxLines}

LAB ORDERS:
${labLines}

Return the JSON only.`;

    const result = await this.ai.complete({
      tenantId,
      feature: 'DISCHARGE_SUMMARY',
      userId,
      patientId: admission.patientId,
      referenceType: 'ADMISSION',
      referenceId: admission.id,
      systemInstruction,
      prompt,
      maxOutputTokens: 2048,
    });

    // Strip ```json ... ``` fences; also fall back to scanning for the
    // first {...} block in case Gemini wraps the JSON in prose.
    let text = result.text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    if (!text.startsWith('{')) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) text = m[0];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.logger.warn(`AI returned non-JSON for discharge draft ${admissionId}; returning raw text`);
      return {
        draft: null,
        rawText: result.text,
        model: result.model,
        durationMs: result.durationMs,
        warning: 'AI response was not valid JSON; please review the raw text and fill the form manually.',
      };
    }

    return {
      draft: {
        admissionId: admission.id,
        patientId: admission.patientId,
        doctorId: admission.admittingDoctorId,
        admissionDate: admission.admissionDate,
        dischargeDate: admission.dischargeDate,
        ...parsed,
      },
      model: result.model,
      durationMs: result.durationMs,
    };
  }
}
