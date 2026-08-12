/**
 * Removes the data created by the Chromium walkthrough on 2026-08-12.
 * The DB was unreachable from the dev machine when the run finished, so this
 * could not be executed then. Run it once connectivity is back:
 *
 *   cd backend && node -r dotenv/config scripts-cleanup-runbook-data.js
 *
 * Leaves seeded demo data untouched — it only matches patients named "Runbook".
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const T = '8bd79d3e-b5d7-442c-a36b-e8c1fa06be7a';

(async () => {
  const pats = await p.patient.findMany({ where: { tenantId: T, firstName: 'Runbook' } });
  console.log('patients to remove:', pats.map(x => x.patientId).join(', ') || 'none');
  for (const pt of pats) {
    for (const lo of await p.labOrder.findMany({ where: { patientId: pt.id } })) {
      for (const r of await p.labResult.findMany({ where: { labOrderId: lo.id } })) {
        await p.labResultItem.deleteMany({ where: { labResultId: r.id } }).catch(() => {});
      }
      await p.labResult.deleteMany({ where: { labOrderId: lo.id } });
      await p.labOrderItem.deleteMany({ where: { labOrderId: lo.id } }).catch(() => {});
      await p.labOrder.delete({ where: { id: lo.id } });
      console.log('  removed lab order', lo.orderNumber);
    }
    await p.consultation.deleteMany({ where: { patientId: pt.id } }).catch(() => {});
    await p.triageRecord.deleteMany({ where: { patientId: pt.id } });
    await p.queueToken.deleteMany({ where: { patientId: pt.id } });
    await p.patientAccessLog.deleteMany({ where: { patientId: pt.id } }).catch(() => {});
    await p.patient.delete({ where: { id: pt.id } });
    console.log('  removed patient', pt.patientId);
  }
  console.log('patients left:', await p.patient.count({ where: { tenantId: T, isDeleted: false } }));
  await p.$disconnect();
})();
