import client from './client';

export const rfqsApi = {
  /**
   * GET /rfqs — list RFQs for the organization
   * @param {object} params - { status, category_id, page, limit }
   */
  getRfqs: (params) =>
    client.get('/rfqs', { params }).then((r) => r.data.data),

  /**
   * GET /rfqs/:id
   */
  getRfqById: (id) =>
    client.get(`/rfqs/${id}`).then((r) => r.data.data),

  /**
   * POST /rfqs
   * Body: { title, description, category_id, deadline (ISO), items: [{ item_name, description, quantity, unit, estimated_unit_price }] }
   */
  createRfq: (data) =>
    client.post('/rfqs', data).then((r) => r.data.data),

  /**
   * PUT /rfqs/:id
   */
  updateRfq: (id, data) =>
    client.put(`/rfqs/${id}`, data).then((r) => r.data.data),

  /**
   * PATCH /rfqs/:id/status
   * Body: { status: 'draft' | 'published' | 'closed' | 'converted_to_po' | 'cancelled' }
   */
  patchRfqStatus: (id, status) =>
    client.patch(`/rfqs/${id}/status`, { status }).then((r) => r.data.data),

  /**
   * POST /rfqs/:id/invite
   * Body: { vendor_ids: string[] }
   */
  inviteVendors: (id, vendor_ids) =>
    client.post(`/rfqs/${id}/invite`, { vendor_ids }).then((r) => r.data.data),

  /**
   * GET /rfqs/:id/vendors — get list of vendors invited to an RFQ
   */
  getInvitedVendors: (id) =>
    client.get(`/rfqs/${id}/vendors`).then((r) => r.data.data),
};
