import { useQuery } from '@tanstack/react-query';
import { getMetrics, getSpendData, getRFQs } from '../../api/mockApi';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Skeleton } from '../../components/feedback/Skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, FileText, Users, ShoppingCart } from '@phosphor-icons/react';

const MetricCard = ({ title, value, icon, colorClass, isLoading }) => (
  <Card>
    <CardContent className="flex items-center justify-between p-6">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <h4 className="text-3xl font-bold text-gray-900">{value}</h4>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
        {icon}
      </div>
    </CardContent>
  </Card>
);

export const DashboardPage = () => {
  const { data: metrics, isLoading: loadingMetrics } = useQuery({ queryKey: ['metrics'], queryFn: getMetrics });
  const { data: spendData, isLoading: loadingSpend } = useQuery({ queryKey: ['spendData'], queryFn: getSpendData });
  const { data: rfqs, isLoading: loadingRFQs } = useQuery({ queryKey: ['recentRFQs'], queryFn: getRFQs });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Procurement Overview</h1>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard 
          title="Pending Approvals" 
          value={metrics?.pendingApprovals} 
          icon={<Clock size={24} weight="fill" />} 
          colorClass="bg-yellow-100 text-yellow-600"
          isLoading={loadingMetrics}
        />
        <MetricCard 
          title="Active RFQs" 
          value={metrics?.activeRFQs} 
          icon={<FileText size={24} weight="fill" />} 
          colorClass="bg-[var(--color-pale-blue)] text-[var(--color-royal-blue)]"
          isLoading={loadingMetrics}
        />
        <MetricCard 
          title="Total Vendors" 
          value={metrics?.totalVendors} 
          icon={<Users size={24} weight="fill" />} 
          colorClass="bg-fuchsia-100 text-[var(--color-eggplant)]"
          isLoading={loadingMetrics}
        />
        <MetricCard 
          title="Total Spend" 
          value={metrics?.totalSpend} 
          icon={<ShoppingCart size={24} weight="fill" />} 
          colorClass="bg-green-100 text-green-600"
          isLoading={loadingMetrics}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader title="Spend Analysis" />
          <CardContent className="h-80">
            {loadingSpend ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="spend" stroke="var(--color-royal-blue)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-royal-blue)', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
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
            ) : (
              rfqs?.map((rfq) => (
                <div key={rfq.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <p className="font-medium text-gray-900 text-sm truncate">{rfq.title}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{rfq.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      rfq.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {rfq.status}
                    </span>
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
