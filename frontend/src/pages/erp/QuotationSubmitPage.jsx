import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { rfqsApi } from '../../api/rfqs.api';
import { quotationsApi } from '../../api/quotations.api';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ApiErrorBanner } from '../../components/feedback/ApiErrorBanner';

const quoteItemSchema = z.object({
  rfq_item_id: z.string(),
  item_name: z.string(),
  quantity: z.number(),
  unit_price: z.number().min(0.01, 'Price must be greater than 0'),
  delivery_days: z.number().min(1, 'At least 1 day required'),
});

const quoteSchema = z.object({
  notes: z.string().optional(),
  items: z.array(quoteItemSchema),
});

const fmt = (n) => n != null ? Number(n).toLocaleString() : '0';

export const QuotationSubmitPage = () => {
  const { rfqId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rfq, isLoading, error } = useQuery({
    queryKey: ['rfqs', rfqId],
    queryFn: () => rfqsApi.getRfqById(rfqId),
    enabled: !!rfqId,
    retry: false,
  });

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(quoteSchema),
    values: rfq ? {
      notes: '',
      items: (rfq.rfq_items ?? rfq.items ?? []).map((item) => ({
        rfq_item_id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: 0,
        delivery_days: 7,
      })),
    } : undefined,
  });

  const { fields } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items') || [];

  const subtotal = watchedItems.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity) || 0), 0);
  const taxAmount = subtotal * 0.18; // 18% GST example
  const grandTotal = subtotal + taxAmount;

  const mutation = useMutation({
    mutationFn: (data) =>
      quotationsApi.createQuotation({
        rfq_id: rfqId,
        items: data.items,
        subtotal,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/erp/quotations');
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  const isForbidden = error?.response?.status === 403;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="p-8 rounded-xl bg-red-50 border border-red-200 max-w-lg mx-auto shadow-sm">
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-sm text-red-600 mb-6 font-medium">
            You are not invited to submit a quotation for this Request for Quotation (RFQ).
          </p>
          <Button variant="primary" onClick={() => navigate('/erp/rfqs')}>
            Return to RFQs
          </Button>
        </div>
      </div>
    );
  }

  if (!rfq || error) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-500">
        <p className="mb-4">RFQ not found or failed to load details.</p>
        <Button variant="outline" onClick={() => navigate('/erp/rfqs')}>Back to RFQs</Button>
      </div>
    );
  }

  const rfqItems = rfq.rfq_items ?? rfq.items ?? [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Submit Quotation</h1>

      <Card>
        <CardHeader title={`RFQ: ${rfq.title}`} className="bg-gray-50" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-500">Description</p>
              <p className="font-medium text-gray-900">{rfq.description || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Deadline</p>
              <p className="font-semibold text-gray-900">
                {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4 border-t border-gray-100">
            {mutation.isError && (
              <ApiErrorBanner error={mutation.error} fallback="Failed to submit quotation." />
            )}

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Your Bid for Each Item</h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-600">Item Name</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Qty & Unit</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 w-48">Unit Price (₹)</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 w-36">Delivery Days</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {fields.map((field, index) => {
                      const qty = Number(rfqItems[index]?.quantity ?? field.quantity) || 0;
                      const unitPrice = Number(watchedItems[index]?.unit_price) || 0;
                      const total = qty * unitPrice;

                      return (
                        <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900 font-medium align-middle">
                            {rfqItems[index]?.item_name ?? field.item_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600 align-middle whitespace-nowrap">
                            {qty} {rfqItems[index]?.unit ?? 'pcs'}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <input type="hidden" {...register(`items.${index}.rfq_item_id`)} />
                            <input type="hidden" {...register(`items.${index}.item_name`)} />
                            <input type="hidden" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                            <div>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] ${
                                  errors?.items?.[index]?.unit_price ? 'border-red-500' : 'border-gray-200'
                                }`}
                              />
                              {errors?.items?.[index]?.unit_price && (
                                <p className="text-red-500 text-xs mt-0.5">{errors.items[index].unit_price.message}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div>
                              <input
                                type="number"
                                min="1"
                                placeholder="7"
                                {...register(`items.${index}.delivery_days`, { valueAsNumber: true })}
                                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] ${
                                  errors?.items?.[index]?.delivery_days ? 'border-red-500' : 'border-gray-200'
                                }`}
                              />
                              {errors?.items?.[index]?.delivery_days && (
                                <p className="text-red-500 text-xs mt-0.5">{errors.items[index].delivery_days.message}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-semibold text-right align-middle whitespace-nowrap">
                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price Summary */}
            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (18%):</span>
                <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <Input label="Additional Notes (Optional)" {...register('notes')} placeholder="Any special terms or conditions..." />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/erp/quotations')}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={mutation.isPending}>
                {mutation.isPending ? 'Submitting...' : 'Submit Bid'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
