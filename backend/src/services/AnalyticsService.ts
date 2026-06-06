import { prisma } from "../utils/prisma";

export class AnalyticsService {
  static async getReportsData(organizationId: string, monthFilter?: string) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (monthFilter && monthFilter !== "all" && /^\d{4}-\d{2}$/.test(monthFilter)) {
      const [year, month] = monthFilter.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

    // 1. Total Spend
    const spendWhere: any = {
      organization_id: organizationId,
      deleted_at: null,
      status: { not: "cancelled" }
    };
    if (startDate && endDate) {
      spendWhere.created_at = {
        gte: startDate,
        lte: endDate
      };
    }
    const spendAggregate = await prisma.purchase_orders.aggregate({
      where: spendWhere,
      _sum: { total_amount: true }
    });
    const totalSpend = Number(spendAggregate._sum.total_amount || 0);

    // 2. Active Vendors
    const activeVendors = await prisma.vendors.count({
      where: {
        organization_id: organizationId,
        deleted_at: null,
        status: "active"
      }
    });

    // 3. PO Fulfillment Rate
    const totalPoCount = await prisma.purchase_orders.count({
      where: spendWhere
    });
    const completedPoCount = await prisma.purchase_orders.count({
      where: {
        ...spendWhere,
        status: "completed"
      }
    });
    const poFulfillmentRate = totalPoCount > 0 ? Math.round((completedPoCount / totalPoCount) * 100) : 100;

    // 4. Overdue Invoices
    const overdueInvoicesCount = await prisma.invoices.count({
      where: {
        organization_id: organizationId,
        deleted_at: null,
        status: { notIn: ["paid", "cancelled"] },
        due_date: { lt: new Date() }
      }
    });

    // 5. Spend by Category
    const categoryParams: any[] = [organizationId];
    let categoryQuery = `
      SELECT 
        c.name as category_name,
        COALESCE(SUM(po.total_amount), 0)::float as total_spend
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN procurement_categories c ON v.category_id = c.id
      WHERE po.organization_id = $1::uuid 
        AND po.deleted_at IS NULL 
        AND po.status != 'cancelled'
    `;
    if (startDate && endDate) {
      categoryQuery += ` AND po.created_at >= $2::timestamptz AND po.created_at <= $3::timestamptz`;
      categoryParams.push(startDate, endDate);
    }
    categoryQuery += `
      GROUP BY c.name
      ORDER BY total_spend DESC
    `;
    const spendByCategory = await prisma.$queryRawUnsafe<any[]>(categoryQuery, ...categoryParams);

    // 6. Top Vendors by Spend
    const vendorParams: any[] = [organizationId];
    let vendorQuery = `
      SELECT 
        v.company_name as vendor_name,
        COALESCE(SUM(po.total_amount), 0)::float as spend,
        COUNT(po.id)::int as po_count
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE po.organization_id = $1::uuid 
        AND po.deleted_at IS NULL 
        AND po.status != 'cancelled'
    `;
    if (startDate && endDate) {
      vendorQuery += ` AND po.created_at >= $2::timestamptz AND po.created_at <= $3::timestamptz`;
      vendorParams.push(startDate, endDate);
    }
    vendorQuery += `
      GROUP BY v.company_name
      ORDER BY spend DESC
      LIMIT 5
    `;
    const topVendors = await prisma.$queryRawUnsafe<any[]>(vendorQuery, ...vendorParams);

    // 7. Monthly Spend Trend (Last 6 Months)
    const monthlySpend = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         to_char(created_at, 'YYYY-MM') as month,
         COALESCE(SUM(total_amount), 0)::float as spend
       FROM purchase_orders
       WHERE organization_id = $1::uuid 
         AND deleted_at IS NULL 
         AND status != 'cancelled'
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`,
      organizationId
    );

    return {
      metrics: {
        total_spend: totalSpend,
        active_vendors: activeVendors,
        po_fulfillment_rate: poFulfillmentRate,
        overdue_invoices_count: overdueInvoicesCount
      },
      spend_by_category: spendByCategory,
      top_vendors: topVendors,
      monthly_spend_trend: monthlySpend.reverse()
    };
  }
}
