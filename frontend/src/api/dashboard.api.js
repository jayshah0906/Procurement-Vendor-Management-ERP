import client from './client';

export const dashboardApi = {
  /**
   * GET /dashboard/summary
   * Returns: { total_rfqs, total_vendors, active_purchase_orders, pending_approvals }
   */
  getSummary: () =>
    client.get('/dashboard/summary').then((r) => r.data.data),

  /**
   * GET /dashboard/procurement-overview
   * Returns: { spend_by_status, monthly_spend_trend: [{ month, spend }] }
   */
  getProcurementOverview: () =>
    client.get('/dashboard/procurement-overview').then((r) => r.data.data),

  /**
   * GET /dashboard/vendor-overview
   * Returns: { vendor_status_breakdown: [{ status, count }], top_rated_vendors }
   */
  getVendorOverview: () =>
    client.get('/dashboard/vendor-overview').then((r) => r.data.data),

  /**
   * GET /analytics/vendor-performance
   * Returns: [{ vendor_id, company_name, total_rfqs_invited, total_quotations_submitted, total_pos_won, total_spend }]
   */
  getVendorPerformance: () =>
    client.get('/analytics/vendor-performance').then((r) => r.data.data),

  /**
   * GET /analytics/spend-analysis
   * Returns: { spend_by_category: [{ category_name, total_spend }] }
   */
  getSpendAnalysis: () =>
    client.get('/analytics/spend-analysis').then((r) => r.data.data),

  /**
   * GET /analytics/rfq-conversion
   * Returns: { total_rfqs, rfqs_with_quotations, rfqs_converted_to_po, ratios }
   */
  getRfqConversion: () =>
    client.get('/analytics/rfq-conversion').then((r) => r.data.data),
};
