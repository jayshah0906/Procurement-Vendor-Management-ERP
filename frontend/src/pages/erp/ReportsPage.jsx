import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard.api';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Skeleton } from '../../components/feedback/Skeleton';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4A8BDF', '#A0006D', '#10B981', '#F59E0B', '#6366F1'];

export const ReportsPage = () => {
  const { data: spendData, isLoading: loadingSpend } = useQuery({
    queryKey: ['analytics', 'spend-analysis'],
    queryFn: dashboardApi.getSpendAnalysis,
  });

  const { data: vendorOverview, isLoading: loadingVendors } = useQuery({
    queryKey: ['dashboard', 'vendor-overview'],
    queryFn: dashboardApi.getVendorOverview,
  });

  const spendByCategory = spendData?.spend_by_category ?? [];
  const vendorStatusBreakdown = vendorOverview?.vendor_status_breakdown ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Category Bar Chart */}
        <Card>
          <CardHeader title="Spend by Category" />
          <CardContent className="h-80">
            {loadingSpend ? (
              <Skeleton className="w-full h-full" />
            ) : spendByCategory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No completed PO spend data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={spendByCategory} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="category_name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    dy={10}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dx={-10}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Total Spend']}
                  />
                  <Bar dataKey="total_spend" fill="var(--color-royal-blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Vendor Status Distribution Pie Chart */}
        <Card>
          <CardHeader title="Vendor Status Distribution" />
          <CardContent className="h-80 flex items-center justify-center">
            {loadingVendors ? (
              <Skeleton className="w-full h-full" />
            ) : vendorStatusBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No vendor data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={vendorStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percent }) =>
                      `${status?.replace('_', ' ')} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {vendorStatusBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
