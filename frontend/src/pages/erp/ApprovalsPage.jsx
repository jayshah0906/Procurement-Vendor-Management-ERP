import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { approvalsApi } from '../../api/approvals.api';
import { ApiErrorBanner } from '../../components/feedback/ApiErrorBanner';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { CheckCircle, XCircle, ArrowRight, CheckSquareOffset } from '@phosphor-icons/react';
import { useAuthStore } from '../../store/authStore';

const statusVariant = (status) => {
  const map = { approved: 'green', rejected: 'red', pending: 'yellow' };
  return map[status?.toLowerCase()] || 'gray';
};

const entityLabel = (type) => {
  const map = { quotation: 'Quotation', po: 'Purchase Order', vendor: 'Vendor' };
  return map[type] || type?.toUpperCase();
};

export const ApprovalsPage = () => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id;
  const [actionType, setActionType] = useState(null);

  // List all workflows if no specific ID is provided
  const { data: workflowsData, isLoading: loadingList } = useQuery({
    queryKey: ['approvals-list'],
    queryFn: () => approvalsApi.listWorkflows({}),
    enabled: !workflowId,
  });

  // Get specific workflow if ID is provided
  const { data: workflow, isLoading: loadingWorkflow } = useQuery({
    queryKey: ['approvals', workflowId],
    queryFn: () => approvalsApi.getWorkflow(workflowId),
    enabled: !!workflowId,
  });

  const actionMutation = useMutation({
    mutationFn: ({ stepId, action, remarks }) =>
      approvalsApi.executeStepAction(workflowId, stepId, { action, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });

  const workflows = Array.isArray(workflowsData) ? workflowsData : workflowsData?.items ?? [];

  // ==========================================
  // LIST VIEW
  // ==========================================
  if (!workflowId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <Card>
          <CardContent className="p-0">
            {loadingList ? (
              <div className="p-6"><TableSkeleton rows={4} cols={5} /></div>
            ) : workflows.length === 0 ? (
              <div className="p-12 text-center">
                <CheckSquareOffset size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No pending approvals</p>
                <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Entity Type</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Entity ID</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {workflows.map((wf) => (
                      <tr key={wf.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {entityLabel(wf.entity_type)}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                          {wf.entity_id?.slice(0, 8)}…
                        </td>
                        <td className="px-6 py-4 text-gray-600">Level {wf.current_level}</td>
                        <td className="px-6 py-4">
                          <Badge variant={statusVariant(wf.status)}>{wf.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/erp/approvals?id=${wf.id}`)}
                          >
                            View Details <ArrowRight size={14} className="ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // DETAIL VIEW
  // ==========================================
  if (loadingWorkflow) {
    return (
      <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded-lg"></div>
          <div className="h-24 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center bg-white rounded-xl border border-gray-100 shadow-sm text-gray-500">
        Workflow not found.
        <br />
        <Button variant="outline" className="mt-4" onClick={() => navigate('/erp/approvals')}>
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/erp/approvals')} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} className="rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Approval Workflow: {entityLabel(workflow.entity_type)}
        </h1>
        <Badge variant={statusVariant(workflow.status)} className="ml-auto text-sm py-1 px-3">
          {workflow.status?.toUpperCase()}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-6 border-b border-gray-100 bg-gray-50 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Entity ID</p>
              <p className="font-mono font-medium text-gray-900">{workflow.entity_id}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Current Level</p>
              <p className="font-medium text-gray-900">Level {workflow.current_level}</p>
            </div>
          </div>

          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Approval Chain</h3>
            <div className="space-y-6">
              {(workflow.approval_steps || []).map((step, index) => {
                const isCurrentPending = step.status === 'pending' && step.level_no === workflow.current_level;
                const canAct = isCurrentPending && step.approver_id === currentUserId;

                return (
                  <div key={step.id} className="relative pl-8">
                    {/* Timeline connector */}
                    {index !== workflow.approval_steps.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-gray-100"></div>
                    )}
                    
                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center
                      ${step.status === 'approved' ? 'bg-green-100 text-green-600' : 
                        step.status === 'rejected' ? 'bg-red-100 text-red-600' : 
                        isCurrentPending ? 'bg-blue-100 text-[var(--color-royal-blue)] ring-4 ring-blue-50' : 
                        'bg-gray-100 text-gray-400'}`}
                    >
                      {step.status === 'approved' ? <CheckCircle size={14} weight="fill" /> :
                       step.status === 'rejected' ? <XCircle size={14} weight="fill" /> :
                       <span className="text-xs font-bold">{step.level_no}</span>}
                    </div>

                    <div className={`p-4 rounded-xl border ${canAct ? 'border-[var(--color-royal-blue)] bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {step.users ? `${step.users.first_name} ${step.users.last_name}` : 'Unknown Approver'}
                          </p>
                          <p className="text-xs text-gray-500">{step.users?.email}</p>
                        </div>
                        <Badge variant={statusVariant(step.status)}>{step.status}</Badge>
                      </div>

                      {step.remarks && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                          "{step.remarks}"
                        </div>
                      )}

                      {canAct && (
                        <div className="mt-4 pt-4 border-t border-blue-100">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const remarks = e.target.remarks.value;
                              const action = actionType;
                              if (!action) return;
                              actionMutation.mutate({ stepId: step.id, action, remarks });
                            }}
                          >
                            <textarea
                              name="remarks"
                              rows={2}
                              placeholder="Add a comment... (optional)"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] mb-3"
                            />
                            <div className="flex gap-3">
                              <Button
                                type="submit"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setActionType('reject')}
                                disabled={actionMutation.isPending}
                              >
                                Reject
                              </Button>
                              <Button
                                type="submit"
                                variant="primary"
                                onClick={() => setActionType('approve')}
                                disabled={actionMutation.isPending}
                              >
                                Approve
                              </Button>
                            </div>
                            {actionMutation.isError && (
                              <div className="mt-3">
                                <ApiErrorBanner error={actionMutation.error} fallback="Failed to submit approval action." />
                              </div>
                            )}
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
