import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoices, createInvoice } from '../../api/mockApi';
import { useMockDatabase } from '../../store/mockDatabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { FilePdf, CreditCard, Plus, X } from '@phosphor-icons/react';

const invoiceSchema = z.object({
  vendor: z.string().min(2, "Vendor name is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

export const InvoicesPage = () => {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const approveInvoice = useMockDatabase((state) => state.approveInvoice);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceSchema)
  });

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsModalOpen(false);
      reset();
    }
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  const handlePay = (id) => {
    approveInvoice(id);
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  };

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
            <div className="p-6">
              <TableSkeleton rows={4} cols={5} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices?.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium">{invoice.id}</td>
                      <td className="px-6 py-4 text-gray-700">{invoice.vendor}</td>
                      <td className="px-6 py-4 text-gray-900 font-bold">{invoice.amount}</td>
                      <td className="px-6 py-4 text-gray-700">{invoice.dueDate}</td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          invoice.status === 'Paid' ? 'green' : 
                          invoice.status === 'Overdue' ? 'red' : 'yellow'
                        }>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[var(--color-royal-blue)]">
                          <FilePdf size={20} />
                        </Button>
                        {invoice.status !== 'Paid' && (
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => handlePay(invoice.id)}>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <Input label="Vendor Name" placeholder="Tech Supplies Inc." {...register("vendor")} error={errors.vendor?.message} />
              <Input label="Total Amount" placeholder="$1,500.00" {...register("amount")} error={errors.amount?.message} />
              <Input label="Due Date" type="date" {...register("dueDate")} error={errors.dueDate?.message} />
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
