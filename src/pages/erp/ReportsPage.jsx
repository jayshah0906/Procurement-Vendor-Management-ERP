import { useQuery } from '@tanstack/react-query';
import { getSpendData } from '../../api/mockApi';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Skeleton } from '../../components/feedback/Skeleton';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#4A8BDF', '#A0006D', '#10B981', '#F59E0B'];
const vendorPieData = [
  { name: 'Active', value: 120 },
  { name: 'Pending', value: 20 },
  { name: 'Inactive', value: 16 },
];

export const ReportsPage = () => {
  const { data: spendData, isLoading } = useQuery({ queryKey: ['spendData'], queryFn: getSpendData });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Monthly Spending" />
          <CardContent className="h-80">
            {isLoading ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dx={-10} />
                  <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="spend" fill="var(--color-royal-blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Vendor Status Distribution" />
          <CardContent className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vendorPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {vendorPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
