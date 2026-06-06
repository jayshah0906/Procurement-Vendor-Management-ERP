import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { quotationsApi } from '../../api/quotations.api';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TableSkeleton, Skeleton } from '../../components/feedback/Skeleton';
import { Files, X } from '@phosphor-icons/react';

const statusVariant = (status) => {
  const map = {
    submitted: 'blue',
    under_review: 'yellow',
    accepted: 'green',
    rejected: 'red',
    draft: 'gray',
  };
  return map[status] || 'gray';
};

const fmt = (n) => n != null ? Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '—';

export const QuotationsPage = () => {
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);

  const { data: quotationData, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationsApi.getQuotations(),
  });

  const { data: selectedQuotation, isLoading: isQuotationLoading } = useQuery({
    queryKey: ['quotations', selectedQuotationId],
    queryFn: () => quotationsApi.getQuotationById(selectedQuotationId),
    enabled: !!selectedQuotationId,
  });

  const quotations = Array.isArray(quotationData) ? quotationData : quotationData?.items ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center">
              <Files size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No quotations submitted yet</p>
              <p className="text-sm text-gray-400 mt-1">Quotations submitted by vendors will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Quotation ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">RFQ</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Grand Total</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quotations.map((q) => (
                    <tr 
                      key={q.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedQuotationId(q.id)}
                    >
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{q.id.slice(0, 8)}…</td>
                      <td className="px-6 py-4 text-gray-900 font-medium">{q.rfq?.title ?? q.rfq_id?.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-gray-700">{q.vendor?.company_name ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-900 font-bold">{fmt(q.grand_total)}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {q.created_at ? new Date(q.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(q.status)}>{q.status?.replace('_', ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotation Details Modal */}
      {selectedQuotationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {isQuotationLoading ? 'Loading Quotation...' : `Quotation: ${selectedQuotation?.quotation_number || '—'}`}
                  </h2>
                  {!isQuotationLoading && selectedQuotation && (
                    <Badge variant={statusVariant(selectedQuotation.status)}>
                      {selectedQuotation.status?.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                {!isQuotationLoading && selectedQuotation && (
                  <p className="text-sm text-gray-500 mt-1">
                    RFQ: <span className="font-semibold text-gray-700">{selectedQuotation.rfq_title || '—'}</span>
                  </p>
                )}
              </div>
              <button 
                onClick={() => setSelectedQuotationId(null)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isQuotationLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : !selectedQuotation ? (
                <div className="text-center text-gray-500 py-8">Failed to load quotation details.</div>
              ) : (
                <>
                  {/* General Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-gray-400 font-medium">Vendor</p>
                      <p className="font-semibold text-gray-800">{selectedQuotation.vendor_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium">Submitted Date</p>
                      <p className="font-medium text-gray-800">
                        {selectedQuotation.submitted_at ? new Date(selectedQuotation.submitted_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium">Validity</p>
                      <p className="font-medium text-gray-800">
                        {selectedQuotation.valid_until ? new Date(selectedQuotation.valid_until).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Notes / Terms */}
                  {selectedQuotation.notes && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-gray-700 text-sm">Vendor Notes & Remarks</h4>
                      <p className="text-sm text-gray-600 bg-blue-50/50 border border-blue-100/50 p-3 rounded-lg italic">
                        "{selectedQuotation.notes}"
                      </p>
                    </div>
                  )}

                  {/* Line Items */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-700 text-sm">Quoted Line Items</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-gray-600">Item Name</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-right">Qty</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-right">Unit Price</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-right">Total Price</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-center">Delivery</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedQuotation.items?.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/55">
                              <td className="px-4 py-3 text-gray-900 font-medium">{item.item_name}</td>
                              <td className="px-4 py-3 text-gray-600 text-right">{Number(item.quantity)}</td>
                              <td className="px-4 py-3 text-gray-600 text-right">₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-gray-900 font-semibold text-right">₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-gray-600 text-center">{item.delivery_days ? `${item.delivery_days} days` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>₹{Number(selectedQuotation.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>GST (18%):</span>
                        <span>₹{Number(selectedQuotation.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                        <span>Grand Total:</span>
                        <span>₹{Number(selectedQuotation.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedQuotationId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
