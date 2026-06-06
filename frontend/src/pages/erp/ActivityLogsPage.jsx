import { useQuery } from '@tanstack/react-query';
import { getLogs } from '../../api/mockApi';
import { Card, CardContent } from '../../components/ui/Card';
import { ShoppingCart, FileText, CheckCircle, UserPlus, Bell } from '@phosphor-icons/react';

const getIcon = (action) => {
  if (action.includes('RFQ') || action.includes('Quotation')) return <FileText size={20} />;
  if (action.includes('Vendor')) return <UserPlus size={20} />;
  if (action.includes('Invoice') || action.includes('Order')) return <ShoppingCart size={20} />;
  if (action.includes('Approv') || action.includes('Paid')) return <CheckCircle size={20} />;
  return <Bell size={20} />;
};

export const ActivityLogsPage = () => {
  const { data: logs, isLoading } = useQuery({ queryKey: ['logs'], queryFn: getLogs });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">System Activity Logs</h1>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <div className="h-16 bg-gray-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-gray-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-gray-100 animate-pulse rounded-xl" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {logs?.map((log) => (
                <li key={log.id} className="p-6 hover:bg-gray-50 transition-colors flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.color || 'bg-gray-100 text-gray-600'}`}>
                    {log.icon ? log.icon : getIcon(log.action)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{log.action}: <span className="font-bold">{log.entity}</span></p>
                    <p className="text-sm text-gray-500 mt-1">Performed by {log.user}</p>
                  </div>
                  <div className="text-sm text-gray-400 whitespace-nowrap">
                    {log.time}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
