import { Card, CardContent } from '../../components/ui/Card';
import { ShoppingCart, FileText, CheckCircle, UserPlus } from '@phosphor-icons/react';

const mockLogs = [
  { id: 1, action: 'Purchase Order Generated', entity: 'PO-2026-045', user: 'System', time: '10 mins ago', icon: <ShoppingCart size={20} />, color: 'bg-green-100 text-green-600' },
  { id: 2, action: 'RFQ Approved', entity: 'RFQ-2026-001', user: 'John Doe (Director)', time: '1 hour ago', icon: <CheckCircle size={20} />, color: 'bg-blue-100 text-blue-600' },
  { id: 3, action: 'New Quotation Submitted', entity: 'Global Electronics', user: 'Vendor Portal', time: '3 hours ago', icon: <FileText size={20} />, color: 'bg-purple-100 text-purple-600' },
  { id: 4, action: 'Vendor Registered', entity: 'Office Chairs LLC', user: 'Jane Smith (Procurement)', time: '1 day ago', icon: <UserPlus size={20} />, color: 'bg-yellow-100 text-yellow-600' },
];

export const ActivityLogsPage = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">System Activity Logs</h1>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100">
            {mockLogs.map((log) => (
              <li key={log.id} className="p-6 hover:bg-gray-50 transition-colors flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.color}`}>
                  {log.icon}
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
        </CardContent>
      </Card>
    </div>
  );
};
