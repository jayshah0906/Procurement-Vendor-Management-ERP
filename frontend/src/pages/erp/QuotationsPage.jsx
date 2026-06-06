import { useQuery } from '@tanstack/react-query';
import { quotationsApi } from '../../api/quotations.api';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { Files } from '@phosphor-icons/react';

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
  const { data: quotationData, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationsApi.getQuotations(),
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
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
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
    </div>
  );
};
