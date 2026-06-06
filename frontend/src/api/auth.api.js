import client from './client';

export const authApi = {
  /**
   * POST /auth/register — Self-register as Procurement Officer or Vendor
   * Body: { first_name, last_name?, email, password, role_name, company_name?, gst_number?, phone?, address? }
   */
  register: (data) =>
    client.post('/auth/register', data).then((r) => r.data.data),

  /**
   * POST /auth/login
   * Returns: { token, refresh_token, user: { id, first_name, last_name, email, role, organization_id, vendor_id, is_vendor, permissions } }
   */
  login: (email, password) =>
    client.post('/auth/login', { email, password }).then((r) => r.data.data),

  /**
   * POST /auth/logout — requires valid accessToken in header
   */
  logout: () =>
    client.post('/auth/logout').then((r) => r.data.data),

  /**
   * GET /me — returns the currently authenticated user's profile
   */
  getMe: () =>
    client.get('/me').then((r) => r.data.data),

  /**
   * POST /auth/refresh — issues a new access token from a refresh token
   */
  refreshToken: (refresh_token) =>
    client.post('/auth/refresh', { refresh_token }).then((r) => r.data.data),
};
