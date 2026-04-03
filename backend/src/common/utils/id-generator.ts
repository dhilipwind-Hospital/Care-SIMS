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

  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Use raw SQL to atomically extract the max numeric suffix from existing IDs.
      // The regex '[0-9]+$' captures trailing digits.  COALESCE handles the empty-table case.
      const result: any[] = await tx.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(SUBSTRING("${idColumn}" FROM '[0-9]+$') AS INTEGER)), 0) + 1 AS "nextVal"
         FROM "${table}"
         WHERE "${tenantColumn}" = $1`,
        tenantId,
      );

      const nextVal = Number(result[0]?.nextVal ?? 1);
      const nextId = `${prefix}${String(nextVal).padStart(padLength, '0')}`;

      return callback(tx, nextId);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
