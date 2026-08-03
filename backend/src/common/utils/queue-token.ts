import { Prisma } from '@prisma/client';

/**
 * Shared helpers for allocating queue tokens.
 *
 * Three call sites mint queue tokens — reception registration, Queue Dashboard
 * "Issue Token", and nurse triage. Each used to carry its own copy of the
 * date-normalisation and token-numbering logic; this module is the single
 * source of truth for both.
 */

/**
 * `queueDate` is a `@db.Date` (date-only) column. `new Date().setHours(0,0,0,0)`
 * gives LOCAL midnight — on a non-UTC server (this one runs in IST) that
 * instant's UTC date is the PREVIOUS day, and Prisma serializes a `@db.Date`
 * WHERE filter by UTC date. Result: the value written and the value filtered on
 * disagree, so "today's queue" comes back empty even with patients checked in.
 * Compute the day at UTC midnight so write and read always agree.
 */
export function startOfDayUtc(input?: string | Date): Date {
  const d = input ? new Date(input) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Arbitrary namespace so our advisory locks can't collide with another feature's. */
const QUEUE_TOKEN_LOCK_NAMESPACE = 0x51544b4e; // "QTKN"

/** Deterministic 32-bit signed hash — Postgres advisory lock keys are int4. */
function hashKey(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Allocate the next token number for a (tenant, location, day).
 *
 * The naive `findFirst(orderBy: tokenNumber desc) + 1` is an unlocked
 * read-modify-write: two concurrent registrations both read N and both write
 * N+1, so two patients get the same token number. Same class of bug as the
 * payment lost-update race.
 *
 * A transaction-scoped advisory lock serialises just the callers competing for
 * the same queue-day, so concurrent registrations at other locations (or on
 * another date) are unaffected. `pg_advisory_xact_lock` releases on commit or
 * rollback, which makes it safe under the Supabase/pgBouncer transaction pooler
 * — unlike session-level advisory locks, which leak across pooled connections.
 *
 * MUST be called inside a transaction, and the caller MUST create the token in
 * that same transaction — the lock is only held until it commits.
 */
export async function nextQueueTokenNumber(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; locationId: string; queueDate: Date },
): Promise<number> {
  const { tenantId, locationId, queueDate } = params;
  const key = hashKey(`${tenantId}:${locationId}:${queueDate.toISOString().slice(0, 10)}`);

  // $executeRaw, not $queryRaw: pg_advisory_xact_lock returns `void` and Prisma
  // fails to deserialize a void column ("Failed to deserialize column of type 'void'").
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUEUE_TOKEN_LOCK_NAMESPACE}::int, ${key}::int)`;

  const last = await tx.queueToken.findFirst({
    where: { tenantId, locationId, queueDate },
    orderBy: { tokenNumber: 'desc' },
    select: { tokenNumber: true },
  });
  return (last?.tokenNumber || 0) + 1;
}

/**
 * Find the patient's live token for the day, if any.
 *
 * Reception "Advance to Triage", nurse triage, and appointment check-in can all
 * fire for the same patient. Every path must reuse an existing live token
 * instead of minting a second one, or the patient appears twice in the queue.
 */
export async function findLiveToken(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; locationId: string; patientId: string; queueDate: Date },
) {
  return tx.queueToken.findFirst({
    where: {
      tenantId: params.tenantId,
      locationId: params.locationId,
      patientId: params.patientId,
      queueDate: params.queueDate,
      status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Registration/queue priority vocabulary → the queue's canonical values. */
export function normalizePriority(input?: string): string {
  const v = (input || '').trim().toUpperCase();
  if (v === 'EMERGENCY' || v === 'CRITICAL') return 'EMERGENCY';
  if (v === 'URGENT') return 'URGENT';
  return 'NORMAL';
}

/**
 * Registration's visit-type vocabulary ("OPD - Walk-in", "Emergency", "IPD")
 * → the queue's ("NEW", "FOLLOW_UP", "EMERGENCY"). The two lists were written
 * independently and never reconciled; this is the reconciliation.
 */
export function normalizeVisitType(input?: string): string {
  const v = (input || '').trim().toUpperCase();
  if (v.includes('FOLLOW')) return 'FOLLOW_UP';
  if (v.includes('EMERGENCY')) return 'EMERGENCY';
  if (v.includes('APPOINTMENT')) return 'APPOINTMENT';
  return 'NEW';
}
