import { prisma } from "../utils/prisma";
import { Prisma } from "../generated/prisma/client";

export class DashboardService {
  static async getSummary(organizationId: string, userVendorId: string | null = null) {
    const totalRfqs = userVendorId
      ? await prisma.rfqs.count({
          where: {
            organization_id: organizationId,
            deleted_at: null,
            rfq_vendors: {
              some: {
                vendor_id: userVendorId,
                deleted_at: null,
              },
            },
            status: {
              in: ["published", "quotation_open", "quotation_closed", "under_review", "approved", "rejected", "converted_to_po"],
            },
          },
        })
      : await prisma.rfqs.count({
          where: { organization_id: organizationId, deleted_at: null },
        });

    const totalVendors = userVendorId
      ? await prisma.quotations.count({
          where: {
            organization_id: organizationId,
            vendor_id: userVendorId,
            deleted_at: null,
          },
        })
      : await prisma.vendors.count({
          where: { organization_id: organizationId, deleted_at: null },
        });

    const activePOs = userVendorId
      ? await prisma.purchase_orders.count({
          where: {
            organization_id: organizationId,
            vendor_id: userVendorId,
            status: { in: ["generated", "sent", "accepted"] },
            deleted_at: null,
          },
        })
      : await prisma.purchase_orders.count({
          where: {
            organization_id: organizationId,
            status: { in: ["generated", "sent", "accepted"] },
            deleted_at: null,
          },
        });

    const pendingApprovals = userVendorId
      ? await prisma.invoices.count({
          where: {
            organization_id: organizationId,
            vendor_id: userVendorId,
            status: { in: ["pending", "sent"] },
            deleted_at: null,
          },
        })
      : await prisma.approval_workflows.count({
          where: { organization_id: organizationId, status: "pending", deleted_at: null },
        });

    return {
      total_rfqs: totalRfqs,
      total_vendors: totalVendors,
      active_purchase_orders: activePOs,
      pending_approvals: pendingApprovals,
    };
  }

  static async getProcurementOverview(organizationId: string, userVendorId: string | null = null) {
    // 1. Spend by status
    const spendWhere: any = { organization_id: organizationId, deleted_at: null };
    if (userVendorId) {
      spendWhere.vendor_id = userVendorId;
    }

    const spendByStatus = await prisma.purchase_orders.groupBy({
      by: ["status"],
      where: spendWhere,
      _sum: { total_amount: true },
    });

    // 2. Monthly spend trend for last 6 months
    const monthlySpend = userVendorId
      ? await prisma.$queryRawUnsafe<any[]>(
          `SELECT 
             to_char(created_at, 'YYYY-MM') as month,
             COALESCE(SUM(total_amount), 0) as spend
           FROM purchase_orders
           WHERE organization_id = $1::uuid AND vendor_id = $2::uuid AND deleted_at IS NULL
           GROUP BY month
           ORDER BY month DESC
           LIMIT 6`,
          organizationId,
          userVendorId
        )
      : await prisma.$queryRawUnsafe<any[]>(
          `SELECT 
             to_char(created_at, 'YYYY-MM') as month,
             COALESCE(SUM(total_amount), 0) as spend
           FROM purchase_orders
           WHERE organization_id = $1::uuid AND deleted_at IS NULL
           GROUP BY month
           ORDER BY month DESC
           LIMIT 6`,
          organizationId
        );

    return {
      spend_by_status: spendByStatus.map((s) => ({
        status: s.status,
        total: s._sum.total_amount || 0,
      })),
      monthly_spend_trend: monthlySpend.reverse(),
    };
  }

  static async getVendorOverview(organizationId: string) {
    // 1. Count by vendor status
    const statusCounts = await prisma.vendors.groupBy({
      by: ["status"],
      where: { organization_id: organizationId, deleted_at: null },
      _count: { id: true },
    });

    // 2. Top 5 vendors by rating
    const topVendors = await prisma.vendors.findMany({
      where: { organization_id: organizationId, deleted_at: null, rating: { not: null } },
      orderBy: { rating: "desc" },
      take: 5,
      select: { id: true, company_name: true, rating: true, status: true },
    });

    return {
      vendor_status_breakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      top_rated_vendors: topVendors,
    };
  }

  // ==========================================
  // ANALYTICS & MATERIALIZED VIEW
  // ==========================================

  static async getVendorPerformance(organizationId: string) {
    // Refresh materialized view to get latest aggregates
    try {
      await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY vendor_performance_mv`);
    } catch (err) {
      // If concurrent fails (e.g., first run without indexing), try normal refresh
      await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW vendor_performance_mv`);
    }

    // Query data from materialized view
    const results = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         vendor_id,
         company_name,
         total_rfqs_invited::int as total_rfqs_invited,
         total_quotations_submitted::int as total_quotations_submitted,
         total_pos_won::int as total_pos_won,
         total_spend::float as total_spend
       FROM vendor_performance_mv
       WHERE organization_id = $1::uuid`,
      organizationId
    );

    return results;
  }

  static async getSpendAnalysis(organizationId: string) {
    // Spend by category
    const categorySpend = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         c.name as category_name,
         COALESCE(SUM(po.total_amount), 0)::float as total_spend
       FROM purchase_orders po
       JOIN vendors v ON po.vendor_id = v.id
       JOIN procurement_categories c ON v.category_id = c.id
       WHERE po.organization_id = $1::uuid AND po.deleted_at IS NULL AND po.status = 'completed'
       GROUP BY c.name
       ORDER BY total_spend DESC`,
      organizationId
    );

    return {
      spend_by_category: categorySpend,
    };
  }

  static async getRfqConversion(organizationId: string) {
    const totalRfqs = await prisma.rfqs.count({
      where: { organization_id: organizationId, deleted_at: null },
    });

    const rfqsWithQuotes = await prisma.rfqs.count({
      where: {
        organization_id: organizationId,
        deleted_at: null,
        quotations: { some: { deleted_at: null } },
      },
    });

    const rfqsWithPOs = await prisma.rfqs.count({
      where: {
        organization_id: organizationId,
        deleted_at: null,
        status: "converted_to_po",
      },
    });

    return {
      total_rfqs: totalRfqs,
      rfqs_with_quotations: rfqsWithQuotes,
      rfqs_converted_to_po: rfqsWithPOs,
      ratios: {
        quotation_rate: totalRfqs > 0 ? (rfqsWithQuotes / totalRfqs) * 100 : 0,
        po_conversion_rate: totalRfqs > 0 ? (rfqsWithPOs / totalRfqs) * 100 : 0,
      },
    };
  }
}
