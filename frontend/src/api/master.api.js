import client from './client';

export const masterApi = {
  /**
   * GET /categories — list all procurement categories
   * Returns: [{ id, name, description }]
   */
  getCategories: () =>
    client.get('/categories').then((r) => r.data.data),

  /**
   * GET /units — list unit of measure options (e.g., pcs, kg, box)
   */
  getUnits: () =>
    client.get('/units').then((r) => r.data.data),

  /**
   * GET /tax-codes — list available tax codes (GST/CGST/SGST/IGST)
   */
  getTaxCodes: () =>
    client.get('/tax-codes').then((r) => r.data.data),

  /**
   * GET /currencies — list supported currencies
   */
  getCurrencies: () =>
    client.get('/currencies').then((r) => r.data.data),
};
