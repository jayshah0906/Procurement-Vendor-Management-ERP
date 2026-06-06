import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { purchaseOrdersApi } from '../../api/purchaseOrders.api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { ShoppingCart, PaperPlaneRight } from '@phosphor-icons/react';

const statusVariant = (status) => {
  const map = {
    generated: 'yellow',
    sent: 'blue',
    accepted: 'green',
    rejected: 'red',
    completed: 'green',
    cancelled: 'gray',
  };
  return map[status] || 'gray';
};

const fmt = (n) =>
  n != null ? Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '—';

export const PurchaseOrdersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: poData, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.getPurchaseOrders(),
  });

  const pos = Array.isArray(poData) ? poData : poData?.items ?? [];

  const sendMutation = useMutation({
    mutationFn: (id) => purchaseOrdersApi.patchPurchaseOrderStatus(id, 'sent'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>
          ) : pos.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No purchase orders yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Purchase orders are generated automatically when a quotation is approved.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">PO Number</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pos.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium font-mono text-xs">
                        {po.po_number || po.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {po.vendor?.company_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-bold">{fmt(po.total_amount)}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(po.status)}>{po.status?.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {po.status === 'generated' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendMutation.mutate(po.id)}
                            disabled={sendMutation.isPending}
                          >
                            <PaperPlaneRight size={16} className="mr-1" /> Send to Vendor
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--color-royal-blue)]"
                          onClick={() => navigate(`/erp/orders/${po.id}`)}
                        >
                          View
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
};
