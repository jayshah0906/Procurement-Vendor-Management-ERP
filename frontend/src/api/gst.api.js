import client from './client';

export const gstApi = {
  /**
   * GET /gst/verify/:gstin — Public. Validates GSTIN format/checksum and, when configured, looks it up on the GST portal.
   * Returns: { gstin, valid, live_checked, message, state, pan, legal_name, trade_name, status, address, registration_date, taxpayer_type }
   */
  verify: (gstin) =>
    client.get(`/gst/verify/${encodeURIComponent(gstin)}`).then((r) => r.data.data),
};
