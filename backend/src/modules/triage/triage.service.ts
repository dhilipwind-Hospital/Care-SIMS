import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { AiService } from '../ai/ai.service';
import { sendEmail } from '../../common/utils/mailer';
import { startOfDayUtc, nextQueueTokenNumber, findLiveToken } from '../../common/utils/queue-token';

// Same shell as admissions/discharge-summary — kept inline to avoid a shared
// dependency.
function emailTemplate(title: string, body: string, orgName?: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">${orgName || 'Ayphen HMS'}</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from ${orgName || 'Ayphen HMS'}. Do not reply.
  </p>
</div>`;
}

@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);
  constructor(private prisma: PrismaService, private ws: WsGateway, private ai: AiService) {}

  async list(tenantId: string, query: any) {
    const where: any = { tenantId };
    if (query.triageLevel) where.triageLevel = query.triageLevel;
    if (query.patientId) where.patientId = query.patientId;
    if (query.dateFrom || query.dateTo) {
      where.triageTime = {};
      if (query.dateFrom) where.triageTime.gte = new Date(query.dateFrom);
      if (query.dateTo) where.triageTime.lte = new Date(query.dateTo);
    }
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, parseInt(query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.triageRecord.findMany({
        where,
        orderBy: { triageTime: 'desc' },
        skip,
        take: limit,
        include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true } } },
      }),
      this.prisma.triageRecord.count({ where }),
    ]);
    // Flatten vitalsOnArrival back into top-level fields so the lookup panels
    // and print card can keep reading r.systolicBp / r.heartRate / etc.
    const flat = data.map(r => ({ ...r, ...((r.vitalsOnArrival as any) || {}) }));
    return { data: flat, meta: { total, page, limit } };
  }

  /**
   * Patients waiting to be triaged: today's live queue tokens with no
   * TriageRecord pointing at them.
   *
   * Before this existed the triage station was blind — the nurse had to already
   * know who had walked in and type their name into a search box, because
   * nothing upstream ever marked a patient as waiting.
   *
   * Deliberately derived rather than stored: "pending" is the absence of a
   * triage record, so there is no extra status column to keep in sync (and no
   * migration). TriageRecord.queueTokenId already links the two.
   */
  async pending(tenantId: string, locationId?: string, date?: string) {
    const queueDate = startOfDayUtc(date);
    const where: any = { tenantId, queueDate, status: { in: ['WAITING', 'CALLED'] } };
    if (locationId) where.locationId = locationId;

    const tokens = await this.prisma.queueToken.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true, patientId: true, firstName: true, lastName: true,
            gender: true, ageYears: true, dateOfBirth: true, mobile: true, allergies: true,
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { tokenNumber: 'asc' }],
      take: 200,
    });
    if (!tokens.length) return { data: [], meta: { total: 0 } };

    // One query for the whole page rather than a lookup per token.
    const triaged = await this.prisma.triageRecord.findMany({
      where: { tenantId, queueTokenId: { in: tokens.map(t => t.id) } },
      select: { queueTokenId: true },
    });
    const done = new Set(triaged.map(t => t.queueTokenId));
    const pending = tokens.filter(t => !done.has(t.id));

    // Doctor names: doctorId is a bare string that may point at a TenantUser or
    // a DoctorRegistry row, with no relation either way.
    const doctorIds = [...new Set(pending.map(t => t.doctorId).filter(Boolean))] as string[];
    const [users, registry] = await Promise.all([
      doctorIds.length ? this.prisma.tenantUser.findMany({ where: { id: { in: doctorIds }, tenantId }, select: { id: true, firstName: true, lastName: true } }) : [],
      doctorIds.length ? this.prisma.doctorRegistry.findMany({ where: { id: { in: doctorIds } }, select: { id: true, firstName: true, lastName: true } }) : [],
    ]);
    const docMap = new Map<string, any>([...registry, ...users].map(d => [d.id, d] as [string, any]));

    const now = Date.now();
    const data = pending.map(t => ({
      ...t,
      doctor: t.doctorId ? docMap.get(t.doctorId) || null : null,
      waitMins: t.checkInTime ? Math.max(0, Math.round((now - new Date(t.checkInTime).getTime()) / 60000)) : null,
    }));
    return { data, meta: { total: data.length } };
  }

  async create(tenantId: string, dto: any, triagedById: string) {
    // Auto-resolve locationId from user's primary location if not provided
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: triagedById }, select: { primaryLocationId: true } });
      locationId = user?.primaryLocationId;
    }

    // Frontend sends vitals as flat top-level fields. Pack them into the JSON
    // column the schema expects, so nothing gets dropped silently.
    const vitalsOnArrival = dto.vitalsOnArrival ?? {
      systolicBp: dto.systolicBp,
      diastolicBp: dto.diastolicBp,
      heartRate: dto.heartRate,
      temperatureC: dto.temperatureC,
      spo2: dto.spo2,
      respiratoryRate: dto.respiratoryRate,
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
    };

    // Frontend collects briefHistory / knownAllergies / currentMedications /
    // nurseNotes in separate fields but the schema only has `notes`. Stitch
    // them into a single labelled blob so nothing is lost.
    const notesParts: string[] = [];
    if (dto.briefHistory) notesParts.push(`History: ${dto.briefHistory}`);
    if (dto.knownAllergies) notesParts.push(`Allergies: ${dto.knownAllergies}`);
    if (dto.currentMedications) notesParts.push(`Current meds: ${dto.currentMedications}`);
    if (dto.nurseNotes) notesParts.push(`Nurse notes: ${dto.nurseNotes}`);
    if (dto.notes) notesParts.push(dto.notes);
    const notes = notesParts.length ? notesParts.join('\n') : undefined;

    // Map triage acuity to queue priority so callNext picks the sickest patient first.
    const priority =
      dto.triageLevel === 'RED'    ? 'EMERGENCY' :
      dto.triageLevel === 'ORANGE' ? 'EMERGENCY' :
      dto.triageLevel === 'YELLOW' ? 'URGENT'    :
      'NORMAL';

    const result = await this.prisma.$transaction(async (tx) => {
      // Resolve a queue token for the doctor's "Call Next" to find:
      //   1. If the nurse triaged off an existing token, use that.
      //   2. Else if the patient already has a live token today at this location, reuse it.
      //   3. Else mint a fresh one.
      let queueTokenId: string | undefined;
      let queueTokenChanged = false;
      const today = startOfDayUtc();

      // Which token does this triage belong to?
      //   1. The one the nurse picked off the worklist (dto.queueTokenId), or
      //   2. the patient's live token for today, or
      //   3. none yet — mint one.
      //
      // Case 1 must be looked up and UPDATED like case 2, not just accepted.
      // It previously short-circuited the whole block, so triaging from the
      // worklist silently applied neither the assigned doctor nor the triage
      // priority — the patient never reached the doctor's queue even though
      // the toast said "assigned to Dr. X".
      // Scoped by tenantId so a token id from another tenant can't be adopted.
      let token: any = null;
      if (dto.queueTokenId) {
        token = await tx.queueToken.findFirst({ where: { id: dto.queueTokenId, tenantId } });
      }
      if (!token && locationId) {
        token = await findLiveToken(tx, { tenantId, locationId, patientId: dto.patientId, queueDate: today });
      }

      if (token) {
        queueTokenId = token.id;
        await tx.queueToken.update({
          where: { id: token.id },
          data: {
            priority,
            ...(dto.assignedDoctorId ? { doctorId: dto.assignedDoctorId } : {}),
            ...(dto.assignedDeptId ? { departmentId: dto.assignedDeptId } : {}),
            ...(token.status === 'WAITING' ? {} : { status: 'WAITING' }),
          },
        });
        queueTokenChanged = true;
      } else if (locationId) {
        const tokenNumber = await nextQueueTokenNumber(tx, { tenantId, locationId, queueDate: today });
        const created = await tx.queueToken.create({
          data: {
            tenantId,
            tokenNumber,
            locationId,
            queueDate: today,
            patientId: dto.patientId,
            doctorId: dto.assignedDoctorId,
            departmentId: dto.assignedDeptId,
            visitType: 'NEW',
            priority,
            status: 'WAITING',
            notes: dto.chiefComplaint,
            createdById: triagedById,
          },
        });
        queueTokenId = created.id;
        queueTokenChanged = true;
      }

      const triage = await tx.triageRecord.create({
        data: {
          tenantId, locationId, patientId: dto.patientId,
          queueTokenId, chiefComplaint: dto.chiefComplaint,
          triageLevel: dto.triageLevel,
          symptoms: dto.symptoms || [],
          vitalsOnArrival,
          painScore: dto.painScore !== undefined && dto.painScore !== null ? Number(dto.painScore) : undefined,
          gcs: dto.gcs,
          assignedDoctorId: dto.assignedDoctorId,
          assignedDeptId: dto.assignedDeptId,
          notes, triagedById,
        },
      });

      // Allergies and current medications the nurse elicits at triage used to
      // live only inside this record's free-text `notes` blob — so an allergy
      // discovered today never reached patient.allergies and nothing would warn
      // anyone at the next visit. Merge them onto the patient record.
      //
      // UNION ONLY, never remove: the nurse is recording what this patient told
      // them today, which is not authority to delete a previously documented
      // allergy they simply didn't mention. Case-insensitive de-dupe so
      // "Penicillin" and "penicillin" don't both accumulate.
      const nurseAllergies = typeof dto.knownAllergies === 'string'
        ? dto.knownAllergies.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
      if (nurseAllergies.length || dto.currentMedications) {
        const patient = await tx.patient.findFirst({
          where: { id: dto.patientId, tenantId },
          select: { allergies: true, currentMedications: true },
        });
        if (patient) {
          const data: any = {};
          if (nurseAllergies.length) {
            const seen = new Map<string, string>();
            for (const a of [...(patient.allergies || []), ...nurseAllergies]) {
              const k = a.trim().toLowerCase();
              if (k && !seen.has(k)) seen.set(k, a.trim());
            }
            const merged = [...seen.values()];
            if (merged.length !== (patient.allergies || []).length) data.allergies = merged;
          }
          // currentMedications is a Json? column; only fill it when empty so a
          // triage note can't clobber a reconciled medication list.
          if (dto.currentMedications && !patient.currentMedications) {
            data.currentMedications = dto.currentMedications;
          }
          if (Object.keys(data).length) {
            await tx.patient.update({ where: { id: dto.patientId }, data });
          }
        }
      }

      return { triage, queueTokenChanged };
    });

    // Nudge any listening doctor queue pages to refresh — otherwise they only
    // pick up the new token on their next 30s poll.
    if (result.queueTokenChanged) {
      this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'triage_completed', patientId: dto.patientId });
    }

    // Fire-and-forget email notifications. RED/ORANGE/YELLOW triages page the
    // assigned doctor with vitals + chief complaint. GREEN/ROUTINE stays silent
    // so the doctor inbox doesn't drown in walk-ins. Patient gets an info-only
    // confirmation if they have an email on file.
    this.sendTriageEmails(tenantId, dto, vitalsOnArrival).catch((err) => {
      this.logger.error(`Triage email dispatch failed: ${err?.message || err}`);
    });

    return result.triage;
  }

  // Compose + send doctor alert + patient confirmation emails. Non-blocking.
  private async sendTriageEmails(tenantId: string, dto: any, vitals: any): Promise<void> {
    const level = (dto.triageLevel || 'GREEN').toUpperCase();
    // Skip routine — doctor sees these via the queue, no need to email.
    if (!['RED', 'ORANGE', 'YELLOW'].includes(level)) return;

    const [patient, doctor, tenant] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        select: { firstName: true, lastName: true, patientId: true, email: true },
      }),
      dto.assignedDoctorId
        ? this.prisma.doctorRegistry.findUnique({
            where: { id: dto.assignedDoctorId },
            select: { firstName: true, lastName: true, email: true, pgSpecialization: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tradeName: true, legalName: true },
      }),
    ]);

    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const patientName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || '(unnamed)';
    const mrn = patient?.patientId || '—';

    const badge =
      level === 'RED'    ? '🚨 RED — IMMEDIATE' :
      level === 'ORANGE' ? '🟠 ORANGE — VERY URGENT' :
                           '🟡 YELLOW — URGENT';

    const v = vitals || {};
    const vitalsRows: string[] = [];
    if (v.systolicBp || v.diastolicBp) vitalsRows.push(`<li><strong>BP:</strong> ${v.systolicBp || '?'}/${v.diastolicBp || '?'} mmHg</li>`);
    if (v.heartRate)      vitalsRows.push(`<li><strong>HR:</strong> ${v.heartRate} bpm</li>`);
    if (v.temperatureC)   vitalsRows.push(`<li><strong>Temp:</strong> ${v.temperatureC} °C</li>`);
    if (v.spo2)           vitalsRows.push(`<li><strong>SpO₂:</strong> ${v.spo2}%</li>`);
    if (v.respiratoryRate) vitalsRows.push(`<li><strong>RR:</strong> ${v.respiratoryRate}/min</li>`);
    if (dto.painScore !== undefined && dto.painScore !== null) vitalsRows.push(`<li><strong>Pain:</strong> ${dto.painScore}/10</li>`);
    const vitalsBlock = vitalsRows.length
      ? `<p><strong>Vitals on arrival:</strong></p><ul style="line-height:1.7;">${vitalsRows.join('')}</ul>`
      : '';

    // ── Doctor alert ──
    if (doctor?.email) {
      const subject = `${badge} Triage waiting — ${patientName} — ${orgName}`;
      const body = `Dr ${doctor.firstName || ''} ${doctor.lastName || ''},<br/><br/>
A patient has been triaged as <strong>${badge}</strong> and is awaiting your review.<br/><br/>
<strong>Patient:</strong> ${patientName} (MRN ${mrn})<br/>
<strong>Chief Complaint:</strong> ${dto.chiefComplaint || '—'}<br/>
${vitalsBlock}
<br/>Please attend to this patient promptly.`;
      sendEmail(doctor.email, subject, emailTemplate(`Triage Alert — ${badge}`, body, orgName))
        .catch((err) => this.logger.error(`Triage doctor alert email failed: ${err?.message || err}`));
    }

    // ── Patient confirmation (informational) ──
    if (patient?.email) {
      const body = `Dear ${patient.firstName || ''},<br/><br/>
Your triage assessment has been recorded at <strong>${orgName}</strong>.<br/><br/>
<strong>Chief Complaint:</strong> ${dto.chiefComplaint || '—'}<br/>
<strong>Priority Level:</strong> ${badge}<br/><br/>
A doctor will see you shortly. Please remain in the waiting area and inform a staff member if your condition worsens.`;
      sendEmail(patient.email, `Triage Recorded — ${orgName}`, emailTemplate('Triage Recorded', body, orgName))
        .catch((err) => this.logger.error(`Triage patient confirm email failed: ${err?.message || err}`));
    }
  }

  async getByToken(tenantId: string, tokenId: string) {
    const r = await this.prisma.triageRecord.findFirst({
      where: { tenantId, queueTokenId: tokenId },
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true } } },
    });
    return r ? { ...r, ...((r.vitalsOnArrival as any) || {}) } : null;
  }

  async getByPatient(tenantId: string, patientId: string) {
    const rows = await this.prisma.triageRecord.findMany({
      where: { tenantId, patientId },
      orderBy: { triageTime: 'desc' },
      take: 10,
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true } } },
    });
    return rows.map(r => ({ ...r, ...((r.vitalsOnArrival as any) || {}) }));
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.triageRecord.findFirst({ where: { id, tenantId } });
      if (!t) throw new NotFoundException('Triage not found');
      const data: any = {};
      if (dto.triageLevel !== undefined) data.triageLevel = dto.triageLevel;
      if (dto.chiefComplaint !== undefined) data.chiefComplaint = dto.chiefComplaint;
      if (dto.symptoms !== undefined) data.symptoms = dto.symptoms;
      if (dto.vitalsOnArrival !== undefined) data.vitalsOnArrival = dto.vitalsOnArrival;
      if (dto.painScore !== undefined) data.painScore = dto.painScore;
      if (dto.gcs !== undefined) data.gcs = dto.gcs;
      if (dto.assignedDoctorId !== undefined) data.assignedDoctorId = dto.assignedDoctorId;
      if (dto.assignedDeptId !== undefined) data.assignedDeptId = dto.assignedDeptId;
      if (dto.notes !== undefined) data.notes = dto.notes;
      return tx.triageRecord.update({ where: { id }, data });
    });
  }

  // AI triage suggestion. Returns priority, differential, recommended
  // specialty, and recommended diagnostics. INTENTIONALLY does NOT suggest
  // drugs in v1 — drug suggestions need dose/allergy/interaction checks
  // we don't model yet. Nurse sees the suggestion + a disclaimer; doctor
  // confirms before any action.
  //
  // Inputs are sanity-checked to keep token costs low and prevent prompt
  // injection via long free-form fields.
  async aiSuggest(
    tenantId: string,
    userId: string,
    dto: {
      chiefComplaint: string;
      briefHistory?: string;
      knownAllergies?: string;
      currentMedications?: string;
      ageYears?: number;
      gender?: string;
      systolicBp?: number;
      diastolicBp?: number;
      heartRate?: number;
      temperatureC?: number;
      spo2?: number;
      respiratoryRate?: number;
      painScore?: number;
      patientId?: string;
    },
  ) {
    if (!dto?.chiefComplaint || dto.chiefComplaint.trim().length < 3) {
      throw new BadRequestException('Chief complaint is required (min 3 characters)');
    }
    const cap = (s: string | undefined, n: number) => (s ? s.slice(0, n) : '');
    const v = (n: number | undefined) => (n !== undefined && n !== null ? String(n) : '—');

    const systemInstruction = `You are a senior emergency physician helping a triage nurse. Produce ONLY valid JSON in this exact shape:
{
  "suggestedPriority": "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLACK",
  "priorityRationale": string,                  // one sentence, ≤ 30 words
  "differentialConditions": [string],            // 3 most likely conditions, most likely first
  "recommendedSpecialty": string,                // single specialty name
  "recommendedDiagnostics": [string],             // 2-4 short, concrete tests/exams
  "redFlags": [string],                           // 0-3 worrying findings to verify now
  "disclaimer": "AI suggestion only — verify and confirm with attending doctor."
}

Triage priority rules (Indian OPD context):
  - RED:    Life-threatening, immediate (e.g. cardiac arrest, severe airway compromise)
  - ORANGE: Critical, requires intervention within 10 minutes
  - YELLOW: Urgent, requires evaluation within 30 minutes
  - GREEN:  Semi-urgent, can wait up to 1 hour
  - BLACK:  Routine, non-urgent (or deceased)

Hard rules:
  - Never invent a diagnosis as certainty — only differentials.
  - Never suggest drugs, doses, or prescriptions.
  - If information is insufficient for a confident call, lean conservative (higher priority).
  - Output ONLY the JSON object, no preamble.`;

    const prompt = `PATIENT: ${dto.gender || '?'}${dto.ageYears ? `, ${dto.ageYears} yrs` : ''}
CHIEF COMPLAINT: ${cap(dto.chiefComplaint, 500)}
BRIEF HISTORY: ${cap(dto.briefHistory, 1000) || '—'}
KNOWN ALLERGIES: ${cap(dto.knownAllergies, 300) || 'None'}
CURRENT MEDICATIONS: ${cap(dto.currentMedications, 500) || 'None'}

VITALS ON ARRIVAL:
  BP:   ${v(dto.systolicBp)}/${v(dto.diastolicBp)} mmHg
  HR:   ${v(dto.heartRate)} bpm
  Temp: ${v(dto.temperatureC)} °C
  SpO2: ${v(dto.spo2)} %
  RR:   ${v(dto.respiratoryRate)} /min
  Pain: ${v(dto.painScore)} / 10

Return the JSON only.`;

    const result = await this.ai.complete({
      tenantId,
      feature: 'TRIAGE_SUGGESTION',
      userId,
      patientId: dto.patientId,
      referenceType: 'TRIAGE',
      systemInstruction,
      prompt,
      // 2048 because Gemini 2.5-Flash burns 50-100 output tokens on its
      // internal "thinking" phase before emitting JSON. 600 was getting
      // the response cut mid-field.
      maxOutputTokens: 2048,
    });

    let text = result.text.trim();
    // Strip ```json ... ``` fences; also fall back to scanning for the
    // first {...} block in case Gemini wraps the JSON in prose.
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    if (!text.startsWith('{')) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) text = m[0];
    }
    try {
      const parsed = JSON.parse(text);
      return {
        suggestion: parsed,
        model: result.model,
        durationMs: result.durationMs,
        warning: 'AI suggestion only. Nurse must review and doctor must confirm before acting. No drug suggestions are provided by this feature.',
      };
    } catch {
      this.logger.warn(`Triage AI returned non-JSON: ${text.slice(0, 200)}`);
      return {
        suggestion: null,
        rawText: result.text,
        model: result.model,
        durationMs: result.durationMs,
        warning: 'AI response was not structured — please review the raw text and set priority manually.',
      };
    }
  }
}
