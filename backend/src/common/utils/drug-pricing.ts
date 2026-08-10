/**
 * Single source of truth for what a prescribed drug costs.
 *
 * The pharmacy Dispense panel used to compute its "Total Amount" from
 * `pricePerUnit`/`unitPrice` fields that PrescriptionItem has never had, so it
 * showed ₹0 while billing independently charged the patient. Both sides now
 * price through this helper, so the number the pharmacist reads and the number
 * on the invoice cannot drift apart.
 */
import { PrismaService } from '../../database/prisma.service';

export const DEFAULT_DRUG_PRICE = 50;
export const DRUG_MARKUP = 1.3;

/**
 * Cheapest-available catalog price per drugId: batch unit cost × markup.
 * Mirrors the query billPrescription has always used, including the
 * `quantityInStock > 0` term, so a bill raised now and a panel rendered now
 * agree to the paisa.
 */
export async function drugPriceMap(
  prisma: PrismaService,
  tenantId: string,
  drugIds: string[],
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const ids = drugIds.filter(Boolean);
  if (!ids.length) return prices;
  const batches = await prisma.drugBatch.findMany({
    where: { tenantId, drugId: { in: ids }, unitCost: { not: null }, quantityInStock: { gt: 0 } },
    select: { drugId: true, unitCost: true },
  });
  for (const b of batches) {
    if (!prices[b.drugId] && b.unitCost != null) {
      prices[b.drugId] = Math.round(Number(b.unitCost) * DRUG_MARKUP * 100) / 100;
    }
  }
  return prices;
}

/** Falls back to the flat default when the drug is unlinked or has no priced stock. */
export function unitPriceFor(drugId: string | null | undefined, prices: Record<string, number>): number {
  return drugId && prices[drugId] != null ? prices[drugId] : DEFAULT_DRUG_PRICE;
}
