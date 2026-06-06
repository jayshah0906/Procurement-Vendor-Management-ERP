import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { invoicesApi } from '../../api/invoices.api';
import { purchaseOrdersApi } from '../../api/purchaseOrders.api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { FilePdf, CreditCard, Plus, X, Receipt } from '@phosphor-icons/react';

const invoiceSchema = z.object({
  purchase_order_id: z.string().min(1, 'Purchase order is required'),
  invoice_number: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  subtotal: z.number().min(0, 'Subtotal must be >= 0'),
  cgst: z.number().min(0).default(0),
  sgst: z.number().min(0).default(0),
  igst: z.number().min(0).default(0),
  grand_total: z.number().min(0, 'Grand total must be >= 0'),
  notes: z.string().optional(),
});

const statusVariant = (status) => {
  const map = { paid: 'green', overdue: 'red', pending: 'yellow', approved: 'blue', cancelled: 'gray' };
  return map[status?.toLowerCase()] || 'gray';
};

const fmt = (n) =>
  n != null ? Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '—';

export const InvoicesPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();
  const isManager = user?.role === 'Procurement Manager';

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.getInvoices(),
  });

  const { data: poData } = useQuery({
    queryKey: ['purchase-orders', { status: 'accepted' }],
    queryFn: () => purchaseOrdersApi.getPurchaseOrders({ status: 'accepted' }),
    enabled: isModalOpen,
  });

  const invoices = Array.isArray(invoiceData) ? invoiceData : invoiceData?.items ?? [];
  const openPOs = Array.isArray(poData) ? poData : poData?.items ?? [];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { cgst: 0, sgst: 0, igst: 0 },
  });

  const watchedSubtotal = watch('subtotal') || 0;
  const watchedCGST = watch('cgst') || 0;
  const watchedSGST = watch('sgst') || 0;
  const watchedIGST = watch('igst') || 0;
  const computedGrandTotal = Number(watchedSubtotal) + Number(watchedCGST) + Number(watchedSGST) + Number(watchedIGST);

  const createMutation = useMutation({
    mutationFn: invoicesApi.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const payMutation = useMutation({
    mutationFn: (id) => invoicesApi.markPaid(id, new Date().toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });

  const onSubmit = (data) => createMutation.mutate({ ...data, grand_total: computedGrandTotal });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Billing</h1>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" /> Create Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={4} cols={5} /></div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No invoices yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Grand Total</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium">{invoice.invoice_number}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {invoice.vendor?.company_name ?? invoice.purchase_order?.vendor?.company_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-bold">{fmt(invoice.grand_total)}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[var(--color-royal-blue)]">
                          <FilePdf size={20} />
                        </Button>
                        {invoice.status !== 'paid' && isManager && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => payMutation.mutate(invoice.id)}
                            disabled={payMutation.isPending}
                          >
                            <CreditCard size={16} className="mr-1" /> Pay
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {createMutation.isError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {createMutation.error?.response?.data?.error || 'Failed to create invoice.'}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order</label>
                <select {...register('purchase_order_id')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)]">
                  <option value="">Select a PO</option>
                  {openPOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number || po.id.slice(0, 8)} — {po.vendor?.company_name}
                    </option>
                  ))}
                </select>
                {errors.purchase_order_id && <p className="text-red-500 text-xs mt-1">{errors.purchase_order_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Invoice Number" placeholder="INV-2026-001" {...register('invoice_number')} error={errors.invoice_number?.message} />
                <Input label="Invoice Date" type="date" {...register('invoice_date')} error={errors.invoice_date?.message} />
                <Input label="Due Date" type="date" {...register('due_date')} error={errors.due_date?.message} />
                <Input label="Subtotal (₹)" type="number" step="0.01" {...register('subtotal', { valueAsNumber: true })} error={errors.subtotal?.message} />
                <Input label="CGST (₹)" type="number" step="0.01" {...register('cgst', { valueAsNumber: true })} error={errors.cgst?.message} />
                <Input label="SGST (₹)" type="number" step="0.01" {...register('sgst', { valueAsNumber: true })} error={errors.sgst?.message} />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-700">Grand Total:</span>
                <span className="font-bold text-gray-900">{fmt(computedGrandTotal)}</span>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
