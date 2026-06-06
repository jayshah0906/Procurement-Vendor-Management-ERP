import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard.api';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Skeleton } from '../../components/feedback/Skeleton';
import { Button } from '../../components/ui/Button';
import { ArrowSquareOut } from '@phosphor-icons/react';
import ReactECharts from 'echarts-for-react';

const MONTHS = [
  { value: 'all', label: 'All Time' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
  { value: '2025-12', label: 'December 2025' },
];

const formatLakhs = (val) => {
  const num = Number(val);
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)}L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatSpend = (val) => {
  if (val == null) return '—';
  const num = Number(val);
  if (num >= 100000) {
    return `${(num / 100000).toFixed(1)} L`;
  }
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
};

const exportToCSV = (data, selectedMonthLabel) => {
  if (!data) return;
  
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Title & Selected Month
  csvContent += `Procurement Insights Report - ${selectedMonthLabel}\n\n`;
  
  // KPI Metrics
  csvContent += "KPI METRICS\n";
  csvContent += `Total Spend,Active Vendors,PO Fulfillment Rate,Overdue Invoices\n`;
  csvContent += `"${data.metrics?.total_spend || 0}","${data.metrics?.active_vendors || 0}","${data.metrics?.po_fulfillment_rate || 0}%","${data.metrics?.overdue_invoices_count || 0}"\n\n`;
  
  // Spend by Category
  csvContent += "SPEND BY CATEGORY\n";
  csvContent += "Category Name,Total Spend (INR)\n";
  data.spend_by_category?.forEach(cat => {
    csvContent += `"${cat.category_name}","${cat.total_spend}"\n`;
  });
  csvContent += "\n";
  
  // Top Vendors
  csvContent += "TOP VENDORS BY SPEND\n";
  csvContent += "Vendor Name,Spend (INR),POs count\n";
  data.top_vendors?.forEach(v => {
    csvContent += `"${v.vendor_name}","${v.spend}","${v.po_count}"\n`;
  });
  csvContent += "\n";
  
  // Monthly Trend
  csvContent += "MONTHLY TREND\n";
  csvContent += "Month,Spend (INR)\n";
  data.monthly_spend_trend?.forEach(m => {
    csvContent += `"${m.month}","${m.spend}"\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Procurement_Insights_${selectedMonthLabel.replace(" ", "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const ReportsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-05'); // Default to May 2026 to showcase full data

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'reports', selectedMonth],
    queryFn: () => dashboardApi.getReportsData(selectedMonth),
  });

  const selectedMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  const metrics = data?.metrics ?? { total_spend: 0, active_vendors: 0, po_fulfillment_rate: 100, overdue_invoices_count: 0 };
  const spendByCategory = data?.spend_by_category ?? [];
  const topVendors = data?.top_vendors ?? [];
  const spendTrend = data?.monthly_spend_trend ?? [];

  // Find max category spend to scale progress bars
  const maxCategorySpend = spendByCategory.length > 0 
    ? Math.max(...spendByCategory.map(c => c.total_spend)) 
    : 1;

  const progressColors = [
    'bg-[#1d4ed8]', // IT Hardware / Blue
    'bg-emerald-600', // Furniture / Green
    'bg-amber-500', // Stationery / Orange
    'bg-rose-500', // Logistics / Red-orange
    'bg-indigo-600',
  ];

  // ECharts vertical bar trend option
  const trendOption = {
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      containLabel: true,
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: spendTrend.map(item => {
        const [year, month] = item.month.split('-');
        const date = new Date(year, month - 1, 1);
        return date.toLocaleString('default', { month: 'short' });
      }),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#6B7280',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6'
        }
      },
      axisLabel: {
        color: '#6B7280',
        fontSize: 11,
        formatter: (value) => {
          if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
          if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
          return value;
        }
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1F2937',
      borderColor: '#1F2937',
      textStyle: {
        color: '#FFF'
      },
      formatter: (params) => {
        const item = params[0];
        return `${item.name}: <b>₹${Number(item.value).toLocaleString('en-IN')}</b>`;
      }
    },
    series: [
      {
        data: spendTrend.map((item, idx) => {
          const isLast = idx === spendTrend.length - 1;
          return {
            value: item.spend,
            itemStyle: {
              color: isLast ? '#1d4ed8' : '#bfdbfe'
            }
          };
        }),
        type: 'bar',
        barWidth: '45%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reports & analytics</h1>
          <p className="text-gray-500 font-medium mt-1">
            Procurement Insights - {selectedMonthLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.value || e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Button
            onClick={() => exportToCSV(data, selectedMonthLabel)}
            variant="outline"
            className="flex items-center gap-2 border-gray-200 text-gray-700 bg-white font-semibold shadow-sm rounded-xl px-4 py-2 hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowSquareOut size={16} className="font-bold" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards Row (White cards with colored typography) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Spend */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-3xl font-extrabold text-blue-600 block tracking-tight mb-2">
            {formatSpend(metrics.total_spend)}
          </span>
          <span className="text-xs uppercase font-bold text-blue-500/85 tracking-wider">
            total spend
          </span>
        </div>

        {/* Card 2: Active Vendors */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-3xl font-extrabold text-emerald-600 block tracking-tight mb-2">
            {metrics.active_vendors}
          </span>
          <span className="text-xs uppercase font-bold text-emerald-500/85 tracking-wider">
            Active vendors
          </span>
        </div>

        {/* Card 3: PO Fulfillment */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-3xl font-extrabold text-amber-500 block tracking-tight mb-2">
            {metrics.po_fulfillment_rate}%
          </span>
          <span className="text-xs uppercase font-bold text-amber-500/85 tracking-wider">
            PO Fulfillment
          </span>
        </div>

        {/* Card 4: Overdue Invoices */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm transition-all hover:scale-[1.02]">
          <span className="text-3xl font-extrabold text-[#e11d48] block tracking-tight mb-2">
            {metrics.overdue_invoices_count}
          </span>
          <span className="text-xs uppercase font-bold text-rose-500/85 tracking-wider">
            overdue invoices
          </span>
        </div>
      </div>

      {/* Main Details Panel (Light card container holding Category spend, Top Vendors, and Monthly Spend Trend) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Spend by Category Progress Bars */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            SPEND BY CATEGORY
          </h3>
          <div className="space-y-5">
            {spendByCategory.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-8">No category spend data for this period.</p>
            ) : (
              spendByCategory.map((cat, idx) => {
                const percentage = Math.max(5, (cat.total_spend / maxCategorySpend) * 100);
                const colorClass = progressColors[idx % progressColors.length];
                return (
                  <div key={cat.category_name} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-800">{cat.category_name}</span>
                      <span className="font-bold text-gray-900">{formatLakhs(cat.total_spend)}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Top Vendors & Monthly Spend Trend */}
        <div className="space-y-8">
          
          {/* Top Vendors by Spend */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              TOP VENDORS BY SPEND
            </h3>
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#fdfaf4] border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-600">Vendor</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-right">Spend (₹)</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-right">POs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {topVendors.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-5 py-6 text-center text-gray-400 italic">
                        No vendor spend data.
                      </td>
                    </tr>
                  ) : (
                    topVendors.map((vendor) => (
                      <tr key={vendor.vendor_name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-800">{vendor.vendor_name}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                          {vendor.spend.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-gray-700">{vendor.po_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Spend Trend Chart */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              MONTHLY TREND
            </h3>
            <div className="h-64">
              {spendTrend.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-12 text-center">No trend data available.</p>
              ) : (
                <ReactECharts
                  option={trendOption}
                  style={{ height: '100%', width: '100%' }}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
