import client from './client';

export const gstApi = {
  /**
   * GET /gst/verify/:gstin — Public. Looks the GSTIN up on the GST portal via the live GST API.
   * Returns: { gstin, valid, message, legal_name, trade_name, status, state, address, registration_date, taxpayer_type }
   */
  verify: (gstin) =>
    client.get(`/gst/verify/${encodeURIComponent(gstin)}`).then((r) => r.data.data),
};
