import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../database/prisma.service';

/**
 * Thin wrapper around Google Gemini so every AI feature in the codebase
 * goes through one place. Responsibilities:
 *   - Read GOOGLE_AI_API_KEY from env, fail fast if missing
 *   - Honour the per-tenant ai_enabled toggle
 *   - Write an audit row for every call (cost tracking, debugging, SOC2)
 *   - Truncate prompts/responses to keep the audit table small
 *   - Default to gemini-2.0-flash (best free-tier model)
 *
 * Callers pass a feature key (e.g. 'DISCHARGE_SUMMARY') so the audit
 * table can be filtered / costed per feature.
 */

const DEFAULT_MODEL = 'gemini-2.0-flash';
const HEAD_CHARS = 500; // amount of prompt/response stored in audit log

export interface AiCompleteOptions {
  tenantId: string;
  feature: string;
  prompt: string;
  userId?: string;
  patientId?: string;
  referenceType?: string;
  referenceId?: string;
  model?: string;
  maxOutputTokens?: number;
  // Optional system instruction — kept simple for now. Real production
  // would pass a structured `systemInstruction` to the SDK; for our use
  // we just prepend it to the prompt to stay model-agnostic.
  systemInstruction?: string;
}

export interface AiCompleteResult {
  text: string;
  model: string;
  durationMs: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: GoogleGenerativeAI | null = null;

  constructor(private prisma: PrismaService) {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (key) {
      this.client = new GoogleGenerativeAI(key);
      this.logger.log('Gemini AI client initialised');
    } else {
      this.logger.warn('GOOGLE_AI_API_KEY not set — AI features will return DISABLED');
    }
  }

  // True if a key is configured AND the tenant hasn't switched AI off.
  // Endpoints should call this BEFORE building the prompt so they can
  // skip expensive data fetches when AI is unavailable.
  async isEnabled(tenantId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { aiEnabled: true },
      });
      return tenant?.aiEnabled ?? true;
    } catch {
      // If the column doesn't exist yet (migration not run), assume enabled
      // so the feature still degrades to the API-level error path rather
      // than silently 200ing. The API call itself will then fail loudly.
      return true;
    }
  }

  async complete(opts: AiCompleteOptions): Promise<AiCompleteResult> {
    const model = opts.model || DEFAULT_MODEL;
    const start = Date.now();

    if (!this.client) {
      await this.audit({ ...opts, model, status: 'DISABLED', errorMessage: 'GOOGLE_AI_API_KEY not configured', responseHead: '', responseChars: 0, durationMs: 0 });
      throw new BadRequestException('AI is not configured on this server');
    }

    const enabled = await this.isEnabled(opts.tenantId);
    if (!enabled) {
      await this.audit({ ...opts, model, status: 'DISABLED', errorMessage: 'Tenant ai_enabled is false', responseHead: '', responseChars: 0, durationMs: 0 });
      throw new BadRequestException('AI features are disabled for this organisation');
    }

    const fullPrompt = opts.systemInstruction
      ? `${opts.systemInstruction}\n\n---\n\n${opts.prompt}`
      : opts.prompt;

    try {
      const gen = this.client.getGenerativeModel({
        model,
        generationConfig: {
          temperature: 0.2, // clinical text wants deterministic-ish output
          maxOutputTokens: opts.maxOutputTokens ?? 2048,
        },
      });
      const result = await gen.generateContent(fullPrompt);
      const text = result.response.text();
      const durationMs = Date.now() - start;

      await this.audit({
        ...opts,
        model,
        status: 'OK',
        responseHead: text.slice(0, HEAD_CHARS),
        responseChars: text.length,
        durationMs,
      });

      return { text, model, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const message = err?.message || String(err);
      this.logger.error(`Gemini call failed for ${opts.feature}: ${message}`);
      await this.audit({
        ...opts,
        model,
        status: 'ERROR',
        errorMessage: message.slice(0, 1000),
        responseHead: '',
        responseChars: 0,
        durationMs,
      });
      throw new BadRequestException('AI generation failed — please retry');
    }
  }

  // Writes an audit row. Never throws — audit failure must not break the
  // feature it's logging. Best-effort with a try/catch.
  private async audit(row: AiCompleteOptions & {
    model: string;
    status: 'OK' | 'ERROR' | 'DISABLED';
    errorMessage?: string;
    responseHead: string;
    responseChars: number;
    durationMs: number;
  }): Promise<void> {
    try {
      await this.prisma.aiAuditLog.create({
        data: {
          tenantId: row.tenantId,
          feature: row.feature,
          userId: row.userId,
          patientId: row.patientId,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          model: row.model,
          promptChars: row.prompt.length,
          responseChars: row.responseChars,
          durationMs: row.durationMs,
          status: row.status,
          errorMessage: row.errorMessage,
          promptHead: row.prompt.slice(0, HEAD_CHARS),
          responseHead: row.responseHead,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write AI audit log: ${(err as any)?.message}`);
    }
  }
}
