import client from './client';

export const auditLogsApi = {
  /**
   * GET /audit-logs — list audit log entries for the organization
   * @param {object} params - { entity_type, entity_id, actor_user_id, page, limit }
   */
  getAuditLogs: (params) =>
    client.get('/audit-logs', { params }).then((r) => r.data.data),

  /**
   * GET /audit-logs/:entity_type/:entity_id — timeline for a specific entity
   */
  getEntityTimeline: (entityType, entityId) =>
    client.get(`/audit-logs/${entityType}/${entityId}`).then((r) => r.data.data),
};
