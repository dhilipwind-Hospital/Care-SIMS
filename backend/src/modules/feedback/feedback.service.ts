import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async submit(tenantId: string, dto: any) {
    return this.prisma.feedbackSurvey.create({
      data: {
        tenantId, patientId: dto.patientId, visitType: dto.visitType || 'OPD',
        departmentId: dto.departmentId, doctorId: dto.doctorId,
        overallRating: dto.overallRating, npsScore: dto.npsScore,
        responses: dto.responses || [], comments: dto.comments,
        status: 'COMPLETED', submittedAt: new Date(),
      },
    });
  }

  async findAll(tenantId: string, query: any) {
    const { visitType, rating, from, to, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (visitType) where.visitType = visitType;
    if (rating) where.overallRating = Number(rating);
    if (from || to) { where.submittedAt = {}; if (from) where.submittedAt.gte = new Date(from); if (to) where.submittedAt.lte = new Date(to); }
    const [data, total] = await Promise.all([
      this.prisma.feedbackSurvey.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.feedbackSurvey.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const f = await this.prisma.feedbackSurvey.findFirst({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('Feedback not found');
    return f;
  }

  async review(tenantId: string, id: string, userId: string) {
    const f = await this.prisma.feedbackSurvey.findFirst({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('Feedback not found');
    return this.prisma.feedbackSurvey.update({ where: { id }, data: { status: 'REVIEWED', reviewedById: userId, reviewedAt: new Date() } });
  }

  async analytics(tenantId: string, query: any) {
    const { from, to } = query;
    const where: any = { tenantId, status: { in: ['COMPLETED', 'REVIEWED'] } };
    if (from || to) { where.submittedAt = {}; if (from) where.submittedAt.gte = new Date(from); if (to) where.submittedAt.lte = new Date(to); }

    const all = await this.prisma.feedbackSurvey.findMany({ where, select: { overallRating: true, npsScore: true, visitType: true, doctorId: true, departmentId: true } });

    const totalResponses = all.length;
    const avgRating = totalResponses > 0 ? (all.reduce((s, f) => s + (f.overallRating || 0), 0) / totalResponses).toFixed(1) : '0';

    // NPS calculation: (% promoters - % detractors)
    const withNps = all.filter(f => f.npsScore != null);
    const promoters = withNps.filter(f => (f.npsScore as number) >= 9).length;
    const detractors = withNps.filter(f => (f.npsScore as number) <= 6).length;
    const nps = withNps.length > 0 ? Math.round(((promoters - detractors) / withNps.length) * 100) : 0;

    // Rating distribution
    const ratingDist = [1, 2, 3, 4, 5].map(r => ({ rating: r, count: all.filter(f => f.overallRating === r).length }));

    // By visit type
    const byVisitType: Record<string, { count: number; avgRating: number }> = {};
    all.forEach(f => {
      if (!byVisitType[f.visitType]) byVisitType[f.visitType] = { count: 0, avgRating: 0 };
      byVisitType[f.visitType].count++;
      byVisitType[f.visitType].avgRating += f.overallRating || 0;
    });
    Object.values(byVisitType).forEach(v => { if (v.count > 0) v.avgRating = Math.round((v.avgRating / v.count) * 10) / 10; });

    return { totalResponses, avgRating: Number(avgRating), nps, ratingDistribution: ratingDist, byVisitType };
  }
}
