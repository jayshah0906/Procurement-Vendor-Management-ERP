import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { quotationsApi } from '../../api/quotations.api';
import { approvalsApi } from '../../api/approvals.api';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/feedback/Skeleton';
import { CheckCircle } from '@phosphor-icons/react';

const fmt = (n) =>
  n != null ? Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '—';

export const ComparisonPage = () => {
  const [searchParams] = useSearchParams();
  const rfqId = searchParams.get('rfq_id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quotationData, isLoading } = useQuery({
    queryKey: ['quotations', { rfq_id: rfqId }],
    queryFn: () => quotationsApi.getQuotations({ rfq_id: rfqId }),
    enabled: !!rfqId,
  });

  const quotations = Array.isArray(quotationData) ? quotationData : quotationData?.items ?? [];

  // Find the lowest grand total for highlighting
  const lowestTotal = quotations.length > 0
    ? Math.min(...quotations.map((q) => Number(q.grand_total) || Infinity))
    : null;

  const approveMutation = useMutation({
    mutationFn: (quotation) =>
      approvalsApi.initiateApproval({
        entity_type: 'quotation',
        entity_id: quotation.id,
        approvers: [], // Will be configured per org approval matrix
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/erp/approvals');
    },
  });

  if (!rfqId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Compare Quotations</h1>
        <div className="p-12 text-center text-gray-400">
          <p>No RFQ selected. Navigate here from an RFQ to compare bids.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Compare Quotations</h1>
        <Button variant="outline" onClick={() => navigate('/erp/rfqs')}>Back to RFQs</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <p className="font-medium">No quotations received for this RFQ yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quotations.map((q) => {
            const isLowest = Number(q.grand_total) === lowestTotal;
            return (
              <Card key={q.id} className={isLowest ? 'ring-2 ring-[var(--color-royal-blue)]' : ''}>
                {isLowest && (
                  <div className="bg-[var(--color-royal-blue)] text-white text-center text-xs font-bold py-1 uppercase tracking-wide">
                    Lowest Price
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-gray-900 truncate">
                      {q.vendor?.company_name ?? 'Vendor'}
                    </h3>
                    <Badge variant={isLowest ? 'blue' : 'gray'}>{q.status?.replace('_', ' ')}</Badge>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Grand Total</p>
                      <p className={`text-2xl font-extrabold ${isLowest ? 'text-[var(--color-royal-blue)]' : 'text-gray-900'}`}>
                        {fmt(q.grand_total)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-3">
                      <div>
                        <p className="text-gray-500">Subtotal</p>
                        <p className="font-semibold">{fmt(q.subtotal)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Tax</p>
                        <p className="font-semibold">{fmt(q.tax_amount)}</p>
                      </div>
                    </div>
                    {q.notes && (
                      <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">{q.notes}</p>
                    )}
                  </div>
                  <Button
                    variant={isLowest ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => approveMutation.mutate(q)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle size={18} className="mr-2" />
                    {isLowest ? 'Approve & Initiate PO' : 'Select Vendor'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
