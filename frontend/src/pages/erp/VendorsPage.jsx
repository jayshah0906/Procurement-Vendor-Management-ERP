import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '../../api/vendors.api';
import { masterApi } from '../../api/master.api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { Funnel, Plus, CaretUp, CaretDown, X } from '@phosphor-icons/react';
import { ApiErrorBanner } from '../../components/feedback/ApiErrorBanner';

const vendorSchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  contact_person: z.string().min(2, 'Contact person is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  gst_number: z.string().min(5, 'Valid GST/Tax ID is required'),
  category_id: z.string().min(1, 'Category is required'),
});

const statusVariant = (status) => {
  const map = { active: 'blue', pending_approval: 'yellow', inactive: 'gray', blacklisted: 'red' };
  return map[status] || 'gray';
};

export const VendorsPage = () => {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: vendorData, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.getVendors(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: masterApi.getCategories,
  });

  const vendors = Array.isArray(vendorData) ? vendorData : vendorData?.items ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(vendorSchema),
  });

  const mutation = useMutation({
    mutationFn: vendorsApi.createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => vendorsApi.patchVendorStatus(id, 'active'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => vendorsApi.patchVendorStatus(id, 'rejected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (id) => vendorsApi.patchVendorStatus(id, 'blocked'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const columns = useMemo(() => [
    { header: 'Company Name', accessorKey: 'company_name' },
    { header: 'Category', accessorFn: (row) => row.category?.name ?? row.category ?? '—' },
    { header: 'GST Number', accessorKey: 'gst_number' },
    { header: 'Email', accessorKey: 'email' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        return <Badge variant={statusVariant(status)}>{status?.replace('_', ' ')}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const { id, status } = row.original;
        if (status === 'pending') {
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-200 hover:bg-green-50 text-xs px-2 py-1"
                onClick={() => approveMutation.mutate(id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1"
                onClick={() => rejectMutation.mutate(id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                Reject
              </Button>
            </div>
          );
        }
        if (status === 'active') {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-red-600 text-xs px-2 py-1"
              onClick={() => blockMutation.mutate(id)}
              disabled={blockMutation.isPending}
            >
              Block
            </Button>
          );
        }
        if (status === 'blocked') {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-700 text-xs px-2 py-1"
              onClick={() => approveMutation.mutate(id)}
              disabled={approveMutation.isPending}
            >
              Unblock
            </Button>
          );
        }
        return null;
      },
    },
  ], [approveMutation, rejectMutation, blockMutation]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: vendors,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <div className="flex gap-3">
          <Button variant="outline"><Funnel size={18} className="mr-2" /> Filter</Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="mr-2" /> Add Vendor
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} cols={5} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: <CaretUp weight="bold" />, desc: <CaretDown weight="bold" /> }[header.column.getIsSorted()] ?? null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400 text-sm">
                        No vendors found. Add your first vendor to get started.
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Register New Vendor</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {mutation.isError && (
                <ApiErrorBanner error={mutation.error} fallback="Failed to create vendor." />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input label="Company Name" placeholder="Tech Supplies Inc." {...register('company_name')} error={errors.company_name?.message} />
                </div>
                <Input label="Contact Person" placeholder="Jane Smith" {...register('contact_person')} error={errors.contact_person?.message} />
                <Input label="Email" type="email" placeholder="vendor@example.com" {...register('email')} error={errors.email?.message} />
                <Input label="Phone" placeholder="+91 98765 43210" {...register('phone')} error={errors.phone?.message} />
                <Input label="GST / Tax ID" placeholder="GSTIN123..." {...register('gst_number')} error={errors.gst_number?.message} />
              </div>
              <Input label="Address" placeholder="123 Main St, City, State" {...register('address')} error={errors.address?.message} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  {...register('category_id')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : 'Register Vendor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
