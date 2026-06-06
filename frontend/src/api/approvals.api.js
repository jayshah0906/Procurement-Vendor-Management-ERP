import client from './client';

export const approvalsApi = {
  /**
   * POST /approvals/initiate
   * Body: { entity_type, entity_id, approvers: [{ user_id, step_order, required }] }
   */
  initiateApproval: (data) =>
    client.post('/approvals/initiate', data).then((r) => r.data.data),

  /**
   * GET /approvals/:workflow_id — get a full workflow with steps
   */
  getWorkflow: (workflowId) =>
    client.get(`/approvals/${workflowId}`).then((r) => r.data.data),

  /**
   * POST /approvals/:workflow_id/steps/:step_id/action
   * Body: { action: 'approve' | 'reject', remarks: string }
   */
  executeStepAction: (workflowId, stepId, data) =>
    client.post(`/approvals/${workflowId}/steps/${stepId}/action`, data).then((r) => r.data.data),
};
