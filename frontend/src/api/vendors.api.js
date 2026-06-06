import client from './client';

export const vendorsApi = {
  /**
   * GET /vendors — list all vendors for the organization
   * @param {object} params - Optional query params: { status, category_id, page, limit }
   */
  getVendors: (params) =>
    client.get('/vendors', { params }).then((r) => r.data.data),

  /**
   * GET /vendors/:id
   */
  getVendorById: (id) =>
    client.get(`/vendors/${id}`).then((r) => r.data.data),

  /**
   * POST /vendors
   * Body: { company_name, gst_number, contact_person, email, phone, address, category_id }
   */
  createVendor: (data) =>
    client.post('/vendors', data).then((r) => r.data.data),

  /**
   * PUT /vendors/:id
   */
  updateVendor: (id, data) =>
    client.put(`/vendors/${id}`, data).then((r) => r.data.data),

  /**
   * PATCH /vendors/:id/status
   * Body: { status: 'active' | 'inactive' | 'blacklisted' | 'pending_approval' }
   */
  patchVendorStatus: (id, status) =>
    client.patch(`/vendors/${id}/status`, { status }).then((r) => r.data.data),
};
