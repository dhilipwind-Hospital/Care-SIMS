/**
 * The single definition of "critical" for a lab result.
 *
 * The flag dropdown offers two overlapping families — HH/LL ("Critical High" /
 * "Critical Low") and CRITICAL_HIGH/CRITICAL_LOW/PANIC — and the two halves of
 * the safety response used to test different subsets:
 *
 *   backend alert  : CRITICAL | CRITICAL_HIGH | CRITICAL_LOW | PANIC   (missed HH, LL)
 *   printed report : HH | LL | CRITICAL                                (missed the rest)
 *
 * So picking "Critical High" emailed nobody, and picking "CRITICAL HIGH"
 * printed a report that looked unremarkable. Both now use this list.
 */
export const CRITICAL_LAB_FLAGS = ['CRITICAL', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'PANIC', 'HH', 'LL'] as const;

export function isCriticalFlag(flag?: string | null): boolean {
  return !!flag && (CRITICAL_LAB_FLAGS as readonly string[]).includes(String(flag).toUpperCase());
}
