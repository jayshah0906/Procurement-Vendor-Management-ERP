import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseOrdersApi } from '../../api/purchaseOrders.api';
import { printDocument } from '../../utils/print';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ArrowLeft, ShoppingCart, DownloadSimple } from '@phosphor-icons/react';

const statusVariant = (status) => {
  const map = { generated: 'yellow', sent: 'blue', accepted: 'green', rejected: 'red', completed: 'green', cancelled: 'gray' };
  return map[status] || 'gray';
};

const fmt = (n) =>
  n != null ? Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '—';

export const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => purchaseOrdersApi.getPurchaseOrderById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-12 text-center text-gray-400">
        <p>Purchase Order not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/erp/orders')}>Back to List</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/erp/orders')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={28} className="text-[var(--color-royal-blue)]" />
            PO: {po.po_number || po.id.slice(0, 8)}
          </h1>
          <Badge variant={statusVariant(po.status)} className="ml-2">{po.status?.replace('_', ' ')}</Badge>
        </div>
        <Button
          variant="outline"
          onClick={() => printDocument(`Purchase Order: ${po.po_number || po.id.slice(0, 8)}`, {
            vendor_name: po.vendor?.company_name || '—',
            gst_number: po.vendor?.gst_number || '—',
            email: po.vendor?.email || '—',
            doc_number: po.po_number || po.id.slice(0, 8),
            date: po.created_at ? new Date(po.created_at).toLocaleDateString() : '—',
            status: po.status,
            total_amount: po.total_amount
          }, po.po_items || [])}
        >
          <DownloadSimple size={18} className="mr-2" /> Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Vendor Details" />
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Company Name</p>
              <p className="font-semibold text-gray-900">{po.vendor?.company_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact Person</p>
              <p className="text-gray-900">{po.vendor?.contact_person || '—'} ({po.vendor?.email})</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="text-gray-900">{po.vendor?.address || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">GST Number</p>
              <p className="font-mono text-gray-900">{po.vendor?.gst_number || '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Order Summary" />
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-3xl font-extrabold text-[var(--color-royal-blue)]">{fmt(po.total_amount)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Delivery Date</p>
                <p className="text-gray-900 font-medium">{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="text-gray-900">{po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            {po.terms && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500">Terms & Conditions</p>
                <p className="text-sm text-gray-600 italic">{po.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Order Items" />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-600 uppercase">Item</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 uppercase text-right">Quantity</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 uppercase text-right">Unit Price</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 uppercase text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.po_items?.length > 0 ? po.po_items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.item_name}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{fmt(item.unit_price)}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(item.total_price)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No items found for this order.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
