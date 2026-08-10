import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * Writes an OrgAuditLog row for every successful mutating request.
 *
 * AuditService.log() existed but had zero call sites, so /app/admin/audit was
 * permanently empty. This is the missing writer — the directory it lives in was
 * scaffolded for it and left empty.
 *
 * Deliberate constraints:
 *  - Success path only. Guards throw before this runs, so denied attempts are
 *    not captured here; that needs an exception filter and is a separate job.
 *  - Never awaited and never enrolled in a caller's transaction. An audit
 *    write failing must never roll back a payment or slow a mutation down.
 *  - Request bodies are NOT stored. These routes carry chief complaints, full
 *    demographics and — on the auth routes — plaintext passwords. Persisting
 *    them would hand any org admin a credential dump via the page's CSV export.
 */
const VERB_EVENT: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const eventType = VERB_EVENT[req?.method];
    if (!eventType) return next.handle();

    return next.handle().pipe(
      tap((body) => {
        // This runs on every mutating route in the application. Wrapped whole:
        // a throw anywhere in here would surface as a failure of an otherwise
        // successful request (a completed payment, a saved consultation).
        try {
          const user = req.user;
          // Tenant staff only. Platform admins write platformAuditLog, and
          // public routes (login, self-registration) have no user at all.
          if (!user?.tenantId || user.type !== 'TENANT') return;

          const path = String(req.originalUrl || req.url || '').split('?')[0];
          // First meaningful segment: /api/billing/invoices/:id/payments -> BILLING
          const targetType = path.split('/').filter(Boolean).filter(p => p !== 'api')[0]?.toUpperCase() || 'UNKNOWN';

          // Behind a proxy x-forwarded-for can be a string[]; the column is a
          // plain String? and Prisma would reject the row.
          const fwd = req.headers?.['x-forwarded-for'];
          const ip = req.ip || (Array.isArray(fwd) ? fwd[0] : fwd) || undefined;
          const ua = req.headers?.['user-agent'];

          // Only ever an id — never the response body, which carries PHI.
          const bodyId = body && typeof body === 'object' && !Array.isArray(body) && typeof (body as any).id === 'string'
            ? (body as any).id
            : undefined;

          void this.audit
            .log(user.tenantId, {
              eventType,
              actorId: user.sub || user.userId,
              // The JWT carries no display name; resolving one would cost an
              // extra SELECT on every mutation in the system.
              actorName: user.email || 'Unknown user',
              actorRole: user.systemRoleId || user.roleId || 'UNKNOWN',
              targetType,
              targetId: req.params?.id || bodyId,
              locationId: user.locationId,
              description: `${req.method} ${path}`,
              ipAddress: typeof ip === 'string' ? ip.slice(0, 100) : undefined,
              userAgent: typeof ua === 'string' ? ua.slice(0, 300) : undefined,
            })
            .catch(() => { /* auditing must never break the request it describes */ });
        } catch { /* ditto */ }
      }),
    );
  }
}
