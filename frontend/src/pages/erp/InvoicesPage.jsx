import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FilePdf, CreditCard } from '@phosphor-icons/react';

const mockInvoices = [
  { id: 'INV-2026-101', vendor: 'Global Electronics', amount: '$42,500.00', status: 'Pending Payment', dueDate: '2026-06-30' },
  { id: 'INV-2026-102', vendor: 'Tech Supplies Inc.', amount: '$1,250.00', status: 'Paid', dueDate: '2026-06-15' },
  { id: 'INV-2026-103', vendor: 'Office Solutions', amount: '$8,400.00', status: 'Overdue', dueDate: '2026-06-01' },
];

export const InvoicesPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Billing</h1>
        <Button variant="primary">Create Invoice</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">{invoice.id}</td>
                    <td className="px-6 py-4 text-gray-700">{invoice.vendor}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{invoice.amount}</td>
                    <td className="px-6 py-4 text-gray-700">{invoice.dueDate}</td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        invoice.status === 'Paid' ? 'green' : 
                        invoice.status === 'Overdue' ? 'red' : 'yellow'
                      }>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-[var(--color-royal-blue)]">
                        <FilePdf size={20} />
                      </Button>
                      {invoice.status !== 'Paid' && (
                        <Button variant="outline" size="sm" className="text-xs">
                          <CreditCard size={16} className="mr-1" /> Pay
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
