import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createQuotation } from '../../api/mockApi';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const quoteSchema = z.object({
  unitPrice: z.number().min(0.01, "Price must be greater than 0"),
  deliveryDays: z.number().min(1, "At least 1 day required"),
  notes: z.string().optional(),
});

export const QuotationsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(quoteSchema)
  });

  const mutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      navigate('/erp/dashboard');
    }
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Submit Quotation</h1>
      
      <Card>
        <CardHeader title="RFQ Reference: RFQ-2026-001" className="bg-gray-50" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-500">Title</p>
              <p className="font-semibold text-gray-900">New Laptops for Engineering</p>
            </div>
            <div>
              <p className="text-gray-500">Quantity Required</p>
              <p className="font-semibold text-gray-900">50 Units</p>
            </div>
            <div>
              <p className="text-gray-500">Deadline</p>
              <p className="font-semibold text-gray-900">June 15, 2026</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-6">
              <Input 
                label="Unit Price ($)" 
                type="number"
                step="0.01"
                {...register("unitPrice", { valueAsNumber: true })} 
                error={errors.unitPrice?.message} 
              />
              <Input 
                label="Estimated Delivery (Days)" 
                type="number"
                {...register("deliveryDays", { valueAsNumber: true })} 
                error={errors.deliveryDays?.message} 
              />
            </div>
            <Input 
              label="Additional Notes" 
              {...register("notes")} 
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/erp/dashboard')}>Cancel</Button>
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
