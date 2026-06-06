import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const mockBids = [
  { vendor: 'Tech Supplies Inc.', price: '$45,000', unitPrice: '$900', days: 14, rating: '4.8/5', selected: false },
  { vendor: 'Global Electronics', price: '$42,500', unitPrice: '$850', days: 21, rating: '4.2/5', selected: true },
  { vendor: 'Office Solutions', price: '$48,000', unitPrice: '$960', days: 10, rating: '4.9/5', selected: false },
];

export const ComparisonPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Compare Quotations: RFQ-2026-001</h1>
        <Button variant="outline">Export to Excel</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockBids.map((bid, idx) => (
          <Card key={idx} className={bid.selected ? 'ring-2 ring-[var(--color-royal-blue)]' : ''}>
            {bid.selected && (
              <div className="bg-[var(--color-royal-blue)] text-white text-center text-xs font-bold py-1 uppercase tracking-wide">
                Lowest Price Recommended
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-gray-900">{bid.vendor}</h3>
                <Badge variant="blue">{bid.rating}</Badge>
              </div>
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Total Price</p>
                  <p className={`text-2xl font-extrabold ${bid.selected ? 'text-[var(--color-royal-blue)]' : 'text-gray-900'}`}>{bid.price}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-gray-500">Unit Price</p>
                    <p className="font-semibold">{bid.unitPrice}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Delivery Time</p>
                    <p className="font-semibold">{bid.days} Days</p>
                  </div>
                </div>
              </div>
              <Button variant={bid.selected ? 'primary' : 'outline'} className="w-full">
                {bid.selected ? 'Approve Bid' : 'Select Vendor'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
