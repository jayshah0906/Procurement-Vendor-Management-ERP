import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle, XCircle, Clock } from '@phosphor-icons/react';

export const ApprovalsPage = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Purchase Order: PO-2026-045</h2>
              <p className="text-gray-500">Global Electronics - 50x Laptops ($42,500)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">$42,500.00</span>
              <p className="text-sm text-gray-500">Total Amount</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-gray-700 mb-4">Approval Workflow</h3>
            <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-4">
              
              <div className="relative pl-8">
                <span className="absolute -left-3 top-0 bg-white text-green-500"><CheckCircle size={24} weight="fill" /></span>
                <p className="font-semibold text-gray-900">Procurement Officer (Level 1)</p>
                <p className="text-sm text-gray-500">Approved by John Doe on Jun 10, 2026</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">"Bid selected based on lowest price and required delivery timeline."</p>
              </div>

              <div className="relative pl-8">
                <span className="absolute -left-3 top-0 bg-white text-yellow-500"><Clock size={24} weight="fill" /></span>
                <p className="font-semibold text-gray-900">Finance Manager (Level 2)</p>
                <p className="text-sm text-yellow-600">Pending your review</p>
              </div>

              <div className="relative pl-8 opacity-50">
                <span className="absolute -left-2 top-1 w-4 h-4 rounded-full bg-gray-200 border-2 border-white"></span>
                <p className="font-semibold text-gray-900">Director (Level 3)</p>
                <p className="text-sm text-gray-500">Awaiting Level 2 Approval</p>
              </div>

            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="danger" className="flex-1"><XCircle size={20} className="mr-2" /> Reject</Button>
            <Button variant="primary" className="flex-1"><CheckCircle size={20} className="mr-2" /> Approve Request</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
