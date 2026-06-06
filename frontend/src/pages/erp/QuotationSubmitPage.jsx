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

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfqs', rfqId],
    queryFn: () => rfqsApi.getRfqById(rfqId),
    enabled: !!rfqId,
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

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="text-center py-12 text-gray-500">RFQ not found.</div>
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
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {mutation.error?.response?.data?.error || 'Failed to submit quotation.'}
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Your Bid for Each Item</h4>
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex justify-between mb-3">
                    <p className="font-medium text-gray-900">{rfqItems[index]?.item_name ?? field.item_name}</p>
                    <p className="text-sm text-gray-500">Required: {fmt(rfqItems[index]?.quantity)} {rfqItems[index]?.unit}</p>
                  </div>
                  <input type="hidden" {...register(`items.${index}.rfq_item_id`)} />
                  <input type="hidden" {...register(`items.${index}.item_name`)} />
                  <input type="hidden" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Unit Price (₹)"
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                      error={errors?.items?.[index]?.unit_price?.message}
                    />
                    <Input
                      label="Delivery Days"
                      type="number"
                      min="1"
                      {...register(`items.${index}.delivery_days`, { valueAsNumber: true })}
                      error={errors?.items?.[index]?.delivery_days?.message}
                    />
                  </div>
                </div>
              ))}
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
