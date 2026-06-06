import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard.api';
import { rfqsApi } from '../../api/rfqs.api';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Skeleton } from '../../components/feedback/Skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, FileText, Users, ShoppingCart } from '@phosphor-icons/react';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';

const MetricCard = ({ title, value, icon, colorClass, isLoading }) => (
  <Card>
    <CardContent className="flex items-center justify-between p-6">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <h4 className="text-3xl font-bold text-gray-900">{value ?? '—'}</h4>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
        {icon}
      </div>
    </CardContent>
  </Card>
);

const rfqStatusColor = (status) => {
  const map = {
    published: 'blue',
    draft: 'gray',
    closed: 'red',
    converted_to_po: 'green',
    cancelled: 'gray',
  };
  return map[status] || 'gray';
};

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const isVendor = user?.role === 'Vendor';

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: procurement, isLoading: loadingProcurement } = useQuery({
    queryKey: ['dashboard', 'procurement-overview'],
    queryFn: dashboardApi.getProcurementOverview,
  });

  const { data: rfqData, isLoading: loadingRFQs } = useQuery({
    queryKey: ['rfqs', { limit: 5 }],
    queryFn: () => rfqsApi.getRfqs({ limit: 5 }),
  });

  // Backend returns array or object with items
  const rfqs = Array.isArray(rfqData) ? rfqData : rfqData?.items ?? [];
  // monthly_spend_trend: [{ month: 'YYYY-MM', spend: number }]
  const spendData = procurement?.monthly_spend_trend ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isVendor ? 'Vendor Portal Overview' : 'Procurement Overview'}
      </h1>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title={isVendor ? 'Pending Payments' : 'Pending Approvals'}
          value={summary?.pending_approvals}
          icon={<Clock size={24} weight="fill" />}
          colorClass="bg-yellow-100 text-yellow-600"
          isLoading={loadingSummary}
        />
        <MetricCard
          title={isVendor ? 'Invited RFQs' : 'Total RFQs'}
          value={summary?.total_rfqs}
          icon={<FileText size={24} weight="fill" />}
          colorClass="bg-[var(--color-pale-blue)] text-[var(--color-royal-blue)]"
          isLoading={loadingSummary}
        />
        <MetricCard
          title={isVendor ? 'Submitted Bids' : 'Total Vendors'}
          value={summary?.total_vendors}
          icon={isVendor ? <FileText size={24} weight="fill" /> : <Users size={24} weight="fill" />}
          colorClass="bg-fuchsia-100 text-[var(--color-eggplant)]"
          isLoading={loadingSummary}
        />
        <MetricCard
          title={isVendor ? 'Active Orders' : 'Active POs'}
          value={summary?.active_purchase_orders}
          icon={<ShoppingCart size={24} weight="fill" />}
          colorClass="bg-green-100 text-green-600"
          isLoading={loadingSummary}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader title={isVendor ? 'Monthly Sales Trend' : 'Monthly Spend Trend'} />
          <CardContent className="h-80">
            {loadingProcurement ? (
              <Skeleton className="w-full h-full" />
            ) : spendData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No spend data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={spendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Spend']}
                  />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    stroke="var(--color-royal-blue)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'var(--color-royal-blue)', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent RFQs */}
        <Card>
          <CardHeader title="Recent RFQs" />
          <div className="divide-y divide-gray-100">
            {loadingRFQs ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 flex flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : rfqs.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No RFQs created yet.</div>
            ) : (
              rfqs.map((rfq) => (
                <div key={rfq.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <p className="font-medium text-gray-900 text-sm truncate">{rfq.title}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">{rfq.id.slice(0, 8)}…</span>
                    <Badge variant={rfqStatusColor(rfq.status)}>{rfq.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
