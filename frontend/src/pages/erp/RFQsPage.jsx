import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rfqsApi } from '../../api/rfqs.api';
import { vendorsApi } from '../../api/vendors.api';
import { useAuthStore } from '../../store/authStore';
import { masterApi } from '../../api/master.api';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { Plus, Trash, X, FileText, Users, ChartBar } from '@phosphor-icons/react';
import { ApiErrorBanner } from '../../components/feedback/ApiErrorBanner';

const rfqSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  category_id: z.string().min(1, 'Category is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  items: z.array(z.object({
    item_name: z.string().min(1, 'Item name is required'),
    description: z.string().optional(),
    quantity: z.number().min(1, 'Must be at least 1'),
    unit: z.string().min(1, 'Unit is required'),
    estimated_unit_price: z.number().min(0, 'Price must be >= 0'),
  })).min(1, 'At least one item is required'),
});

const statusVariant = (status) => {
  const map = { published: 'blue', draft: 'gray', closed: 'red', approved: 'green', awarded: 'green', converted_to_po: 'green', cancelled: 'gray' };
  return map[status] || 'gray';
};

export const RFQsPage = () => {
  const { user } = useAuthStore();
  const isVendor = user?.role === 'Vendor';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inviteRFQ, setInviteRFQ] = useState(null); // rfq object to invite for
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  const { data: rfqData, isLoading } = useQuery({
    queryKey: ['rfqs'],
    queryFn: () => rfqsApi.getRfqs(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: masterApi.getCategories,
  });

  const { data: vendorData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.getVendors({ status: 'active' }),
    enabled: !!inviteRFQ,
  });

  const rfqs = Array.isArray(rfqData) ? rfqData : rfqData?.items ?? [];
  const vendors = Array.isArray(vendorData) ? vendorData : vendorData?.items ?? [];

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      items: [{ item_name: '', description: '', quantity: 1, unit: 'pcs', estimated_unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const deadline = new Date(data.deadline).toISOString();
      return rfqsApi.createRfq({ ...data, deadline });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      setIsCreateOpen(false);
      reset();
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id) => rfqsApi.patchRfqStatus(id, 'published'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rfqs'] }),
  });

  const closeMutation = useMutation({
    mutationFn: (id) => rfqsApi.patchRfqStatus(id, 'closed'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rfqs'] }),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ rfqId, vendor_ids }) => rfqsApi.inviteVendors(rfqId, vendor_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      setInviteRFQ(null);
      setSelectedVendorIds([]);
    },
  });

  const toggleVendor = (id) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const onSubmit = (data) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Requests for Quotation</h1>
        {!isVendor && (
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} className="mr-2" /> Create RFQ
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={6} /></div>
          ) : rfqs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No RFQs yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first RFQ to start receiving vendor quotations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Deadline</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Invited</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium">{rfq.title}</td>
                      <td className="px-6 py-4 text-gray-600">{rfq.category?.name ?? rfq.category ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {rfq.invited_vendors && rfq.invited_vendors.length > 0 ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-help"
                            title={rfq.invited_vendors.join(', ')}
                          >
                            {rfq.invited_vendors.length} Invited
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(rfq.status)}>{rfq.status?.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {isVendor ? (
                            rfq.status === 'published' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => navigate(`/erp/quotations/submit/${rfq.id}`)}
                              >
                                Submit Quote
                              </Button>
                            )
                          ) : (
                            <>
                              {rfq.status === 'draft' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => publishMutation.mutate(rfq.id)}
                                  disabled={publishMutation.isPending}
                                >
                                  Publish
                                </Button>
                              )}
                              {rfq.status === 'published' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setInviteRFQ(rfq); setSelectedVendorIds([]); }}
                                  >
                                    <Users size={14} className="mr-1" /> Invite Vendors
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:bg-red-50"
                                    onClick={() => closeMutation.mutate(rfq.id)}
                                    disabled={closeMutation.isPending}
                                  >
                                    Close
                                  </Button>
                                </>
                              )}
                              {(rfq.status === 'published' || rfq.status === 'closed' || rfq.status === 'approved' || rfq.status === 'awarded') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[var(--color-royal-blue)]"
                                  onClick={() => navigate(`/erp/compare?rfq_id=${rfq.id}`)}
                                >
                                  <ChartBar size={14} className="mr-1" /> Compare Bids
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Vendors Modal */}
      {inviteRFQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invite Vendors</h2>
                <p className="text-sm text-gray-500 mt-1">RFQ: {inviteRFQ.title}</p>
              </div>
              <button onClick={() => setInviteRFQ(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {vendors.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No active vendors found. Add vendors first.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-3">Select vendors to invite to this RFQ:</p>
                  {vendors.map((v) => (
                    <label
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedVendorIds.includes(v.id)
                          ? 'border-[var(--color-royal-blue)] bg-[var(--color-pale-blue)]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedVendorIds.includes(v.id)}
                        onChange={() => toggleVendor(v.id)}
                        className="accent-[var(--color-royal-blue)]"
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{v.company_name}</p>
                        <p className="text-xs text-gray-500">{v.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {inviteMutation.isError && (
              <div className="mx-6 mb-4">
                <ApiErrorBanner error={inviteMutation.error} fallback="Failed to invite vendors." />
              </div>
            )}
            <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="ghost" onClick={() => setInviteRFQ(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => inviteMutation.mutate({ rfqId: inviteRFQ.id, vendor_ids: selectedVendorIds })}
                disabled={selectedVendorIds.length === 0 || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Inviting...' : `Invite ${selectedVendorIds.length > 0 ? `(${selectedVendorIds.length})` : ''} Vendors`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create RFQ Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create Request for Quotation</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {createMutation.isError && (
                <ApiErrorBanner error={createMutation.error} fallback="Failed to create RFQ." />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-2">
                  <Input label="RFQ Title" placeholder="e.g. Q3 Office Supplies" {...register('title')} error={errors.title?.message} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder="Describe the procurement requirement..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)] resize-none"
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    {...register('category_id')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-royal-blue)]"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
                </div>
                <Input label="Submission Deadline" type="date" {...register('deadline')} error={errors.deadline?.message} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700">Line Items</h4>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => append({ item_name: '', description: '', quantity: 1, unit: 'pcs', estimated_unit_price: 0 })}>
                    <Plus size={16} className="mr-1" /> Add Item
                  </Button>
                </div>
                {errors.items?.root && <p className="text-sm text-red-500 mb-2">{errors.items.root.message}</p>}
                <div className="space-y-3">
                  {fields.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <Input placeholder="Item name" {...register(`items.${index}.item_name`)} error={errors?.items?.[index]?.item_name?.message} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min="1" placeholder="Qty" {...register(`items.${index}.quantity`, { valueAsNumber: true })} error={errors?.items?.[index]?.quantity?.message} />
                      </div>
                      <div className="col-span-2">
                        <Input placeholder="Unit" {...register(`items.${index}.unit`)} error={errors?.items?.[index]?.unit?.message} />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" min="0" placeholder="Est. price" {...register(`items.${index}.estimated_unit_price`, { valueAsNumber: true })} error={errors?.items?.[index]?.estimated_unit_price?.message} />
                      </div>
                      <div className="col-span-1 pt-1">
                        <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-50 p-2"
                          onClick={() => remove(index)} disabled={fields.length === 1}>
                          <Trash size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create RFQ (Draft)'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
