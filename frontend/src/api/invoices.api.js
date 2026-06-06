import client from './client';

export const invoicesApi = {
  /**
   * GET /invoices — list invoices
   * @param {object} params - { status, vendor_id, purchase_order_id, page, limit }
   */
  getInvoices: (params) =>
    client.get('/invoices', { params }).then((r) => r.data.data),

  /**
   * GET /invoices/:id
   */
  getInvoiceById: (id) =>
    client.get(`/invoices/${id}`).then((r) => r.data.data),

  /**
   * POST /invoices — create a new invoice
   * Body: { purchase_order_id, invoice_number, invoice_date, due_date, subtotal, cgst, sgst, igst, grand_total, notes }
   */
  createInvoice: (data) =>
    client.post('/invoices', data).then((r) => r.data.data),

  /**
   * POST /invoices/:id/mark-paid
   * Body: { paid_at: ISO datetime string }
   */
  markPaid: (id, paid_at) =>
    client.post(`/invoices/${id}/mark-paid`, { paid_at }).then((r) => r.data.data),

  /**
   * PATCH /invoices/:id/status
   * Body: { status: 'pending' | 'approved' | 'paid' | 'overdue' | 'cancelled' }
   */
  patchInvoiceStatus: (id, status) =>
    client.patch(`/invoices/${id}/status`, { status }).then((r) => r.data.data),
};
