import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Plus, Trash } from '@phosphor-icons/react';

const rfqSchema = z.object({
  title: z.string().min(3, "Title is required"),
  deadline: z.string().min(1, "Deadline is required"),
  items: z.array(z.object({
    name: z.string().min(1, "Item name is required"),
    quantity: z.number().min(1, "Must be at least 1"),
  })).min(1, "At least one item is required"),
});

export const RFQsPage = () => {
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      items: [{ name: '', quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const onSubmit = (data) => {
    console.log("RFQ Submitted:", data);
    alert("RFQ Created Successfully!");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Create Request for Quotation (RFQ)</h1>
      
      <Card>
        <CardHeader title="RFQ Details" />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="RFQ Title" 
                placeholder="e.g., Q3 Office Supplies" 
                {...register("title")} 
                error={errors.title?.message} 
              />
              <Input 
                label="Submission Deadline" 
                type="date" 
                {...register("deadline")} 
                error={errors.deadline?.message} 
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-700">Line Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1 })}>
                  <Plus size={16} className="mr-1" /> Add Item
                </Button>
              </div>

              {errors.items?.root?.message && (
                <p className="text-sm text-red-500 mb-2">{errors.items.root.message}</p>
              )}

              <div className="space-y-3">
                {fields.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="flex-1">
                      <Input 
                        placeholder="Item Description" 
                        {...register(`items.${index}.name`)} 
                        error={errors?.items?.[index]?.name?.message}
                      />
                    </div>
                    <div className="w-32">
                      <Input 
                        type="number" 
                        min="1"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
                        error={errors?.items?.[index]?.quantity?.message}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="text-red-500 hover:bg-red-50 hover:text-red-600 mt-1"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash size={20} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <Button type="button" variant="ghost">Cancel</Button>
              <Button type="submit" variant="primary">Publish RFQ</Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};
