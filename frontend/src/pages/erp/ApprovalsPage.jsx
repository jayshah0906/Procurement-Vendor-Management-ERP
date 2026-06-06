import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { approvalsApi } from '../../api/approvals.api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/feedback/Skeleton';
import { CheckCircle, XCircle, Clock } from '@phosphor-icons/react';
import { useState } from 'react';

const stepStatusIcon = (status) => {
  if (status === 'approved') return <CheckCircle size={24} weight="fill" className="text-green-500" />;
  if (status === 'rejected') return <XCircle size={24} weight="fill" className="text-red-500" />;
  if (status === 'pending') return <Clock size={24} weight="fill" className="text-yellow-500" />;
  return <div className="w-4 h-4 rounded-full bg-gray-200 border-2 border-white" />;
};

export const ApprovalsPage = () => {
  const { workflowId } = useParams();
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState('');

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['approvals', workflowId],
    queryFn: () => approvalsApi.getWorkflow(workflowId),
    enabled: !!workflowId,
  });

  const actionMutation = useMutation({
    mutationFn: ({ stepId, action }) =>
      approvalsApi.executeStepAction(workflowId, stepId, { action, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      setRemarks('');
    },
  });

  if (!workflowId) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <p>Navigate to a specific approval workflow to review it.</p>
            <p className="text-sm mt-2">Approval requests will appear here when initiated from the Comparison page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">
        Workflow not found.
      </div>
    );
  }

  const pendingStep = workflow.steps?.find((s) => s.status === 'pending');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Approval Workflow</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {workflow.entity_type?.toUpperCase()}: {workflow.entity_id?.slice(0, 8)}…
              </h2>
              <p className="text-gray-500">
                Status: <span className="font-semibold capitalize">{workflow.status}</span>
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-gray-700 mb-4">Approval Steps</h3>
            <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-4">
              {(workflow.steps ?? []).map((step, i) => (
                <div key={step.id} className={`relative pl-8 ${step.status === 'pending' && i > 0 && workflow.steps[i - 1]?.status !== 'approved' ? 'opacity-40' : ''}`}>
                  <span className="absolute -left-3 top-0 bg-white">
                    {stepStatusIcon(step.status)}
                  </span>
                  <p className="font-semibold text-gray-900">Step {step.step_order}</p>
                  {step.status === 'approved' && step.acted_at && (
                    <p className="text-sm text-gray-500">Approved on {new Date(step.acted_at).toLocaleDateString()}</p>
                  )}
                  {step.status === 'rejected' && (
                    <p className="text-sm text-red-600">Rejected — {step.remarks || 'No remarks'}</p>
                  )}
                  {step.status === 'pending' && (
                    <p className="text-sm text-yellow-600">Awaiting review</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {pendingStep && workflow.status === 'pending' && (
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="Add a comment for this decision..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] resize-none"
                />
              </div>
              {actionMutation.isError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {actionMutation.error?.response?.data?.error || 'Action failed.'}
                </div>
              )}
              <div className="flex gap-4">
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => actionMutation.mutate({ stepId: pendingStep.id, action: 'reject' })}
                  disabled={actionMutation.isPending}
                >
                  <XCircle size={20} className="mr-2" /> Reject
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => actionMutation.mutate({ stepId: pendingStep.id, action: 'approve' })}
                  disabled={actionMutation.isPending}
                >
                  <CheckCircle size={20} className="mr-2" /> Approve
                </Button>
              </div>
            </div>
          )}

          {workflow.status !== 'pending' && (
            <div className={`text-center py-4 rounded-lg font-semibold ${workflow.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              This workflow has been {workflow.status}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
