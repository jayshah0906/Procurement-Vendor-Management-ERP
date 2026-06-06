import client from './client';

export const quotationsApi = {
  /**
   * GET /quotations — list quotations
   * @param {object} params - { rfq_id, vendor_id, status, page, limit }
   */
  getQuotations: (params) =>
    client.get('/quotations', { params }).then((r) => r.data.data),

  /**
   * GET /quotations/:id
   */
  getQuotationById: (id) =>
    client.get(`/quotations/${id}`).then((r) => r.data.data),

  /**
   * POST /quotations — vendor submits a bid
   * Body: { rfq_id, items: [{ rfq_item_id, item_name, quantity, unit_price, delivery_days }], subtotal, tax_amount, grand_total, notes }
   */
  createQuotation: (data) =>
    client.post('/quotations', data).then((r) => r.data.data),

  /**
   * PUT /quotations/:id — update a draft quotation
   */
  updateQuotation: (id, data) =>
    client.put(`/quotations/${id}`, data).then((r) => r.data.data),

  /**
   * PATCH /quotations/:id/status
   * Body: { status: 'submitted' | 'under_review' | 'accepted' | 'rejected' }
   */
  patchQuotationStatus: (id, status) =>
    client.patch(`/quotations/${id}/status`, { status }).then((r) => r.data.data),
};
