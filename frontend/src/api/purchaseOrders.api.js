import client from './client';

export const purchaseOrdersApi = {
  /**
   * GET /purchase-orders — list POs for the organization
   * @param {object} params - { status, vendor_id, page, limit }
   */
  getPurchaseOrders: (params) =>
    client.get('/purchase-orders', { params }).then((r) => r.data.data),

  /**
   * GET /purchase-orders/:id
   */
  getPurchaseOrderById: (id) =>
    client.get(`/purchase-orders/${id}`).then((r) => r.data.data),

  /**
   * POST /purchase-orders — generate a PO from an accepted quotation
   * Body: { quotation_id, notes }
   */
  createPurchaseOrder: (data) =>
    client.post('/purchase-orders', data).then((r) => r.data.data),

  /**
   * PATCH /purchase-orders/:id/status
   * Body: { status: 'generated' | 'sent' | 'accepted' | 'rejected' | 'completed' | 'cancelled' }
   */
  patchPurchaseOrderStatus: (id, status) =>
    client.patch(`/purchase-orders/${id}/status`, { status }).then((r) => r.data.data),

  /**
   * POST /purchase-orders/:id/receipts — submit a goods receipt note (GRN)
   * Body: { received_date, items: [{ po_item_id, received_quantity, remarks }] }
   */
  submitGoodsReceipt: (id, data) =>
    client.post(`/purchase-orders/${id}/receipts`, data).then((r) => r.data.data),

  /**
   * GET /purchase-orders/:id/receipts — get all GRNs for a PO
   */
  getGoodsReceipts: (id) =>
    client.get(`/purchase-orders/${id}/receipts`).then((r) => r.data.data),
};
