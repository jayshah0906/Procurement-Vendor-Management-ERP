import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { quotationsApi } from '../../api/quotations.api';
import { approvalsApi } from '../../api/approvals.api';
import { purchaseOrdersApi } from '../../api/purchaseOrders.api';
import { rfqsApi } from '../../api/rfqs.api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/feedback/Skeleton';
import { CheckCircle, ShoppingCart, X } from '@phosphor-icons/react';

const fmt = (n) =>
  n != null ? Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '—';

export const ComparisonPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rfqId = searchParams.get('rfq_id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [poModal, setPoModal] = useState(null); // quotation object for PO
  const [poNotes, setPoNotes] = useState('');

  // Fetch all RFQs for the selector
  const { data: rfqData } = useQuery({
    queryKey: ['rfqs'],
    queryFn: () => rfqsApi.getRfqs(),
  });
  const rfqs = Array.isArray(rfqData) ? rfqData : rfqData?.items ?? [];
  const selectableRfqs = rfqs.filter((r) => ['published', 'closed', 'approved', 'awarded'].includes(r.status));

  const { data: quotationData, isLoading } = useQuery({
    queryKey: ['quotations', { rfq_id: rfqId }],
    queryFn: () => quotationsApi.getQuotations({ rfq_id: rfqId }),
    enabled: !!rfqId,
  });

  const quotations = Array.isArray(quotationData) ? quotationData : quotationData?.items ?? [];

  const lowestTotal = quotations.length > 0
    ? Math.min(...quotations.map((q) => Number(q.grand_total) || Infinity))
    : null;

  const approveMutation = useMutation({
    mutationFn: (quotation) =>
      approvalsApi.initiateApproval({
        entity_type: 'quotation',
        entity_id: quotation.id,
        approvers: [], // Auto-approved when no approvers configured
      }),
    onSuccess: (data, quotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      // Open PO creation modal immediately after initiating approval
      setPoModal(quotation);
    },
  });

  const createPoMutation = useMutation({
    mutationFn: ({ quotation_id, notes }) =>
      purchaseOrdersApi.createPurchaseOrder({ quotation_id, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      setPoModal(null);
      setPoNotes('');
      navigate('/erp/orders');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Compare Quotations</h1>
        <Button variant="outline" onClick={() => navigate('/erp/rfqs')}>Back to RFQs</Button>
      </div>

      {/* RFQ Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Select RFQ to Compare:</label>
        <select
          value={rfqId || ''}
          onChange={(e) => {
            if (e.target.value) setSearchParams({ rfq_id: e.target.value });
            else setSearchParams({});
          }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)]"
        >
          <option value="">-- Select an RFQ --</option>
          {selectableRfqs.map((rfq) => (
            <option key={rfq.id} value={rfq.id}>
              {rfq.title} ({rfq.status})
            </option>
          ))}
        </select>
      </div>

      {!rfqId ? (
        <div className="p-12 text-center text-gray-400">
          <p className="font-medium">Select an RFQ above to compare vendor bids.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <p className="font-medium">No quotations received for this RFQ yet.</p>
          <p className="text-sm mt-2">Make sure vendors have been invited and have submitted their bids.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quotations.map((q) => {
            const isLowest = Number(q.grand_total) === lowestTotal;
            const isSelected = q.status === 'selected' || q.status === 'accepted';
            return (
              <Card key={q.id} className={`${isLowest ? 'ring-2 ring-[var(--color-royal-blue)]' : ''} ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
                {isLowest && !isSelected && (
                  <div className="bg-[var(--color-royal-blue)] text-white text-center text-xs font-bold py-1 uppercase tracking-wide">
                    ⭐ Lowest Price
                  </div>
                )}
                {isSelected && (
                  <div className="bg-green-500 text-white text-center text-xs font-bold py-1 uppercase tracking-wide">
                    ✓ Selected
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
                    {/* Items breakdown */}
                    {(q.items ?? []).length > 0 && (
                      <div className="border-t border-gray-100 pt-3 space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                        {(q.items ?? []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-600">
                            <span>{item.item_name} × {item.quantity}</span>
                            <span className="font-medium">{fmt(item.unit_price)}/unit</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isSelected && q.status !== 'rejected' && (
                    <Button
                      variant={isLowest ? 'primary' : 'outline'}
                      className="w-full"
                      onClick={() => approveMutation.mutate(q)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle size={18} className="mr-2" />
                      {isLowest ? 'Award & Create PO' : 'Select Vendor'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create PO Modal */}
      {poModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Generate Purchase Order</h2>
                <p className="text-sm text-gray-500 mt-1">Vendor: {poModal.vendor?.company_name}</p>
              </div>
              <button onClick={() => setPoModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Vendor</span>
                  <span className="font-semibold">{poModal.vendor?.company_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Grand Total</span>
                  <span className="font-bold text-[var(--color-royal-blue)]">{fmt(poModal.grand_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quotation ID</span>
                  <span className="font-mono text-xs">{poModal.id?.slice(0, 12)}…</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Terms (optional)</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Payment within 30 days. Delivery to warehouse A."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] resize-none"
                />
              </div>
              {createPoMutation.isError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {createPoMutation.error?.response?.data?.error || 'Failed to create purchase order.'}
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="ghost" onClick={() => setPoModal(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => createPoMutation.mutate({ quotation_id: poModal.id, notes: poNotes })}
                disabled={createPoMutation.isPending}
              >
                <ShoppingCart size={18} className="mr-2" />
                {createPoMutation.isPending ? 'Creating PO...' : 'Generate Purchase Order'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
