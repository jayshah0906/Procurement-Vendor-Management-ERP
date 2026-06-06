import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../../api/auditLogs.api';
import { Card, CardContent } from '../../components/ui/Card';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ShoppingCart, FileText, CheckCircle, UserPlus, Bell } from '@phosphor-icons/react';

const getIcon = (action = '') => {
  if (action.includes('RFQ') || action.includes('QUOTATION')) return <FileText size={20} />;
  if (action.includes('VENDOR') || action.includes('USER')) return <UserPlus size={20} />;
  if (action.includes('INVOICE') || action.includes('PO') || action.includes('ORDER')) return <ShoppingCart size={20} />;
  if (action.includes('APPROV') || action.includes('PAID') || action.includes('LOGIN')) return <CheckCircle size={20} />;
  return <Bell size={20} />;
};

const getColor = (action = '') => {
  if (action.includes('RFQ') || action.includes('QUOTATION')) return 'bg-blue-100 text-blue-600';
  if (action.includes('VENDOR') || action.includes('USER')) return 'bg-yellow-100 text-yellow-600';
  if (action.includes('INVOICE') || action.includes('PAID')) return 'bg-green-100 text-green-600';
  if (action.includes('PO') || action.includes('ORDER')) return 'bg-purple-100 text-purple-600';
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-600';
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
};

export const ActivityLogsPage = () => {
  const { data: logData, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditLogsApi.getAuditLogs({ limit: 50 }),
  });

  const logs = Array.isArray(logData) ? logData : logData?.items ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">System Activity Logs</h1>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>No activity recorded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {logs.map((log) => {
                const action = log.action || '';
                return (
                  <li key={log.id} className="p-6 hover:bg-gray-50 transition-colors flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getColor(action)}`}>
                      {getIcon(action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium">
                        {action.replace(/_/g, ' ')}:{' '}
                        <span className="font-bold">
                          {log.entity_type?.toUpperCase()} {log.entity_id ? `(${log.entity_id.slice(0, 8)}…)` : ''}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        By user {log.actor_user_id ? log.actor_user_id.slice(0, 8) : 'System'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400 whitespace-nowrap">
                      {timeAgo(log.created_at)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
