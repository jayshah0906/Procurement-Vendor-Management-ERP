import client from './client';

export const approvalsApi = {
  /**
   * GET /approvals — list all approval workflows for the org
   * @param {object} params - { status: 'pending' | 'approved' | 'rejected' }
   */
  listWorkflows: (params) =>
    client.get('/approvals', { params }).then((r) => r.data.data),

  /**
   * POST /approvals/initiate
   * Body: { entity_type, entity_id, approvers: [{ approver_id, level_no }] }
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
