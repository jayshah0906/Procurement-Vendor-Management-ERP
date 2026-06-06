import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DownloadSimple, Printer, PaperPlaneRight } from '@phosphor-icons/react';

export const PurchaseOrdersPage = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Order Details</h1>
        <div className="flex gap-2">
          <Button variant="outline"><Printer size={18} className="mr-2" /> Print</Button>
          <Button variant="outline"><DownloadSimple size={18} className="mr-2" /> PDF</Button>
          <Button variant="primary"><PaperPlaneRight size={18} className="mr-2" /> Send to Vendor</Button>
        </div>
      </div>

      <Card className="bg-white">
        <CardContent className="p-10">
          <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-2xl text-[var(--color-royal-blue)] mb-2">
                <span className="text-3xl">∞</span> VendorBridge
              </div>
              <p className="text-gray-500 text-sm">123 Business Avenue<br/>Tech City, TC 10010<br/>contact@vendorbridge.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">PURCHASE ORDER</h2>
              <p className="text-gray-600 font-medium">PO Number: <span className="text-gray-900">PO-2026-045</span></p>
              <p className="text-gray-600 font-medium">Date: <span className="text-gray-900">June 12, 2026</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vendor To:</h3>
              <p className="font-semibold text-gray-900">Global Electronics</p>
              <p className="text-gray-600 text-sm">456 Silicon Road<br/>Hardware Park, HP 20020<br/>sales@globalelectronics.com</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ship To:</h3>
              <p className="font-semibold text-gray-900">VendorBridge HQ</p>
              <p className="text-gray-600 text-sm">123 Business Avenue<br/>Tech City, TC 10010<br/>Attn: Engineering Dept</p>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase">Item Description</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-gray-500 uppercase">Qty</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-500 uppercase">Unit Price</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-4 px-4 text-gray-900">High-Performance Developer Laptops (16GB RAM, 512GB SSD)</td>
                <td className="py-4 px-4 text-center text-gray-700">50</td>
                <td className="py-4 px-4 text-right text-gray-700">$850.00</td>
                <td className="py-4 px-4 text-right text-gray-900 font-medium">$42,500.00</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal:</span> <span>$42,500.00</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax (0%):</span> <span>$0.00</span></div>
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-3 border-t border-gray-200">
                <span>Total:</span> <span>$42,500.00</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
