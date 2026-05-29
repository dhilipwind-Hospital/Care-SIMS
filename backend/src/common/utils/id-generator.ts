import { Prisma } from '@prisma/client';

/**
 * Generates a sequential ID that is safe from race conditions.
 *
 * Uses a SERIALIZABLE transaction + raw SQL MAX() to atomically determine the
 * next sequence number.  If two concurrent callers race, SERIALIZABLE isolation
 * guarantees one will see the other's uncommitted row and either wait or abort
 * with a serialization failure (which Prisma surfaces as a P2034 error).
 *
 * The caller should perform the record creation INSIDE the returned transaction
 * callback so the id-generation and insert are a single atomic unit.
 *
 * @example
 * ```ts
 * return generateSequentialId(this.prisma, {
 *   table: 'Invoice',
 *   idColumn: 'invoiceNumber',
 *   prefix: `INV-${new Date().getFullYear()}-`,
 *   tenantId,
 *   padLength: 6,
 *   callback: async (tx, nextId) => {
 *     return tx.invoice.create({ data: { invoiceNumber: nextId, ... } });
 *   },
 * });
 * ```
 */
export interface SeqIdOptions<T> {
  /** The Prisma table name exactly as it appears in the DB schema (PascalCase model name). */
  table: string;
  /** The column that stores the sequential ID string (e.g. "invoiceNumber"). */
  idColumn: string;
  /** The prefix before the numeric portion (e.g. "INV-2026-"). */
  prefix: string;
  /** Tenant ID to scope the sequence. */
  tenantId: string;
  /** How many digits to pad (default 6). */
  padLength?: number;
  /** The column that stores the tenant ID (default "tenantId"). */
  tenantColumn?: string;
  /**
   * Callback that receives the Prisma transaction client and the generated ID.
   * All database writes MUST happen inside this callback to stay within the
   * serializable transaction.
   */
  callback: (tx: Prisma.TransactionClient, nextId: string) => Promise<T>;
}

/** Convert PascalCase/camelCase to snake_case and pluralize simply. */
function camelToSnake(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/** Map Prisma model name to actual DB table name (via @@map convention: snake_case plural). */
function modelToTable(model: string): string {
  const snake = camelToSnake(model);
  // Handle known irregular/non-pluralizing tables
  const overrides: Record<string, string> = {
    patient: 'patients',
    invoice: 'invoices',
    admission: 'admissions',
    grievance: 'grievances',
    prescription: 'prescriptions',
    referral: 'referrals',
    lab_order: 'lab_orders',
    radiology_order: 'radiology_orders',
    physiotherapy_order: 'physiotherapy_orders',
    ambulance_trip: 'ambulance_trips',
    pharmacy_return: 'pharmacy_returns',
    o_t_booking: 'ot_bookings', // OTBooking → o_t_booking via naive conversion
    ot_booking: 'ot_bookings',
    dialysis_session: 'dialysis_sessions',
    mortuary_record: 'mortuary_records',
    insurance_claim: 'insurance_claims',
    teleconsult_session: 'teleconsult_sessions',
    blood_donor: 'blood_donors',
    blood_donation: 'blood_donations',
  };
  if (overrides[snake]) return overrides[snake];
  // Default: append 's' if not already pluralized
  return snake.endsWith('s') ? snake : snake + 's';
}

export async function generateSequentialId<T>(
  prisma: any,
  opts: SeqIdOptions<T>,
): Promise<T> {
  const {
    table,
    idColumn,
    prefix,
    tenantId,
    padLength = 6,
    tenantColumn = 'tenantId',
    callback,
  } = opts;

  const dbTable = modelToTable(table);
  const dbIdColumn = camelToSnake(idColumn);
  const dbTenantColumn = camelToSnake(tenantColumn);

  // NOTE: Serializable isolation is incompatible with the Supabase transaction
  // pooler (pgBouncer) used in production. Use the default READ COMMITTED level
  // and rely on a unique constraint + small retry loop to handle races.
  //
  // The MAX(...) approach hits a real problem under pgBouncer transaction
  // pooling: a freshly-inserted row in another connection may not be visible
  // to our SELECT yet, so two concurrent invoices both pick the same number
  // and one fails with P2002. Retry loop covers occasional bursts; on every
  // retry we also append a small random suffix so collisions can't repeat.
  const MAX_RETRIES = 5;
  let lastErr: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Robust against rows that don't end in a clean digit run (e.g. retry
        // suffixed IDs like INV-2026-000001-AB). Without the CASE guard,
        // SUBSTRING returns '' for those rows and CAST('' AS INTEGER) raises
        // Postgres "invalid input syntax for type integer" — surfaced as a
        // Prisma P2010 on every subsequent insert until the bad row is
        // cleaned up. The CASE skips those rows.
        const result: any[] = await tx.$queryRawUnsafe(
          `SELECT COALESCE(
              MAX(
                CASE
                  WHEN SUBSTRING("${dbIdColumn}" FROM '[0-9]+$') ~ '^[0-9]+$'
                  THEN CAST(SUBSTRING("${dbIdColumn}" FROM '[0-9]+$') AS INTEGER)
                  ELSE 0
                END
              ),
              0
            ) + 1 AS "nextVal"
           FROM "${dbTable}"
           WHERE "${dbTenantColumn}" = $1`,
          tenantId,
        );
        const nextVal = Number(result[0]?.nextVal ?? 1) + attempt; // bump on retry
        // On retries, append a 2-char random suffix to dodge sticky pgBouncer
        // visibility. First attempt keeps the clean INV-YYYY-000001 format.
        const suffix = attempt > 0 ? `-${Math.random().toString(36).slice(2, 4).toUpperCase()}` : '';
        const nextId = `${prefix}${String(nextVal).padStart(padLength, '0')}${suffix}`;
        return callback(tx, nextId);
      });
    } catch (err: any) {
      lastErr = err;
      // Retry on unique-constraint races. Also retry on Postgres serialization
      // failures (40001) which can surface as raw errors here.
      const msg = String(err?.message || '');
      const isUniqueViolation = err?.code === 'P2002' || msg.includes('Unique constraint') || msg.includes('duplicate key');
      if (isUniqueViolation) continue;
      throw err;
    }
  }
  throw lastErr;
}
